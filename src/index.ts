import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables, ApiResponse } from './types.js';
import { health } from './routes/health.js';
import { events } from './routes/events.js';
import { apiKeys } from './routes/api-keys.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-API-Key'],
  }),
);

// Routes
app.route('/', health);
app.route('/events', events);
app.route('/api-keys', apiKeys);

// 404 fallback
app.notFound((c) => {
  return c.json<ApiResponse>({ ok: false, message: 'Not found' }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json<ApiResponse>({ ok: false, message: 'Internal server error' }, 500);
});

export default app;
