-- 1) Reuse existing prevent_non_admin_role_change function via trigger on users
DROP TRIGGER IF EXISTS trg_prevent_non_admin_role_change ON public.users;
CREATE TRIGGER trg_prevent_non_admin_role_change
BEFORE UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_role_change();

-- 2) Revoke EXECUTE on internal SECURITY DEFINER helpers from public roles.
-- These are referenced inside RLS policies (which evaluate as the policy owner)
-- and never need to be called directly by clients.
REVOKE EXECUTE ON FUNCTION public.auth_user_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_user_company_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_same_company_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_in_my_company(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_member_of_team(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_shares_team_with_me(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.weekly_goal_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_non_admin_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_identity_tampering() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_auth_user_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_public_user_on_auth_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_log_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_weekly_goals_updated_at() FROM PUBLIC, anon, authenticated;