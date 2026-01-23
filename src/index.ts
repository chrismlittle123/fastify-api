// Main exports
export { createApp, type App, type AppOptions, type ZodTypeProvider } from './app.js';

// Config
export { appConfigSchema, type AppConfig, type AppConfigInput } from './config/index.js';

// Database
export {
  createDatabase,
  closeDatabase,
  type Database,
  type DatabaseOptions,
} from './db/index.js';

// Routes
export { defineRoute, registerRoute, type RouteDefinition, type RouteSchema, type AuthType } from './routes/index.js';

// Auth types
export type { JWTPayload, JWTConfig } from './plugins/auth/jwt.js';
export type { APIKeyInfo, APIKeyConfig } from './plugins/auth/api-key.js';

// Re-export commonly used dependencies
export { z } from 'zod';
