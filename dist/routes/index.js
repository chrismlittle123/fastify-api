import { AppError } from '../errors/index.js';
export function defineRoute(definition) {
    return definition;
}
function resolveAuthPreHandler(app, auth) {
    const security = [];
    let preHandler;
    switch (auth) {
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
            preHandler = async (request, reply) => {
                const authHeader = request.headers.authorization;
                const apiKeyHeaderName = (app.config.auth?.apiKey?.header ?? 'X-API-Key').toLowerCase();
                const apiKeyHeader = request.headers[apiKeyHeaderName];
                if (authHeader?.startsWith('Bearer ') && app.authenticateJWT) {
                    return app.authenticateJWT(request, reply);
                }
                else if (apiKeyHeader && app.authenticateAPIKey) {
                    return app.authenticateAPIKey(request, reply);
                }
                else {
                    throw AppError.unauthorized('Authentication required');
                }
            };
            break;
        case 'public':
        default:
            break;
    }
    return { security, preHandler };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRouteSchema(route, security) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schema = {};
    if (route.schema.params)
        schema['params'] = route.schema.params;
    if (route.schema.querystring)
        schema['querystring'] = route.schema.querystring;
    if (route.schema.body)
        schema['body'] = route.schema.body;
    if (route.schema.response)
        schema['response'] = route.schema.response;
    if (route.tags)
        schema['tags'] = route.tags;
    if (route.summary)
        schema['summary'] = route.summary;
    if (route.description)
        schema['description'] = route.description;
    if (security.length > 0)
        schema['security'] = security;
    return schema;
}
export function registerRoute(app, route) {
    const typedApp = app.withTypeProvider();
    const { security, preHandler } = resolveAuthPreHandler(app, route.auth);
    const schema = buildRouteSchema(route, security);
    typedApp.route({
        method: route.method,
        url: route.url,
        schema,
        preHandler,
        handler: async (request, reply) => {
            return route.handler(request, reply);
        },
    });
}
//# sourceMappingURL=index.js.map