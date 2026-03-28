import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { resetRateLimitStore } from '../src/middleware/rate-limit';

describe('GET /health', () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it('returns healthy status without auth', async () => {
    const resp = await app.request('/health');
    expect(resp.status).toBe(200);

    const body = await resp.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.timestamp).toBeDefined();
  });
});
