/**
 * Test helpers -- seed data and utilities for integration tests.
 */

export async function applyMigrations(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      scopes TEXT NOT NULL DEFAULT '["*"]',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'received',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    )`,
    )
    .run();
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function seedApiKey(
  db: D1Database,
  plainKey: string,
  scopes: string[] = ['*'],
  name = 'test-key',
): Promise<string> {
  const id = crypto.randomUUID();
  const keyHash = await sha256Hex(plainKey);
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO api_keys (id, name, key_hash, scopes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(id, name, keyHash, JSON.stringify(scopes), now, now)
    .run();

  return id;
}

export async function seedEvent(
  db: D1Database,
  overrides: Partial<{
    id: string;
    type: string;
    source: string;
    payload: string;
    status: string;
    deleted_at: string | null;
  }> = {},
): Promise<string> {
  const id = overrides.id ?? crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO events (id, type, source, payload, status, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      overrides.type ?? 'test.event',
      overrides.source ?? 'test-suite',
      overrides.payload ?? '{}',
      overrides.status ?? 'received',
      now,
      now,
      overrides.deleted_at ?? null,
    )
    .run();

  return id;
}

export async function cleanTables(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM events').run();
  await db.prepare('DELETE FROM api_keys').run();
}
