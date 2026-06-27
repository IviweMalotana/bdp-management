#!/usr/bin/env bash
# Migrate the database from Neon -> VPS PostgreSQL.
# Run on the VPS (it needs outbound access to Neon + a local Postgres ready).
#
#   NEON_URL='postgresql://user:pass@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require' \
#   VPS_URL='postgresql://bdp:CHANGE_ME@localhost:5432/bdp' \
#   bash deploy/migrate-db.sh
set -euo pipefail

: "${NEON_URL:?Set NEON_URL to your current Neon connection string}"
: "${VPS_URL:?Set VPS_URL to the local VPS Postgres connection string}"

DUMP="/tmp/bdp-neon-$(date +%Y%m%d%H%M).dump"

echo "== Dumping Neon -> $DUMP =="
pg_dump "$NEON_URL" --no-owner --no-privileges --format=custom --file="$DUMP"

echo "== Restoring into VPS Postgres =="
# --clean --if-exists makes the restore re-runnable; drop it for a first load into an empty DB.
pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$VPS_URL" "$DUMP"

echo "== Row sanity check =="
psql "$VPS_URL" -c "\dt" | head -n 40

echo "Done. The API also runs EF migrations on boot, so schema drift self-heals."
echo "Keep $DUMP and your Neon project until you've verified the cutover."
