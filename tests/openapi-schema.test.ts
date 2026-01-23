/**
 * Tests for OpenAPI schema extraction
 *
 * Uses the same test setup as e2e tests to ensure consistency.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, type TestContext } from './e2e/setup.js';
import {
  getOpenAPISchema,
  getOpenAPISchemaJSON,
  getOpenAPIPaths,
  defineRoute,
  registerRoute,
  z,
  type OpenAPISchema,
} from '../src/index.js';

describe('OpenAPI Schema Extraction', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Add documented routes for testing schema extraction
    const testRoute = defineRoute({
      method: 'POST',
      url: '/test/schema-test',
      auth: 'jwt',
      tags: ['SchemaTest'],
      summary: 'Test endpoint for schema extraction',
      schema: {
        body: z.object({
          name: z.string(),
        }),
        response: {
          201: z.object({
            id: z.string(),
            name: z.string(),
          }),
        },
      },
      handler: async (req, reply) => {
        reply.status(201);
        return { id: '123', name: req.body.name };
      },
    });
    registerRoute(ctx.app, testRoute);

    await ctx.app.ready();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('getOpenAPISchema', () => {
    it('should return a valid OpenAPI 3.1 schema', async () => {
      const schema = await getOpenAPISchema(ctx.app);

      expect(schema.openapi).toBe('3.1.0');
      expect(schema.info.title).toBe('Test API');
      expect(schema.info.version).toBe('1.0.0');
    });

    it('should include registered paths', async () => {
      const schema = await getOpenAPISchema(ctx.app);

      expect(schema.paths).toBeDefined();
      expect(schema.paths!['/test/schema-test']).toBeDefined();
    });

    it('should include HTTP methods on paths', async () => {
      const schema = await getOpenAPISchema(ctx.app);

      expect(schema.paths!['/test/schema-test']?.post).toBeDefined();
    });

    it('should include operation metadata', async () => {
      const schema = await getOpenAPISchema(ctx.app);

      const op = schema.paths!['/test/schema-test']?.post;
      expect(op?.summary).toBe('Test endpoint for schema extraction');
      expect(op?.tags).toContain('SchemaTest');
      expect(op?.security).toBeDefined();
    });

    it('should include security schemes', async () => {
      const schema = await getOpenAPISchema(ctx.app);

      expect(schema.components?.securitySchemes).toBeDefined();
      expect(schema.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(schema.components?.securitySchemes?.apiKeyAuth).toBeDefined();
    });

    it('should include request/response schemas', async () => {
      const schema = await getOpenAPISchema(ctx.app);

      const op = schema.paths!['/test/schema-test']?.post;
      expect(op?.requestBody).toBeDefined();
      expect(op?.responses?.['201']).toBeDefined();
    });
  });

  describe('getOpenAPISchemaJSON', () => {
    it('should return valid JSON string', async () => {
      const json = await getOpenAPISchemaJSON(ctx.app);

      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json) as OpenAPISchema;
      expect(parsed.openapi).toBe('3.1.0');
    });

    it('should pretty-print by default', async () => {
      const json = await getOpenAPISchemaJSON(ctx.app);

      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should compact when pretty=false', async () => {
      const json = await getOpenAPISchemaJSON(ctx.app, false);

      expect(json).not.toContain('\n  ');
    });
  });

  describe('getOpenAPIPaths', () => {
    it('should filter paths by exact match', async () => {
      const paths = await getOpenAPIPaths(ctx.app, ['/test/schema-test']);

      expect(paths['/test/schema-test']).toBeDefined();
      expect(paths['/health']).toBeUndefined();
    });

    it('should filter paths by wildcard', async () => {
      const paths = await getOpenAPIPaths(ctx.app, ['/test/*']);

      expect(paths['/test/schema-test']).toBeDefined();
    });

    it('should return all paths with * pattern', async () => {
      const paths = await getOpenAPIPaths(ctx.app, ['*']);

      expect(Object.keys(paths).length).toBeGreaterThan(0);
      expect(paths['/test/schema-test']).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should provide typed schema object', async () => {
      const schema: OpenAPISchema = await getOpenAPISchema(ctx.app);

      // These should all be type-safe
      const title: string = schema.info.title;
      const version: string = schema.info.version;
      const paths = schema.paths ?? {};

      expect(title).toBe('Test API');
      expect(version).toBe('1.0.0');
      expect(Object.keys(paths).length).toBeGreaterThan(0);
    });
  });
});
