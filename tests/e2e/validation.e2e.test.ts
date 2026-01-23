/**
 * E2E tests for Zod schema validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, type TestContext } from './setup.js';
import { z } from '../../src/index.js';
import { registerRoute, defineRoute } from '../../src/routes/index.js';

describe('E2E: Zod Validation', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Route with params validation
    const paramsRoute = defineRoute({
      method: 'GET',
      url: '/test/users/:userId/posts/:postId',
      auth: 'public',
      schema: {
        params: z.object({
          userId: z.string().uuid(),
          postId: z.coerce.number().int().positive(),
        }),
        response: {
          200: z.object({
            userId: z.string(),
            postId: z.number(),
          }),
        },
      },
      handler: async (request) => {
        return {
          userId: request.params.userId,
          postId: request.params.postId,
        };
      },
    });
    registerRoute(ctx.app, paramsRoute);

    // Route with query validation
    const queryRoute = defineRoute({
      method: 'GET',
      url: '/test/search',
      auth: 'public',
      schema: {
        querystring: z.object({
          q: z.string().min(1),
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(10),
          sort: z.enum(['asc', 'desc']).default('asc'),
        }),
        response: {
          200: z.object({
            query: z.string(),
            page: z.number(),
            limit: z.number(),
            sort: z.string(),
          }),
        },
      },
      handler: async (request) => {
        return {
          query: request.query.q,
          page: request.query.page,
          limit: request.query.limit,
          sort: request.query.sort,
        };
      },
    });
    registerRoute(ctx.app, queryRoute);

    // Route with body validation
    const bodyRoute = defineRoute({
      method: 'POST',
      url: '/test/users',
      auth: 'public',
      schema: {
        body: z.object({
          email: z.string().email(),
          name: z.string().min(2).max(100),
          age: z.number().int().min(0).max(150).optional(),
          tags: z.array(z.string()).max(10).default([]),
        }),
        response: {
          201: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string(),
            age: z.number().optional(),
            tags: z.array(z.string()),
          }),
        },
      },
      handler: async (request, reply) => {
        reply.status(201);
        return {
          id: 'user-123',
          email: request.body.email,
          name: request.body.name,
          age: request.body.age,
          tags: request.body.tags,
        };
      },
    });
    registerRoute(ctx.app, bodyRoute);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('Params Validation', () => {
    it('should accept valid params', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/users/550e8400-e29b-41d4-a716-446655440000/posts/42',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(body.postId).toBe(42);
    });

    it('should reject invalid UUID', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/users/not-a-uuid/posts/42',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject negative post ID', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/users/550e8400-e29b-41d4-a716-446655440000/posts/-1',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Query Validation', () => {
    it('should accept valid query params', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/search?q=hello&page=2&limit=20&sort=desc',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.query).toBe('hello');
      expect(body.page).toBe(2);
      expect(body.limit).toBe(20);
      expect(body.sort).toBe('desc');
    });

    it('should apply defaults for optional params', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/search?q=test',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.query).toBe('test');
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
      expect(body.sort).toBe('asc');
    });

    it('should reject missing required query param', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/search',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid enum value', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/search?q=test&sort=invalid',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject limit over max', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/search?q=test&limit=200',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Body Validation', () => {
    it('should accept valid body', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/test/users',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          email: 'test@example.com',
          name: 'John Doe',
          age: 30,
          tags: ['developer', 'designer'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.email).toBe('test@example.com');
      expect(body.name).toBe('John Doe');
      expect(body.age).toBe(30);
      expect(body.tags).toEqual(['developer', 'designer']);
    });

    it('should apply defaults', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/test/users',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          email: 'test@example.com',
          name: 'Jane',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.tags).toEqual([]);
      expect(body.age).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/test/users',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          email: 'not-an-email',
          name: 'John',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject name too short', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/test/users',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          email: 'test@example.com',
          name: 'J',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject too many tags', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/test/users',
        headers: { 'Content-Type': 'application/json' },
        payload: {
          email: 'test@example.com',
          name: 'John',
          tags: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
