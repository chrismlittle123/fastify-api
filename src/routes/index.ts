import type { FastifyInstance, FastifyRequest, FastifyReply, RouteOptions } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { z} from 'zod';
import type { ZodSchema } from 'zod';

export type AuthType = 'jwt' | 'apiKey' | 'any' | 'public';

export interface RouteSchema {
  params?: ZodSchema;
  querystring?: ZodSchema;
  body?: ZodSchema;
  response?: Record<number, ZodSchema>;
}

export interface RouteDefinition<S extends RouteSchema = RouteSchema> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  schema: S;
  auth?: AuthType;
  tags?: string[];
  summary?: string;
  description?: string;
  handler: (
    request: FastifyRequest<{
      Params: S['params'] extends ZodSchema ? z.infer<S['params']> : unknown;
      Querystring: S['querystring'] extends ZodSchema ? z.infer<S['querystring']> : unknown;
      Body: S['body'] extends ZodSchema ? z.infer<S['body']> : unknown;
    }>,
    reply: FastifyReply
  ) => Promise<unknown>;
}

export function defineRoute<S extends RouteSchema>(definition: RouteDefinition<S>): RouteDefinition<S> {
  return definition;
}

export function registerRoute(app: FastifyInstance, route: RouteDefinition): void {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  const security: Record<string, string[]>[] = [];
  let preHandler: RouteOptions['preHandler'];

  switch (route.auth) {
    case 'jwt':
      security.push({ bearerAuth: [] });
      if (app.authenticateJWT) {
        preHandler = app.authenticateJWT;
      }
      break;
    case 'apiKey':
      security.push({ apiKeyAuth: [] });
      if (app.authenticateAPIKey) {
        preHandler = app.authenticateAPIKey;
      }
      break;
    case 'any':
      security.push({ bearerAuth: [] }, { apiKeyAuth: [] });
      // For 'any', we need custom logic to try either auth method
      preHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization;
        // HTTP headers are case-insensitive, but Node.js lowercases them
        const apiKeyHeader = request.headers['x-api-key'];

        if (authHeader?.startsWith('Bearer ') && app.authenticateJWT) {
          return app.authenticateJWT(request, reply);
        } else if (apiKeyHeader && app.authenticateAPIKey) {
          return app.authenticateAPIKey(request, reply);
        } else {
          return reply.send(app.httpErrors.unauthorized('Authentication required'));
        }
      };
      break;
    case 'public':
    default:
      // No auth required
      break;
  }

  // Build schema object with only defined properties to avoid Fastify warnings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema: Record<string, any> = {};

  if (route.schema.params) schema['params'] = route.schema.params;
  if (route.schema.querystring) schema['querystring'] = route.schema.querystring;
  if (route.schema.body) schema['body'] = route.schema.body;
  if (route.schema.response) schema['response'] = route.schema.response;
  if (route.tags) schema['tags'] = route.tags;
  if (route.summary) schema['summary'] = route.summary;
  if (route.description) schema['description'] = route.description;
  if (security.length > 0) schema['security'] = security;

  typedApp.route({
    method: route.method,
    url: route.url,
    schema,
    preHandler,
    handler: async (request, reply) => {
      // Type assertion needed due to Zod type provider complexity
      // The actual runtime types are validated by Zod schemas
      return route.handler(request as Parameters<typeof route.handler>[0], reply);
    },
  });
}
