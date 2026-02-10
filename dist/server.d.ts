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
export {};
//# sourceMappingURL=server.d.ts.map