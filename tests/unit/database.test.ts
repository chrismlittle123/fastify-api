import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock postgres before importing the module under test
const mockSqlTemplate = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
const mockEnd = vi.fn().mockResolvedValue(undefined);

// Create a callable function that also has .end
const mockSql = Object.assign(mockSqlTemplate, { end: mockEnd });

vi.mock('postgres', () => ({
  default: vi.fn(() => mockSql),
}));

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({ mock: 'drizzle-instance' })),
}));

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createDatabase } from '../../src/db/client.js';

describe('createDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns drizzle, ping, and close', () => {
    const db = createDatabase({
      connectionString: 'postgres://localhost:5432/test',
      poolSize: 10,
      idleTimeout: 30,
    });

    expect(db).toHaveProperty('drizzle');
    expect(db).toHaveProperty('ping');
    expect(db).toHaveProperty('close');
  });

  it('passes connectionString, poolSize and idleTimeout to postgres', () => {
    createDatabase({
      connectionString: 'postgres://localhost:5432/test',
      poolSize: 20,
      idleTimeout: 60,
    });

    expect(postgres).toHaveBeenCalledWith('postgres://localhost:5432/test', {
      max: 20,
      idle_timeout: 60,
    });
  });

  it('passes sql client to drizzle', () => {
    createDatabase({
      connectionString: 'postgres://localhost:5432/test',
      poolSize: 10,
      idleTimeout: 30,
    });

    expect(drizzle).toHaveBeenCalledWith(mockSql);
  });

  it('ping calls sql template literal', async () => {
    const db = createDatabase({
      connectionString: 'postgres://localhost:5432/test',
      poolSize: 10,
      idleTimeout: 30,
    });

    await db.ping();
    expect(mockSqlTemplate).toHaveBeenCalled();
  });

  it('close calls sql.end with timeout 5', async () => {
    const db = createDatabase({
      connectionString: 'postgres://localhost:5432/test',
      poolSize: 10,
      idleTimeout: 30,
    });

    await db.close();
    expect(mockEnd).toHaveBeenCalledWith({ timeout: 5 });
  });
});
