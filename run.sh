#!/usr/bin/env bash
set -euo pipefail

# Boilerworks — Hono Micro (Cloudflare Workers)
# Usage: ./run.sh [command]

case "${1:-help}" in
    up|start)
        npx wrangler dev
        ;;
    down|stop)
        echo "No persistent services to stop (edge runtime)"
        ;;
    restart)
        echo "Restart not applicable — run ./run.sh up to start dev server"
        ;;
    status|ps)
        echo "No Docker services (edge runtime)"
        ;;
    logs)
        echo "Dev server logs appear in the terminal when running ./run.sh up"
        ;;
    seed)
        npx tsx scripts/seed-api-key.ts
        ;;
    test)
        npx vitest run
        ;;
    lint)
        npx eslint . && npx prettier --check .
        ;;
    shell)
        echo "No backend container — this runs on Cloudflare Workers"
        ;;
    migrate)
        npx wrangler d1 migrations apply boilerworks-db --local
        ;;
    help|*)
        echo "Usage: ./run.sh <command>"
        echo ""
        echo "Commands:"
        echo "  up, start     Start wrangler dev server"
        echo "  seed          Seed API key"
        echo "  test          Run tests"
        echo "  lint          Run linters"
        echo "  migrate       Apply D1 migrations (local)"
        echo "  help          Show this help"
        ;;
esac
