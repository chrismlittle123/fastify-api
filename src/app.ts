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

function createFastifyInstance(config: AppConfig): FastifyInstance {
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

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);
  fastify.decorate('config', config);

  return fastify;
}

async function registerPlugins(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  await registerSensible(fastify);
  await registerErrorHandler(fastify);

  if (config.observability?.requestLogging !== false) {
    await registerRequestLogging(fastify);
  }

  if (config.docs) {
    await registerOpenAPI(fastify, config, {
      title: config.docs.title,
      description: config.docs.description,
      version: config.docs.version,
      docsPath: config.docs.path,
    });
  }
}

async function registerAuth(
  fastify: FastifyInstance,
  config: AppConfig,
  options?: AppOptions
): Promise<void> {
  if (config.auth?.jwt) {
    await registerJWT(fastify, {
      secret: config.auth.jwt.secret,
      issuer: config.auth.jwt.issuer,
      audience: config.auth.jwt.audience,
      expiresIn: config.auth.jwt.expiresIn,
    });
  }

  if (config.auth?.apiKey && options?.apiKeyValidator) {
    await registerAPIKey(fastify, {
      header: config.auth.apiKey.header,
      validate: options.apiKeyValidator,
    });
  }
}

function setupDatabase(fastify: FastifyInstance, config: AppConfig): void {
  if (!config.db) return;

  const db = createDatabase(config.db);
  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing database connection');
    await db.close();
  });
}

function attachAppMethods(fastify: FastifyInstance, config: AppConfig): App {
  fastify.decorate('start', async () => {
    try {
      await fastify.listen({
        port: config.server.port,
        host: config.server.host,
      });
      fastify.log.info(`${config.name} started on ${config.server.host}:${config.server.port}`);
      if (config.docs) {
        fastify.log.info(`API docs available at ${config.docs.path}`);
      }
    } catch (err) {
      fastify.log.error(err);
      throw err;
    }
  });

  fastify.decorate('shutdown', async () => {
    fastify.log.info('Shutting down...');
    await fastify.close();
  });

  return fastify as App;
}

export async function createApp(configInput: AppConfigInput, options?: AppOptions): Promise<App> {
  const config = appConfigSchema.parse(configInput);
  const fastify = createFastifyInstance(config);
  await registerPlugins(fastify, config);
  await registerAuth(fastify, config, options);
  setupDatabase(fastify, config);
  await registerHealthCheck(fastify);
  return attachAppMethods(fastify, config);
}

// Re-export type provider for typed routes
export type { ZodTypeProvider };
