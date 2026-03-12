-- Auto-trigger edge function when withdrawal is auto-approved
-- Uses pg_net extension to HTTP call the auto-withdraw edge function

-- 1. Enable pg_net extension (Supabase projects have this available)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Trigger function: after a withdrawal is inserted with status='approved', call edge function
CREATE OR REPLACE FUNCTION trigger_auto_withdraw_edge_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only trigger when status is 'approved' (auto-approved by the BEFORE INSERT trigger)
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  -- Get config from vault or hardcode project URL
  v_supabase_url := 'https://fitufrqpmcsxbvubjyqd.supabase.co';

  -- Get service role key from system_settings (we'll store it there)
  SELECT value INTO v_service_key FROM system_settings WHERE key = 'service_role_key';
  IF v_service_key IS NULL THEN
    RETURN NEW; -- Skip if not configured
  END IF;

  -- Call edge function via pg_net (async, non-blocking)
  PERFORM extensions.http_post(
    url := v_supabase_url || '/functions/v1/auto-withdraw',
    body := '{}',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );

  RETURN NEW;
END;
$$;

-- 3. Create AFTER INSERT trigger (runs after the BEFORE INSERT auto-approve trigger)
DROP TRIGGER IF EXISTS trg_auto_withdraw_edge ON withdrawals;
CREATE TRIGGER trg_auto_withdraw_edge
  AFTER INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_withdraw_edge_function();

-- 4. Store service role key in system_settings for pg_net to use
INSERT INTO system_settings (key, value) VALUES ('service_role_key', '')
ON CONFLICT (key) DO NOTHING;
