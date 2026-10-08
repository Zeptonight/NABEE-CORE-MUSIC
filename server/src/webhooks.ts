/** Dispatch bot/music events to registered webhooks (real HTTP POST, best effort). */
import { listActiveWebhooks, markWebhookTested } from './db/repo2.js';
import { log } from './logger.js';

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
  ts: number;
}

export async function dispatchWebhooks(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    const hooks = await listActiveWebhooks();
    if (hooks.length === 0) return;
    const payload: WebhookPayload = { event, data, ts: Date.now() };
    await Promise.allSettled(
      hooks.map(async (h) => {
        const events = (h.events ?? '').split(',').map((s) => s.trim()).filter(Boolean);
        if (events.length && !events.includes(event) && !events.includes('*')) return;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        try {
          const res = await fetch(h.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-NABEE-Event': event },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
          });
          await markWebhookTested(h.id, `POST ${res.status}`);
        } catch (e) {
          await markWebhookTested(h.id, `ERROR ${e instanceof Error ? e.message.slice(0, 60) : 'failed'}`);
        } finally {
          clearTimeout(t);
        }
      }),
    );
  } catch (e) {
    log.debug({ err: e instanceof Error ? e.message : String(e) }, 'webhook dispatch failed');
  }
}
