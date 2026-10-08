import { useEffect, useRef, useState } from 'react';

export interface StreamState {
  connected: boolean;
  metrics: unknown | null;
  bot: unknown | null;
  player: unknown | null;
  lastEventAt: number;
}

/** Subscribe to the server-sent live stream (metrics / bot / player). Falls back gracefully. */
export function useLiveStream(enabled = true): StreamState {
  const [state, setState] = useState<StreamState>({ connected: false, metrics: null, bot: null, player: null, lastEventAt: 0 });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      const es = new EventSource('/api/stream');
      esRef.current = es;
      es.onopen = () => setState((s) => ({ ...s, connected: true }));
      es.addEventListener('metrics', (e) => {
        setState((s) => ({ ...s, metrics: JSON.parse((e as MessageEvent).data), lastEventAt: Date.now() }));
      });
      es.addEventListener('bot', (e) => {
        setState((s) => ({ ...s, bot: JSON.parse((e as MessageEvent).data), lastEventAt: Date.now() }));
      });
      es.addEventListener('player', (e) => {
        setState((s) => ({ ...s, player: JSON.parse((e as MessageEvent).data), lastEventAt: Date.now() }));
      });
      es.onerror = () => {
        es.close();
        esRef.current = null;
        setState((s) => ({ ...s, connected: false }));
        if (!cancelled) retry = setTimeout(connect, 5000);
      };
    };
    connect();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      esRef.current?.close();
    };
  }, [enabled]);

  return state;
}
