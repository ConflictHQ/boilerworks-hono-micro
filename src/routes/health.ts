import { Hono } from 'hono';
import type { Env, ApiResponse } from '../types.js';

const health = new Hono<{ Bindings: Env }>();

health.get('/health', (c) => {
  return c.json<ApiResponse>({
    ok: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});

export { health };
