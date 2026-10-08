import type { FastifyReply, FastifyRequest } from 'fastify';
import { resolveAuth, SESSION_COOKIE, CSRF_COOKIE, isOwner, isStaff, type AuthContext } from '../security/session.js';
import { safeEqual } from '../security/crypto.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export async function resolveAuthOrThrow(req: FastifyRequest): Promise<AuthContext | null> {
  return resolveAuth(req.cookies[SESSION_COOKIE]);
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const ctx = await resolveAuth(req.cookies[SESSION_COOKIE]);
  if (!ctx) {
    reply.code(401).send({ error: 'UNAUTHORIZED' });
    return;
  }
  req.auth = ctx;
}

export async function requireStaff(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (!isStaff(req.auth!.user)) {
    reply.code(403).send({ error: 'FORBIDDEN', detail: 'STAFF_ONLY' });
  }
}

export async function requireOwner(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(req, reply);
  if (reply.sent) return;
  if (!isOwner(req.auth!.user)) {
    reply.code(403).send({ error: 'FORBIDDEN', detail: 'OWNER_ONLY' });
  }
}

/**
 * CSRF guard: double-submit cookie + SameSite=Lax. Applied to all unsafe /api methods
 * except /api/auth/* (those are GET redirects protected by the OAuth state parameter).
 */
export async function csrfGuard(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;
  if (req.url.startsWith('/api/auth/')) return;
  const cookie = req.cookies[CSRF_COOKIE];
  const header = req.headers['x-csrf-token'];
  if (!cookie || !header || !safeEqual(cookie, String(header))) {
    reply.code(403).send({ error: 'CSRF_TOKEN_MISMATCH' });
  }
}
