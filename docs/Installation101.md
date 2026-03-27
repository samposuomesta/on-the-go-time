# Installation101 – TimeTrack On-Premise Deployment Guide

> **Target OS:** Ubuntu 24.04 LTS  
> **Stack:** Docker, Supabase Self-Hosted, Nginx, Node.js 20+  
> **Last updated:** 2026-03-26

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Setup](#2-server-setup)
3. [Install Docker & Docker Compose](#3-install-docker--docker-compose)
4. [Clone Supabase Self-Hosted](#4-clone-supabase-self-hosted)
5. [Configure Supabase Environment](#5-configure-supabase-environment)
6. [Persistent Volumes](#6-persistent-volumes)
7. [Start Supabase Services](#7-start-supabase-services)
8. [Database Migration](#8-database-migration)
9. [Deploy Edge Functions](#9-deploy-edge-functions)
10. [Build & Deploy the Frontend](#10-build--deploy-the-frontend)
11. [Nginx Reverse Proxy & SSL](#11-nginx-reverse-proxy--ssl)
12. [Security Hardening](#12-security-hardening)
13. [Migration from Supabase Cloud](#13-migration-from-supabase-cloud)
14. [Code Changes Required](#14-code-changes-required)
15. [Secrets & Environment Variables](#15-secrets--environment-variables)
16. [Cron Jobs](#16-cron-jobs)
17. [Storage (Receipts Bucket)](#17-storage-receipts-bucket)
18. [Push Notifications (VAPID)](#18-push-notifications-vapid)
19. [Health Checks & Monitoring](#19-health-checks--monitoring)
20. [Backup & Maintenance](#20-backup--maintenance)
21. [Troubleshooting](#21-troubleshooting)
22. [Optional: S3-Compatible Storage (MinIO)](#22-optional-s3-compatible-storage-minio)

---

## 1. Prerequisites

| Component | Version |
|-----------|---------|
| Ubuntu | 24.04 LTS |
| Docker | 24+ |
| Docker Compose | v2.20+ |
| Node.js | 20 LTS |
| Git | 2.x |
| Domain name | Required for SSL |
| Min RAM | 4 GB (8 GB recommended) |
| Min Disk | 40 GB SSD |

---

## 2. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git ufw nano htop

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Create a dedicated user (optional but recommended)
sudo adduser timetrack
sudo usermod -aG sudo timetrack
# NOTE: Docker group is added AFTER Docker installation (see section 3)
su - timetrack
```

---

## 3. Install Docker & Docker Compose

```bash
# Remove old versions
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null

# Add Docker's official GPG key and repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Verify
docker --version
docker compose version

# NOW add user to docker group (after Docker is installed)
sudo usermod -aG docker timetrack
sudo usermod -aG docker $USER
newgrp docker
```

### Configure Docker log rotation

Prevent disk from filling up by configuring log rotation globally:

```bash
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

---

## 4. Clone Supabase Self-Hosted

We use the official `docker/` directory from the main Supabase repository, which is the recommended way to self-host Supabase.

```bash
# Create project directory
sudo mkdir -p /opt/timetrack && sudo chown timetrack:timetrack /opt/timetrack
cd /opt/timetrack

# Clone the Supabase repo (sparse checkout for docker/ only)
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/supabase/supabase.git supabase-docker
cd supabase-docker
git sparse-checkout set docker
cp docker/.env.example docker/.env
cd docker
```

> **Note:** The official self-hosted Docker setup lives at [`supabase/supabase/docker`](https://github.com/supabase/supabase/tree/master/docker). It provides a complete `docker-compose.yml` with proper volume mounts, image pinning, and Edge Function support.

---

## 5. Configure Supabase Environment

Edit `/opt/timetrack/supabase-docker/docker/.env`:

```bash
nano .env
```

### Critical variables to change:

```env
############
# SECRETS – CHANGE ALL OF THESE!
############

# Generate with: openssl rand -base64 32
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>

# Generate JWT secret (min 32 chars): openssl rand -base64 48
JWT_SECRET=<YOUR_JWT_SECRET>

# Generate anon key using jwt.io or supabase CLI:
#   supabase gen keys --jwt-secret <JWT_SECRET>
ANON_KEY=<GENERATED_ANON_KEY>
SERVICE_ROLE_KEY=<GENERATED_SERVICE_ROLE_KEY>

# Dashboard credentials
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<STRONG_DASHBOARD_PASSWORD>

############
# URLS – Set to your domain
############
SITE_URL=https://timetrack.yourdomain.com
API_EXTERNAL_URL=https://api.timetrack.yourdomain.com
SUPABASE_PUBLIC_URL=https://api.timetrack.yourdomain.com

############
# SMTP – For auth emails (password reset, etc.)
############
SMTP_ADMIN_EMAIL=noreply@yourdomain.com
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=<SMTP_PASSWORD>
SMTP_SENDER_NAME=TimeTrack

############
# DATABASE
############
POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
```

### Generate JWT keys

**Option A – Supabase CLI (npx, no global install needed):**

```bash
npx supabase gen keys --jwt-secret "<YOUR_JWT_SECRET>"
# This outputs ANON_KEY and SERVICE_ROLE_KEY — paste them into .env
```

**Option B – Without Supabase CLI (using jwt.io or a script):**

```bash
# Install jwt-cli helper or use this one-liner with Node.js:
node -e "
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const now = Math.floor(Date.now()/1000);
const anon = Buffer.from(JSON.stringify({iss:'supabase',ref:'your-project-ref',role:'anon',iat:now,exp:now+10*365*24*3600})).toString('base64url');
const service = Buffer.from(JSON.stringify({iss:'supabase',ref:'your-project-ref',role:'service_role',iat:now,exp:now+10*365*24*3600})).toString('base64url');
function sign(input,secret){return crypto.createHmac('sha256',secret).update(input).digest('base64url');}
const secret = process.argv[1];
console.log('ANON_KEY=' + header+'.'+anon+'.'+sign(header+'.'+anon,secret));
console.log('SERVICE_ROLE_KEY=' + header+'.'+service+'.'+sign(header+'.'+service,secret));
" "<YOUR_JWT_SECRET>"
```

**Option C – Use [jwt.io](https://jwt.io):** Create tokens manually with the payloads below and sign with your `JWT_SECRET` (HS256):

- **ANON_KEY payload:** `{"iss":"supabase","ref":"your-project-ref","role":"anon","iat":<unix_now>,"exp":<unix_10y>}`
- **SERVICE_ROLE_KEY payload:** `{"iss":"supabase","ref":"your-project-ref","role":"service_role","iat":<unix_now>,"exp":<unix_10y>}`

---

## 6. Persistent Volumes

**Critical:** Ensure Postgres data and Storage objects survive container restarts and upgrades.

Create host directories:

```bash
sudo mkdir -p /opt/timetrack/data/postgres
sudo mkdir -p /opt/timetrack/data/storage
sudo chown -R 1000:1000 /opt/timetrack/data
```

### Pin Docker image versions

Edit `docker-compose.yml` and pin every image to a specific tag. **Never use `:latest` in production.**

Example pinned versions (check for current stable versions at time of deployment):

```yaml
services:
  db:
    image: supabase/postgres:15.6.1.145
    volumes:
      - /opt/timetrack/data/postgres:/var/lib/postgresql/data
    # ...

  storage:
    image: supabase/storage-api:1.11.13
    volumes:
      - /opt/timetrack/data/storage:/var/lib/storage
    # ...

  auth:
    image: supabase/gotrue:2.164.0
    # ...

  rest:
    image: postgrest/postgrest:12.2.3
    # ...

  realtime:
    image: supabase/realtime:2.33.58
    # ...

  kong:
    image: kong:3.8.1
    # ...

  meta:
    image: supabase/postgres-meta:0.84.2
    # ...

  edge-functions:
    image: supabase/edge-runtime:1.65.3
    volumes:
      - /opt/timetrack/supabase-docker/docker/volumes/functions:/home/deno/functions
    # ...
```

> **Important:** After editing `docker-compose.yml`, verify the volume mount paths are correct for your chosen image versions. The official `supabase/supabase/docker` setup usually has sensible defaults — you primarily need to add/confirm the host-path mounts and pin the image tags.

---

## 7. Start Supabase Services

```bash
cd /opt/timetrack/supabase-docker/docker

# Pull images and start
docker compose pull
docker compose up -d

# Verify all services are running
docker compose ps

# Expected services:
#   supabase-db          (PostgreSQL)
#   supabase-auth        (GoTrue)
#   supabase-rest        (PostgREST)
#   supabase-realtime    (Realtime)
#   supabase-storage     (Storage API)
#   supabase-meta        (Postgres Meta)
#   supabase-edge-functions (Deno Edge Runtime)
#   supabase-studio      (Dashboard UI)
#   supabase-kong        (API Gateway)

# Check logs
docker compose logs -f --tail=50
```

### Verify API is running

```bash
curl -s http://localhost:8000/rest/v1/ \
  -H "apikey: <YOUR_ANON_KEY>" | head -20
```

---

## 8. Database Migration

You need to apply all migrations from the TimeTrack project to your self-hosted database.

### Option A: Using Supabase CLI (recommended)

```bash
cd /opt/timetrack

# Clone the TimeTrack application
git clone <YOUR_TIMETRACK_REPO_URL> app
cd app

# Link to local Supabase (use local database connection string)
export SUPABASE_DB_URL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"

# Apply all migrations in order
for f in supabase/migrations/*.sql; do
  echo "Applying $f ..."
  psql "$SUPABASE_DB_URL" -f "$f"
done
```

### Option B: Using psql directly

```bash
# Connect to the database
psql "postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"

# Then run each migration file manually or via script
\i supabase/migrations/20240101000000_initial.sql
# ... repeat for all migration files in order
```

### Verify database schema

```bash
psql "$SUPABASE_DB_URL" -c "\dt public.*"

# Expected tables:
#   absence_reasons, absences, api_keys, api_logs, api_rate_limits,
#   audit_log, companies, idempotency_keys, login_sessions,
#   notification_log, project_hours, projects, push_subscriptions,
#   reminder_rules, time_entries, travel_expenses, user_managers,
#   user_reminders, users, vacation_requests, work_bank_transactions,
#   workplaces
```

### Verify RLS policies

```bash
psql "$SUPABASE_DB_URL" -c "
  SELECT schemaname, tablename, policyname
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
"
```

### Verify database functions

```bash
psql "$SUPABASE_DB_URL" -c "
  SELECT routine_name
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  ORDER BY routine_name;
"

# Expected functions:
#   audit_log_trigger, auth_user_company_id, auth_user_id,
#   auth_user_role, is_same_company_user
```

---

## 9. Deploy Edge Functions

The application uses 3 Edge Functions:

| Function | Purpose |
|----------|---------|
| `create-auth-user` | Admin creates auth accounts for employees |
| `data-api` | External REST API with API key auth |
| `process-reminders` | Cron-triggered push notification reminders |

### Option A: Mount via volume (recommended for `supabase-docker`)

The official `supabase/supabase/docker` setup mounts a `volumes/functions` directory into the Edge Runtime container automatically.

```bash
cd /opt/timetrack/app

# Copy functions into the mounted volume
FUNCTIONS_DIR="/opt/timetrack/supabase-docker/docker/volumes/functions"
mkdir -p "$FUNCTIONS_DIR"

cp -r supabase/functions/create-auth-user "$FUNCTIONS_DIR/"
cp -r supabase/functions/data-api "$FUNCTIONS_DIR/"
cp -r supabase/functions/process-reminders "$FUNCTIONS_DIR/"

# Restart edge-functions container to pick up changes
cd /opt/timetrack/supabase-docker
docker compose restart supabase-edge-functions
```

### Option B: Use Supabase CLI

```bash
cd /opt/timetrack/app

# Set the database URL for CLI
export SUPABASE_DB_URL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"

# Deploy functions
supabase functions deploy create-auth-user --project-ref local
supabase functions deploy data-api --project-ref local
supabase functions deploy process-reminders --project-ref local
```

### Set Edge Function secrets

These secrets must be available to the edge functions runtime. Add them to the edge function environment in `docker-compose.yml` or via a `.env` file mounted into the edge-runtime container:

```bash
# In the docker .env or edge function environment:
SUPABASE_URL=http://kong:8000          # internal Docker network URL
SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
CRON_SECRET=<GENERATE_WITH_openssl_rand_-base64_32>
VAPID_PUBLIC_KEY=<YOUR_VAPID_PUBLIC_KEY>
VAPID_PRIVATE_KEY=<YOUR_VAPID_PRIVATE_KEY>
```

---

## 10. Build & Deploy the Frontend

### Clone and configure

```bash
cd /opt/timetrack/app

# Install dependencies
npm install

# Create production .env file
cat > .env.production << 'EOF'
VITE_SUPABASE_URL=https://api.timetrack.yourdomain.com
VITE_SUPABASE_PUBLISHABLE_KEY=<YOUR_ANON_KEY>
VITE_SUPABASE_PROJECT_ID=local
EOF
```

### Build

```bash
npm run build

# Output is in /opt/timetrack/app/dist/
ls -la dist/
```

### Serve with Nginx (see section 11)

The built `dist/` folder contains static files served by Nginx.

---

## 11. Nginx Reverse Proxy & SSL

### Install Nginx & Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/timetrack`:

```nginx
# --- Rate limiting zone (shared across all workers) ---
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;

# Frontend
server {
    listen 80;
    server_name timetrack.yourdomain.com;

    root /opt/timetrack/app/dist;
    index index.html;

    # Rate limit for frontend
    limit_req zone=frontend_limit burst=60 nodelay;

    # SPA routing — all paths serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker must not be cached
    location /sw.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}

# Supabase API reverse proxy
server {
    listen 80;
    server_name api.timetrack.yourdomain.com;

    # --- Rate limiting for API ---
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;

    # --- Block public access to process-reminders ---
    # Only allow localhost (cron) to call this endpoint
    location /functions/v1/process-reminders {
        allow 127.0.0.1;
        allow ::1;
        deny all;

        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # All other API requests
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (for Realtime)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Enable and test

```bash
sudo ln -s /etc/nginx/sites-available/timetrack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
sudo certbot --nginx -d timetrack.yourdomain.com -d api.timetrack.yourdomain.com
sudo systemctl reload nginx

# Auto-renewal (already set up by certbot, verify):
sudo certbot renew --dry-run
```

---

## 12. Security Hardening

### 12.1 Install and configure fail2ban

Protect SSH and Nginx from brute-force attacks:

```bash
sudo apt install -y fail2ban

# Create local config (survives package upgrades)
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 10
findtime = 1m
bantime  = 10m

[nginx-botsearch]
enabled  = true
filter   = nginx-botsearch
logpath  = /var/log/nginx/access.log
maxretry = 2
EOF

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# Verify status
sudo fail2ban-client status
```

### 12.2 Docker log rotation (already configured in section 3)

The global `/etc/docker/daemon.json` limits each container log to **3 files × 10 MB = 30 MB max per container**. This prevents any single container from filling the disk.

### 12.3 Restrict Supabase Studio (Dashboard)

The Supabase Studio runs on port 3000 by default. **Do not expose it publicly.** Access it only via SSH tunnel:

```bash
# From your local machine:
ssh -L 3000:localhost:3000 timetrack@your-server-ip

# Then open http://localhost:3000 in your local browser
```

Alternatively, restrict it in `docker-compose.yml`:

```yaml
studio:
  ports:
    - "127.0.0.1:3000:3000"   # Only accessible from localhost
```

### 12.4 SSH hardening (optional but recommended)

```bash
# Disable root login and password auth
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

> **Warning:** Ensure you have SSH key access before disabling password authentication!

### 12.5 Automatic security updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 13. Migration from Supabase Cloud

When moving from Supabase Cloud to self-hosted, these are the key steps:

### 13.1 Export database

```bash
# From Supabase Cloud (using their CLI or dashboard)
# Option A: pg_dump via connection string from Cloud dashboard
pg_dump "postgresql://postgres:<CLOUD_DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
  --schema=public \
  --no-owner \
  --no-privileges \
  -F c -f timetrack_backup.dump

# Option B: Using Supabase CLI
supabase db dump --project-ref <CLOUD_PROJECT_REF> -f schema_dump.sql
supabase db dump --project-ref <CLOUD_PROJECT_REF> --data-only -f data_dump.sql
```

### 13.2 Import to self-hosted

```bash
# Restore schema + data
pg_restore -h localhost -p 5432 -U postgres -d postgres \
  --no-owner --no-privileges timetrack_backup.dump

# Or with SQL dumps:
psql "$SUPABASE_DB_URL" -f schema_dump.sql
psql "$SUPABASE_DB_URL" -f data_dump.sql
```

### 13.3 Migrate auth users

```bash
# Export auth users from Cloud
pg_dump "postgresql://postgres:<CLOUD_DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
  --schema=auth \
  --table=auth.users \
  --data-only \
  -f auth_users.sql

# Import to self-hosted
psql "$SUPABASE_DB_URL" -f auth_users.sql
```

### 13.4 Migrate storage objects

```bash
# Download all receipts from Cloud storage bucket
# Use the Supabase Storage API or S3-compatible tools
# Then upload to self-hosted storage

# List files from cloud
curl -s "https://<PROJECT_REF>.supabase.co/storage/v1/object/list/receipts" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":1000}'

# Download and re-upload each file to local instance
```

---

## 14. Code Changes Required

### 14.1 Environment variables (`.env.production`)

| Variable | Cloud Value | Self-Hosted Value |
|----------|------------|-------------------|
| `VITE_SUPABASE_URL` | `https://pqmdsvdcbyefdngdmuud.supabase.co` | `https://api.timetrack.yourdomain.com` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cloud anon key | Your generated anon key |
| `VITE_SUPABASE_PROJECT_ID` | `pqmdsvdcbyefdngdmuud` | `local` (or any identifier) |

### 14.2 Supabase client (`src/integrations/supabase/client.ts`)

**No code changes needed!** The client reads from environment variables:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

Just ensure your `.env.production` has the correct values before building.

### 14.3 Edge Function URLs

Edge functions are called via the Supabase URL. Since `VITE_SUPABASE_URL` changes, all edge function calls automatically point to the new host. No code changes needed if you use the standard pattern:

```typescript
// This already works — reads URL from env
const { data } = await supabase.functions.invoke('create-auth-user', { body: {...} });
```

### 14.4 Service Worker (`public/sw.js`)

Check if there are any hardcoded Supabase URLs in `sw.js`. If so, replace them with your domain.

### 14.5 PWA Manifest (`public/manifest.json`)

Update `start_url` and `scope` if they reference the cloud domain.

### 14.6 Remove `lovable-tagger` (optional)

The `lovable-tagger` dev dependency is Lovable-specific. You can remove it for self-hosted:

```bash
npm uninstall lovable-tagger
```

Then in `vite.config.ts`, remove the tagger plugin:

```typescript
// Remove this line:
import { componentTagger } from "lovable-tagger";

// Change plugins to:
plugins: [react()],
```

---

## 15. Secrets & Environment Variables

### Edge Function secrets mapping

| Secret Name | Where to Set | Description |
|-------------|-------------|-------------|
| `SUPABASE_URL` | Docker `.env` / Edge runtime | Internal Supabase API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Docker `.env` / Edge runtime | Full-access service key |
| `SUPABASE_ANON_KEY` | Docker `.env` / Edge runtime | Public anon key |
| `CRON_SECRET` | Docker `.env` / Edge runtime | Auth for cron-triggered functions |
| `VAPID_PUBLIC_KEY` | Docker `.env` / Edge runtime | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Docker `.env` / Edge runtime | Web Push VAPID private key |

### Generate new VAPID keys (if needed)

```bash
npx web-push generate-vapid-keys

# Output:
# Public Key: BPxxxxxxxxxx...
# Private Key: xxxxxxxxxx...
```

> **Note:** If you reuse the same VAPID keys from Cloud, existing push subscriptions will continue to work. If you generate new keys, users must re-subscribe.

---

## 16. Cron Jobs

The `process-reminders` edge function must be triggered periodically (every 5 minutes recommended).

> **Important:** The Nginx config (section 11) blocks external access to `/functions/v1/process-reminders`. The cron job runs on localhost and is allowed through.

### Option A: System cron (recommended)

```bash
crontab -e

# Add (uses localhost to bypass Nginx external block):
*/5 * * * * curl -s -X POST \
  "http://localhost:8000/functions/v1/process-reminders" \
  -H "x-cron-secret: <YOUR_CRON_SECRET>" \
  -H "Content-Type: application/json" \
  >> /var/log/timetrack-reminders.log 2>&1
```

> **Note:** We call `localhost:8000` (Kong) directly instead of the public domain. This avoids the Nginx restriction and keeps the request internal.

### Option B: pg_cron (if enabled in your Supabase setup)

```sql
-- In PostgreSQL (requires pg_cron extension)
SELECT cron.schedule(
  'process-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'http://kong:8000/functions/v1/process-reminders',
    headers := jsonb_build_object(
      'x-cron-secret', '<YOUR_CRON_SECRET>',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

---

## 17. Storage (Receipts Bucket)

Create the `receipts` storage bucket in self-hosted Supabase:

```sql
-- Connect to the database
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true);
```

Or via the Supabase Studio dashboard at `http://localhost:3000` → Storage → Create Bucket.

### Storage policies

Ensure the same RLS policies from Cloud are applied. Check your migration files for storage policies.

---

## 18. Push Notifications (VAPID)

The `process-reminders` function sends Web Push notifications. For this to work on-premise:

1. VAPID keys must be set as edge function secrets (see section 15)
2. The frontend `sw.js` must be served over HTTPS
3. The push subscription endpoint URLs are third-party services (Google FCM, Mozilla autopush) — your server needs outbound HTTPS access

---

## 19. Health Checks & Monitoring

### 19.1 Health check script

Create `/opt/timetrack/healthcheck.sh`:

```bash
cat > /opt/timetrack/healthcheck.sh << 'SCRIPT'
#!/bin/bash
# TimeTrack Health Check Script

ANON_KEY="<YOUR_ANON_KEY>"
FAILURES=0

echo "=== TimeTrack Health Check: $(date) ==="

# 1. PostgREST
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:8000/rest/v1/ \
  -H "apikey: $ANON_KEY")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PostgREST: OK ($HTTP_CODE)"
else
  echo "❌ PostgREST: FAIL ($HTTP_CODE)"
  FAILURES=$((FAILURES + 1))
fi

# 2. Auth (GoTrue)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:8000/auth/v1/health)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Auth: OK ($HTTP_CODE)"
else
  echo "❌ Auth: FAIL ($HTTP_CODE)"
  FAILURES=$((FAILURES + 1))
fi

# 3. Storage
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:8000/storage/v1/health)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Storage: OK ($HTTP_CODE)"
else
  echo "❌ Storage: FAIL ($HTTP_CODE)"
  FAILURES=$((FAILURES + 1))
fi

# 4. Docker container status
STOPPED=$(cd /opt/timetrack/supabase-docker && docker compose ps --format json 2>/dev/null | \
  python3 -c "import sys,json; [print(c.get('Name','?')) for line in sys.stdin for c in [json.loads(line)] if c.get('State')!='running']" 2>/dev/null)
if [ -z "$STOPPED" ]; then
  echo "✅ All Docker containers: running"
else
  echo "❌ Stopped containers: $STOPPED"
  FAILURES=$((FAILURES + 1))
fi

# 5. Disk usage warning
DISK_PCT=$(df /opt/timetrack --output=pcent | tail -1 | tr -d '% ')
if [ "$DISK_PCT" -lt 85 ]; then
  echo "✅ Disk usage: ${DISK_PCT}%"
else
  echo "⚠️  Disk usage: ${DISK_PCT}% (threshold: 85%)"
  FAILURES=$((FAILURES + 1))
fi

echo "=== Result: $FAILURES failure(s) ==="
exit $FAILURES
SCRIPT

chmod +x /opt/timetrack/healthcheck.sh
```

### 19.2 Automated health checks via cron

```bash
crontab -e

# Run health check every 10 minutes, log failures
*/10 * * * * /opt/timetrack/healthcheck.sh >> /var/log/timetrack-health.log 2>&1
```

### 19.3 Docker Compose health checks

Add health checks to `docker-compose.yml` for automatic restart on failure:

```yaml
services:
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  rest:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      db:
        condition: service_healthy

  auth:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9999/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      db:
        condition: service_healthy
```

---

## 20. Backup & Maintenance

### Database backup (daily cron)

```bash
# Create backup script
cat > /opt/timetrack/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/timetrack/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump "postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres" \
  -F c -f "$BACKUP_DIR/timetrack_$TIMESTAMP.dump"

# Keep last 30 days
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete
EOF

chmod +x /opt/timetrack/backup.sh

# Add to crontab
crontab -e
# 0 2 * * * /opt/timetrack/backup.sh >> /var/log/timetrack-backup.log 2>&1
```

### Update application

```bash
cd /opt/timetrack/app
git pull
npm install
npm run build
# Nginx serves from dist/ — no restart needed

# Re-deploy edge functions if changed
cp -r supabase/functions/* /opt/timetrack/supabase-docker/volumes/functions/
cd /opt/timetrack/supabase-docker
docker compose restart supabase-edge-functions
```

### Update Supabase

```bash
cd /opt/timetrack/supabase-docker

# Check release notes BEFORE upgrading!
# Update pinned image versions in docker-compose.yml
# Then:
docker compose pull
docker compose up -d
```

> **Warning:** Never blindly `git pull` + `docker compose pull` on the Supabase repo. Always check the changelog for breaking changes and update image tags deliberately.

### Monitor

```bash
# Check Docker containers
docker compose ps

# View logs
docker compose logs -f supabase-auth
docker compose logs -f supabase-rest
docker compose logs -f supabase-edge-functions

# Check disk usage
df -h
docker system df

# Check fail2ban status
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-limit-req
```

---

## 21. Troubleshooting

### Common issues

| Problem | Solution |
|---------|----------|
| **CORS errors** | Check `API_EXTERNAL_URL` in `.env` matches your domain |
| **Auth not working** | Verify `SITE_URL` matches your frontend domain |
| **Edge functions 502** | Check edge function logs: `docker compose logs supabase-edge-functions` |
| **Database connection refused** | Verify `POSTGRES_PASSWORD` and port 5432 is exposed |
| **Push notifications fail** | Ensure VAPID keys are set and server has outbound HTTPS |
| **Storage upload fails** | Verify `receipts` bucket exists and has correct policies |
| **JWT errors** | Regenerate keys with same `JWT_SECRET` |
| **PostgREST 401** | Ensure RLS policies and `auth_user_*` functions exist |
| **429 Too Many Requests** | Adjust `rate` and `burst` in Nginx `limit_req` config |
| **fail2ban banning legit IPs** | Check `sudo fail2ban-client status nginx-limit-req`, unban with `sudo fail2ban-client set nginx-limit-req unbanip <IP>` |
| **Disk full** | Check Docker logs (`docker system df`), prune unused images (`docker image prune -a`) |

### Reset everything

```bash
cd /opt/timetrack/supabase-docker
docker compose down -v  # WARNING: This deletes all data!
docker compose up -d
# Then re-run migrations
```

---

## 22. Optional: S3-Compatible Storage (MinIO)

For production deployments that need scalable, redundant storage, you can replace the default Supabase storage with MinIO (S3-compatible object storage).

### 22.1 Deploy MinIO

Add to `docker-compose.yml` or run separately:

```yaml
minio:
  image: minio/minio:RELEASE.2024-12-18T13-15-44Z
  command: server /data --console-address ":9001"
  ports:
    - "127.0.0.1:9000:9000"    # S3 API
    - "127.0.0.1:9001:9001"    # MinIO Console
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: <STRONG_PASSWORD>
  volumes:
    - /opt/timetrack/data/minio:/data
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 30s
    timeout: 10s
    retries: 3
  restart: unless-stopped
```

### 22.2 Configure Supabase Storage to use MinIO

In the Supabase `.env`, set the storage backend:

```env
STORAGE_BACKEND=s3
GLOBAL_S3_BUCKET=supabase-storage
GLOBAL_S3_ENDPOINT=http://minio:9000
GLOBAL_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=<STRONG_PASSWORD>
AWS_DEFAULT_REGION=us-east-1
```

### 22.3 Create the bucket in MinIO

```bash
# Install MinIO client
wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# Configure and create bucket
mc alias set local http://localhost:9000 minioadmin <STRONG_PASSWORD>
mc mb local/supabase-storage
mc anonymous set download local/supabase-storage/receipts
```

> **Note:** This is a next-phase improvement. The default local storage works fine for small-to-medium deployments. Consider MinIO when you need backup replication, multi-node storage, or >100 GB of files.

---

## Quick Reference: Complete File Structure

```
/opt/timetrack/
├── supabase-docker/              # supabase/supabase/docker
│   ├── .env                      # Supabase config
│   ├── docker-compose.yml        # Pinned image versions + volumes
│   └── volumes/
│       └── functions/            # Edge functions (mounted volume)
│           ├── create-auth-user/
│           ├── data-api/
│           └── process-reminders/
├── app/                          # TimeTrack frontend
│   ├── .env.production           # Frontend env vars
│   ├── dist/                     # Built static files
│   ├── src/
│   └── supabase/
│       └── migrations/           # SQL migrations
├── data/                         # Persistent data (host-mounted)
│   ├── postgres/                 # PostgreSQL data
│   ├── storage/                  # Supabase Storage files
│   └── minio/                    # (optional) MinIO data
├── backups/                      # Database backups
├── backup.sh                     # Backup script
└── healthcheck.sh                # Health check script
```

---

*End of Installation101 guide.*
