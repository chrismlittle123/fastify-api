import { describe, it, expect, afterEach } from 'vitest';
import { createApp, type App } from '../src/index.js';

describe('fastify-sensible integration', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('should have httpErrors available', async () => {
    app = await createApp({
      name: 'test-app',
      logging: { level: 'error' },
    });

    expect(app.httpErrors).toBeDefined();
    expect(typeof app.httpErrors.notFound).toBe('function');
    expect(typeof app.httpErrors.badRequest).toBe('function');
    expect(typeof app.httpErrors.unauthorized).toBe('function');
  });

  it('should handle thrown httpErrors correctly', async () => {
    app = await createApp({
      name: 'test-app',
      logging: { level: 'error' },
    });

    app.get('/test-error', async () => {
      throw app!.httpErrors.notFound('Resource not found');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Resource not found');
  });

  it('should handle badRequest error', async () => {
    app = await createApp({
      name: 'test-app',
      logging: { level: 'error' },
    });

    app.post('/test-validation', async () => {
      throw app!.httpErrors.badRequest('Invalid input');
    });

    const response = await app.inject({
      method: 'POST',
      url: '/test-validation',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Invalid input');
  });
});
