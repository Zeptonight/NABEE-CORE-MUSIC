import { config } from '../config.js';
import { deriveKey, randomToken, sha256 } from './crypto.js';
import { createSession, getSession, type SessionRow, type UserRow, getUserById } from '../db/repo.js';

export const SESSION_COOKIE = 'nbee_session';
export const CSRF_COOKIE = 'nbee_csrf';

export function hashSessionToken(token: string): string {
  // pepper the token before hashing so a DB leak alone cannot forge sessions
  const pepper = deriveKey('session-pepper').toString('base64url');
  return sha256(pepper + ':' + token);
}

export async function loginSession(user: UserRow, ip: string, userAgent: string): Promise<{ token: string; session: SessionRow }> {
  const token = randomToken(32);
  const id = hashSessionToken(token);
  await createSession({ id, userId: user.id, ip, userAgent, ttlMs: config.sessionTtlMs });
  return { token, session: (await getSession(id))! };
}

export interface AuthContext {
  user: UserRow;
  session: SessionRow;
}

export async function resolveAuth(sessionCookie: string | undefined): Promise<AuthContext | null> {
  if (!sessionCookie) return null;
  const sess = await getSession(hashSessionToken(sessionCookie));
  if (!sess || sess.expires_at < Date.now()) return null;
  const user = await getUserById(sess.user_id);
  if (!user || user.disabled) return null;
  return { user, session: sess };
}

export function isOwner(user: UserRow): boolean {
  return user.role === 'owner';
}

export function isStaff(user: UserRow): boolean {
  return user.role === 'owner' || user.role === 'admin';
}

export const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: config.isProd,
  maxAge: config.sessionTtlMs / 1000,
};

export const csrfCookieOpts = {
  httpOnly: false,
  sameSite: 'lax' as const,
  path: '/',
  secure: config.isProd,
  maxAge: config.sessionTtlMs / 1000,
};
