-- ============================================================
-- Manual reinvest/redeem for matured orders
--
-- Replaces the 24h auto-reinvest window with explicit user choice:
--   - "复投" calls reinvest_matured_order() → new active order
--   - "赎回" calls redeem_matured_order()  → principal to balance
--
-- Also removes the 24h deadline from redeem_matured_order and
-- disables the auto-reinvest cron (process_matured_reinvestments).
-- ============================================================

-- 1. Manual reinvest: user chooses to reinvest with same cycle ------

CREATE OR REPLACE FUNCTION reinvest_matured_order(
  p_wallet_address TEXT,
  p_order_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_new_end_date TIMESTAMPTZ;
  v_new_order_id INTEGER;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND wallet_address = LOWER(p_wallet_address)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'matured' THEN
    RAISE EXCEPTION 'Order is not matured (status: %)', v_order.status;
  END IF;

  v_new_end_date := NOW() + (v_order.days || ' days')::INTERVAL;

  INSERT INTO orders (
    wallet_address, product_id, product_name, amount, daily_rate,
    days, start_date, end_date, status, total_earned, last_earning_date,
    tx_hash, reinvested_from_order_id
  ) VALUES (
    v_order.wallet_address, v_order.product_id, v_order.product_name,
    v_order.amount, v_order.daily_rate, v_order.days,
    NOW(), v_new_end_date, 'active', 0, CURRENT_DATE,
    NULL, v_order.id
  )
  RETURNING id INTO v_new_order_id;

  UPDATE orders SET status = 'reinvested' WHERE id = p_order_id;

  RETURN json_build_object(
    'oldOrderId', p_order_id,
    'newOrderId', v_new_order_id,
    'amount', v_order.amount::TEXT,
    'days', v_order.days,
    'reinvestedAt', NOW()
  );
END;
$$;

-- 2. Remove 24h deadline from redeem — user can redeem anytime ------

CREATE OR REPLACE FUNCTION redeem_matured_order(
  p_wallet_address TEXT,
  p_order_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND wallet_address = LOWER(p_wallet_address)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'matured' THEN
    RAISE EXCEPTION 'Order is not matured (status: %)', v_order.status;
  END IF;

  UPDATE orders
  SET status = 'redeemed'
  WHERE id = p_order_id;

  INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
  VALUES (
    v_order.wallet_address,
    'principal_return',
    v_order.amount,
    p_order_id,
    'Principal returned for order #' || p_order_id
  );

  RETURN json_build_object(
    'orderId', p_order_id,
    'principal', v_order.amount::TEXT,
    'redeemedAt', v_now
  );
END;
$$;

-- 3. Disable auto-reinvest cron — now a no-op -------------------------

CREATE OR REPLACE FUNCTION process_matured_reinvestments()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-reinvest disabled: users now choose manually via UI
  RETURN 0;
END;
$$;
