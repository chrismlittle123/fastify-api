import { describe, it, expect, afterEach } from 'vitest';
import { createApp, type App } from '../src/index.js';

describe('createApp', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('should create an app with valid config', async () => {
    app = await createApp({
      name: 'test-app',
    });

    expect(app).toBeDefined();
    expect(app.config.name).toBe('test-app');
  });

  it('should apply default server config', async () => {
    app = await createApp({
      name: 'test-app',
    });

    expect(app.config.server.port).toBe(3000);
    expect(app.config.server.host).toBe('0.0.0.0');
  });

  it('should allow custom server config', async () => {
    app = await createApp({
      name: 'test-app',
      server: {
        port: 8080,
        host: '127.0.0.1',
      },
    });

    expect(app.config.server.port).toBe(8080);
    expect(app.config.server.host).toBe('127.0.0.1');
  });

  it('should reject invalid config', async () => {
    await expect(
      createApp({
        name: '', // Empty name should fail
      })
    ).rejects.toThrow();
  });

  it('should have start and shutdown methods', async () => {
    app = await createApp({
      name: 'test-app',
    });

    expect(typeof app.start).toBe('function');
    expect(typeof app.shutdown).toBe('function');
  });
});
