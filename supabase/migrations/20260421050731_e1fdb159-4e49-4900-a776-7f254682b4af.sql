-- =========================================================
-- FIX 1: Prevent employees from self-approving by changing status
-- Split UPDATE policy: employees can edit their own pending rows but cannot change status;
-- admins/managers retain full update including status.
-- Tables: time_entries, project_hours, travel_expenses, absences, vacation_requests
-- =========================================================

-- time_entries
DROP POLICY IF EXISTS te_update ON public.time_entries;

CREATE POLICY te_update_self_no_status ON public.time_entries
FOR UPDATE TO authenticated
USING (user_id = auth_user_id())
WITH CHECK (
  user_id = auth_user_id()
  AND status = (SELECT t.status FROM public.time_entries t WHERE t.id = time_entries.id)
);

CREATE POLICY te_update_admin_manager ON public.time_entries
FOR UPDATE TO authenticated
USING (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id))
WITH CHECK (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id));

-- project_hours
DROP POLICY IF EXISTS ph_update ON public.project_hours;

CREATE POLICY ph_update_self_no_status ON public.project_hours
FOR UPDATE TO authenticated
USING (user_id = auth_user_id())
WITH CHECK (
  user_id = auth_user_id()
  AND status = (SELECT p.status FROM public.project_hours p WHERE p.id = project_hours.id)
);

CREATE POLICY ph_update_admin_manager ON public.project_hours
FOR UPDATE TO authenticated
USING (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id))
WITH CHECK (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id));

-- travel_expenses
DROP POLICY IF EXISTS tex_update ON public.travel_expenses;

CREATE POLICY tex_update_self_no_status ON public.travel_expenses
FOR UPDATE TO authenticated
USING (user_id = auth_user_id())
WITH CHECK (
  user_id = auth_user_id()
  AND status = (SELECT x.status FROM public.travel_expenses x WHERE x.id = travel_expenses.id)
);

CREATE POLICY tex_update_admin_manager ON public.travel_expenses
FOR UPDATE TO authenticated
USING (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id))
WITH CHECK (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id));

-- absences
DROP POLICY IF EXISTS abs_update ON public.absences;

CREATE POLICY abs_update_self_no_status ON public.absences
FOR UPDATE TO authenticated
USING (user_id = auth_user_id())
WITH CHECK (
  user_id = auth_user_id()
  AND status = (SELECT a.status FROM public.absences a WHERE a.id = absences.id)
);

CREATE POLICY abs_update_admin_manager ON public.absences
FOR UPDATE TO authenticated
USING (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id))
WITH CHECK (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id));

-- vacation_requests
DROP POLICY IF EXISTS vr_update ON public.vacation_requests;

CREATE POLICY vr_update_self_no_status ON public.vacation_requests
FOR UPDATE TO authenticated
USING (user_id = auth_user_id())
WITH CHECK (
  user_id = auth_user_id()
  AND status = (SELECT v.status FROM public.vacation_requests v WHERE v.id = vacation_requests.id)
);

CREATE POLICY vr_update_admin_manager ON public.vacation_requests
FOR UPDATE TO authenticated
USING (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id))
WITH CHECK (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id));

-- =========================================================
-- FIX 2: Prevent managers from escalating role of managed users
-- Use a BEFORE UPDATE trigger that blocks role changes for non-admins.
-- =========================================================

CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth_user_role() <> 'admin' THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_non_admin_role_change ON public.users;

CREATE TRIGGER trg_prevent_non_admin_role_change
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_role_change();
