

# Production-Grade Data API Edge Function (Final Revision)

## Overview
Single `data-api` Edge Function with API key authentication, company-scoped access, composite cursor pagination, idempotency, rate limiting, permission enforcement, API logging, and optimized `/changes` endpoint. All with automatic cleanup policies.

## 1. Database Migration

### New tables

**`api_keys`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| company_id | uuid FK → companies | Scopes all queries |
| key_hash | text NOT NULL | SHA-256 |
| label | text | Human name |
| active | boolean DEFAULT true | |
| last_used_at | timestamptz | Updated per request |
| permissions | jsonb | `{"read":["time_entries",...],"write":["time_entries",...]}` |
| rate_limit | integer DEFAULT 1000 | Requests/hour |
| created_at | timestamptz DEFAULT now() | |

RLS: Admin-only CRUD scoped to own company.

**`api_rate_limits`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| api_key_id | uuid FK → api_keys ON DELETE CASCADE | |
| window_start | timestamptz | Hourly window |
| request_count | integer DEFAULT 0 | |
| UNIQUE(api_key_id, window_start) | | |

No RLS. Upsert pattern:
```sql
INSERT INTO api_rate_limits (api_key_id, window_start, request_count)
VALUES ($1, date_trunc('hour', now()), 1)
ON CONFLICT (api_key_id, window_start)
DO UPDATE SET request_count = api_rate_limits.request_count + 1
RETURNING request_count;
```

**`idempotency_keys`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| api_key_id | uuid FK → api_keys ON DELETE CASCADE | |
| idempotency_key | text NOT NULL | |
| response_status | integer | |
| response_body | jsonb | |
| created_at | timestamptz DEFAULT now() | |
| UNIQUE(api_key_id, idempotency_key) | | |

No RLS. Cleanup: `DELETE FROM idempotency_keys WHERE created_at < now() - interval '7 days';`

**`api_logs`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| api_key_id | uuid FK → api_keys ON DELETE CASCADE | |
| endpoint | text | e.g. `GET /time-entries` |
| status_code | integer | |
| response_time_ms | integer | |
| created_at | timestamptz DEFAULT now() | |

No RLS. Cleanup: `DELETE FROM api_logs WHERE created_at < now() - interval '30 days';`

### Alter existing tables: sync tracking fields
Add to `time_entries`, `project_hours`, `travel_expenses`, `absences`, `vacation_requests`:
- `external_id TEXT`
- `sync_status TEXT DEFAULT 'pending'`
- `synced_at TIMESTAMPTZ`

### Email index
```sql
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));
```

## 2. Edge Function: `data-api`

### Request lifecycle
1. Read `X-API-Key` header → SHA-256 hash → lookup in `api_keys` (must be active)
2. Extract `company_id`, `permissions`, `rate_limit`
3. Rate limit check via upsert → 429 if exceeded
4. Permission check: validate endpoint against `permissions` JSON
5. Route to handler
6. Update `last_used_at`
7. Log to `api_logs` (endpoint, status_code, response_time_ms)
8. Opportunistic cleanup (1% chance per request): delete old idempotency keys (>7 days) and old api_logs (>30 days)

### Composite cursor pagination
All GET endpoints use `cursor_created_at` + `cursor_id` params.

Query: `WHERE (created_at, id) > ($cursor_created_at, $cursor_id) ORDER BY created_at ASC, id ASC LIMIT $limit`

Response:
```json
{
  "data": [...],
  "next_cursor": { "created_at": "...", "id": "..." }
}
```

### GET Endpoints

| Path | Table | Filters | Permission key |
|------|-------|---------|----------------|
| `/time-entries` | time_entries | `from`, `to`, `user_email`, `project_id`, `status` | `time_entries` |
| `/absences` | absences | `from`, `to`, `user_email`, `type`, `status` | `absences` |
| `/travel-expenses` | travel_expenses | `from`, `to`, `user_email`, `project_id`, `status` | `travel_expenses` |
| `/vacation-requests` | vacation_requests | `from`, `to`, `user_email`, `status` | `vacation_requests` |
| `/project-hours` | project_hours | `from`, `to`, `user_email`, `project_id`, `status` | `project_hours` |
| `/projects` | projects | `active` | `projects` |
| `/absence-reasons` | absence_reasons | `active` | `absence_reasons` |
| `/changes` | audit_log | `since`, `table_name`, `action` | `changes` |

Every query filters by `company_id`. User email normalized via `lower(trim(email))`.

### `/changes` endpoint
```
GET /changes?since=2026-03-25T00:00:00Z&limit=1000
```
Response:
```json
{
  "data": [
    { "table": "time_entries", "action": "INSERT", "record_id": "...", "changed_at": "..." }
  ],
  "next_cursor": { "created_at": "...", "id": "..." }
}
```

### POST Endpoints

| Path | Required fields | Permission key |
|------|-----------------|----------------|
| `/time-entries` | `user_email`, `start_time`, `end_time` | `time_entries` |
| `/project-hours` | `user_email`, `project_id`, `hours`, `date` | `project_hours` |

Require `Idempotency-Key` header. Check stored responses first. Resolve normalized email → user_id within company.

### Permission enforcement
```
if (!permissions.read?.includes(resource)) → 403 FORBIDDEN
if (!permissions.write?.includes(resource)) → 403 FORBIDDEN
```

### Error format
```json
{ "error": { "code": "INVALID_API_KEY", "message": "..." } }
```
Codes: `INVALID_API_KEY`, `RATE_LIMIT_EXCEEDED`, `FORBIDDEN`, `USER_NOT_FOUND`, `VALIDATION_ERROR`, `MISSING_IDEMPOTENCY_KEY`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `INTERNAL_ERROR`.

### Cleanup strategies (opportunistic, ~1% of requests)
- `DELETE FROM idempotency_keys WHERE created_at < now() - interval '7 days'`
- `DELETE FROM api_logs WHERE created_at < now() - interval '30 days'`

## 3. Admin UI
Add "API Keys" section to AdminDashboard:
- List keys (label, created, last used, active, permissions)
- Create key: `itk_`-prefixed 64-char hex, shown once, SHA-256 stored
- Configure read/write permissions per resource
- Set rate limit
- Revoke keys
- i18n for EN/FI

## 4. Implementation Steps
1. **Migration**: Create 4 tables, alter 5 tables with sync fields, add email index, add RLS for api_keys
2. **Edge Function**: Build `supabase/functions/data-api/index.ts`
3. **Admin UI**: API key management panel in AdminDashboard
4. **i18n**: Translation strings
5. **Version**: Bump to 26.3.3

