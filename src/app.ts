import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { appConfigSchema, type AppConfigInput, type AppConfig } from './config/index.js';
import { createDatabase, type Database } from './db/index.js';
import { registerSensible } from './plugins/sensible.js';
import { registerHealthCheck } from './plugins/health.js';
import { registerOpenAPI } from './plugins/openapi.js';
import { registerJWT } from './plugins/auth/jwt.js';
import { registerAPIKey, type APIKeyInfo } from './plugins/auth/api-key.js';
import { registerErrorHandler } from './errors/index.js';
import { registerRequestLogging } from './observability/index.js';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    db?: Database;
    config: AppConfig;
  }
}

export interface AppOptions {
  apiKeyValidator?: (key: string) => Promise<APIKeyInfo | null>;
}

export interface App extends FastifyInstance {
  start: () => Promise<void>;
  shutdown: () => Promise<void>;
}

export async function createApp(configInput: AppConfigInput, options?: AppOptions): Promise<App> {
  // Validate and parse config
  const config = appConfigSchema.parse(configInput);

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
      ...(config.logging.pretty && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }),
    },
  });

  // Set up Zod type provider
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Attach config to app
  fastify.decorate('config', config);

  // Register plugins
  await registerSensible(fastify);

  // Register structured error handler
  await registerErrorHandler(fastify);

  // Register request logging for observability (if enabled)
  if (config.observability?.requestLogging !== false) {
    await registerRequestLogging(fastify);
  }

  // Set up OpenAPI/Scalar docs if configured
  if (config.docs) {
    await registerOpenAPI(fastify, config, {
      title: config.docs.title,
      description: config.docs.description,
      version: config.docs.version,
      docsPath: config.docs.path,
    });
  }

  // Set up JWT auth if configured
  if (config.auth?.jwt) {
    await registerJWT(fastify, {
      secret: config.auth.jwt.secret,
      issuer: config.auth.jwt.issuer,
      audience: config.auth.jwt.audience,
      expiresIn: config.auth.jwt.expiresIn,
    });
  }

  // Set up API Key auth if configured
  if (config.auth?.apiKey && options?.apiKeyValidator) {
    await registerAPIKey(fastify, {
      header: config.auth.apiKey.header,
      validate: options.apiKeyValidator,
    });
  }

  // Set up database if configured
  if (config.db) {
    const db = createDatabase(config.db);
    fastify.decorate('db', db);

    fastify.addHook('onClose', async () => {
      fastify.log.info('Closing database connection');
      await db.close();
    });
  }

  // Register health check routes
  await registerHealthCheck(fastify);

  // Create app with additional methods
  const app = fastify as unknown as App;

  app.start = async () => {
    try {
      await app.listen({
        port: config.server.port,
        host: config.server.host,
      });
      app.log.info(`${config.name} started on ${config.server.host}:${config.server.port}`);
      if (config.docs) {
        app.log.info(`API docs available at ${config.docs.path}`);
      }
    } catch (err) {
      app.log.error(err);
      throw err;
    }
  };

  app.shutdown = async () => {
    app.log.info('Shutting down...');
    await app.close();
  };

  return app;
}

// Re-export type provider for typed routes
export type { ZodTypeProvider };
