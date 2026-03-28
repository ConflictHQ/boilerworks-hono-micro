# Boilerworks Hono Micro -- Bootstrap

> Hono on Cloudflare Workers. Lightweight edge API with globally distributed low-latency responses.

See the [Boilerworks Catalogue](../primers/CATALOGUE.md) for philosophy and universal patterns.

See the [stack primer](../primers/hono-micro/PRIMER.md) for stack-specific conventions and build order.

## Conventions

- **UUID primary keys** via `crypto.randomUUID()`. Never expose integer PKs.
- **Soft deletes** via `deleted_at` column. Filter with `WHERE deleted_at IS NULL`.
- **API key auth** on all endpoints except `/health`. SHA256-hashed keys in D1.
- **Scope-based permissions** per API key. Wildcard `*` grants all access.
- **ApiResponse** wrapper on all responses: `{ok: boolean, data?, message?, errors?}`.
- **Zod** for input validation at handler boundaries.
- **D1 migrations** are plain SQL in `migrations/`. Apply with `wrangler d1 migrations apply`.
- **No ORM** by default. Raw SQL with D1 prepared statements.
- **Tests** use real D1 via miniflare. Never mock the database.
