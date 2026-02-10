import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, } from 'fastify-type-provider-zod';
import { appConfigSchema } from './config/index.js';
import { createDatabase } from './db/index.js';
import { registerSensible } from './plugins/sensible.js';
import { registerHealthCheck } from './plugins/health.js';
import { registerOpenAPI } from './plugins/openapi.js';
import { registerJWT } from './plugins/auth/jwt.js';
import { registerAPIKey } from './plugins/auth/api-key.js';
import { registerErrorHandler } from './errors/index.js';
import { registerRequestLogging } from './observability/index.js';
function createFastifyInstance(config) {
    const fastify = Fastify({
        logger: {
            level: config.logging.level,
            ...(config.logging.pretty && {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                    },
                },
            }),
        },
    });
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);
    fastify.decorate('config', config);
    return fastify;
}
async function registerPlugins(fastify, config) {
    await registerSensible(fastify);
    await registerErrorHandler(fastify);
    if (config.observability?.requestLogging !== false) {
        await registerRequestLogging(fastify);
    }
    if (config.docs) {
        await registerOpenAPI(fastify, config, {
            title: config.docs.title,
            description: config.docs.description,
            version: config.docs.version,
            docsPath: config.docs.path,
        });
    }
}
async function registerAuth(fastify, config, options) {
    if (config.auth?.jwt) {
        await registerJWT(fastify, {
            secret: config.auth.jwt.secret,
            issuer: config.auth.jwt.issuer,
            audience: config.auth.jwt.audience,
            expiresIn: config.auth.jwt.expiresIn,
        });
    }
    if (config.auth?.apiKey && options?.apiKeyValidator) {
        await registerAPIKey(fastify, {
            header: config.auth.apiKey.header,
            validate: options.apiKeyValidator,
        });
    }
}
function setupDatabase(fastify, config) {
    if (!config.db)
        return;
    const db = createDatabase(config.db);
    fastify.decorate('db', db);
    fastify.addHook('onClose', async () => {
        fastify.log.info('Closing database connection');
        await db.close();
    });
}
function attachAppMethods(fastify, config) {
    const app = fastify;
    app.start = async () => {
        try {
            await app.listen({
                port: config.server.port,
                host: config.server.host,
            });
            app.log.info(`${config.name} started on ${config.server.host}:${config.server.port}`);
            if (config.docs) {
                app.log.info(`API docs available at ${config.docs.path}`);
            }
        }
        catch (err) {
            app.log.error(err);
            throw err;
        }
    };
    app.shutdown = async () => {
        app.log.info('Shutting down...');
        await app.close();
    };
    return app;
}
export async function createApp(configInput, options) {
    const config = appConfigSchema.parse(configInput);
    const fastify = createFastifyInstance(config);
    await registerPlugins(fastify, config);
    await registerAuth(fastify, config, options);
    setupDatabase(fastify, config);
    await registerHealthCheck(fastify);
    return attachAppMethods(fastify, config);
}
//# sourceMappingURL=app.js.map