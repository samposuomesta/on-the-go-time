
DO $$
DECLARE
  v_jobid bigint;
  v_url text := 'https://pqmdsvdcbyefdngdmuud.supabase.co/functions/v1/process-reminders';
  v_service_key text;
BEGIN
  -- Pull current service role key from vault if available, else fall back to anon
  -- Use the SUPABASE_SERVICE_ROLE_KEY stored in Vault by Supabase
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  -- Unschedule any existing process-reminders jobs
  FOR v_jobid IN
    SELECT jobid FROM cron.job WHERE command ILIKE '%process-reminders%'
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;

  -- Reschedule using service role bearer token (accepted by the function)
  IF v_service_key IS NOT NULL THEN
    PERFORM cron.schedule(
      'process-reminders-every-minute',
      '* * * * *',
      format($cmd$
        SELECT net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer %s'
          ),
          body := '{}'::jsonb
        );
      $cmd$, v_url, v_service_key)
    );
  END IF;
END $$;
