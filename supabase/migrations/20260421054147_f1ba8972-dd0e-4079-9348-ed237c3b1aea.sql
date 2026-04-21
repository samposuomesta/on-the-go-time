
CREATE TABLE IF NOT EXISTS public._cron_debug (id serial primary key, info text, created_at timestamptz default now());
INSERT INTO public._cron_debug(info)
SELECT jobname || ' :: ' || left(command, 200) FROM cron.job WHERE command ILIKE '%process-reminders%';
INSERT INTO public._cron_debug(info)
SELECT 'vault_has_key=' || (EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='SUPABASE_SERVICE_ROLE_KEY'))::text;
ALTER TABLE public._cron_debug ENABLE ROW LEVEL SECURITY;
