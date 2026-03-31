# Installation101 – TimeTrack On-Premise Deployment Guide

> **Target OS:** Ubuntu 24.04 LTS  
> **Stack:** Docker, Supabase Self-Hosted, Nginx, Node.js 24+  
> **Last updated:** 2026-03-27

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Setup](#2-server-setup)
3. [Install Docker & Docker Compose](#3-install-docker--docker-compose)
4. [Install Node.js](#4-install-nodejs)
5. [Clone Supabase Self-Hosted](#5-clone-supabase-self-hosted)
6. [Configure Supabase Environment](#6-configure-supabase-environment)
7. [Persistent Volumes](#7-persistent-volumes)
8. [Start Supabase Services](#8-start-supabase-services)
9. [Database Migration](#9-database-migration)
10. [Deploy Edge Functions](#10-deploy-edge-functions)
11. [Build & Deploy the Frontend](#11-build--deploy-the-frontend)
12. [Nginx Reverse Proxy & SSL](#12-nginx-reverse-proxy--ssl)
13. [Security Hardening](#13-security-hardening)
14. [Migration from Supabase Cloud](#14-migration-from-supabase-cloud)
15. [Code Changes Required](#15-code-changes-required)
16. [Secrets & Environment Variables](#16-secrets--environment-variables)
17. [Cron Jobs](#17-cron-jobs)
18. [Storage (Receipts Bucket)](#18-storage-receipts-bucket)
19. [Push Notifications (VAPID)](#19-push-notifications-vapid)
20. [Health Checks & Monitoring](#20-health-checks--monitoring)
21. [Backup & Maintenance](#21-backup--maintenance)
22. [Troubleshooting](#22-troubleshooting)
23. [Optional: S3-Compatible Storage (MinIO)](#23-optional-s3-compatible-storage-minio)

---

## 1. Prerequisites

| Component | Version | Needed by step |
|-----------|---------|----------------|
| Ubuntu | 24.04 LTS | All |
| Docker | 29+ (current stable: 29.3.0) | Step 3 |
| Docker Compose | v5.1+ (bundled with Docker 29+) | Step 3 |
| Node.js | 24 LTS "Krypton" (supported until April 2028) | Step 4 |
| Git | 2.x | Step 2 |
| postgresql-client | 16+ | Step 9 |
| Domain name | Required for SSL | Step 12 |
| Min RAM | 4 GB (8 GB recommended) | — |
| Min Disk | 40 GB SSD | — |

> **Node.js version note:** Node.js 18 and 20 are **end-of-life (EOL)**. Node.js 22 is in **maintenance mode** (ends October 2026). Use **Node.js 24 LTS** ("Krypton") for active long-term support until April 2028.

> **Installation order matters!** This guide installs tools in the order they are needed. Do not skip steps. If you jump ahead to e.g. database migration (step 9) without installing `postgresql-client` (step 2), commands will fail.

---

## 2. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y
```

**Expected output (last lines):**
```
Reading package lists... Done
Building dependency tree... Done
0 upgraded, 0 newly installed, 0 to remove and 0 not to be upgraded.
```

```bash
# Install essential tools
# - curl, wget: downloading files and scripts
# - git: cloning repos (needed in step 5)
# - ufw: firewall management
# - nano, htop: editing files and monitoring
# - postgresql-client: psql command (needed in step 9 for database migration)
sudo apt install -y curl wget git ufw nano htop postgresql-client
```

**Expected output (last lines):**
```
Setting up postgresql-client-16 (16.x-0ubuntu0.24.04.x) ...
Setting up htop (3.3.0-4build1) ...
```

**Verify psql is available** (you'll need this in step 9):
```bash
psql --version
```
**Expected output:**
```
psql (PostgreSQL) 16.x (Ubuntu 16.x-0ubuntu0.24.04.x)
```

```bash
# Configure firewall
# Port 22:  SSH access
# Port 80:  HTTP (needed for Let's Encrypt certificate validation)
# Port 443: HTTPS (production traffic)
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Expected output:**
```
Rules updated
Rules updated (v6)
Firewall is active and enabled on system startup
```

```bash
# Create a dedicated user (optional but recommended)
# Running as a non-root user improves security
sudo adduser timetrack
sudo usermod -aG sudo timetrack
# NOTE: Docker group is added AFTER Docker installation (see step 3)
su - timetrack
```

**Expected output:**
```
Adding user `timetrack' ...
Adding new group `timetrack' (1001) ...
Adding new user `timetrack' (1001) with group `timetrack' ...
Creating home directory `/home/timetrack' ...
```

---

## 3. Install Docker & Docker Compose

> **Why Docker?** Supabase self-hosted runs as a set of Docker containers (PostgreSQL, Auth, REST API, Realtime, Storage, Edge Functions, Kong gateway, Studio dashboard).

```bash
# Remove old/conflicting Docker packages (safe to run even if none exist)
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null
```

```bash
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

# Install Docker Engine + Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

**Verify installation:**

```bash
docker --version
```
**Expected output:**
```
Docker version 29.3.0, build xxxxxxx
```

```bash
docker compose version
```
**Expected output:**
```
Docker Compose version v5.1.1
```

```bash
# Add your user to the docker group so you can run docker without sudo
sudo usermod -aG docker timetrack
sudo usermod -aG docker $USER
newgrp docker

# Verify docker runs without sudo
docker ps
```
**Expected output:**
```
CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
```
(Empty table is correct — no containers are running yet.)

### Configure Docker log rotation

Prevent disk from filling up by configuring log rotation globally. Without this, container logs can grow unbounded and fill your disk.

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

**What this does:** Each container's log is limited to **3 files × 10 MB = 30 MB max per container**. Old log entries are automatically rotated out.

---

## 4. Install Node.js

> **Why Node.js?** You need Node.js + npm to:
> - Generate JWT keys (step 6, Option B/C)
> - Install frontend dependencies (`npm install`, step 11)
> - Build the production frontend (`npm run build`, step 11)
> - Generate VAPID keys for push notifications (step 16)

```bash
# Install Node.js 24 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify installation:**

```bash
node --version
```
**Expected output:**
```
v24.x.x
```

```bash
npm --version
```
**Expected output:**
```
11.x.x
```

> **⚠️ Do NOT use Ubuntu's default `nodejs` package** — it ships Node.js 18, which is EOL. Always install via NodeSource or nvm.

---

## 5. Clone Supabase Self-Hosted

We use the official `docker/` directory from the main Supabase repository, which is the recommended way to self-host Supabase.

```bash
# Create project directory
sudo mkdir -p /opt/timetrack && sudo chown timetrack:timetrack /opt/timetrack
cd /opt/timetrack

# Clone the Supabase repo (sparse checkout for docker/ only)
# This downloads only the docker/ directory (~5 MB instead of full repo)
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/supabase/supabase.git supabase-docker
cd supabase-docker
git sparse-checkout set docker
cp docker/.env.example docker/.env
cd docker
```

**Expected output (last lines):**
```
Filtering content: 100% (xxx/xxx), xxx KiB | xxx KiB/s, done.
```

**Verify the directory structure:**
```bash
ls -la
```
**Expected output (should include these files):**
```
-rw-r--r-- 1 timetrack timetrack  xxxx ... .env
-rw-r--r-- 1 timetrack timetrack  xxxx ... .env.example
-rw-r--r-- 1 timetrack timetrack  xxxx ... docker-compose.yml
drwxr-xr-x 2 timetrack timetrack  xxxx ... volumes
```

> **Note:** The official self-hosted Docker setup lives at [`supabase/supabase/docker`](https://github.com/supabase/supabase/tree/master/docker). It provides a complete `docker-compose.yml` with proper volume mounts, image pinning, and Edge Function support.

---

## 6. Configure Supabase Environment

Edit `/opt/timetrack/supabase-docker/docker/.env`:

```bash
nano .env
```

### Complete .env file with detailed comments

Below is the full `.env` file with explanations for every variable. Lines marked `# CHANGE THIS` must be customized. Lines marked `# DEFAULT OK` can usually be left as-is.

```env
############################################################
# SECTION 1: SECRETS
# ⚠️ CHANGE ALL OF THESE! Use the commands shown to generate.
# Never reuse secrets across environments.
############################################################

# --- PostgreSQL superuser password ---
# Used internally by all Supabase services to connect to the database.
# Generate: openssl rand -base64 32
# Example output: a8Kz3mN7xP2qR5tY9wB4dF6hJ1lO0sU3vX7zA2cE5g=
POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>       # CHANGE THIS

# --- JWT Secret ---
# Shared secret for signing/verifying all JWTs (auth tokens).
# Must be at least 32 characters. All keys (ANON, SERVICE_ROLE) are
# derived from this secret. If you change it, ALL existing tokens
# and keys become invalid.
# Generate: openssl rand -base64 48
# Example output: kP3mN7xR5tY9wB4dF6hJ1lO0sU3vX7zA2cE5gI8qW2eT4uA0bD6fH9jK1nM3pQ
JWT_SECRET=<YOUR_JWT_SECRET>                     # CHANGE THIS

# --- Anon Key ---
# Public JWT with role=anon. Used by the frontend Supabase client.
# This key is safe to expose in client-side code (it's restricted by RLS).
# Generate: see "Generate JWT keys" section below.
ANON_KEY=<GENERATED_ANON_KEY>                    # CHANGE THIS

# --- Service Role Key ---
# Private JWT with role=service_role. Bypasses ALL RLS policies.
# ⚠️ NEVER expose this in client-side code or public repos!
# Used only in edge functions and server-side code.
# Generate: see "Generate JWT keys" section below.
SERVICE_ROLE_KEY=<GENERATED_SERVICE_ROLE_KEY>     # CHANGE THIS

# --- Realtime & Supavisor encryption ---
# Used by the Realtime service and Supavisor connection pooler
# for internal Phoenix framework session encryption.
# Generate: openssl rand -base64 48
SECRET_KEY_BASE=<RANDOM_BASE64_VALUE>            # CHANGE THIS

# --- Vault encryption key ---
# Used by Supavisor (connection pooler) for encrypting tenant configs.
# Must be exactly 32 characters.
# Generate: openssl rand -base64 24 | head -c 32
VAULT_ENC_KEY=<32_CHAR_ENCRYPTION_KEY>           # CHANGE THIS

# --- Postgres Meta encryption key ---
# Used by Studio (postgres-meta service) for encrypting connection strings.
# Must be exactly 32 characters.
# Generate: openssl rand -base64 24 | head -c 32
PG_META_CRYPTO_KEY=<32_CHAR_ENCRYPTION_KEY>      # CHANGE THIS

# --- Analytics (Logflare) tokens ---
# Used by the built-in analytics/logging service.
# Each token should be unique.
# Generate (run twice, one for each): openssl rand -base64 32
LOGFLARE_PUBLIC_ACCESS_TOKEN=<RANDOM_TOKEN>      # CHANGE THIS
LOGFLARE_PRIVATE_ACCESS_TOKEN=<RANDOM_TOKEN>     # CHANGE THIS

# --- Dashboard (Studio) credentials ---
# Username and password for the Supabase Studio web UI.
# Studio should only be accessed via SSH tunnel (see section 13).
DASHBOARD_USERNAME=admin                         # CHANGE THIS (or keep 'admin')
DASHBOARD_PASSWORD=<STRONG_DASHBOARD_PASSWORD>   # CHANGE THIS

############################################################
# SECTION 2: URLS
# Set these to your actual domain names.
# These determine where Supabase expects to be reached from.
############################################################

# --- Site URL ---
# The URL of your frontend application. Used by Auth service for:
# - Email confirmation redirect URLs
# - Password reset redirect URLs
# - OAuth callback validation
SITE_URL=https://timetrack.yourdomain.com        # CHANGE THIS

# --- API External URL ---
# The public URL where the Supabase API is reachable.
# This is embedded in auth emails (confirmation links, magic links).
# Must match your Nginx reverse proxy domain for the API.
API_EXTERNAL_URL=https://api.timetrack.yourdomain.com    # CHANGE THIS

# --- Supabase Public URL ---
# Used internally by services to know their own public address.
# Usually same as API_EXTERNAL_URL.
SUPABASE_PUBLIC_URL=https://api.timetrack.yourdomain.com # CHANGE THIS

############################################################
# SECTION 3: SMTP (Email)
# Required for auth features: password reset, email confirmation,
# magic links, invite emails.
# Without SMTP, users cannot reset passwords or confirm emails.
############################################################

# Admin email shown as sender in outgoing auth emails
SMTP_ADMIN_EMAIL=noreply@yourdomain.com          # CHANGE THIS

# Your SMTP server hostname (e.g., smtp.gmail.com, smtp.sendgrid.net)
SMTP_HOST=smtp.yourdomain.com                    # CHANGE THIS

# SMTP port: 587 (STARTTLS, recommended) or 465 (SSL)
SMTP_PORT=587                                    # DEFAULT OK

# SMTP authentication credentials
SMTP_USER=noreply@yourdomain.com                 # CHANGE THIS
SMTP_PASS=<SMTP_PASSWORD>                        # CHANGE THIS

# Display name in the "From" field of emails
SMTP_SENDER_NAME=TimeTrack                       # DEFAULT OK

############################################################
# SECTION 4: DATABASE
# Internal Docker networking — usually no changes needed.
# The 'db' hostname refers to the PostgreSQL container in
# the Docker Compose network.
############################################################

# Container hostname for PostgreSQL (Docker service name)
POSTGRES_HOST=db                                 # DEFAULT OK

# Database name (Supabase uses 'postgres' by default)
POSTGRES_DB=postgres                             # DEFAULT OK

# Internal port (only exposed within Docker network by default)
POSTGRES_PORT=5432                               # DEFAULT OK

############################################################
# SECTION 5: SUPAVISOR (Connection Pooler)
# Manages PostgreSQL connection pooling for better performance
# under concurrent load. Included by default in Supabase Docker.
############################################################

# Unique identifier for this Supabase tenant. Can be any unique string.
# Generate: openssl rand -hex 8
POOLER_TENANT_ID=<UNIQUE_TENANT_ID>              # CHANGE THIS

# Number of persistent connections per pool to PostgreSQL.
# Increase if you have many concurrent users (>50).
POOLER_DEFAULT_POOL_SIZE=20                      # DEFAULT OK

# Max client connections Supavisor will accept.
# If exceeded, new connections queue or are rejected.
POOLER_MAX_CLIENT_CONN=100                       # DEFAULT OK

# NOTE: Supavisor listens on the host's port 5432.
# For direct psql access (migrations, backups), use port 5433 instead,
# which maps directly to the PostgreSQL container.
```

### Quick secret generation script

Run this to generate all secrets at once, then paste them into `.env`:

```bash
echo "=== Copy these into your .env file ==="
echo ""
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "SECRET_KEY_BASE=$(openssl rand -base64 48)"
echo "VAULT_ENC_KEY=$(openssl rand -base64 24 | head -c 32)"
echo "PG_META_CRYPTO_KEY=$(openssl rand -base64 24 | head -c 32)"
echo "LOGFLARE_PUBLIC_ACCESS_TOKEN=$(openssl rand -base64 32)"
echo "LOGFLARE_PRIVATE_ACCESS_TOKEN=$(openssl rand -base64 32)"
echo "DASHBOARD_PASSWORD=$(openssl rand -base64 24)"
echo "CRON_SECRET=$(openssl rand -base64 32)"
echo "POOLER_TENANT_ID=$(openssl rand -hex 8)"
```

**Expected output (example — your values will differ):**
```
=== Copy these into your .env file ===

POSTGRES_PASSWORD=a8Kz3mN7xP2qR5tY9wB4dF6hJ1lO0sU3vX7zA2cE5g=
JWT_SECRET=kP3mN7xR5tY9wB4dF6hJ1lO0sU3vX7zA2cE5gI8qW2eT4uA0bD6fH9jK1nM3pQ
SECRET_KEY_BASE=xY7zA2cE5gI8qW2eT4uA0bD6fH9jK1nM3pQrS5tV8wZ1bC4dF6gH
VAULT_ENC_KEY=a1B2c3D4e5F6g7H8i9J0k1L2m3N4
PG_META_CRYPTO_KEY=o5P6q7R8s9T0u1V2w3X4y5Z6a7B8
LOGFLARE_PUBLIC_ACCESS_TOKEN=c9D0e1F2g3H4i5J6k7L8m9N0o1P2q3R4s5T6u7V8
LOGFLARE_PRIVATE_ACCESS_TOKEN=w9X0y1Z2a3B4c5D6e7F8g9H0i1J2k3L4m5N6o7P8
DASHBOARD_PASSWORD=q1R2s3T4u5V6w7X8y9Z0a1B2
CRON_SECRET=c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2
POOLER_TENANT_ID=a1b2c3d4e5f6g7h8
```

### Generate JWT keys

After setting `JWT_SECRET` in `.env`, you need to generate two JWT tokens and add them to your `.env` file:

| Variable | Description | Where in `.env` |
|---|---|---|
| `ANON_KEY` | Public anonymous access token (role: `anon`) | Replace the `ANON_KEY=` line |
| `SERVICE_ROLE_KEY` | Admin service token (role: `service_role`) | Replace the `SERVICE_ROLE_KEY=` line |

Both keys are derived from the `JWT_SECRET` you already set in `.env`. Choose one of the methods below to generate them.

> **⚠️ Important: `POSTGRES_PASSWORD` is only applied on first database initialization.**
> When you run `docker compose up` for the first time, the password is written into the PostgreSQL data volume. Changing `POSTGRES_PASSWORD` in `.env` afterwards does **not** update the existing database — it only changes what other services *expect* the password to be. This mismatch causes services like `supabase-analytics` to fail with `password authentication failed for user "supabase_admin"`.
>
> **Do not** try to fix this with `ALTER USER supabase_admin ...` — that role is reserved and the command will be rejected with `"supabase_admin" is a reserved role, only superusers can modify it`.
>
> See [Troubleshooting → Password mismatch after first boot](#password-mismatch-after-first-boot) for recovery steps.

---

**Option A – Official generate-keys script** ⚡ Writes directly to `.env`

This script reads `JWT_SECRET` from your `.env` and **writes `ANON_KEY` and `SERVICE_ROLE_KEY` directly into the `.env` file**, overwriting any existing values for those two keys. Other `.env` values (like `POSTGRES_PASSWORD`) are not modified.

```bash
cd /opt/timetrack/supabase-docker/docker
sh ./utils/generate-keys.sh
```

After running, verify the keys were written:
```bash
grep -E 'ANON_KEY|SERVICE_ROLE_KEY' .env
```

---

**Option B – npx Supabase CLI** 📋 Prints to stdout — copy manually

Prints keys to the terminal. You must copy the output values into `.env` manually at the correct lines.

```bash
npx supabase gen keys --jwt-secret "<YOUR_JWT_SECRET>"
```

**Expected output:**
```
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Copy `anon key` value → `.env` `ANON_KEY=`
Copy `service_role key` value → `.env` `SERVICE_ROLE_KEY=`

---

**Option C – Manual Node.js script** 📋 Prints to stdout — copy manually

Prints keys in `KEY=value` format. Copy both lines into `.env` at the matching variable names.

```bash
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

**Expected output:**
```
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
```

Copy both lines into `.env`, replacing the existing `ANON_KEY=` and `SERVICE_ROLE_KEY=` values.

---

**Option D – Use [jwt.io](https://jwt.io)** 📋 Manual browser generation — copy manually

Create tokens manually in the browser and paste the resulting signed JWTs into `.env`. Use HS256 with your `JWT_SECRET` as the signing key.

- **ANON_KEY payload:** `{"iss":"supabase","ref":"your-project-ref","role":"anon","iat":<unix_now>,"exp":<unix_10y>}`
- **SERVICE_ROLE_KEY payload:** `{"iss":"supabase","ref":"your-project-ref","role":"service_role","iat":<unix_now>,"exp":<unix_10y>}`

---

> **Note:** Newer Supabase versions also support asymmetric ES256 keys (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `JWT_KEYS`, `JWT_JWKS`). Use `sh ./utils/add-new-auth-keys.sh` to generate these. See the [official docs](https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys).

### Verify your .env file

After editing, verify no placeholder values remain:

```bash
grep -n '<' .env | head -20
```

**Expected output (should be empty if all placeholders are replaced):**
```
(no output)
```

If you see lines like `POSTGRES_PASSWORD=<STRONG_RANDOM_PASSWORD>`, those placeholders still need to be replaced.

> **Prerequisites for HTTPS (Traefik / TLS proxy):**
>
> Before starting Docker with Traefik or any TLS proxy, your domain must already resolve to your server:
>
> 1. Add an **A record** for your domain (e.g. `timetrack.example.com`) pointing to your server's public IP
> 2. If using Studio subdomain, add an **A record** for `studio.timetrack.example.com` as well
> 3. Wait for DNS propagation — verify with:
>    ```bash
>    dig +short yourdomain.com
>    ```
>    The output must show your server IP. Let's Encrypt HTTP challenge will fail if DNS is not ready.

### Alternative: Official TLS proxy

The official Supabase Docker setup includes optional Caddy/Nginx TLS proxy overlays with automatic Let's Encrypt:

```bash
# Set PROXY_DOMAIN in .env first, then:
docker compose -f docker-compose.yml -f docker-compose.caddy.yml up -d
# or
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d
```

> This is an alternative to the manual Nginx setup in [section 12](#12-nginx-reverse-proxy--ssl). The manual setup gives you more control (rate limiting, process-reminders blocking, custom caching).

---

## 7. Persistent Volumes

**Critical:** Ensure Postgres data and Storage objects survive container restarts and upgrades. Without host-mounted volumes, a `docker compose down` will **permanently delete all data**.

Create host directories:

```bash
sudo mkdir -p /opt/timetrack/data/postgres
sudo mkdir -p /opt/timetrack/data/storage
sudo chown -R 1000:1000 /opt/timetrack/data
```

**Verify:**
```bash
ls -la /opt/timetrack/data/
```
**Expected output:**
```
drwxr-xr-x 4 1000 1000 4096 ... .
drwxr-xr-x 5 timetrack timetrack 4096 ... ..
drwxr-xr-x 2 1000 1000 4096 ... postgres
drwxr-xr-x 2 1000 1000 4096 ... storage
```

### Pin Docker image versions

Edit `docker-compose.yml` and pin every image to a specific tag. **Never use `:latest` in production.**

#### Why pin versions?

- **Reproducibility** — rebuilding the stack always produces the same result
- **Stability** — an upstream `:latest` push won't break your running system
- **Rollback** — you know exactly which version to revert to
- **Audit trail** — your `docker-compose.yml` documents the exact deployed versions

#### Step-by-step: How to pin

**1. Find current versions from the official repo**

Open the official docker-compose.yml and note every `image:` tag:

```bash
# Browse in browser:
# https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml

# Or fetch directly:
curl -s https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml \
  | grep 'image:' | sort
```

**2. Check your currently running versions (if already deployed)**

```bash
docker compose images
```

**3. Edit `docker-compose.yml`**

```bash
cd /opt/timetrack/supabase-docker/docker
nano docker-compose.yml
```

For each service, replace any `:latest` or untagged image with the specific version:

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

> ⚠️ **These version numbers are illustrative!** Always use the versions from the official `docker-compose.yml` at the time of your deployment.

**4. Verify no untagged or `:latest` images remain**

```bash
grep 'image:' docker-compose.yml | grep -E '(:latest|[^:0-9]+$)'
# Should return nothing — if it does, pin those images too
```

**5. Pull the pinned images and restart**

```bash
docker compose pull
docker compose up -d
```

**6. Confirm running versions**

```bash
docker compose images
```

#### Recording your versions

Keep a version log so you can track upgrades. Create a simple file:

```bash
cat > /opt/timetrack/IMAGE_VERSIONS.md << 'EOF'
# Pinned Docker Image Versions

| Service        | Image                          | Pinned On    |
|----------------|--------------------------------|--------------|
| db             | supabase/postgres:15.6.1.145   | 2025-06-XX   |
| auth           | supabase/gotrue:2.164.0        | 2025-06-XX   |
| rest           | postgrest/postgrest:12.2.3     | 2025-06-XX   |
| realtime       | supabase/realtime:2.33.58      | 2025-06-XX   |
| storage        | supabase/storage-api:1.11.13   | 2025-06-XX   |
| kong           | kong:3.8.1                     | 2025-06-XX   |
| meta           | supabase/postgres-meta:0.84.2  | 2025-06-XX   |
| edge-functions | supabase/edge-runtime:1.65.3   | 2025-06-XX   |
EOF
```

> **Important:** After editing `docker-compose.yml`, verify the volume mount paths are correct for your chosen image versions. The official `supabase/supabase/docker` setup usually has sensible defaults — you primarily need to add/confirm the host-path mounts and pin the image tags.

---

## 8. Clone the TimeTrack Application & Start Supabase Services

### Clone the application

```bash
cd /opt/timetrack

# Clone the TimeTrack application
git clone <YOUR_TIMETRACK_REPO_URL> app
```

### Copy the override file

The TimeTrack app includes a `docker-compose.override.yml` that adds the DB port mapping (5433→5432), Traefik labels, health checks, restart policies, and **critically, connects the `meta` service to the Traefik network so Studio can reach it**. **You must copy it before starting services:**

```bash
cp /opt/timetrack/app/docker/docker-compose.override.yml /opt/timetrack/supabase-docker/docker/docker-compose.override.yml
```

> **📝 Note on `SITE_DOMAIN` and `ACME_EMAIL` warnings:** The override file includes Traefik configuration for production HTTPS. If you see warnings like `The "SITE_DOMAIN" variable is not set`, these are harmless on localhost. For production, set them in your Supabase `.env` file:
> ```bash
> echo 'SITE_DOMAIN=yourdomain.com' >> /opt/timetrack/supabase-docker/docker/.env
> echo 'ACME_EMAIL=you@example.com' >> /opt/timetrack/supabase-docker/docker/.env
> ```
> On localhost, you can safely ignore these warnings — Traefik won't start without valid values but all other services work fine.

> **⚠️ Important:** Without this file, port 5433 will not be exposed and database migrations (step 9) will fail with `Connection refused`.

> **⚠️ Studio ↔ Meta networking:** The override file also connects the `meta` service to the `traefik` network. Without this, Studio and meta are on separate Docker networks (`supabase_traefik` vs `supabase_default`) and Studio cannot reach meta's API at `http://meta:8080`. This causes **500 errors ("Failed to retrieve tables")** in Studio when browsing tables, with Kong logs showing `upstream prematurely closed connection`. If you see this after deployment, verify with:
> ```bash
> docker inspect supabase-meta --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}'
> ```
> The output should include both `supabase_default` and `supabase_traefik`. If `supabase_traefik` is missing, re-copy the override file and restart: `docker compose down && docker compose up -d`.

### Pull and start

```bash
cd /opt/timetrack/supabase-docker/docker

# Pull all container images (this may take 5-10 minutes on first run)
docker compose pull
```

```bash
# Start all services in background
docker compose up -d
```

**Expected output:**
```
[+] Running 10/10
 ✔ Container supabase-db              Started
 ✔ Container supabase-analytics       Started
 ✔ Container supabase-auth            Started
 ✔ Container supabase-rest            Started
 ✔ Container supabase-realtime        Started
 ✔ Container supabase-storage         Started
 ✔ Container supabase-meta            Started
 ✔ Container supabase-edge-functions  Started
 ✔ Container supabase-studio          Started
 ✔ Container supabase-kong            Started
```

```bash
# Verify all services are running — confirm 5433 is mapped
docker compose ps
```

**Expected output (all should show "Up" or "running"):**
```
NAME                        STATUS          PORTS
supabase-db                 Up (healthy)    0.0.0.0:5432->5432/tcp, 0.0.0.0:5433->5432/tcp
supabase-auth               Up (healthy)    9999/tcp
supabase-rest               Up (healthy)    3000/tcp
supabase-realtime            Up              4000/tcp
supabase-storage             Up (healthy)    5000/tcp
supabase-meta               Up (healthy)    8080/tcp
supabase-edge-functions      Up              8081/tcp
supabase-studio              Up              3000/tcp
supabase-kong                Up              0.0.0.0:8000->8000/tcp
```

> **⚠️ Verify port 5433:** Look for `0.0.0.0:5433->5432/tcp` in the `supabase-db` row. If it's missing, the override file was not copied correctly — re-run the copy step and restart with `docker compose down && docker compose up -d`.

> **⚠️ If any container shows "Exited" or "Restarting"**, check its logs:
> ```bash
> docker compose logs <service-name> --tail=50
> ```
> Common causes: wrong password in `.env`, port conflict, missing volume directory.

```bash
# Watch live logs (Ctrl+C to stop)
docker compose logs -f --tail=50
```

### Verify API is running

Wait ~30 seconds after starting, then:

```bash
curl -s http://localhost:8000/rest/v1/ \
  -H "apikey: <YOUR_ANON_KEY>" | head -20
```

**Expected output (JSON array of tables):**
```json
[]
```

(Empty array is correct — no tables exist yet. After database migration in step 9, this will list tables.)

**If you get an error:**
```
curl: (7) Failed to connect to localhost port 8000
```
→ Services are still starting. Wait 30 more seconds and retry.

---

## 9. Database Migration

> **Prerequisites:**
> - `psql` (installed in step 2)
> - Supabase services **must be running** (step 8)
> - Port 5433 must be mapped — verify with `docker compose ps` (see step 8)

### Set the database connection string

```bash
# Set the connection string (used by psql throughout this section)
# Replace <POSTGRES_PASSWORD> with the value from your .env file
#
# IMPORTANT: Use port 5433, NOT 5432!
# Port 5432 = Supavisor (connection pooler) — requires tenant-aware strings
# Port 5433 = Direct PostgreSQL access — works with standard psql
export SUPABASE_DB_URL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5433/postgres"

# Verify connection works
psql "$SUPABASE_DB_URL" -c "SELECT version();"
```


> **💡 Alternative:** If port 5433 is not exposed, connect directly via Docker:
> ```bash
> docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT version();"
> ```

**Expected output:**
```
                                                 version
---------------------------------------------------------------------------------------------------------
 PostgreSQL 15.6 on x86_64-pc-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit
(1 row)
```

### Apply all migrations

> **⚠️ Important:** Run this from the **app directory**, not the Supabase docker directory.

```bash
cd /opt/timetrack/app

# Apply all migrations in filename order
for f in supabase/migrations/*.sql; do
  echo "Applying $f ..."
  psql "$SUPABASE_DB_URL" -f "$f"
  if [ $? -ne 0 ]; then
    echo "❌ FAILED on $f — stopping."
    break
  fi
  echo "✅ Done: $f"
done
```

**Expected output (for each migration file):**
```
Applying supabase/migrations/20240101000000_initial.sql ...
CREATE TABLE
CREATE INDEX
CREATE POLICY
...
✅ Done: supabase/migrations/20240101000000_initial.sql
Applying supabase/migrations/20240102000000_add_projects.sql ...
...
```

### Verify database schema

```bash
psql "$SUPABASE_DB_URL" -c "\dt public.*"
```

**Expected output (22 tables):**
```
               List of relations
 Schema |          Name          | Type  |  Owner
--------+------------------------+-------+----------
 public | absence_reasons        | table | postgres
 public | absences               | table | postgres
 public | api_keys               | table | postgres
 public | api_logs               | table | postgres
 public | api_rate_limits        | table | postgres
 public | audit_log              | table | postgres
 public | companies              | table | postgres
 public | idempotency_keys       | table | postgres
 public | login_sessions         | table | postgres
 public | notification_log       | table | postgres
 public | project_hours          | table | postgres
 public | projects               | table | postgres
 public | push_subscriptions     | table | postgres
 public | reminder_rules         | table | postgres
 public | time_entries           | table | postgres
 public | travel_expenses        | table | postgres
 public | user_managers          | table | postgres
 public | user_reminders         | table | postgres
 public | users                  | table | postgres
 public | vacation_requests      | table | postgres
 public | work_bank_transactions | table | postgres
 public | workplaces             | table | postgres
(22 rows)
```

> **⚠️ If you see fewer tables**, some migration files may have failed. Check the migration output for errors and re-run the failed file manually.

### Verify RLS policies

```bash
psql "$SUPABASE_DB_URL" -c "
  SELECT schemaname, tablename, policyname
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
"
```

**Expected output (multiple rows — one for each RLS policy):**
```
 schemaname |      tablename       |              policyname
------------+----------------------+----------------------------------------
 public     | absence_reasons      | Absence reasons viewable by same company
 public     | absences             | Users can view own absences
 ...
```

(The exact policies depend on your migration files. You should see at least one policy per table.)

### Verify database functions

```bash
psql "$SUPABASE_DB_URL" -c "
  SELECT routine_name
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  ORDER BY routine_name;
"
```

**Expected output (5 functions):**
```
      routine_name
------------------------
 audit_log_trigger
 auth_user_company_id
 auth_user_id
 auth_user_role
 is_same_company_user
(5 rows)
```

### Verify API now sees tables

```bash
curl -s http://localhost:8000/rest/v1/ \
  -H "apikey: <YOUR_ANON_KEY>" | python3 -m json.tool | head -10
```

**Expected output (non-empty JSON array):**
```json
[
    {
        "schema": "public",
        "name": "absence_reasons",
        ...
    },
    ...
]
```

---

## 10. Deploy Edge Functions

> **Prerequisites:** Supabase services running (step 8), TimeTrack app cloned (step 9).

The application uses 3 Edge Functions:

| Function | Purpose | Trigger |
|----------|---------|---------|
| `create-auth-user` | Admin creates auth accounts for employees | Called from Admin UI |
| `data-api` | External REST API with API key auth | Called by external systems |
| `process-reminders` | Push notification reminders | Cron job (step 17) |

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
```

**Verify files were copied:**
```bash
ls -la "$FUNCTIONS_DIR"/
```
**Expected output:**
```
drwxr-xr-x 2 timetrack timetrack 4096 ... create-auth-user
drwxr-xr-x 2 timetrack timetrack 4096 ... data-api
drwxr-xr-x 2 timetrack timetrack 4096 ... process-reminders
```

```bash
# Restart edge-functions container to pick up the new functions
# NOTE: The Docker Compose service name is "functions", not "supabase-edge-functions"
# (supabase-edge-functions is the container name)
cd /opt/timetrack/supabase-docker/docker
docker compose restart functions
```

**Expected output:**
```
[+] Restarting 1/1
 ✔ Container supabase-edge-functions  Started
```

### Option B: Use Supabase CLI

```bash
cd /opt/timetrack/app

# Set the database URL for CLI
export SUPABASE_DB_URL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5433/postgres"

# Deploy functions
supabase functions deploy create-auth-user --project-ref local
supabase functions deploy data-api --project-ref local
supabase functions deploy process-reminders --project-ref local
```

### Set Edge Function secrets

These secrets must be available to the edge functions runtime. Add them to the edge function environment in `docker-compose.yml` or via a `.env` file mounted into the edge-runtime container:

```bash
# In the docker .env or edge function environment:

# Internal URL for edge functions to call the Supabase API
# Uses Docker internal network hostname 'kong' (the API gateway container)
SUPABASE_URL=http://kong:8000

# Same keys you generated in step 6
SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>

# Secret used to authenticate cron-triggered calls to process-reminders.
# The cron job (step 17) sends this in the x-cron-secret header.
# Generate: openssl rand -base64 32
CRON_SECRET=<YOUR_CRON_SECRET>

# VAPID keys for Web Push notifications.
# See step 16 for how to generate these.
VAPID_PUBLIC_KEY=<YOUR_VAPID_PUBLIC_KEY>
VAPID_PRIVATE_KEY=<YOUR_VAPID_PRIVATE_KEY>
```

### Verify edge functions are responding

```bash
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:8000/functions/v1/data-api \
  -H "apikey: <YOUR_ANON_KEY>"
```

**Expected output:**
```
401
```
(401 Unauthorized is correct — the function is running but requires proper auth. A 404 or 502 would indicate a problem.)

---

## 11. Build & Deploy the Frontend

> **Prerequisites:** Node.js installed (step 4), TimeTrack app cloned (step 9).

### Clone and configure

```bash
cd /opt/timetrack/app

# Install dependencies
npm install
```

**Expected output (last lines):**
```
added xxx packages in xxs
```

> **⚠️ If you see `npm WARN` messages**, they are usually non-critical. `npm ERR!` messages indicate a real problem — check Node.js version (`node --version` should be v24.x.x).

```bash
# Create production .env file
# These variables are embedded into the built JavaScript at build time.
cat > .env.production << 'EOF'
# URL where the Supabase API is publicly reachable (your Nginx reverse proxy)
VITE_SUPABASE_URL=https://api.timetrack.yourdomain.com

# The ANON_KEY generated in step 6 (safe to include — restricted by RLS)
VITE_SUPABASE_PUBLISHABLE_KEY=<YOUR_ANON_KEY>

# Identifier for this Supabase instance (can be any string for self-hosted)
VITE_SUPABASE_PROJECT_ID=local
EOF
```

### Build

```bash
npm run build
```

**Expected output:**
```
vite v5.x.x building for production...
✓ xxx modules transformed.
dist/index.html                  x.xx kB │ gzip: x.xx kB
dist/assets/index-xxxxxxxx.css   xx.xx kB │ gzip: xx.xx kB
dist/assets/index-xxxxxxxx.js    xxx.xx kB │ gzip: xxx.xx kB
✓ built in x.xxs
```

**Verify the output:**
```bash
ls -la dist/
```

**Expected output:**
```
-rw-r--r-- 1 timetrack timetrack  xxxx ... index.html
-rw-r--r-- 1 timetrack timetrack  xxxx ... favicon.svg
-rw-r--r-- 1 timetrack timetrack  xxxx ... manifest.json
-rw-r--r-- 1 timetrack timetrack  xxxx ... sw.js
-rw-r--r-- 1 timetrack timetrack  xxxx ... robots.txt
drwxr-xr-x 2 timetrack timetrack  xxxx ... assets
```

### Serve with Nginx (see step 12)

The built `dist/` folder contains static files served by Nginx.

---

## 12. Nginx Reverse Proxy & SSL

> **Prerequisites:** Frontend built (step 11), Supabase services running (step 8), DNS configured (your domain must point to this server).

### Install Nginx & Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

**Verify:**
```bash
nginx -v
```
**Expected output:**
```
nginx version: nginx/1.24.0 (Ubuntu)
```

### Configure Nginx

Create `/etc/nginx/sites-available/timetrack`:

```nginx
# --- Rate limiting zones (shared memory across all Nginx workers) ---
# api_limit: max 10 requests/second per client IP for API
# frontend_limit: max 30 requests/second per client IP for frontend
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=frontend_limit:10m rate=30r/s;

# Frontend — serves the built React SPA
server {
    listen 80;
    server_name timetrack.yourdomain.com;

    # Serve the built frontend from dist/ directory
    root /opt/timetrack/app/dist;
    index index.html;

    # Rate limit for frontend (generous — mostly static files)
    limit_req zone=frontend_limit burst=60 nodelay;

    # SPA routing — any path that doesn't match a file serves index.html
    # This is required for React Router to handle client-side routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively (they have content hashes in filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker must NEVER be cached (otherwise PWA updates break)
    location /sw.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}

# Supabase API — reverse proxy to Kong (Docker container on port 8000)
server {
    listen 80;
    server_name api.timetrack.yourdomain.com;

    # Rate limiting for API endpoints
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;

    # Block public access to process-reminders edge function.
    # This function should only be called by the local cron job (step 17).
    # Only localhost connections are allowed through.
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

    # All other API requests → forward to Supabase Kong gateway
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (required for Supabase Realtime)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Enable and test

```bash
# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/timetrack /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration for syntax errors
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

```bash
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

> **Prerequisites:** DNS A records for `timetrack.yourdomain.com` and `api.timetrack.yourdomain.com` must point to this server's public IP.

```bash
sudo certbot --nginx -d timetrack.yourdomain.com -d api.timetrack.yourdomain.com
```

**Expected output:**
```
Congratulations! You have successfully enabled HTTPS on:
- https://timetrack.yourdomain.com
- https://api.timetrack.yourdomain.com
```

```bash
sudo systemctl reload nginx

# Verify auto-renewal is working
sudo certbot renew --dry-run
```

**Expected output:**
```
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/timetrack.yourdomain.com/fullchain.pem (success)
```

---

## 13. Security Hardening

### 13.1 Install and configure fail2ban

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
```

**Verify:**
```bash
sudo fail2ban-client status
```
**Expected output:**
```
Status
|- Number of jail:      4
`- Jail list:   nginx-botsearch, nginx-http-auth, nginx-limit-req, sshd
```

### 13.2 Docker log rotation (already configured in step 3)

The global `/etc/docker/daemon.json` limits each container log to **3 files × 10 MB = 30 MB max per container**. This prevents any single container from filling the disk.

### 13.3 Restrict Supabase Studio (Dashboard)

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

### 13.4 SSH hardening (optional but recommended)

```bash
# Disable root login and password auth
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

> **⚠️ Warning:** Ensure you have SSH key access configured and tested BEFORE disabling password authentication! Otherwise you will lock yourself out.

### 13.5 Automatic security updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 14. Migration from Supabase Cloud

When moving from Supabase Cloud to self-hosted, these are the key steps:

### 14.1 Export database

```bash
# From Supabase Cloud (using their CLI or dashboard)
# Option A: pg_dump via connection string from Cloud dashboard
pg_dump "postgresql://postgres:<CLOUD_DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" \
  --schema=public \
  --no-owner \
  --no-privileges \
  -F c -f timetrack_backup.dump
```

**Expected output:**
```
(no output on success — the file is created silently)
```

**Verify the dump file:**
```bash
ls -lh timetrack_backup.dump
```
**Expected output:**
```
-rw-r--r-- 1 timetrack timetrack 2.5M ... timetrack_backup.dump
```

```bash
# Option B: Using Supabase CLI
supabase db dump --project-ref <CLOUD_PROJECT_REF> -f schema_dump.sql
supabase db dump --project-ref <CLOUD_PROJECT_REF> --data-only -f data_dump.sql
```

### 14.2 Import to self-hosted

```bash
# Restore schema + data
pg_restore -h localhost -p 5433 -U postgres -d postgres \
  --no-owner --no-privileges timetrack_backup.dump

# Or with SQL dumps:
psql "$SUPABASE_DB_URL" -f schema_dump.sql
psql "$SUPABASE_DB_URL" -f data_dump.sql
```

**Expected output (pg_restore):**
```
(warnings about existing objects are normal if you already ran migrations)
```

### 14.3 Migrate auth users

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

**Expected output:**
```
INSERT 0 xx
```
(Where xx is the number of users imported.)

### 14.4 Migrate storage objects

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

## 15. Code Changes Required

### 15.1 Environment variables (`.env.production`)

| Variable | Cloud Value | Self-Hosted Value |
|----------|------------|-------------------|
| `VITE_SUPABASE_URL` | `https://pqmdsvdcbyefdngdmuud.supabase.co` | `https://api.timetrack.yourdomain.com` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cloud anon key | Your generated anon key |
| `VITE_SUPABASE_PROJECT_ID` | `pqmdsvdcbyefdngdmuud` | `local` (or any identifier) |

### 15.2 Supabase client (`src/integrations/supabase/client.ts`)

**No code changes needed!** The client reads from environment variables:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

Just ensure your `.env.production` has the correct values before building.

### 15.3 Edge Function URLs

Edge functions are called via the Supabase URL. Since `VITE_SUPABASE_URL` changes, all edge function calls automatically point to the new host. No code changes needed if you use the standard pattern:

```typescript
// This already works — reads URL from env
const { data } = await supabase.functions.invoke('create-auth-user', { body: {...} });
```

### 15.4 Service Worker (`public/sw.js`)

Check if there are any hardcoded Supabase URLs in `sw.js`. If so, replace them with your domain.

### 15.5 PWA Manifest (`public/manifest.json`)

Update `start_url` and `scope` if they reference the cloud domain.

### 15.6 Remove `lovable-tagger` (optional)

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

## 16. Secrets & Environment Variables

### Edge Function secrets mapping

| Secret Name | Where to Set | Description |
|-------------|-------------|-------------|
| `SUPABASE_URL` | Docker `.env` / Edge runtime | Internal API URL (`http://kong:8000`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Docker `.env` / Edge runtime | Full-access service key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Docker `.env` / Edge runtime | Public anon key |
| `CRON_SECRET` | Docker `.env` / Edge runtime | Auth token for cron-triggered functions |
| `VAPID_PUBLIC_KEY` | Docker `.env` / Edge runtime + frontend | Web Push public key |
| `VAPID_PRIVATE_KEY` | Docker `.env` / Edge runtime | Web Push private key (never in frontend!) |

### Generate new VAPID keys

> **Prerequisites:** Node.js installed (step 4).

```bash
npx web-push generate-vapid-keys
```

**Expected output:**
```
=======================================

Public Key:
BPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Private Key:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

=======================================
```

Copy both keys into your edge function environment variables.

> **Note:** If you reuse the same VAPID keys from Cloud, existing push subscriptions will continue to work. If you generate new keys, users must re-subscribe.

---

## 17. Cron Jobs

> **Prerequisites:** Supabase services running (step 8), Edge functions deployed (step 10), `CRON_SECRET` set in edge function environment (step 10).

The `process-reminders` edge function must be triggered periodically (every 5 minutes recommended).

> **Important:** The Nginx config (step 12) blocks external access to `/functions/v1/process-reminders`. The cron job runs on localhost and is allowed through.

### Option A: System cron (recommended)

```bash
crontab -e

# Add this line (uses localhost to bypass Nginx external block):
*/5 * * * * curl -s -X POST \
  "http://localhost:8000/functions/v1/process-reminders" \
  -H "x-cron-secret: <YOUR_CRON_SECRET>" \
  -H "Content-Type: application/json" \
  >> /var/log/timetrack-reminders.log 2>&1
```

> **Note:** We call `localhost:8000` (Kong) directly instead of the public domain. This avoids the Nginx restriction and keeps the request internal.

**Verify cron is set:**
```bash
crontab -l
```
**Expected output:**
```
*/5 * * * * curl -s -X POST "http://localhost:8000/functions/v1/process-reminders" ...
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

## 18. Storage (Receipts Bucket)

> **Prerequisites:** Supabase services running (step 8), database migrated (step 9).

Create the `receipts` storage bucket in self-hosted Supabase:

```sql
-- Connect to the database
psql "$SUPABASE_DB_URL" -c "
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('receipts', 'receipts', true)
  ON CONFLICT (id) DO NOTHING;
"
```

**Expected output:**
```
INSERT 0 1
```

Or via the Supabase Studio dashboard at `http://localhost:3000` → Storage → Create Bucket.

### Storage policies

Ensure the same RLS policies from Cloud are applied. Check your migration files for storage policies.

---

## 19. Push Notifications (VAPID)

The `process-reminders` function sends Web Push notifications. For this to work on-premise:

1. ✅ VAPID keys must be set as edge function secrets (see step 16)
2. ✅ The frontend `sw.js` must be served over HTTPS (see step 12)
3. ✅ The push subscription endpoint URLs are third-party services (Google FCM, Mozilla autopush) — your server needs outbound HTTPS access to the internet

---

## 20. Health Checks & Monitoring

### 20.1 Health check script

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
STOPPED=$(cd /opt/timetrack/supabase-docker/docker && docker compose ps --format json 2>/dev/null | \
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

**Test the health check:**
```bash
/opt/timetrack/healthcheck.sh
```

**Expected output (all services healthy):**
```
=== TimeTrack Health Check: Thu Mar 27 12:00:00 UTC 2026 ===
✅ PostgREST: OK (200)
✅ Auth: OK (200)
✅ Storage: OK (200)
✅ All Docker containers: running
✅ Disk usage: 23%
=== Result: 0 failure(s) ===
```

### 20.2 Automated health checks via cron

```bash
crontab -e

# Run health check every 10 minutes, log failures
*/10 * * * * /opt/timetrack/healthcheck.sh >> /var/log/timetrack-health.log 2>&1
```

### 20.3 Docker Compose health checks

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

## 21. Backup & Maintenance

### Database backup (daily cron)

```bash
# Create backup script
cat > /opt/timetrack/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/timetrack/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump "postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5433/postgres" \
  -F c -f "$BACKUP_DIR/timetrack_$TIMESTAMP.dump"

# Keep last 30 days
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete

echo "$(date): Backup completed -> timetrack_$TIMESTAMP.dump"
EOF

chmod +x /opt/timetrack/backup.sh
```

**Test the backup:**
```bash
/opt/timetrack/backup.sh
```

**Expected output:**
```
Thu Mar 27 02:00:00 UTC 2026: Backup completed -> timetrack_20260327_020000.dump
```

```bash
# Add to crontab (runs daily at 2:00 AM)
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
cp -r supabase/functions/* /opt/timetrack/supabase-docker/docker/volumes/functions/
cd /opt/timetrack/supabase-docker/docker
docker compose restart functions
```

### Update Supabase

```bash
cd /opt/timetrack/supabase-docker/docker

# Check release notes BEFORE upgrading!
# Update pinned image versions in docker-compose.yml
# Then:
docker compose pull
docker compose up -d
```

> **⚠️ Warning:** Never blindly `git pull` + `docker compose pull` on the Supabase repo. Always check the changelog for breaking changes and update image tags deliberately.

### Monitor

```bash
# Check Docker containers
docker compose ps

# View logs for a specific service
docker compose logs -f supabase-auth
docker compose logs -f supabase-rest
docker compose logs -f functions

# Check disk usage
df -h
docker system df

# Check fail2ban status
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-limit-req
```

---

## 22. Troubleshooting

### Common issues

| Problem | Likely cause | Solution |
|---------|-------------|----------|
| **CORS errors** | `API_EXTERNAL_URL` doesn't match your domain | Fix the URL in `.env`, restart services |
| **Auth not working** | `SITE_URL` doesn't match frontend domain | Fix in `.env`, restart `supabase-auth` |
| **Edge functions 502** | Function crashed or missing secrets | Check logs: `docker compose logs functions` |
| **Database connection refused** | Wrong password or port not exposed | Verify `POSTGRES_PASSWORD` in `.env` and use port **5433** (not 5432) |
| **`password authentication failed for user "supabase_admin"`** | `POSTGRES_PASSWORD` changed in `.env` after first boot | See [Password mismatch after first boot](#password-mismatch-after-first-boot) below |
| **`"supabase_admin" is a reserved role`** | Attempted manual `ALTER USER` on reserved role | Do **not** modify reserved roles manually — see recovery steps below |
| **"Tenant or user not found"** | Connecting to Supavisor (port 5432) instead of PostgreSQL | Use port **5433** for direct `psql` access, or use `docker exec -i supabase-db psql -U postgres -d postgres` |
| **Push notifications fail** | Missing VAPID keys or no outbound HTTPS | Set VAPID keys (step 16), check firewall allows outbound 443 |
| **Storage upload fails** | Missing `receipts` bucket | Create it (step 18) |
| **JWT errors** | Mismatched `JWT_SECRET` and keys | Regenerate ANON/SERVICE keys with same JWT_SECRET |
| **PostgREST 401** | Missing RLS policies or functions | Re-run migrations (step 9) |
| **429 Too Many Requests** | Nginx rate limit hit | Adjust `rate` and `burst` in Nginx config |
| **fail2ban banning legit IPs** | Rate limit too aggressive | Check `sudo fail2ban-client status nginx-limit-req`, unban: `sudo fail2ban-client set nginx-limit-req unbanip <IP>` |
| **Disk full** | Docker logs or old images | `docker system df`, `docker image prune -a`, check log rotation |
| **`psql: command not found`** | postgresql-client not installed | `sudo apt install -y postgresql-client` |
| **`npm: command not found`** | Node.js not installed | Follow step 4 to install Node.js 24 |

### Password mismatch after first boot

**Symptoms:**
- `supabase-analytics` container keeps restarting
- Logs show: `password authentication failed for user "supabase_admin"`
- Attempting `ALTER USER supabase_admin ...` fails with: `"supabase_admin" is a reserved role, only superusers can modify it`

**Root cause:** `POSTGRES_PASSWORD` was changed in `.env` after the database volume was already initialized. The database still has the original password, but other services now try to connect with the new one.

**Recovery Option A — Revert the password (recommended):**

Restore `POSTGRES_PASSWORD` in `.env` to the original value that was used when the database volume was first created, then restart:

```bash
cd /opt/timetrack/supabase-docker/docker
# Edit .env and restore the original POSTGRES_PASSWORD
nano .env
docker compose down
docker compose up -d
```

**Recovery Option B — Rotate with the official script:**

If you intentionally need a new database password, use the official password rotation script provided in the Supabase self-hosted Docker bundle (if available), rather than running raw `ALTER ROLE` commands. Then restart the stack.

**Recovery Option C — Full reset (destroys all data):**

If neither option works and you're OK losing data:

```bash
cd /opt/timetrack/supabase-docker/docker
docker compose down -v  # ⚠️ WARNING: This deletes ALL data including the DB volume!
docker compose up -d
# Then re-run migrations (step 9)
```

**Verification after recovery:**

```bash
docker compose ps                                    # All containers should be "Up" / healthy
docker compose logs supabase-analytics --tail=50     # No more "invalid_password" errors
```

### Reset everything

```bash
cd /opt/timetrack/supabase-docker/docker
docker compose down -v  # ⚠️ WARNING: This deletes ALL data!
docker compose up -d
# Then re-run migrations (step 9)
```

---

## 23. Optional: S3-Compatible Storage (MinIO)

For production deployments that need scalable, redundant storage, you can replace the default Supabase storage with MinIO (S3-compatible object storage).

### 23.1 Deploy MinIO

Add to `docker-compose.yml` or run separately:

```yaml
minio:
  image: minio/minio:RELEASE.2024-12-18T13-15-44Z
  command: server /data --console-address ":9001"
  ports:
    - "127.0.0.1:9000:9000"    # S3 API (localhost only)
    - "127.0.0.1:9001:9001"    # MinIO Console (localhost only)
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

### 23.2 Configure Supabase Storage to use MinIO

In the Supabase `.env`, set the storage backend:

```env
# Switch from local filesystem to S3-compatible storage
STORAGE_BACKEND=s3

# Bucket name in MinIO (created in step 23.3)
GLOBAL_S3_BUCKET=supabase-storage

# MinIO endpoint (Docker internal network)
GLOBAL_S3_ENDPOINT=http://minio:9000

# Required for MinIO (path-style vs virtual-hosted-style)
GLOBAL_S3_FORCE_PATH_STYLE=true

# MinIO credentials
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=<STRONG_PASSWORD>

# Any valid AWS region (MinIO ignores this but it's required)
AWS_DEFAULT_REGION=us-east-1
```

### 23.3 Create the bucket in MinIO

```bash
# Install MinIO client
wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# Configure and create bucket
mc alias set local http://localhost:9000 minioadmin <STRONG_PASSWORD>
mc mb local/supabase-storage
mc anonymous set download local/supabase-storage/receipts
```

**Expected output:**
```
Bucket created successfully `local/supabase-storage`.
Access permission for `local/supabase-storage/receipts` is set to `download`
```

> **Note:** This is a next-phase improvement. The default local storage works fine for small-to-medium deployments. Consider MinIO when you need backup replication, multi-node storage, or >100 GB of files.

---

## Quick Reference: Complete File Structure

```
/opt/timetrack/
├── supabase-docker/              # supabase/supabase (sparse checkout)
│   └── docker/                   # Docker setup directory
│       ├── .env                  # Supabase config (all secrets here)
│       ├── docker-compose.yml    # Pinned image versions + volumes
│       └── volumes/
│           └── functions/        # Edge functions (mounted volume)
│               ├── create-auth-user/
│               ├── data-api/
│               └── process-reminders/
├── app/                          # TimeTrack frontend
│   ├── .env.production           # Frontend env vars (3 variables)
│   ├── dist/                     # Built static files (served by Nginx)
│   ├── src/
│   └── supabase/
│       └── migrations/           # SQL migrations
├── data/                         # Persistent data (host-mounted)
│   ├── postgres/                 # PostgreSQL data
│   ├── storage/                  # Supabase Storage files
│   └── minio/                    # (optional) MinIO data
├── backups/                      # Database backups (daily cron)
├── backup.sh                     # Backup script (step 21)
└── healthcheck.sh                # Health check script (step 20)
```

---

## Quick Reference: Installation Checklist

Use this to track your progress:

- [ ] **Step 2:** Server updated, tools installed (`curl`, `git`, `psql`, `ufw`)
- [ ] **Step 3:** Docker 29+ installed, log rotation configured
- [ ] **Step 4:** Node.js 24 LTS installed (`node --version` → v24.x.x)
- [ ] **Step 5:** Supabase repo cloned, `.env` copied
- [ ] **Step 6:** All secrets generated and set in `.env`
- [ ] **Step 6:** JWT keys generated (`ANON_KEY`, `SERVICE_ROLE_KEY`)
- [ ] **Step 7:** Persistent volume directories created
- [ ] **Step 7:** Docker image versions pinned in `docker-compose.yml`
- [ ] **Step 8:** All Supabase containers running (`docker compose ps`)
- [ ] **Step 9:** All migrations applied, 22 tables created
- [ ] **Step 9:** RLS policies and 5 database functions verified
- [ ] **Step 10:** Edge functions deployed, secrets set
- [ ] **Step 11:** Frontend built (`dist/` exists)
- [ ] **Step 12:** Nginx configured, SSL certificate obtained
- [ ] **Step 13:** fail2ban active, Studio restricted to localhost
- [ ] **Step 16:** VAPID keys generated and set
- [ ] **Step 17:** Cron job for process-reminders set (every 5 min)
- [ ] **Step 18:** `receipts` storage bucket created
- [ ] **Step 20:** Health check script working
- [ ] **Step 21:** Backup cron configured (daily at 2 AM)

---

*End of Installation101 guide.*
