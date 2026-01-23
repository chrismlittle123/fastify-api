# @palindrom/fastify-api

Batteries-included Fastify API framework with Zod schemas, OpenAPI generation, and standardized patterns.

## Features

- **Single config object** - Simple `createApp({ ... })` API
- **Zod as source of truth** - Define schemas once, get validation + OpenAPI
- **Standardized errors** - Built-in HTTP errors via `@fastify/sensible`
- **Drizzle ORM** - Type-safe database access with PostgreSQL
- **Health checks** - `/health`, `/health/live`, `/health/ready` endpoints
- **Docker ready** - PostgreSQL 16 via docker-compose

## Quick Start

```bash
# Start PostgreSQL
npm run docker:up

# Run example server
npx tsx examples/basic-server.ts
```

## Usage

```typescript
import { createApp } from '@palindrom/fastify-api';

const app = await createApp({
  name: 'my-api',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  db: {
    connectionString: process.env.DATABASE_URL,
  },
  logging: {
    level: 'info',
    pretty: true,
  },
});

// Add routes
app.get('/hello', async () => {
  return { message: 'Hello!' };
});

// Use standardized errors
app.get('/users/:id', async (request) => {
  const user = await findUser(request.params.id);
  if (!user) {
    throw app.httpErrors.notFound('User not found');
  }
  return user;
});

// Start server
await app.start();
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | required | Application name |
| `server.port` | `number` | `3000` | Server port |
| `server.host` | `string` | `0.0.0.0` | Server host |
| `db.connectionString` | `string` | - | PostgreSQL connection URL |
| `db.poolSize` | `number` | `10` | Connection pool size |
| `db.idleTimeout` | `number` | `30` | Idle connection timeout (seconds) |
| `logging.level` | `string` | `info` | Log level |
| `logging.pretty` | `boolean` | `true` (dev) | Pretty print logs |

## Health Checks

Three endpoints are automatically registered:

- `GET /health` - Full health status with database check
- `GET /health/live` - Simple liveness probe
- `GET /health/ready` - Readiness probe (checks database)

## Database

Access Drizzle ORM via `app.db`:

```typescript
// Raw query
const result = await app.db.query('SELECT NOW()');

// Drizzle ORM
import { users } from './db/schema';
const allUsers = await app.db.drizzle.select().from(users);
```

### Migrations

```bash
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes (dev)
npm run db:studio    # Open Drizzle Studio
```

## Scripts

```bash
npm run build        # Build TypeScript
npm run dev          # Watch mode
npm run test         # Run tests
npm run lint         # Lint code
npm run docker:up    # Start PostgreSQL
npm run docker:down  # Stop PostgreSQL
```

## License

MIT
