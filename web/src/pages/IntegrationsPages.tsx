import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Card, Empty, Toggle } from '../ui/kit';
import { Icon } from '../ui/Icon';
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/* ---------------- จัดการ Embed ---------------- */
interface EmbedRow {
  id: string;
  name: string;
  data: string;
  updated_at: number;
}
export function EmbedsPage() {
  const [rows, setRows] = useState<EmbedRow[] | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [channelId, setChannelId] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    api<EmbedRow[]>('/api/embeds').then(setRows).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    if (!name.trim() || (!title.trim() && !desc.trim())) return;
    try {
      await api('/api/embeds', { method: 'POST', body: JSON.stringify({ name: name.trim(), data: { title: title.trim(), description: desc.trim() } }) });
      setMsg({ ok: true, text: 'บันทึกเทมเพลตแล้ว' });
      setName('');
      load();
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    }
  };
  const send = async () => {
    try {
      await api('/api/embeds/send', { method: 'POST', body: JSON.stringify({ channelId: channelId.trim(), embed: { title: title.trim(), description: desc.trim() } }) });
      setMsg({ ok: true, text: 'ส่ง Embed ไปยังช่องแล้ว' });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    }
  };

  return (
    <>
      <div className="page-title">
        <Icon name="embed" size={17} />
        จัดการ Embed
        <span className="sub">สร้างและส่งข้อความ Embed ผ่านบอทจริง</span>
      </div>
      <div className="page-body">
        <Card title="สร้าง / ส่ง Embed" icon="send">
          <div className="formgrid">
            <label className="field">
              ชื่อเทมเพลต
              <input className="txtinput" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น announce" />
            </label>
            <label className="field">
              Channel ID (Discord)
              <input className="txtinput" value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="1234567890" />
            </label>
            <label className="field">
              หัวข้อ
              <input className="txtinput" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            </label>
            <label className="field">
              เนื้อหา
              <input className="txtinput" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
            </label>
          </div>
          <div className="toolbar" style={{ marginTop: 10 }}>
            <button className="btn" onClick={save}>
              <Icon name="check" size={13} /> บันทึกเทมเพลต
            </button>
            <button className="btn primary" onClick={send}>
              <Icon name="send" size={13} /> ส่งไปยังช่อง
            </button>
          </div>
          {msg && <div style={{ marginTop: 9 }} className={msg.ok ? 'okbox' : 'errbox'}>{msg.text}</div>}
          <div className="note" style={{ marginTop: 9 }}>
            การส่งต้องมีบอทออนไลน์และมีสิทธิ์ในช่องนั้นจริง — หากไม่พร้อมจะแสดงข้อผิดพลาดตามจริง
          </div>
        </Card>
        <Card title="เทมเพลตที่บันทึกไว้" icon="embed">
          {!rows || rows.length === 0 ? (
            <Empty icon="embed">ยังไม่มีเทมเพลต</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>เนื้อหา</th>
                  <th>อัปเดต</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="note" style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.data}
                    </td>
                    <td className="mono">{new Date(r.updated_at).toLocaleString('th-TH')}</td>
                    <td>
                      <button className="qmore" onClick={() => api(`/api/embeds/${r.id}`, { method: 'DELETE' }).then(load).catch(() => undefined)}>
                        <Icon name="trash" size={13} />
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

/* ---------------- คอมมูนิตี้ ---------------- */
export function CommunityPage() {
  const [guilds, setGuilds] = useState<{ id: string; name: string; iconUrl: string | null; memberCount: number; active: boolean }[] | null>(null);
  const [activity, setActivity] = useState<{ id: string; type: string; title: string; detail: string | null; created_at: number }[] | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ configured: boolean; online: boolean; guilds: { id: string; name: string; iconUrl: string | null; memberCount: number; active: boolean }[] }>('/api/guilds')
      .then((r) => {
        setGuilds(r.guilds);
        setOnline(r.online);
      })
      .catch(() => undefined);
    api<typeof activity>('/api/activity?limit=12').then(setActivity).catch(() => undefined);
  }, []);
  return (
    <>
      <div className="page-title">
        <Icon name="music" size={17} />
        คอมมูนิตี้
        <span className="sub">เซิร์ฟเวอร์และกิจกรรมจริงจากบอท</span>
      </div>
      <div className="page-body">
        {!online && <div className="warnbox">บอทยังไม่ออนไลน์ (NOT CONFIGURED / OFFLINE) — ข้อมูลจะแสดงเมื่อบอทเชื่อมต่อ Discord สำเร็จ</div>}
        <div className="grid g-plain" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', padding: 0 }}>
          <Card title="เซิร์ฟเวอร์ในคอมมูนิตี้" icon="server">
            {!guilds || guilds.length === 0 ? (
              <Empty icon="server">NO DATA — ยังไม่มีเซิร์ฟเวอร์</Empty>
            ) : (
              <div className="alist">
                {guilds.map((g) => (
                  <div key={g.id} className="srow">
                    <span className="savatar">{g.iconUrl ? <img src={g.iconUrl} alt="" width={32} height={32} referrerPolicy="no-referrer" /> : <Icon name="server" size={14} />}</span>
                    <div className="sinfo">
                      <div className="sname">{g.name}</div>
                      <div className="smembers">{g.memberCount.toLocaleString('en-US')} members</div>
                    </div>
                    <span className={`tag ${g.active ? 'ok' : 'dim'}`}>{g.active ? 'ACTIVE' : 'IDLE'}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="กิจกรรมคอมมูนิตี้" icon="activity">
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
      </div>
    </>
  );
}

/* ---------------- เซิร์ฟเวอร์ ---------------- */
export function ServersPage() {
  const [guilds, setGuilds] = useState<{ id: string; name: string; iconUrl: string | null; memberCount: number; active: boolean }[] | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ configured: boolean; online: boolean; guilds: typeof guilds }>('/api/guilds')
      .then((r) => {
        setGuilds(r.guilds);
        setOnline(r.online);
      })
      .catch(() => undefined);
  }, []);
  return (
    <>
      <div className="page-title">
        <Icon name="server" size={17} />
        เซิร์ฟเวอร์
        <span className="sub">เซิร์ฟเวอร์ Discord ที่บอทเชื่อมต่ออยู่จริง</span>
      </div>
      <div className="page-body">
        {!online && <div className="warnbox">บอทยังไม่ออนไลน์ (NOT CONFIGURED / OFFLINE) — รายการเซิร์ฟเวอร์จะแสดงเมื่อบอทเชื่อมต่อ Discord สำเร็จ</div>}
        <Card title="เซิร์ฟเวอร์ทั้งหมด" icon="server">
          {!guilds || guilds.length === 0 ? (
            <Empty icon="server">NO DATA — ยังไม่มีเซิร์ฟเวอร์</Empty>
          ) : (
            <div className="alist">
              {guilds.map((g) => (
                <div key={g.id} className="srow">
                  <span className="savatar">{g.iconUrl ? <img src={g.iconUrl} alt="" width={32} height={32} referrerPolicy="no-referrer" /> : <Icon name="server" size={14} />}</span>
                  <div className="sinfo">
                    <div className="sname">{g.name}</div>
                    <div className="smembers">
                      {g.id} • {g.memberCount.toLocaleString('en-US')} members
                    </div>
                  </div>
                  <span className={`tag ${g.active ? 'ok' : 'dim'}`}>{g.active ? 'CONNECTED' : 'IDLE'}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- ลิงก์ & เชื่อม ---------------- */
export function LinksPage() {
  const [boot, setBoot] = useState<{ discord: { configured: boolean; clientId: string | null } } | null>(null);
  useEffect(() => {
    api<typeof boot>('/api/bootstrap').then(setBoot).catch(() => undefined);
  }, []);
  const clientId = boot?.discord?.clientId ?? null;
  const invite = clientId
    ? `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot+applications.commands&permissions=3165184`
    : null;
  return (
    <>
      <div className="page-title">
        <Icon name="link" size={17} />
        ลิงก์ &amp; เชื่อม
        <span className="sub">ลิงก์เชื่อมต่อระบบจริงทั้งหมด</span>
      </div>
      <div className="page-body">
        <Card title="เชิญบอทเข้าเซิร์ฟเวอร์" icon="link">
          {invite ? (
            <>
              <div className="note" style={{ marginBottom: 9 }}>
                ลิงก์เชิญสร้างจาก DISCORD_CLIENT_ID จริงของระบบ (scopes: bot + applications.commands)
              </div>
              <div className="toolbar">
                <a className="btn primary" href={invite} target="_blank" rel="noreferrer">
                  <Icon name="discord" size={14} /> เปิดหน้าเชิญบอท (Discord)
                </a>
                <button className="btn" onClick={() => navigator.clipboard?.writeText(invite)}>
                  <Icon name="link" size={13} /> คัดลอกลิงก์
                </button>
              </div>
            </>
          ) : (
            <div className="warnbox">
              ยังไม่ได้ตั้งค่า DISCORD_CLIENT_ID — ตั้งค่าผ่าน environment หรือหน้า “API &amp; Credentials” แล้วรีสตาร์ทเพื่อสร้างลิงก์เชิญ
            </div>
          )}
        </Card>
        <Card title="ลิงก์ระบบ" icon="globe">
          <a className="rrow" href="https://github.com/Zeptonight/NABEE-CORE-MUSIC" target="_blank" rel="noreferrer">
            <span className="tile-ic sm">
              <Icon name="github" size={12} />
            </span>
            <span className="rlabel">ซอร์สโค้ด — GitHub Repository</span>
            <Icon name="external" size={13} className="chev" />
          </a>
          <a className="rrow" href="https://github.com/Zeptonight/NABEE-CORE-MUSIC/issues" target="_blank" rel="noreferrer">
            <span className="tile-ic sm">
              <Icon name="alert" size={12} />
            </span>
            <span className="rlabel">รายงานปัญหา — GitHub Issues</span>
            <Icon name="external" size={13} className="chev" />
          </a>
          <a className="rrow" href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
            <span className="tile-ic sm">
              <Icon name="discord" size={12} />
            </span>
            <span className="rlabel">Discord Developer Portal</span>
            <Icon name="external" size={13} className="chev" />
          </a>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Webhook ---------------- */
interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string | null;
  active: number;
  last_test_at: number | null;
  last_test_status: string | null;
}
export function WebhooksPage() {
  const [rows, setRows] = useState<WebhookRow[] | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('*');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    api<WebhookRow[]>('/api/webhooks').then(setRows).catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  const add = async () => {
    try {
      await api('/api/webhooks', { method: 'POST', body: JSON.stringify({ name, url, events }) });
      setMsg({ ok: true, text: 'เพิ่ม webhook แล้ว' });
      setName('');
      setUrl('');
      load();
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    }
  };
  const test = async (id: string) => {
    try {
      const r = await api<{ ok: boolean; detail: string }>(`/api/webhooks/${id}/test`, { method: 'POST' });
      setMsg({ ok: r.ok, text: `ทดสอบ: ${r.detail}` });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    }
    load();
  };

  return (
    <>
      <div className="page-title">
        <Icon name="webhook" size={17} />
        Webhook
        <span className="sub">เหตุการณ์บอทจะถูกส่งแบบ HTTP POST จริง</span>
      </div>
      <div className="page-body">
        <Card title="เพิ่ม Webhook" icon="plus">
          <div className="formgrid">
            <label className="field">
              ชื่อ
              <input className="txtinput" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-hook" />
            </label>
            <label className="field">
              URL (https)
              <input className="txtinput" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hook" />
            </label>
            <label className="field">
              Events (เช่น * หรือ music.track_start,bot.command)
              <input className="txtinput" value={events} onChange={(e) => setEvents(e.target.value)} />
            </label>
          </div>
          <div className="toolbar" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={add} disabled={!name || !url}>
              <Icon name="plus" size={13} /> เพิ่ม
            </button>
          </div>
          {msg && <div style={{ marginTop: 9 }} className={msg.ok ? 'okbox' : 'errbox'}>{msg.text}</div>}
        </Card>
        <Card title="รายการ Webhooks" icon="webhook">
          {!rows || rows.length === 0 ? (
            <Empty icon="webhook">ยังไม่มี webhook</Empty>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>URL</th>
                  <th>สถานะ</th>
                  <th>ทดสอบล่าสุด</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="note" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.url}
                    </td>
                    <td>
                      <span className={`tag ${r.active ? 'ok' : 'dim'}`}>{r.active ? 'ACTIVE' : 'OFF'}</span>
                    </td>
                    <td className="mono">{r.last_test_status ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn sm" onClick={() => test(r.id)}>
                          <Icon name="zap" size={12} /> ทดสอบ
                        </button>
                        <button className="qmore" onClick={() => api(`/api/webhooks/${r.id}`, { method: 'DELETE' }).then(load).catch(() => undefined)}>
                          <Icon name="trash" size={13} />
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

/* Toggle ถูก import ไว้เพื่อใช้ในหน้าอื่นภายหลัง */
export { Toggle };
