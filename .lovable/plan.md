

# Add API Quick Reference to ApiKeysPanel

## What
Add a collapsible "API Quick Reference" card below the API keys table showing base URL, authentication, available endpoints, pagination, error format, and a curl example.

## Changes

### 1. `src/components/admin/ApiKeysPanel.tsx`
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` and `BookOpen`/`ChevronDown` icons
- Add a new `Card` after the keys table with a collapsible section containing:
  - **Base URL**: `{VITE_SUPABASE_URL}/functions/v1/data-api`
  - **Authentication**: `X-API-Key: itk_...` header
  - **GET endpoints**: `/time-entries`, `/absences`, `/travel-expenses`, `/vacation-requests`, `/project-hours`, `/projects`, `/absence-reasons`, `/changes`
  - **POST endpoints**: `/time-entries`, `/project-hours` (with `Idempotency-Key` header)
  - **Pagination**: `cursor_created_at` + `cursor_id` params
  - **Error format**: structured `{ error: { code, message } }`
  - **Example curl** snippet with copy button
- Use `<code>` and `<pre>` blocks for technical content, styled with Tailwind

### 2. `src/lib/i18n.tsx`
Add EN and FI translations for ~10 new keys:
- `apiKeys.quickRef` / `apiKeys.quickRefDesc`
- `apiKeys.baseUrl` / `apiKeys.auth` / `apiKeys.getEndpoints` / `apiKeys.postEndpoints`
- `apiKeys.pagination` / `apiKeys.errorFormat` / `apiKeys.exampleCurl`

