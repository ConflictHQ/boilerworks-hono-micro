# Claude -- Boilerworks Hono Micro

Primary conventions doc: [`bootstrap.md`](bootstrap.md)

Read it before writing any code.

## Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Frontend**: None (API-only)
- **API**: REST (OpenAPI)
- **Database**: D1 or Turso
- **KV**: Cloudflare KV
- **Queues**: Cloudflare Queues

## Edge Template

This is an edge template. Production deployment targets Cloudflare Workers, not Docker. Local development uses `wrangler dev`.

## Status

This template is planned. See the [stack primer](../primers/hono-micro/PRIMER.md) for architecture decisions and build order.
