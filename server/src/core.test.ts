// env must be prepared before any module import touches config
import '../../tests/setup.js';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  const { buildApp } = await import('./app.js');
  const { getDb } = await import('./db/index.js');
  await getDb(); // initialize schema
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  const { closeDb } = await import('./db/index.js');
  await app?.close();
  await closeDb();
});

describe('security core', () => {
  it('AES-256-GCM seal/open roundtrip + tamper detection', async () => {
    const { sealSecret, openSecret } = await import('./security/crypto.js');
    const secret = 'MTIzNDU2Nzg5MGFiY2RlZg==.very$secret-值';
    const sealed = sealSecret(secret);
    expect(sealed.startsWith('v1.')).toBe(true);
    expect(sealed).not.toContain(secret);
    expect(openSecret(sealed)).toBe(secret);
    const tampered = sealed.slice(0, -4) + 'AAAA';
    expect(openSecret(tampered)).toBeNull();
  });

  it('maskValue keeps only last 4 chars', async () => {
    const { maskValue } = await import('./security/crypto.js');
    expect(maskValue('abcdefghijk')).toBe('••••••••hijk');
    expect(maskValue('short')).toBe('••••••••••••');
  });

  it('safeEqual is timing-safe compare', async () => {
    const { safeEqual } = await import('./security/crypto.js');
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('session tokens are hashed with pepper (not stored raw)', async () => {
    const { hashSessionToken } = await import('./security/session.js');
    const t1 = hashSessionToken('token-a');
    const t2 = hashSessionToken('token-b');
    expect(t1).not.toBe(t2);
    expect(t1).toHaveLength(64);
    expect(hashSessionToken('token-a')).toBe(t1);
  });
});

describe('API surface', () => {
  it('GET /api/health is public', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('GET /api/auth/status reports real configuration state', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/status' });
    expect(res.statusCode).toBe(200);
    const j = res.json() as { configured: boolean; ownerConfigured: boolean };
    expect(j.configured).toBe(false); // no GITHUB_CLIENT_ID in test env
    expect(j.ownerConfigured).toBe(true); // GITHUB_OWNER_ID set
  });

  it('GET /api/auth/github/start returns 503 when not configured (honest state)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/github/start' });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('GITHUB_NOT_CONFIGURED');
  });

  it('protected API returns 401 without session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('UNAUTHORIZED');
  });

  it('mutations without CSRF header are rejected 403', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/queue/clear', payload: { guildId: 'x' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe('CSRF_TOKEN_MISMATCH');
  });

  it('owner-only endpoints reject unauthenticated callers', async () => {
    for (const url of ['/api/users', '/api/credentials', '/api/logs', '/api/settings', '/api/backups', '/api/webhooks']) {
      const res = await app.inject({ method: 'GET', url });
      expect([401, 403]).toContain(res.statusCode);
    }
  });

  it('bootstrap exposes only non-sensitive flags', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/bootstrap' });
    const j = res.json() as Record<string, unknown>;
    expect(j.version).toBeTruthy();
    expect((j.github as Record<string, unknown>).configured).toBe(false);
    expect(JSON.stringify(j)).not.toMatch(/secret|token/i);
  });
});
