

## Fix Database Connection Instructions in Installation101.md

### Root Cause
In Supabase's self-hosted Docker setup, port **5432** is mapped to **Supavisor** (connection pooler), not directly to PostgreSQL. Supavisor expects a tenant-aware connection string. Raw `psql` connections to `localhost:5432` fail with "Tenant or user not found" because Supavisor doesn't recognize the connection as belonging to any tenant.

### Solution
Update all `psql` connection strings throughout the document to use one of two approaches:

**Option A (Recommended): Connect directly to the PostgreSQL container on port 5433**
Most Supabase Docker setups expose the raw PostgreSQL port as 5433 on the host. Update the connection string:
```bash
export SUPABASE_DB_URL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5433/postgres"
```

**Option B: Connect via `docker exec`**
```bash
docker exec -i supabase-db psql -U postgres -d postgres
```

### Changes to `docs/Installation101.md`

1. **Step 8 – Docker status table** (~line 709): Verify/add that `supabase-db` exposes port `5433` on the host alongside the Supavisor port on `5432`. Add a note clarifying which port is which.

2. **Step 9 – Database Migration** (~lines 774-776): Change the connection string from port `5432` to `5433`. Add an explanatory note:
   > Port 5432 is used by Supavisor (connection pooler). For direct `psql` access, use port **5433** which connects directly to PostgreSQL.

3. **All other `SUPABASE_DB_URL` references** (~lines 978, 1363, 1394, 1780, etc.): Update port from `5432` to `5433` for local database connections. Cloud connection strings (e.g., `db.<PROJECT_REF>.supabase.co:5432`) stay unchanged since those use Supabase Cloud's own routing.

4. **Step 9 – Add a `docker exec` alternative**: Provide a fallback method using `docker exec` in case port 5433 is not exposed.

5. **Troubleshooting table** (~line 1868): Update the "Database connection refused" row to mention port 5433 vs 5432 distinction and the "Tenant or user not found" error specifically.

6. **Supavisor section in .env** (~lines 434-450): Add a comment clarifying that port 5432 is Supavisor's port and direct DB access is on 5433.

### Affected lines (approximate)
- Lines 709, 774-780, 978, 1394, 1780, 1868 — port changes
- Lines 434-450 — add clarifying comment
- New content: `docker exec` alternative in Step 9

