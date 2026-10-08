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

/* ---------------- ฐานข้อมูล ---------------- */
interface DbInfo {
  engine: string;
  dialect: string;
  latencyMs: number;
  tables: { name: string; rows: number }[];
}
export function DatabasePage() {
  const [info, setInfo] = useState<DbInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<DbInfo>('/api/database')
      .then(setInfo)
      .catch((e: unknown) => setErr(errMsg(e)));
  }, []);
  return (
    <>
      <div className="page-title">
        <Icon name="backup" size={17} />
        ฐานข้อมูล
        <span className="sub">ข้อมูลจริงจากฐานข้อมูลที่ระบบใช้งานอยู่</span>
      </div>
      <div className="page-body">
        {err && <div className="errbox">{err}</div>}
        {info && (
          <>
            <div className="grid g-row2" style={{ padding: 0 }}>
              <Metric label="Engine" value={info.engine} sub={`driver: ${info.dialect}`} data={[1, 1]} color="#59a7ff" icon="backup" />
              <Metric label="Latency" value={`${info.latencyMs}ms`} sub="real roundtrip" data={[1, 1]} color="#2ee88a" icon="zap" />
              <Metric label="Tables" value={String(info.tables.length)} sub="total rows below" data={[1, 1]} color="#7b5cff" icon="list" />
            </div>
            <Card title="จำนวนแถวต่อตาราง" icon="list">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ตาราง</th>
                    <th>แถว</th>
                  </tr>
                </thead>
                <tbody>
                  {info.tables.map((t) => (
                    <tr key={t.name}>
                      <td className="mono">{t.name}</td>
                      <td className="mono">{t.rows.toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

/* ---------------- ช่วยเหลือ ---------------- */
export function HelpPage() {
  const [boot, setBoot] = useState<{ discord: { configured: boolean }; github: { configured: boolean } } | null>(null);
  useEffect(() => {
    api<typeof boot>('/api/bootstrap').then(setBoot).catch(() => undefined);
  }, []);
  return (
    <>
      <div className="page-title">
        <Icon name="help" size={17} />
        ช่วยเหลือ
        <span className="sub">คู่มือการใช้งานจริงของระบบ</span>
      </div>
      <div className="page-body">
        <Card title="เริ่มต้นใช้งาน" icon="book">
          <div className="note" style={{ lineHeight: 2 }}>
            <strong>1. ตั้งค่า GitHub OAuth</strong> — สร้าง OAuth App ที่ GitHub (Settings → Developer settings) ตั้ง callback เป็น{' '}
            <code>{'{BASE_URL}'}/api/auth/github/callback</code> แล้วใส่ GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET / GITHUB_OWNER_ID (numeric id)
            <br />
            <strong>2. ตั้งค่าบอท Discord</strong> — สร้าง Application ที่ Discord Developer Portal นำ DISCORD_TOKEN และ DISCORD_CLIENT_ID มาตั้งค่า
            {boot && !boot.discord.configured ? ' (ปัจจุบัน: ยังไม่ได้ตั้งค่า — หน้าบอทจะแสดง NOT CONFIGURED)' : ' (ปัจจุบัน: ตั้งค่าแล้ว)'}
            <br />
            <strong>3. เชิญบอท</strong> — ใช้ลิงก์จากหน้า “ลิงก์ &amp; เชื่อม” เชิญบอทเข้าเซิร์ฟเวอร์ พร้อมสิทธิ์ View Channels / Send Messages / Embed Links / Connect / Speak
            <br />
            <strong>4. เล่นเพลง</strong> — เข้าช่องเสียงแล้วพิมพ์ /play หรือเพิ่มเพลงจากหน้า “เพลง” ในแผงควบคุมนี้
          </div>
        </Card>
        <Card title="คำสั่ง Slash ทั้งหมด" icon="list">
          <table className="tbl">
            <thead>
              <tr>
                <th>คำสั่ง</th>
                <th>คำอธิบาย</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['/play <query>', 'เล่นเพลงจากชื่อเพลงหรือลิงก์ YouTube'],
                ['/pause · /resume', 'หยุดชั่วคราว / เล่นต่อ'],
                ['/skip', 'ข้ามเพลงปัจจุบัน'],
                ['/queue · /nowplaying', 'ดูคิวเพลง / เพลงที่กำลังเล่น'],
                ['/volume <0-150>', 'ตั้งค่าความดัง'],
                ['/filter <type> <on/off>', 'เปิด/ปิดฟิลเตอร์ (ฟิลเตอร์เสียง, บาสบูสต์, เสียงคุณภาพสูง)'],
                ['/join · /disconnect', 'เข้า/ออกจากช่องเสียง'],
              ].map(([a, b]) => (
                <tr key={a}>
                  <td className="mono" style={{ fontWeight: 500 }}>
                    {a}
                  </td>
                  <td className="note">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="ตัวแปร Environment" icon="gear">
          <table className="tbl">
            <thead>
              <tr>
                <th>ตัวแปร</th>
                <th>ความหมาย</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['BASE_URL', 'URL สาธารณะของระบบ (ใช้สร้าง OAuth redirect)'],
                ['GITHUB_CLIENT_ID / SECRET', 'GitHub OAuth App credentials'],
                ['GITHUB_OWNER_ID', 'GitHub numeric user id ที่ได้สิทธิ์ Owner'],
                ['DISCORD_TOKEN / CLIENT_ID', 'บอท Discord'],
                ['DATABASE_URL', 'PostgreSQL (ถ้าไม่ตั้งใช้ SQLite ในตัว)'],
                ['FFMPEG_PATH', 'path ของ ffmpeg (ถ้าไม่อยู่ใน PATH)'],
                ['SESSION_SECRET', 'root secret (ถ้าไม่ตั้งระบบ generate ให้)'],
              ].map(([a, b]) => (
                <tr key={a}>
                  <td className="mono" style={{ fontWeight: 500 }}>
                    {a}
                  </td>
                  <td className="note">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

/* ---------------- API Documentation (endpoints จริงของระบบนี้) ---------------- */
export function ApiDocsPage() {
  const rows: { m: string; p: string; auth: string; d: string }[] = [
    { m: 'GET', p: '/api/health', auth: 'public', d: 'ตรวจสถานะเซิร์ฟเวอร์' },
    { m: 'GET', p: '/api/bootstrap', auth: 'public', d: 'ค่า config ที่ไม่ใช่ความลับ (version, configured flags)' },
    { m: 'GET', p: '/api/me', auth: 'public', d: 'สถานะการล็อกอินของผู้ใช้ปัจจุบัน' },
    { m: 'GET', p: '/api/auth/github/start', auth: 'public', d: 'เริ่ม OAuth flow (redirect ไป GitHub, rate limited)' },
    { m: 'GET', p: '/api/auth/github/callback', auth: 'public', d: 'OAuth callback (ตรวจ state แบบ timing-safe)' },
    { m: 'POST', p: '/api/auth/logout', auth: 'user', d: 'ออกจากระบบ (revoke session)' },
    { m: 'GET', p: '/api/dashboard', auth: 'user', d: 'ข้อมูลหน้าแรกทั้งหมด (bot, metrics, stats, activity, player, guilds)' },
    { m: 'GET', p: '/api/stream', auth: 'user', d: 'SSE แบบเรียลไทม์ (metrics / bot / player ทุก 2 วินาที)' },
    { m: 'GET', p: '/api/metrics', auth: 'user', d: 'ตัวชี้วัดระบบจริง (CPU/RAM/DB/Disk/Network + history)' },
    { m: 'GET', p: '/api/bot/status', auth: 'user', d: 'สถานะบอทจริง (gateway ping, REST latency, guilds, voice)' },
    { m: 'GET', p: '/api/guilds', auth: 'user', d: 'รายชื่อเซิร์ฟเวอร์ที่บอทอยู่' },
    { m: 'GET', p: '/api/player/:guildId', auth: 'user', d: 'สถานะเครื่องเล่น + คิว (guildId=default = เซิร์ฟเวอร์แรก)' },
    { m: 'POST', p: '/api/queue', auth: 'staff', d: 'ค้นหาและเพิ่มเพลงเข้าคิว (YouTube)' },
    { m: 'DELETE', p: '/api/queue/:guildId/:id', auth: 'staff', d: 'ลบเพลงออกจากคิว' },
    { m: 'POST', p: '/api/queue/clear', auth: 'staff', d: 'ล้างคิวทั้งหมด' },
    { m: 'POST', p: '/api/player/:action', auth: 'staff', d: 'pause / resume / skip' },
    { m: 'POST', p: '/api/volume', auth: 'staff', d: 'ตั้งความดัง 0-150' },
    { m: 'POST', p: '/api/filters', auth: 'staff', d: 'ฟิลเตอร์เสียง (master / bassboost / hq)' },
    { m: 'GET', p: '/api/system/components', auth: 'user', d: 'เวอร์ชันองค์ประกอบระบบจริง' },
    { m: 'GET', p: '/api/system/status', auth: 'user', d: 'สถานะการเชื่อมต่อทั้งหมด' },
    { m: 'POST', p: '/api/system/test/:what', auth: 'owner', d: 'ทดสอบการเชื่อมต่อจริง (discord/database/github/youtube)' },
    { m: 'GET', p: '/api/database', auth: 'staff', d: 'ข้อมูลฐานข้อมูล (engine, latency, จำนวนแถวต่อตาราง)' },
    { m: 'GET', p: '/api/users', auth: 'owner', d: 'รายชื่อผู้ใช้ทั้งหมด' },
    { m: 'PATCH', p: '/api/users/:id', auth: 'owner', d: 'เปลี่ยนบทบาท / ระงับผู้ใช้' },
    { m: 'GET', p: '/api/credentials', auth: 'owner', d: 'รายการคีย์ (masked — ไม่มี plaintext ออกจาก server)' },
    { m: 'POST', p: '/api/credentials', auth: 'owner', d: 'เพิ่มคีย์ (เข้ารหัส AES-256-GCM)' },
    { m: 'PATCH', p: '/api/credentials/:id', auth: 'owner', d: 'rotate ค่า / เปลี่ยนสถานะ / แก้ meta' },
    { m: 'POST', p: '/api/credentials/:id/test', auth: 'owner', d: 'ทดสอบคีย์จริงกับบริการปลายทาง' },
    { m: 'DELETE', p: '/api/credentials/:id', auth: 'owner', d: 'ลบคีย์' },
    { m: 'GET', p: '/api/logs', auth: 'owner', d: 'audit logs (กรองตาม action ได้)' },
    { m: 'GET', p: '/api/security/sessions', auth: 'owner', d: 'เซสชันที่ใช้งานอยู่' },
    { m: 'DELETE', p: '/api/security/sessions/:id', auth: 'owner', d: 'ยกเลิกเซสชัน' },
    { m: 'POST', p: '/api/security/sessions/revoke-others', auth: 'owner', d: 'ยกเลิกเซสชันอื่นทั้งหมด' },
    { m: 'GET', p: '/api/backups', auth: 'owner', d: 'รายการไฟล์สำรอง' },
    { m: 'POST', p: '/api/backups', auth: 'owner', d: 'สร้าง backup (dump JSON ทุกตาราง)' },
    { m: 'GET', p: '/api/backups/:name/download', auth: 'owner', d: 'ดาวน์โหลด backup' },
    { m: 'GET', p: '/api/webhooks', auth: 'owner', d: 'รายการ webhooks' },
    { m: 'POST', p: '/api/webhooks', auth: 'owner', d: 'เพิ่ม webhook' },
    { m: 'POST', p: '/api/webhooks/:id/test', auth: 'owner', d: 'ทดสอบยิง webhook จริง' },
    { m: 'GET', p: '/api/settings', auth: 'owner', d: 'อ่านค่าตั้งง่ายระบบ' },
    { m: 'PUT', p: '/api/settings', auth: 'owner', d: 'บันทึกค่าตั้งง่ายระบบ' },
    { m: 'POST', p: '/api/bot/presence', auth: 'owner', d: 'ตั้ง presence ของบอท' },
    { m: 'GET', p: '/api/embeds', auth: 'staff', d: 'เทมเพลต embed' },
    { m: 'POST', p: '/api/embeds/send', auth: 'staff', d: 'ส่ง embed ผ่านบอทไปยังช่อง' },
  ];
  return (
    <>
      <div className="page-title">
        <Icon name="doc" size={17} />
        API Documentation
        <span className="sub">endpoints จริงทั้งหมดของระบบนี้ — ทุก mutation ต้องส่ง header x-csrf-token</span>
      </div>
      <div className="page-body">
        <Card title="REST API" icon="code">
          <table className="tbl">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>สิทธิ์</th>
                <th>คำอธิบาย</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.m + r.p}>
                  <td>
                    <span className={`tag ${r.m === 'GET' ? 'blue' : r.m === 'DELETE' ? 'err' : 'ok'}`}>{r.m}</span>
                  </td>
                  <td className="mono">{r.p}</td>
                  <td>
                    <span className={`tag ${r.auth === 'owner' ? 'err' : r.auth === 'staff' ? 'ok' : r.auth === 'user' ? 'blue' : 'dim'}`}>{r.auth}</span>
                  </td>
                  <td className="note">{r.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
