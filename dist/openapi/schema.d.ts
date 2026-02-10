/**
 * OpenAPI schema extraction utilities
 *
 * Provides typed access to the OpenAPI schema for use in client generation,
 * documentation tools, and other external consumers.
 */
import type { FastifyInstance } from 'fastify';
/**
 * OpenAPI 3.1 Schema Types
 * These types represent the structure of an OpenAPI specification
 */
interface OpenAPIContact {
    name?: string;
    url?: string;
    email?: string;
}
interface OpenAPILicense {
    name: string;
    url?: string;
    identifier?: string;
}
export interface OpenAPIInfo {
    title: string;
    description?: string;
    termsOfService?: string;
    contact?: OpenAPIContact;
    license?: OpenAPILicense;
    version: string;
    summary?: string;
}
interface OpenAPIServerVariable {
    enum?: string[];
    default: string;
    description?: string;
}
export interface OpenAPIServer {
    url: string;
    description?: string;
    variables?: Record<string, OpenAPIServerVariable>;
}
export interface OpenAPIExternalDocs {
    description?: string;
    url: string;
}
export interface OpenAPITag {
    name: string;
    description?: string;
    externalDocs?: OpenAPIExternalDocs;
}
export interface OpenAPIReference {
    $ref: string;
    summary?: string;
    description?: string;
}
export interface OpenAPISchemaObject {
    type?: string | string[];
    format?: string;
    title?: string;
    description?: string;
    default?: unknown;
    enum?: unknown[];
    const?: unknown;
    nullable?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    deprecated?: boolean;
    properties?: Record<string, OpenAPISchemaObject | OpenAPIReference>;
    required?: string[];
    additionalProperties?: boolean | OpenAPISchemaObject | OpenAPIReference;
    items?: OpenAPISchemaObject | OpenAPIReference;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
    allOf?: (OpenAPISchemaObject | OpenAPIReference)[];
    oneOf?: (OpenAPISchemaObject | OpenAPIReference)[];
    anyOf?: (OpenAPISchemaObject | OpenAPIReference)[];
    not?: OpenAPISchemaObject | OpenAPIReference;
    discriminator?: {
        propertyName: string;
        mapping?: Record<string, string>;
    };
    example?: unknown;
    examples?: unknown[];
}
export interface OpenAPIParameter {
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    style?: string;
    explode?: boolean;
    allowReserved?: boolean;
    schema?: OpenAPISchemaObject | OpenAPIReference;
    example?: unknown;
    examples?: Record<string, unknown>;
    content?: Record<string, OpenAPIMediaType>;
}
export interface OpenAPIMediaType {
    schema?: OpenAPISchemaObject | OpenAPIReference;
    example?: unknown;
    examples?: Record<string, unknown>;
    encoding?: Record<string, unknown>;
}
export interface OpenAPIRequestBody {
    description?: string;
    content: Record<string, OpenAPIMediaType>;
    required?: boolean;
}
export interface OpenAPIResponse {
    description: string;
    headers?: Record<string, OpenAPIParameter | OpenAPIReference>;
    content?: Record<string, OpenAPIMediaType>;
    links?: Record<string, unknown>;
}
export interface OpenAPIOperation {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: OpenAPIExternalDocs;
    operationId?: string;
    parameters?: (OpenAPIParameter | OpenAPIReference)[];
    requestBody?: OpenAPIRequestBody | OpenAPIReference;
    responses: Record<string, OpenAPIResponse | OpenAPIReference>;
    callbacks?: Record<string, unknown>;
    deprecated?: boolean;
    security?: Record<string, string[]>[];
    servers?: OpenAPIServer[];
}
export interface OpenAPIPathItem {
    $ref?: string;
    summary?: string;
    description?: string;
    get?: OpenAPIOperation;
    put?: OpenAPIOperation;
    post?: OpenAPIOperation;
    delete?: OpenAPIOperation;
    options?: OpenAPIOperation;
    head?: OpenAPIOperation;
    patch?: OpenAPIOperation;
    trace?: OpenAPIOperation;
    servers?: OpenAPIServer[];
    parameters?: (OpenAPIParameter | OpenAPIReference)[];
}
export interface OpenAPISecurityScheme {
    type: 'apiKey' | 'http' | 'mutualTLS' | 'oauth2' | 'openIdConnect';
    description?: string;
    name?: string;
    in?: 'query' | 'header' | 'cookie';
    scheme?: string;
    bearerFormat?: string;
    flows?: unknown;
    openIdConnectUrl?: string;
}
export interface OpenAPIComponents {
    schemas?: Record<string, OpenAPISchemaObject | OpenAPIReference>;
    responses?: Record<string, OpenAPIResponse | OpenAPIReference>;
    parameters?: Record<string, OpenAPIParameter | OpenAPIReference>;
    examples?: Record<string, unknown>;
    requestBodies?: Record<string, OpenAPIRequestBody | OpenAPIReference>;
    headers?: Record<string, OpenAPIParameter | OpenAPIReference>;
    securitySchemes?: Record<string, OpenAPISecurityScheme | OpenAPIReference>;
    links?: Record<string, unknown>;
    callbacks?: Record<string, unknown>;
    pathItems?: Record<string, OpenAPIPathItem | OpenAPIReference>;
}
/**
 * Complete OpenAPI 3.1 Schema
 */
export interface OpenAPISchema {
    openapi: string;
    info: OpenAPIInfo;
    jsonSchemaDialect?: string;
    servers?: OpenAPIServer[];
    paths?: Record<string, OpenAPIPathItem>;
    webhooks?: Record<string, OpenAPIPathItem | OpenAPIReference>;
    components?: OpenAPIComponents;
    security?: Record<string, string[]>[];
    tags?: OpenAPITag[];
    externalDocs?: OpenAPIExternalDocs;
}
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
export declare function getOpenAPISchema(app: FastifyInstance): Promise<OpenAPISchema>;
/**
 * Extract the OpenAPI schema as a JSON string.
 *
 * Convenience method for writing to files or sending over network.
 *
 * @param app - Fastify app instance
 * @param pretty - Whether to pretty-print the JSON (default: true)
 */
export declare function getOpenAPISchemaJSON(app: FastifyInstance, pretty?: boolean): Promise<string>;
/**
 * Extract specific paths from the OpenAPI schema.
 *
 * Useful for generating clients for a subset of endpoints.
 *
 * @param app - Fastify app instance
 * @param pathPatterns - Array of path patterns to include (supports * wildcard)
 */
export declare function getOpenAPIPaths(app: FastifyInstance, pathPatterns: string[]): Promise<Record<string, OpenAPIPathItem>>;
export {};
//# sourceMappingURL=schema.d.ts.map