# Boilerworks Memory

This file is the **AI context seed** for the Boilerworks Hono Micro template. It captures decisions, constraints, and non-obvious facts that are not derivable from reading the code.

For conventions and patterns, see [`bootstrap.md`](bootstrap.md).

---

## Template purpose

Lightweight edge API microservice: Hono on Cloudflare Workers, D1 (SQLite at the edge), API-key auth. No frontend, no sessions, no Docker -- pure JSON API deployed to the edge.

---

## Current state

| Component  | Version / fact                                                             |
| ---------- | -------------------------------------------------------------------------- |
| Runtime    | Cloudflare Workers (no cold starts, no Docker in production)               |
| Framework  | Hono ^4 with `hono/factory` middleware                                     |
| Database   | D1 -- raw SQL via prepared statements, no ORM                              |
| Migrations | Plain SQL in `migrations/`, applied with `wrangler d1 migrations apply`    |
| Validation | Zod at handler boundaries                                                  |
| Testing    | vitest + `@cloudflare/vitest-pool-workers` (miniflare) against real D1     |
| Config     | `wrangler.toml` `[vars]` + `.dev.vars` for local secrets (no `.env` files) |

---

## Things that bite newcomers

- **The seed API key is printed once** by `pnpm seed` (`scripts/seed-api-key.ts` generates a random key); plaintext is never stored -- keys are SHA256-hashed in D1.
- **All endpoints except `/health` require `X-API-Key`** with a matching scope (`events.read`, `events.write`, `events.delete`, `keys.manage`, or `*`).
- **Rate limiting is global**: 60 requests/minute/IP via in-memory Map (`src/middleware/rate-limit.ts`), applied to every route including `/health`. It is per-isolate, not distributed -- swap for Durable Objects or KV if you need real enforcement.
- **Soft deletes only** -- business rows get `deleted_at`; queries filter with `WHERE deleted_at IS NULL`.
- **UUID primary keys** via `crypto.randomUUID()` -- never expose integer IDs.
- **All responses use the `ApiResponse` shape**: `{ok, data?, message?, errors?}`.
- **Tests hit real D1 via miniflare** -- never mock the database.
- **Local dev config lives in `wrangler.toml` and `.dev.vars`** (see `.dev.vars.example`), not `.env`.
