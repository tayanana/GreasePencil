import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

export async function applyMigrations(db) {
  await db.exec(
    'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())',
  );
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const applied = new Set((await db.query('select name from schema_migrations')).map((row) => row.name));
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await db.exec(sql);
    await db.query('insert into schema_migrations (name) values ($1)', [file]);
    console.log(`migrate: applied ${file}`);
  }
}

/** Build-time migration for the published Postgres database. No-ops when DATABASE_URL is unset. */
export async function migrateDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    console.log('migrate: nothing to do');
    return;
  }
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED?.trim() || databaseUrl,
  });
  await client.connect();
  try {
    await client.query("set lock_timeout = '60s'");
    await client.query('select pg_advisory_lock(7272741)');
    const db = {
      async query(text, params = []) {
        const result = await client.query(text, params);
        return result.rows;
      },
      async exec(sql) {
        await client.query(sql);
      },
    };
    await applyMigrations(db);
  } finally {
    await client.end();
  }
}
