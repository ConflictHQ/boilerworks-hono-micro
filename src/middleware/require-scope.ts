import { createMiddleware } from 'hono/factory';
import type { Env, Variables, ApiResponse } from '../types.js';

/**
 * Middleware that checks if the authenticated API key has the required scope.
 * Must be used after apiKeyAuth.
 */
export function requireScope(scope: string) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const apiKey = c.get('apiKey');
    const scopes: string[] = JSON.parse(apiKey.scopes);
    if (!scopes.includes('*') && !scopes.includes(scope)) {
      return c.json<ApiResponse>({ ok: false, message: `Missing scope: ${scope}` }, 403);
    }
    await next();
  });
}
