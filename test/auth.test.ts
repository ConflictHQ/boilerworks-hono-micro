import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { resetRateLimitStore } from '../src/middleware/rate-limit';
import { applyMigrations, seedApiKey, cleanTables } from './helpers';

describe('API Key Authentication', () => {
  beforeEach(async () => {
    resetRateLimitStore();
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
    resetRateLimitStore();
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

describe('Key revocation', () => {
  beforeEach(async () => {
    resetRateLimitStore();
    await applyMigrations(env.DB);
    await cleanTables(env.DB);
  });

  it('rejects a revoked API key via the DELETE endpoint', async () => {
    // Create an admin key to manage other keys
    const adminKey = 'admin-key-for-revoke';
    await seedApiKey(env.DB, adminKey, ['*'], 'admin');

    // Create a second key via the API
    const createResp = await app.request(
      '/api-keys',
      {
        method: 'POST',
        headers: { 'X-API-Key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ephemeral-key', scopes: ['events.read'] }),
      },
      env,
    );
    expect(createResp.status).toBe(201);
    const createBody = await createResp.json();
    const ephemeralKey = createBody.data.key;
    const ephemeralId = createBody.data.id;

    // Verify the new key works
    const verifyResp = await app.request(
      '/events',
      { headers: { 'X-API-Key': ephemeralKey } },
      env,
    );
    expect(verifyResp.status).toBe(200);

    // Revoke the key
    const revokeResp = await app.request(
      `/api-keys/${ephemeralId}`,
      { method: 'DELETE', headers: { 'X-API-Key': adminKey } },
      env,
    );
    expect(revokeResp.status).toBe(200);

    // Verify the revoked key is rejected
    const rejectedResp = await app.request(
      '/events',
      { headers: { 'X-API-Key': ephemeralKey } },
      env,
    );
    expect(rejectedResp.status).toBe(401);

    const rejectedBody = await rejectedResp.json();
    expect(rejectedBody.ok).toBe(false);
    expect(rejectedBody.message).toBe('Invalid API key');
  });
});
