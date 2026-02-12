# Agent Instructions

## Project Overview

fastify-api is an opinionated Fastify application framework with built-in observability, OpenAPI, and database support. Built with TypeScript.

- **Tier:** internal
- **Package:** `@chrismlittle123/fastify-api`

## Quick Reference

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Build | `pnpm build` |
| Test | `pnpm test` |
| Lint | `pnpm lint` |
| Type check | `pnpm typecheck` |

## Architecture

```
src/
  app.ts           # Application factory
  config/          # Configuration loading
  db/              # Database (Drizzle ORM)
  errors/          # Error handling
  observability/   # Tracing, metrics
  openapi/         # OpenAPI schema generation
  plugins/         # Fastify plugins
  routes/          # Route definitions
```

See `docs/` for detailed architecture documentation.

## Standards & Guidelines

This project uses [@standards-kit/conform](https://github.com/chrismlittle123/standards-kit) for coding standards.

- **Config:** `standards.toml` (extends `typescript-internal` from the standards registry)
- **Guidelines:** https://chrismlittle123.github.io/standards/

Use the MCP tools to query standards at any time:

| Tool | Purpose |
|------|---------|
| `get_standards` | Get guidelines matching a context (e.g., `typescript fastify`) |
| `list_guidelines` | List all available guidelines |
| `get_guideline` | Get a specific guideline by ID |
| `get_ruleset` | Get a tool configuration ruleset (e.g., `typescript-internal`) |

## Workflow

- **Branch:** Create feature branches from `main`
- **CI:** GitHub Actions runs build, test, lint on PRs
- **Deploy:** npm publish
- **Commits:** Use conventional commits (`feat:`, `fix:`, `chore:`, etc.)
