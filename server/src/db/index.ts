import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { config } from '../config.js';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

export type Dialect = 'sqlite' | 'postgres';

export interface DbDriver {
  dialect: Dialect;
  run(sql: string, params?: unknown[]): Promise<void>;
  get(sql: string, params?: unknown[]): Promise<Record<string, unknown> | undefined>;
  all(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

/** Translate `?` placeholders to `$n` for postgres. */
function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function makeSqlite(): DbDriver {
  mkdirSync(config.dataDir, { recursive: true });
  const file = join(config.dataDir, 'nabee.db');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  return {
    dialect: 'sqlite',
    async run(sql, params = []) {
      db.prepare(sql).run(...(params as never[]));
    },
    async get(sql, params = []) {
      return db.prepare(sql).get(...(params as never[])) as Record<string, unknown> | undefined;
    },
    async all(sql, params = []) {
      return db.prepare(sql).all(...(params as never[])) as Record<string, unknown>[];
    },
    async exec(sql) {
      db.exec(sql);
    },
    async close() {
      db.close();
    },
  };
}

function makePostgres(url: string): DbDriver {
  // return int8 (BIGINT) as JS number — our epochs/durations are well within safe range
  pg.types.setTypeParser(20, (v: string) => Number(v));
  const pool = new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000 });
  return {
    dialect: 'postgres',
    async run(sql, params = []) {
      await pool.query(toPgSql(sql), params as unknown[]);
    },
    async get(sql, params = []) {
      const r = await pool.query(toPgSql(sql), params as unknown[]);
      return r.rows[0];
    },
    async all(sql, params = []) {
      const r = await pool.query(toPgSql(sql), params as unknown[]);
      return r.rows;
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async close() {
      await pool.end();
    },
  };
}

const SCHEMA_SQLITE = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_id TEXT UNIQUE NOT NULL,
  login TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  value_enc TEXT NOT NULL,
  mask TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_test_at INTEGER,
  last_test_ok INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS queue_tracks (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  duration_ms INTEGER,
  source TEXT,
  url TEXT,
  thumbnail TEXT,
  requested_by TEXT,
  requested_by_name TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stats_daily (
  day TEXT PRIMARY KEY,
  commands INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  joins INTEGER NOT NULL DEFAULT 0,
  servers INTEGER NOT NULL DEFAULT 0,
  users INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  last_test_at INTEGER,
  last_test_status TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS embed_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_events(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_guild ON queue_tracks(guild_id, position);
`;

const SCHEMA_POSTGRES = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_id TEXT UNIQUE NOT NULL,
  login TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL,
  last_login_at BIGINT
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  value_enc TEXT NOT NULL,
  mask TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_test_at BIGINT,
  last_test_ok INTEGER,
  created_by TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  username TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  ip TEXT,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS queue_tracks (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  duration_ms BIGINT,
  source TEXT,
  url TEXT,
  thumbnail TEXT,
  requested_by TEXT,
  requested_by_name TEXT,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stats_daily (
  day TEXT PRIMARY KEY,
  commands INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  joins INTEGER NOT NULL DEFAULT 0,
  servers INTEGER NOT NULL DEFAULT 0,
  users INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  last_test_at BIGINT,
  last_test_status TEXT,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS embed_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_events(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_guild ON queue_tracks(guild_id, position);
`;

export type DB = DbDriver;

let dbInstance: DB | null = null;

export async function getDb(): Promise<DB> {
  if (dbInstance) return dbInstance;
  const db = config.databaseUrl ? makePostgres(config.databaseUrl) : makeSqlite();
  await db.exec(config.databaseUrl ? SCHEMA_POSTGRES : SCHEMA_SQLITE);
  dbInstance = db;
  return db;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

/** Real measured latency of the underlying database (used in the Database metric card). */
export async function measureDbLatency(db: DB): Promise<number> {
  const t0 = performance.now();
  if (db.dialect === 'postgres') await db.get('SELECT 1 AS ok');
  else await db.get('SELECT 1 AS ok');
  return Math.max(0, Math.round((performance.now() - t0) * 10) / 10);
}

export async function dbEngineVersion(db: DB): Promise<string> {
  if (db.dialect === 'postgres') {
    const r = await db.get('SHOW server_version_num');
    const num = r?.server_version_num ? String(r.server_version_num) : '';
    if (num.length >= 4) return `PostgreSQL ${num.slice(0, 2)}.${num.slice(2, 4)}`;
    return 'PostgreSQL';
  }
  const r = await db.get('SELECT sqlite_version() AS v');
  return `SQLite ${r?.v ?? ''}`.trim();
}
