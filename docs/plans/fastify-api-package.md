# Fastify API Package Plan

## Overview

Create an internal TypeScript package that provides a batteries-included Fastify API setup with standardized patterns, OpenAPI generation, and seamless integration with `chrismlittle123/infra` and `chrismlittle123/monitoring`.

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Target Audience | Internal team only |
| Error Format | Fastify Sensible |
| Authentication | JWT + API Keys |
| Database | Drizzle ORM |
| Configuration Style | Single config object |
| Deployment Target | ECS Fargate (long-running) |
| Infrastructure | AWS via Pulumi (chrismlittle123/infra) |
| Monitoring | SigNoz + GlitchTip (chrismlittle123/monitoring) |

---

## Package Architecture

### Core API

```typescript
import { createApp } from '@progression-labs/fastify-api';

const app = await createApp({
  name: 'my-service',

  // Database (Drizzle)
  db: {
    connectionString: process.env.DATABASE_URL,
    schema: './src/db/schema.ts',
  },

  // Authentication
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
      issuer: 'my-service',
    },
    apiKeys: {
      header: 'X-API-Key',
      validate: async (key) => lookupApiKey(key),
    },
  },

  // OpenAPI / Scalar Docs
  docs: {
    title: 'My Service API',
    version: '1.0.0',
    path: '/docs',
  },

  // Monitoring (SigNoz + GlitchTip integration)
  monitoring: {
    signoz: {
      endpoint: process.env.SIGNOZ_ENDPOINT,
    },
    glitchtip: {
      dsn: process.env.GLITCHTIP_DSN,
    },
  },
});

await app.listen({ port: 3000, host: '0.0.0.0' });
```

---

## Feature Modules

### 1. Zod-First Route Definition

Routes defined with Zod schemas as the source of truth, automatically generating OpenAPI specs.

```typescript
import { z } from 'zod';
import { defineRoute } from '@progression-labs/fastify-api';

const GetUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  response: {
    200: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string(),
    }),
  },
};

export const getUser = defineRoute({
  method: 'GET',
  url: '/users/:id',
  schema: GetUserSchema,
  auth: 'jwt', // or 'apiKey' or 'public'
  handler: async (request, reply) => {
    const { id } = request.params;
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) throw app.httpErrors.notFound('User not found');
    return user;
  },
});
```

### 2. Standardized Errors (Fastify Sensible)

Leverage `@fastify/sensible` for consistent HTTP errors.

```typescript
// Automatically available on app instance
throw app.httpErrors.notFound('Resource not found');
throw app.httpErrors.unauthorized('Invalid token');
throw app.httpErrors.badRequest('Validation failed');

// Custom error with additional data
throw app.httpErrors.createError(422, 'Validation failed', {
  errors: [{ field: 'email', message: 'Invalid format' }],
});
```

### 3. Authentication Middleware

**JWT Authentication:**
```typescript
// Automatically decoded and validated
request.user // { sub: 'user-id', email: '...', roles: [...] }
```

**API Key Authentication:**
```typescript
// Validated against your lookup function
request.apiKey // { id: 'key-id', permissions: [...] }
```

### 4. Drizzle ORM Integration

```typescript
// Database client available on app
app.db // Drizzle instance

// In route handlers
const users = await app.db.query.users.findMany();
```

**Migrations via CLI:**
```bash
npx @progression-labs/fastify-api db:migrate
npx @progression-labs/fastify-api db:generate
npx @progression-labs/fastify-api db:push
```

### 5. OpenAPI & Scalar Docs

- Auto-generates OpenAPI 3.1 spec from Zod schemas
- Scalar documentation UI at `/docs`
- Export OpenAPI YAML: `npx @progression-labs/fastify-api openapi:export`

### 6. Monitoring Integration

**SigNoz (Tracing & Metrics):**
- Automatic request tracing
- Custom spans via `app.tracer`
- Metrics collection (request duration, error rates)

**GlitchTip (Error Tracking):**
- Automatic error capture
- Context enrichment (user, request data)
- Source maps support

---

## Package Structure

```
@progression-labs/fastify-api/
├── src/
│   ├── index.ts              # Main exports
│   ├── app.ts                # createApp factory
│   ├── config.ts             # Configuration types & validation
│   ├── plugins/
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   └── api-key.ts
│   │   ├── database/
│   │   │   └── drizzle.ts
│   │   ├── docs/
│   │   │   ├── openapi.ts
│   │   │   └── scalar.ts
│   │   ├── errors/
│   │   │   └── sensible.ts
│   │   └── monitoring/
│   │       ├── signoz.ts
│   │       └── glitchtip.ts
│   ├── routes/
│   │   └── define-route.ts   # Route definition helper
│   ├── utils/
│   │   └── zod-to-json-schema.ts
│   └── cli/
│       ├── index.ts
│       ├── db-commands.ts
│       └── openapi-commands.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Dependencies

### Core
- `fastify` - Web framework
- `@fastify/sensible` - Standardized errors
- `@fastify/swagger` - OpenAPI generation
- `@fastify/jwt` - JWT authentication
- `zod` - Schema validation
- `zod-to-json-schema` - Zod to JSON Schema conversion

### Database
- `drizzle-orm` - ORM
- `drizzle-kit` - Migrations CLI
- `postgres` / `@neondatabase/serverless` - PostgreSQL driver

### Documentation
- `@scalar/fastify-api-reference` - Scalar docs UI

### Monitoring
- `@opentelemetry/sdk-node` - Tracing
- `@opentelemetry/exporter-trace-otlp-http` - SigNoz export
- `@sentry/node` - GlitchTip client (Sentry-compatible)

---

## Integration with Infra Package

The `chrismlittle123/infra` package will provision:

1. **ECS Fargate Service** - Container runtime
2. **Application Load Balancer** - Traffic routing
3. **RDS PostgreSQL** - Database
4. **Secrets Manager** - JWT secrets, API keys
5. **CloudWatch** - Log aggregation

**Deployment config in infra:**
```typescript
import { FastifyService } from '@progression-labs/infra';

new FastifyService('my-api', {
  image: 'my-api:latest',
  environment: {
    DATABASE_URL: db.connectionString,
    JWT_SECRET: secrets.jwtSecret,
  },
  monitoring: {
    signozEndpoint: monitoring.signozEndpoint,
    glitchtipDsn: monitoring.glitchtipDsn,
  },
});
```

---

## Implementation Phases

### Phase 1: Core Foundation
- [ ] Project setup (TypeScript, ESLint, Vitest)
- [ ] `createApp` factory with config validation
- [ ] Fastify Sensible integration
- [ ] Basic health check endpoint

### Phase 2: Zod & OpenAPI
- [ ] Route definition helper with Zod schemas
- [ ] Zod to JSON Schema conversion
- [ ] OpenAPI spec generation
- [ ] Scalar docs integration

### Phase 3: Authentication
- [ ] JWT plugin with validation
- [ ] API Key plugin with custom validator
- [ ] Route-level auth configuration
- [ ] Request context typing

### Phase 4: Database
- [ ] Drizzle ORM setup
- [ ] Connection pooling
- [ ] CLI commands for migrations
- [ ] Transaction helpers

### Phase 5: Monitoring
- [ ] OpenTelemetry tracing setup
- [ ] SigNoz exporter integration
- [ ] GlitchTip error capture
- [ ] Request context propagation

### Phase 6: Polish & Documentation
- [ ] Comprehensive README
- [ ] Example project
- [ ] TypeScript declarations
- [ ] Integration tests

---

## Open Questions

1. **Schema location**: Should Drizzle schemas live in a conventional location or be configurable?
2. **Multi-tenancy**: Any requirements for tenant isolation at the DB level?
3. **Rate limiting**: Should the package include rate limiting, or handle via infra (ALB)?
4. **CORS**: Default CORS configuration for internal services?
5. **Healthchecks**: Standard healthcheck endpoint format for ECS?

---

## Next Steps

1. Review and approve this plan
2. Create package scaffolding
3. Implement Phase 1 (Core Foundation)
4. Iterate based on feedback
