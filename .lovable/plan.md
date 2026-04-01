

## Completed: Single-Domain Architecture + Auto-Seed Admin Script

### Changes made

1. **`scripts/setup-first-admin.sh`** — Idempotent bash script that seeds default company/admin and provisions auth account via Kong API
2. **`scripts/seed-defaults.sql`** — SQL seed file with `ON CONFLICT DO NOTHING` for company and admin user
3. **`docker/docker-compose.override.yml`** — Simplified to single-domain path-based routing (`PathPrefix` for API paths), removed Studio subdomain labels
4. **`docs/Installation101.md`** — Full single-domain rewrite:
   - `API_EXTERNAL_URL` and `SUPABASE_PUBLIC_URL` → `https://timetrack.yourdomain.com`
   - Nginx: merged two server blocks into one with path-based routing
   - SSL: single certbot command, one domain
   - Added Step 10: "Create First Admin Account"
   - Renumbered all sections (10→24)
   - Updated all cross-references, TOC, checklist, and file structure
