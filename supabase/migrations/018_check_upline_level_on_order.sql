-- Fix: when a new order is created, also check referral chain levels (not just the buyer)
-- This ensures upline leaders get upgraded immediately when their team grows

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
  v_current_addr TEXT;
  v_member members%ROWTYPE;
BEGIN
  -- Check duplicate tx_hash
  IF EXISTS (SELECT 1 FROM orders WHERE tx_hash = p_tx_hash) THEN
    RAISE EXCEPTION 'Transaction already processed';
  END IF;

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, tx_hash, last_earning_date)
  VALUES (LOWER(p_wallet_address), p_product_id, p_product_name, p_amount::DECIMAL, p_daily_rate::DECIMAL, p_days, v_end_date, p_tx_hash, CURRENT_DATE)
  RETURNING id INTO v_order_id;

  -- Check level for the buyer
  PERFORM check_and_upgrade_level(LOWER(p_wallet_address));

  -- Walk up the referral chain and check levels for all ancestors
  SELECT * INTO v_member FROM members WHERE wallet_address = LOWER(p_wallet_address);
  IF FOUND THEN
    v_current_addr := v_member.referrer_address;
    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN v_order_id;
END;
$$;
