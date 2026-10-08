/**
 * Discord bot client — discord.js v14.
 * Slash commands registered on ready via REST. Music handled by the engine module.
 * If DISCORD_TOKEN is not configured the bot simply never starts and every
 * dependent endpoint reports the honest NOT CONFIGURED state.
 */
import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { config } from '../config.js';
import { log } from '../logger.js';
import { music, DEFAULT_FILTERS } from './music.js';
import { resolveQuery, SourceError } from './source.js';
import { pushActivity, bumpStat, getSetting, setSetting } from '../db/repo.js';
import { fmtClock } from '../util.js';
import { dispatchWebhooks } from '../webhooks.js';
import { getDb, measureDbLatency } from '../db/index.js';

export interface BotStatus {
  configured: boolean;
  online: boolean;
  ready: boolean;
  username: string | null;
  avatarUrl: string | null;
  uptimeSec: number | null;
  latencyMs: number | null; // gateway heartbeat
  apiLatencyMs: number | null; // REST roundtrip
  guilds: number;
  users: number;
  voiceConnections: number;
  presence: string | null;
}

let client: Client | null = null;
let restLatency: number | null = null;
let readySince: number | null = null;
let botStarted = false;

const COMMANDS = [
  new SlashCommandBuilder().setName('play').setDescription('เล่นเพลงจากชื่อเพลงหรือลิงก์ YouTube').addStringOption((o) => o.setName('query').setDescription('ชื่อเพลงหรือ URL').setRequired(true)),
  new SlashCommandBuilder().setName('pause').setDescription('หยุดเพลงชั่วคราว'),
  new SlashCommandBuilder().setName('resume').setDescription('เล่นเพลงต่อ'),
  new SlashCommandBuilder().setName('skip').setDescription('ข้ามเพลงปัจจุบัน'),
  new SlashCommandBuilder().setName('queue').setDescription('แสดงคิวเพลง'),
  new SlashCommandBuilder().setName('nowplaying').setDescription('แสดงเพลงที่กำลังเล่น'),
  new SlashCommandBuilder().setName('volume').setDescription('ตั้งค่าความดัง 0-150').addIntegerOption((o) => o.setName('level').setDescription('0-150').setRequired(true).setMinValue(0).setMaxValue(150)),
  new SlashCommandBuilder()
    .setName('filter')
    .setDescription('เปิด/ปิดฟิลเตอร์เสียง')
    .addStringOption((o) =>
      o
        .setName('type')
        .setDescription('ชนิดฟิลเตอร์')
        .setRequired(true)
        .addChoices(
          { name: 'ฟิลเตอร์เสียง', value: 'master' },
          { name: 'บาสบูสต์', value: 'bassboost' },
          { name: 'เสียงคุณภาพสูง', value: 'hq' },
        ),
    )
    .addBooleanOption((o) => o.setName('enabled').setDescription('เปิดหรือปิด').setRequired(true)),
  new SlashCommandBuilder().setName('join').setDescription('ให้บอทเข้าช่องเสียงของคุณ'),
  new SlashCommandBuilder().setName('disconnect').setDescription('ให้บอทออกจากช่องเสียง'),
].map((c) => c.toJSON());

export function botConfigured(): boolean {
  return Boolean(config.discordToken);
}

export function getBotStatus(): BotStatus {
  const configured = botConfigured();
  const ready = Boolean(client?.isReady());
  let guilds = 0;
  let users = 0;
  if (client?.isReady()) {
    guilds = client.guilds.cache.size;
    for (const g of client.guilds.cache.values()) {
      users += g.memberCount ?? 0;
    }
  }
  return {
    configured,
    online: ready,
    ready,
    username: client?.user?.displayName ?? client?.user?.username ?? null,
    avatarUrl: client?.user?.displayAvatarURL() ?? null,
    uptimeSec: ready && readySince ? Math.floor((Date.now() - readySince) / 1000) : null,
    latencyMs: ready ? Math.max(0, client!.ws.ping) : null,
    apiLatencyMs: ready ? restLatency : null,
    guilds,
    users,
    voiceConnections: music.connectionsCount(),
    presence: client?.user?.presence.activities[0]?.name ?? null,
  };
}

async function measureRestLatency(rest: REST): Promise<void> {
  try {
    const t0 = performance.now();
    await rest.get(Routes.user('@me'));
    restLatency = Math.max(1, Math.round(performance.now() - t0));
  } catch {
    restLatency = null;
  }
}

export async function startBot(): Promise<void> {
  if (botStarted) return;
  botStarted = true;
  if (!botConfigured()) {
    log.warn('DISCORD_TOKEN not configured — bot stays offline (UI will show NOT CONFIGURED).');
    return;
  }
  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages],
  });

  client.once(Events.ClientReady, async (c) => {
    readySince = Date.now();
    log.info({ user: c.user.tag, guilds: c.guilds.cache.size }, 'discord bot ready');
    try {
      const rest = new REST({ version: '10' }).setToken(config.discordToken);
      await rest.put(Routes.applicationCommands(c.user.id), { body: COMMANDS });
      log.info('slash commands registered');
      void measureRestLatency(rest);
      setInterval(() => void measureRestLatency(rest), 30_000).unref();
    } catch (e) {
      log.error({ err: e instanceof Error ? e.message : String(e) }, 'command registration failed');
    }
    const presence = await getSetting<string>('presence', '🎵 NABEE CORE Music');
    c.user.setPresence({ activities: [{ name: presence, type: 2 }], status: 'online' }); // type 2 = LISTENING
  });

  client.on(Events.InteractionCreate, (i) => {
    if (!i.isChatInputCommand()) return;
    void handleCommand(i).catch((e) => log.error({ err: e instanceof Error ? e.message : String(e) }, 'command handler error'));
  });

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    // real activity: someone joined a voice channel where the bot lives
    if (!oldState.channelId && newState.channelId && newState.member && !newState.member.user.bot) {
      const isBotChannel = newState.channelId === music.getState(newState.guild.id).channelId;
      void (async () => {
        await bumpStat('joins');
        if (isBotChannel) {
          await pushActivity('voice_join', 'ผู้ใช้เข้าร่วมช่องเสียง', `${newState.member!.displayName} เข้าร่วม ${newState.channel!.name}`);
          music.emitUpdate(newState.guild.id);
        }
      })();
    }
  });

  client.on('error', (e) => log.error({ err: e.message }, 'discord client error'));
  client.on('warn', (m) => log.warn({ msg: m }, 'discord client warn'));

  try {
    await client.login(config.discordToken);
  } catch (e) {
    log.error({ err: e instanceof Error ? e.message : String(e) }, 'discord login failed');
    client = null;
  }
}

export async function stopBot(): Promise<void> {
  if (client) {
    await client.destroy();
    client = null;
    readySince = null;
  }
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.commandName;
  await bumpStat('commands');
  await pushActivity('command', `คำสั่ง /${name}`, `${interaction.user.username} ใช้คำสั่งใน ${interaction.guild?.name ?? 'DM'}`);
  await dispatchWebhooks('bot.command', { command: name, user: interaction.user.username, guild: interaction.guild?.name ?? null });

  switch (name) {
    case 'play': {
      await interaction.deferReply();
      const query = interaction.options.getString('query', true);
      const voiceChannel = interaction.member && 'voice' in interaction.member ? interaction.member.voice.channelId : null;
      if (!voiceChannel) {
        await interaction.editReply('⚠️ คุณต้องอยู่ในช่องเสียงก่อน');
        return;
      }
      try {
        const track = await resolveQuery(query);
        if (!track) {
          await interaction.editReply('❌ ไม่พบเพลงที่ค้นหา');
          return;
        }
        music.join(interaction.guildId!, voiceChannel, interaction.guild!.voiceAdapterCreator);
        const qt = await music.enqueue(interaction.guildId!, track, { id: interaction.user.id, name: interaction.user.username });
        const st = music.getState(interaction.guildId!);
        if (!st.nowPlaying && music.getState(interaction.guildId!).connected) {
          await music.playNow(interaction.guildId!, qt);
          await pushActivity('track_start', 'กำลังเล่นเพลงใหม่', `${track.title} — ${track.author}`);
          await bumpStat('plays');
          await dispatchWebhooks('music.track_start', { title: track.title, url: track.url });
        }
        await interaction.editReply(`✅ เพิ่มคิว: **${track.title}** (${fmtClock(track.durationMs)})`);
      } catch (e) {
        const msg = e instanceof SourceError ? `ไม่สามารถดึงเพลงได้ (${e.code})` : 'เกิดข้อผิดพลาดในการเล่นเพลง';
        await interaction.editReply(`❌ ${msg}`);
      }
      return;
    }
    case 'pause': {
      const ok = music.pause(interaction.guildId!);
      await interaction.reply(ok ? '⏸️ หยุดเพลงชั่วคราว' : '⚠️ ไม่มีเพลงที่กำลังเล่น');
      return;
    }
    case 'resume': {
      const ok = music.resume(interaction.guildId!);
      await interaction.reply(ok ? '▶️ เล่นต่อ' : '⚠️ ไม่มีเพลงที่หยุดอยู่');
      return;
    }
    case 'skip': {
      const ok = music.skip(interaction.guildId!);
      await interaction.reply(ok ? '⏭️ ข้ามเพลงแล้ว' : '⚠️ ไม่มีเพลงที่กำลังเล่น');
      return;
    }
    case 'queue': {
      const st = music.getState(interaction.guildId!);
      if (!st.nowPlaying && st.queue.length === 0) {
        await interaction.reply('คิวเพลงว่างเปล่า');
        return;
      }
      const lines = st.queue.slice(0, 10).map((t, i) => `${i + 1}. ${t.title} (${fmtClock(t.durationMs)})`);
      await interaction.reply(`📜 คิวเพลง (${st.queue.length}):\n${lines.join('\n')}`);
      return;
    }
    case 'nowplaying': {
      const st = music.getState(interaction.guildId!);
      if (!st.nowPlaying) {
        await interaction.reply('ไม่มีเพลงที่กำลังเล่น');
        return;
      }
      await interaction.reply(`🎵 **${st.nowPlaying.title}** — ${st.nowPlaying.author}\n⏱ ${fmtClock(st.positionMs)} / ${fmtClock(st.durationMs)} | 🔊 ${st.volume}%`);
      return;
    }
    case 'volume': {
      const v = interaction.options.getInteger('level', true);
      const applied = music.setVolume(interaction.guildId!, v);
      await interaction.reply(`🔊 ตั้งความดังเป็น ${applied}%`);
      return;
    }
    case 'filter': {
      const type = interaction.options.getString('type', true) as keyof typeof DEFAULT_FILTERS;
      const enabled = interaction.options.getBoolean('enabled', true);
      const filters = await music.setFilter(interaction.guildId!, { [type]: enabled });
      await interaction.reply(`🎛️ ฟิลเตอร์อัปเดต: ${JSON.stringify(filters)}`);
      return;
    }
    case 'join': {
      const voiceChannel = interaction.member && 'voice' in interaction.member ? interaction.member.voice.channelId : null;
      if (!voiceChannel) {
        await interaction.reply('⚠️ คุณต้องอยู่ในช่องเสียงก่อน');
        return;
      }
      music.join(interaction.guildId!, voiceChannel, interaction.guild!.voiceAdapterCreator);
      await interaction.reply('✅ เข้าร่วมช่องเสียงแล้ว');
      return;
    }
    case 'disconnect': {
      music.leave(interaction.guildId!);
      await interaction.reply('👋 ออกจากช่องเสียงแล้ว');
      return;
    }
    default:
      await interaction.reply('ไม่รู้จักคำสั่ง');
  }
}

/** Real connectivity test used by the Connections page. */
export async function testDiscordConnection(): Promise<{ ok: boolean; detail: string }> {
  if (!botConfigured()) return { ok: false, detail: 'NOT_CONFIGURED' };
  const db = await getDb();
  const lat = await measureDbLatency(db);
  if (client?.isReady()) return { ok: true, detail: `ONLINE (gateway ${Math.max(0, client.ws.ping)}ms, db ${lat}ms)` };
  return { ok: false, detail: 'OFFLINE' };
}

export async function setPresence(text: string): Promise<void> {
  await setSetting('presence', text);
  client?.user?.setPresence({ activities: [{ name: text, type: 2 }], status: 'online' });
}

export function getDiscordClient(): Client | null {
  return client;
}

export { PermissionFlagsBits };
