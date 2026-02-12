import fastifySwagger from '@fastify/swagger';
import scalarPlugin from '@scalar/fastify-api-reference';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
export async function registerOpenAPI(app, config, openapi) {
    if (!openapi)
        return;
    await app.register(fastifySwagger, {
        transform: jsonSchemaTransform,
        openapi: {
            openapi: '3.1.0',
            info: {
                title: openapi.title,
                description: openapi.description ?? `API documentation for ${config.name}`,
                version: openapi.version,
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                    apiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'X-API-Key',
                    },
                },
            },
        },
    });
    const docsPath = (openapi.docsPath ?? '/docs');
    // Register Scalar docs
    await app.register(scalarPlugin, {
        routePrefix: docsPath,
    });
    // Expose OpenAPI JSON
    app.get('/openapi.json', async () => {
        return app.swagger();
    });
}
//# sourceMappingURL=openapi.js.map