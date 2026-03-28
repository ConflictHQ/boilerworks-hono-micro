import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables, ApiResponse, ApiKeyRow } from '../types.js';
import { apiKeyAuth } from '../middleware/api-key-auth.js';
import { requireScope } from '../middleware/require-scope.js';
import { sha256Hex } from '../lib/crypto.js';

const apiKeys = new Hono<{ Bindings: Env; Variables: Variables }>();

// All API key routes require auth + keys.manage scope
apiKeys.use('/*', apiKeyAuth);

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).optional().default(['*']),
});

// POST /api-keys -- create a new API key (returns plaintext key once)
apiKeys.post('/', requireScope('keys.manage'), async (c) => {
  const body = await c.req.json();
  const parsed = CreateApiKeySchema.safeParse(body);

  if (!parsed.success) {
    return c.json<ApiResponse>(
      {
        ok: false,
        message: 'Validation failed',
        errors: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      },
      400,
    );
  }

  const id = crypto.randomUUID();
  const plainKey = `bw_${crypto.randomUUID().replace(/-/g, '')}`;
  const keyHash = await sha256Hex(plainKey);
  const now = new Date().toISOString();
  const { name, scopes } = parsed.data;

  await c.env.DB.prepare(
    `INSERT INTO api_keys (id, name, key_hash, scopes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?)`,
  )
    .bind(id, name, keyHash, JSON.stringify(scopes), now, now)
    .run();

  return c.json<ApiResponse>(
    {
      ok: true,
      data: {
        id,
        name,
        key: plainKey,
        scopes,
        created_at: now,
      },
      message: 'Store this key securely -- it will not be shown again.',
    },
    201,
  );
});

// GET /api-keys -- list API keys (no key_hash exposed)
apiKeys.get('/', requireScope('keys.manage'), async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, scopes, is_active, last_used_at, created_at, updated_at
     FROM api_keys
     ORDER BY created_at DESC`,
  ).all<Omit<ApiKeyRow, 'key_hash'>>();

  return c.json<ApiResponse>({
    ok: true,
    data: (results ?? []).map((row) => ({
      ...row,
      scopes: JSON.parse(row.scopes),
      is_active: Boolean(row.is_active),
    })),
  });
});

// DELETE /api-keys/:id -- deactivate an API key
apiKeys.delete('/:id', requireScope('keys.manage'), async (c) => {
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare('SELECT * FROM api_keys WHERE id = ?')
    .bind(id)
    .first<ApiKeyRow>();

  if (!existing) {
    return c.json<ApiResponse>({ ok: false, message: 'API key not found' }, 404);
  }

  await c.env.DB.prepare('UPDATE api_keys SET is_active = 0, updated_at = datetime(?) WHERE id = ?')
    .bind(new Date().toISOString(), id)
    .run();

  return c.json<ApiResponse>({ ok: true, data: { deactivated: true } });
});

export { apiKeys };
