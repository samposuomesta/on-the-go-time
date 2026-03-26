
-- 1. api_keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  label text,
  active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  permissions jsonb NOT NULL DEFAULT '{"read":[],"write":[]}'::jsonb,
  rate_limit integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ak_select" ON public.api_keys FOR SELECT TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY "ak_insert" ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY "ak_update" ON public.api_keys FOR UPDATE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY "ak_delete" ON public.api_keys FOR DELETE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

-- 2. api_rate_limits table (no RLS, service role only)
CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  UNIQUE(api_key_id, window_start)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- 3. idempotency_keys table (no RLS, service role only)
CREATE TABLE public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(api_key_id, idempotency_key)
);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 4. api_logs table (no RLS, service role only)
CREATE TABLE public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Admin can read api_logs for their company
CREATE POLICY "al_select" ON public.api_logs FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND api_key_id IN (SELECT id FROM public.api_keys WHERE company_id = auth_user_company_id())
  );

-- 5. Sync tracking fields on 5 tables
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE public.project_hours
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE public.travel_expenses
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE public.absences
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

ALTER TABLE public.vacation_requests
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

-- 6. Email index for normalized lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (lower(email));

-- 7. Index on api_logs created_at for cleanup
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON public.idempotency_keys (created_at);
