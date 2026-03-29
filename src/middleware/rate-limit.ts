import { createMiddleware } from 'hono/factory';
import type { Env, ApiResponse } from '../types.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60;

/**
 * In-memory rate limiter: 60 requests per minute per IP.
 *
 * Workers don't have persistent cross-request state by default, but a
 * Map-based limiter works within a single isolate lifetime (which covers
 * burst scenarios). For production distributed rate limiting, swap this
 * out for a Durable Objects or KV-backed counter.
 */
export const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown';
  const now = Date.now();

  let entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(ip, entry);
  }

  entry.count++;

  // Set rate limit headers on all responses
  c.header('X-RateLimit-Limit', String(MAX_REQUESTS));
  c.header('X-RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - entry.count)));
  c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

  if (entry.count > MAX_REQUESTS) {
    return c.json<ApiResponse>({ ok: false, message: 'Rate limit exceeded' }, 429);
  }

  await next();
});

/**
 * Reset the in-memory rate limit store. Exposed for testing only.
 */
export function resetRateLimitStore(): void {
  store.clear();
}
