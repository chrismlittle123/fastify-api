/**
 * E2E tests for OpenAPI/Scalar documentation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, type TestContext } from './setup.js';
import { z } from '../../src/index.js';
import { registerRoute, defineRoute } from '../../src/routes/index.js';

describe('E2E: OpenAPI Documentation', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();

    // Add a documented route
    const testRoute = defineRoute({
      method: 'POST',
      url: '/test/documented',
      auth: 'jwt',
      tags: ['Test'],
      summary: 'A documented endpoint',
      description: 'This endpoint is fully documented with OpenAPI.',
      schema: {
        body: z.object({
          message: z.string().describe('The message to echo'),
        }),
        response: {
          200: z.object({
            echo: z.string().describe('The echoed message'),
            timestamp: z.string().describe('Server timestamp'),
          }),
        },
      },
      handler: async (request) => {
        return {
          echo: request.body.message,
          timestamp: new Date().toISOString(),
        };
      },
    });
    registerRoute(ctx.app, testRoute);

    // Wait for swagger to be ready
    await ctx.app.ready();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /openapi.json - should return OpenAPI spec', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/openapi.json',
    });

    expect(response.statusCode).toBe(200);
    const spec = JSON.parse(response.body);

    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('1.0.0');
  });

  it('should include security schemes', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/openapi.json',
    });

    const spec = JSON.parse(response.body);

    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(spec.components.securitySchemes.apiKeyAuth).toEqual({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    });
  });

  it('should document routes with tags and descriptions', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/openapi.json',
    });

    const spec = JSON.parse(response.body);
    const documentedRoute = spec.paths['/test/documented']?.post;

    expect(documentedRoute).toBeDefined();
    expect(documentedRoute.tags).toContain('Test');
    expect(documentedRoute.summary).toBe('A documented endpoint');
    expect(documentedRoute.description).toBe('This endpoint is fully documented with OpenAPI.');
  });

  it('should document request body schema', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/openapi.json',
    });

    const spec = JSON.parse(response.body);
    const requestBody = spec.paths['/test/documented']?.post?.requestBody;

    expect(requestBody).toBeDefined();
    expect(requestBody.content['application/json']).toBeDefined();
  });

  it('should document security requirements', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/openapi.json',
    });

    const spec = JSON.parse(response.body);
    const security = spec.paths['/test/documented']?.post?.security;

    expect(security).toBeDefined();
    expect(security).toContainEqual({ bearerAuth: [] });
  });

  it('GET /docs - should return Scalar documentation page', async () => {
    // Scalar may redirect /docs to /docs/ with trailing slash
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/docs/',
    });

    // Scalar returns HTML
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });
});
