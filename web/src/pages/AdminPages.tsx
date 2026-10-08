import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useApp } from '../App';
import { Card, Empty, StatusPill } from '../ui/kit';
import { Icon } from '../ui/Icon';
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/* ---------------- ยูสเซอร์ ---------------- */
interface UserRow {
  id: string;
  github_id: string;
  login: string;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'user';
  disabled: number;
  created_at: number;
  last_login_at: number | null;
}
export function UsersPage() {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const { me } = useApp();
  const load = useCallback(() => {
    api<UserRow[]>('/api/users').then(setRows).catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      await api(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      load();
    } catch (e) {
      alert(errMsg(e));
    }
  };
  return (
    <>
      <div className="page-title">
        <Icon name="users" size={17} />
        ยูสเซอร์
        <span className="sub">ผู้ใช้ที่ล็อกอินผ่าน GitHub จริง — สิทธิ์ตรวจฝั่ง server</span>
      </div>
      <div className="page-body">
        <Card title="รายชื่อผู้ใช้" icon="users">
          {!rows || rows.length === 0 ? (
            <Empty icon="users">ยังไม่มีผู้ใช้</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>ผู้ใช้</th>
                  <th>GitHub ID</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>ล็อกอินล่าสุด</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.avatar_url ? <img className="avatar" style={{ width: 24, height: 24 }} src={r.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="avatar-fallback" style={{ width: 24, height: 24, fontSize: 11 }}>{r.login.slice(0, 1)}</span>}
                        {r.login}
                      </div>
                    </td>
                    <td className="mono">{r.github_id}</td>
                    <td>
                      <select className="selinput" value={r.role} disabled={r.id === me.user?.login} onChange={(e) => patch(r.id, { role: e.target.value })} style={{ padding: '3px 8px' }}>
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                        <option value="user">user</option>
                      </select>
                    </td>
                    <td>
                      <span className={`tag ${r.disabled ? 'err' : 'ok'}`}>{r.disabled ? 'DISABLED' : 'ACTIVE'}</span>
                    </td>
                    <td className="mono">{r.last_login_at ? new Date(r.last_login_at).toLocaleString('th-TH') : '—'}</td>
                    <td>
                      <button className="btn sm" onClick={() => patch(r.id, { disabled: r.disabled ? 0 : 1 })}>
                        {r.disabled ? 'เปิดใช้งาน' : 'ระงับ'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- API & Credentials ---------------- */
interface CredRow {
  id: string;
  key: string;
  label: string;
  category: string;
  mask: string;
  status: 'active' | 'disabled';
  last_test_at: number | null;
  last_test_ok: number | null;
  created_at: number;
  updated_at: number;
}
export function CredentialsPage() {
  const [rows, setRows] = useState<CredRow[] | null>(null);
  const [key_, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('discord');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  const load = useCallback(() => {
    api<CredRow[]>('/api/credentials').then(setRows).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const add = async () => {
    try {
      await api('/api/credentials', { method: 'POST', body: JSON.stringify({ key: key_, label, category, value }) });
      setMsg({ ok: true, text: 'บันทึกคีย์แล้ว (เข้ารหัส AES-256-GCM ฝั่ง server)' });
      setKey('');
      setLabel('');
      setValue('');
      load();
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    }
  };
  const act = async (fn: () => Promise<unknown>, okText: string) => {
    try {
      const r = (await fn()) as { ok?: boolean; detail?: string };
      setMsg({ ok: r?.ok !== false, text: r?.detail ? `${okText}: ${r.detail}` : okText });
      load();
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    }
  };

  return (
    <>
      <div className="page-title">
        <Icon name="key" size={17} />
        API &amp; Credentials
        <span className="sub">เข้ารหัส at rest • แสดงแบบ mask • บันทึก audit ทุกครั้ง</span>
      </div>
      <div className="page-body">
        <Card title="เพิ่มคีย์ใหม่" icon="plus">
          <div className="formgrid">
            <label className="field">
              Key (type:name)
              <input className="txtinput" value={key_} onChange={(e) => setKey(e.target.value)} placeholder="discord:token" />
            </label>
            <label className="field">
              ประเภท
              <select className="selinput" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="discord">discord</option>
                <option value="github">github</option>
                <option value="music">music</option>
                <option value="webhook">webhook</option>
                <option value="database">database</option>
                <option value="other">other</option>
              </select>
            </label>
            <label className="field">
              ป้ายชื่อ
              <input className="txtinput" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Discord Bot Token" />
            </label>
            <label className="field">
              ค่าความลับ
              <input className="txtinput" type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="••••••" />
            </label>
          </div>
          <div className="toolbar" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={add} disabled={!key_ || !value || !label}>
              <Icon name="plus" size={13} /> บันทึก
            </button>
          </div>
          {msg && <div style={{ marginTop: 9 }} className={msg.ok ? 'okbox' : 'errbox'}>{msg.text}</div>}
        </Card>

        <Card title="คีย์ทั้งหมด" icon="key">
          {!rows || rows.length === 0 ? (
            <Empty icon="key">ยังไม่มีคีย์ — ตั้งค่าผ่าน environment หรือเพิ่มที่นี่</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>ค่า (mask)</th>
                  <th>สถานะ</th>
                  <th>ทดสอบ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.key}</div>
                      <div className="note">{r.label}</div>
                    </td>
                    <td className="mono">{editing?.id === r.id ? (
                      <input className="txtinput" type="password" value={editing.value} onChange={(e) => setEditing({ id: r.id, value: e.target.value })} style={{ width: 160 }} />
                    ) : (
                      r.mask
                    )}</td>
                    <td>
                      <span className={`tag ${r.status === 'active' ? 'ok' : 'dim'}`}>{r.status === 'active' ? 'ACTIVE' : 'DISABLED'}</span>
                    </td>
                    <td>
                      {r.last_test_at ? (
                        <span className={`tag ${r.last_test_ok ? 'ok' : 'err'}`}>{r.last_test_ok ? 'PASS' : 'FAIL'} · {new Date(r.last_test_at).toLocaleDateString('th-TH')}</span>
                      ) : (
                        <span className="tag dim">UNTESTED</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {editing?.id === r.id ? (
                          <button
                            className="btn sm primary"
                            onClick={() =>
                              act(
                                () => api(`/api/credentials/${r.id}`, { method: 'PATCH', body: JSON.stringify({ value: editing.value }) }),
                                'อัปเดตค่าแล้ว',
                              ).then(() => setEditing(null))
                            }
                          >
                            บันทึก
                          </button>
                        ) : (
                          <button className="btn sm" onClick={() => setEditing({ id: r.id, value: '' })}>
                            <Icon name="refresh" size={12} /> หมุนค่า
                          </button>
                        )}
                        <button className="btn sm" onClick={() => act(() => api(`/api/credentials/${r.id}/test`, { method: 'POST' }), 'ทดสอบ')}>
                          <Icon name="zap" size={12} /> ทดสอบ
                        </button>
                        <button
                          className="btn sm"
                          onClick={() => act(() => api(`/api/credentials/${r.id}`, { method: 'PATCH', body: JSON.stringify({ status: r.status === 'active' ? 'disabled' : 'active' }) }), 'อัปเดตสถานะ')}
                        >
                          {r.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </button>
                        <button className="btn sm danger" onClick={() => act(() => api(`/api/credentials/${r.id}`, { method: 'DELETE' }), 'ลบแล้ว')}>
                          <Icon name="trash" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- บันทึกการทำงาน ---------------- */
export function LogsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [action, setAction] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      api<Record<string, unknown>[]>(`/api/logs?limit=200${action ? `&action=${encodeURIComponent(action)}` : ''}`)
        .then(setRows)
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(t);
  }, [action]);
  return (
    <>
      <div className="page-title">
        <Icon name="log" size={17} />
        บันทึกการทำงาน
        <span className="sub">audit log จริงทุกเหตุการณ์สำคัญ</span>
      </div>
      <div className="page-body">
        <Card
          title="Audit Logs"
          icon="log"
          action={
            <select className="selinput" value={action} onChange={(e) => setAction(e.target.value)} style={{ padding: '3px 8px' }}>
              <option value="">ทั้งหมด</option>
              <option value="auth.login">auth.login</option>
              <option value="auth.logout">auth.logout</option>
              <option value="credentials.create">credentials.*</option>
              <option value="users.update">users.update</option>
              <option value="settings.update">settings.update</option>
              <option value="backup.create">backup.create</option>
            </select>
          }
        >
          {!rows || rows.length === 0 ? (
            <Empty icon="log">ยังไม่มีบันทึก</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>ผู้ใช้</th>
                  <th>การกระทำ</th>
                  <th>เป้าหมาย</th>
                  <th>รายละเอียด</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={String(r.id)}>
                    <td className="mono">{new Date(Number(r.created_at)).toLocaleString('th-TH')}</td>
                    <td>{String(r.username ?? '—')}</td>
                    <td>
                      <span className="tag blue">{String(r.action)}</span>
                    </td>
                    <td className="mono">{String(r.target ?? '—')}</td>
                    <td className="note" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {String(r.detail ?? '—')}
                    </td>
                    <td className="mono">{String(r.ip ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- ความปลอดภัย ---------------- */
export function SecurityPage() {
  const [sessions, setSessions] = useState<{ id: string; ip: string | null; user_agent: string | null; created_at: number; current?: boolean }[] | null>(null);
  const { me } = useApp();
  const load = useCallback(() => {
    api<typeof sessions>('/api/security/sessions').then(setSessions).catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  return (
    <>
      <div className="page-title">
        <Icon name="shield" size={17} />
        ความปลอดภัย
        <span className="sub">เซสชันที่ใช้งานอยู่ • การเข้ารหัส • การป้องกัน</span>
      </div>
      <div className="page-body">
        <Card
          title="เซสชันทั้งหมดของคุณ"
          icon="lock"
          action={
            <button
              className="btn sm danger"
              onClick={() => api('/api/security/sessions/revoke-others', { method: 'POST' }).then(load).catch(() => undefined)}
            >
              ยกเลิกเซสชันอื่นทั้งหมด
            </button>
          }
        >
          {!sessions || sessions.length === 0 ? (
            <Empty icon="lock">ไม่มีเซสชัน</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>IP</th>
                  <th>User Agent</th>
                  <th>เริ่มใช้</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.current ? 'อันปัจจุบัน' : s.id}</td>
                    <td className="mono">{s.ip ?? '—'}</td>
                    <td className="note" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.user_agent ?? '—'}
                    </td>
                    <td className="mono">{new Date(s.created_at).toLocaleString('th-TH')}</td>
                    <td>
                      {!s.current && (
                        <button className="btn sm danger" onClick={() => api(`/api/security/sessions/${s.id}`, { method: 'DELETE' }).then(load).catch(() => undefined)}>
                          ยกเลิก
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="มาตรการที่เปิดใช้งาน" icon="shield">
          <table className="tbl">
            <tbody>
              {[
                ['GitHub OAuth (state validation)', 'ป้องกัน CSRF ใน OAuth flow'],
                ['Session: httpOnly + SameSite=Lax + Secure (prod)', 'ป้องกัน session hijacking'],
                ['CSRF double-submit cookie + header', 'ทุกคำขอ POST/PUT/DELETE'],
                ['AES-256-GCM', 'ความลับถูกเข้ารหัส at rest'],
                ['Parameterized SQL ทั้งหมด', 'ป้องกัน SQL injection'],
                ['React escaping + CSP', 'ป้องกัน XSS'],
                ['Rate limiting (global + auth)', 'ป้องกัน rate abuse'],
                ['Server-side permission checks', 'owner/admin/user ทุก endpoint'],
              ].map(([a, b]) => (
                <tr key={a}>
                  <td style={{ fontWeight: 500 }}>{a}</td>
                  <td className="note">{b}</td>
                  <td style={{ width: 60 }}>
                    <span className="tag ok">ON</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note" style={{ marginTop: 8 }}>
            Owner คือ {me.user?.login} — ตรวจสอบจาก GITHUB_OWNER_ID (immutable numeric id)
          </div>
        </Card>
      </div>
    </>
  );
}

/* ---------------- การสำรองข้อมูล ---------------- */
export function BackupPage() {
  const [rows, setRows] = useState<{ name: string; size: number; createdAt: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    api<typeof rows>('/api/backups').then(setRows).catch(() => undefined);
  }, []);
  useEffect(load, [load]);
  const create = async () => {
    setBusy(true);
    try {
      await api('/api/backups', { method: 'POST' });
      load();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-title">
        <Icon name="backup" size={17} />
        การสำรองข้อมูล
        <span className="sub">สำรองฐานข้อมูลจริงเป็น JSON ดาวน์โหลดได้</span>
      </div>
      <div className="page-body">
        <Card
          title="สำรองข้อมูล"
          icon="download"
          action={
            <button className="btn sm primary" onClick={create} disabled={busy}>
              <Icon name="plus" size={12} /> {busy ? 'กำลังสำรอง…' : 'สำรองตอนนี้'}
            </button>
          }
        >
          {!rows || rows.length === 0 ? (
            <Empty icon="backup">ยังไม่มีไฟล์สำรอง</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>ไฟล์</th>
                  <th>ขนาด</th>
                  <th>วันที่</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td className="mono">{r.name}</td>
                    <td className="mono">{(r.size / 1024).toFixed(1)} KB</td>
                    <td className="mono">{new Date(r.createdAt).toLocaleString('th-TH')}</td>
                    <td>
                      <a className="btn sm" href={`/api/backups/${r.name}/download`}>
                        <Icon name="download" size={12} /> ดาวน์โหลด
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- ระบบ (ตั้งค่า) ---------------- */
export function SettingsPage() {
  const [s, setS] = useState<{ maxVoice: number; defaultVolume: number; presence: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    api<typeof s>('/api/settings').then(setS).catch(() => undefined);
  }, []);
  const save = async () => {
    if (!s) return;
    try {
      await api('/api/settings', { method: 'PUT', body: JSON.stringify(s) });
      setMsg({ ok: true, text: 'บันทึกการตั้งค่าแล้ว' });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    }
  };
  if (!s) return <div className="page-body empty">กำลังโหลด…</div>;
  return (
    <>
      <div className="page-title">
        <Icon name="gear" size={17} />
        ระบบ
        <span className="sub">ตั้งค่าที่ server บังคับใช้จริง</span>
      </div>
      <div className="page-body">
        <Card title="ตั้งค่าระบบ" icon="gear">
          <div className="formgrid">
            <label className="field">
              Voice Connections สูงสุด
              <input className="txtinput" type="number" min={1} max={50} value={s.maxVoice} onChange={(e) => setS({ ...s, maxVoice: Number(e.target.value) })} />
            </label>
            <label className="field">
              ความดังเริ่มต้น (0-150)
              <input className="txtinput" type="number" min={0} max={150} value={s.defaultVolume} onChange={(e) => setS({ ...s, defaultVolume: Number(e.target.value) })} />
            </label>
            <label className="field">
              Presence (สถานะบอท)
              <input className="txtinput" value={s.presence} onChange={(e) => setS({ ...s, presence: e.target.value })} />
            </label>
          </div>
          <div className="toolbar" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={save}>
              <Icon name="check" size={13} /> บันทึก
            </button>
          </div>
          {msg && <div style={{ marginTop: 9 }} className={msg.ok ? 'okbox' : 'errbox'}>{msg.text}</div>}
        </Card>
      </div>
    </>
  );
}

/* ---------------- ตั้งค่าบอท ---------------- */
export function BotSettingsPage() {
  const [presence, setPresence] = useState('');
  const [boot, setBoot] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    api<Record<string, unknown>>('/api/bootstrap').then(setBoot).catch(() => undefined);
    api<{ presence: string }>('/api/settings').then((s) => setPresence(s.presence)).catch(() => undefined);
  }, []);
  const save = async () => {
    try {
      await api('/api/bot/presence', { method: 'POST', body: JSON.stringify({ text: presence }) });
      setMsg({ ok: true, text: 'อัปเดต presence แล้ว (บอทต้องออนไลน์จึงจะเห็นทันที)' });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    }
  };
  const configured = (boot?.discord as Record<string, unknown>)?.configured;
  return (
    <>
      <div className="page-title">
        <Icon name="bot" size={17} />
        ตั้งค่าบอท
        <span className="sub">สถานะการตั้งค่าบอทจริง</span>
      </div>
      <div className="page-body">
        {!configured && (
          <div className="warnbox">
            บอทยังไม่ได้ตั้งค่า — เพิ่ม <strong>DISCORD_TOKEN</strong> และ <strong>DISCORD_CLIENT_ID</strong> ผ่านหน้า “API &amp; Credentials”
            (key: discord:token) หรือผ่าน environment แล้วรีสตาร์ทเซิร์ฟเวอร์ จากนั้น invite บอทด้วยสิทธิ์
            <strong> bot + applications.commands</strong>
          </div>
        )}
        <Card title="Presence" icon="bot">
          <div className="toolbar">
            <input className="txtinput" style={{ flex: 1 }} value={presence} onChange={(e) => setPresence(e.target.value)} placeholder="🎵 NABEE CORE Music" />
            <button className="btn primary" onClick={save}>
              <Icon name="check" size={13} /> บันทึก
            </button>
          </div>
          {msg && <div style={{ marginTop: 9 }} className={msg.ok ? 'okbox' : 'errbox'}>{msg.text}</div>}
        </Card>
        <Card title="คำสั่ง Slash ที่ระบบลงทะเบียน" icon="list">
          <table className="tbl">
            <tbody>
              {[
                ['/play <query>', 'เล่นเพลงจากชื่อหรือลิงก์'],
                ['/pause / /resume', 'หยุด / เล่นต่อ'],
                ['/skip', 'ข้ามเพลง'],
                ['/queue / /nowplaying', 'ดูคิว / เพลงปัจจุบัน'],
                ['/volume <0-150>', 'ตั้งความดัง'],
                ['/filter <type> <on/off>', 'ฟิลเตอร์เสียง'],
                ['/join / /disconnect', 'เข้า/ออกช่องเสียง'],
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

/* ---------------- ข้อมูลผู้ใช้ / บัญชี ---------------- */
export function ProfilePage() {
  const { me } = useApp();
  const u = me.user!;
  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.reload();
  };
  return (
    <>
      <div className="page-title">
        <Icon name="idcard" size={17} />
        ข้อมูลผู้ใช้
        <span className="sub">บัญชี GitHub ของคุณ</span>
      </div>
      <div className="page-body">
        <Card title="โปรไฟล์" icon="idcard">
          <div className="np">
            {u.avatarUrl ? <img className="avatar" style={{ width: 64, height: 64 }} src={u.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="avatar-fallback" style={{ width: 64, height: 64, fontSize: 24 }}>{u.login.slice(0, 1)}</span>}
            <div className="np-info">
              <div className="np-title" style={{ fontSize: 18 }}>
                {u.login}
              </div>
              <div className="np-artist">
                บทบาท: {u.role === 'owner' ? 'Owner (ตรวจสอบจาก GITHUB_OWNER_ID)' : u.role}
              </div>
              <div className="toolbar" style={{ marginTop: 6 }}>
                <a className="btn sm" href={`https://github.com/${u.login}`} target="_blank" rel="noreferrer">
                  <Icon name="github" size={13} /> GitHub Profile
                </a>
                <button className="btn sm danger" onClick={logout}>
                  <Icon name="logout" size={13} /> ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export { StatusPill };
