import { getDb } from './index.js';

export async function ensureStatsColumns(): Promise<void> {
  const db = await getDb();
  if (db.dialect === 'sqlite') {
    const cols = await db.all("PRAGMA table_info(stats_daily)");
    const names = new Set(cols.map((c) => String(c.name)));
    if (!names.has('servers')) await db.exec('ALTER TABLE stats_daily ADD COLUMN servers INTEGER NOT NULL DEFAULT 0');
    if (!names.has('users')) await db.exec('ALTER TABLE stats_daily ADD COLUMN users INTEGER NOT NULL DEFAULT 0');
  }
  // postgres schema is created with the columns included
}

export async function snapshotCounts(servers: number, users: number): Promise<void> {
  const db = await getDb();
  const day = new Date().toISOString().slice(0, 10);
  if (db.dialect === 'postgres') {
    await db.run(
      `INSERT INTO stats_daily (day, servers, users) VALUES (?, ?, ?)
       ON CONFLICT (day) DO UPDATE SET servers = GREATEST(stats_daily.servers, EXCLUDED.servers), users = GREATEST(stats_daily.users, EXCLUDED.users)`,
      [day, servers, users],
    );
  } else {
    await db.run(
      `INSERT INTO stats_daily (day, servers, users) VALUES (?, ?, ?)
       ON CONFLICT (day) DO UPDATE SET servers = MAX(stats_daily.servers, excluded.servers), users = MAX(stats_daily.users, excluded.users)`,
      [day, servers, users],
    );
  }
}

export async function getDayCounts(day: string): Promise<{ servers: number; users: number }> {
  const db = await getDb();
  const r = await db.get('SELECT servers, users FROM stats_daily WHERE day = ?', [day]);
  return { servers: Number(r?.servers ?? 0), users: Number(r?.users ?? 0) };
}
