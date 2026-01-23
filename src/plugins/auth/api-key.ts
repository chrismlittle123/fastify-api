import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface APIKeyConfig {
  header?: string;
  validate: (key: string) => Promise<APIKeyInfo | null>;
}

export interface APIKeyInfo {
  id: string;
  name?: string;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: APIKeyInfo;
  }
  interface FastifyInstance {
    authenticateAPIKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAPIKey(app: FastifyInstance, config: APIKeyConfig): Promise<void> {
  const headerName = config.header ?? 'X-API-Key';

  // Add decorator for API key info
  app.decorateRequest('apiKey', undefined);

  // Decorator for requiring API key auth
  app.decorate('authenticateAPIKey', async function (request: FastifyRequest, reply: FastifyReply) {
    const apiKey = request.headers[headerName.toLowerCase()] as string | undefined;

    if (!apiKey) {
      return reply.send(app.httpErrors.unauthorized(`Missing ${headerName} header`));
    }

    const keyInfo = await config.validate(apiKey);

    if (!keyInfo) {
      return reply.send(app.httpErrors.unauthorized('Invalid API key'));
    }

    request.apiKey = keyInfo;
  });
}
