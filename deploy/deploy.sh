#!/usr/bin/env bash
# Build all three apps locally and rsync them to the VPS, then restart services.
# Run from the repo root on your dev machine (avoids OOM-building on a small VPS).
#
#   VPS_HOST=<VPS_IP> VPS_USER=deploy bash deploy/deploy.sh
#
# Requires locally: dotnet 8 SDK, bun, node, rsync, ssh access to the VPS.
set -euo pipefail

: "${VPS_HOST:?Set VPS_HOST to your VPS IP/hostname}"
VPS_USER="${VPS_USER:-deploy}"
SSH="$VPS_USER@$VPS_HOST"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== 1/3 API (dotnet publish) =="
dotnet publish BDP.API/BDP.API.csproj -c Release -o /tmp/bdp-api-publish
# Preserve runtime uploads/invoices on the server (never delete them).
rsync -az --delete \
  --exclude 'wwwroot/uploads' --exclude 'wwwroot/invoices' \
  /tmp/bdp-api-publish/ "$SSH:/var/www/bdp-api/"

echo "== 2/3 Storefront (next build) =="
( cd BDP.Storefront && bun install && bun run build )
# Ship the built app; run `bun install --production` on the server for runtime deps.
rsync -az --delete \
  BDP.Storefront/.next BDP.Storefront/public BDP.Storefront/package.json \
  BDP.Storefront/bun.lock BDP.Storefront/next.config.ts \
  "$SSH:/var/www/bdp-storefront/"
ssh "$SSH" 'cd /var/www/bdp-storefront && ~/.bun/bin/bun install --production'

echo "== 3/3 Admin portal (vite build) =="
( cd BDP.Web && npm ci && npm run build )
rsync -az --delete BDP.Web/dist/ "$SSH:/var/www/admin/"

echo "== Restart services =="
ssh "$SSH" 'sudo systemctl restart bdp-api bdp-storefront && sudo systemctl reload nginx'
echo "Deployed. Check: systemctl status bdp-api bdp-storefront"
