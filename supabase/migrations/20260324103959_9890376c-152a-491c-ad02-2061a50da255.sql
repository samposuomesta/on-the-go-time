
-- Security definer functions to avoid recursive RLS on users table

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id FROM public.users u
  INNER JOIN auth.users a ON a.email = u.email
  WHERE a.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.auth_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.company_id FROM public.users u
  INNER JOIN auth.users a ON a.email = u.email
  WHERE a.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.role::text FROM public.users u
  INNER JOIN auth.users a ON a.email = u.email
  WHERE a.id = auth.uid()
  LIMIT 1
$$;

-- Drop the permissive "Allow all" policy
DROP POLICY IF EXISTS "Allow all" ON public.users;

-- SELECT: authenticated users can read users in the same company
CREATE POLICY "Users can read same company"
ON public.users FOR SELECT
TO authenticated
USING (company_id = public.auth_user_company_id());

-- INSERT: only admins can create users
CREATE POLICY "Admins can insert users"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (
  public.auth_user_role() = 'admin'
  AND company_id = public.auth_user_company_id()
);

-- UPDATE: admins can update any user in company, managers can update managed users, users can update own row
CREATE POLICY "Users can update own or managed"
ON public.users FOR UPDATE
TO authenticated
USING (
  company_id = public.auth_user_company_id()
  AND (
    public.auth_user_role() = 'admin'
    OR id = public.auth_user_id()
    OR (public.auth_user_role() = 'manager' AND id IN (
      SELECT um.user_id FROM public.user_managers um WHERE um.manager_id = public.auth_user_id()
    ))
  )
)
WITH CHECK (
  company_id = public.auth_user_company_id()
);

-- DELETE: only admins
CREATE POLICY "Admins can delete users"
ON public.users FOR DELETE
TO authenticated
USING (
  public.auth_user_role() = 'admin'
  AND company_id = public.auth_user_company_id()
);
