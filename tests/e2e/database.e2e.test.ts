/**
 * E2E tests for database integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestApp, type TestContext } from './setup.js';
import { AppError } from '../../src/errors/index.js';

describe('E2E: Database Integration', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Add a test route that uses the database via Drizzle ORM
    ctx.app.get('/test/db/time', async () => {
      if (!ctx.app.db) {
        throw AppError.serviceUnavailable('Database not configured');
      }

      const result = await ctx.app.db.drizzle.execute<{ current_time: string }>(sql`SELECT NOW() as current_time`);
      return {
        serverTime: result[0]?.current_time ?? null,
      };
    });

    ctx.app.get('/test/db/version', async () => {
      if (!ctx.app.db) {
        throw AppError.serviceUnavailable('Database not configured');
      }

      const result = await ctx.app.db.drizzle.execute<{ version: string }>(sql`SELECT version()`);
      return {
        version: result[0]?.version ?? null,
      };
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('should connect to database and execute query', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/test/db/time',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.serverTime).toBeDefined();
    // Verify it's a parseable date string
    expect(new Date(body.serverTime).getTime()).not.toBeNaN();
  });

  it('should return PostgreSQL version', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/test/db/version',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.version).toContain('PostgreSQL');
    expect(body.version).toContain('16'); // PostgreSQL 16
  });

  it('should have database available on app instance', () => {
    expect(ctx.app.db).toBeDefined();
    expect(ctx.app.db?.drizzle).toBeDefined();
    expect(typeof ctx.app.db?.ping).toBe('function');
  });
});
