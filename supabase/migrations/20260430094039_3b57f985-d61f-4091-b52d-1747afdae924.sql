-- Revert the previous REVOKE: RLS policies internally invoke these helpers,
-- and on self-hosted PostgREST/Postgres the executor checks EXECUTE privilege
-- against the calling role even inside policy expressions.
GRANT EXECUTE ON FUNCTION public.auth_user_id()              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_role()            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_company_id()      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_same_company_user(uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_team(uuid)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_in_my_company(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_shares_team_with_me(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_goal_owner(uuid)     TO anon, authenticated;