import { AppError } from '../../errors/index.js';
export async function registerAPIKey(app, config) {
    const headerName = config.header ?? 'X-API-Key';
    // Add decorator for API key info
    app.decorateRequest('apiKey', undefined);
    // Decorator for requiring API key auth
    app.decorate('authenticateAPIKey', async function (request, _reply) {
        const apiKey = request.headers[headerName.toLowerCase()];
        if (!apiKey) {
            throw AppError.unauthorized(`Missing ${headerName} header`);
        }
        const keyInfo = await config.validate(apiKey);
        if (!keyInfo) {
            throw AppError.unauthorized('Invalid API key');
        }
        request.apiKey = keyInfo;
    });
}
//# sourceMappingURL=api-key.js.map