

## Plan: Single-Domain Architecture + Auto-Seed Admin Script

### Overview
Two major changes: (1) consolidate from two domains (`timetrack.yourdomain.com` + `api.timetrack.yourdomain.com`) to a single domain with path-based routing, and (2) create an auto-seed script for first admin + company setup.

---

### 1. New file: `scripts/setup-first-admin.sh`

Idempotent bash script that:
- Parses `POSTGRES_PASSWORD` and `SERVICE_ROLE_KEY` from `/opt/timetrack/supabase-docker/docker/.env` (handles quotes/CR)
- Inserts default company (`a0000000-0000-0000-0000-000000000001`, "Default Company") via psql on port 5433 with `ON CONFLICT DO NOTHING`
- Inserts default admin user (`b0000000-0000-0000-0000-000000000001`, email `admin@timetrack.local`, role `admin`) with `ON CONFLICT DO NOTHING`
- Calls Kong Auth API (`http://localhost:8000/auth/v1/admin/users`) with service_role key to create auth account, password `ChangeMe123!`, `email_confirm: true`
- Prints credentials and instructions to change password after first login

### 2. New file: `scripts/seed-defaults.sql`

SQL file with the two `INSERT ... ON CONFLICT DO NOTHING` statements for the default company and admin user.

### 3. Update: `docker/docker-compose.override.yml`

- Remove `studio` subdomain Traefik labels (Studio accessed via SSH tunnel per section 13.3)
- Keep Kong Traefik labels with `SITE_DOMAIN` (single domain)
- Keep meta on both `default` and `traefik` networks with alias
- Keep db port, health checks, restart policies

### 4. Update: `docs/Installation101.md`

**Single-domain changes throughout:**

- **Section 6 (URLs, ~line 387)**: Change `API_EXTERNAL_URL` and `SUPABASE_PUBLIC_URL` from `https://api.timetrack.yourdomain.com` to `https://timetrack.yourdomain.com`
- **Section 6 (DNS prereq, ~line 600-610)**: Remove `studio` subdomain A record requirement; update to single domain only
- **Section 8 (~line 793)**: Update override file description to remove studio subdomain reference
- **Section 11 (~line 1204)**: Change `VITE_SUPABASE_URL` from `https://api.timetrack.yourdomain.com` to `https://timetrack.yourdomain.com`
- **Section 12 (Nginx, ~lines 1270-1400)**: Replace two `server` blocks with one that uses path-based routing:
  - `~ ^/(auth|rest|functions|realtime|storage)/v1/` → proxy to Kong 8000
  - `/functions/v1/process-reminders` → localhost-only block
  - `/` → `try_files` for SPA
  - Single certbot command with one domain
- **Section 15 (~line 1602)**: Update `VITE_SUPABASE_URL` table
- **Section 22 (Troubleshooting, ~line 2016)**: Update CORS note

**New Step 9.5: "Create First Admin Account"** (insert after step 9, ~line 1068):
- Run `scripts/setup-first-admin.sh`
- Verify login with `admin@timetrack.local` / `ChangeMe123!`
- Instructions: change password, create real admin, update company, optionally delete default admin

**Update Installation Checklist** (~line 2195):
- Add step 9.5 checkbox
- Remove `api.timetrack.yourdomain.com` references

### Technical Details

**Path-based Nginx config (replaces two server blocks):**
```nginx
server {
    listen 80;
    server_name timetrack.yourdomain.com;
    root /opt/timetrack/app/dist;
    index index.html;

    # Block process-reminders from public
    location /functions/v1/process-reminders {
        allow 127.0.0.1;
        allow ::1;
        deny all;
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Supabase API paths → Kong
    location ~ ^/(auth|rest|functions|realtime|storage)/v1/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static assets cache
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker no-cache
    location /sw.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # SPA fallback
    location / {
        limit_req zone=frontend_limit burst=60 nodelay;
        try_files $uri $uri/ /index.html;
    }
}
```

**Benefits:**
- 1 domain, 1 DNS A record, 1 SSL cert instead of 2
- No CORS issues (same origin)
- Simpler setup for new installations
- Auto-seeded admin removes manual SQL/curl steps

