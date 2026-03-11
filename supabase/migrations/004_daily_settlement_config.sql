-- System settings table for configurable values
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- Default settlement time: 00:00 Singapore time (UTC+8) = 16:00 UTC
INSERT INTO system_settings (key, value) VALUES
  ('settlement_hour', '16'),
  ('settlement_minute', '0'),
  ('settlement_timezone', 'Asia/Singapore')
ON CONFLICT (key) DO NOTHING;

-- Unschedule the old hourly cron job
SELECT cron.unschedule('process-daily-settlement');

-- Schedule daily settlement at 16:00 UTC (00:00 SGT)
SELECT cron.schedule(
  'process-daily-settlement',
  '0 16 * * *',
  $$SELECT process_daily()$$
);

-- Function to get current settlement config
CREATE OR REPLACE FUNCTION get_settlement_config()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_hour TEXT;
  v_minute TEXT;
  v_tz TEXT;
BEGIN
  SELECT value INTO v_hour FROM system_settings WHERE key = 'settlement_hour';
  SELECT value INTO v_minute FROM system_settings WHERE key = 'settlement_minute';
  SELECT value INTO v_tz FROM system_settings WHERE key = 'settlement_timezone';

  RETURN json_build_object(
    'hour', COALESCE(v_hour, '16'),
    'minute', COALESCE(v_minute, '0'),
    'timezone', COALESCE(v_tz, 'Asia/Singapore'),
    'utcHour', COALESCE(v_hour, '16'),
    'utcMinute', COALESCE(v_minute, '0')
  );
END;
$$;

-- Function to update settlement time and reschedule cron
CREATE OR REPLACE FUNCTION update_settlement_time(p_sgt_hour INTEGER, p_sgt_minute INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_utc_hour INTEGER;
  v_cron_expr TEXT;
  v_sql TEXT;
BEGIN
  -- Validate input
  IF p_sgt_hour < 0 OR p_sgt_hour > 23 THEN
    RAISE EXCEPTION 'Hour must be between 0 and 23';
  END IF;
  IF p_sgt_minute < 0 OR p_sgt_minute > 59 THEN
    RAISE EXCEPTION 'Minute must be between 0 and 59';
  END IF;

  -- Convert SGT (UTC+8) to UTC
  v_utc_hour := (p_sgt_hour - 8 + 24) % 24;

  -- Update settings
  UPDATE system_settings SET value = v_utc_hour::TEXT, updated_at = NOW() WHERE key = 'settlement_hour';
  UPDATE system_settings SET value = p_sgt_minute::TEXT, updated_at = NOW() WHERE key = 'settlement_minute';

  -- Reschedule cron job
  PERFORM cron.unschedule('process-daily-settlement');
  v_cron_expr := p_sgt_minute || ' ' || v_utc_hour || ' * * *';
  v_sql := 'SELECT process_daily()';
  PERFORM cron.schedule('process-daily-settlement', v_cron_expr, v_sql);

  RETURN json_build_object(
    'sgtHour', p_sgt_hour,
    'sgtMinute', p_sgt_minute,
    'utcHour', v_utc_hour,
    'utcMinute', p_sgt_minute,
    'cronExpr', v_cron_expr,
    'success', true
  );
END;
$fn$;
