---
name: Database Migrations
description: Migrations auto-applied by update.sh via schema_migrations tracking table; fallback manual psql on port 5433
type: feature
---
Database migrations are now applied automatically by `scripts/update.sh` (step 3/5). The script:

- Reads `POSTGRES_PASSWORD` from `/opt/timetrack/supabase-docker/docker/.env`
- Connects on `localhost:5433` (bypasses Supavisor pooler)
- Ensures `public.schema_migrations(version text PK, applied_at timestamptz)` exists
- Iterates `app/supabase/migrations/*.sql` in lexicographic order
- Runs each unapplied migration + inserts version row in a single transaction (`--single-transaction`)
- Restarts the `rest` container only when ≥1 migration was applied (PostgREST schema cache reload)

**Manual fallback** (Run from `/opt/timetrack/app/`), if you need to run a single migration outside the update flow:

```bash
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h localhost -p 5433 -U postgres -d postgres \
  -f supabase/migrations/<file>.sql
cd /opt/timetrack/supabase-docker/docker && docker compose restart rest
```

Then manually `INSERT INTO public.schema_migrations(version) VALUES ('<filename-without-.sql>');` so the auto-runner skips it next time.
