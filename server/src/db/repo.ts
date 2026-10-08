import { getDb } from './index.js';
import { nowMs } from '../util.js';
import { newId } from '../security/crypto.js';

// ---------- Users ----------
export interface UserRow {
  id: string;
  github_id: string;
  login: string;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'user';
  disabled: number;
  created_at: number;
  last_login_at: number | null;
}

export async function upsertGithubUser(u: { githubId: string; login: string; avatarUrl: string; isOwner: boolean }): Promise<UserRow> {
  const db = await getDb();
  const existing = await db.get('SELECT * FROM users WHERE github_id = ?', [u.githubId]);
  const t = nowMs();
  if (existing) {
    const role = u.isOwner ? 'owner' : (existing.role as string);
    await db.run('UPDATE users SET login = ?, avatar_url = ?, role = ?, last_login_at = ? WHERE id = ?', [
      u.login,
      u.avatarUrl,
      role,
      t,
      existing.id as string,
    ]);
    return (await db.get('SELECT * FROM users WHERE id = ?', [existing.id as string])) as unknown as UserRow;
  }
  const id = newId();
  await db.run('INSERT INTO users (id, github_id, login, avatar_url, role, disabled, created_at, last_login_at) VALUES (?,?,?,?,?,0,?,?)', [
    id,
    u.githubId,
    u.login,
    u.avatarUrl,
    u.isOwner ? 'owner' : 'user',
    t,
    t,
  ]);
  return (await db.get('SELECT * FROM users WHERE id = ?', [id])) as unknown as UserRow;
}

export async function getUserById(id: string): Promise<UserRow | undefined> {
  const db = await getDb();
  return (await db.get('SELECT * FROM users WHERE id = ?', [id])) as unknown as UserRow | undefined;
}

export async function listUsers(): Promise<UserRow[]> {
  const db = await getDb();
  return (await db.all('SELECT * FROM users ORDER BY created_at DESC')) as unknown as UserRow[];
}

export async function updateUser(id: string, patch: { role?: string; disabled?: number }): Promise<void> {
  const db = await getDb();
  const cur = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!cur) throw new Error('USER_NOT_FOUND');
  const role = patch.role ?? (cur.role as string);
  const disabled = patch.disabled ?? (cur.disabled as number);
  await db.run('UPDATE users SET role = ?, disabled = ? WHERE id = ?', [role, disabled, id]);
}

// ---------- Sessions ----------
export interface SessionRow {
  id: string;
  user_id: string;
  ip: string | null;
  user_agent: string | null;
  created_at: number;
  expires_at: number;
  revoked: number;
}

export async function createSession(sess: { id: string; userId: string; ip: string; userAgent: string; ttlMs: number }): Promise<void> {
  const db = await getDb();
  const t = nowMs();
  await db.run('INSERT INTO sessions (id, user_id, ip, user_agent, created_at, expires_at, revoked) VALUES (?,?,?,?,?,?,0)', [
    sess.id,
    sess.userId,
    sess.ip,
    sess.userAgent,
    t,
    t + sess.ttlMs,
  ]);
}

export async function getSession(id: string): Promise<SessionRow | undefined> {
  const db = await getDb();
  return (await db.get('SELECT * FROM sessions WHERE id = ? AND revoked = 0', [id])) as unknown as SessionRow | undefined;
}

export async function revokeSession(id: string): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE sessions SET revoked = 1 WHERE id = ?', [id]);
}

export async function revokeAllSessionsForUser(userId: string, exceptId?: string): Promise<number> {
  const db = await getDb();
  const rows = await db.all('SELECT id FROM sessions WHERE user_id = ? AND revoked = 0', [userId]);
  let n = 0;
  for (const r of rows) {
    const sid = r.id as string;
    if (exceptId && sid === exceptId) continue;
    await db.run('UPDATE sessions SET revoked = 1 WHERE id = ?', [sid]);
    n++;
  }
  return n;
}

export async function listSessions(userId: string): Promise<SessionRow[]> {
  const db = await getDb();
  return (
    (await db.all('SELECT * FROM sessions WHERE user_id = ? AND revoked = 0 AND expires_at > ? ORDER BY created_at DESC', [userId, nowMs()])) as unknown as SessionRow[]
  );
}

export async function pruneExpiredSessions(): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM sessions WHERE expires_at < ? OR revoked = 1', [nowMs() - 30 * 86400_000]);
}

// ---------- Audit ----------
export async function writeAudit(a: { userId?: string; username?: string; action: string; target?: string; detail?: string; ip?: string }): Promise<void> {
  const db = await getDb();
  await db.run('INSERT INTO audit_logs (id, user_id, username, action, target, detail, ip, created_at) VALUES (?,?,?,?,?,?,?,?)', [
    newId(),
    a.userId ?? null,
    a.username ?? null,
    a.action,
    a.target ?? null,
    a.detail ?? null,
    a.ip ?? null,
    nowMs(),
  ]);
}

export async function listAudit(limit = 100, action?: string): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  if (action) return db.all('SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ?', [action, limit]);
  return db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
}

// ---------- Activity ----------
export async function pushActivity(type: string, title: string, detail?: string): Promise<void> {
  const db = await getDb();
  await db.run('INSERT INTO activity_events (id, type, title, detail, created_at) VALUES (?,?,?,?,?)', [newId(), type, title, detail ?? null, nowMs()]);
}

export async function listActivity(limit = 8): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  return db.all('SELECT * FROM activity_events ORDER BY created_at DESC LIMIT ?', [limit]);
}

// ---------- Stats (real counters) ----------
export async function bumpStat(kind: 'commands' | 'plays' | 'joins', n = 1): Promise<void> {
  const db = await getDb();
  const day = new Date().toISOString().slice(0, 10);
  const col = kind;
  await db.run(
    `INSERT INTO stats_daily (day, ${col}) VALUES (?, ?) ON CONFLICT (day) DO UPDATE SET ${col} = ${col} + ?`,
    db.dialect === 'postgres' ? [day, n, n] : [day, n, n],
  );
}

export async function getStatsDay(day: string): Promise<{ commands: number; plays: number; joins: number }> {
  const db = await getDb();
  const r = await db.get('SELECT commands, plays, joins FROM stats_daily WHERE day = ?', [day]);
  return { commands: Number(r?.commands ?? 0), plays: Number(r?.plays ?? 0), joins: Number(r?.joins ?? 0) };
}

export async function getStatsRange(days: number): Promise<{ day: string; commands: number; plays: number; joins: number }[]> {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM stats_daily ORDER BY day DESC LIMIT ?', [days]);
  return rows.map((r) => ({ day: String(r.day), commands: Number(r.commands), plays: Number(r.plays), joins: Number(r.joins) }));
}

// ---------- Settings ----------
export async function getSetting<T>(key: string, dflt: T): Promise<T> {
  const db = await getDb();
  const r = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
  if (!r) return dflt;
  try {
    return JSON.parse(String(r.value)) as T;
  } catch {
    return dflt;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.run(
    db.dialect === 'postgres'
      ? 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value'
      : 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
}

export async function allSettings(): Promise<Record<string, unknown>> {
  const db = await getDb();
  const rows = await db.all('SELECT key, value FROM settings');
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      out[String(r.key)] = JSON.parse(String(r.value));
    } catch {
      /* skip */
    }
  }
  return out;
}
