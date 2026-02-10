import fastifyJwt from '@fastify/jwt';
import { AppError } from '../../errors/index.js';
export async function registerJWT(app, config) {
    await app.register(fastifyJwt, {
        secret: config.secret,
        sign: {
            iss: config.issuer,
            aud: config.audience,
            expiresIn: config.expiresIn ?? '1h',
        },
        verify: {
            allowedIss: config.issuer ? [config.issuer] : undefined,
            allowedAud: config.audience ? [config.audience] : undefined,
        },
    });
    // Decorator for requiring JWT auth
    app.decorate('authenticateJWT', async function (request, _reply) {
        try {
            await request.jwtVerify();
        }
        catch {
            throw AppError.unauthorized('Invalid or expired token');
        }
    });
}
//# sourceMappingURL=jwt.js.map