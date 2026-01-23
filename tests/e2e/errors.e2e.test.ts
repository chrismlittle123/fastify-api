/**
 * E2E tests for error handling and httpErrors
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, type TestContext } from './setup.js';
import { z } from '../../src/index.js';
import { registerRoute, defineRoute } from '../../src/routes/index.js';

describe('E2E: Error Handling', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Routes that throw various errors
    const notFoundRoute = defineRoute({
      method: 'GET',
      url: '/test/errors/not-found',
      auth: 'public',
      schema: {
        response: {
          404: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
        },
      },
      handler: async (request, reply) => {
        throw reply.server.httpErrors.notFound('Resource not found');
      },
    });
    registerRoute(ctx.app, notFoundRoute);

    const badRequestRoute = defineRoute({
      method: 'GET',
      url: '/test/errors/bad-request',
      auth: 'public',
      schema: {
        response: {
          400: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
        },
      },
      handler: async (request, reply) => {
        throw reply.server.httpErrors.badRequest('Invalid input');
      },
    });
    registerRoute(ctx.app, badRequestRoute);

    const forbiddenRoute = defineRoute({
      method: 'GET',
      url: '/test/errors/forbidden',
      auth: 'public',
      schema: {
        response: {
          403: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
        },
      },
      handler: async (request, reply) => {
        throw reply.server.httpErrors.forbidden('Access denied');
      },
    });
    registerRoute(ctx.app, forbiddenRoute);

    const conflictRoute = defineRoute({
      method: 'POST',
      url: '/test/errors/conflict',
      auth: 'public',
      schema: {
        body: z.object({ id: z.string() }),
        response: {
          409: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
        },
      },
      handler: async (request, reply) => {
        throw reply.server.httpErrors.conflict('Resource already exists');
      },
    });
    registerRoute(ctx.app, conflictRoute);

    const internalErrorRoute = defineRoute({
      method: 'GET',
      url: '/test/errors/internal',
      auth: 'public',
      schema: {
        response: {
          500: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
        },
      },
      handler: async (request, reply) => {
        throw reply.server.httpErrors.internalServerError('Something went wrong');
      },
    });
    registerRoute(ctx.app, internalErrorRoute);

    const serviceUnavailableRoute = defineRoute({
      method: 'GET',
      url: '/test/errors/unavailable',
      auth: 'public',
      schema: {
        response: {
          503: z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
        },
      },
      handler: async (request, reply) => {
        throw reply.server.httpErrors.serviceUnavailable('Service temporarily unavailable');
      },
    });
    registerRoute(ctx.app, serviceUnavailableRoute);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('HTTP Error Responses', () => {
    it('should return 404 Not Found with proper format', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/errors/not-found',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(404);
      expect(body.error).toBe('Not Found');
      expect(body.message).toBe('Resource not found');
    });

    it('should return 400 Bad Request with proper format', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/errors/bad-request',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Invalid input');
    });

    it('should return 403 Forbidden with proper format', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/errors/forbidden',
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(403);
      expect(body.error).toBe('Forbidden');
      expect(body.message).toBe('Access denied');
    });

    it('should return 409 Conflict with proper format', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/test/errors/conflict',
        headers: { 'Content-Type': 'application/json' },
        payload: { id: 'test-123' },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(409);
      expect(body.error).toBe('Conflict');
      expect(body.message).toBe('Resource already exists');
    });

    it('should return 500 Internal Server Error with proper format', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/errors/internal',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(500);
      expect(body.error).toBe('Internal Server Error');
      expect(body.message).toBe('Something went wrong');
    });

    it('should return 503 Service Unavailable with proper format', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/errors/unavailable',
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(503);
      expect(body.error).toBe('Service Unavailable');
      expect(body.message).toBe('Service temporarily unavailable');
    });
  });

  describe('Non-existent Routes', () => {
    it('should return 404 for non-existent route', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/this-route-does-not-exist',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Malformed Requests', () => {
    it('should return 400 for malformed JSON body', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/test/errors/conflict',
        headers: { 'Content-Type': 'application/json' },
        payload: '{ invalid json }',
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
