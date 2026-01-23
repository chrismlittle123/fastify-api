import { describe, it, expect, afterEach } from 'vitest';
import { createApp, type App } from '../src/index.js';

describe('health endpoints', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('should respond to /health', async () => {
    app = await createApp({
      name: 'test-app',
      logging: { level: 'error' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
    expect(typeof body.uptime).toBe('number');
  });

  it('should respond to /health/live', async () => {
    app = await createApp({
      name: 'test-app',
      logging: { level: 'error' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('should respond to /health/ready without db', async () => {
    app = await createApp({
      name: 'test-app',
      logging: { level: 'error' },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ready' });
  });
});
