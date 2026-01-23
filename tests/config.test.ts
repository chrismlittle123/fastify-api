import { describe, it, expect } from 'vitest';
import { appConfigSchema } from '../src/index.js';

describe('appConfigSchema', () => {
  it('should parse minimal valid config', () => {
    const result = appConfigSchema.parse({
      name: 'my-app',
    });

    expect(result.name).toBe('my-app');
    expect(result.server.port).toBe(3000);
    expect(result.server.host).toBe('0.0.0.0');
    expect(result.db).toBeUndefined();
  });

  it('should parse config with database', () => {
    const result = appConfigSchema.parse({
      name: 'my-app',
      db: {
        connectionString: 'postgres://localhost:5432/test',
      },
    });

    expect(result.db?.connectionString).toBe('postgres://localhost:5432/test');
    expect(result.db?.poolSize).toBe(10);
    expect(result.db?.idleTimeout).toBe(30);
  });

  it('should reject empty name', () => {
    expect(() =>
      appConfigSchema.parse({
        name: '',
      })
    ).toThrow();
  });

  it('should reject invalid database URL', () => {
    expect(() =>
      appConfigSchema.parse({
        name: 'my-app',
        db: {
          connectionString: 'not-a-url',
        },
      })
    ).toThrow();
  });

  it('should apply logging defaults', () => {
    const result = appConfigSchema.parse({
      name: 'my-app',
    });

    expect(result.logging.level).toBe('info');
  });

  it('should allow custom logging level', () => {
    const result = appConfigSchema.parse({
      name: 'my-app',
      logging: {
        level: 'debug',
      },
    });

    expect(result.logging.level).toBe('debug');
  });
});
