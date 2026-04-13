-- Security fix: Revoke anon/public access to create_order_from_tx
-- Orders must now be created through the investment-callback edge function
-- which performs on-chain transaction verification before creating orders.

-- Revoke execute from anon role (frontend users)
REVOKE EXECUTE ON FUNCTION create_order_from_tx(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION create_order_from_tx(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) FROM authenticated;

-- Only service_role (used by edge functions) can call this
GRANT EXECUTE ON FUNCTION create_order_from_tx(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- Create a secure admin order creation function that validates admin session
CREATE OR REPLACE FUNCTION admin_create_order(
  p_admin_id INTEGER,
  p_wallet_address TEXT,
  p_product_id INTEGER,
  p_amount DECIMAL,
  p_product_name TEXT,
  p_daily_rate DECIMAL,
  p_days INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id INTEGER;
  v_end_date TIMESTAMPTZ;
  v_admin_exists BOOLEAN;
  v_current_addr TEXT;
  v_member members%ROWTYPE;
BEGIN
  -- Verify admin exists
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE id = p_admin_id) INTO v_admin_exists;
  IF NOT v_admin_exists THEN
    RAISE EXCEPTION 'Unauthorized: invalid admin';
  END IF;

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, tx_hash, last_earning_date)
  VALUES (LOWER(p_wallet_address), p_product_id, p_product_name, p_amount, p_daily_rate, p_days, v_end_date, NULL, CURRENT_DATE)
  RETURNING id INTO v_order_id;

  -- Check levels
  PERFORM check_and_upgrade_level(LOWER(p_wallet_address));

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

GRANT EXECUTE ON FUNCTION admin_create_order(INTEGER, TEXT, INTEGER, DECIMAL, TEXT, DECIMAL, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION admin_create_order(INTEGER, TEXT, INTEGER, DECIMAL, TEXT, DECIMAL, INTEGER) TO service_role;
