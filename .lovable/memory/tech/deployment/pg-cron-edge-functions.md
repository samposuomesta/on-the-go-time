---
name: pg_cron Edge Function URLs
description: Self-hosted pg_cron jobs must call http://kong:8000 not the Lovable Cloud URL
type: constraint
---
On self-hosted Supabase (Ubuntu), `pg_cron` jobs that invoke Edge Functions via `pg_net` must use the internal Docker hostname `http://kong:8000/functions/v1/<name>`, NOT the Lovable Cloud public URL (`https://<ref>.supabase.co`). Using the Lovable Cloud URL silently returns HTTP 200 from the wrong instance, so `processed=0` and `notification_log` stays empty.

Required headers:
- `Content-Type: application/json`
- `Authorization: Bearer <SERVICE_ROLE_KEY>` (from `/opt/timetrack/supabase-docker/docker/.env`)

Verify delivery via `SELECT * FROM net._http_response ORDER BY created DESC` — body must contain `processed > 0` when reminders are due.

**Why:** Cron jobs are sometimes seeded with Lovable Cloud URLs during initial setup; they must be re-scheduled per environment.
