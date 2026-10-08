import os from 'node:os';
import { readFileSync } from 'node:fs';
import { statfs } from 'node:fs/promises';

export interface MetricSample {
  t: number; // epoch ms
  cpu: number; // percent 0-100
  ram: number; // used bytes
  net: number; // bytes/sec (rx+tx)
}

export interface MetricsSnapshot {
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
  history: MetricSample[]; // coarse ring (30s resolution)
}

const SAMPLE_MS = 2000;
const FINE_KEEP = 900; // 30 minutes @ 2s
const COARSE_EVERY = 15; // 15 samples = 30s
const COARSE_KEEP = 24 * 120; // 24h @ 30s

const fine: MetricSample[] = [];
const coarse: MetricSample[] = [];

let lastCpus = os.cpus().map((c) => ({ ...c.times }));
let lastNet: { rx: number; tx: number; t: number } | null = null;
let dbLatency: number | null = null;
const startedAt = Date.now();

function readNetCounters(): { rx: number; tx: number } {
  try {
    const text = readFileSync('/proc/net/dev', 'utf8');
    let rx = 0;
    let tx = 0;
    for (const line of text.split('\n').slice(2)) {
      const [iface, rest] = line.split(':');
      if (!rest) continue;
      if (iface.trim() === 'lo') continue;
      const cols = rest.trim().split(/\s+/).map(Number);
      if (cols.length < 9) continue;
      rx += cols[0];
      tx += cols[8];
    }
    return { rx, tx };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

function cpuPct(): number {
  const now = os.cpus().map((c) => ({ ...c.times }));
  let idleD = 0;
  let totalD = 0;
  for (let i = 0; i < now.length; i++) {
    const a = lastCpus[i];
    const b = now[i];
    if (!a) continue;
    const idle = b.idle - a.idle;
    const total = b.user + b.nice + b.sys + b.idle + b.irq - (a.user + a.nice + a.sys + a.idle + a.irq);
    idleD += idle;
    totalD += total;
  }
  lastCpus = now;
  if (totalD <= 0) return 0;
  return Math.min(100, Math.max(0, (1 - idleD / totalD) * 100));
}

async function diskUsage(): Promise<{ used: number; total: number }> {
  try {
    const s = await statfs('/');
    const total = Number(s.blocks) * Number(s.bsize);
    const free = Number(s.bavail) * Number(s.bsize);
    return { used: total - free, total };
  } catch {
    return { used: 0, total: 0 };
  }
}

let timer: NodeJS.Timeout | null = null;
let tickCount = 0;
let lastSample: MetricSample | null = null;

async function tick(): Promise<void> {
  tickCount++;
  const t = Date.now();
  const cpu = cpuPct();
  const ramUsed = os.totalmem() - os.freemem();
  const netNow = readNetCounters();
  let netBps = 0;
  if (lastNet) {
    const dt = (t - lastNet.t) / 1000;
    if (dt > 0) netBps = Math.max(0, (netNow.rx - lastNet.rx + netNow.tx - lastNet.tx) / dt);
  }
  lastNet = { ...netNow, t };
  const sample: MetricSample = { t, cpu, ram: ramUsed, net: netBps };
  fine.push(sample);
  if (fine.length > FINE_KEEP) fine.shift();
  if (tickCount % COARSE_EVERY === 0) {
    coarse.push(sample);
    if (coarse.length > COARSE_KEEP) coarse.shift();
  }
  lastSample = sample;
}

export function startMetrics(dbLatencyGetter: () => Promise<number | null>): void {
  if (timer) return;
  void tick();
  timer = setInterval(() => {
    void tick();
  }, SAMPLE_MS);
  // measure DB latency periodically (real roundtrip)
  setInterval(() => {
    dbLatencyGetter()
      .then((v) => (dbLatency = v))
      .catch(() => (dbLatency = null));
  }, 5000).unref();
  void diskUsage();
}

export function stopMetrics(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

let diskCache: { used: number; total: number; at: number } = { used: 0, total: 0, at: 0 };

export async function getMetrics(): Promise<MetricsSnapshot> {
  if (Date.now() - diskCache.at > 30_000) {
    const d = await diskUsage();
    diskCache = { ...d, at: Date.now() };
  }
  return {
    t: Date.now(),
    cpu: lastSample ? Math.round(lastSample.cpu * 10) / 10 : 0,
    cpuCores: os.cpus().length,
    ramUsed: lastSample?.ram ?? 0,
    ramTotal: os.totalmem(),
    dbLatency,
    diskUsed: diskCache.used,
    diskTotal: diskCache.total,
    diskPct: diskCache.total > 0 ? Math.round((diskCache.used / diskCache.total) * 1000) / 10 : 0,
    netBps: lastSample?.net ?? 0,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    history: coarse.slice(-240),
  };
}

export function getFineHistory(n = 60): MetricSample[] {
  return fine.slice(-n);
}

export function processUptimeSec(): number {
  return Math.floor((Date.now() - startedAt) / 1000);
}
