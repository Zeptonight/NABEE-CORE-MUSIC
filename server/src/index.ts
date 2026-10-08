import { config } from './config.js';
import { log } from './logger.js';
import { getDb, closeDb, measureDbLatency } from './db/index.js';
import { ensureStatsColumns } from './db/stats.js';
import { startMetrics, stopMetrics } from './metrics.js';
import { pruneExpiredSessions, getSetting, setSetting } from './db/repo.js';
import { startBot, stopBot } from './bot/client.js';
import { resolveFfmpeg } from './bot/ffmpeg.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const app = await buildApp();

  // ---- init subsystems (real; skipped when unconfigured with honest UI states) ----
  const db = await getDb();
  await ensureStatsColumns().catch(() => undefined);
  // real first-boot timestamp (powers the announcement card — no fake dates)
  const firstBoot = await getSetting<number | null>('first_boot_at', null);
  if (!firstBoot) await setSetting('first_boot_at', Date.now());
  startMetrics(() => measureDbLatency(db).catch(() => null));
  setInterval(() => void pruneExpiredSessions().catch(() => undefined), 3600_000).unref();
  void resolveFfmpeg();
  void startBot(); // non-blocking — the panel works and shows NOT CONFIGURED without it

  await app.listen({ port: config.port, host: config.host });
  log.info({ port: config.port, env: config.nodeEnv, db: db.dialect, baseUrl: config.baseUrl || '(unset)' }, 'NABEE CORE started');

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'shutting down');
    stopMetrics();
    await stopBot();
    try {
      await app.close();
    } catch {
      /* ignore */
    }
    await closeDb();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  log.error({ err: e instanceof Error ? e.stack ?? e.message : String(e) }, 'fatal startup error');
  process.exit(1);
});
