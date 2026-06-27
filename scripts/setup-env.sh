#!/usr/bin/env bash
set -euo pipefail

echo "=== KaLI Environment Setup ==="
echo ""

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
  echo "⚠ .env already exists. Backing up to .env.backup.$(date +%s)"
  cp "$ENV_FILE" ".env.backup.$(date +%s)"
fi

cp .env.example "$ENV_FILE"

echo "✔ Created .env from .env.example"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your API keys"
echo ""
echo "  ┌──────────────────────────────────────────────────────────────┐"
echo "  │ FEATHERLESS_API_KEY — Free coupon AIKENYA26                  │"
echo "  │   https://featherless.ai                                     │"
echo "  │                                                              │"
echo "  │ MASUMI_API_KEY — Bounty recording passcode: 9b^FYx2L         │"
echo "  │   https://masumi.network                                      │"
echo "  │                                                              │"
echo "  │ AT_API_KEY — Africa's Talking sandbox                        │"
echo "  │   https://account.africastalking.com                          │"
echo "  └──────────────────────────────────────────────────────────────┘"
echo ""
echo "  3. Start Neo4j:  docker compose -f docker-compose.neo4j.yml up -d"
echo "  4. Seed DB:      cd backend && npm run seed"
echo "  5. Start API:    cd backend && npm run dev"
echo "  6. Start UI:     cd frontend && npm run dev"
echo ""
echo "Happy hacking! 🌱"
