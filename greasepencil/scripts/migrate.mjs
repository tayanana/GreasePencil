import { migrateDatabaseUrl } from '../backend/src/migrate.js';

const url = process.env.DATABASE_URL?.trim() ?? '';
try {
  await migrateDatabaseUrl(url);
} catch (error) {
  const message = String(error?.message || error).replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://redacted');
  console.error('migrate: failed', message);
  process.exit(1);
}
