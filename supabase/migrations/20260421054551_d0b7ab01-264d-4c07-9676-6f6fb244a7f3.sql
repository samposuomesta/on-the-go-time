
DO $$
DECLARE v_jobid bigint;
BEGIN
  -- Clean up any old jobs
  FOR v_jobid IN SELECT jobid FROM cron.job WHERE command ILIKE '%process-reminders%' LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;

  PERFORM cron.schedule(
    'process-reminders-every-minute',
    '* * * * *',
    $cmd$
      SELECT net.http_post(
        url := 'https://pqmdsvdcbyefdngdmuud.supabase.co/functions/v1/process-reminders',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
    $cmd$
  );
END $$;
