import { useCallback, useEffect, useState } from 'react';
import { api, fmtClock } from '../api';
import { useLiveStream } from '../stream';
import { Card, Empty, StatusPill } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { CoverArt } from '../ui/art';
import type { BotStatus, PlayerState } from '../ui/types';
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function useBot(): BotStatus | null {
  const live = useLiveStream(false);
  const [bot, setBot] = useState<BotStatus | null>(null);
  useEffect(() => {
    api<BotStatus>('/api/bot/status').then(setBot).catch(() => undefined);
  }, []);
  return (live.bot as BotStatus) ?? bot;
}

/* ---------------- คิวเพลง ---------------- */
export function QueuePage() {
  const bot = useBot();
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const live = useLiveStream();

  const load = useCallback(() => {
    api<PlayerState>('/api/player/default')
      .then((p) => {
        setPlayer(p);
        setErr(null);
      })
      .catch((e: Error) => setErr(errMsg(e)));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    const p = live.player as PlayerState | null;
    if (p) setPlayer(p);
  }, [live.player]);

  const act = async (action: string) => {
    try {
      const st = await api<PlayerState>(`/api/player/${action}`, { method: 'POST', body: JSON.stringify({ guildId: 'default' }) });
      setPlayer(st);
    } catch {
      /* ignore */
    }
  };

  const q = player?.queue ?? [];
  const np = player?.nowPlaying ?? null;
  return (
    <>
      <div className="page-title">
        <Icon name="queue" size={17} />
        คิวเพลง
        <span className="sub">คิวการเล่นจริงของบอท — จัดการได้จากเว็บหรือคำสั่ง /play</span>
      </div>
      <div className="page-body">
        {err === 'BOT_NOT_CONFIGURED' || (bot && !bot.configured) ? (
          <div className="warnbox">
            บอทยังไม่ได้ตั้งค่า (NOT CONFIGURED) — ตั้งค่า DISCORD_TOKEN และ DISCORD_CLIENT_ID ผ่านหน้า “API &amp; Credentials” หรือ environment แล้วรีสตาร์ท
          </div>
        ) : err ? (
          <div className="errbox">{err}</div>
        ) : null}

        {np && (
          <Card title="กำลังเล่นตอนนี้" icon="headset" action={<StatusPill state={player?.paused ? 'unset' : 'online'} label={player?.paused ? 'PAUSED' : 'PLAYING'} />}>
            <div className="np">
              <div className="cover">{np.thumbnail ? <img src={np.thumbnail} alt="" width={64} height={64} referrerPolicy="no-referrer" /> : <CoverArt size={64} rounded={0} />}</div>
              <div className="np-info">
                <div className="np-title">{np.title}</div>
                <div className="np-artist">
                  {np.author} • {fmtClock(np.durationMs)} • ขอโดย {np.requestedByName ?? '—'}
                </div>
              </div>
            </div>
            <div className="qbtns" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <button className="btn" onClick={() => act(player?.paused ? 'resume' : 'pause')}>
                <Icon name={player?.paused ? 'play' : 'pause'} size={13} />
                {player?.paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
              </button>
              <button className="btn" onClick={() => act('skip')}>
                <Icon name="skip-fwd" size={13} /> ข้ามเพลง
              </button>
              <button
                className="btn danger"
                onClick={() => api('/api/queue/clear', { method: 'POST', body: JSON.stringify({ guildId: 'default' }) }).then(load).catch(() => undefined)}
              >
                <Icon name="trash" size={13} /> ล้างคิว
              </button>
            </div>
          </Card>
        )}

        <Card
          title={
            <>
              คิวเพลง <span style={{ color: 'var(--txt-3)' }}>({q.length})</span>
            </>
          }
          icon="queue"
        >
          <div className="qlist">
            {q.length === 0 ? (
              <Empty icon="queue">ไม่มีเพลงในคิว — NO DATA</Empty>
            ) : (
              q.map((t, i) => (
                <div key={t.queueId} className="qrow">
                  <span className="qnum">{i + 1}</span>
                  <span className="qthumb">{t.thumbnail ? <img src={t.thumbnail} alt="" width={30} height={30} referrerPolicy="no-referrer" /> : <CoverArt size={30} rounded={0} />}</span>
                  <div className="qmain">
                    <div className="qtitle">{t.title}</div>
                    <div className="qartist">
                      {t.author}
                      {t.requestedByName ? ` • ขอโดย ${t.requestedByName}` : ''}
                    </div>
                  </div>
                  <span className="qdur">{fmtClock(t.durationMs)}</span>
                  <button
                    className="qmore"
                    aria-label="remove"
                    onClick={() => api(`/api/queue/default/${t.queueId}`, { method: 'DELETE' }).then(load).catch(() => undefined)}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ---------------- เพลง (ค้นหา & เพิ่มเพลง) ---------------- */
export function MusicPage() {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const live = useLiveStream();

  const load = useCallback(() => {
    api<PlayerState>('/api/player/default')
      .then(setPlayer)
      .catch(() => setPlayer(null));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    const p = live.player as PlayerState | null;
    if (p) setPlayer(p);
  }, [live.player]);

  const add = async () => {
    if (!query.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const st = await api<PlayerState>('/api/queue', { method: 'POST', body: JSON.stringify({ guildId: 'default', query: query.trim() }) });
      setPlayer(st);
      setMsg({ ok: true, text: 'เพิ่มเพลงเข้าคิวแล้ว' });
      setQuery('');
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-title">
        <Icon name="music" size={17} />
        เพลง
        <span className="sub">ค้นหาและเพิ่มเพลงเข้าคิว (YouTube)</span>
      </div>
      <div className="page-body">
        <Card title="เพิ่มเพลง" icon="plus">
          <div className="toolbar">
            <input
              className="txtinput"
              style={{ flex: 1, minWidth: 220 }}
              placeholder="ชื่อเพลง หรือลิงก์ YouTube…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              disabled={busy}
            />
            <button className="btn primary" onClick={add} disabled={busy || !query.trim()}>
              <Icon name="plus" size={13} /> {busy ? 'กำลังค้นหา…' : 'เพิ่มเข้าคิว'}
            </button>
          </div>
          {msg && <div style={{ marginTop: 9 }} className={msg.ok ? 'okbox' : 'errbox'}>{msg.text}</div>}
          <div className="note" style={{ marginTop: 9 }}>
            บอทต้องอยู่ในช่องเสียงก่อนจึงจะเล่นเพลงได้ — ใช้คำสั่ง /join ใน Discord หรือกดเล่นจากคิว การค้นหาใช้บริการ YouTube โดยตรงจากเซิร์ฟเวอร์
          </div>
        </Card>

        <Card
          title={
            <>
              คิวเพลง <span style={{ color: 'var(--txt-3)' }}>({player?.queue.length ?? 0})</span>
            </>
          }
          icon="queue"
        >
          {(player?.queue ?? []).length === 0 ? (
            <Empty icon="music">ไม่มีเพลงในคิว</Empty>
          ) : (
            <div className="qlist">
              {player!.queue.map((t, i) => (
                <div key={t.queueId} className="qrow">
                  <span className="qnum">{i + 1}</span>
                  <span className="qthumb">{t.thumbnail ? <img src={t.thumbnail} alt="" width={30} height={30} referrerPolicy="no-referrer" /> : <CoverArt size={30} rounded={0} />}</span>
                  <div className="qmain">
                    <div className="qtitle">{t.title}</div>
                    <div className="qartist">{t.author}</div>
                  </div>
                  <span className="qdur">{fmtClock(t.durationMs)}</span>
                  <button className="qmore" aria-label="remove" onClick={() => api(`/api/queue/default/${t.queueId}`, { method: 'DELETE' }).then(load).catch(() => undefined)}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
