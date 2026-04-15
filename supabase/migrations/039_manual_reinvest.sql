-- ============================================================
-- Matured order: 24h auto-reinvest + manual reinvest/redeem
-- + Balance payment for reinvestment orders
--
-- Flow:
--   1. Order matures → status 'matured', 24h countdown starts
--   2. User can click "复投" to reinvest immediately
--   3. User can click "赎回" to redeem principal to balance
--   4. If 24h passes → cron auto-reinvests
--   5. On purchase page, user can pay with balance (复投 only)
-- ============================================================

-- 1. Add payment_method column ----------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'on_chain';

-- 2. Manual reinvest function -----------------------------------------

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
    tx_hash, reinvested_from_order_id, payment_method
  ) VALUES (
    v_order.wallet_address, v_order.product_id, v_order.product_name,
    v_order.amount, v_order.daily_rate, v_order.days,
    NOW(), v_new_end_date, 'active', 0, CURRENT_DATE,
    NULL, v_order.id, 'balance'
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

-- 3. Redeem function (no 24h deadline — cron handles expiry) ----------

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

-- 4. Restore auto-reinvest cron (24h after matured_at) ----------------

CREATE OR REPLACE FUNCTION process_matured_reinvestments()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_new_end_date TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT *
    FROM orders
    WHERE status = 'matured'
      AND COALESCE(matured_at, end_date) + INTERVAL '24 hours' <= NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    v_new_end_date := NOW() + (v_order.days || ' days')::INTERVAL;

    INSERT INTO orders (
      wallet_address, product_id, product_name, amount, daily_rate,
      days, start_date, end_date, status, total_earned, last_earning_date,
      tx_hash, reinvested_from_order_id, payment_method
    ) VALUES (
      v_order.wallet_address, v_order.product_id, v_order.product_name,
      v_order.amount, v_order.daily_rate, v_order.days,
      NOW(), v_new_end_date, 'active', 0, CURRENT_DATE,
      NULL, v_order.id, 'balance'
    );

    UPDATE orders SET status = 'reinvested' WHERE id = v_order.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 5. Balance payment: create order using available balance ------------

CREATE OR REPLACE FUNCTION create_order_with_balance(
  p_wallet_address TEXT,
  p_product_id INTEGER,
  p_amount DECIMAL,
  p_product_name TEXT,
  p_daily_rate DECIMAL,
  p_days INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_addr TEXT := LOWER(p_wallet_address);
  v_available DECIMAL;
  v_daily_rewards DECIMAL;
  v_total_rewards DECIMAL;
  v_principal_return DECIMAL;
  v_total_withdrawn DECIMAL;
  v_end_date TIMESTAMPTZ;
  v_new_order_id INTEGER;
BEGIN
  -- Calculate available balance
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_rewards
  FROM rewards WHERE wallet_address = v_addr AND type = 'daily';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_rewards
  FROM rewards WHERE wallet_address = v_addr AND type IN ('direct_referral', 'indirect_referral', 'team_bonus');

  SELECT COALESCE(SUM(amount), 0) INTO v_principal_return
  FROM rewards WHERE wallet_address = v_addr AND type = 'principal_return';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn
  FROM withdrawals WHERE wallet_address = v_addr AND status != 'rejected';

  v_available := v_daily_rewards + v_total_rewards + v_principal_return - v_total_withdrawn;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Insufficient balance: available=%, requested=%', v_available, p_amount;
  END IF;

  -- Deduct from balance by creating a withdrawal-like record
  INSERT INTO withdrawals (wallet_address, amount, fee, status, tx_hash)
  VALUES (v_addr, p_amount, 0, 'completed', 'balance_payment');

  -- Create order
  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (
    wallet_address, product_id, product_name, amount, daily_rate,
    days, start_date, end_date, status, total_earned, last_earning_date,
    tx_hash, payment_method
  ) VALUES (
    v_addr, p_product_id, p_product_name, p_amount, p_daily_rate,
    p_days, NOW(), v_end_date, 'active', 0, CURRENT_DATE,
    NULL, 'balance'
  )
  RETURNING id INTO v_new_order_id;

  RETURN json_build_object(
    'orderId', v_new_order_id,
    'amount', p_amount::TEXT,
    'paymentMethod', 'balance',
    'remainingBalance', (v_available - p_amount)::TEXT
  );
END;
$$;
