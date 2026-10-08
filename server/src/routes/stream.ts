import type { FastifyInstance } from 'fastify';
import { getMetrics } from '../metrics.js';
import { getBotStatus } from '../bot/client.js';
import { music } from '../bot/music.js';
import { requireAuth } from './guards.js';

let sseClients = 0;

export function sseClientCount(): number {
  return sseClients;
}

export function registerStreamRoute(app: FastifyInstance): void {
  app.get('/api/stream', { preHandler: requireAuth }, async (req, reply) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 4000\n\n');
    sseClients++;

    let closed = false;
    const send = (event: string, data: unknown) => {
      if (closed) return;
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        /* connection gone */
      }
    };

    const interval = setInterval(() => {
      void (async () => {
        try {
          send('metrics', await getMetrics());
          send('bot', getBotStatus());
        } catch {
          /* ignore */
        }
      })();
    }, 2000);

    const onMusic = (state: unknown) => send('player', state);
    music.on('update', onMusic);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      sseClients = Math.max(0, sseClients - 1);
      clearInterval(interval);
      music.off('update', onMusic);
    };
    req.raw.on('close', cleanup);
    res.on('error', cleanup);
  });
}
