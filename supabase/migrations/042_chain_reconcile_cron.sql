-- Schedule chain-reconcile every 5 minutes to backfill on-chain InvestmentCreated
-- events whose frontend callback never landed (network drop, page close, RPC race).
-- Depends on system_settings.service_role_key (also used by auto-withdraw, see 015).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'chain-reconcile-every-5min') THEN
    PERFORM cron.unschedule('chain-reconcile-every-5min');
  END IF;
END $$;

SELECT cron.schedule(
  'chain-reconcile-every-5min',
  '*/5 * * * *',
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
