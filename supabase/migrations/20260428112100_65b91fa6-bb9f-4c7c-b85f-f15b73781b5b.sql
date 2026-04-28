
-- =========================================================
-- PART 1: Move Slack credentials out of the readable companies table
-- =========================================================

CREATE TABLE IF NOT EXISTS public.company_secrets (
  company_id uuid PRIMARY KEY,
  slack_bot_token text,
  slack_default_channel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_secrets ENABLE ROW LEVEL SECURITY;

-- Admin-only access, scoped to the admin's own company.
CREATE POLICY cs_select ON public.company_secrets
  FOR SELECT TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY cs_insert ON public.company_secrets
  FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY cs_update ON public.company_secrets
  FOR UPDATE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY cs_delete ON public.company_secrets
  FOR DELETE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

-- Migrate existing values
INSERT INTO public.company_secrets (company_id, slack_bot_token, slack_default_channel)
SELECT id, slack_bot_token, slack_default_channel
FROM public.companies
WHERE slack_bot_token IS NOT NULL OR slack_default_channel IS NOT NULL
ON CONFLICT (company_id) DO UPDATE
SET slack_bot_token = EXCLUDED.slack_bot_token,
    slack_default_channel = EXCLUDED.slack_default_channel;

-- Drop the now-secret columns from the public-readable table
ALTER TABLE public.companies DROP COLUMN IF EXISTS slack_bot_token;
ALTER TABLE public.companies DROP COLUMN IF EXISTS slack_default_channel;

-- =========================================================
-- PART 2: Stable auth identity link (auth_user_id) instead of email
-- =========================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

-- Backfill from auth.users by email (one-time, runs as migration superuser)
UPDATE public.users u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.auth_user_id IS NULL
  AND lower(a.email) = lower(u.email);

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique
  ON public.users(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Replace identity helper functions to join on auth_user_id, not email.
CREATE OR REPLACE FUNCTION public.auth_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.company_id FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.role::text FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$function$;

-- Prevent ANY non-service-role write that would change auth_user_id or email
-- (admin could otherwise relink a row to another auth account, or change someone's email
--  to match another auth account before users.auth_user_id was populated).
CREATE OR REPLACE FUNCTION public.prevent_identity_tampering()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow if running with service_role (edge functions like create-auth-user)
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'auth_user_id cannot be modified';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'email cannot be modified through the API';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS users_prevent_identity_tampering ON public.users;
CREATE TRIGGER users_prevent_identity_tampering
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_identity_tampering();

-- Auto-link newly created public.users rows to an existing auth.users by email
-- (covers admin-creates-employee flow; runs as definer so it can read auth.users)
CREATE OR REPLACE FUNCTION public.link_auth_user_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.auth_user_id IS NULL THEN
    SELECT a.id INTO NEW.auth_user_id
    FROM auth.users a
    WHERE lower(a.email) = lower(NEW.email)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS users_link_auth_on_insert ON public.users;
CREATE TRIGGER users_link_auth_on_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_auth_user_on_insert();

-- When a new auth.users row is created (e.g. via create-auth-user), link it
-- to the matching public.users row if one exists.
CREATE OR REPLACE FUNCTION public.link_public_user_on_auth_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.users
  SET auth_user_id = NEW.id
  WHERE auth_user_id IS NULL
    AND lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_public ON auth.users;
CREATE TRIGGER on_auth_user_created_link_public
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_public_user_on_auth_insert();
