-- Revoke EXECUTE on internal SECURITY DEFINER helper functions from client roles.
-- These are only used inside RLS policy expressions (which run as the table owner),
-- so revoking client EXECUTE does NOT affect RLS — including weekly_goals/goals
-- policies that reference weekly_goal_owner() and user_shares_team_with_me().

REVOKE EXECUTE ON FUNCTION public.auth_user_id()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_user_role()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_user_company_id()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_same_company_user(uuid)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_member_of_team(uuid)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_team_in_my_company(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_shares_team_with_me(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.weekly_goal_owner(uuid)     FROM PUBLIC, anon, authenticated;