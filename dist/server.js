/**
 * Production server entrypoint for Cloud Run deployment
 *
 * Required environment variables:
 * - JWT_SECRET: JWT signing secret (min 32 chars) OR
 * - JWT_SECRET_NAME: GCP Secret Manager secret name (e.g. projects/PROJECT/secrets/NAME)
 *
 * Optional environment variables:
 * - DATABASE_URL: PostgreSQL connection string (optional)
 * - PORT: Server port (default: 8080)
 * - HOST: Server host (default: 0.0.0.0)
 * - LOG_LEVEL: Logging level (default: info)
 * - JWT_ISSUER: JWT issuer claim
 * - JWT_EXPIRES_IN: JWT expiration (default: 1h)
 */
import { createApp } from './index.js';
async function getSecretFromGcp(secretName) {
    const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();
    const versionedName = secretName.includes('/versions/')
        ? secretName
        : `${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name: versionedName });
    const payload = version.payload?.data;
    if (!payload) {
        throw new Error(`Secret ${secretName} has no data`);
    }
    if (typeof payload === 'string') {
        return payload;
    }
    return Buffer.from(payload).toString('utf8');
}
async function resolveJwtSecret() {
    if (process.env['JWT_SECRET']) {
        return process.env['JWT_SECRET'];
    }
    const secretName = process.env['JWT_SECRET_NAME'];
    if (secretName) {
        console.warn(`Fetching JWT secret from Secret Manager: ${secretName}`);
        return getSecretFromGcp(secretName);
    }
    throw new Error('Missing required environment variable: JWT_SECRET or JWT_SECRET_NAME');
}
function buildDbConfig() {
    if (!process.env['DATABASE_URL'])
        return undefined;
    return {
        connectionString: process.env['DATABASE_URL'],
        poolSize: parseInt(process.env['DB_POOL_SIZE'] ?? '10', 10),
    };
}
function buildAppConfig(port, host, jwtSecret) {
    return {
        name: process.env['APP_NAME'] ?? 'fastify-api',
        server: { port, host },
        db: buildDbConfig(),
        auth: {
            jwt: {
                secret: jwtSecret,
                issuer: process.env['JWT_ISSUER'],
                expiresIn: process.env['JWT_EXPIRES_IN'] ?? '1h',
            },
            apiKey: {
                header: process.env['API_KEY_HEADER'] ?? 'X-API-Key',
            },
        },
        docs: {
            title: process.env['DOCS_TITLE'] ?? 'Fastify API',
            description: process.env['DOCS_DESCRIPTION'] ?? 'API Documentation',
            version: process.env['DOCS_VERSION'] ?? '1.0.0',
            path: '/docs',
        },
        logging: {
            level: process.env['LOG_LEVEL'] ?? 'info',
            pretty: process.env['NODE_ENV'] !== 'production',
        },
    };
}
function validateApiKey(key) {
    const staticKeys = process.env['API_KEYS'];
    if (!staticKeys)
        return null;
    const pairs = staticKeys.split(',');
    for (const pair of pairs) {
        const [apiKey, name] = pair.split(':');
        if (apiKey === key) {
            return { id: apiKey, name: name ?? 'API Key', permissions: ['read', 'write'] };
        }
    }
    return null;
}
async function main() {
    const port = parseInt(process.env['PORT'] ?? '8080', 10);
    const host = process.env['HOST'] ?? '0.0.0.0';
    const jwtSecret = await resolveJwtSecret();
    const app = await createApp(buildAppConfig(port, host, jwtSecret), {
        apiKeyValidator: async (key) => validateApiKey(key),
    });
    const signals = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
        process.on(signal, async () => {
            app.log.info(`Received ${signal}, shutting down gracefully...`);
            await app.shutdown();
            process.exit(0);
        });
    }
    await app.start();
}
main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map