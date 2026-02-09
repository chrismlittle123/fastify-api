import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { getOpenAPISchema, getOpenAPIPaths } from '../../src/openapi/schema.js';

describe('getOpenAPISchema error branch', () => {
  it('throws when /openapi.json is not available', async () => {
    const app = Fastify({ logger: false });
    // No swagger plugin registered, so /openapi.json will 404
    await app.ready();

    await expect(getOpenAPISchema(app)).rejects.toThrow(
      'OpenAPI schema not available'
    );
  });
});

describe('getOpenAPIPaths with missing paths', () => {
  it('returns empty object when schema has no paths field', async () => {
    const app = Fastify({ logger: false });
    // Register a route that returns an OpenAPI schema with no paths
    app.get('/openapi.json', async () => ({
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      // paths intentionally omitted
    }));
    await app.ready();

    const result = await getOpenAPIPaths(app, ['*']);
    expect(result).toEqual({});
  });
});
