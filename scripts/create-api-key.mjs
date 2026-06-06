#!/usr/bin/env node
/**
 * Usage: node scripts/create-api-key.mjs <label>
 *
 * Generates a new API key, stores the SHA-256 hash in the database, and prints
 * the plaintext key to stdout. The plaintext is never stored — save it now.
 */
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
try {
  const envPath = resolve(__dirname, '../.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // no .env file — rely on environment variables
}

const label = process.argv[2];
if (!label) {
  console.error('Usage: node scripts/create-api-key.mjs <label>');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const rawKey = randomBytes(32).toString('hex');
const keyHash = createHash('sha256').update(rawKey).digest('hex');
const { Pool } = pg;
const pool = new Pool({ connectionString });

try {
  await pool.query(
    `INSERT INTO api_keys (id, key_hash, label, active, created_at)
     VALUES (gen_random_uuid(), $1, $2, true, now())`,
    [keyHash, label],
  );

  console.log(`\nAPI key created for: ${label}`);
  console.log(`\n  cvf_${rawKey}\n`);
  console.log('This key will not be shown again. Store it securely.\n');
} finally {
  await pool.end();
}
