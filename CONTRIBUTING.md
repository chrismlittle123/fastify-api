# Contributing to @palindrom/fastify-api

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)

## Development Setup

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** (recommended) or npm
- **Docker** (for PostgreSQL)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/chrismlittle123/fastify-api.git
cd fastify-api

# Install dependencies
pnpm install

# Start PostgreSQL
pnpm run docker:up

# Verify setup
pnpm run typecheck
pnpm run test:run
```

### Environment Variables

Create a `.env` file for local development (optional):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fastify_api
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
```

## Project Structure

```
fastify-api/
├── src/                    # Source code
│   ├── index.ts           # Public exports
│   ├── app.ts             # App factory (createApp)
│   ├── server.ts          # Production entrypoint
│   ├── tracing.ts         # OpenTelemetry setup
│   ├── config/            # Configuration schema
│   ├── db/                # Database client & schema
│   ├── errors/            # AppError abstraction
│   ├── observability/     # Tracing utilities
│   ├── openapi/           # OpenAPI schema types
│   ├── plugins/           # Fastify plugins
│   │   ├── auth/          # JWT & API key auth
│   │   ├── health.ts      # Health check endpoints
│   │   ├── openapi.ts     # Swagger/Scalar docs
│   │   └── sensible.ts    # HTTP errors
│   └── routes/            # Route helpers
├── tests/                  # Unit tests
│   └── e2e/               # End-to-end tests
├── examples/               # Example servers
├── infra/                  # Pulumi IaC
├── scripts/                # Utility scripts
└── docs/                   # Documentation
```

### Key Files

| File | Purpose |
|------|---------|
| `src/app.ts` | Main `createApp()` factory function |
| `src/routes/index.ts` | `defineRoute()` and `registerRoute()` helpers |
| `src/errors/index.ts` | `AppError` class and error codes |
| `src/plugins/auth/` | Authentication plugins (JWT, API key) |
| `src/config/schema.ts` | Zod config validation schema |

## Development Workflow

### Running Locally

```bash
# Start PostgreSQL
pnpm run docker:up

# Run an example server
pnpm exec tsx examples/full-api-server.ts

# Or run in watch mode
pnpm run dev  # Compiles TypeScript on change
```

### Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes

3. Run checks:
   ```bash
   pnpm run typecheck   # Type checking
   pnpm run lint        # Linting
   pnpm run test:run    # Tests
   ```

4. Commit with descriptive message:
   ```bash
   git commit -m "Add feature X for Y purpose"
   ```

## Testing

### Test Structure

```
tests/
├── app.test.ts              # App creation tests
├── config.test.ts           # Config validation tests
├── health.test.ts           # Health endpoint tests
├── openapi.test.ts          # OpenAPI generation tests
├── sensible.test.ts         # HTTP errors tests
└── e2e/                     # End-to-end tests
    ├── setup.ts             # Test utilities
    ├── auth.e2e.test.ts     # Authentication tests
    ├── database.e2e.test.ts # Database tests
    ├── errors.e2e.test.ts   # Error handling tests
    ├── health.e2e.test.ts   # Health endpoint tests
    ├── methods.e2e.test.ts  # HTTP methods tests
    ├── openapi.e2e.test.ts  # OpenAPI tests
    └── validation.e2e.test.ts # Zod validation tests
```

### Running Tests

```bash
# Run all tests (requires PostgreSQL)
pnpm run docker:up
pnpm run test:run

# Run in watch mode
pnpm run test

# Run specific test file
pnpm exec vitest run tests/app.test.ts

# Run E2E tests only
pnpm run test:e2e

# Run with coverage
pnpm exec vitest run --coverage
```

### Writing Tests

Unit test example:

```typescript
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/index.js';

describe('createApp', () => {
  it('should create app with valid config', async () => {
    const app = await createApp({
      name: 'test-app',
      server: { port: 0 },  // Random port
    });

    expect(app).toBeDefined();
    expect(app.config.name).toBe('test-app');

    await app.close();
  });
});
```

E2E test example:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, type TestContext } from './setup.js';

describe('E2E: My Feature', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('should do something', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/my-endpoint',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## Code Style

### TypeScript

- Strict mode enabled
- Use `type` imports for type-only imports
- Prefer `interface` for object shapes
- Use `readonly` where applicable

```typescript
// Good
import type { FastifyInstance } from 'fastify';

interface UserConfig {
  readonly name: string;
  readonly email: string;
}

// Avoid
import { FastifyInstance } from 'fastify';  // If only used as type
```

### Formatting

ESLint handles formatting. Run:

```bash
pnpm run lint        # Check
pnpm run lint:fix    # Auto-fix
```

Key rules:
- No unused variables (prefix with `_` if intentional)
- Consistent type imports
- Array syntax: `string[]` not `Array<string>`

### Commit Messages

Follow conventional commits:

```
feat: add new authentication method
fix: resolve database connection leak
docs: update README with new examples
test: add E2E tests for validation
refactor: simplify route registration
chore: update dependencies
```

## Pull Request Process

1. **Create a branch** from `main`

2. **Make changes** following the code style

3. **Test thoroughly**:
   ```bash
   pnpm run typecheck
   pnpm run lint
   pnpm run test:run
   ```

4. **Push and create PR**:
   ```bash
   git push -u origin feature/my-feature
   ```

5. **PR Description** should include:
   - What changes were made
   - Why the changes were needed
   - How to test the changes
   - Any breaking changes

6. **Address review feedback**

7. **Squash and merge** once approved

### PR Checklist

- [ ] Types check (`pnpm run typecheck`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] All tests pass (`pnpm run test:run`)
- [ ] New features have tests
- [ ] Documentation updated if needed
- [ ] No console.log statements left behind

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Be descriptive in issue titles and descriptions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
