import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { defineRoute, registerRoute, type RouteDefinition } from '../../src/routes/index.js';
import { AppError } from '../../src/errors/index.js';

function createTestApp() {
  const app = Fastify({ logger: false });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('config', { auth: { apiKey: { header: 'X-API-Key' } } });
  return app;
}

describe('defineRoute', () => {
  it('returns the definition unchanged', () => {
    const def: RouteDefinition = {
      method: 'GET',
      url: '/test',
      schema: {},
      handler: async () => ({}),
    };
    expect(defineRoute(def)).toBe(def);
  });
});

describe('registerRoute', () => {
  it('registers a minimal route (no params/body/querystring/tags/summary/description)', async () => {
    const app = createTestApp();
    registerRoute(app, {
      method: 'GET',
      url: '/simple',
      schema: {},
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({ method: 'GET', url: '/simple' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('registers route with full schema (params, body, querystring, tags, summary, description)', async () => {
    const app = createTestApp();
    registerRoute(app, {
      method: 'POST',
      url: '/items/:id',
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
        querystring: z.object({ verbose: z.string().optional() }),
        response: { 200: z.object({ id: z.string(), name: z.string() }) },
      },
      tags: ['items'],
      summary: 'Create item',
      description: 'Creates an item',
      handler: async (request) => ({
        id: request.params.id,
        name: request.body.name,
      }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/items/abc',
      payload: { name: 'Widget' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 'abc', name: 'Widget' });
  });

  it('sets JWT preHandler when authenticateJWT is available', async () => {
    const app = createTestApp();
    const jwtHandler = vi.fn().mockImplementation(async () => {});
    app.decorate('authenticateJWT', jwtHandler);

    registerRoute(app, {
      method: 'GET',
      url: '/protected',
      schema: {},
      auth: 'jwt',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(jwtHandler).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('sets apiKey preHandler when authenticateAPIKey is available', async () => {
    const app = createTestApp();
    const apiKeyHandler = vi.fn().mockImplementation(async () => {});
    app.decorate('authenticateAPIKey', apiKeyHandler);

    registerRoute(app, {
      method: 'GET',
      url: '/protected',
      schema: {},
      auth: 'apiKey',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(apiKeyHandler).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('handles auth "any" with Bearer token', async () => {
    const app = createTestApp();
    const jwtHandler = vi.fn().mockImplementation(async () => {});
    const apiKeyHandler = vi.fn().mockImplementation(async () => {});
    app.decorate('authenticateJWT', jwtHandler);
    app.decorate('authenticateAPIKey', apiKeyHandler);

    registerRoute(app, {
      method: 'GET',
      url: '/any-auth',
      schema: {},
      auth: 'any',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/any-auth',
      headers: { authorization: 'Bearer token123' },
    });
    expect(jwtHandler).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('handles auth "any" with API key header', async () => {
    const app = createTestApp();
    const jwtHandler = vi.fn().mockImplementation(async () => {});
    const apiKeyHandler = vi.fn().mockImplementation(async () => {});
    app.decorate('authenticateJWT', jwtHandler);
    app.decorate('authenticateAPIKey', apiKeyHandler);

    registerRoute(app, {
      method: 'GET',
      url: '/any-auth',
      schema: {},
      auth: 'any',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/any-auth',
      headers: { 'x-api-key': 'key123' },
    });
    expect(apiKeyHandler).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it('auth "any" throws unauthorized when no credentials provided', async () => {
    const app = createTestApp();
    app.decorate('authenticateJWT', vi.fn());
    app.decorate('authenticateAPIKey', vi.fn());

    // Need error handler to serialize AppError
    app.setErrorHandler(async (error, _request, reply) => {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send(error.toJSON());
      }
      return reply.status(500).send({ error: error.message });
    });

    registerRoute(app, {
      method: 'GET',
      url: '/any-auth',
      schema: {},
      auth: 'any',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({ method: 'GET', url: '/any-auth' });
    expect(res.statusCode).toBe(401);
  });

  it('registers public route without auth preHandler', async () => {
    const app = createTestApp();
    registerRoute(app, {
      method: 'GET',
      url: '/public',
      schema: {},
      auth: 'public',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({ method: 'GET', url: '/public' });
    expect(res.statusCode).toBe(200);
  });

  it('jwt auth without authenticateJWT decorator does not set preHandler', async () => {
    const app = createTestApp();

    registerRoute(app, {
      method: 'GET',
      url: '/jwt-no-decorator',
      schema: {},
      auth: 'jwt',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({ method: 'GET', url: '/jwt-no-decorator' });
    expect(res.statusCode).toBe(200);
  });

  it('apiKey auth without authenticateAPIKey decorator does not set preHandler', async () => {
    const app = createTestApp();

    registerRoute(app, {
      method: 'GET',
      url: '/apikey-no-decorator',
      schema: {},
      auth: 'apiKey',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({ method: 'GET', url: '/apikey-no-decorator' });
    expect(res.statusCode).toBe(200);
  });

  it('auth "any" falls back to X-API-Key when config.auth.apiKey is undefined', async () => {
    const app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    // Config without apiKey section — triggers the ?? 'X-API-Key' fallback
    app.decorate('config', { auth: {} });

    const apiKeyHandler = vi.fn().mockImplementation(async () => {});
    app.decorate('authenticateJWT', vi.fn());
    app.decorate('authenticateAPIKey', apiKeyHandler);

    registerRoute(app, {
      method: 'GET',
      url: '/any-fallback',
      schema: {},
      auth: 'any',
      handler: async () => ({ ok: true }),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/any-fallback',
      headers: { 'x-api-key': 'some-key' },
    });
    expect(apiKeyHandler).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});
