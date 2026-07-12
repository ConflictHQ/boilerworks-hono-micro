# Boilerworks Hono Micro

> Edge template -- Hono API microservice on Cloudflare Workers. API-key auth, no user auth. No frontend.

Hono-based edge API microservice running on Cloudflare Workers. API-key authentication with SHA256-hashed keys, scope-based permissions, Events CRUD with soft deletes. Ultra-low latency via edge deployment, no cold starts, no Docker in production.

**Edge template** -- production deployment targets Cloudflare Workers, not Docker.

## Quick Start

```bash
pnpm install
pnpm db:migrate:local   # Apply D1 migrations locally
pnpm seed               # Create a dev API key (prints to stdout)
pnpm dev                # Start wrangler dev server on :8787
```

## Endpoints

| Method | Path            | Auth            | Description             |
| ------ | --------------- | --------------- | ----------------------- |
| GET    | `/health`       | None            | Health check            |
| POST   | `/events`       | `events.write`  | Create an event         |
| GET    | `/events`       | `events.read`   | List events (paginated) |
| GET    | `/events/:id`   | `events.read`   | Get a single event      |
| PATCH  | `/events/:id`   | `events.write`  | Update an event         |
| DELETE | `/events/:id`   | `events.delete` | Soft-delete an event    |
| POST   | `/api-keys`     | `keys.manage`   | Create an API key       |
| GET    | `/api-keys`     | `keys.manage`   | List API keys           |
| DELETE | `/api-keys/:id` | `keys.manage`   | Deactivate an API key   |

## Authentication

All endpoints except `/health` require an `X-API-Key` header. Keys are SHA256-hashed and stored in D1. Each key has scopes (`["*"]` for wildcard).

## Rate Limiting

A global rate limiter (`src/middleware/rate-limit.ts`) allows 60 requests per minute per IP across all routes, including `/health`. Responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers; exceeding the limit returns `429`. The store is an in-memory Map scoped to a single Workers isolate — fine for burst protection, not distributed enforcement. Swap in Durable Objects or KV if you need a shared counter.

## Commands

```bash
pnpm dev              # Local dev server (wrangler)
pnpm test             # Run vitest with miniflare
pnpm lint             # ESLint + Prettier check
pnpm lint:fix         # Auto-fix lint/format
pnpm typecheck        # TypeScript type check
pnpm deploy           # Deploy to Cloudflare Workers
pnpm db:migrate:local # Apply migrations locally
pnpm seed             # Seed a dev API key
```

## Environment Configuration

Runtime vars are set in `wrangler.toml` under `[vars]`:

| Variable    | Default     | Description         |
| ----------- | ----------- | ------------------- |
| ENVIRONMENT | development | Runtime environment |

The D1 database binding is configured in `wrangler.toml` under `[[d1_databases]]`. For local dev, `wrangler dev` creates a local SQLite database automatically. For production, create a D1 database via `wrangler d1 create boilerworks-db` and update the `database_id`.

Local dev secrets go in `.dev.vars` (gitignored) — see `.dev.vars.example` for a reference. No `.env` files are used.

## Project Structure

```
src/
  index.ts              # Hono app entry point
  types.ts              # TypeScript types (Env, ApiResponse, row types)
  lib/
    crypto.ts           # SHA256 hashing via Web Crypto API
  middleware/
    api-key-auth.ts     # API key validation middleware
    require-scope.ts    # Scope-checking middleware
    rate-limit.ts       # Global 60 req/min/IP limiter (in-memory, per-isolate)
  routes/
    health.ts           # GET /health
    events.ts           # Events CRUD
    api-keys.ts         # API key management
migrations/
  0001_create_api_keys.sql
  0002_create_events.sql
test/
  helpers.ts            # Test utilities (seed, migrate, cleanup)
  health.test.ts
  auth.test.ts
  events.test.ts
  rate-limit.test.ts
scripts/
  seed-api-key.ts       # Local dev key seeder
```

## Want to help build this?

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [stack primer](../primers/hono-micro/PRIMER.md) for architecture and conventions.

---

Boilerworks is a [CONFLICT](https://weareconflict.com) brand. CONFLICT is a registered trademark of CONFLICT LLC.
