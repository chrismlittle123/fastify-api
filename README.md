# @palindrom/fastify-api

Standardized Fastify API framework for Palindrom services. Install it as a dependency, provide config and business logic — monitoring, auth, errors, docs, and health checks are handled for you.

## Install

```bash
pnpm add @palindrom/fastify-api
```

Or install directly from GitHub:

```bash
pnpm add github:chrismlittle123/fastify-api
```

## Quick Start

```typescript
import { createApp, defineRoute, registerRoute, z } from '@palindrom/fastify-api';

const app = await createApp({
  name: 'my-api',
  server: { port: 3000 },
  logging: { level: 'info', pretty: true },
});

app.get('/hello', async () => ({ message: 'Hello, World!' }));

await app.start();
```

Visit `http://localhost:3000/health` for health checks.

## Defining Routes

Use `defineRoute()` for type-safe routes with Zod validation and OpenAPI generation:

```typescript
import { createApp, defineRoute, registerRoute, z, AppError } from '@palindrom/fastify-api';

const getUser = defineRoute({
  method: 'GET',
  url: '/users/:id',
  auth: 'jwt',
  tags: ['Users'],
  summary: 'Get user by ID',
  schema: {
    params: z.object({ id: z.string().uuid() }),
    response: {
      200: z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
      }),
    },
  },
  handler: async (request) => {
    const user = await findUser(request.params.id);
    if (!user) {
      throw AppError.notFound('User', request.params.id);
    }
    return user;
  },
});

registerRoute(app, getUser);
```

## Authentication

Configure auth in `createApp`. Routes declare their auth type with the `auth` field.

```typescript
const app = await createApp({
  name: 'my-api',
  auth: {
    jwt: {
      secret: 'your-secret-key-at-least-32-characters',
      issuer: 'my-api',
      expiresIn: '1h',
    },
    apiKey: {
      header: 'X-API-Key', // default
    },
  },
}, {
  apiKeyValidator: async (key) => {
    const record = await db.findApiKey(key);
    return record ? { id: record.id, name: record.name, permissions: record.permissions } : null;
  },
});
```

### Auth types

| Type | Header | Description |
|------|--------|-------------|
| `'jwt'` | `Authorization: Bearer <token>` | JWT token required |
| `'apiKey'` | Configured header (default `X-API-Key`) | API key required |
| `'any'` | Either of the above | Accepts JWT or API key |
| `'public'` | None | No auth required |

### Issuing JWT tokens

```typescript
const token = app.jwt.sign({
  sub: user.id,
  email: user.email,
  roles: ['user'],
});
```

Protected routes have `request.user` (JWT) or `request.apiKey` (API key) populated automatically.

## Error Handling

All errors produce a unified response format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id '123' not found",
    "details": { "resource": "User", "id": "123" }
  }
}
```

Use `AppError` factory methods to throw errors:

```typescript
import { AppError } from '@palindrom/fastify-api';

throw AppError.notFound('User', '123');
throw AppError.unauthorized('Token expired');
throw AppError.badRequest('Invalid input', { field: 'email' });
throw AppError.conflict('Email already exists');
throw AppError.validationError('Validation failed', { errors: [...] });
throw AppError.serviceUnavailable();
throw AppError.internal('Something broke', originalError);
```

Zod validation errors and unknown errors are also normalized to this format automatically.

## Database

### Configuration

```typescript
const app = await createApp({
  name: 'my-api',
  db: {
    connectionString: 'postgres://user:pass@host:5432/db',
    poolSize: 10,
    idleTimeout: 30,
  },
});
```

### Usage

```typescript
import { sql } from 'drizzle-orm';
import { users } from './db/schema.js';

// Drizzle ORM queries
const allUsers = await app.db.drizzle.select().from(users);

// Raw SQL via Drizzle
const result = await app.db.drizzle.execute(sql`SELECT NOW()`);

// Health check
const isUp = await app.db.ping();
```

## Health Checks

Three endpoints are registered automatically:

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Full status | `{ status, timestamp, uptime, database? }` |
| `GET /health/live` | Liveness probe | `{ status: 'ok' }` |
| `GET /health/ready` | Readiness probe | `{ status: 'ready' }` or 503 |

## OpenAPI Documentation

Configure `docs` to get Scalar interactive documentation and the OpenAPI spec:

```typescript
const app = await createApp({
  name: 'my-api',
  docs: {
    title: 'My API',
    description: 'API documentation',
    version: '1.0.0',
    path: '/docs',
  },
});
```

- `GET /docs` — Scalar interactive docs
- `GET /openapi.json` — OpenAPI 3.1 specification

## Tracing

Enable OpenTelemetry tracing with one flag at startup:

```bash
node --import @palindrom/fastify-api/tracing dist/server.js
```

Set environment variables to configure the exporter:

```bash
OTEL_SERVICE_NAME=my-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz:4318
```

For local debugging, use console output:

```bash
OTEL_CONSOLE_EXPORTER=true node --import @palindrom/fastify-api/tracing dist/server.js
```

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | required | Application name |
| `server.port` | `number` | `3000` | Server port |
| `server.host` | `string` | `0.0.0.0` | Server host |
| `db.connectionString` | `string` | — | PostgreSQL connection URL |
| `db.poolSize` | `number` | `10` | Connection pool size |
| `db.idleTimeout` | `number` | `30` | Idle timeout (seconds) |
| `auth.jwt.secret` | `string` | — | JWT signing secret (min 32 chars) |
| `auth.jwt.issuer` | `string` | — | JWT issuer claim |
| `auth.jwt.audience` | `string` | — | JWT audience claim |
| `auth.jwt.expiresIn` | `string` | `1h` | Token expiration |
| `auth.apiKey.header` | `string` | `X-API-Key` | API key header name |
| `docs.title` | `string` | — | OpenAPI title |
| `docs.description` | `string` | — | OpenAPI description |
| `docs.version` | `string` | `1.0.0` | OpenAPI version |
| `docs.path` | `string` | `/docs` | Docs endpoint path |
| `logging.level` | `string` | `info` | Log level |
| `logging.pretty` | `boolean` | `true` (dev) | Pretty print logs |
| `observability.otlpEndpoint` | `string` | — | OTLP endpoint |
| `observability.requestLogging` | `boolean` | `true` | Enable request logging |

## Examples

See the `examples/` directory:

- [`basic-server.ts`](examples/basic-server.ts) — Minimal setup
- [`full-api-server.ts`](examples/full-api-server.ts) — All features demonstrated
- [`cloud-run-server.ts`](examples/cloud-run-server.ts) — Cloud Run deployment with GCP Secret Manager
