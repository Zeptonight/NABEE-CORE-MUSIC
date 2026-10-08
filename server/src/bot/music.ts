/**
 * Music engine — @discordjs/voice based, one state per guild.
 * Audio pipeline: source stream → ffmpeg (-af filters) → s16le 48k stereo → volume transformer → opus.
 * Queue is persisted in the database (queue_tracks) for durability across restarts.
 */
import {
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  type AudioPlayer,
  type AudioResource,
  type VoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { resolveFfmpeg } from './ffmpeg.js';
import { openStream, type SourceTrack } from './source.js';
import { getDb } from '../db/index.js';
import { log } from '../logger.js';
import { fmtClock } from '../util.js';

export interface Filters {
  master: boolean; // ฟิลเตอร์เสียง (filter pipeline enable)
  bassboost: boolean; // บาสบูสต์
  hq: boolean; // เสียงคุณภาพสูง
}

export interface QueueTrack extends SourceTrack {
  queueId: string;
  requestedBy?: string;
  requestedByName?: string;
}

export interface PublicPlayerState {
  guildId: string;
  connected: boolean;
  channelId: string | null;
  nowPlaying: QueueTrack | null;
  positionMs: number;
  durationMs: number;
  paused: boolean;
  volume: number;
  filters: Filters;
  queue: QueueTrack[];
}

interface GuildState {
  guildId: string;
  voiceChannelId: string | null;
  player: AudioPlayer | null;
  connection: VoiceConnection | null;
  resource: AudioResource | null;
  ffmpegProc: ChildProcess | null;
  nowPlaying: QueueTrack | null;
  startedAt: number | null; // epoch ms when playback (re)started
  pausedAt: number | null;
  paused: boolean;
  restarting: boolean;
  volume: number;
  filters: Filters;
}

export const DEFAULT_FILTERS: Filters = { master: false, bassboost: false, hq: false };

class MusicEngine extends EventEmitter {
  private states = new Map<string, GuildState>();

  private state(guildId: string): GuildState {
    let s = this.states.get(guildId);
    if (!s) {
      s = {
        guildId,
        voiceChannelId: null,
        player: null,
        connection: null,
        resource: null,
        ffmpegProc: null,
        nowPlaying: null,
        startedAt: null,
        pausedAt: null,
        paused: false,
        restarting: false,
        volume: 70,
        filters: { ...DEFAULT_FILTERS },
      };
      this.states.set(guildId, s);
    }
    return s;
  }

  isOnline(): boolean {
    return this.connectionsCount() > 0;
  }

  connectionsCount(): number {
    let n = 0;
    for (const s of this.states.values()) if (s.connection && s.connection.state.status !== VoiceConnectionStatus.Destroyed) n++;
    return n;
  }

  getState(guildId: string): PublicPlayerState {
    const s = this.state(guildId);
    return {
      guildId,
      connected: Boolean(s.connection && s.connection.state.status !== VoiceConnectionStatus.Destroyed),
      channelId: s.voiceChannelId,
      nowPlaying: s.nowPlaying,
      positionMs: this.positionMs(s),
      durationMs: s.nowPlaying?.durationMs ?? 0,
      paused: s.paused,
      volume: s.volume,
      filters: { ...s.filters },
      queue: this.dbQueueCache.get(guildId) ?? [],
    };
  }

  positionMs(s: GuildState): number {
    if (!s.nowPlaying) return 0;
    if (s.paused || !s.startedAt) {
      return s.pausedAt && s.startedAt ? s.pausedAt - s.startedAt : 0;
    }
    return Date.now() - s.startedAt;
  }

  // ---------- queue persistence ----------
  private dbQueueCache = new Map<string, QueueTrack[]>();

  async loadQueue(guildId: string): Promise<QueueTrack[]> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM queue_tracks WHERE guild_id = ? ORDER BY position ASC', [guildId]);
    const tracks: QueueTrack[] = rows.map((r) => ({
      queueId: String(r.id),
      id: String(r.url ?? ''),
      url: String(r.url ?? ''),
      title: String(r.title),
      author: String(r.author ?? ''),
      durationMs: Number(r.duration_ms ?? 0),
      thumbnail: String(r.thumbnail ?? ''),
      source: 'youtube',
      requestedBy: r.requested_by ? String(r.requested_by) : undefined,
      requestedByName: r.requested_by_name ? String(r.requested_by_name) : undefined,
    }));
    this.dbQueueCache.set(guildId, tracks);
    return tracks;
  }

  async enqueue(guildId: string, track: SourceTrack, requestedBy?: { id: string; name: string }): Promise<QueueTrack> {
    const db = await getDb();
    const rows = await db.all('SELECT COUNT(*) AS n FROM queue_tracks WHERE guild_id = ?', [guildId]);
    const position = Number(rows[0]?.n ?? 0);
    const queueId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await db.run(
      'INSERT INTO queue_tracks (id, guild_id, position, title, author, duration_ms, source, url, thumbnail, requested_by, requested_by_name, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [queueId, guildId, position, track.title, track.author, Math.round(track.durationMs), track.source, track.url, track.thumbnail, requestedBy?.id ?? null, requestedBy?.name ?? null, Date.now()],
    );
    const qt: QueueTrack = { ...track, queueId, requestedBy: requestedBy?.id, requestedByName: requestedBy?.name };
    const cache = this.dbQueueCache.get(guildId) ?? [];
    cache.push(qt);
    this.dbQueueCache.set(guildId, cache);
    this.emitUpdate(guildId);
    return qt;
  }

  async removeFromQueue(guildId: string, queueId: string): Promise<boolean> {
    const db = await getDb();
    await db.run('DELETE FROM queue_tracks WHERE id = ? AND guild_id = ?', [queueId, guildId]);
    const cache = this.dbQueueCache.get(guildId) ?? [];
    const idx = cache.findIndex((t) => t.queueId === queueId);
    if (idx >= 0) cache.splice(idx, 1);
    this.dbQueueCache.set(guildId, cache);
    this.emitUpdate(guildId);
    return idx >= 0;
  }

  async clearQueue(guildId: string): Promise<number> {
    const db = await getDb();
    const cache = this.dbQueueCache.get(guildId) ?? [];
    await db.run('DELETE FROM queue_tracks WHERE guild_id = ?', [guildId]);
    this.dbQueueCache.set(guildId, []);
    this.emitUpdate(guildId);
    return cache.length;
  }

  // ---------- playback ----------
  join(guildId: string, voiceChannelId: string, adapterCreator: unknown): boolean {
    const s = this.state(guildId);
    s.voiceChannelId = voiceChannelId;
    if (!s.player) {
      s.player = createAudioPlayer();
      s.player.on('stateChange', (oldS, newS) => {
        if (oldS.status === 'playing' && newS.status === 'idle') {
          void this.onTrackEnd(s);
        }
      });
      s.player.on('error', (err) => {
        log.error({ guildId, err: err.message }, 'audio player error');
        void this.onTrackEnd(s);
      });
    }
    s.connection = joinVoiceChannel({
      channelId: voiceChannelId,
      guildId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adapterCreator: adapterCreator as any,
      selfDeaf: true,
    });
    s.connection.subscribe(s.player);
    s.connection.on(VoiceConnectionStatus.Disconnected, () => {
      // documented reconnection flow for voice server changes
      try {
        entersState(s.connection!, VoiceConnectionStatus.Signalling, 15_000)
          .then(() => {
            /* reconnected */
          })
          .catch(() => this.leave(guildId));
      } catch {
        this.leave(guildId);
      }
    });
    this.emitUpdate(guildId);
    return true;
  }

  leave(guildId: string): void {
    const s = this.state(guildId);
    this.stopPlayback(s);
    try {
      getVoiceConnection(guildId)?.destroy();
    } catch {
      /* already destroyed */
    }
    s.connection = null;
    s.voiceChannelId = null;
    this.emitUpdate(guildId);
  }

  private stopPlayback(s: GuildState): void {
    try {
      s.player?.stop(true);
    } catch {
      /* ignore */
    }
    try {
      s.ffmpegProc?.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    s.ffmpegProc = null;
    s.resource = null;
    s.nowPlaying = null;
    s.startedAt = null;
    s.pausedAt = null;
    s.paused = false;
  }

  private filterArgs(f: Filters): string[] {
    const chain: string[] = [];
    if (f.master && f.bassboost) chain.push('bass=g=8:dynaudnorm=1.2');
    else if (f.bassboost) chain.push('bass=g=6');
    if (f.master && f.hq) chain.push('aresample=48000:resampler=swr:precision=28,loudnorm=I=-16:TP=-1.0');
    else if (f.hq) chain.push('aresample=48000:precision=28');
    return chain.length ? ['-af', chain.join(',')] : [];
  }

  private async startTrack(s: GuildState, track: QueueTrack, seekMs = 0): Promise<void> {
    const ffmpeg = resolveFfmpeg();
    if (!ffmpeg) throw new Error('FFMPEG_UNAVAILABLE');
    if (!s.player || !s.connection) throw new Error('NOT_CONNECTED');

    // stop previous pipeline
    try {
      s.ffmpegProc?.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    const { stream } = await openStream(track.url, Math.floor(seekMs / 1000));
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      ...this.filterArgs(s.filters),
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ];
    const proc = spawn(ffmpeg, args, { stdio: ['pipe', 'pipe', 'ignore'] });
    s.ffmpegProc = proc;
    stream.pipe(proc.stdin);
    proc.on('error', (e) => log.error({ err: e.message }, 'ffmpeg spawn error'));

    const resource = createAudioResource(proc.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true,
    });
    if (resource.volume) resource.volume.setVolumeLogarithmic(s.volume / 100);
    s.resource = resource;
    s.nowPlaying = track;
    s.startedAt = Date.now() - seekMs;
    s.pausedAt = null;
    s.paused = false;
    s.player.play(resource);
    this.emit('track:start', { guildId: s.guildId, track });
    this.emitUpdate(s.guildId);
  }

  private async onTrackEnd(s: GuildState): Promise<void> {
    const finished = s.nowPlaying;
    s.nowPlaying = null;
    s.startedAt = null;
    if (finished) this.emit('track:end', { guildId: s.guildId, track: finished });
    const cache = this.dbQueueCache.get(s.guildId) ?? [];
    const next = cache[0];
    if (next) {
      try {
        await this.removeFromQueue(s.guildId, next.queueId);
        await this.startTrack(s, next);
        return;
      } catch (e) {
        log.error({ err: e instanceof Error ? e.message : String(e) }, 'failed to start next track');
      }
    }
    this.emitUpdate(s.guildId);
  }

  async playNow(guildId: string, track: QueueTrack): Promise<void> {
    const s = this.state(guildId);
    if (s.nowPlaying) {
      await this.removeFromQueue(guildId, s.nowPlaying.queueId);
    }
    await this.startTrack(s, track);
  }

  skip(guildId: string): boolean {
    const s = this.state(guildId);
    if (!s.player || !s.nowPlaying) return false;
    s.player.stop(true); // triggers stateChange → onTrackEnd → next
    return true;
  }

  pause(guildId: string): boolean {
    const s = this.state(guildId);
    if (!s.player || s.paused || !s.nowPlaying) return false;
    const ok = s.player.pause();
    if (ok) {
      s.paused = true;
      s.pausedAt = Date.now();
      this.emitUpdate(guildId);
    }
    return ok;
  }

  resume(guildId: string): boolean {
    const s = this.state(guildId);
    if (!s.player || !s.paused) return false;
    const ok = s.player.unpause();
    if (ok) {
      const pausedFor = s.pausedAt ? Date.now() - s.pausedAt : 0;
      s.startedAt = (s.startedAt ?? Date.now()) + pausedFor;
      s.pausedAt = null;
      s.paused = false;
      this.emitUpdate(guildId);
    }
    return ok;
  }

  setVolume(guildId: string, v: number): number {
    const s = this.state(guildId);
    const vol = Math.min(150, Math.max(0, Math.round(v)));
    s.volume = vol;
    if (s.resource?.volume) s.resource.volume.setVolumeLogarithmic(vol / 100);
    this.emitUpdate(guildId);
    return vol;
  }

  async setFilter(guildId: string, patch: Partial<Filters>): Promise<Filters> {
    const s = this.state(guildId);
    s.filters = { ...s.filters, ...patch };
    // restart current track with new filter chain, preserving position
    if (s.nowPlaying && s.player && s.connection) {
      const pos = this.positionMs(s);
      const track = s.nowPlaying;
      try {
        s.player.stop(true);
        // prevent onTrackEnd auto-advance race for the old track
        await this.startTrack(s, track, pos);
      } catch (e) {
        log.error({ err: e instanceof Error ? e.message : String(e) }, 'filter restart failed');
      }
    }
    this.emitUpdate(guildId);
    return { ...s.filters };
  }

  emitUpdate(guildId: string): void {
    this.emit('update', this.getState(guildId));
  }

  progressText(s: PublicPlayerState): string {
    return `${fmtClock(s.positionMs)} / ${fmtClock(s.durationMs)}`;
  }
}

export const music = new MusicEngine();
