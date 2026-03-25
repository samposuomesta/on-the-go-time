
DROP POLICY IF EXISTS "Allow all" ON public.login_sessions;

CREATE POLICY "ls_select" ON public.login_sessions FOR SELECT TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() IN ('admin','manager') AND is_same_company_user(user_id)));

CREATE POLICY "ls_insert" ON public.login_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "ls_update" ON public.login_sessions FOR UPDATE TO authenticated
  USING (user_id = auth_user_id())
  WITH CHECK (user_id = auth_user_id());

CREATE POLICY "ls_delete" ON public.login_sessions FOR DELETE TO authenticated
  USING (user_id = auth_user_id() OR (auth_user_role() = 'admin' AND is_same_company_user(user_id)));
