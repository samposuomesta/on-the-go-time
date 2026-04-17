#!/usr/bin/env bash
# TimeTrack self-hosted update script
#
# Run from: /opt/timetrack/
# Usage:    sudo /opt/timetrack/app/scripts/update.sh
#
# What it does:
#   1. Pulls the latest code from git into /opt/timetrack/app
#   2. Syncs all edge functions from app/supabase/functions/* to the
#      Supabase volume that the `functions` container bind-mounts
#      (/opt/timetrack/supabase-docker/docker/volumes/functions/)
#   3. Applies any pending database migrations from app/supabase/migrations/
#      using a schema_migrations tracking table (port 5433, bypasses Supavisor)
#   4. Installs npm deps and rebuilds the frontend (served by host Nginx)
#   5. Restarts the edge-functions container so new code is picked up
#      (and the rest container if any migrations were applied)
#
# Supabase-internal functions (main, hello) under volumes/functions are
# preserved — only directories that exist in the app repo are replaced.

set -euo pipefail

APP_DIR="/opt/timetrack/app"
FUNCTIONS_SRC="$APP_DIR/supabase/functions"
FUNCTIONS_DST="/opt/timetrack/supabase-docker/docker/volumes/functions"
MIGRATIONS_DIR="$APP_DIR/supabase/migrations"
COMPOSE_DIR="/opt/timetrack/supabase-docker/docker"
ENV_FILE="$COMPOSE_DIR/.env"

echo "==> [1/5] Pulling latest code from git"
cd "$APP_DIR"
git pull --ff-only

echo "==> [2/5] Syncing edge functions to Supabase volume"
if [ ! -d "$FUNCTIONS_SRC" ]; then
  echo "ERROR: $FUNCTIONS_SRC not found" >&2
  exit 1
fi
mkdir -p "$FUNCTIONS_DST"
for fn_dir in "$FUNCTIONS_SRC"/*/; do
  [ -d "$fn_dir" ] || continue
  fn_name=$(basename "$fn_dir")
  echo "    - $fn_name"
  rm -rf "${FUNCTIONS_DST:?}/$fn_name"
  cp -r "$fn_dir" "$FUNCTIONS_DST/$fn_name"
done

echo "==> [3/5] Applying pending database migrations"
MIGRATIONS_APPLIED=0
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "    No migrations directory found at $MIGRATIONS_DIR — skipping."
else
  # Load POSTGRES_PASSWORD from supabase-docker .env
  if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found — cannot read POSTGRES_PASSWORD" >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  if [ -z "${POSTGRES_PASSWORD:-}" ]; then
    echo "ERROR: POSTGRES_PASSWORD is empty in $ENV_FILE" >&2
    exit 1
  fi

  PSQL_CMD=(psql -h localhost -p 5433 -U postgres -d postgres -v ON_ERROR_STOP=1)

  # Ensure tracking table exists
  PGPASSWORD="$POSTGRES_PASSWORD" "${PSQL_CMD[@]}" -q -c "
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  " >/dev/null

  # Iterate migrations in lexicographic (timestamp) order
  shopt -s nullglob
  for mig_file in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    version="$(basename "$mig_file" .sql)"
    already_applied="$(PGPASSWORD="$POSTGRES_PASSWORD" "${PSQL_CMD[@]}" -tAq -c \
      "SELECT 1 FROM public.schema_migrations WHERE version = '$version' LIMIT 1;")"
    if [ "$already_applied" = "1" ]; then
      echo "    - $version ... already applied, skipped"
      continue
    fi
    echo "    - $version ... applying"
    # Run migration + record version atomically
    PGPASSWORD="$POSTGRES_PASSWORD" "${PSQL_CMD[@]}" --single-transaction \
      -f "$mig_file" \
      -c "INSERT INTO public.schema_migrations (version) VALUES ('$version');"
    MIGRATIONS_APPLIED=$((MIGRATIONS_APPLIED + 1))
    echo "    - $version ... applied ✓"
  done
  shopt -u nullglob

  if [ "$MIGRATIONS_APPLIED" -eq 0 ]; then
    echo "    No pending migrations."
  else
    echo "    Applied $MIGRATIONS_APPLIED migration(s). Reloading PostgREST schema cache..."
    cd "$COMPOSE_DIR"
    docker compose restart rest
    cd "$APP_DIR"
  fi
fi

echo "==> [4/5] Building frontend"
cd "$APP_DIR"
npm ci
npm run build

echo "==> [5/5] Restarting edge-functions container"
cd "$COMPOSE_DIR"
docker compose restart functions

echo ""
echo "==> Done. Verifying deployed functions:"
sleep 5
docker compose exec -T functions ls /home/deno/functions/ || true

echo ""
echo "✅ Update complete."
