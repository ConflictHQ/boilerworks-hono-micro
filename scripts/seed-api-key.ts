/**
 * Seed script for local development.
 *
 * Usage:
 *   pnpm db:migrate:local
 *   pnpm seed
 *
 * Generates a plaintext API key, hashes it, and inserts into the local D1 database.
 * The plaintext key is printed to stdout -- store it securely.
 */

import { execSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

const name = process.argv[2] || 'dev-admin';
const scopes = process.argv[3] ? JSON.parse(process.argv[3]) : ['*'];

const plainKey = `bw_${randomUUID().replace(/-/g, '')}`;
const keyHash = createHash('sha256').update(plainKey).digest('hex');
const id = randomUUID();
const now = new Date().toISOString();

const sql = `INSERT INTO api_keys (id, name, key_hash, scopes, is_active, created_at, updated_at) VALUES ('${id}', '${name}', '${keyHash}', '${JSON.stringify(scopes)}', 1, '${now}', '${now}');`;

try {
  execSync(`npx wrangler d1 execute boilerworks-db --local --command="${sql}"`, {
    stdio: 'inherit',
  });
  console.log('\n--- API Key Created ---');
  console.log(`Name:   ${name}`);
  console.log(`Key:    ${plainKey}`);
  console.log(`Scopes: ${JSON.stringify(scopes)}`);
  console.log('\nStore this key securely. It will not be shown again.');
} catch (err) {
  console.error('Failed to seed API key:', err);
  process.exit(1);
}
