import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerHealthCheck } from '../../src/plugins/health.js';

function createApp(db?: { ping: () => Promise<void> }) {
  const app = Fastify({ logger: false });
  if (db) {
    app.decorate('db', db);
  }
  return app;
}

describe('registerHealthCheck', () => {
  describe('/health', () => {
    it('returns healthy when db ping succeeds', async () => {
      const app = createApp({ ping: vi.fn().mockResolvedValue(undefined) });
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health' });
      const body = res.json();

      expect(res.statusCode).toBe(200);
      expect(body.status).toBe('healthy');
      expect(body.checks.database.status).toBe('healthy');
      expect(body.checks.database).toHaveProperty('latencyMs');
    });

    it('returns unhealthy when db ping throws Error', async () => {
      const app = createApp({
        ping: vi.fn().mockRejectedValue(new Error('connection refused')),
      });
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health' });
      const body = res.json();

      expect(body.status).toBe('unhealthy');
      expect(body.checks.database.status).toBe('unhealthy');
      expect(body.checks.database.error).toBe('connection refused');
    });

    it('returns "Unknown error" when db throws non-Error', async () => {
      const app = createApp({
        ping: vi.fn().mockRejectedValue('string-error'),
      });
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health' });
      const body = res.json();

      expect(body.checks.database.error).toBe('Unknown error');
    });

    it('returns healthy with no db checks when db not configured', async () => {
      const app = createApp();
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health' });
      const body = res.json();

      expect(body.status).toBe('healthy');
      expect(body.checks).toEqual({});
    });

    it('includes timestamp and uptime', async () => {
      const app = createApp();
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health' });
      const body = res.json();

      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
    });
  });

  describe('/health/live', () => {
    it('returns ok', async () => {
      const app = createApp();
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health/live' });
      expect(res.json()).toEqual({ status: 'ok' });
    });
  });

  describe('/health/ready', () => {
    it('returns ready when db ping succeeds', async () => {
      const app = createApp({ ping: vi.fn().mockResolvedValue(undefined) });
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ready' });
    });

    it('returns 503 when db ping fails', async () => {
      const app = createApp({
        ping: vi.fn().mockRejectedValue(new Error('down')),
      });
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toEqual({ status: 'not ready', reason: 'database unavailable' });
    });

    it('returns ready when no db configured', async () => {
      const app = createApp();
      await registerHealthCheck(app);

      const res = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ready' });
    });
  });
});
