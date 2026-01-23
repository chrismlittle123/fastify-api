/**
 * E2E tests for all HTTP methods
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, type TestContext } from './setup.js';
import { z } from '../../src/index.js';
import { registerRoute, defineRoute } from '../../src/routes/index.js';

describe('E2E: HTTP Methods', () => {
  let ctx: TestContext;

  // In-memory store for testing
  const items = new Map<string, { id: string; name: string; updatedAt: string }>();

  beforeAll(async () => {
    ctx = await createTestApp();

    // GET - Read single item
    const getRoute = defineRoute({
      method: 'GET',
      url: '/test/items/:id',
      auth: 'public',
      schema: {
        params: z.object({
          id: z.string(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            updatedAt: z.string(),
          }),
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      handler: async (request, reply) => {
        const item = items.get(request.params.id);
        if (!item) {
          throw reply.server.httpErrors.notFound(`Item ${request.params.id} not found`);
        }
        return item;
      },
    });
    registerRoute(ctx.app, getRoute);

    // POST - Create item
    const postRoute = defineRoute({
      method: 'POST',
      url: '/test/items',
      auth: 'public',
      schema: {
        body: z.object({
          name: z.string().min(1),
        }),
        response: {
          201: z.object({
            id: z.string(),
            name: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
      handler: async (request, reply) => {
        const id = `item-${Date.now()}`;
        const item = {
          id,
          name: request.body.name,
          updatedAt: new Date().toISOString(),
        };
        items.set(id, item);
        reply.status(201);
        return item;
      },
    });
    registerRoute(ctx.app, postRoute);

    // PUT - Replace item
    const putRoute = defineRoute({
      method: 'PUT',
      url: '/test/items/:id',
      auth: 'public',
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          name: z.string().min(1),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            updatedAt: z.string(),
          }),
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      handler: async (request, reply) => {
        if (!items.has(request.params.id)) {
          throw reply.server.httpErrors.notFound(`Item ${request.params.id} not found`);
        }
        const item = {
          id: request.params.id,
          name: request.body.name,
          updatedAt: new Date().toISOString(),
        };
        items.set(request.params.id, item);
        return item;
      },
    });
    registerRoute(ctx.app, putRoute);

    // PATCH - Partial update
    const patchRoute = defineRoute({
      method: 'PATCH',
      url: '/test/items/:id',
      auth: 'public',
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          name: z.string().min(1).optional(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            updatedAt: z.string(),
          }),
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      handler: async (request, reply) => {
        const existing = items.get(request.params.id);
        if (!existing) {
          throw reply.server.httpErrors.notFound(`Item ${request.params.id} not found`);
        }
        const item = {
          ...existing,
          ...(request.body.name && { name: request.body.name }),
          updatedAt: new Date().toISOString(),
        };
        items.set(request.params.id, item);
        return item;
      },
    });
    registerRoute(ctx.app, patchRoute);

    // DELETE - Remove item
    const deleteRoute = defineRoute({
      method: 'DELETE',
      url: '/test/items/:id',
      auth: 'public',
      schema: {
        params: z.object({
          id: z.string(),
        }),
        response: {
          204: z.undefined(),
          404: z.object({
            statusCode: z.number(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      handler: async (request, reply) => {
        if (!items.has(request.params.id)) {
          throw reply.server.httpErrors.notFound(`Item ${request.params.id} not found`);
        }
        items.delete(request.params.id);
        reply.status(204);
        return;
      },
    });
    registerRoute(ctx.app, deleteRoute);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('CRUD Operations', () => {
    let createdItemId: string;

    it('POST - should create a new item', async () => {
      const response = await ctx.app.inject({
        method: 'POST',
        url: '/test/items',
        headers: { 'Content-Type': 'application/json' },
        payload: { name: 'Test Item' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Test Item');
      expect(body.updatedAt).toBeDefined();
      createdItemId = body.id;
    });

    it('GET - should retrieve the created item', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: `/test/items/${createdItemId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(createdItemId);
      expect(body.name).toBe('Test Item');
    });

    it('PUT - should replace the item', async () => {
      const response = await ctx.app.inject({
        method: 'PUT',
        url: `/test/items/${createdItemId}`,
        headers: { 'Content-Type': 'application/json' },
        payload: { name: 'Replaced Item' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Replaced Item');
    });

    it('PATCH - should partially update the item', async () => {
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: `/test/items/${createdItemId}`,
        headers: { 'Content-Type': 'application/json' },
        payload: { name: 'Patched Item' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Patched Item');
    });

    it('DELETE - should remove the item', async () => {
      const response = await ctx.app.inject({
        method: 'DELETE',
        url: `/test/items/${createdItemId}`,
      });

      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');
    });

    it('GET - should return 404 for deleted item', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: `/test/items/${createdItemId}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Not Found Cases', () => {
    it('GET - should return 404 for non-existent item', async () => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/test/items/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });

    it('PUT - should return 404 for non-existent item', async () => {
      const response = await ctx.app.inject({
        method: 'PUT',
        url: '/test/items/non-existent-id',
        headers: { 'Content-Type': 'application/json' },
        payload: { name: 'Test' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('PATCH - should return 404 for non-existent item', async () => {
      const response = await ctx.app.inject({
        method: 'PATCH',
        url: '/test/items/non-existent-id',
        headers: { 'Content-Type': 'application/json' },
        payload: { name: 'Test' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('DELETE - should return 404 for non-existent item', async () => {
      const response = await ctx.app.inject({
        method: 'DELETE',
        url: '/test/items/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
