# Development Runbook

Step-by-step guides for common development tasks.

## Table of Contents

- [First Time Setup](#first-time-setup)
- [Daily Development](#daily-development)
- [Running Tests](#running-tests)
- [Database Operations](#database-operations)
- [Debugging](#debugging)
- [Tracing & Observability](#tracing--observability)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## First Time Setup

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/chrismlittle123/fastify-api.git
cd fastify-api

# Install pnpm if not installed
npm install -g pnpm

# Install dependencies
pnpm install
```

### 2. Start Docker

```bash
# Start Docker Desktop (macOS)
open -a Docker

# Wait for Docker to be ready, then start PostgreSQL
pnpm run docker:up

# Verify PostgreSQL is running
docker ps
# Should show: fastify-api-postgres   Up X minutes (healthy)
```

### 3. Verify Setup

```bash
# Run all checks
pnpm run typecheck   # Should pass
pnpm run lint        # Should pass
pnpm run test:run    # Should show 97 tests passing
```

### 4. Run Example Server

```bash
# Start full-featured example
pnpm exec tsx examples/full-api-server.ts

# Open in browser
open http://localhost:3000/docs
```

---

## Daily Development

### Start Development Environment

```bash
# Terminal 1: Start PostgreSQL
pnpm run docker:up

# Terminal 2: Watch mode (recompiles on changes)
pnpm run dev

# Terminal 3: Run example server
pnpm exec tsx examples/full-api-server.ts
```

### Build and Type Check

```bash
# Full build
pnpm run build

# Type check only (faster)
pnpm run typecheck
```

### Lint Code

```bash
# Check for issues
pnpm run lint

# Auto-fix issues
pnpm run lint:fix
```

---

## Running Tests

### Prerequisites

PostgreSQL must be running:

```bash
pnpm run docker:up
```

### Run All Tests

```bash
# Single run
pnpm run test:run

# Watch mode (re-runs on file changes)
pnpm run test
```

### Run Specific Tests

```bash
# Single test file
pnpm exec vitest run tests/app.test.ts

# E2E tests only
pnpm run test:e2e

# Tests matching pattern
pnpm exec vitest run -t "authentication"

# Tests in specific directory
pnpm exec vitest run tests/e2e/
```

### Test Coverage

```bash
pnpm exec vitest run --coverage
```

### Test Without Database

Some tests require PostgreSQL. To run only unit tests:

```bash
pnpm exec vitest run tests/app.test.ts tests/config.test.ts tests/health.test.ts
```

---

## Database Operations

### Start/Stop PostgreSQL

```bash
# Start
pnpm run docker:up

# Stop
pnpm run docker:down

# Check status
docker ps | grep fastify-api-postgres
```

### Connect to Database

```bash
# Using psql
docker exec -it fastify-api-postgres psql -U postgres -d fastify_api

# Or using connection string
psql postgres://postgres:postgres@localhost:5432/fastify_api
```

### Database Migrations (Drizzle)

```bash
# Generate migration from schema changes
pnpm run db:generate

# Run pending migrations
pnpm run db:migrate

# Push schema directly (development only!)
pnpm run db:push

# Open Drizzle Studio (visual database browser)
pnpm run db:studio
```

### Reset Database

```bash
# Stop and remove volume
pnpm run docker:down
docker volume rm fastify-api_postgres_data

# Start fresh
pnpm run docker:up
```

---

## Debugging

### Enable Debug Logging

```bash
# Set log level
LOG_LEVEL=debug pnpm exec tsx examples/basic-server.ts
```

### Debug Tests

```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/vitest run tests/app.test.ts

# Then open chrome://inspect in Chrome
```

### Debug Server

```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/tsx examples/full-api-server.ts

# Attach debugger in VS Code or Chrome DevTools
```

### VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Example Server",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["exec", "tsx", "examples/full-api-server.ts"],
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["exec", "vitest", "run", "--no-file-parallelism"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Tracing & Observability

### Test Tracing Locally

```bash
# Console output (no SigNoz needed)
OTEL_CONSOLE_EXPORTER=true pnpm exec tsx scripts/test-tracing.ts
```

### Run with SigNoz

```bash
# Set endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT=http://your-signoz:4318
export OTEL_SERVICE_NAME=fastify-api

# Build first
pnpm run build

# Run with tracing
node --import ./dist/tracing.js dist/server.js
```

### Debug Tracing

```bash
# Enable OTEL debug logging
OTEL_DEBUG=true OTEL_CONSOLE_EXPORTER=true pnpm exec tsx scripts/test-tracing.ts
```

---

## Deployment

### Build for Production

```bash
# Clean and build
pnpm run clean
pnpm run build

# Verify dist/
ls -la dist/
```

### Docker Build

```bash
# Build image
docker build -t fastify-api:latest .

# Run container
docker run -p 8080:8080 \
  -e JWT_SECRET="your-secret-at-least-32-characters" \
  -e DATABASE_URL="postgres://..." \
  fastify-api:latest
```

### Deploy to GCP Cloud Run

```bash
cd infra

# Preview changes
pulumi preview

# Deploy
pulumi up
```

---

## Troubleshooting

### PostgreSQL Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check if Docker is running
docker info

# Check if container is healthy
docker ps

# Restart PostgreSQL
pnpm run docker:down
pnpm run docker:up

# Wait for healthy status
docker ps  # Should show "(healthy)"
```

### Tests Failing with Database Errors

```
E2E: Database Integration > should connect to database
AssertionError: expected 500 to be 200
```

**Solution:**
```bash
# Ensure PostgreSQL is running and healthy
pnpm run docker:up
sleep 5  # Wait for startup
pnpm run test:run
```

### TypeScript Errors After Pull

```
Cannot find module 'X' or its corresponding type declarations
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Rebuild
pnpm run build
```

### ESLint Not Finding Config

```
Cannot find package 'typescript-eslint'
```

**Solution:**
```bash
pnpm add -D typescript-eslint @eslint/js
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 pnpm exec tsx examples/basic-server.ts
```

### Docker Out of Space

```
No space left on device
```

**Solution:**
```bash
# Remove unused Docker resources
docker system prune -a

# Remove unused volumes
docker volume prune
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Start PostgreSQL | `pnpm run docker:up` |
| Stop PostgreSQL | `pnpm run docker:down` |
| Build | `pnpm run build` |
| Type check | `pnpm run typecheck` |
| Lint | `pnpm run lint` |
| Run tests | `pnpm run test:run` |
| Watch tests | `pnpm run test` |
| Run example | `pnpm exec tsx examples/full-api-server.ts` |
| Database studio | `pnpm run db:studio` |

---

## Getting Help

1. Check this runbook first
2. Search existing GitHub issues
3. Ask in team chat
4. Create a new issue with:
   - What you're trying to do
   - What you expected
   - What actually happened
   - Steps to reproduce
