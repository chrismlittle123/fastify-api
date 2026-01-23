/**
 * E2E test setup - creates a fully configured test app
 */

import { createApp, type App, type APIKeyInfo } from '../../src/index.js';

// Test API keys
export const TEST_API_KEYS = new Map<string, APIKeyInfo>([
  ['test-api-key-123', { id: 'key-1', name: 'Test Key', permissions: ['read', 'write'] }],
  ['readonly-key-456', { id: 'key-2', name: 'Read Only', permissions: ['read'] }],
]);

export interface TestContext {
  app: App;
  getAuthToken: (email?: string) => Promise<string>;
}

export async function createTestApp(): Promise<TestContext> {
  const app = await createApp(
    {
      name: 'test-api',
      server: {
        port: 0, // Random port
        host: '127.0.0.1',
      },
      db: {
        connectionString:
          process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:5432/fastify_api',
      },
      auth: {
        jwt: {
          secret: 'test-secret-key-that-is-at-least-32-characters-long',
          issuer: 'test-api',
          expiresIn: '1h',
        },
        apiKey: {
          header: 'X-API-Key',
        },
      },
      docs: {
        title: 'Test API',
        version: '1.0.0',
      },
      logging: {
        level: 'error', // Quiet during tests
        pretty: false,
      },
    },
    {
      apiKeyValidator: async (key: string) => {
        return TEST_API_KEYS.get(key) ?? null;
      },
    }
  );

  // Helper to get auth token
  const getAuthToken = async (email = 'test@example.com'): Promise<string> => {
    return app.jwt.sign({
      sub: 'test-user-123',
      email,
      roles: ['user'],
    });
  };

  return { app, getAuthToken };
}
