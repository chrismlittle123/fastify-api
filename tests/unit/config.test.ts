import { describe, it, expect } from 'vitest';
import { appConfigSchema } from '../../src/config/schema.js';

describe('appConfigSchema edge cases', () => {
  const base = { name: 'app' };

  describe('server.port', () => {
    it('accepts 0 (random port)', () => {
      const result = appConfigSchema.parse({ ...base, server: { port: 0 } });
      expect(result.server.port).toBe(0);
    });

    it('rejects negative port', () => {
      expect(() => appConfigSchema.parse({ ...base, server: { port: -1 } })).toThrow();
    });

    it('rejects non-integer port', () => {
      expect(() => appConfigSchema.parse({ ...base, server: { port: 3.5 } })).toThrow();
    });
  });

  describe('auth.jwt.secret', () => {
    it('rejects secret shorter than 32 characters', () => {
      expect(() =>
        appConfigSchema.parse({ ...base, auth: { jwt: { secret: 'short' } } })
      ).toThrow();
    });

    it('accepts 32-char secret', () => {
      const secret = 'a'.repeat(32);
      const result = appConfigSchema.parse({ ...base, auth: { jwt: { secret } } });
      expect(result.auth?.jwt?.secret).toBe(secret);
    });
  });

  describe('db.poolSize', () => {
    it('rejects 0', () => {
      expect(() =>
        appConfigSchema.parse({
          ...base,
          db: { connectionString: 'postgres://localhost:5432/test', poolSize: 0 },
        })
      ).toThrow();
    });

    it('rejects negative', () => {
      expect(() =>
        appConfigSchema.parse({
          ...base,
          db: { connectionString: 'postgres://localhost:5432/test', poolSize: -1 },
        })
      ).toThrow();
    });
  });

  describe('auth.apiKey.header', () => {
    it('defaults to X-API-Key', () => {
      const result = appConfigSchema.parse({ ...base, auth: { apiKey: {} } });
      expect(result.auth?.apiKey?.header).toBe('X-API-Key');
    });
  });

  describe('docs defaults', () => {
    it('defaults version to 1.0.0', () => {
      const result = appConfigSchema.parse({ ...base, docs: { title: 'API' } });
      expect(result.docs?.version).toBe('1.0.0');
    });

    it('defaults path to /docs', () => {
      const result = appConfigSchema.parse({ ...base, docs: { title: 'API' } });
      expect(result.docs?.path).toBe('/docs');
    });
  });

  describe('logging.level', () => {
    it.each(['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const)(
      'accepts %s',
      (level) => {
        const result = appConfigSchema.parse({ ...base, logging: { level } });
        expect(result.logging.level).toBe(level);
      }
    );

    it('rejects invalid level', () => {
      expect(() =>
        appConfigSchema.parse({ ...base, logging: { level: 'verbose' } })
      ).toThrow();
    });
  });

  describe('observability', () => {
    it('rejects invalid otlpEndpoint URL', () => {
      expect(() =>
        appConfigSchema.parse({ ...base, observability: { otlpEndpoint: 'not-a-url' } })
      ).toThrow();
    });

    it('accepts valid otlpEndpoint URL', () => {
      const result = appConfigSchema.parse({
        ...base,
        observability: { otlpEndpoint: 'http://signoz:4318' },
      });
      expect(result.observability?.otlpEndpoint).toBe('http://signoz:4318');
    });

    it('accepts attributes record', () => {
      const result = appConfigSchema.parse({
        ...base,
        observability: { attributes: { env: 'prod' } },
      });
      expect(result.observability?.attributes).toEqual({ env: 'prod' });
    });

    it('defaults requestLogging to true', () => {
      const result = appConfigSchema.parse({ ...base, observability: {} });
      expect(result.observability?.requestLogging).toBe(true);
    });
  });
});
