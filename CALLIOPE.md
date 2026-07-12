# Calliope — Boilerworks Hono Micro
<!-- Agent shim for https://github.com/calliopeai/calliope-cli -->

Primary conventions doc: [`bootstrap.md`](bootstrap.md)
Context seed: [`memory.md`](memory.md)

Read both before writing any code.

---

## Project-specific notes

- Edge template: Hono on Cloudflare Workers, D1 (SQLite at the edge), Zod validation. Production targets Workers, not Docker; local dev via `wrangler dev` (:8787).
- API-key auth (`X-API-Key`, SHA256-hashed) on all endpoints except `/health`; scopes `events.read`, `events.write`, `events.delete`, `keys.manage`, `*`.
- UUID primary keys via `crypto.randomUUID()`; soft deletes via `deleted_at` (`WHERE deleted_at IS NULL`) — never hard delete business objects.
- All responses use the `ApiResponse` shape `{ok, data?, message?, errors?}`; global rate limit 60 req/min per IP (per-isolate only — swap for Durable Objects/KV for distributed limits).
- D1 migrations are plain SQL in `migrations/` (`wrangler d1 migrations apply`); no ORM by default — raw SQL with D1 prepared statements.
- Tests use real D1 via miniflare — never mock the database; run `pnpm lint` before committing.
