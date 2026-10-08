import type { CredentialRow } from './db/repo2.js';
import { revealCredential, markCredentialTested } from './db/repo2.js';
import { fetchJson } from './util.js';

export interface TestResult {
  ok: boolean;
  detail: string;
}

/** Real credential validation — live calls where the type supports it. */
export async function testCredential(row: CredentialRow): Promise<TestResult> {
  const plain = await revealCredential(row.id);
  if (plain == null) {
    const r = { ok: false, detail: 'DECRYPT_FAILED' };
    await markCredentialTested(row.id, r.ok);
    return r;
  }
  let result: TestResult;
  switch (row.key) {
    case 'discord:token': {
      try {
        const r = await fetchJson('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bot ${plain}` } }, 8000);
        result =
          r.status === 200
            ? { ok: true, detail: `VALID — bot: ${r.json?.username ?? 'unknown'}` }
            : { ok: false, detail: `Discord REST returned HTTP ${r.status}` };
      } catch (e) {
        result = { ok: false, detail: `UNREACHABLE — ${e instanceof Error ? e.message.slice(0, 80) : 'network error'}` };
      }
      break;
    }
    case 'github:personal_token': {
      try {
        const r = await fetchJson(
          'https://api.github.com/user',
          { headers: { Authorization: `Bearer ${plain}`, 'User-Agent': 'NABEE-CORE-MUSIC' } },
          8000,
        );
        result = r.status === 200 ? { ok: true, detail: `VALID — ${r.json?.login}` } : { ok: false, detail: `GitHub API returned HTTP ${r.status}` };
      } catch (e) {
        result = { ok: false, detail: `UNREACHABLE — ${e instanceof Error ? e.message.slice(0, 80) : 'network error'}` };
      }
      break;
    }
    case 'github:client_secret':
      result = /^[0-9a-f]{40}$/.test(plain) ? { ok: true, detail: 'FORMAT OK (40-hex)' } : { ok: false, detail: 'FORMAT INVALID — GitHub client secrets are 40 hex chars' };
      break;
    default:
      result = plain.length >= 8 ? { ok: true, detail: 'ENC_OK — decryptable, no live check for this type' } : { ok: false, detail: 'TOO_SHORT (<8 chars)' };
  }
  await markCredentialTested(row.id, result.ok);
  return result;
}
