-- Fix: new orders should not generate earnings on the day they are created
-- Set last_earning_date = CURRENT_DATE on creation so settlement skips day 0

CREATE OR REPLACE FUNCTION create_order_from_tx(
  p_wallet_address TEXT,
  p_product_id INTEGER,
  p_amount TEXT,
  p_tx_hash TEXT,
  p_product_name TEXT,
  p_daily_rate TEXT,
  p_days INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id INTEGER;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Check duplicate tx_hash
  IF EXISTS (SELECT 1 FROM orders WHERE tx_hash = p_tx_hash) THEN
    RAISE EXCEPTION 'Transaction already processed';
  END IF;

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, tx_hash, last_earning_date)
  VALUES (LOWER(p_wallet_address), p_product_id, p_product_name, p_amount::DECIMAL, p_daily_rate::DECIMAL, p_days, v_end_date, p_tx_hash, CURRENT_DATE)
  RETURNING id INTO v_order_id;

  -- Only check level, do NOT settle immediately (earnings start from next day)
  PERFORM check_and_upgrade_level(LOWER(p_wallet_address));

  RETURN v_order_id;
END;
$$;

-- Update settlement time function to accept timezone offset
CREATE OR REPLACE FUNCTION update_settlement_time(p_sgt_hour INTEGER, p_sgt_minute INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_utc_hour INTEGER;
  v_tz_offset INTEGER;
  v_cron_expr TEXT;
BEGIN
  IF p_sgt_hour < 0 OR p_sgt_hour > 23 THEN
    RAISE EXCEPTION 'Hour must be between 0 and 23';
  END IF;
  IF p_sgt_minute < 0 OR p_sgt_minute > 59 THEN
    RAISE EXCEPTION 'Minute must be between 0 and 59';
  END IF;

  -- Get stored timezone offset (default 8 for UTC+8)
  SELECT COALESCE(
    (SELECT value::INTEGER FROM system_settings WHERE key = 'settlement_tz_offset'),
    8
  ) INTO v_tz_offset;

  -- Convert local time to UTC
  v_utc_hour := (p_sgt_hour - v_tz_offset + 24) % 24;

  UPDATE system_settings SET value = v_utc_hour::TEXT, updated_at = NOW() WHERE key = 'settlement_hour';
  UPDATE system_settings SET value = p_sgt_minute::TEXT, updated_at = NOW() WHERE key = 'settlement_minute';

  PERFORM cron.unschedule('process-daily-settlement');
  v_cron_expr := p_sgt_minute || ' ' || v_utc_hour || ' * * *';
  PERFORM cron.schedule('process-daily-settlement', v_cron_expr, 'SELECT process_daily()');

  RETURN json_build_object(
    'localHour', p_sgt_hour,
    'localMinute', p_sgt_minute,
    'utcHour', v_utc_hour,
    'utcMinute', p_sgt_minute,
    'tzOffset', v_tz_offset,
    'cronExpr', v_cron_expr,
    'success', true
  );
END;
$fn$;

-- Add timezone offset setting
INSERT INTO system_settings (key, value) VALUES ('settlement_tz_offset', '8')
ON CONFLICT (key) DO NOTHING;

-- Update settlement config to include tz offset
CREATE OR REPLACE FUNCTION get_settlement_config()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_hour TEXT;
  v_minute TEXT;
  v_tz TEXT;
  v_tz_offset TEXT;
BEGIN
  SELECT value INTO v_hour FROM system_settings WHERE key = 'settlement_hour';
  SELECT value INTO v_minute FROM system_settings WHERE key = 'settlement_minute';
  SELECT value INTO v_tz FROM system_settings WHERE key = 'settlement_timezone';
  SELECT value INTO v_tz_offset FROM system_settings WHERE key = 'settlement_tz_offset';

  RETURN json_build_object(
    'hour', COALESCE(v_hour, '16'),
    'minute', COALESCE(v_minute, '0'),
    'timezone', COALESCE(v_tz, 'Asia/Shanghai'),
    'utcHour', COALESCE(v_hour, '16'),
    'utcMinute', COALESCE(v_minute, '0'),
    'tzOffset', COALESCE(v_tz_offset, '8')
  );
END;
$$;
