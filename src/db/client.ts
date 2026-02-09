import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { AppConfig } from '../config/index.js';

export interface Database {
  /** Drizzle ORM instance — use this for all database queries */
  drizzle: PostgresJsDatabase;
  /** Check database connectivity (runs SELECT 1) */
  ping: () => Promise<void>;
  /** Gracefully close the database connection */
  close: () => Promise<void>;
}

export interface DatabaseOptions {
  connectionString: string;
  poolSize?: number;
  idleTimeout?: number;
}

export function createDatabase(options: NonNullable<AppConfig['db']>): Database {
  const sql = postgres(options.connectionString, {
    max: options.poolSize,
    idle_timeout: options.idleTimeout,
  });

  const db = drizzle(sql);

  return {
    drizzle: db,
    ping: async () => {
      await sql`SELECT 1`;
    },
    close: async () => {
      await sql.end({ timeout: 5 });
    },
  };
}
