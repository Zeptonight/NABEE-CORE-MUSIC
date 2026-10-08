import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { log } from './logger.js';
import { existsSync } from 'node:fs';
import { csrfGuard } from './routes/guards.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerApiRoutes } from './routes/api.js';
import { registerStreamRoute } from './routes/stream.js';

/** Build the fully-wired app (no listen, no side-effect subsystems) — shared by index.ts and tests. */
export async function buildApp() {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    bodyLimit: 256 * 1024,
    disableRequestLogging: true,
  });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'RATE_LIMITED' }),
  });

  // ---- security headers ----
  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-XSS-Protection', '0');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (config.isProd) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data: https://i.ytimg.com https://img.youtube.com https://cdn.discordapp.com https://*.discordapp.net https://avatars.githubusercontent.com https://github.com",
      "connect-src 'self'",
      config.allowIframe ? 'frame-ancestors *' : "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    reply.header('Content-Security-Policy', csp);
    if (!config.allowIframe) reply.header('X-Frame-Options', 'DENY');
  });

  // ---- CSRF guard for all API mutations ----
  app.addHook('preHandler', csrfGuard);

  // ---- routes ----
  registerAuthRoutes(app);
  registerApiRoutes(app);
  registerStreamRoute(app);

  // ---- static web app ----
  const webDist = config.webDist;
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, wildcard: false, index: 'index.html' });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      reply.code(404).send({ error: 'NOT_FOUND' });
    });
  } else {
    log.warn('web/dist not found — run `npm run build:web` to build the frontend');
    app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: 'NOT_FOUND' }));
  }

  // ---- error handler (no stack leaks) ----
  app.setErrorHandler((err, req, reply) => {
    const code = (err as { statusCode?: number; code?: string }).statusCode ?? 500;
    const msg = err instanceof Error ? err.message : String(err);
    if (code >= 500) {
      log.error({ err: msg, url: req.url }, 'request error');
    }
    reply.code(code).send({ error: code >= 500 ? 'INTERNAL_ERROR' : msg.slice(0, 200) });
  });

  return app;
}
