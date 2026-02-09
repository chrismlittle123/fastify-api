// Main exports
export { createApp, type App, type AppOptions, type ZodTypeProvider } from './app.js';

// Config
export { appConfigSchema, type AppConfig, type AppConfigInput } from './config/index.js';

// Database
export { type Database } from './db/index.js';

// Routes
export { defineRoute, registerRoute, type RouteDefinition, type RouteSchema, type AuthType } from './routes/index.js';

// OpenAPI schema extraction
export {
  getOpenAPISchema,
  getOpenAPISchemaJSON,
  getOpenAPIPaths,
  type OpenAPISchema,
  type OpenAPIInfo,
  type OpenAPIServer,
  type OpenAPITag,
  type OpenAPIPathItem,
  type OpenAPIOperation,
  type OpenAPIParameter,
  type OpenAPIRequestBody,
  type OpenAPIResponse,
  type OpenAPIMediaType,
  type OpenAPISchemaObject,
  type OpenAPIComponents,
  type OpenAPISecurityScheme,
  type OpenAPIReference,
} from './openapi/index.js';

// Auth types
export type { JWTPayload, JWTConfig } from './plugins/auth/jwt.js';
export type { APIKeyInfo, APIKeyConfig } from './plugins/auth/api-key.js';

// Errors
export {
  AppError,
  ErrorCode,
  isAppError,
} from './errors/index.js';

// Observability
export {
  buildOTelEnvVars,
  type ObservabilityConfig,
  type OTelEnvVars,
} from './observability/index.js';

// Re-export commonly used dependencies
export { z } from 'zod';
