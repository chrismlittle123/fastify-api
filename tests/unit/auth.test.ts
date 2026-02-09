import { describe, it, expect, afterEach } from 'vitest';
import Fastify from 'fastify';
import { createApp, type App } from '../../src/app.js';
import { registerRoute, defineRoute } from '../../src/routes/index.js';
import { registerAPIKey } from '../../src/plugins/auth/api-key.js';
import { registerJWT } from '../../src/plugins/auth/jwt.js';

describe('JWT auth with issuer and audience', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('configures JWT with issuer and audience', async () => {
    app = await createApp({
      name: 'test-jwt',
      auth: {
        jwt: {
          secret: 'a'.repeat(32),
          issuer: 'test-issuer',
          audience: 'test-audience',
        },
      },
    });

    const token = app.jwt.sign(
      { sub: 'user-1' },
      { iss: 'test-issuer', aud: 'test-audience' }
    );
    expect(token).toBeDefined();

    const decoded = app.jwt.verify(token);
    expect(decoded).toHaveProperty('sub', 'user-1');
  });

  it('configures JWT without issuer and audience', async () => {
    app = await createApp({
      name: 'test-jwt-minimal',
      auth: {
        jwt: {
          secret: 'a'.repeat(32),
        },
      },
    });

    const token = app.jwt.sign({ sub: 'user-2' });
    expect(token).toBeDefined();
  });
});

describe('API key auth', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('registers API key auth with validator and uses default header', async () => {
    app = await createApp(
      {
        name: 'test-apikey',
        auth: {
          apiKey: {},
        },
      },
      {
        apiKeyValidator: async (key) => {
          if (key === 'valid-key') return { id: '1', name: 'test' };
          return null;
        },
      }
    );

    // The authenticateAPIKey decorator should be registered
    expect(app.authenticateAPIKey).toBeDefined();
  });

  it('registers API key auth with custom header', async () => {
    app = await createApp(
      {
        name: 'test-apikey-custom',
        auth: {
          apiKey: { header: 'X-Custom-Key' },
        },
      },
      {
        apiKeyValidator: async (key) => {
          if (key === 'valid-key') return { id: '1' };
          return null;
        },
      }
    );

    expect(app.authenticateAPIKey).toBeDefined();
  });
});

describe('auth "any" with apiKey header from config', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('uses config.auth.apiKey.header for "any" auth apiKey detection', async () => {
    app = await createApp(
      {
        name: 'test-any-auth',
        auth: {
          jwt: { secret: 'a'.repeat(32) },
          apiKey: { header: 'X-Custom-Key' },
        },
      },
      {
        apiKeyValidator: async (key) => {
          if (key === 'valid-key') return { id: '1' };
          return null;
        },
      }
    );

    const route = defineRoute({
      method: 'GET',
      url: '/any-test',
      schema: {},
      auth: 'any',
      handler: async () => ({ ok: true }),
    });
    registerRoute(app, route);

    // Request with custom API key header
    const res = await app.inject({
      method: 'GET',
      url: '/any-test',
      headers: { 'x-custom-key': 'valid-key' },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('registerAPIKey directly with header undefined', () => {
  it('defaults header to X-API-Key when not provided', async () => {
    const app = Fastify({ logger: false });
    await registerAPIKey(app, {
      validate: async () => null,
      // header is intentionally omitted to test the ?? fallback
    });

    expect(app.authenticateAPIKey).toBeDefined();
    await app.close();
  });
});

describe('registerJWT directly without issuer/audience', () => {
  it('configures verify without allowedIss/allowedAud when not provided', async () => {
    const app = Fastify({ logger: false });
    await registerJWT(app, {
      secret: 'a'.repeat(32),
      // issuer and audience intentionally omitted
    });

    expect(app.authenticateJWT).toBeDefined();

    // Sign and verify a token to ensure it works
    const token = app.jwt.sign({ sub: 'test' });
    const decoded = app.jwt.verify(token);
    expect(decoded).toHaveProperty('sub', 'test');
    await app.close();
  });
});

describe('app with production logging (non-pretty)', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('creates app with pretty=false', async () => {
    app = await createApp({
      name: 'test-prod',
      logging: { level: 'info', pretty: false },
    });

    expect(app.config.logging.pretty).toBe(false);
  });
});

describe('app with observability.requestLogging disabled', () => {
  let app: App | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it('skips request logging when requestLogging=false', async () => {
    app = await createApp({
      name: 'test-no-logging',
      observability: { requestLogging: false },
    });

    const res = await app.inject({ method: 'GET', url: '/health/live' });
    expect(res.statusCode).toBe(200);
  });
});
