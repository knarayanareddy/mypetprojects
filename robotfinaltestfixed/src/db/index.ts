import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Lazy Postgres access.
 *
 * Postgres is only a *backup* of the UI state (localStorage is the source of
 * truth), so nothing here may throw at module scope — `next build` must work
 * with no DATABASE_URL and no running database.
 */
const globalForDb = globalThis as typeof globalThis & {
  __so101Pool?: Pool;
};

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!globalForDb.__so101Pool) {
    globalForDb.__so101Pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 3000 });
  }
  return globalForDb.__so101Pool;
}

export function getDb(): NodePgDatabase {
  return drizzle(getPool());
}
