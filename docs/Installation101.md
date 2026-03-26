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
6. [Start Supabase Services](#6-start-supabase-services)
7. [Database Migration](#7-database-migration)
8. [Deploy Edge Functions](#8-deploy-edge-functions)
9. [Build & Deploy the Frontend](#9-build--deploy-the-frontend)
10. [Nginx Reverse Proxy & SSL](#10-nginx-reverse-proxy--ssl)
11. [Migration from Supabase Cloud](#11-migration-from-supabase-cloud)
12. [Code Changes Required](#12-code-changes-required)
13. [Secrets & Environment Variables](#13-secrets--environment-variables)
14. [Cron Jobs](#14-cron-jobs)
15. [Storage (Receipts Bucket)](#15-storage-receipts-bucket)
16. [Push Notifications (VAPID)](#16-push-notifications-vapid)
17. [Backup & Maintenance](#17-backup--maintenance)
18. [Troubleshooting](#18-troubleshooting)

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
sudo usermod -aG docker timetrack
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

# Allow non-root usage
sudo usermod -aG docker $USER
newgrp docker
```

---

## 4. Clone Supabase Self-Hosted

```bash
# Create project directory
mkdir -p /opt/timetrack && cd /opt/timetrack

# Clone the official Supabase Docker setup
git clone --depth 1 https://github.com/supabase/supabase.git supabase-docker
cd supabase-docker/docker

# Copy the example env file
cp .env.example .env
```

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

```bash
# Install Supabase CLI
npm install -g supabase

# Generate keys from your JWT secret
supabase gen keys --jwt-secret "<YOUR_JWT_SECRET>"
# This outputs ANON_KEY and SERVICE_ROLE_KEY — paste them into .env
```

---

## 6. Start Supabase Services

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

## 7. Database Migration

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

## 8. Deploy Edge Functions

The application uses 3 Edge Functions:

| Function | Purpose |
|----------|---------|
| `create-auth-user` | Admin creates auth accounts for employees |
| `data-api` | External REST API with API key auth |
| `process-reminders` | Cron-triggered push notification reminders |

### Deploy to self-hosted Supabase

```bash
cd /opt/timetrack/app

# Copy functions to the Supabase Docker edge functions volume
# The path depends on your docker-compose configuration
FUNCTIONS_DIR="/opt/timetrack/supabase-docker/docker/volumes/functions"
mkdir -p "$FUNCTIONS_DIR"

cp -r supabase/functions/create-auth-user "$FUNCTIONS_DIR/"
cp -r supabase/functions/data-api "$FUNCTIONS_DIR/"
cp -r supabase/functions/process-reminders "$FUNCTIONS_DIR/"
```

### Alternative: Use Supabase CLI to serve functions

```bash
cd /opt/timetrack/app

# Serve functions locally (for testing)
supabase functions serve --env-file .env.local

# Or deploy to the self-hosted instance
supabase functions deploy create-auth-user --project-ref local
supabase functions deploy data-api --project-ref local
supabase functions deploy process-reminders --project-ref local
```

### Set Edge Function secrets

These secrets must be available to the edge functions runtime:

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

## 9. Build & Deploy the Frontend

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

### Serve with Nginx (see section 10)

The built `dist/` folder contains static files served by Nginx.

---

## 10. Nginx Reverse Proxy & SSL

### Install Nginx & Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/timetrack`:

```nginx
# Frontend
server {
    listen 80;
    server_name timetrack.yourdomain.com;

    root /opt/timetrack/app/dist;
    index index.html;

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

## 11. Migration from Supabase Cloud

When moving from Supabase Cloud to self-hosted, these are the key steps:

### 11.1 Export database

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

### 11.2 Import to self-hosted

```bash
# Restore schema + data
pg_restore -h localhost -p 5432 -U postgres -d postgres \
  --no-owner --no-privileges timetrack_backup.dump

# Or with SQL dumps:
psql "$SUPABASE_DB_URL" -f schema_dump.sql
psql "$SUPABASE_DB_URL" -f data_dump.sql
```

### 11.3 Migrate auth users

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

### 11.4 Migrate storage objects

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

## 12. Code Changes Required

### 12.1 Environment variables (`.env.production`)

| Variable | Cloud Value | Self-Hosted Value |
|----------|------------|-------------------|
| `VITE_SUPABASE_URL` | `https://pqmdsvdcbyefdngdmuud.supabase.co` | `https://api.timetrack.yourdomain.com` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cloud anon key | Your generated anon key |
| `VITE_SUPABASE_PROJECT_ID` | `pqmdsvdcbyefdngdmuud` | `local` (or any identifier) |

### 12.2 Supabase client (`src/integrations/supabase/client.ts`)

**No code changes needed!** The client reads from environment variables:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

Just ensure your `.env.production` has the correct values before building.

### 12.3 Edge Function URLs

Edge functions are called via the Supabase URL. Since `VITE_SUPABASE_URL` changes, all edge function calls automatically point to the new host. No code changes needed if you use the standard pattern:

```typescript
// This already works — reads URL from env
const { data } = await supabase.functions.invoke('create-auth-user', { body: {...} });
```

### 12.4 Service Worker (`public/sw.js`)

Check if there are any hardcoded Supabase URLs in `sw.js`. If so, replace them with your domain.

### 12.5 PWA Manifest (`public/manifest.json`)

Update `start_url` and `scope` if they reference the cloud domain.

### 12.6 Remove `lovable-tagger` (optional)

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

## 13. Secrets & Environment Variables

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

## 14. Cron Jobs

The `process-reminders` edge function must be triggered periodically (every 5 minutes recommended).

### Option A: System cron

```bash
crontab -e

# Add:
*/5 * * * * curl -s -X POST \
  "https://api.timetrack.yourdomain.com/functions/v1/process-reminders" \
  -H "x-cron-secret: <YOUR_CRON_SECRET>" \
  -H "Content-Type: application/json" \
  >> /var/log/timetrack-reminders.log 2>&1
```

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

## 15. Storage (Receipts Bucket)

Create the `receipts` storage bucket in self-hosted Supabase:

```sql
-- Connect to the database
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true);
```

Or via the Supabase Studio dashboard at `http://localhost:8000` → Storage → Create Bucket.

### Storage policies

Ensure the same RLS policies from Cloud are applied. Check your migration files for storage policies.

---

## 16. Push Notifications (VAPID)

The `process-reminders` function sends Web Push notifications. For this to work on-premise:

1. VAPID keys must be set as edge function secrets (see section 13)
2. The frontend `sw.js` must be served over HTTPS
3. The push subscription endpoint URLs are third-party services (Google FCM, Mozilla autopush) — your server needs outbound HTTPS access

---

## 17. Backup & Maintenance

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
```

### Update Supabase

```bash
cd /opt/timetrack/supabase-docker/docker
git pull
docker compose pull
docker compose up -d
```

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
```

---

## 18. Troubleshooting

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

### Reset everything

```bash
cd /opt/timetrack/supabase-docker/docker
docker compose down -v  # WARNING: This deletes all data!
docker compose up -d
# Then re-run migrations
```

### Health check

```bash
# API health
curl -s http://localhost:8000/rest/v1/ \
  -H "apikey: <ANON_KEY>"

# Auth health
curl -s http://localhost:8000/auth/v1/health

# Edge function test
curl -s http://localhost:8000/functions/v1/data-api \
  -H "x-api-key: <YOUR_API_KEY>"
```

---

## Quick Reference: Complete File Structure

```
/opt/timetrack/
├── supabase-docker/          # Supabase self-hosted
│   └── docker/
│       ├── .env              # Supabase config
│       ├── docker-compose.yml
│       └── volumes/
│           └── functions/    # Edge functions
│               ├── create-auth-user/
│               ├── data-api/
│               └── process-reminders/
├── app/                      # TimeTrack frontend
│   ├── .env.production       # Frontend env vars
│   ├── dist/                 # Built static files
│   ├── src/
│   └── supabase/
│       └── migrations/       # SQL migrations
├── backups/                  # Database backups
└── backup.sh                 # Backup script
```

---

*End of Installation101 guide.*
