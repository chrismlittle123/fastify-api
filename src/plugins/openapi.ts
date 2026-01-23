import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import scalarPlugin from '@scalar/fastify-api-reference';
import type { AppConfig } from '../config/index.js';

export interface OpenAPIConfig {
  title: string;
  description?: string;
  version: string;
  docsPath?: string;
}

export async function registerOpenAPI(
  app: FastifyInstance,
  config: AppConfig,
  openapi?: OpenAPIConfig
): Promise<void> {
  if (!openapi) return;

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: openapi.title,
        description: openapi.description ?? `API documentation for ${config.name}`,
        version: openapi.version,
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    },
  });

  const docsPath = (openapi.docsPath ?? '/docs') as `/${string}`;

  // Register Scalar docs
  await app.register(scalarPlugin, {
    routePrefix: docsPath,
  });

  // Expose OpenAPI JSON
  app.get('/openapi.json', async () => {
    return app.swagger();
  });
}
