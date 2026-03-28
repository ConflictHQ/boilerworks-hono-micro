import { createMiddleware } from 'hono/factory';
import type { Env, Variables, ApiResponse, ApiKeyRow } from '../types.js';
import { sha256Hex } from '../lib/crypto.js';

/**
 * Middleware that validates X-API-Key header against hashed keys in D1.
 * Sets `apiKey` in the context for downstream handlers.
 */
export const apiKeyAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const key = c.req.header('X-API-Key');
    if (!key) {
      return c.json<ApiResponse>({ ok: false, message: 'API key required' }, 401);
    }

    const keyHash = await sha256Hex(key);
    const row = await c.env.DB.prepare(
      'SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1',
    )
      .bind(keyHash)
      .first<ApiKeyRow>();

    if (!row) {
      return c.json<ApiResponse>({ ok: false, message: 'Invalid API key' }, 401);
    }

    // Update last_used_at (fire and forget)
    const updatePromise = c.env.DB.prepare(
      'UPDATE api_keys SET last_used_at = datetime(?) WHERE id = ?',
    )
      .bind(new Date().toISOString(), row.id)
      .run();

    try {
      c.executionCtx.waitUntil(updatePromise);
    } catch {
      // executionCtx not available in test environment -- await directly
      await updatePromise;
    }

    c.set('apiKey', row);
    await next();
  },
);
