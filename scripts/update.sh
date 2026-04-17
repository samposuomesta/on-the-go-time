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
#   3. Installs npm deps and rebuilds the frontend (served by host Nginx)
#   4. Restarts the edge-functions container so new code is picked up
#
# Supabase-internal functions (main, hello) under volumes/functions are
# preserved — only directories that exist in the app repo are replaced.

set -euo pipefail

APP_DIR="/opt/timetrack/app"
FUNCTIONS_SRC="$APP_DIR/supabase/functions"
FUNCTIONS_DST="/opt/timetrack/supabase-docker/docker/volumes/functions"
COMPOSE_DIR="/opt/timetrack/supabase-docker/docker"

echo "==> [1/4] Pulling latest code from git"
cd "$APP_DIR"
git pull --ff-only

echo "==> [2/4] Syncing edge functions to Supabase volume"
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

echo "==> [3/4] Building frontend"
cd "$APP_DIR"
npm ci
npm run build

echo "==> [4/4] Restarting edge-functions container"
cd "$COMPOSE_DIR"
docker compose restart functions

echo ""
echo "==> Done. Verifying deployed functions:"
sleep 5
docker compose exec -T functions ls /home/deno/functions/ || true

echo ""
echo "✅ Update complete."
