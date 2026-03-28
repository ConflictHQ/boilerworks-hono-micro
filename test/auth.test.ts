import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { applyMigrations, seedApiKey, cleanTables } from './helpers';

describe('API Key Authentication', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await cleanTables(env.DB);
  });

  it('rejects requests without API key', async () => {
    const resp = await app.request('/events', { method: 'GET' }, env);
    expect(resp.status).toBe(401);

    const body = await resp.json();
    expect(body.ok).toBe(false);
    expect(body.message).toBe('API key required');
  });

  it('rejects invalid API key', async () => {
    const resp = await app.request('/events', { headers: { 'X-API-Key': 'invalid-key' } }, env);
    expect(resp.status).toBe(401);

    const body = await resp.json();
    expect(body.ok).toBe(false);
    expect(body.message).toBe('Invalid API key');
  });

  it('accepts valid API key', async () => {
    const key = 'valid-test-key';
    await seedApiKey(env.DB, key, ['*']);

    const resp = await app.request('/events', { headers: { 'X-API-Key': key } }, env);
    expect(resp.status).toBe(200);

    const body = await resp.json();
    expect(body.ok).toBe(true);
  });

  it('rejects deactivated API key', async () => {
    const key = 'deactivated-key';
    const keyId = await seedApiKey(env.DB, key, ['*']);

    // Deactivate the key
    await env.DB.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?').bind(keyId).run();

    const resp = await app.request('/events', { headers: { 'X-API-Key': key } }, env);
    expect(resp.status).toBe(401);
  });
});

describe('Scope checking', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await cleanTables(env.DB);
  });

  it('allows wildcard scope', async () => {
    const key = 'wildcard-key';
    await seedApiKey(env.DB, key, ['*']);

    const resp = await app.request(
      '/events',
      {
        method: 'POST',
        headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', source: 'test' }),
      },
      env,
    );
    expect(resp.status).toBe(201);
  });

  it('allows matching scope', async () => {
    const key = 'read-only-key';
    await seedApiKey(env.DB, key, ['events.read']);

    const resp = await app.request('/events', { headers: { 'X-API-Key': key } }, env);
    expect(resp.status).toBe(200);
  });

  it('rejects missing scope', async () => {
    const key = 'read-only-key';
    await seedApiKey(env.DB, key, ['events.read']);

    const resp = await app.request(
      '/events',
      {
        method: 'POST',
        headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', source: 'test' }),
      },
      env,
    );
    expect(resp.status).toBe(403);

    const body = await resp.json();
    expect(body.message).toContain('Missing scope');
  });
});
