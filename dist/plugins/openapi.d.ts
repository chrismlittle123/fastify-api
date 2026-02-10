import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config/index.js';
interface OpenAPIConfig {
    title: string;
    description?: string;
    version: string;
    docsPath?: string;
}
export declare function registerOpenAPI(app: FastifyInstance, config: AppConfig, openapi?: OpenAPIConfig): Promise<void>;
export {};
//# sourceMappingURL=openapi.d.ts.map