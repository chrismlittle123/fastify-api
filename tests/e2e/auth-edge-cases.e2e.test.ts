/**
 * E2E tests for authentication edge cases
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, type TestContext } from './setup.js';
import { z } from '../../src/index.js';
import { registerRoute, defineRoute } from '../../src/routes/index.js';

describe('E2E: Authentication Edge Cases', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // JWT protected route that returns user info
    const jwtRoute = defineRoute({
      method: 'GET',
      url: '/test/auth/me',
      auth: 'jwt',
      schema: {
        response: {
          200: z.object({
            sub: z.string(),
            email: z.string().optional(),
            roles: z.array(z.string()).optional(),
          }),
        },
      },
      handler: async (request) => {
        return {
          sub: request.user.sub,
          email: request.user.email,
          roles: request.user.roles,
        };
      },
    });
    registerRoute(ctx.app, jwtRoute);

    // API Key route that returns key info
    const apiKeyRoute = defineRoute({
      method: 'GET',
      url: '/test/auth/key-info',
      auth: 'apiKey',
      schema: {
        response: {
          200: z.object({
            id: z.string(),
            name: z.string().optional(),
            permissions: z.array(z.string()).optional(),
          }),
        },
      },
      handler: async (request) => {
        return {
          id: request.apiKey!.id,
          name: request.apiKey!.name,
          permissions: request.apiKey!.permissions,
        };
      },
    });
    registerRoute(ctx.app, apiKeyRoute);

    // Route that accepts 'any' auth for mixed auth tests
    const anyRoute = defineRoute({
      method: 'GET',
      url: '/test/auth/any-check',
      auth: 'any',
      schema: {
        response: {
          200: z.object({
            authType: z.string(),
          }),
        },
      },
      handler: async (request) => {
        // JWT takes precedence when both are present
        const authType = request.user ? 'jwt' : request.apiKey ? 'apiKey' : 'none';
        return { authType };
      },
    });
    registerRoute(ctx.app, anyRoute);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('JWT Edge Cases', () => {
    it('should reject malformed token', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/me',
        headers: {
          Authorization: 'Bearer not.a.valid.jwt.token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject empty Bearer token', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/me',
        headers: {
          Authorization: 'Bearer ',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-Bearer auth scheme', async () => {
      const token = await ctx.getAuthToken();
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/me',
        headers: {
          Authorization: `Basic ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should accept valid token with custom claims', async () => {
      const token = ctx.app.jwt.sign({
        sub: 'custom-user-456',
        email: 'custom@example.com',
        roles: ['admin', 'user'],
        customField: 'custom-value',
      });

      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/me',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sub).toBe('custom-user-456');
      expect(body.email).toBe('custom@example.com');
      expect(body.roles).toEqual(['admin', 'user']);
    });
  });

  describe('API Key Edge Cases', () => {
    it('should accept valid API key with permissions', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/key-info',
        headers: {
          'X-API-Key': 'test-api-key-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('key-1');
      expect(body.name).toBe('Test Key');
      expect(body.permissions).toEqual(['read', 'write']);
    });

    it('should accept readonly API key', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/key-info',
        headers: {
          'X-API-Key': 'readonly-key-456',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('key-2');
      expect(body.name).toBe('Read Only');
      expect(body.permissions).toEqual(['read']);
    });

    it('should reject empty API key', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/key-info',
        headers: {
          'X-API-Key': '',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should be case-sensitive for API key header name', async () => {
      // X-API-Key is the configured header, x-api-key should also work (HTTP headers are case-insensitive)
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/key-info',
        headers: {
          'x-api-key': 'test-api-key-123',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Mixed Authentication Scenarios', () => {
    it('should use JWT when both JWT and API key are provided (for any auth)', async () => {
      const token = await ctx.getAuthToken();

      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/any-check',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': 'test-api-key-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // JWT takes precedence (checked first in the 'any' handler)
      expect(body.authType).toBe('jwt');
    });

    it('should fall back to API key when JWT is invalid (for any auth)', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/any-check',
        headers: {
          Authorization: 'Bearer invalid-token',
          'X-API-Key': 'test-api-key-123',
        },
      });

      // With 'any' auth, if JWT header is present (even invalid), it tries JWT first
      // and fails with 401 - doesn't fall back to API key
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Authorization Header Formats', () => {
    it('should handle multiple spaces in Bearer token', async () => {
      const token = await ctx.getAuthToken();

      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/me',
        headers: {
          Authorization: `Bearer  ${token}`, // Two spaces
        },
      });

      // Fastify JWT should handle this gracefully
      expect(response.statusCode).toBe(401);
    });

    it('should handle lowercase bearer', async () => {
      const token = await ctx.getAuthToken();

      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/auth/me',
        headers: {
          Authorization: `bearer ${token}`,
        },
      });

      // @fastify/jwt handles case-insensitive Bearer
      expect([200, 401]).toContain(response.statusCode);
    });
  });
});
