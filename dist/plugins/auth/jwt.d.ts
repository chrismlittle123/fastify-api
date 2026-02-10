import type { FastifyInstance } from 'fastify';
export interface JWTConfig {
    secret: string;
    issuer?: string;
    audience?: string;
    expiresIn?: string;
}
export interface JWTPayload {
    sub: string;
    email?: string;
    roles?: string[];
    [key: string]: unknown;
}
declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: JWTPayload;
        user: JWTPayload;
    }
}
export declare function registerJWT(app: FastifyInstance, config: JWTConfig): Promise<void>;
declare module 'fastify' {
    interface FastifyInstance {
        authenticateJWT: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
//# sourceMappingURL=jwt.d.ts.map