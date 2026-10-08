export interface Me {
  authenticated: boolean;
  user: { login: string; avatarUrl: string | null; role: 'owner' | 'admin' | 'user' } | null;
  githubConfigured: boolean;
  ownerConfigured: boolean;
}

export interface Bootstrap {
  version: string;
  github: { configured: boolean; ownerConfigured: boolean; baseUrlSet: boolean };
  discord: { configured: boolean; clientIdSet: boolean };
  database: { configured: boolean };
  allowIframe: boolean;
}

export interface MetricSample {
  t: number;
  cpu: number;
  ram: number;
  net: number;
}

export interface Metrics {
  t: number;
  cpu: number;
  cpuCores: number;
  ramUsed: number;
  ramTotal: number;
  dbLatency: number | null;
  diskUsed: number;
  diskTotal: number;
  diskPct: number;
  netBps: number;
  uptimeSec: number;
  history: MetricSample[];
}

export interface BotStatus {
  configured: boolean;
  online: boolean;
  ready: boolean;
  username: string | null;
  avatarUrl: string | null;
  uptimeSec: number | null;
  latencyMs: number | null;
  apiLatencyMs: number | null;
  guilds: number;
  users: number;
  voiceConnections: number;
  presence: string | null;
  maxVoice: number;
}

export interface DashStats {
  configured: boolean;
  servers: number;
  users: number;
  commandsToday: number;
  deltas: { servers: number; users: number; commands: number };
  sparkline: { hour: string; n: number }[];
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  created_at: number;
}

export interface QueueTrack {
  queueId: string;
  id: string;
  url: string;
  title: string;
  author: string;
  durationMs: number;
  thumbnail: string;
  source: string;
  requestedByName?: string;
}

export interface PlayerState {
  guildId: string;
  connected: boolean;
  channelId: string | null;
  nowPlaying: QueueTrack | null;
  positionMs: number;
  durationMs: number;
  paused: boolean;
  volume: number;
  filters: { master: boolean; bassboost: boolean; hq: boolean };
  queue: QueueTrack[];
}

export interface GuildInfo {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  active: boolean;
}

export interface DashboardData {
  bot: BotStatus;
  metrics: Metrics;
  stats: DashStats;
  activity: ActivityItem[];
  player: PlayerState | null;
  guilds: GuildInfo[];
  unread: number;
}
