/**
 * OpenAPI schema extraction utilities
 *
 * Provides typed access to the OpenAPI schema for use in client generation,
 * documentation tools, and other external consumers.
 */

import type { FastifyInstance } from 'fastify';
import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * OpenAPI 3.1 Schema Types
 * Re-exported from openapi-types for convenience
 */
export type OpenAPIInfo = OpenAPIV3_1.InfoObject;
export type OpenAPIServer = OpenAPIV3_1.ServerObject;
export type OpenAPITag = OpenAPIV3_1.TagObject;
export type OpenAPIReference = OpenAPIV3_1.ReferenceObject;
export type OpenAPISchemaObject = OpenAPIV3_1.SchemaObject;
export type OpenAPIParameter = OpenAPIV3_1.ParameterObject;
export type OpenAPIMediaType = OpenAPIV3_1.MediaTypeObject;
export type OpenAPIRequestBody = OpenAPIV3_1.RequestBodyObject;
export type OpenAPIResponse = OpenAPIV3_1.ResponseObject;
export type OpenAPIOperation = OpenAPIV3_1.OperationObject;
export type OpenAPIPathItem = OpenAPIV3_1.PathItemObject;
export type OpenAPISecurityScheme = OpenAPIV3_1.SecuritySchemeObject;
export type OpenAPIComponents = OpenAPIV3_1.ComponentsObject;
export type OpenAPISchema = OpenAPIV3_1.Document;

/**
 * Extract the OpenAPI schema from a Fastify app instance.
 *
 * This function ensures the app is ready (all routes registered) and returns
 * the complete OpenAPI specification as a typed object.
 *
 * @example
 * ```typescript
 * import { createApp, getOpenAPISchema } from '@palindrom/fastify-api';
 *
 * const app = await createApp({ ... });
 * // Register your routes...
 *
 * const schema = await getOpenAPISchema(app);
 * // schema is fully typed as OpenAPISchema
 *
 * // Export for use in other packages
 * export { schema as openApiSchema };
 * ```
 *
 * @example
 * ```typescript
 * // Write schema to file for client generation
 * import { writeFileSync } from 'fs';
 *
 * const schema = await getOpenAPISchema(app);
 * writeFileSync('./openapi.json', JSON.stringify(schema, null, 2));
 * ```
 */
export async function getOpenAPISchema(app: FastifyInstance): Promise<OpenAPISchema> {
  // Ensure app is ready (all routes registered, plugins loaded)
  await app.ready();

  // Fetch the schema via the /openapi.json endpoint
  // This is more reliable than calling app.swagger() directly
  const response = await app.inject({
    method: 'GET',
    url: '/openapi.json',
  });

  if (response.statusCode !== 200) {
    throw new Error(
      'OpenAPI schema not available. Make sure docs are enabled in your app config: { docs: { title, version } }'
    );
  }

  const schema = JSON.parse(response.body) as OpenAPISchema;
  return schema;
}

/**
 * Extract the OpenAPI schema as a JSON string.
 *
 * Convenience method for writing to files or sending over network.
 *
 * @param app - Fastify app instance
 * @param pretty - Whether to pretty-print the JSON (default: true)
 */
export async function getOpenAPISchemaJSON(app: FastifyInstance, pretty = true): Promise<string> {
  const schema = await getOpenAPISchema(app);
  return pretty ? JSON.stringify(schema, null, 2) : JSON.stringify(schema);
}

/**
 * Extract specific paths from the OpenAPI schema.
 *
 * Useful for generating clients for a subset of endpoints.
 *
 * @param app - Fastify app instance
 * @param pathPatterns - Array of path patterns to include (supports * wildcard)
 */
export async function getOpenAPIPaths(
  app: FastifyInstance,
  pathPatterns: string[]
): Promise<Record<string, OpenAPIPathItem>> {
  const schema = await getOpenAPISchema(app);
  const paths = schema.paths ?? {};

  const matchesPattern = (path: string, pattern: string): boolean => {
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern;
  };

  const filteredPaths: Record<string, OpenAPIPathItem> = {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (pathItem && pathPatterns.some((pattern) => matchesPattern(path, pattern))) {
      filteredPaths[path] = pathItem;
    }
  }

  return filteredPaths;
}
