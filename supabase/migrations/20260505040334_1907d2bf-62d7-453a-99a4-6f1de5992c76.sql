-- Helper: get any user's role without recursing through RLS
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.users WHERE id = _user_id LIMIT 1
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can update own or managed" ON public.users;

-- Recreate without self-referencing subqueries
CREATE POLICY "Users can update own or managed"
ON public.users
FOR UPDATE
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
)
WITH CHECK (
  company_id = auth_user_company_id()
  AND (
    auth_user_role() = 'admin'
    OR (id = auth_user_id() AND role::text = auth_user_role())
    OR (
      auth_user_role() = 'manager'
      AND id IN (
        SELECT um.user_id FROM public.user_managers um
        WHERE um.manager_id = auth_user_id()
      )
      AND role::text = public.get_user_role(id)
    )
  )
);