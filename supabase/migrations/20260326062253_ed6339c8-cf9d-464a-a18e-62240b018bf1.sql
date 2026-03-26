
-- Delete all related data for demo users
DO $$
DECLARE
  demo_ids uuid[] := ARRAY[
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'b0000000-0000-0000-0000-000000000003'::uuid
  ];
BEGIN
  DELETE FROM public.work_bank_transactions WHERE user_id = ANY(demo_ids);
  DELETE FROM public.time_entries WHERE user_id = ANY(demo_ids);
  DELETE FROM public.project_hours WHERE user_id = ANY(demo_ids);
  DELETE FROM public.travel_expenses WHERE user_id = ANY(demo_ids);
  DELETE FROM public.absences WHERE user_id = ANY(demo_ids);
  DELETE FROM public.vacation_requests WHERE user_id = ANY(demo_ids);
  DELETE FROM public.login_sessions WHERE user_id = ANY(demo_ids);
  DELETE FROM public.push_subscriptions WHERE user_id = ANY(demo_ids);
  DELETE FROM public.user_reminders WHERE user_id = ANY(demo_ids);
  DELETE FROM public.notification_log WHERE user_id = ANY(demo_ids);
  DELETE FROM public.user_managers WHERE user_id = ANY(demo_ids) OR manager_id = ANY(demo_ids);
  DELETE FROM public.audit_log WHERE changed_by IN ('admin@demo.com','jane@demo.com','john@demo.com');
  DELETE FROM public.users WHERE id = ANY(demo_ids);
  
  -- Delete auth accounts
  DELETE FROM auth.users WHERE email IN ('admin@demo.com','jane@demo.com','john@demo.com');
END;
$$;
