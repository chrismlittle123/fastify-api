# @palindrom/fastify-api

Batteries-included Fastify API framework with Zod schemas, OpenAPI generation, authentication, and standardized patterns.

## Features

- **Single config object** - Simple `createApp({ ... })` API
- **Zod as source of truth** - Define schemas once, get validation + OpenAPI
- **Authentication** - JWT tokens and API key authentication built-in
- **OpenAPI & Scalar** - Auto-generated docs at `/docs`
- **Structured errors** - `AppError` abstraction + `@fastify/sensible` HTTP errors
- **Observability** - OpenTelemetry tracing for SigNoz integration
- **Drizzle ORM** - Type-safe PostgreSQL with connection pooling
- **Health checks** - `/health`, `/health/live`, `/health/ready` endpoints
- **Docker ready** - PostgreSQL 16 via docker-compose

## Quick Start

```bash
# Install
npm install @palindrom/fastify-api

# Start PostgreSQL (for development)
npm run docker:up

# Run example server
npx tsx examples/full-api-server.ts

# Visit API docs
open http://localhost:3000/docs
```

## Usage

### Basic Server

```typescript
import { createApp } from '@palindrom/fastify-api';

const app = await createApp({
  name: 'my-api',
  server: { port: 3000 },
  logging: { level: 'info', pretty: true },
});

app.get('/hello', async () => ({ message: 'Hello, World!' }));

await app.start();
```

### Full-Featured Server

```typescript
import { createApp, defineRoute, registerRoute, z } from '@palindrom/fastify-api';

const app = await createApp({
  name: 'my-api',
  server: { port: 3000 },
  db: {
    connectionString: 'postgres://postgres:postgres@localhost:5432/mydb',
  },
  auth: {
    jwt: {
      secret: 'your-secret-key-at-least-32-characters',
      issuer: 'my-api',
      expiresIn: '1h',
    },
    apiKey: {
      header: 'X-API-Key',
    },
  },
  docs: {
    title: 'My API',
    description: 'API documentation',
    version: '1.0.0',
    path: '/docs',
  },
  logging: { level: 'info', pretty: true },
}, {
  apiKeyValidator: async (key) => {
    // Return { id, name, permissions } or null
    if (key === 'valid-key') {
      return { id: 'key-1', name: 'My Key', permissions: ['read', 'write'] };
    }
    return null;
  },
});

await app.start();
```

## Defining Routes

Use `defineRoute()` for type-safe routes with Zod validation:

```typescript
import { defineRoute, registerRoute, z } from '@palindrom/fastify-api';

const createUserRoute = defineRoute({
  method: 'POST',
  url: '/users',
  auth: 'jwt',  // 'jwt' | 'apiKey' | 'any' | 'public'
  tags: ['Users'],
  summary: 'Create a new user',
  description: 'Creates a user and returns the created object',
  schema: {
    body: z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
    }),
    response: {
      201: z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
        createdAt: z.string().datetime(),
      }),
    },
  },
  handler: async (request, reply) => {
    const { name, email } = request.body;
    const user = await createUser({ name, email });
    reply.status(201);
    return user;
  },
});

registerRoute(app, createUserRoute);
```

## Authentication

### JWT Authentication

```typescript
// Login endpoint to issue tokens
app.post('/login', async (request) => {
  const { email, password } = request.body;

  // Validate credentials...

  const token = app.jwt.sign({
    sub: user.id,
    email: user.email,
    roles: ['user'],
  });

  return { token, expiresIn: '1h' };
});

// Protected route
const protectedRoute = defineRoute({
  method: 'GET',
  url: '/profile',
  auth: 'jwt',
  handler: async (request) => {
    // request.user contains the decoded JWT payload
    return { userId: request.user.sub, email: request.user.email };
  },
});
```

### API Key Authentication

```typescript
const apiKeyRoute = defineRoute({
  method: 'POST',
  url: '/data',
  auth: 'apiKey',
  handler: async (request) => {
    // request.apiKey contains { id, name, permissions }
    return { createdBy: request.apiKey.name };
  },
});
```

### Mixed Authentication

```typescript
// Accept either JWT or API key
const flexibleRoute = defineRoute({
  method: 'GET',
  url: '/resource',
  auth: 'any',  // JWT or API key
  handler: async (request) => {
    const identity = request.user?.sub ?? request.apiKey?.name;
    return { identity };
  },
});
```

## Error Handling

### HTTP Errors (via @fastify/sensible)

```typescript
app.get('/users/:id', async (request) => {
  const user = await findUser(request.params.id);
  if (!user) {
    throw app.httpErrors.notFound('User not found');
  }
  return user;
});

// Available: badRequest, unauthorized, forbidden, notFound,
// conflict, gone, internalServerError, serviceUnavailable, etc.
```

### Structured Errors (AppError)

```typescript
import { AppError, ErrorCode } from '@palindrom/fastify-api';

// Factory methods
throw AppError.notFound('User', '123');
throw AppError.unauthorized('Token expired');
throw AppError.badRequest('Invalid input', { field: 'email' });
throw AppError.conflict('Email already exists');
throw AppError.validationError('Validation failed', { errors: [...] });

// Custom error
throw new AppError(ErrorCode.DATABASE_ERROR, 'Connection failed', {
  cause: originalError,
  details: { host: 'localhost' },
});
```

## Database

### Configuration

```typescript
const app = await createApp({
  db: {
    connectionString: 'postgres://user:pass@host:5432/db',
    poolSize: 10,        // Default: 10
    idleTimeout: 30,     // Default: 30 seconds
  },
});
```

### Usage

```typescript
// Raw SQL query
const result = await app.db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Drizzle ORM
import { users } from './db/schema';
const allUsers = await app.db.drizzle.select().from(users);

// Check if database is configured
if (app.db) {
  // Database operations
}
```

### Migrations

```bash
npm run db:generate  # Generate migrations from schema
npm run db:migrate   # Run pending migrations
npm run db:push      # Push schema changes directly (dev only)
npm run db:studio    # Open Drizzle Studio GUI
```

## Health Checks

Three endpoints are automatically registered:

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Full status | `{ status, timestamp, uptime, database? }` |
| `GET /health/live` | Liveness probe | `{ status: 'ok' }` |
| `GET /health/ready` | Readiness probe | `{ status: 'ready' }` or 503 |

## OpenAPI Documentation

When `docs` is configured, these endpoints are available:

- `GET /docs` - Scalar interactive documentation
- `GET /openapi.json` - OpenAPI 3.1 specification

```typescript
const app = await createApp({
  docs: {
    title: 'My API',
    description: 'Full API documentation',
    version: '1.0.0',
    path: '/docs',
  },
});
```

## Observability

### OpenTelemetry Tracing

```typescript
// Configure in createApp
const app = await createApp({
  observability: {
    otlpEndpoint: 'http://signoz:4318',
    requestLogging: true,
    attributes: { 'deployment.environment': 'production' },
  },
});
```

### Running with Tracing

```bash
# Set environment variables
export OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz:4318
export OTEL_SERVICE_NAME=my-api

# Run with tracing
node --import ./dist/tracing.js dist/server.js
```

### Testing Tracing Locally

```bash
# Console output (no SigNoz needed)
OTEL_CONSOLE_EXPORTER=true pnpm exec tsx scripts/test-tracing.ts
```

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | required | Application name |
| `server.port` | `number` | `3000` | Server port |
| `server.host` | `string` | `0.0.0.0` | Server host |
| `db.connectionString` | `string` | - | PostgreSQL connection URL |
| `db.poolSize` | `number` | `10` | Connection pool size |
| `db.idleTimeout` | `number` | `30` | Idle timeout (seconds) |
| `auth.jwt.secret` | `string` | - | JWT signing secret (min 32 chars) |
| `auth.jwt.issuer` | `string` | - | JWT issuer claim |
| `auth.jwt.audience` | `string` | - | JWT audience claim |
| `auth.jwt.expiresIn` | `string` | `1h` | Token expiration |
| `auth.apiKey.header` | `string` | `X-API-Key` | API key header name |
| `docs.title` | `string` | - | OpenAPI title |
| `docs.description` | `string` | - | OpenAPI description |
| `docs.version` | `string` | `1.0.0` | OpenAPI version |
| `docs.path` | `string` | `/docs` | Docs endpoint path |
| `logging.level` | `string` | `info` | Log level |
| `logging.pretty` | `boolean` | `true` (dev) | Pretty print logs |
| `observability.otlpEndpoint` | `string` | - | OTLP endpoint for SigNoz |
| `observability.requestLogging` | `boolean` | `true` | Enable request logging |

## Scripts

```bash
npm run build        # Build TypeScript
npm run dev          # Watch mode
npm run test         # Run tests (watch)
npm run test:run     # Run tests once
npm run test:e2e     # Run E2E tests only
npm run lint         # Lint code
npm run lint:fix     # Fix lint errors
npm run typecheck    # Type check
npm run docker:up    # Start PostgreSQL
npm run docker:down  # Stop PostgreSQL
```

## Examples

See the `examples/` directory:

- [`basic-server.ts`](examples/basic-server.ts) - Minimal setup
- [`full-api-server.ts`](examples/full-api-server.ts) - All features demonstrated

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
