import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerOpenAPI } from '../../src/plugins/openapi.js';
import type { AppConfig } from '../../src/config/index.js';

const baseConfig: AppConfig = {
  name: 'test-app',
  server: { port: 3000, host: '0.0.0.0' },
  logging: { level: 'info', pretty: false },
};

describe('registerOpenAPI', () => {
  it('returns early when openapi is undefined (no swagger routes registered)', async () => {
    const app = Fastify({ logger: false });
    await registerOpenAPI(app, baseConfig, undefined);
    await app.ready();

    // /openapi.json should NOT exist
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(res.statusCode).toBe(404);
  });

  it('uses description fallback when not provided', async () => {
    const app = Fastify({ logger: false });
    await registerOpenAPI(app, baseConfig, {
      title: 'My API',
      version: '2.0.0',
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.info.description).toBe('API documentation for test-app');
  });

  it('uses provided description', async () => {
    const app = Fastify({ logger: false });
    await registerOpenAPI(app, baseConfig, {
      title: 'My API',
      description: 'Custom description',
      version: '1.0.0',
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/openapi.json' });
    const body = res.json();
    expect(body.info.description).toBe('Custom description');
  });

  it('registers docs at custom docsPath', async () => {
    const app = Fastify({ logger: false });
    await registerOpenAPI(app, baseConfig, {
      title: 'My API',
      version: '1.0.0',
      docsPath: '/api-docs',
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/api-docs' });
    // Scalar redirects to /api-docs/ with trailing slash
    expect([200, 301]).toContain(res.statusCode);
  });

  it('registers docs at default /docs path', async () => {
    const app = Fastify({ logger: false });
    await registerOpenAPI(app, baseConfig, {
      title: 'My API',
      version: '1.0.0',
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/docs' });
    // Scalar redirects to /docs/ with trailing slash
    expect([200, 301]).toContain(res.statusCode);
  });
});
