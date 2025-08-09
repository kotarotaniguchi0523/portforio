import 'dotenv/config';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// This migration script is intended to be run from the command line.
// It connects to the database, applies any pending migrations,
// and then exits.

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

try {
  console.log('Connecting to database...');
  const sqlite = new Database(process.env.DATABASE_URL);
  const db = drizzle(sqlite);

  console.log('Running database migrations...');
  migrate(db, { migrationsFolder: 'drizzle' });

  console.log('Migrations applied successfully.');
  sqlite.close();
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
