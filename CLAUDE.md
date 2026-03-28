# Claude -- Boilerworks Hono Micro

Primary conventions doc: [`bootstrap.md`](bootstrap.md)

Read it before writing any code.

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Frontend**: None (API-only)
- **API**: REST (JSON)
- **Database**: D1 (SQLite at the edge)
- **Auth**: API-key middleware (`X-API-Key` header, SHA256 hashed)
- **Validation**: Zod
- **Testing**: vitest + miniflare (Cloudflare Workers pool)

## Edge Template

This is an edge template. Production deployment targets Cloudflare Workers, not Docker. Local development uses `wrangler dev`.

## Commands

```bash
pnpm dev              # wrangler dev on :8787
pnpm test             # vitest with miniflare
pnpm lint             # eslint + prettier check
pnpm typecheck        # tsc --noEmit
```

## Rules

- API-key auth on all endpoints except /health.
- UUID primary keys (`crypto.randomUUID()`), never expose integer IDs.
- Soft deletes only: set `deleted_at`, never hard delete business objects.
- Scopes: `events.read`, `events.write`, `events.delete`, `keys.manage`, `*` (wildcard).
- All endpoints return `ApiResponse` shape: `{ok, data?, message?, errors?}`.
- Tests use real D1 via miniflare -- never mock the database.
- Input validation with Zod at handler boundaries.
- Prefer `Edit` over rewriting whole files.
- Run `pnpm lint` before committing.
