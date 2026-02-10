import type { FastifyInstance } from 'fastify';
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
export declare function registerAPIKey(app: FastifyInstance, config: APIKeyConfig): Promise<void>;
//# sourceMappingURL=api-key.d.ts.map