import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import {
  githubConfigured,
  ownerIdsConfigured,
  buildAuthorizeUrl,
  validState,
  newState,
  exchangeCode,
  fetchGithubUser,
  isOwnerGithubId,
} from '../auth/github.js';
import { upsertGithubUser } from '../db/repo.js';
import { loginSession, SESSION_COOKIE, CSRF_COOKIE, cookieOpts, csrfCookieOpts } from '../security/session.js';
import { randomToken } from '../security/crypto.js';
import { writeAudit, revokeSession, getSession } from '../db/repo.js';
import { resolveAuthOrThrow } from './guards.js';
import { log } from '../logger.js';

const OAUTH_STATE_COOKIE = 'nbee_oauth_state';

export function registerAuthRoutes(app: FastifyInstance): void {
  app.get('/api/auth/status', async () => ({
    configured: githubConfigured(),
    ownerConfigured: ownerIdsConfigured(),
    baseUrlSet: Boolean(config.baseUrl),
  }));

  app.get('/api/auth/github/start', {
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    if (!githubConfigured()) {
      reply.code(503).send({ error: 'GITHUB_NOT_CONFIGURED', detail: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET' });
      return;
    }
    if (!config.baseUrl) {
      reply.code(503).send({ error: 'BASE_URL_NOT_CONFIGURED', detail: 'Set BASE_URL so the OAuth redirect_uri can be built' });
      return;
    }
    const state = newState();
    reply.setCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: config.isProd,
      maxAge: 600,
    });
    reply.redirect(buildAuthorizeUrl(state), 302);
  });

  app.get('/api/auth/github/callback', {
    config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    if (!githubConfigured()) {
      reply.code(503).send({ error: 'GITHUB_NOT_CONFIGURED' });
      return;
    }
    const q = req.query as { code?: string; state?: string; error?: string; error_description?: string };
    const cookieState = req.cookies[OAUTH_STATE_COOKIE];
    reply.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    if (q.error) {
      reply.code(400).send({ error: 'OAUTH_DENIED', detail: q.error_description ?? q.error });
      return;
    }
    if (!q.code || !validState(q.state, cookieState)) {
      reply.code(400).send({ error: 'OAUTH_STATE_MISMATCH' });
      return;
    }
    try {
      const token = await exchangeCode(q.code);
      const ghUser = await fetchGithubUser(token);
      const owner = isOwnerGithubId(ghUser.id);
      const user = await upsertGithubUser({
        githubId: String(ghUser.id),
        login: ghUser.login,
        avatarUrl: ghUser.avatar_url,
        isOwner: owner,
      });
      if (user.disabled) {
        reply.code(403).send({ error: 'ACCOUNT_DISABLED' });
        return;
      }
      const ip = req.ip;
      const ua = String(req.headers['user-agent'] ?? '').slice(0, 200);
      const { token: sessionToken } = await loginSession(user, ip, ua);
      // fresh CSRF token per session (double-submit cookie)
      const csrf = randomToken(24);
      await writeAudit({ userId: user.id, username: user.login, action: 'auth.login', detail: owner ? 'owner' : user.role, ip });
      reply.setCookie(SESSION_COOKIE, sessionToken, cookieOpts);
      reply.setCookie(CSRF_COOKIE, csrf, csrfCookieOpts);
      reply.redirect('/', 302);
    } catch (e) {
      log.error({ err: e instanceof Error ? e.message : String(e) }, 'github callback failed');
      reply.code(502).send({ error: 'OAUTH_FAILED', detail: e instanceof Error ? e.message.slice(0, 200) : 'unknown' });
    }
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const ctx = await resolveAuthOrThrow(req);
    if (ctx) {
      await revokeSessionById(ctx.session.id);
      await writeAudit({ userId: ctx.user.id, username: ctx.user.login, action: 'auth.logout', ip: req.ip });
    }
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    reply.clearCookie(CSRF_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/me', async (req) => {
    const ctx = await resolveAuthOrThrow(req);
    return {
      authenticated: Boolean(ctx),
      user: ctx
        ? { login: ctx.user.login, avatarUrl: ctx.user.avatar_url, role: ctx.user.role }
        : null,
      githubConfigured: githubConfigured(),
      ownerConfigured: ownerIdsConfigured(),
    };
  });
}

async function revokeSessionById(id: string): Promise<void> {
  const sess = await getSession(id);
  if (sess) await revokeSession(id);
}
