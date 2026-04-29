GRANT EXECUTE ON FUNCTION public.auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_same_company_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_in_my_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_shares_team_with_me(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_goal_owner(uuid) TO authenticated;
