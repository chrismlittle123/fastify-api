/**
 * Production server entrypoint for Cloud Run deployment
 *
 * Required environment variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - JWT_SECRET: JWT signing secret (min 32 chars)
 *
 * Optional environment variables:
 * - PORT: Server port (default: 8080)
 * - HOST: Server host (default: 0.0.0.0)
 * - LOG_LEVEL: Logging level (default: info)
 * - JWT_ISSUER: JWT issuer claim
 * - JWT_EXPIRES_IN: JWT expiration (default: 1h)
 */

import { createApp, type APIKeyInfo } from './index.js';

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

async function main() {
  const port = parseInt(process.env['PORT'] ?? '8080', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  const app = await createApp(
    {
      name: process.env['APP_NAME'] ?? 'fastify-api',
      server: {
        port,
        host,
      },
      db: {
        connectionString: process.env['DATABASE_URL']!,
        poolSize: parseInt(process.env['DB_POOL_SIZE'] ?? '10', 10),
      },
      auth: {
        jwt: {
          secret: process.env['JWT_SECRET']!,
          issuer: process.env['JWT_ISSUER'],
          expiresIn: process.env['JWT_EXPIRES_IN'] ?? '1h',
        },
        apiKey: {
          header: process.env['API_KEY_HEADER'] ?? 'X-API-Key',
        },
      },
      docs: {
        title: process.env['DOCS_TITLE'] ?? 'Fastify API',
        description: process.env['DOCS_DESCRIPTION'] ?? 'API Documentation',
        version: process.env['DOCS_VERSION'] ?? '1.0.0',
        path: '/docs',
      },
      logging: {
        level: (process.env['LOG_LEVEL'] as 'info' | 'debug' | 'warn' | 'error') ?? 'info',
        pretty: process.env['NODE_ENV'] !== 'production',
      },
    },
    {
      // API key validator can be customized via environment or database lookup
      apiKeyValidator: async (key: string): Promise<APIKeyInfo | null> => {
        // Check for static API keys from environment (comma-separated key:name pairs)
        const staticKeys = process.env['API_KEYS'];
        if (staticKeys) {
          const pairs = staticKeys.split(',');
          for (const pair of pairs) {
            const [apiKey, name] = pair.split(':');
            if (apiKey === key) {
              return { id: apiKey, name: name ?? 'API Key', permissions: ['read', 'write'] };
            }
          }
        }
        return null;
      },
    }
  );

  // Handle graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      await app.shutdown();
      process.exit(0);
    });
  }

  await app.start();
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
