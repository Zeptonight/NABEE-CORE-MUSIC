import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = pathDirname();
function pathDirname(): string {
  // works both when running tsx from server/src and when running compiled dist
  const here = fileURLToPath(import.meta.url);
  return resolve(here, '../../../');
}
/** Repository root (server/..). */
export const repoRoot = __dirname;

function bool(v: string | undefined, dflt: boolean): boolean {
  if (v === undefined || v === '') return dflt;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function int(v: string | undefined, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : dflt;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
  port: int(process.env.PORT, 8787),
  host: process.env.HOST ?? '0.0.0.0',

  /** Public base URL used to build the GitHub OAuth redirect_uri. */
  baseUrl: (process.env.BASE_URL ?? '').replace(/\/+$/, ''),

  dataDir: resolve(repoRoot, process.env.DATA_DIR ?? '.data'),

  // --- secrets ---
  sessionSecret: process.env.SESSION_SECRET ?? '',

  // --- github oauth (optional until configured) ---
  githubClientId: process.env.GITHUB_CLIENT_ID ?? '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  /** Immutable numeric GitHub user id(s) granted the owner role. Comma separated. */
  githubOwnerIds: (process.env.GITHUB_OWNER_ID ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // --- discord bot (optional until configured) ---
  discordToken: process.env.DISCORD_TOKEN ?? '',
  discordClientId: process.env.DISCORD_CLIENT_ID ?? '',

  // --- database ---
  databaseUrl: process.env.DATABASE_URL ?? '',

  // --- web ---
  /** Allow embedding in iframes (needed for sandbox preview). Default: allow outside production. */
  allowIframe: bool(process.env.ALLOW_IFRAME, (process.env.NODE_ENV ?? 'development') !== 'production'),

  sessionTtlMs: int(process.env.SESSION_TTL_HOURS, 24 * 7) * 3600 * 1000,

  webDist: resolve(repoDir(), 'web/dist'),
};

function repoDir(): string {
  return resolve(__dirname);
}

export const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_USER_URL = 'https://api.github.com/user';
