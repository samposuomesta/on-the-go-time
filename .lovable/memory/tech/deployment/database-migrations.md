---
name: Database Migrations
description: Migrations auto-applied by update.sh via schema_migrations tracking table on port 5433; runs WITHOUT --single-transaction so ALTER TYPE ADD VALUE works
type: feature
---
Database migrations are applied automatically by `scripts/update.sh` (step 3/5). The script:

- Reads `POSTGRES_PASSWORD` from `/opt/timetrack/supabase-docker/docker/.env`
- Connects on `localhost:5433` (bypasses Supavisor pooler)
- Ensures `public.schema_migrations(version text PK, applied_at timestamptz)` exists
- Iterates `app/supabase/migrations/*.sql` in lexicographic order
- Runs each unapplied migration with `ON_ERROR_STOP=1` (NOT `--single-transaction`), then inserts the version row only on success
- Restarts the `rest` container only when ≥1 migration was applied (PostgREST schema cache reload)

**Why no `--single-transaction`**: PostgreSQL forbids `ALTER TYPE ... ADD VALUE` inside a transaction block. Running migrations outside a single transaction lets enum-extension migrations succeed. Each statement still runs in its own implicit transaction, and `ON_ERROR_STOP=1` ensures we abort on the first error.

**Manual fallback** (Run from `/opt/timetrack/app/`), if you need to run a single migration outside the update flow:

```bash
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h localhost -p 5433 -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f supabase/migrations/<file>.sql
cd /opt/timetrack/supabase-docker/docker && docker compose restart rest
```

Then manually `INSERT INTO public.schema_migrations(version) VALUES ('<filename-without-.sql>');` so the auto-runner skips it next time.
