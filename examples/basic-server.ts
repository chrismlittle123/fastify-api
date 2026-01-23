/**
 * Basic example showing how to use @palindrom/fastify-api
 *
 * Run with:
 *   npm run docker:up      # Start PostgreSQL
 *   npx tsx examples/basic-server.ts
 */

import { createApp } from '../src/index.js';

async function main() {
  const app = await createApp({
    name: 'example-api',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    db: {
      connectionString: process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/fastify_api',
    },
    logging: {
      level: 'info',
      pretty: true,
    },
  });

  // Add a custom route
  app.get('/hello', async () => {
    return { message: 'Hello, World!' };
  });

  // Example route using httpErrors
  app.get('/users/:id', async (request) => {
    const { id } = request.params as { id: string };

    // Simulate user lookup
    if (id !== '1') {
      throw app.httpErrors.notFound(`User ${id} not found`);
    }

    return {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };
  });

  // Example route using database
  app.get('/db-test', async () => {
    if (!app.db) {
      throw app.httpErrors.serviceUnavailable('Database not configured');
    }

    const result = await app.db.query('SELECT NOW() as current_time');
    return { result };
  });

  // Handle graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      await app.shutdown();
      process.exit(0);
    });
  }

  await app.start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
