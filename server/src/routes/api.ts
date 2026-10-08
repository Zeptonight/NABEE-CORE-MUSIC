import type { FastifyInstance } from 'fastify';
import { getDb, measureDbLatency, dbEngineVersion } from '../db/index.js';
import {
  listActivity,
  getStatsDay,
  getStatsRange,
  bumpStat,
  getSetting,
  setSetting,
  allSettings,
  listUsers,
  updateUser,
  listAudit,
  listSessions,
  revokeSession,
  revokeAllSessionsForUser,
  writeAudit,
} from '../db/repo.js';
import {
  listCredentials,
  createCredential,
  deleteCredential,
  updateCredentialValue,
  updateCredentialStatus,
  updateCredentialMeta,
  listWebhooks,
  createWebhook,
  deleteWebhook,
  markWebhookTested,
  listEmbeds,
  saveEmbed,
  deleteEmbed,
} from '../db/repo2.js';
import { getMetrics, processUptimeSec } from '../metrics.js';
import { botConfigured, getBotStatus, setPresence, getDiscordClient, testDiscordConnection } from '../bot/client.js';
import { music, DEFAULT_FILTERS } from '../bot/music.js';
import { resolveQuery, SourceError } from '../bot/source.js';
import { githubConfigured, ownerIdsConfigured } from '../auth/github.js';
import { todayKey, fmtDuration, fetchJson } from '../util.js';
import { requireAuth, requireStaff, requireOwner } from './guards.js';
import { testCredential } from '../credentials-test.js';
import { snapshotCounts, getDayCounts, ensureStatsColumns } from '../db/stats.js';
import { config } from '../config.js';
import { mkdirSync, writeFileSync, readdirSync, statSync, createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../logger.js';
import { discordJsVersion, appVersion } from '../versions.js';

const BADGE = (configured: boolean) => (configured ? undefined : 'NOT_CONFIGURED');

function firstGuildId(): string | null {
  const c = getDiscordClient();
  if (!c?.isReady()) return null;
  const guilds = [...c.guilds.cache.values()].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
  return guilds[0]?.id ?? null;
}

async function hourlyCommands(): Promise<{ hour: string; n: number }[]> {
  const db = await getDb();
  const since = Date.now() - 12 * 3600_000;
  const rows = await db.all("SELECT * FROM activity_events WHERE type = 'command' AND created_at >= ?", [since]);
  const buckets = new Map<string, number>();
  for (let i = 12; i >= 0; i--) {
    const h = new Date(Date.now() - i * 3600_000).getUTCHours();
    buckets.set(String(h).padStart(2, '0'), 0);
  }
  for (const r of rows) {
    const h = new Date(Number(r.created_at)).getUTCHours();
    const k = String(h).padStart(2, '0');
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([hour, n]) => ({ hour, n }));
}

export function registerApiRoutes(app: FastifyInstance): void {
  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/bootstrap', async () => ({
    version: appVersion(),
    github: { configured: githubConfigured(), ownerConfigured: ownerIdsConfigured(), baseUrlSet: Boolean(config.baseUrl) },
    discord: { configured: botConfigured(), clientIdSet: Boolean(config.discordClientId) },
    database: { configured: true },
    allowIframe: config.allowIframe,
  }));

  app.get('/api/dashboard', { preHandler: requireAuth }, async () => {
    const db = await getDb();
    const [metrics, activity] = await Promise.all([getMetrics(), listActivity(8)]);
    const bot = getBotStatus();
    if (bot.ready) void snapshotCounts(bot.guilds, bot.users).catch(() => undefined);
    const today = await getStatsDay(todayKey());
    const yesterday = await getStatsDay(todayKey(new Date(Date.now() - 86400_000)));
    const dayCounts = await getDayCounts(todayKey());
    const yCounts = await getDayCounts(todayKey(new Date(Date.now() - 86400_000)));
    const guildId = firstGuildId();
    const player = guildId ? music.getState(guildId) : null;
    return {
      bot: { ...bot, maxVoice: await getSetting<number>('maxVoice', 5) },
      metrics,
      stats: {
        configured: bot.ready,
        servers: bot.guilds,
        users: bot.users,
        commandsToday: today.commands,
        deltas: {
          servers: dayCounts.servers - yCounts.servers,
          users: dayCounts.users - yCounts.users,
          commands: today.commands - yesterday.commands,
        },
        sparkline: await hourlyCommands(),
      },
      activity,
      player,
      guilds: listGuildSnapshot(),
    };
  });

  app.get('/api/metrics', { preHandler: requireAuth }, async () => getMetrics());

  app.get('/api/bot/status', { preHandler: requireAuth }, async () => {
    const bot = getBotStatus();
    return { ...bot, maxVoice: await getSetting<number>('maxVoice', 5) };
  });

  app.get('/api/stats', { preHandler: requireAuth }, async () => {
    const today = await getStatsDay(todayKey());
    const yesterday = await getStatsDay(todayKey(new Date(Date.now() - 86400_000)));
    return { today, yesterday, range: await getStatsRange(30) };
  });

  app.get('/api/activity', { preHandler: requireAuth }, async (req) => {
    const q = (req.query as { limit?: string }).limit;
    return listActivity(Math.min(50, Math.max(1, Number(q ?? 8))));
  });

  app.get('/api/system/components', { preHandler: requireAuth }, async () => {
    const db = await getDb();
    return {
      node: process.version.replace('v', ''),
      discordJs: discordJsVersion(),
      database: await dbEngineVersion(db),
      uptime: fmtDuration(processUptimeSec() * 1000),
      version: appVersion(),
      configured: {
        bot: botConfigured(),
        github: githubConfigured(),
      },
    };
  });

  app.get('/api/system/status', { preHandler: requireAuth }, async () => {
    const db = await getDb();
    let dbOk = true;
    let dbLat: number | null = null;
    try {
      dbLat = await measureDbLatency(db);
    } catch {
      dbOk = false;
    }
    const bot = getBotStatus();
    return {
      discord: { ok: bot.ready, label: bot.ready ? 'ONLINE' : botConfigured() ? 'OFFLINE' : 'NOT_CONFIGURED' },
      database: { ok: dbOk, label: dbOk ? 'CONNECTED' : 'ERROR', latencyMs: dbLat },
      api: { ok: githubConfigured(), label: githubConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED' },
      voice: { ok: bot.voiceConnections > 0, label: `${bot.voiceConnections} / ${await getSetting<number>('maxVoice', 5)}` },
      websocket: { ok: true, label: 'SSE_READY' },
    };
  });

  app.post('/api/system/test/:what', { preHandler: requireOwner }, async (req, reply) => {
    const what = (req.params as { what: string }).what;
    if (what === 'discord') return testDiscordConnection();
    if (what === 'database') {
      try {
        const db = await getDb();
        const lat = await measureDbLatency(db);
        return { ok: true, detail: `CONNECTED — ${await dbEngineVersion(db)} (${lat}ms)` };
      } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message.slice(0, 100) : 'ERROR' };
      }
    }
    if (what === 'github') {
      if (!githubConfigured()) return { ok: false, detail: 'NOT_CONFIGURED' };
      return { ok: true, detail: 'CONFIGURED — OAuth app credentials present' };
    }
    if (what === 'youtube') {
      try {
        const track = await resolveQuery('lofi hip hop', 12000);
        return { ok: Boolean(track), detail: track ? `OK — resolved "${track.title}"` : 'NO_RESULT' };
      } catch (e) {
        return { ok: false, detail: e instanceof SourceError ? `${e.code}: ${e.message.slice(0, 80)}` : 'FAILED' };
      }
    }
    reply.code(404).send({ error: 'UNKNOWN_TEST' });
  });

  // ---------- Guilds ----------
  app.get('/api/guilds', { preHandler: requireAuth }, async () => ({
    configured: botConfigured(),
    online: getBotStatus().ready,
    guilds: listGuildSnapshot(),
  }));

  // ---------- Player & queue ----------
  app.get('/api/player/:guildId', { preHandler: requireAuth }, async (req, reply) => {
    const { guildId } = req.params as { guildId: string };
    const id = guildId === 'default' ? firstGuildId() : guildId;
    if (!id) {
      reply.code(503).send({ error: 'BOT_NOT_CONFIGURED' });
      return;
    }
    await music.loadQueue(id).catch(() => undefined);
    return music.getState(id);
  });

  app.post('/api/queue', { preHandler: requireStaff }, async (req, reply) => {
    const body = req.body as { guildId?: string; query?: string };
    const guildId = body.guildId === 'default' || !body.guildId ? firstGuildId() : body.guildId;
    if (!guildId) {
      reply.code(503).send({ error: 'BOT_NOT_CONFIGURED' });
      return;
    }
    if (!body.query || typeof body.query !== 'string' || body.query.length > 500) {
      reply.code(400).send({ error: 'INVALID_QUERY' });
      return;
    }
    const st = music.getState(guildId);
    if (!st.connected) {
      reply.code(409).send({ error: 'BOT_NOT_IN_VOICE', detail: 'ให้บอทเข้าช่องเสียงก่อน (/join หรือกดเล่นจากหน้าเซิร์ฟเวอร์)' });
      return;
    }
    try {
      const track = await resolveQuery(body.query);
      if (!track) {
        reply.code(404).send({ error: 'NOT_FOUND' });
        return;
      }
      const qt = await music.enqueue(guildId, track, { id: req.auth!.user.id, name: req.auth!.user.login });
      if (!music.getState(guildId).nowPlaying) {
        await music.playNow(guildId, qt);
        await bumpStat('plays');
        await pushActivitySafe('track_start', 'กำลังเล่นเพลงใหม่', `${track.title} — ${track.author}`);
      } else {
        await pushActivitySafe('track_added', 'มีเพลงใหม่ถูกเพิ่ม', `${track.title} โดย ${req.auth!.user.login}`);
      }
      return music.getState(guildId);
    } catch (e) {
      reply.code(502).send({ error: e instanceof SourceError ? e.code : 'RESOLVE_FAILED', detail: e instanceof Error ? e.message.slice(0, 200) : '' });
    }
  });

  app.delete('/api/queue/:guildId/:id', { preHandler: requireStaff }, async (req) => {
    const { guildId, id } = req.params as { guildId: string; id: string };
    await music.removeFromQueue(guildId, id);
    return music.getState(guildId);
  });

  app.post('/api/queue/clear', { preHandler: requireStaff }, async (req) => {
    const body = req.body as { guildId: string };
    await music.clearQueue(body.guildId);
    return music.getState(body.guildId);
  });

  app.post('/api/player/:action', { preHandler: requireStaff }, async (req, reply) => {
    const { action } = req.params as { action: string };
    const body = (req.body ?? {}) as { guildId?: string };
    const guildId = body.guildId === 'default' || !body.guildId ? firstGuildId() : body.guildId;
    if (!guildId) {
      reply.code(503).send({ error: 'BOT_NOT_CONFIGURED' });
      return;
    }
    const st = music.getState(guildId);
    switch (action) {
      case 'pause':
        music.pause(guildId);
        break;
      case 'resume':
        music.resume(guildId);
        break;
      case 'skip':
        music.skip(guildId);
        break;
      default:
        reply.code(404).send({ error: 'UNKNOWN_ACTION' });
        return;
    }
    return music.getState(guildId);
  });

  app.post('/api/volume', { preHandler: requireStaff }, async (req, reply) => {
    const body = req.body as { guildId?: string; v?: number };
    const guildId = body.guildId === 'default' || !body.guildId ? firstGuildId() : body.guildId;
    if (!guildId) {
      reply.code(503).send({ error: 'BOT_NOT_CONFIGURED' });
      return;
    }
    if (typeof body.v !== 'number' || !Number.isFinite(body.v)) {
      reply.code(400).send({ error: 'INVALID_VOLUME' });
      return;
    }
    music.setVolume(guildId, body.v);
    return music.getState(guildId);
  });

  app.post('/api/filters', { preHandler: requireStaff }, async (req, reply) => {
    const body = req.body as { guildId?: string; filters?: Partial<typeof DEFAULT_FILTERS> };
    const guildId = body.guildId === 'default' || !body.guildId ? firstGuildId() : body.guildId;
    if (!guildId) {
      reply.code(503).send({ error: 'BOT_NOT_CONFIGURED' });
      return;
    }
    const patch: Partial<typeof DEFAULT_FILTERS> = {};
    for (const k of Object.keys(DEFAULT_FILTERS) as (keyof typeof DEFAULT_FILTERS)[]) {
      if (typeof body.filters?.[k] === 'boolean') patch[k] = body.filters[k];
    }
    const filters = await music.setFilter(guildId, patch);
    return music.getState(guildId);
  });

  app.post('/api/bot/presence', { preHandler: requireOwner }, async (req) => {
    const body = req.body as { text?: string };
    const text = (body.text ?? '').slice(0, 80);
    await setPresence(text || '🎵 NABEE CORE Music');
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'bot.presence', detail: text, ip: req.ip });
    return { ok: true };
  });

  // ---------- Users ----------
  app.get('/api/users', { preHandler: requireOwner }, async () => listUsers());

  app.patch('/api/users/:id', { preHandler: requireOwner }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { role?: string; disabled?: number };
    if (body.role !== undefined && !['owner', 'admin', 'user'].includes(body.role)) {
      reply.code(400).send({ error: 'INVALID_ROLE' });
      return;
    }
    if (body.disabled !== undefined && ![0, 1].includes(body.disabled)) {
      reply.code(400).send({ error: 'INVALID_DISABLED' });
      return;
    }
    if (id === req.auth!.user.id && body.role && body.role !== 'owner') {
      reply.code(400).send({ error: 'CANNOT_DEMOTE_SELF' });
      return;
    }
    await updateUser(id, body);
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'users.update', target: id, detail: JSON.stringify(body), ip: req.ip });
    return { ok: true };
  });

  // ---------- Credentials ----------
  app.get('/api/credentials', { preHandler: requireOwner }, async () => listCredentials());

  app.post('/api/credentials', { preHandler: requireOwner }, async (req, reply) => {
    const b = req.body as { key?: string; label?: string; category?: string; value?: string };
    if (!b.key || !/^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(b.key) || !b.value || !b.label) {
      reply.code(400).send({ error: 'INVALID_INPUT', detail: 'key (type:name), label, value จำเป็น' });
      return;
    }
    if (b.value.length > 4096 || b.label.length > 100) {
      reply.code(400).send({ error: 'TOO_LONG' });
      return;
    }
    const row = await createCredential({ key: b.key, label: b.label, category: b.category ?? 'other', value: b.value, createdBy: req.auth!.user.id });
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'credentials.create', target: b.key, ip: req.ip });
    const { value_enc, ...safe } = row;
    return safe;
  });

  app.patch('/api/credentials/:id', { preHandler: requireOwner }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = req.body as { value?: string; status?: string; label?: string; category?: string };
    const full = await import('../db/repo2.js').then((m) => m.getCredentialFull(id));
    if (!full) {
      reply.code(404).send({ error: 'NOT_FOUND' });
      return;
    }
    if (b.value !== undefined && b.value.length > 4096) {
      reply.code(400).send({ error: 'TOO_LONG' });
      return;
    }
    if (b.value !== undefined) await updateCredentialValue(id, b.value);
    if (b.status !== undefined) {
      if (!['active', 'disabled'].includes(b.status)) {
        reply.code(400).send({ error: 'INVALID_STATUS' });
        return;
      }
      await updateCredentialStatus(id, b.status as 'active' | 'disabled');
    }
    if (b.label !== undefined || b.category !== undefined) await updateCredentialMeta(id, { label: b.label, category: b.category });
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'credentials.update', target: full.key, detail: b.value !== undefined ? 'value rotated' : JSON.stringify({ ...b, value: undefined }), ip: req.ip });
    return { ok: true };
  });

  app.delete('/api/credentials/:id', { preHandler: requireOwner }, async (req) => {
    const { id } = req.params as { id: string };
    await deleteCredential(id);
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'credentials.delete', target: id, ip: req.ip });
    return { ok: true };
  });

  app.post('/api/credentials/:id/test', { preHandler: requireOwner }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const full = await import('../db/repo2.js').then((m) => m.getCredentialFull(id));
    if (!full) {
      reply.code(404).send({ error: 'NOT_FOUND' });
      return;
    }
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'credentials.test', target: full.key, ip: req.ip });
    return testCredential(full);
  });

  // ---------- Logs ----------
  app.get('/api/logs', { preHandler: requireOwner }, async (req) => {
    const q = req.query as { limit?: string; action?: string };
    return listAudit(Math.min(500, Math.max(1, Number(q.limit ?? 100))), q.action || undefined);
  });

  // ---------- Security / sessions ----------
  app.get('/api/security/sessions', { preHandler: requireOwner }, async (req) => {
    const rows = await listSessions(req.auth!.user.id);
    return rows.map((r) => ({ ...r, id: r.id === req.auth!.session.id ? r.id : r.id.slice(0, 10) + '…', current: r.id === req.auth!.session.id }));
  });

  app.delete('/api/security/sessions/:id', { preHandler: requireOwner }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (id === req.auth!.session.id) {
      reply.code(400).send({ error: 'CANNOT_REVOKE_CURRENT' });
      return;
    }
    await revokeSession(id);
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'security.revoke_session', target: id, ip: req.ip });
    return { ok: true };
  });

  app.post('/api/security/sessions/revoke-others', { preHandler: requireOwner }, async (req) => {
    const n = await revokeAllSessionsForUser(req.auth!.user.id, req.auth!.session.id);
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'security.revoke_others', detail: `${n} sessions`, ip: req.ip });
    return { revoked: n };
  });

  // ---------- Backups ----------
  app.get('/api/backups', { preHandler: requireOwner }, async () => {
    const dir = join(config.dataDir, 'backups');
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const st = statSync(join(dir, f));
        return { name: f, size: st.size, createdAt: st.mtimeMs };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  });

  app.post('/api/backups', { preHandler: requireOwner }, async (req) => {
    const db = await getDb();
    const dir = join(config.dataDir, 'backups');
    mkdirSync(dir, { recursive: true });
    const name = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const dump: Record<string, unknown> = { created_at: Date.now(), version: appVersion() };
    for (const table of ['users', 'credentials', 'audit_logs', 'activity_events', 'queue_tracks', 'settings', 'stats_daily', 'webhooks', 'embed_templates']) {
      dump[table] = await db.all(`SELECT * FROM ${table}`);
    }
    writeFileSync(join(dir, name), JSON.stringify(dump));
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'backup.create', target: name, ip: req.ip });
    return { ok: true, name };
  });

  app.get('/api/backups/:name/download', { preHandler: requireOwner }, async (req, reply) => {
    const { name } = req.params as { name: string };
    if (!/^[a-zA-Z0-9._-]+\.json$/.test(name)) {
      reply.code(400).send({ error: 'INVALID_NAME' });
      return reply;
    }
    const p = join(config.dataDir, 'backups', name);
    if (!existsSync(p)) {
      reply.code(404).send({ error: 'NOT_FOUND' });
      return reply;
    }
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'backup.download', target: name, ip: req.ip });
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', `attachment; filename="${name}"`);
    return createReadStream(p);
  });

  // ---------- Webhooks ----------
  app.get('/api/webhooks', { preHandler: requireOwner }, async () => listWebhooks());

  app.post('/api/webhooks', { preHandler: requireOwner }, async (req, reply) => {
    const b = req.body as { name?: string; url?: string; events?: string };
    if (!b.name || !b.url || !/^https?:\/\/.+/i.test(b.url)) {
      reply.code(400).send({ error: 'INVALID_INPUT' });
      return;
    }
    const row = await createWebhook({ name: b.name.slice(0, 80), url: b.url.slice(0, 500), events: (b.events ?? '*').slice(0, 200) });
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'webhooks.create', target: b.name, ip: req.ip });
    return row;
  });

  app.delete('/api/webhooks/:id', { preHandler: requireOwner }, async (req) => {
    const { id } = req.params as { id: string };
    await deleteWebhook(id);
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'webhooks.delete', target: id, ip: req.ip });
    return { ok: true };
  });

  app.post('/api/webhooks/:id/test', { preHandler: requireOwner }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const hooks = await listWebhooks();
    const hook = hooks.find((h) => h.id === id);
    if (!hook) {
      reply.code(404).send({ error: 'NOT_FOUND' });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-NABEE-Event': 'test' },
        body: JSON.stringify({ event: 'test', data: { from: 'NABEE CORE' }, ts: Date.now() }),
        signal: ctrl.signal,
      });
      await markWebhookTested(id, `POST ${res.status}`);
      return { ok: res.ok, detail: `HTTP ${res.status}` };
    } catch (e) {
      const detail = e instanceof Error ? e.message.slice(0, 100) : 'FAILED';
      await markWebhookTested(id, `ERROR ${detail}`);
      return { ok: false, detail };
    } finally {
      clearTimeout(t);
    }
  });

  // ---------- Embeds ----------
  app.get('/api/embeds', { preHandler: requireStaff }, async () => listEmbeds());

  app.post('/api/embeds', { preHandler: requireOwner }, async (req, reply) => {
    const b = req.body as { id?: string | null; name?: string; data?: unknown };
    if (!b.name || !b.data || typeof b.data !== 'object') {
      reply.code(400).send({ error: 'INVALID_INPUT' });
      return;
    }
    const row = await saveEmbed(b.id ?? null, b.name.slice(0, 80), JSON.stringify(b.data).slice(0, 4000));
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'embeds.save', target: b.name, ip: req.ip });
    return row;
  });

  app.delete('/api/embeds/:id', { preHandler: requireOwner }, async (req) => {
    const { id } = req.params as { id: string };
    await deleteEmbed(id);
    return { ok: true };
  });

  app.post('/api/embeds/send', { preHandler: requireStaff }, async (req, reply) => {
    const b = req.body as { guildId?: string; channelId?: string; embed?: { title?: string; description?: string; color?: number } };
    const client = getDiscordClient();
    if (!client?.isReady()) {
      reply.code(503).send({ error: 'BOT_NOT_CONFIGURED' });
      return;
    }
    if (!b.channelId || (!b.embed?.title && !b.embed?.description)) {
      reply.code(400).send({ error: 'INVALID_INPUT' });
      return;
    }
    try {
      const channel = await client.channels.fetch(b.channelId);
      if (!channel || !channel.isTextBased()) {
        reply.code(400).send({ error: 'CHANNEL_NOT_TEXT' });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (channel as any).send({
        embeds: [
          {
            title: (b.embed.title ?? '').slice(0, 256),
            description: (b.embed.description ?? '').slice(0, 4000),
            color: b.embed.color ?? 0x2f7dff,
            footer: { text: 'NABEE CORE • Web Control Panel' },
          },
        ],
      });
      await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'embeds.send', target: b.channelId, ip: req.ip });
      return { ok: true };
    } catch (e) {
      reply.code(502).send({ error: 'SEND_FAILED', detail: e instanceof Error ? e.message.slice(0, 200) : '' });
    }
  });

  // ---------- Settings ----------
  app.get('/api/settings', { preHandler: requireOwner }, async () => {
    const cur = await allSettings();
    return {
      maxVoice: cur.maxVoice ?? 5,
      defaultVolume: cur.defaultVolume ?? 70,
      presence: cur.presence ?? '🎵 NABEE CORE Music',
    };
  });

  app.put('/api/settings', { preHandler: requireOwner }, async (req, reply) => {
    const b = req.body as { maxVoice?: number; defaultVolume?: number; presence?: string };
    if (b.maxVoice !== undefined) {
      if (!Number.isInteger(b.maxVoice) || b.maxVoice < 1 || b.maxVoice > 50) {
        reply.code(400).send({ error: 'INVALID_MAXVOICE' });
        return;
      }
      await setSetting('maxVoice', b.maxVoice);
    }
    if (b.defaultVolume !== undefined) {
      if (typeof b.defaultVolume !== 'number' || b.defaultVolume < 0 || b.defaultVolume > 150) {
        reply.code(400).send({ error: 'INVALID_VOLUME' });
        return;
      }
      await setSetting('defaultVolume', b.defaultVolume);
    }
    if (b.presence !== undefined) {
      if (typeof b.presence !== 'string' || b.presence.length > 80) {
        reply.code(400).send({ error: 'INVALID_PRESENCE' });
        return;
      }
      await setPresence(b.presence);
    }
    await writeAudit({ userId: req.auth!.user.id, username: req.auth!.user.login, action: 'settings.update', detail: JSON.stringify({ ...b, presence: undefined }), ip: req.ip });
    return allSettings();
  });
}

function listGuildSnapshot(): { id: string; name: string; iconUrl: string | null; memberCount: number; active: boolean }[] {
  const c = getDiscordClient();
  if (!c?.isReady()) return [];
  return [...c.guilds.cache.values()]
    .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))
    .slice(0, 20)
    .map((g) => ({
      id: g.id,
      name: g.name,
      iconUrl: g.iconURL({ size: 64 }),
      memberCount: g.memberCount ?? 0,
      active: music.getState(g.id).connected,
    }));
}

async function pushActivitySafe(type: string, title: string, detail?: string): Promise<void> {
  try {
    const { pushActivity } = await import('../db/repo.js');
    await pushActivity(type, title, detail);
  } catch (e) {
    log.warn({ err: e instanceof Error ? e.message : String(e) }, 'activity push failed');
  }
}
