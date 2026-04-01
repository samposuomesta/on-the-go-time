#!/usr/bin/env bash
# setup-first-admin.sh — Idempotent first-admin provisioning
# Creates a default company + admin user in the database,
# then provisions a Supabase Auth account via the Kong API.
#
# Usage:
#   cd /opt/timetrack/app
#   bash scripts/setup-first-admin.sh
#
# Prerequisites:
#   - Supabase services running (docker compose up -d)
#   - postgresql-client installed (psql)
#   - Port 5433 exposed (via docker-compose.override.yml)

set -euo pipefail

ENV_FILE="/opt/timetrack/supabase-docker/docker/.env"
SEED_SQL="$(dirname "$0")/seed-defaults.sql"

ADMIN_EMAIL="admin@timetrack.local"
ADMIN_PASSWORD="ChangeMe123!"

# ── Helpers ──────────────────────────────────────────────────
die()  { echo "❌ $*" >&2; exit 1; }
info() { echo "ℹ️  $*"; }
ok()   { echo "✅ $*"; }

# ── Parse .env robustly (handles quotes and \r) ─────────────
parse_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" \
    | head -1 \
    | sed "s/^${key}=//" \
    | tr -d '"' \
    | tr -d "'" \
    | tr -d $'\r'
}

# ── Validate prerequisites ──────────────────────────────────
[ -f "$ENV_FILE" ] || die "Supabase .env not found at $ENV_FILE"
[ -f "$SEED_SQL" ] || die "Seed SQL not found at $SEED_SQL"
command -v psql >/dev/null 2>&1 || die "psql not found — install postgresql-client"
command -v curl >/dev/null 2>&1 || die "curl not found"

POSTGRES_PASSWORD="$(parse_env POSTGRES_PASSWORD)"
SERVICE_ROLE_KEY="$(parse_env SERVICE_ROLE_KEY)"

[ -n "$POSTGRES_PASSWORD" ] || die "POSTGRES_PASSWORD not found in $ENV_FILE"
[ -n "$SERVICE_ROLE_KEY" ]  || die "SERVICE_ROLE_KEY not found in $ENV_FILE"

# ── Step 1: Seed database ───────────────────────────────────
info "Seeding default company and admin user..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h localhost -p 5433 -U postgres -d postgres \
  -f "$SEED_SQL" \
  --set ON_ERROR_STOP=1

ok "Database seeded (or already existed)"

# ── Step 2: Create auth account via Kong ─────────────────────
info "Provisioning auth account for $ADMIN_EMAIL..."

HTTP_CODE=$(curl -s -o /tmp/auth-response.json -w "%{http_code}" \
  "http://localhost:8000/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"email_confirm\": true
  }")

case "$HTTP_CODE" in
  200|201)
    ok "Auth account created"
    ;;
  422)
    # User already exists — that's fine (idempotent)
    ok "Auth account already exists (idempotent)"
    ;;
  *)
    echo "⚠️  Auth API returned HTTP $HTTP_CODE:"
    cat /tmp/auth-response.json 2>/dev/null
    echo
    die "Failed to create auth account"
    ;;
esac

rm -f /tmp/auth-response.json

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "  First admin account ready!"
echo ""
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
echo "  ⚠️  CHANGE THE PASSWORD after first login!"
echo ""
echo "  Next steps:"
echo "    1. Log in at https://your-domain.com"
echo "    2. Go to Settings → change password"
echo "    3. Update company name in Admin Dashboard"
echo "    4. Create real employee/manager accounts"
echo "    5. (Optional) Delete this default admin"
echo "════════════════════════════════════════════════════════"
