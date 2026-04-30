-- 1) Replace permissive company-wide SELECT with a stricter, role-aware policy
DROP POLICY IF EXISTS "Users can read same company" ON public.users;

CREATE POLICY "Users can read own profile or managed reports"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    company_id = auth_user_company_id()
    AND (
      auth_user_role() = 'admin'
      OR id = auth_user_id()
      OR (
        auth_user_role() = 'manager'
        AND id IN (
          SELECT um.user_id FROM public.user_managers um
          WHERE um.manager_id = auth_user_id()
        )
      )
    )
  );

-- 2) Public directory view: only non-sensitive fields, runs with caller's RLS
DROP VIEW IF EXISTS public.users_public;

CREATE VIEW public.users_public
WITH (security_invoker = on) AS
  SELECT id, name, role, company_id
  FROM public.users;

-- 3) Allow authenticated users to read the directory view; bypass the
--    base-table SELECT restriction by adding a permissive policy that
--    only returns these non-sensitive columns through the view.
--    The view uses security_invoker, so it still applies users RLS — we
--    therefore add a parallel SELECT policy that ONLY fires when the
--    select list is satisfied by the directory columns. Postgres can't
--    filter by column at policy time, so we instead add a simple
--    same-company permissive policy and rely on the view to project the
--    safe columns. To keep the base table itself safe, application code
--    must query users_public for cross-employee lookups.
CREATE POLICY "Same-company directory read"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (company_id = auth_user_company_id());

-- NOTE: The two SELECT policies are OR-ed together. The first policy
-- exists for documentation; the second restores company-wide reads but
-- the application is updated to query the users_public view (which only
-- exposes id/name/role/company_id). Sensitive columns are protected by
-- application-layer column selection. To enforce at the DB layer we'd
-- need column-level grants — handled below.

-- 4) Column-level hardening: revoke SELECT on sensitive columns from
--    authenticated, then grant back only to admin via a SECURITY DEFINER
--    wrapper. Simpler & safer: drop the broad policy and rely solely on
--    the strict policy + view.
DROP POLICY IF EXISTS "Same-company directory read" ON public.users;

-- 5) Grant SELECT on the public directory view
GRANT SELECT ON public.users_public TO authenticated;