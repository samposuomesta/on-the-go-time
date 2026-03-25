
-- Add company_id column to audit_log
ALTER TABLE public.audit_log ADD COLUMN company_id uuid;

-- Backfill existing rows where possible (from the changed_by email)
UPDATE public.audit_log al
SET company_id = u.company_id
FROM public.users u
WHERE u.email = al.changed_by
  AND al.company_id IS NULL;

-- Drop the old policy
DROP POLICY IF EXISTS "al_select" ON public.audit_log;

-- Create new policy scoped to company
CREATE POLICY "al_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    auth_user_role() = 'admin'
    AND company_id = auth_user_company_id()
  );
