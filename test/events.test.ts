import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { resetRateLimitStore } from '../src/middleware/rate-limit';
import { applyMigrations, seedApiKey, seedEvent, cleanTables } from './helpers';

const TEST_KEY = 'test-key-events';

describe('Events CRUD', () => {
  beforeEach(async () => {
    resetRateLimitStore();
    await applyMigrations(env.DB);
    await cleanTables(env.DB);
    await seedApiKey(env.DB, TEST_KEY, ['*']);
  });

  describe('POST /events', () => {
    it('creates an event', async () => {
      const resp = await app.request(
        '/events',
        {
          method: 'POST',
          headers: { 'X-API-Key': TEST_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'order.created', source: 'shop', payload: { id: 1 } }),
        },
        env,
      );

      expect(resp.status).toBe(201);
      const body = await resp.json();
      expect(body.ok).toBe(true);
      expect(body.data.type).toBe('order.created');
      expect(body.data.source).toBe('shop');
      expect(body.data.payload).toEqual({ id: 1 });
      expect(body.data.status).toBe('received');
      expect(body.data.id).toBeDefined();

      // Verify in DB
      const row = await env.DB.prepare('SELECT * FROM events WHERE id = ?')
        .bind(body.data.id)
        .first();
      expect(row).not.toBeNull();
      expect(row!.type).toBe('order.created');
    });

    it('returns 400 for invalid JSON body', async () => {
      const resp = await app.request(
        '/events',
        {
          method: 'POST',
          headers: { 'X-API-Key': TEST_KEY, 'Content-Type': 'application/json' },
          body: '{not valid json!!!',
        },
        env,
      );

      expect(resp.status).toBe(400);
      const body = await resp.json();
      expect(body.ok).toBe(false);
      expect(body.message).toBe('Invalid JSON body');
    });

    it('rejects invalid payload', async () => {
      const resp = await app.request(
        '/events',
        {
          method: 'POST',
          headers: { 'X-API-Key': TEST_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'shop' }), // missing type
        },
        env,
      );

      expect(resp.status).toBe(400);
      const body = await resp.json();
      expect(body.ok).toBe(false);
      expect(body.errors).toBeDefined();
      expect(body.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('GET /events', () => {
    it('lists events excluding soft-deleted', async () => {
      await seedEvent(env.DB, { type: 'visible' });
      await seedEvent(env.DB, { type: 'deleted', deleted_at: new Date().toISOString() });

      const resp = await app.request('/events', { headers: { 'X-API-Key': TEST_KEY } }, env);

      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body.ok).toBe(true);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.items[0].type).toBe('visible');
      expect(body.data.total).toBe(1);
    });

    it('respects limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await seedEvent(env.DB, { type: `event-${i}` });
      }

      const resp = await app.request(
        '/events?limit=2&offset=1',
        { headers: { 'X-API-Key': TEST_KEY } },
        env,
      );

      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body.data.items).toHaveLength(2);
      expect(body.data.total).toBe(5);
    });
  });

  describe('GET /events/:id', () => {
    it('returns a single event', async () => {
      const eventId = await seedEvent(env.DB, { type: 'order.shipped' });

      const resp = await app.request(
        `/events/${eventId}`,
        { headers: { 'X-API-Key': TEST_KEY } },
        env,
      );

      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body.ok).toBe(true);
      expect(body.data.id).toBe(eventId);
      expect(body.data.type).toBe('order.shipped');
    });

    it('returns 404 for non-existent event', async () => {
      const resp = await app.request(
        '/events/00000000-0000-0000-0000-000000000000',
        { headers: { 'X-API-Key': TEST_KEY } },
        env,
      );

      expect(resp.status).toBe(404);
    });

    it('returns 404 for soft-deleted event', async () => {
      const eventId = await seedEvent(env.DB, {
        deleted_at: new Date().toISOString(),
      });

      const resp = await app.request(
        `/events/${eventId}`,
        { headers: { 'X-API-Key': TEST_KEY } },
        env,
      );

      expect(resp.status).toBe(404);
    });
  });

  describe('PATCH /events/:id', () => {
    it('updates an event', async () => {
      const eventId = await seedEvent(env.DB, { type: 'order.created', status: 'received' });

      const resp = await app.request(
        `/events/${eventId}`,
        {
          method: 'PATCH',
          headers: { 'X-API-Key': TEST_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'processed', type: 'order.updated' }),
        },
        env,
      );

      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body.ok).toBe(true);
      expect(body.data.status).toBe('processed');
      expect(body.data.type).toBe('order.updated');

      // Verify in DB
      const row = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();
      expect(row!.status).toBe('processed');
    });
  });

  describe('DELETE /events/:id', () => {
    it('soft deletes an event', async () => {
      const eventId = await seedEvent(env.DB);

      const resp = await app.request(
        `/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { 'X-API-Key': TEST_KEY },
        },
        env,
      );

      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body.ok).toBe(true);
      expect(body.data.deleted).toBe(true);

      // Verify soft delete in DB
      const row = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(eventId).first();
      expect(row!.deleted_at).not.toBeNull();
    });

    it('returns 404 for already-deleted event', async () => {
      const eventId = await seedEvent(env.DB, {
        deleted_at: new Date().toISOString(),
      });

      const resp = await app.request(
        `/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { 'X-API-Key': TEST_KEY },
        },
        env,
      );

      expect(resp.status).toBe(404);
    });
  });
});
