-- Bump chain-reconcile from every 5 minutes to every minute for faster recovery
-- of lost on-chain deposits. Renames the job so the schedule isn't baked into
-- the name. Drops the old 5-min job.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chain-reconcile-every-5min') THEN
    PERFORM cron.unschedule('chain-reconcile-every-5min');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chain-reconcile') THEN
    PERFORM cron.unschedule('chain-reconcile');
  END IF;
END $$;

SELECT cron.schedule(
  'chain-reconcile',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fitufrqpmcsxbvubjyqd.supabase.co/functions/v1/chain-reconcile',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_settings WHERE key = 'service_role_key')
    )
  );
  $$
);
