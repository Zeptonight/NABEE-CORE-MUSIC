import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtDur, fmtClock, fmtBytes, fmtRate, fmtAgo } from '../api';
import { useLiveStream } from '../stream';
import { Card, Spark, AreaChart, Toggle, Delta, StatusPill, Empty } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { CoverArt, HeroArt, Mascot, CrownIcon } from '../ui/art';
import { useApp } from '../App';
import type { ActivityItem, Bootstrap, DashboardData, GuildInfo, Metrics, PlayerState } from '../ui/types';

/* ---------------- Hero banner (updated reference) ---------------- */
function Hero({ online, configured }: { online: boolean; configured: boolean }) {
  const state = configured ? (online ? 'online' : 'offline') : 'unset';
  const label = configured ? (online ? 'ONLINE' : 'OFFLINE') : 'NOT CONFIGURED';
  return (
    <section className="card hero">
      <div className="hero-art">
        <HeroArt />
      </div>
      <div className="hero-body">
        <div className="hero-title">บอทดิสคอร์ดระบบระดับพรีเมียม</div>
        <div className="hero-sub">ความคุณภาพของเสียงที่ดีที่สุด - พร้อมใช้งาน 24/7</div>
        <StatusPill state={state} label={label} />
      </div>
      <div className="hero-brand">
        <span>
          NABEE <em>HEX</em>
        </span>
        <span className="hero-brand2">
          TEAM <CrownIcon size={15} className="hero-brand-crown" />
        </span>
      </div>
      <div className="hero-crown-r">
        <CrownIcon size={54} className="hero-crown-outline" />
      </div>
    </section>
  );
}

/* ---------------- Bot status card (icon rows) ---------------- */
function BotStatusCard({ bot }: { bot: DashboardData['bot'] }) {
  const state = bot.configured ? (bot.ready ? '' : 'off') : 'unset';
  return (
    <Card title="สถานะบอท" icon="bot">
      <div className="status-top">
        <i className={`dot ${state}`} />
        <span className={`t ${state}`}>{bot.configured ? (bot.ready ? 'ออนไลน์' : 'ออฟไลน์') : 'ยังไม่ได้ตั้งค่า'}</span>
      </div>
      <div className="status-sub">{bot.configured ? (bot.ready ? 'ทำงานปกติ' : 'บอทไม่ตอบสนอง') : 'NOT CONFIGURED'}</div>
      <div className="kv">
        <span className="klab">
          <Icon name="clock" size={13} /> Uptime
        </span>
        {bot.uptimeSec != null ? <b>{fmtDur(bot.uptimeSec * 1000)}</b> : <b className="na">—</b>}
      </div>
      <div className="kv">
        <span className="klab">
          <Icon name="activity" size={13} /> Latency
        </span>
        {bot.latencyMs != null ? <b>{bot.latencyMs}ms</b> : <b className="na">—</b>}
      </div>
      <div className="kv">
        <span className="klab">
          <Icon name="discord" size={13} /> Discord API
        </span>
        {bot.apiLatencyMs != null ? <b>{bot.apiLatencyMs}ms</b> : <b className="na">—</b>}
      </div>
      <div className="kv">
        <span className="klab">
          <Icon name="headset" size={13} /> Voice Connections
        </span>
        <b>
          {bot.voiceConnections} / {bot.maxVoice}
        </b>
      </div>
    </Card>
  );
}

/* ---------------- สถิติระบบ (right rail) ---------------- */
function SysStatCard({ metrics, bot }: { metrics: Metrics; bot: DashboardData['bot'] }) {
  const gb = (b: number) => `${(b / 1024 ** 3).toFixed(1)} GB`;
  const ramPct = metrics.ramTotal > 0 ? (metrics.ramUsed / metrics.ramTotal) * 100 : 0;
  const rows: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string; pct: number }[] = [
    { icon: 'cpu', label: 'CPU Usage', value: `${metrics.cpu.toFixed(1)}%`, pct: metrics.cpu },
    { icon: 'ram', label: 'RAM Usage', value: gb(metrics.ramUsed), pct: ramPct },
    { icon: 'discord', label: 'Discord API', value: bot.apiLatencyMs != null ? `${bot.apiLatencyMs}ms` : '—', pct: bot.apiLatencyMs != null ? Math.min(100, bot.apiLatencyMs / 2) : 0 },
    { icon: 'backup', label: 'Database', value: metrics.dbLatency != null ? `${metrics.dbLatency}ms` : '—', pct: metrics.dbLatency != null ? Math.min(100, metrics.dbLatency) : 0 },
    { icon: 'clock', label: 'Uptime', value: bot.uptimeSec != null ? fmtDur(bot.uptimeSec * 1000) : '—', pct: 100 },
  ];
  return (
    <Card title="สถิติระบบ" icon="chart">
      {rows.map((r) => (
        <div key={r.label} className="ssrow">
          <div className="ssrow-top">
            <span className="tile-ic sm">
              <Icon name={r.icon} size={12} />
            </span>
            <span className="sslabel">{r.label}</span>
            <span className="ssval">{r.value}</span>
          </div>
          <div className="ssbar">
            <i style={{ width: `${Math.max(2, Math.min(100, r.pct))}%` }} />
          </div>
        </div>
      ))}
    </Card>
  );
}

/* ---------------- ข่าวสารประกาศ (real version + real first-boot date) ---------------- */
function AnnounceCard({ boot, firstBootAt }: { boot: Bootstrap; firstBootAt: number | null }) {
  const nav = useNavigate();
  const date = firstBootAt
    ? new Date(firstBootAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  return (
    <Card title="ข่าวสารประกาศ" icon="megaphone">
      <div className="arow announce" style={{ borderTop: 0 }}>
        <span className="aic">
          <Icon name="zap" size={13} />
        </span>
        <div className="atxt">
          <div className="atitle">อัปเดตเวอร์ชัน {boot.version}</div>
          <div className="adetail">NABEE CORE Music Bot • Web Control Panel พร้อมใช้งาน — ตรวจสอบสถานะระบบได้ที่หน้าซิสเทม</div>
          <div className="adetail" style={{ marginTop: 2 }}>{date}</div>
        </div>
      </div>
      <button className="card-link" style={{ alignSelf: 'flex-end', marginTop: 'auto' }} onClick={() => nav('/help')}>
        ดูเพิ่มเติม
      </button>
    </Card>
  );
}

/* ---------------- แหล่งทรัพยากร ---------------- */
function ResourcesCard() {
  const nav = useNavigate();
  return (
    <Card title="แหล่งทรัพยากร" icon="book">
      <button className="rrow" onClick={() => nav('/help')}>
        <span className="tile-ic sm">
          <Icon name="book" size={12} />
        </span>
        <span className="rlabel">คู่มือการใช้งาน</span>
        <Icon name="chevron-right" size={13} className="chev" />
      </button>
      <button className="rrow" onClick={() => nav('/api-docs')}>
        <span className="tile-ic sm">
          <Icon name="doc" size={12} />
        </span>
        <span className="rlabel">API Documentation</span>
        <Icon name="chevron-right" size={13} className="chev" />
      </button>
    </Card>
  );
}

/* ---------------- ติดต่อสนับสนุน ---------------- */
function SupportCard() {
  return (
    <Card title="ติดต่อสนับสนุน" icon="headset">
      <a className="rrow" href="https://discord.com/developers/docs" target="_blank" rel="noreferrer">
        <span className="tile-ic sm">
          <Icon name="discord" size={12} />
        </span>
        <span className="rlabel">Discord Support</span>
        <Icon name="chevron-right" size={13} className="chev" />
      </a>
      <a className="rrow" href="https://github.com/Zeptonight/NABEE-CORE-MUSIC/issues" target="_blank" rel="noreferrer">
        <span className="tile-ic sm">
          <Icon name="github" size={12} />
        </span>
        <span className="rlabel">GitHub Issues</span>
        <Icon name="chevron-right" size={13} className="chev" />
      </a>
    </Card>
  );
}

/* ---------------- Totals card ---------------- */
function StatsCard({ stats }: { stats: DashboardData['stats'] }) {
  const spark = stats.sparkline.map((s) => s.n);
  return (
    <Card title="สถิติรวม" icon="chart">
      <div className="stat-row">
        <span className="tile-ic">
          <Icon name="server" size={15} />
        </span>
        <div>
          <div className="stat-label">เซิร์ฟเวอร์</div>
          <div className="stat-val">{stats.configured ? stats.servers.toLocaleString('en-US') : '—'}</div>
        </div>
        <Delta value={stats.deltas.servers} />
      </div>
      <div className="stat-row">
        <span className="tile-ic">
          <Icon name="users" size={15} />
        </span>
        <div>
          <div className="stat-label">ผู้ใช้ทั้งหมด</div>
          <div className="stat-val">{stats.configured ? stats.users.toLocaleString('en-US') : '—'}</div>
        </div>
        <Delta value={stats.deltas.users} />
      </div>
      <div className="stat-row">
        <span className="tile-ic">
          <Icon name="zap" size={15} />
        </span>
        <div>
          <div className="stat-label">คำสั่งวันนี้</div>
          <div className="stat-val">{stats.commandsToday.toLocaleString('en-US')}</div>
        </div>
        <Delta value={stats.deltas.commands} />
      </div>
      <div className="stats-spark">
        <Spark data={spark} />
      </div>
    </Card>
  );
}

/* ---------------- Metric card ---------------- */
function MetricCard({ icon, label, value, data, color }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: React.ReactNode; data: number[]; color: string }) {
  return (
    <section className="card metric">
      <div className="metric-top">
        <span className="tile-ic">
          <Icon name={icon} size={14} />
        </span>
        <span>{label}</span>
      </div>
      <div className="metric-val">{value}</div>
      <div className="spark-wrap">
        <Spark data={data} stroke={color} />
      </div>
    </section>
  );
}

/* ---------------- Now playing + filters ---------------- */
function NowPlaying({ player, botConfigured }: { player: PlayerState | null; botConfigured: boolean }) {
  const nav = useNavigate();
  const [pos, setPos] = useState(player?.positionMs ?? 0);
  const [busy, setBusy] = useState(false);
  const lastSync = useRef<{ at: number; pos: number }>({ at: 0, pos: 0 });

  useEffect(() => {
    if (player) {
      lastSync.current = { at: Date.now(), pos: player.positionMs };
      setPos(player.positionMs);
    }
  }, [player?.positionMs, player?.nowPlaying?.queueId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => {
      if (player?.nowPlaying && !player.paused) setPos(lastSync.current.pos + (Date.now() - lastSync.current.at));
    }, 500);
    return () => clearInterval(t);
  }, [player?.nowPlaying, player?.paused]);

  const act = async (action: string, body?: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/api/player/${action}`, { method: 'POST', body: JSON.stringify({ guildId: 'default', ...body }) });
    } catch {
      /* surfaced by next refresh */
    } finally {
      setBusy(false);
    }
  };

  const setVolume = async (v: number) => {
    try {
      await api('/api/volume', { method: 'POST', body: JSON.stringify({ guildId: 'default', v }) });
    } catch {
      /* ignore */
    }
  };

  const setFilter = async (k: string, v: boolean) => {
    try {
      await api('/api/filters', { method: 'POST', body: JSON.stringify({ guildId: 'default', filters: { [k]: v } }) });
    } catch {
      /* ignore */
    }
  };

  const np = player?.nowPlaying ?? null;
  const dur = np?.durationMs ?? 0;
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;
  const disabled = !botConfigured || !player;
  const vol = player?.volume ?? 0;

  return (
    <Card title="กำลังเล่นตอนนี้" icon="headset" action={<Icon name="sliders" size={13} />}>
      <div className="np">
        <div className="cover">
          {np?.thumbnail ? <img src={np.thumbnail} alt="" width={86} height={86} referrerPolicy="no-referrer" /> : <CoverArt size={86} rounded={0} />}
        </div>
        <div className="np-info">
          <div className="np-title">{np ? np.title : botConfigured ? 'ไม่มีเพลงที่กำลังเล่น' : 'ยังไม่ได้เชื่อมต่อบอท'}</div>
          <div className="np-artist">{np ? np.author : 'NOT CONNECTED'}</div>
          <div className="progress-row">
            <span>{np ? fmtClock(pos) : '--:--'}</span>
            <div className="progress">
              <i style={{ width: `${pct}%` }} />
            </div>
            <span>{np ? fmtClock(dur) : '--:--'}</span>
          </div>
          <div className="np-status">
            <i className={`dot ${np && !player?.paused ? '' : 'off'}`} />
            {np ? (player?.paused ? 'หยุดชั่วคราว' : 'กำลังเล่น') : 'NO DATA'}
          </div>
        </div>
      </div>
      <div className="controls">
        <button className="ctl" aria-label="previous" disabled={disabled} onClick={() => act('skip')}>
          <Icon name="skip-back" size={15} />
        </button>
        <button className="ctl main" aria-label={player?.paused ? 'play' : 'pause'} disabled={disabled} onClick={() => act(player?.paused ? 'resume' : 'pause')}>
          <Icon name={player?.paused ? 'play' : 'pause'} size={17} />
        </button>
        <button className="ctl" aria-label="next" disabled={disabled} onClick={() => act('skip')}>
          <Icon name="skip-fwd" size={15} />
        </button>
      </div>
      <div className="volrow">
        <Icon name="volume" size={14} />
        <div
          className="volbar"
          onClick={(e) => {
            if (disabled) return;
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            void setVolume(Math.round(((e.clientX - r.left) / r.width) * 150));
          }}
        >
          <i style={{ width: `${(vol / 150) * 100}%` }} />
        </div>
        <span>{player ? `${vol}%` : '—'}</span>
      </div>
      <div className="filters">
        <div className="frow">
          <Icon name="speaker" size={14} />
          <span className="flabel">ระบบเสียงพื้นฐาน</span>
          <Toggle on={player?.filters.master ?? false} disabled={disabled} onChange={(v) => setFilter('master', v)} />
        </div>
        <div className="frow">
          <Icon name="wave" size={14} />
          <span className="flabel">บาสบูสต์</span>
          <Toggle on={player?.filters.bassboost ?? false} disabled={disabled} onChange={(v) => setFilter('bassboost', v)} />
        </div>
        <div className="frow">
          <Icon name="sliders" size={14} />
          <span className="flabel">เสียงคุณภาพสูง</span>
          <Toggle on={player?.filters.hq ?? false} disabled={disabled} onChange={(v) => setFilter('hq', v)} />
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Queue (6 rows + shuffle/refresh buttons) ---------------- */
function QueueCard({ player, botConfigured, onClear }: { player: PlayerState | null; botConfigured: boolean; onClear: () => void }) {
  const nav = useNavigate();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const queue = player?.queue ?? [];
  const remove = async (id: string) => {
    try {
      await api(`/api/queue/default/${id}`, { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    setMenuFor(null);
  };
  return (
    <Card
      title={
        <>
          คิวเพลง <span style={{ color: 'var(--txt-3)' }}>({queue.length})</span>
        </>
      }
      icon="music"
      action={
        <button className="card-link" onClick={() => nav('/queue')}>
          ดูทั้งหมด
        </button>
      }
    >
      <div className="qlist">
        {!botConfigured ? (
          <Empty icon="queue">บอทยังไม่ได้ตั้งค่า — คิวเพลงจะแสดงเมื่อเชื่อมต่อสำเร็จ</Empty>
        ) : queue.length === 0 ? (
          <Empty icon="queue">ไม่มีเพลงในคิว — เพิ่มเพลงผ่านหน้า “เพลง” หรือคำสั่ง /play</Empty>
        ) : (
          queue.slice(0, 6).map((t, i) => (
            <div key={t.queueId} className={`qrow ${i === 0 ? 'play' : ''}`}>
              <span className="qnum">{i + 1}</span>
              <span className="qthumb">
                {t.thumbnail ? <img src={t.thumbnail} alt="" width={30} height={30} referrerPolicy="no-referrer" /> : <CoverArt size={30} rounded={0} />}
              </span>
              <div className="qmain">
                <div className="qtitle">{t.title}</div>
                <div className="qartist">{t.author}</div>
              </div>
              <span className="qdur">{fmtClock(t.durationMs)}</span>
              <button className="qmore" aria-label="more" onClick={() => setMenuFor(menuFor === t.queueId ? null : t.queueId)}>
                <Icon name="more" size={13} />
              </button>
              {menuFor === t.queueId && (
                <div style={{ position: 'absolute', right: 6, top: 34, zIndex: 5 }}>
                  <button className="btn sm danger" onClick={() => remove(t.queueId)}>
                    <Icon name="trash" size={12} /> ลบออกจากคิว
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="qbtns">
        <button className="btn" disabled={!botConfigured || queue.length === 0} onClick={onClear}>
          <Icon name="shuffle" size={13} /> ล้างทั้งหมด
        </button>
        <button className="btn primary" disabled={!botConfigured} onClick={() => nav('/music')}>
          <Icon name="refresh" size={13} /> เพิ่มเพลง
        </button>
      </div>
    </Card>
  );
}

/* ---------------- Servers ---------------- */
function ServersCard({ guilds, configured, online }: { guilds: GuildInfo[]; configured: boolean; online: boolean }) {
  const nav = useNavigate();
  return (
    <Card
      title="เซิร์ฟเวอร์ที่บอทอยู่"
      icon="server"
      action={
        <button className="card-link" onClick={() => nav('/servers')}>
          ดูทั้งหมด
        </button>
      }
    >
      <div className="alist">
        {!configured || !online ? (
          <Empty icon="server">NOT CONFIGURED — บอทยังไม่ออนไลน์</Empty>
        ) : guilds.length === 0 ? (
          <Empty icon="server">บอทยังไม่ได้เข้าร่วมเซิร์ฟเวอร์ใด</Empty>
        ) : (
          guilds.slice(0, 5).map((g) => (
            <div key={g.id} className="srow">
              <span className="savatar">
                {g.iconUrl ? <img src={g.iconUrl} alt="" width={32} height={32} referrerPolicy="no-referrer" /> : <CoverArt size={32} rounded={16} />}
              </span>
              <div className="sinfo">
                <div className="sname">{g.name}</div>
                <div className="smembers">{g.memberCount.toLocaleString('en-US')} members</div>
              </div>
              <Icon name="chevron-right" size={13} className="chev" />
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/* ---------------- Activity ---------------- */
const ACT_ICON: Record<string, Parameters<typeof Icon>[0]['name']> = {
  track_start: 'music',
  track_added: 'plus',
  track_end: 'headset',
  voice_join: 'users',
  command: 'zap',
  system: 'shield',
};
function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card title="กิจกรรมล่าสุด" icon="activity" action={<span className="card-link" />}>
      <div className="alist">
        {items.length === 0 ? (
          <Empty icon="activity">ยังไม่มีกิจกรรม — NO DATA</Empty>
        ) : (
          items.slice(0, 6).map((a) => (
            <div key={a.id} className="arow">
              <span className="aic">
                <Icon name={ACT_ICON[a.type] ?? 'activity'} size={13} />
              </span>
              <div className="atxt">
                <div className="atitle">{a.title}</div>
                {a.detail && <div className="adetail">{a.detail}</div>}
              </div>
              <span className="atime">{fmtAgo(a.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/* ---------------- System components ---------------- */
function ComponentsCard({ components }: { components: Record<string, unknown> | null }) {
  const c = components as { node: string; discordJs: string; database: string; uptime: string; version: string } | null;
  const na = (v: unknown) => (typeof v === 'string' && v ? v : '—');
  return (
    <Card title="องค์ประกอบระบบ" icon="monitor">
      <div className="comp">
        <div className="ccell">
          <Icon name="code" size={14} />
          <span className="l">Node.js</span>
          <span className="v">{na(c?.node)}</span>
        </div>
        <div className="ccell">
          <Icon name="bot" size={14} />
          <span className="l">Discord.js</span>
          <span className="v">{na(c?.discordJs)}</span>
        </div>
        <div className="ccell">
          <Icon name="backup" size={14} />
          <span className="l">PostgreSQL</span>
          <span className="v">{na(c?.database)}</span>
        </div>
        <div className="ccell">
          <Icon name="clock" size={14} />
          <span className="l">Uptime</span>
          <span className="v">{na(c?.uptime)}</span>
        </div>
        <div className="ccell">
          <Icon name="shield" size={14} />
          <span className="l">Version</span>
          <span className="v">{na(c?.version)}</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Resource chart ---------------- */
function ResourceChart({ metrics }: { metrics: Metrics }) {
  const hist = metrics.history.slice(-96);
  const labels = useMemo(() => {
    if (hist.length < 4) return [];
    const step = Math.max(1, Math.floor(hist.length / 6));
    const out: string[] = [];
    for (let i = 0; i < hist.length; i += step) {
      const d = new Date(hist[i].t);
      out.push(`${String(d.getHours()).padStart(2, '0')}:00`);
    }
    return out.slice(0, 7);
  }, [hist]);
  return (
    <Card
      title="การใช้งานแผนภาพเซิร์ฟเวอร์"
      icon="chart"
      action={
        <div className="chart-legend">
          <span className="legend-chip">
            <i style={{ background: '#59a7ff' }} /> CPU
          </span>
          <span className="legend-chip">
            <i style={{ background: '#7b5cff' }} /> RAM
          </span>
        </div>
      }
    >
      <AreaChart
        series={[
          { name: 'CPU', color: '#59a7ff', data: hist.map((s) => s.cpu) },
          { name: 'RAM', color: '#7b5cff', data: hist.map((s) => (s.ram / Math.max(1, metrics.ramTotal)) * 100) },
        ]}
        labels={labels}
      />
    </Card>
  );
}

/* ================= Dashboard (main rows + right rail) ================= */
export function Dashboard() {
  const { boot } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [components, setComponents] = useState<Record<string, unknown> | null>(null);
  const live = useLiveStream();
  const metricsRef = useRef<Metrics | null>(null);

  const load = useCallback(() => {
    api<DashboardData>('/api/dashboard')
      .then(setData)
      .catch(() => undefined);
    api<Record<string, unknown>>('/api/system/components')
      .then(setComponents)
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const metrics: Metrics = (live.metrics as Metrics) ?? data?.metrics ?? metricsRef.current ?? emptyMetrics();
  metricsRef.current = metrics;
  const bot = (live.bot as DashboardData['bot']) ?? data?.bot ?? null;
  const player = (live.player as PlayerState) ?? data?.player ?? null;

  const hist = metrics.history;

  if (!data || !bot) {
    return (
      <div className="dash">
        <div className="empty">
          <Icon name="monitor" size={26} />
          กำลังโหลดข้อมูล…
        </div>
      </div>
    );
  }

  return (
    <div className="dash">
      <div className="dash-main">
        <div className="grid g-plain g-row1b">
          <Hero online={bot.ready} configured={bot.configured} />
          <BotStatusCard bot={bot} />
        </div>

        <div className="grid g-plain g-row2">
          <MetricCard icon="cpu" label="CPU" value={`${metrics.cpu.toFixed(1)}%`} data={hist.map((s) => s.cpu)} color="#59a7ff" />
          <MetricCard icon="ram" label="RAM" value={`${(metrics.ramUsed / 1024 ** 3).toFixed(1)} GB`} data={hist.map((s) => s.ram)} color="#4cc9f0" />
          <MetricCard icon="backup" label="Database" value={metrics.dbLatency != null ? `${metrics.dbLatency}ms` : '—'} data={hist.map(() => metrics.dbLatency ?? 0)} color="#2ee88a" />
          <MetricCard icon="disk" label="Disk Usage" value={metrics.diskTotal > 0 ? `${metrics.diskPct}%` : 'NO DATA'} data={hist.map(() => metrics.diskPct)} color="#7b5cff" />
          <MetricCard icon="network" label="Network" value={fmtRate(metrics.netBps)} data={hist.map((s) => s.net)} color="#ffc857" />
        </div>

        <div className="grid g-plain g-row3b">
          <NowPlaying player={player} botConfigured={bot.configured} />
          <QueueCard
            player={player}
            botConfigured={bot.configured}
            onClear={() => {
              api('/api/queue/clear', { method: 'POST', body: JSON.stringify({ guildId: 'default' }) }).catch(() => undefined);
            }}
          />
          <div className="colstack">
            <ServersCard guilds={data.guilds} configured={bot.configured} online={bot.ready} />
            <ActivityCard items={data.activity} />
          </div>
        </div>

        <div className="grid g-plain g-row4b">
          <ComponentsCard components={components} />
          <ResourceChart metrics={metrics} />
        </div>
      </div>

      <aside className="rail">
        <SysStatCard metrics={metrics} bot={bot} />
        <AnnounceCard boot={boot} firstBootAt={Number((components as { firstBootAt?: number })?.firstBootAt ?? 0) || null} />
        <ResourcesCard />
        <SupportCard />
      </aside>
    </div>
  );
}

function emptyMetrics(): Metrics {
  return {
    t: Date.now(),
    cpu: 0,
    cpuCores: 0,
    ramUsed: 0,
    ramTotal: 0,
    dbLatency: null,
    diskUsed: 0,
    diskTotal: 0,
    diskPct: 0,
    netBps: 0,
    uptimeSec: 0,
    history: [],
  };
}

export { fmtBytes };
