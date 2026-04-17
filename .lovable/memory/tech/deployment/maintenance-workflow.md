---
name: Maintenance Workflow
description: update.sh: git pull, sync edge functions, auto-apply pending migrations, build frontend, restart containers
type: feature
---
The `scripts/update.sh` script (Run from `/opt/timetrack/`, invoked as `sudo /opt/timetrack/app/scripts/update.sh`) performs a full update in 5 steps:

1. `git pull --ff-only` in `/opt/timetrack/app`
2. Sync edge functions from `app/supabase/functions/*` → `supabase-docker/docker/volumes/functions/` (only repo-defined fns are replaced; built-in `main`/`hello` preserved)
3. **Apply pending DB migrations** via `schema_migrations` tracking table on port 5433. Restarts `rest` container only when migrations were applied.
4. `npm ci && npm run build` for frontend (host Nginx serves dist)
5. `docker compose restart functions`

Host-specific Traefik configs remain in `/opt/timetrack/traefik-config/` (not in repo). `docker-compose.override.yml` still must be synced manually from the app repo when changed.
