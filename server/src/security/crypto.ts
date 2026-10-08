import { createHash, randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';

/** Root secret: from env or auto-generated and persisted in the data dir (chmod 600). */
let rootSecretCache: string | null = null;

export function getRootSecret(): string {
  if (rootSecretCache) return rootSecretCache;
  if (config.sessionSecret) {
    rootSecretCache = config.sessionSecret;
    return rootSecretCache;
  }
  const file = join(config.dataDir, 'secret.key');
  try {
    const existing = readFileSync(file, 'utf8').trim();
    if (existing.length >= 32) {
      rootSecretCache = existing;
      return rootSecretCache;
    }
  } catch {
    /* not found — generate */
  }
  const generated = randomBytes(48).toString('base64url');
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(file, generated + '\n', { mode: 0o600 });
  try {
    chmodSync(file, 0o600);
  } catch {
    /* some filesystems ignore chmod */
  }
  rootSecretCache = generated;
  return rootSecretCache;
}

/** Derive a purpose-specific 32-byte key from the root secret. */
export function deriveKey(purpose: string): Buffer {
  return scryptSync(getRootSecret(), 'nabee-core-v1:' + purpose, 32);
}

const encKey = () => deriveKey('credential-encryption');

/** AES-256-GCM seal. Format: v1.<iv b64url>.<tag b64url>.<ct b64url> */
export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.');
}

export function openSecret(sealed: string): string | null {
  try {
    const [v, ivB, tagB, ctB] = sealed.split('.');
    if (v !== 'v1' || !ivB || !tagB || !ctB) return null;
    const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64url'));
    const pt = Buffer.concat([decipher.update(Buffer.from(ctB, 'base64url')), decipher.final()]);
    return pt.toString('utf8');
  } catch {
    return null;
  }
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function newId(): string {
  return Date.now().toString(36) + randomBytes(9).toString('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Mask a secret for display: keep only the last 4 chars. */
export function maskValue(plain: string): string {
  const tail = plain.slice(-4);
  return '••••••••' + (plain.length >= 8 ? tail : '••••');
}
