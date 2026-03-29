import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { resetRateLimitStore } from '../src/middleware/rate-limit';
import { applyMigrations, seedApiKey, cleanTables } from './helpers';

const TEST_KEY = 'test-key-ratelimit';

describe('Rate limiting', () => {
  beforeEach(async () => {
    resetRateLimitStore();
    await applyMigrations(env.DB);
    await cleanTables(env.DB);
    await seedApiKey(env.DB, TEST_KEY, ['*']);
  });

  it('returns rate limit headers on responses', async () => {
    const resp = await app.request('/health');
    expect(resp.status).toBe(200);
    expect(resp.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(resp.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(resp.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('returns 429 after exceeding 60 requests per minute', async () => {
    // Fire 60 requests to exhaust the limit
    for (let i = 0; i < 60; i++) {
      const resp = await app.request('/health');
      expect(resp.status).toBe(200);
    }

    // 61st request should be rate limited
    const resp = await app.request('/health');
    expect(resp.status).toBe(429);

    const body = await resp.json();
    expect(body.ok).toBe(false);
    expect(body.message).toBe('Rate limit exceeded');
    expect(resp.headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});
