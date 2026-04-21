
INSERT INTO public._cron_debug(info)
SELECT 'has_supabase_functions_schema=' || EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='supabase_functions')::text;
INSERT INTO public._cron_debug(info)
SELECT 'has_http_request=' || EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='supabase_functions' AND p.proname='http_request')::text;
INSERT INTO public._cron_debug(info)
SELECT 'all_cron_jobs=' || string_agg(jobname || '|' || schedule, ', ') FROM cron.job;
