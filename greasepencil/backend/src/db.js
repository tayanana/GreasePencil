import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { applyMigrations } from './migrate.js';

const databaseUrl = () => process.env.DATABASE_URL?.trim() ?? '';

let singleton;

export async function getDb() {
  if (!singleton) singleton = await openDatabase();
  return singleton;
}

export async function closeDb() {
  if (!singleton) return;
  const current = singleton;
  singleton = undefined;
  await current.close();
}

async function openDatabase() {
  const url = databaseUrl();
  const adapter = url ? await openPostgres(url) : await openPglite();
  await applyMigrations(adapter);
  return adapter;
}

async function openPostgres(url) {
  const pool = new pg.Pool({ connectionString: url, max: 5 });
  return {
    kind: 'postgres',
    async query(text, params = []) {
      const result = await pool.query(text, params);
      return result.rows;
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const value = await fn(clientAdapter(client));
        await client.query('commit');
        return value;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

function clientAdapter(client) {
  return {
    async query(text, params = []) {
      const result = await client.query(text, params);
      return result.rows;
    },
    async exec(sql) {
      await client.query(sql);
    },
  };
}

async function openPglite() {
  const dataDir = process.env.DATA_DIR?.trim() ?? '';
  const pglite = !dataDir || dataDir === 'memory' ? new PGlite() : new PGlite(ensureDir(dataDir));
  await pglite.waitReady;
  return {
    kind: 'pglite',
    async query(text, params = []) {
      const result = await pglite.query(text, params);
      return result.rows;
    },
    async exec(sql) {
      await pglite.exec(sql);
    },
    async transaction(fn) {
      return pglite.transaction(async (tx) => fn({
        async query(text, params = []) {
          const result = await tx.query(text, params);
          return result.rows;
        },
        async exec(sql) {
          await tx.exec(sql);
        },
      }));
    },
    async close() {
      await pglite.close();
    },
  };
}

function ensureDir(dataDir) {
  const resolved = path.resolve(dataDir);
  mkdirSync(resolved, { recursive: true });
  return resolved;
}
