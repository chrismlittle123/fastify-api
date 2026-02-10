import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { z } from 'zod';
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
    handler: (request: FastifyRequest<{
        Params: S['params'] extends ZodSchema ? z.infer<S['params']> : unknown;
        Querystring: S['querystring'] extends ZodSchema ? z.infer<S['querystring']> : unknown;
        Body: S['body'] extends ZodSchema ? z.infer<S['body']> : unknown;
    }>, reply: FastifyReply) => Promise<unknown>;
}
export declare function defineRoute<S extends RouteSchema>(definition: RouteDefinition<S>): RouteDefinition<S>;
export declare function registerRoute(app: FastifyInstance, route: RouteDefinition): void;
//# sourceMappingURL=index.d.ts.map