import { useCallback, useEffect, useState } from 'react';
import { api, fmtRate, fmtBytes } from '../api';
import { useLiveStream } from '../stream';
import { Card, Spark, AreaChart, Empty } from '../ui/kit';
import { Icon } from '../ui/Icon';
import type { Metrics } from '../ui/types';
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/* ---------------- ซิสเทม ---------------- */
export function SystemPage() {
  const live = useLiveStream();
  const [m0, setM0] = useState<Metrics | null>(null);
  useEffect(() => {
    api<Metrics>('/api/metrics').then(setM0).catch(() => undefined);
  }, []);
  const m = (live.metrics as Metrics) ?? m0;
  if (!m) return <div className="page-body empty">กำลังโหลด…</div>;
  const hist = m.history.slice(-120);
  return (
    <>
      <div className="page-title">
        <Icon name="monitor" size={17} />
        ซิสเทม
        <span className="sub">ตัวชี้วัดระบบจริง (realtime ทุก 2 วินาที)</span>
      </div>
      <div className="page-body">
        <div className="grid g-row2" style={{ padding: 0 }}>
          <Metric label="CPU Usage" value={`${m.cpu.toFixed(1)}%`} sub={`${m.cpuCores} cores`} data={hist.map((s) => s.cpu)} color="#59a7ff" icon="cpu" />
          <Metric label="RAM Usage" value={`${(m.ramUsed / 1024 ** 3).toFixed(2)} GB`} sub={`จาก ${(m.ramTotal / 1024 ** 3).toFixed(1)} GB`} data={hist.map((s) => s.ram)} color="#4cc9f0" icon="ram" />
          <Metric label="Database" value={m.dbLatency != null ? `${m.dbLatency}ms` : '—'} sub="real roundtrip" data={hist.map(() => m.dbLatency ?? 0)} color="#2ee88a" icon="backup" />
          <Metric label="Disk Usage" value={m.diskTotal > 0 ? `${m.diskPct}%` : 'NO DATA'} sub={m.diskTotal > 0 ? `${fmtBytes(m.diskUsed)} ใช้งาน` : ''} data={hist.map(() => m.diskPct)} color="#7b5cff" icon="disk" />
          <Metric label="Network" value={fmtRate(m.netBps)} sub="rx + tx" data={hist.map((s) => s.net)} color="#ffc857" icon="network" />
        </div>
        <Card
          title="การใช้งานทรัพยากรระบบ"
          icon="chart"
          action={
            <div className="chart-legend">
              <span className="legend-chip">
                <i style={{ background: '#59a7ff' }} /> CPU %
              </span>
              <span className="legend-chip">
                <i style={{ background: '#7b5cff' }} /> RAM %
              </span>
            </div>
          }
        >
          <AreaChart
            series={[
              { name: 'CPU', color: '#59a7ff', data: hist.map((s) => s.cpu) },
              { name: 'RAM', color: '#7b5cff', data: hist.map((s) => (s.ram / Math.max(1, m.ramTotal)) * 100) },
            ]}
            labels={hist.length > 4 ? ['เก่า', '', '', '', '', 'ตอนนี้'] : []}
            height={140}
          />
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value, sub, data, color, icon }: { label: string; value: string; sub?: string; data: number[]; color: string; icon: Parameters<typeof Icon>[0]['name'] }) {
  return (
    <section className="card metric" style={{ padding: 14 }}>
      <div className="metric-top">
        <span className="tile-ic">
          <Icon name={icon} size={15} />
        </span>
        <span>{label}</span>
      </div>
      <div className="metric-val" style={{ fontSize: 24 }}>
        {value}
      </div>
      <div className="note">{sub}</div>
      <div className="spark-wrap">
        <Spark data={data} stroke={color} height={44} />
      </div>
    </section>
  );
}

/* ---------------- การเชื่อมต่อ ---------------- */
interface TestState {
  ok?: boolean;
  detail?: string;
  busy?: boolean;
}
export function ConnectionsPage() {
  const [status, setStatus] = useState<Record<string, { ok: boolean; label: string }> | null>(null);
  const [tests, setTests] = useState<Record<string, TestState>>({});

  const load = useCallback(() => {
    api<Record<string, { ok: boolean; label: string }>>('/api/system/status').then(setStatus).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const test = async (what: string) => {
    setTests((t) => ({ ...t, [what]: { busy: true } }));
    try {
      const r = await api<{ ok: boolean; detail: string }>(`/api/system/test/${what}`, { method: 'POST' });
      setTests((t) => ({ ...t, [what]: r }));
    } catch (e) {
      setTests((t) => ({ ...t, [what]: { ok: false, detail: errMsg(e) } }));
    }
    load();
  };

  const row = (key: string, label: string, item?: { ok: boolean; label: string }) => (
    <tr key={key}>
      <td>{label}</td>
      <td>
        <span className={`tag ${item ? (item.ok ? 'ok' : 'err') : 'dim'}`}>{item?.label ?? '—'}</span>
      </td>
      <td style={{ width: 110 }}>
        <button className="btn sm" onClick={() => test(key)} disabled={tests[key]?.busy}>
          <Icon name="refresh" size={12} /> ทดสอบ
        </button>
      </td>
      <td className="note" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {tests[key] && !tests[key].busy ? (
        <span className={tests[key].ok ? 'tag ok' : 'tag err'}>{tests[key].ok ? 'OK' : 'FAILED'} — {tests[key].detail}</span>
        ) : tests[key]?.busy ? 'กำลังทดสอบ…' : ''}
      </td>
    </tr>
  );

  return (
    <>
      <div className="page-title">
        <Icon name="plug" size={17} />
        การเชื่อมต่อ
        <span className="sub">สถานะจริงของบริการภายนอกทั้งหมด</span>
      </div>
      <div className="page-body">
        <Card title="สถานะการเชื่อมต่อ" icon="activity">
          <table className="tbl">
            <thead>
              <tr>
                <th>บริการ</th>
                <th>สถานะ</th>
                <th />
                <th>ผลทดสอบล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {row('discord', 'Discord Bot (Gateway)', status?.discord)}
              {row('database', 'Database', status?.database)}
              {row('github', 'GitHub OAuth Config', status?.api)}
              {row('youtube', 'Music Source (YouTube)')}
            </tbody>
          </table>
        </Card>
        <div className="warnbox">
          การทดสอบ “Music Source (YouTube)” และ “Discord Bot” ต้องการการเชื่อมต่ออินเทอร์เน็ตจากเซิร์ฟเวอร์จริง — หากเครือข่ายไม่เปิด ผลจะแสดง UNREACHABLE ตามความจริง
        </div>
      </div>
    </>
  );
}

/* ---------------- สถิติการใช้งาน ---------------- */
interface DayStat {
  day: string;
  commands: number;
  plays: number;
  joins: number;
}
export function UsageStatsPage() {
  const [range, setRange] = useState<DayStat[] | null>(null);
  const [activity, setActivity] = useState<{ id: string; type: string; title: string; detail: string | null; created_at: number }[] | null>(null);
  useEffect(() => {
    api<{ range: DayStat[] }>('/api/stats').then((r) => setRange(r.range)).catch(() => undefined);
    api<typeof activity>('/api/activity?limit=20').then(setActivity).catch(() => undefined);
  }, []);
  const days = [...(range ?? [])].reverse();
  return (
    <>
      <div className="page-title">
        <Icon name="chart" size={17} />
        สถิติการใช้งาน
        <span className="sub">นับจากเหตุการณ์จริงในฐานข้อมูล — ไม่มีข้อมูลปลอม</span>
      </div>
      <div className="page-body">
        <Card title="คำสั่ง/เพลง/ผู้เข้าร่วม รายวัน" icon="chart">
          {days.length === 0 ? (
            <Empty icon="chart">ยังไม่มีข้อมูล — NO DATA (ข้อมูลจะเริ่มนับเมื่อมีการใช้งานจริง)</Empty>
          ) : (
            <AreaChart
              series={[
                { name: 'commands', color: '#59a7ff', data: days.map((d) => d.commands) },
                { name: 'plays', color: '#2ee88a', data: days.map((d) => d.plays) },
                { name: 'joins', color: '#7b5cff', data: days.map((d) => d.joins) },
              ]}
              labels={days.map((d) => d.day.slice(5))}
              height={150}
            />
          )}
        </Card>
        <Card title="ตารางรายวัน" icon="list">
          {days.length === 0 ? (
            <Empty>NO DATA</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>คำสั่ง</th>
                  <th>เพลงที่เล่น</th>
                  <th>เข้าช่องเสียง</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day}>
                    <td className="mono">{d.day}</td>
                    <td className="mono">{d.commands}</td>
                    <td className="mono">{d.plays}</td>
                    <td className="mono">{d.joins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="กิจกรรมล่าสุด" icon="activity">
          {!activity || activity.length === 0 ? (
            <Empty icon="activity">ยังไม่มีกิจกรรม</Empty>
          ) : (
            <div className="alist">
              {activity.map((a) => (
                <div key={a.id} className="arow">
                  <span className="aic">
                    <Icon name="activity" size={13} />
                  </span>
                  <div className="atxt">
                    <div className="atitle">{a.title}</div>
                    {a.detail && <div className="adetail">{a.detail}</div>}
                  </div>
                  <span className="atime">{new Date(a.created_at).toLocaleString('th-TH')}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- ผู้พัฒนา ---------------- */
export function DeveloperPage() {
  const [boot, setBoot] = useState<Record<string, unknown> | null>(null);
  const [comp, setComp] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    api<Record<string, unknown>>('/api/bootstrap').then(setBoot).catch(() => undefined);
    api<Record<string, unknown>>('/api/system/components').then(setComp).catch(() => undefined);
  }, []);
  const Row = ({ k, v }: { k: string; v: unknown }) => (
    <tr>
      <td>{k}</td>
      <td className="mono">{typeof v === 'boolean' ? (v ? 'YES' : 'NO') : String(v ?? '—')}</td>
    </tr>
  );
  return (
    <>
      <div className="page-title">
        <Icon name="code" size={17} />
        ผู้พัฒนา
        <span className="sub">ข้อมูลเวอร์ชันและ environment ของระบบจริง</span>
      </div>
      <div className="page-body">
        <Card title="Runtime" icon="monitor">
          <table className="tbl">
            <tbody>
              <Row k="Node.js" v={comp?.node} />
              <Row k="Discord.js" v={comp?.discordJs} />
              <Row k="Database Engine" v={comp?.database} />
              <Row k="App Version" v={comp?.version} />
              <Row k="Uptime" v={comp?.uptime} />
            </tbody>
          </table>
        </Card>
        <Card title="Configuration State" icon="gear">
          <table className="tbl">
            <tbody>
              <Row k="GitHub OAuth Configured" v={(boot?.github as Record<string, unknown>)?.configured} />
              <Row k="GITHUB_OWNER_ID Set" v={(boot?.github as Record<string, unknown>)?.ownerConfigured} />
              <Row k="BASE_URL Set" v={(boot?.github as Record<string, unknown>)?.baseUrlSet} />
              <Row k="Discord Bot Configured" v={(boot?.discord as Record<string, unknown>)?.configured} />
              <Row k="DISCORD_CLIENT_ID Set" v={(boot?.discord as Record<string, unknown>)?.clientIdSet} />
              <Row k="ALLOW_IFRAME (preview mode)" v={boot?.allowIframe} />
            </tbody>
          </table>
        </Card>
        <div className="note">
          NABEE CORE • Production-Grade Discord Music Bot + Web Control Panel — โค้ดทั้งหมดเป็น TypeScript, ศิลป์ทั้งหมดเป็น SVG ที่เขียนด้วยมือ
        </div>
      </div>
    </>
  );
}
