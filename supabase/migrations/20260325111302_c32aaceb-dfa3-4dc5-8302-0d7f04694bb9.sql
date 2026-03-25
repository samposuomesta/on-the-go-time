
-- ============================================================
-- Drop all "Allow all" policies on 16 tables
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.time_entries;
DROP POLICY IF EXISTS "Allow all" ON public.project_hours;
DROP POLICY IF EXISTS "Allow all" ON public.travel_expenses;
DROP POLICY IF EXISTS "Allow all" ON public.absences;
DROP POLICY IF EXISTS "Allow all" ON public.vacation_requests;
DROP POLICY IF EXISTS "Allow all" ON public.work_bank_transactions;
DROP POLICY IF EXISTS "Allow all" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow all" ON public.notification_log;
DROP POLICY IF EXISTS "Allow all" ON public.user_reminders;
DROP POLICY IF EXISTS "Allow all" ON public.user_managers;
DROP POLICY IF EXISTS "Allow all" ON public.companies;
DROP POLICY IF EXISTS "Allow all" ON public.projects;
DROP POLICY IF EXISTS "Allow all" ON public.workplaces;
DROP POLICY IF EXISTS "Allow all" ON public.reminder_rules;
DROP POLICY IF EXISTS "Allow all" ON public.absence_reasons;
DROP POLICY IF EXISTS "Allow all" ON public.audit_log;

-- ============================================================
-- Helper: check if user is in same company as target user
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_same_company_user(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = _target_user_id
      AND company_id = auth_user_company_id()
  )
$$;

-- ============================================================
-- 1. time_entries (user_id scoped)
-- ============================================================
CREATE POLICY "te_select" ON public.time_entries FOR SELECT TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "te_insert" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "te_update" ON public.time_entries FOR UPDATE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)))
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "te_delete" ON public.time_entries FOR DELETE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));

-- ============================================================
-- 2. project_hours (user_id scoped)
-- ============================================================
CREATE POLICY "ph_select" ON public.project_hours FOR SELECT TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "ph_insert" ON public.project_hours FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "ph_update" ON public.project_hours FOR UPDATE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)))
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "ph_delete" ON public.project_hours FOR DELETE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));

-- ============================================================
-- 3. travel_expenses (user_id scoped)
-- ============================================================
CREATE POLICY "tex_select" ON public.travel_expenses FOR SELECT TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "tex_insert" ON public.travel_expenses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "tex_update" ON public.travel_expenses FOR UPDATE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)))
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "tex_delete" ON public.travel_expenses FOR DELETE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));

-- ============================================================
-- 4. absences (user_id scoped)
-- ============================================================
CREATE POLICY "abs_select" ON public.absences FOR SELECT TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "abs_insert" ON public.absences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "abs_update" ON public.absences FOR UPDATE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)))
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "abs_delete" ON public.absences FOR DELETE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));

-- ============================================================
-- 5. vacation_requests (user_id scoped)
-- ============================================================
CREATE POLICY "vr_select" ON public.vacation_requests FOR SELECT TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "vr_insert" ON public.vacation_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "vr_update" ON public.vacation_requests FOR UPDATE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)))
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "vr_delete" ON public.vacation_requests FOR DELETE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));

-- ============================================================
-- 6. work_bank_transactions (user_id scoped)
-- ============================================================
CREATE POLICY "wbt_select" ON public.work_bank_transactions FOR SELECT TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "wbt_insert" ON public.work_bank_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "wbt_update" ON public.work_bank_transactions FOR UPDATE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)))
  WITH CHECK (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "wbt_delete" ON public.work_bank_transactions FOR DELETE TO authenticated
  USING (auth_user_role() = 'admin' AND is_same_company_user(user_id));

-- ============================================================
-- 7. push_subscriptions (user_id scoped, private)
-- ============================================================
CREATE POLICY "ps_select" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth_user_id());

CREATE POLICY "ps_insert" ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "ps_update" ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth_user_id())
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "ps_delete" ON public.push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth_user_id());

-- ============================================================
-- 8. notification_log (user_id scoped, private)
-- ============================================================
CREATE POLICY "nl_select" ON public.notification_log FOR SELECT TO authenticated
  USING (user_id = auth_user_id());

CREATE POLICY "nl_insert" ON public.notification_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "nl_delete" ON public.notification_log FOR DELETE TO authenticated
  USING (user_id = auth_user_id());

-- ============================================================
-- 9. user_reminders (user_id scoped)
-- ============================================================
CREATE POLICY "ur_select" ON public.user_reminders FOR SELECT TO authenticated
  USING (user_id = auth_user_id());

CREATE POLICY "ur_insert" ON public.user_reminders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "ur_update" ON public.user_reminders FOR UPDATE TO authenticated
  USING (user_id = auth_user_id())
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "ur_delete" ON public.user_reminders FOR DELETE TO authenticated
  USING (user_id = auth_user_id());

-- ============================================================
-- 10. user_managers (company scoped, admin managed)
-- ============================================================
CREATE POLICY "um_select" ON public.user_managers FOR SELECT TO authenticated
  USING (is_same_company_user(user_id));

CREATE POLICY "um_insert" ON public.user_managers FOR INSERT TO authenticated
  WITH CHECK (auth_user_role() = 'admin' AND is_same_company_user(user_id));

CREATE POLICY "um_update" ON public.user_managers FOR UPDATE TO authenticated
  USING (auth_user_role() = 'admin' AND is_same_company_user(user_id))
  WITH CHECK (auth_user_role() = 'admin' AND is_same_company_user(user_id));

CREATE POLICY "um_delete" ON public.user_managers FOR DELETE TO authenticated
  USING (auth_user_role() = 'admin' AND is_same_company_user(user_id));

-- ============================================================
-- 11. companies (company_id scoped)
-- ============================================================
CREATE POLICY "co_select" ON public.companies FOR SELECT TO authenticated
  USING (id = auth_user_company_id());

CREATE POLICY "co_update" ON public.companies FOR UPDATE TO authenticated
  USING (id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (id = auth_user_company_id());

-- ============================================================
-- 12. projects (company_id scoped)
-- ============================================================
CREATE POLICY "pr_select" ON public.projects FOR SELECT TO authenticated
  USING (company_id = auth_user_company_id());

CREATE POLICY "pr_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY "pr_update" ON public.projects FOR UPDATE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "pr_delete" ON public.projects FOR DELETE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

-- ============================================================
-- 13. workplaces (company_id scoped)
-- ============================================================
CREATE POLICY "wp_select" ON public.workplaces FOR SELECT TO authenticated
  USING (company_id = auth_user_company_id());

CREATE POLICY "wp_insert" ON public.workplaces FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY "wp_update" ON public.workplaces FOR UPDATE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "wp_delete" ON public.workplaces FOR DELETE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

-- ============================================================
-- 14. reminder_rules (company_id scoped)
-- ============================================================
CREATE POLICY "rr_select" ON public.reminder_rules FOR SELECT TO authenticated
  USING (company_id = auth_user_company_id());

CREATE POLICY "rr_insert" ON public.reminder_rules FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY "rr_update" ON public.reminder_rules FOR UPDATE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "rr_delete" ON public.reminder_rules FOR DELETE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

-- ============================================================
-- 15. absence_reasons (company_id scoped)
-- ============================================================
CREATE POLICY "ar_select" ON public.absence_reasons FOR SELECT TO authenticated
  USING (company_id = auth_user_company_id());

CREATE POLICY "ar_insert" ON public.absence_reasons FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

CREATE POLICY "ar_update" ON public.absence_reasons FOR UPDATE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin')
  WITH CHECK (company_id = auth_user_company_id());

CREATE POLICY "ar_delete" ON public.absence_reasons FOR DELETE TO authenticated
  USING (company_id = auth_user_company_id() AND auth_user_role() = 'admin');

-- ============================================================
-- 16. audit_log (admin read only, inserts via SECURITY DEFINER trigger)
-- ============================================================
CREATE POLICY "al_select" ON public.audit_log FOR SELECT TO authenticated
  USING (auth_user_role() = 'admin');

-- Also fix users table: prevent role escalation on self-update
DROP POLICY IF EXISTS "Users can update own or managed" ON public.users;

CREATE POLICY "Users can update own or managed" ON public.users FOR UPDATE TO authenticated
  USING (
    company_id = auth_user_company_id() AND (
      auth_user_role() = 'admin'
      OR id = auth_user_id()
      OR (auth_user_role() = 'manager' AND id IN (SELECT um.user_id FROM user_managers um WHERE um.manager_id = auth_user_id()))
    )
  )
  WITH CHECK (
    company_id = auth_user_company_id() AND (
      auth_user_role() = 'admin'
      OR (id = auth_user_id() AND role = (SELECT u.role FROM public.users u WHERE u.id = auth_user_id()))
      OR (auth_user_role() = 'manager' AND id IN (SELECT um.user_id FROM user_managers um WHERE um.manager_id = auth_user_id()))
    )
  );
