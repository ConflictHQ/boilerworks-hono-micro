# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Boilerworks, please report it responsibly.

**Do not open a public issue.**

Instead, email **security@weareconflict.com** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge your report within 48 hours and aim to release a fix within 7 days for critical issues.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

## Security Best Practices

When deploying Boilerworks Hono Micro:

- Rotate the seeded dev API key before production use — create fresh keys via `POST /api-keys` and deactivate anything created by `pnpm seed`
- Grant the narrowest scopes per key (`events.read`, `events.write`, `events.delete`, `keys.manage`); avoid the `*` wildcard outside development
- Restrict the CORS `origin` in `src/index.ts` to your domains (the template ships with `*`)
- Store any external service secrets with `wrangler secret put`, never in `wrangler.toml` `[vars]` or source
- Set `ENVIRONMENT=production` in `wrangler.toml` `[vars]` for the production deployment
- The built-in rate limiter (60 req/min per IP) is per-isolate and in-memory — use Durable Objects, KV, or Cloudflare's rate limiting rules if you need distributed enforcement
