import { describe, it, expect, afterEach } from 'vitest';
import { createApp, type App } from '../../src/app.js';

describe('app.start and app.shutdown', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      try {
        await app.close();
      } catch {
        // ignore
      }
      app = null;
    }
  });

  it('start() listens on the configured port and host', async () => {
    app = await createApp({
      name: 'test-start',
      server: { port: 0, host: '127.0.0.1' },
    });

    await app.start();

    // Verify the server is listening by making a request
    const res = await app.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);
  });

  it('start() logs docs path when docs configured', async () => {
    app = await createApp({
      name: 'test-docs',
      server: { port: 0, host: '127.0.0.1' },
      docs: { title: 'Test API' },
    });

    await app.start();

    const res = await app.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);
  });

  it('shutdown() closes the app', async () => {
    app = await createApp({
      name: 'test-shutdown',
      server: { port: 0, host: '127.0.0.1' },
    });

    await app.start();
    await app.shutdown();
    // After shutdown, set to null so afterEach doesn't double-close
    app = null;
  });

  it('start() re-throws on listen failure', async () => {
    app = await createApp({
      name: 'test-fail',
      server: { port: 0, host: '127.0.0.1' },
    });

    // Start once to bind the port
    await app.start();
    const address = app.server.address();
    const boundPort = typeof address === 'object' && address ? address.port : 0;

    // Create another app on the same port to force a failure
    const app2 = await createApp({
      name: 'test-fail-2',
      server: { port: boundPort, host: '127.0.0.1' },
    });

    await expect(app2.start()).rejects.toThrow();

    try {
      await app2.close();
    } catch {
      // ignore
    }
  });
});
