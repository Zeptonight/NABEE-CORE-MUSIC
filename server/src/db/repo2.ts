import { getDb } from './index.js';
import { nowMs } from '../util.js';
import { newId } from '../security/crypto.js';
import { sealSecret, openSecret, maskValue } from '../security/crypto.js';

// ---------- Credentials (encrypted at rest; never returned in plaintext) ----------
export interface CredentialRow {
  id: string;
  key: string;
  label: string;
  category: string;
  value_enc: string;
  mask: string;
  status: 'active' | 'disabled';
  last_test_at: number | null;
  last_test_ok: number | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
}

export async function createCredential(c: { key: string; label: string; category: string; value: string; createdBy: string }): Promise<CredentialRow> {
  const db = await getDb();
  const t = nowMs();
  const row: CredentialRow = {
    id: newId(),
    key: c.key,
    label: c.label,
    category: c.category,
    value_enc: sealSecret(c.value),
    mask: maskValue(c.value),
    status: 'active',
    last_test_at: null,
    last_test_ok: null,
    created_by: c.createdBy,
    created_at: t,
    updated_at: t,
  };
  await db.run(
    'INSERT INTO credentials (id, key, label, category, value_enc, mask, status, last_test_at, last_test_ok, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [row.id, row.key, row.label, row.category, row.value_enc, row.mask, row.status, null, null, row.created_by, row.created_at, row.updated_at],
  );
  return row;
}

export async function listCredentials(): Promise<Omit<CredentialRow, 'value_enc'>[]> {
  const db = await getDb();
  const rows = (await db.all('SELECT * FROM credentials ORDER BY created_at DESC')) as unknown as CredentialRow[];
  return rows.map(({ value_enc, ...rest }) => rest);
}

export async function getCredentialFull(id: string): Promise<CredentialRow | undefined> {
  const db = await getDb();
  return (await db.get('SELECT * FROM credentials WHERE id = ?', [id])) as CredentialRow | undefined;
}

export async function getCredentialByKey(key: string): Promise<CredentialRow | undefined> {
  const db = await getDb();
  return (await db.get('SELECT * FROM credentials WHERE key = ?', [key])) as CredentialRow | undefined;
}

export async function revealCredential(id: string): Promise<string | null> {
  const row = await getCredentialFull(id);
  if (!row) return null;
  return openSecret(row.value_enc);
}

export async function updateCredentialValue(id: string, value: string): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE credentials SET value_enc = ?, mask = ?, updated_at = ? WHERE id = ?', [sealSecret(value), maskValue(value), nowMs(), id]);
}

export async function updateCredentialStatus(id: string, status: 'active' | 'disabled'): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE credentials SET status = ?, updated_at = ? WHERE id = ?', [status, nowMs(), id]);
}

export async function updateCredentialMeta(
  id: string,
  patch: { label?: string; category?: string },
): Promise<void> {
  const db = await getDb();
  const cur = await getCredentialFull(id);
  if (!cur) throw new Error('NOT_FOUND');
  await db.run('UPDATE credentials SET label = ?, category = ?, updated_at = ? WHERE id = ?', [
    patch.label ?? cur.label,
    patch.category ?? cur.category,
    nowMs(),
    id,
  ]);
}

export async function deleteCredential(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM credentials WHERE id = ?', [id]);
}

export async function markCredentialTested(id: string, ok: boolean): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE credentials SET last_test_at = ?, last_test_ok = ? WHERE id = ?', [nowMs(), ok ? 1 : 0, id]);
}

// ---------- Webhooks ----------
export interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string | null;
  active: number;
  last_test_at: number | null;
  last_test_status: string | null;
  created_at: number;
}

export async function listWebhooks(): Promise<WebhookRow[]> {
  const db = await getDb();
  return (await db.all('SELECT * FROM webhooks ORDER BY created_at DESC')) as unknown as WebhookRow[];
}

export async function createWebhook(w: { name: string; url: string; events: string }): Promise<WebhookRow> {
  const db = await getDb();
  const row: WebhookRow = { id: newId(), name: w.name, url: w.url, events: w.events, active: 1, last_test_at: null, last_test_status: null, created_at: nowMs() };
  await db.run('INSERT INTO webhooks (id, name, url, events, active, last_test_at, last_test_status, created_at) VALUES (?,?,?,?,1,NULL,NULL,?)', [
    row.id,
    row.name,
    row.url,
    row.events,
    row.created_at,
  ]);
  return row;
}

export async function deleteWebhook(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM webhooks WHERE id = ?', [id]);
}

export async function markWebhookTested(id: string, status: string): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE webhooks SET last_test_at = ?, last_test_status = ? WHERE id = ?', [nowMs(), status, id]);
}

export async function listActiveWebhooks(): Promise<WebhookRow[]> {
  const db = await getDb();
  return (await db.all('SELECT * FROM webhooks WHERE active = 1')) as unknown as WebhookRow[];
}

// ---------- Embed templates ----------
export interface EmbedRow {
  id: string;
  name: string;
  data: string;
  created_at: number;
  updated_at: number;
}

export async function listEmbeds(): Promise<EmbedRow[]> {
  const db = await getDb();
  return (await db.all('SELECT * FROM embed_templates ORDER BY updated_at DESC')) as unknown as EmbedRow[];
}

export async function saveEmbed(id: string | null, name: string, data: string): Promise<EmbedRow> {
  const db = await getDb();
  const t = nowMs();
  if (id) {
    await db.run('UPDATE embed_templates SET name = ?, data = ?, updated_at = ? WHERE id = ?', [name, data, t, id]);
    return (await db.get('SELECT * FROM embed_templates WHERE id = ?', [id])) as unknown as EmbedRow;
  }
  const nid = newId();
  await db.run('INSERT INTO embed_templates (id, name, data, created_at, updated_at) VALUES (?,?,?,?,?)', [nid, name, data, t, t]);
  return (await db.get('SELECT * FROM embed_templates WHERE id = ?', [nid])) as unknown as EmbedRow;
}

export async function deleteEmbed(id: string): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM embed_templates WHERE id = ?', [id]);
}
