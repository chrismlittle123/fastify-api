/**
 * Full example API server demonstrating all features:
 * - Zod schema validation
 * - OpenAPI/Scalar docs
 * - JWT authentication
 * - API Key authentication
 * - PostgreSQL with Drizzle
 *
 * Run with:
 *   npm run docker:up
 *   npx tsx examples/full-api-server.ts
 *
 * Then visit:
 *   http://localhost:3000/docs - API documentation
 *   http://localhost:3000/health - Health check
 */

import { createApp, z, defineRoute, registerRoute, AppError, type APIKeyInfo } from '../src/index.js';
import { sql } from 'drizzle-orm';

// Simulated API keys store (in real app, this would be in database)
const API_KEYS = new Map<string, APIKeyInfo>([
  ['test-api-key-123', { id: 'key-1', name: 'Test Key', permissions: ['read', 'write'] }],
  ['readonly-key-456', { id: 'key-2', name: 'Read Only', permissions: ['read'] }],
]);

// In-memory store for demo (in real app, use database)
interface Item {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

const items = new Map<string, Item>();

// Seed some data
items.set('item-1', {
  id: 'item-1',
  name: 'First Item',
  description: 'This is the first item',
  createdAt: new Date().toISOString(),
  createdBy: 'system',
});

async function main() {
  const app = await createApp(
    {
      name: 'example-api',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      db: {
        connectionString:
          process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/fastify_api',
      },
      auth: {
        jwt: {
          secret: 'super-secret-jwt-key-that-is-at-least-32-chars',
          issuer: 'example-api',
          expiresIn: '1h',
        },
        apiKey: {
          header: 'X-API-Key',
        },
      },
      docs: {
        title: 'Example API',
        description: 'A full-featured example API demonstrating all capabilities',
        version: '1.0.0',
        path: '/docs',
      },
      logging: {
        level: 'info',
        pretty: true,
      },
    },
    {
      apiKeyValidator: async (key: string) => {
        return API_KEYS.get(key) ?? null;
      },
    }
  );

  // ============================================
  // Route 1: Public - List all items
  // ============================================
  const listItemsRoute = defineRoute({
    method: 'GET',
    url: '/items',
    auth: 'public',
    tags: ['Items'],
    summary: 'List all items',
    description: 'Returns a list of all items. No authentication required.',
    schema: {
      querystring: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(10),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      response: {
        200: z.object({
          items: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              description: z.string(),
              createdAt: z.string(),
              createdBy: z.string(),
            })
          ),
          total: z.number(),
        }),
      },
    },
    handler: async (request) => {
      const { limit, offset } = request.query;
      const allItems = Array.from(items.values());
      const paginatedItems = allItems.slice(offset, offset + limit);

      return {
        items: paginatedItems,
        total: allItems.length,
      };
    },
  });
  registerRoute(app, listItemsRoute);

  // ============================================
  // Route 2: Public - Get single item
  // ============================================
  const getItemRoute = defineRoute({
    method: 'GET',
    url: '/items/:id',
    auth: 'public',
    tags: ['Items'],
    summary: 'Get item by ID',
    schema: {
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          createdAt: z.string(),
          createdBy: z.string(),
        }),
      },
    },
    handler: async (request) => {
      const item = items.get(request.params.id);
      if (!item) {
        throw AppError.notFound('Item', request.params.id);
      }
      return item;
    },
  });
  registerRoute(app, getItemRoute);

  // ============================================
  // Route 3: API Key Protected - Create item
  // ============================================
  const createItemRoute = defineRoute({
    method: 'POST',
    url: '/items',
    auth: 'apiKey',
    tags: ['Items'],
    summary: 'Create a new item',
    description: 'Creates a new item. Requires API key authentication.',
    schema: {
      body: z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(1000).default(''),
      }),
      response: {
        201: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          createdAt: z.string(),
          createdBy: z.string(),
        }),
      },
    },
    handler: async (request, reply) => {
      const { name, description } = request.body;
      const id = `item-${Date.now()}`;

      const item: Item = {
        id,
        name,
        description,
        createdAt: new Date().toISOString(),
        createdBy: request.apiKey?.name ?? 'unknown',
      };

      items.set(id, item);

      reply.status(201);
      return item;
    },
  });
  registerRoute(app, createItemRoute);

  // ============================================
  // Route 4: JWT Protected - Get user profile
  // ============================================
  const getProfileRoute = defineRoute({
    method: 'GET',
    url: '/profile',
    auth: 'jwt',
    tags: ['Users'],
    summary: 'Get current user profile',
    description: 'Returns the profile of the authenticated user. Requires JWT token.',
    schema: {
      response: {
        200: z.object({
          sub: z.string(),
          email: z.string().optional(),
          roles: z.array(z.string()).optional(),
        }),
      },
    },
    handler: async (request) => {
      // request.user is populated by JWT verification
      return {
        sub: request.user.sub,
        email: request.user.email,
        roles: request.user.roles,
      };
    },
  });
  registerRoute(app, getProfileRoute);

  // ============================================
  // Route 5: Public - Login (get JWT token)
  // ============================================
  const loginRoute = defineRoute({
    method: 'POST',
    url: '/auth/login',
    auth: 'public',
    tags: ['Auth'],
    summary: 'Login and get JWT token',
    description: 'Authenticate with email/password and receive a JWT token.',
    schema: {
      body: z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
      response: {
        200: z.object({
          token: z.string(),
          expiresIn: z.string(),
        }),
      },
    },
    handler: async (request) => {
      const { email, password } = request.body;

      // Demo: accept any login with password "demo"
      if (password !== 'demo') {
        throw AppError.unauthorized('Invalid credentials');
      }

      const token = app.jwt.sign({
        sub: `user-${Date.now()}`,
        email,
        roles: ['user'],
      });

      return {
        token,
        expiresIn: '1h',
      };
    },
  });
  registerRoute(app, loginRoute);

  // ============================================
  // Route 6: Database - Get DB time
  // ============================================
  app.get('/db/time', {
    schema: {
      tags: ['Database'],
      summary: 'Get database server time',
      response: {
        200: {
          type: 'object',
          properties: {
            serverTime: { type: 'string' },
            source: { type: 'string' },
          },
        },
      },
    },
    handler: async () => {
      if (!app.db) {
        throw AppError.serviceUnavailable('Database not configured');
      }

      const result = await app.db.drizzle.execute<{ current_time: string }>(sql`SELECT NOW() as current_time`);
      return {
        serverTime: result[0]?.current_time ?? new Date().toISOString(),
        source: 'postgresql',
      };
    },
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

  console.log('\n📚 API Documentation: http://localhost:3000/docs');
  console.log('🔑 Test API Key: test-api-key-123');
  console.log('🔐 Login: POST /auth/login with { email: "test@example.com", password: "demo" }\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
