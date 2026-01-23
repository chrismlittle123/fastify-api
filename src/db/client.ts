import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import type { AppConfig } from '../config/index.js';

export interface Database {
  drizzle: PostgresJsDatabase;
  sql: Sql;
  /**
   * Execute a raw SQL query. Use with caution!
   *
   * WARNING: This method uses sql.unsafe() and does NOT sanitize input.
   * Never pass user input directly. Always use parameterized queries via Drizzle ORM.
   *
   * Safe for: Health checks, migrations, admin tools
   * Unsafe for: Any query containing user-provided data
   *
   * @example
   * // SAFE - no user input
   * await db.query('SELECT 1');
   *
   * // UNSAFE - SQL injection vulnerability!
   * await db.query(`SELECT * FROM users WHERE id = ${userId}`);
   *
   * // USE DRIZZLE INSTEAD for user data
   * await db.drizzle.select().from(users).where(eq(users.id, userId));
   */
  query: (query: string) => Promise<unknown>;
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
    sql,
    query: async (query: string) => sql.unsafe(query),
  };
}

export async function closeDatabase(db: Database): Promise<void> {
  // Gracefully close with timeout to allow in-flight queries to complete
  await db.sql.end({ timeout: 5 });
}
