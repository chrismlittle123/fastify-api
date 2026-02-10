import { type FastifyInstance } from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { type AppConfigInput, type AppConfig } from './config/index.js';
import { type Database } from './db/index.js';
import { type APIKeyInfo } from './plugins/auth/api-key.js';
declare module 'fastify' {
    interface FastifyInstance {
        db?: Database;
        config: AppConfig;
    }
}
export interface AppOptions {
    apiKeyValidator?: (key: string) => Promise<APIKeyInfo | null>;
}
export interface App extends FastifyInstance {
    start: () => Promise<void>;
    shutdown: () => Promise<void>;
}
export declare function createApp(configInput: AppConfigInput, options?: AppOptions): Promise<App>;
export type { ZodTypeProvider };
//# sourceMappingURL=app.d.ts.map