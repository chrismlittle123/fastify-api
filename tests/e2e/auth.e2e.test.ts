/**
 * E2E tests for authentication
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, type TestContext, TEST_API_KEYS } from './setup.js';
import { z } from '../../src/index.js';
import { registerRoute, defineRoute } from '../../src/routes/index.js';

describe('E2E: Authentication', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Add test routes for auth testing
    const jwtProtectedRoute = defineRoute({
      method: 'GET',
      url: '/test/jwt-protected',
      auth: 'jwt',
      schema: {
        response: {
          200: z.object({
            message: z.string(),
            user: z.object({
              sub: z.string(),
              email: z.string().optional(),
            }),
          }),
        },
      },
      handler: async (request) => {
        return {
          message: 'JWT auth successful',
          user: {
            sub: request.user.sub,
            email: request.user.email,
          },
        };
      },
    });
    registerRoute(ctx.app, jwtProtectedRoute);

    const apiKeyProtectedRoute = defineRoute({
      method: 'GET',
      url: '/test/apikey-protected',
      auth: 'apiKey',
      schema: {
        response: {
          200: z.object({
            message: z.string(),
            apiKey: z.object({
              id: z.string(),
              name: z.string().optional(),
            }),
          }),
        },
      },
      handler: async (request) => {
        return {
          message: 'API Key auth successful',
          apiKey: {
            id: request.apiKey!.id,
            name: request.apiKey!.name,
          },
        };
      },
    });
    registerRoute(ctx.app, apiKeyProtectedRoute);

    const publicRoute = defineRoute({
      method: 'GET',
      url: '/test/public',
      auth: 'public',
      schema: {
        response: {
          200: z.object({ message: z.string() }),
        },
      },
      handler: async () => {
        return { message: 'Public endpoint' };
      },
    });
    registerRoute(ctx.app, publicRoute);

    // Route that accepts either JWT or API Key
    const anyAuthRoute = defineRoute({
      method: 'GET',
      url: '/test/any-auth',
      auth: 'any',
      schema: {
        response: {
          200: z.object({
            message: z.string(),
            authMethod: z.string(),
          }),
        },
      },
      handler: async (request) => {
        const authMethod = request.user ? 'jwt' : request.apiKey ? 'apiKey' : 'unknown';
        return {
          message: 'Any auth successful',
          authMethod,
        };
      },
    });
    registerRoute(ctx.app, anyAuthRoute);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('JWT Authentication', () => {
    it('should allow access with valid JWT token', async () => {
      const token = await ctx.getAuthToken();

      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/jwt-protected',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('JWT auth successful');
      expect(body.user.sub).toBe('test-user-123');
      expect(body.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/jwt-protected',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/jwt-protected',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('API Key Authentication', () => {
    it('should allow access with valid API key', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/apikey-protected',
        headers: {
          'X-API-Key': 'test-api-key-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('API Key auth successful');
      expect(body.apiKey.id).toBe('key-1');
      expect(body.apiKey.name).toBe('Test Key');
    });

    it('should reject request without API key', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/apikey-protected',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid API key', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/apikey-protected',
        headers: {
          'X-API-Key': 'invalid-key',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Public Endpoints', () => {
    it('should allow access without authentication', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/public',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ message: 'Public endpoint' });
    });
  });

  describe('Any Authentication (JWT or API Key)', () => {
    it('should allow access with valid JWT token', async () => {
      const token = await ctx.getAuthToken();

      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/any-auth',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Any auth successful');
      expect(body.authMethod).toBe('jwt');
    });

    it('should allow access with valid API key', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/any-auth',
        headers: {
          'X-API-Key': 'test-api-key-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Any auth successful');
      expect(body.authMethod).toBe('apiKey');
    });

    it('should reject request without any authentication', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/any-auth',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid JWT token', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/any-auth',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid API key', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/any-auth',
        headers: {
          'X-API-Key': 'invalid-key',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
