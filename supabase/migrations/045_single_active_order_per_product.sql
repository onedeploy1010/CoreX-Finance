-- ============================================================
-- Per-product "one active order at a time" constraint
--
-- Business rule for product 1 (芯未来, the 200-USDT entry product):
--   - First order: any multiple of 200 OK
--   - While that order is 'active' (not matured/redeemed/reinvested):
--     no second order on the same product
--   - Once the order matures: user can reinvest, or buy a new order
--
-- Other products are unconstrained.
--
-- Implementation:
--   1. products.single_active_order_per_user flag (admin-toggleable)
--   2. assert_single_active_order(addr, product_id) helper, raises
--      'PRODUCT_SINGLE_ACTIVE_ORDER' if violated. Uses an advisory
--      transaction lock keyed by wallet+product to serialize concurrent
--      callers and prevent the TOCTOU window between the count and the
--      INSERT.
--   3. All four explicit creation paths call the helper.
--   4. process_matured_reinvestments skips (does not raise) when blocked,
--      leaving the matured order in place for manual redemption.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS single_active_order_per_user BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE products SET single_active_order_per_user = TRUE WHERE id = 1;

-- ------------------------------------------------------------
-- Guard helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_single_active_order(
  p_wallet_address TEXT,
  p_product_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_addr TEXT := LOWER(p_wallet_address);
  v_flag BOOLEAN;
  v_active_count INTEGER;
BEGIN
  SELECT single_active_order_per_user INTO v_flag
  FROM products WHERE id = p_product_id;
  IF NOT COALESCE(v_flag, FALSE) THEN
    RETURN;
  END IF;

  -- Serialize concurrent callers for the same (wallet, product). The
  -- two integers form a 64-bit advisory key; the lock auto-releases at
  -- transaction end.
  PERFORM pg_advisory_xact_lock(
    hashtext('order_guard:' || v_addr)::BIGINT,
    p_product_id::BIGINT
  );

  SELECT COUNT(*) INTO v_active_count
  FROM orders
  WHERE wallet_address = v_addr
    AND product_id = p_product_id
    AND status = 'active';

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'PRODUCT_SINGLE_ACTIVE_ORDER'
      USING HINT = 'User already has an active order for this product; wait until it matures.';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- create_order_from_tx (on-chain investment)
-- ------------------------------------------------------------
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
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE tx_hash = p_tx_hash) THEN
    RAISE EXCEPTION 'Transaction already processed';
  END IF;

  PERFORM assert_single_active_order(p_wallet_address, p_product_id);

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, tx_hash, last_earning_date)
  VALUES (LOWER(p_wallet_address), p_product_id, p_product_name, p_amount::DECIMAL, p_daily_rate::DECIMAL, p_days, v_end_date, p_tx_hash, v_sh_today)
  RETURNING id INTO v_order_id;

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

GRANT EXECUTE ON FUNCTION create_order_from_tx(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- ------------------------------------------------------------
-- create_order_with_balance (balance investment)
-- ------------------------------------------------------------
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
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
  v_member members%ROWTYPE;
  v_current_addr TEXT;
BEGIN
  PERFORM assert_single_active_order(v_addr, p_product_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_daily_rewards
  FROM rewards WHERE wallet_address = v_addr AND type = 'daily';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_rewards
  FROM rewards WHERE wallet_address = v_addr
    AND type IN ('direct_referral', 'indirect_referral', 'team_bonus');

  SELECT COALESCE(SUM(amount), 0) INTO v_principal_return
  FROM rewards WHERE wallet_address = v_addr AND type = 'principal_return';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn
  FROM withdrawals WHERE wallet_address = v_addr AND status != 'rejected';

  v_available := v_daily_rewards + v_total_rewards + v_principal_return - v_total_withdrawn;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Insufficient balance: available=%, requested=%', v_available, p_amount;
  END IF;

  INSERT INTO withdrawals (wallet_address, amount, fee, actual_amount, status, tx_hash)
  VALUES (v_addr, p_amount, 0, p_amount, 'completed', 'balance_payment');

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (
    wallet_address, product_id, product_name, amount, daily_rate,
    days, start_date, end_date, status, total_earned, last_earning_date,
    tx_hash, payment_method
  ) VALUES (
    v_addr, p_product_id, p_product_name, p_amount, p_daily_rate,
    p_days, NOW(), v_end_date, 'active', 0, v_sh_today,
    NULL, 'balance'
  )
  RETURNING id INTO v_new_order_id;

  PERFORM check_and_upgrade_level(v_addr);
  SELECT * INTO v_member FROM members WHERE wallet_address = v_addr;
  IF FOUND THEN
    v_current_addr := v_member.referrer_address;
    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'orderId', v_new_order_id,
    'amount', p_amount::TEXT,
    'paymentMethod', 'balance',
    'remainingBalance', (v_available - p_amount)::TEXT
  );
END;
$$;

-- ------------------------------------------------------------
-- admin_create_order (admin manual creation)
-- ------------------------------------------------------------
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
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
BEGIN
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE id = p_admin_id) INTO v_admin_exists;
  IF NOT v_admin_exists THEN
    RAISE EXCEPTION 'Unauthorized: invalid admin';
  END IF;

  PERFORM assert_single_active_order(p_wallet_address, p_product_id);

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, tx_hash, last_earning_date)
  VALUES (LOWER(p_wallet_address), p_product_id, p_product_name, p_amount, p_daily_rate, p_days, v_end_date, NULL, v_sh_today)
  RETURNING id INTO v_order_id;

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

-- ------------------------------------------------------------
-- reinvest_matured_order (manual reinvest)
-- ------------------------------------------------------------
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
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
  v_member members%ROWTYPE;
  v_current_addr TEXT;
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

  PERFORM assert_single_active_order(v_order.wallet_address, v_order.product_id);

  v_new_end_date := NOW() + (v_order.days || ' days')::INTERVAL;

  INSERT INTO orders (
    wallet_address, product_id, product_name, amount, daily_rate,
    days, start_date, end_date, status, total_earned, last_earning_date,
    tx_hash, reinvested_from_order_id, payment_method
  ) VALUES (
    v_order.wallet_address, v_order.product_id, v_order.product_name,
    v_order.amount, v_order.daily_rate, v_order.days,
    NOW(), v_new_end_date, 'active', 0, v_sh_today,
    NULL, v_order.id, 'balance'
  )
  RETURNING id INTO v_new_order_id;

  UPDATE orders SET status = 'reinvested' WHERE id = p_order_id;

  INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
  VALUES (
    v_order.wallet_address,
    'reinvest',
    0,
    p_order_id,
    'Manual reinvest: order #' || p_order_id || ' → order #' || v_new_order_id
      || ' (principal: ' || TRIM(TO_CHAR(v_order.amount, 'FM999999999999.99')) || ')'
  );

  PERFORM check_and_upgrade_level(v_order.wallet_address);
  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF FOUND THEN
    v_current_addr := v_member.referrer_address;
    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'oldOrderId', p_order_id,
    'newOrderId', v_new_order_id,
    'amount', v_order.amount::TEXT,
    'days', v_order.days,
    'reinvestedAt', NOW()
  );
END;
$$;

-- ------------------------------------------------------------
-- process_matured_reinvestments (auto-reinvest cron)
-- Skip-on-violation: leaves the order as 'matured' if the user already
-- has an active order on the same product (e.g. created by the same
-- cron a moment earlier on a sibling order). Operator can manually
-- redeem or wait for the active one to mature.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_matured_reinvestments()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_new_end_date TIMESTAMPTZ;
  v_new_order_id INTEGER;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
  v_blocked BOOLEAN;
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
BEGIN
  FOR v_order IN
    SELECT *
    FROM orders
    WHERE status = 'matured'
      AND COALESCE(matured_at, end_date) + INTERVAL '24 hours' <= NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Single-active-order rule: skip rather than raise so the cron
    -- keeps processing other matured orders.
    BEGIN
      v_blocked := FALSE;
      PERFORM assert_single_active_order(v_order.wallet_address, v_order.product_id);
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'PRODUCT_SINGLE_ACTIVE_ORDER' THEN
        v_blocked := TRUE;
      ELSE
        RAISE;
      END IF;
    END;

    IF v_blocked THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_new_end_date := NOW() + (v_order.days || ' days')::INTERVAL;

    INSERT INTO orders (
      wallet_address, product_id, product_name, amount, daily_rate,
      days, start_date, end_date, status, total_earned, last_earning_date,
      tx_hash, reinvested_from_order_id, payment_method
    ) VALUES (
      v_order.wallet_address, v_order.product_id, v_order.product_name,
      v_order.amount, v_order.daily_rate, v_order.days,
      NOW(), v_new_end_date, 'active', 0, v_sh_today,
      NULL, v_order.id, 'balance'
    )
    RETURNING id INTO v_new_order_id;

    UPDATE orders SET status = 'reinvested' WHERE id = v_order.id;

    INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
    VALUES (
      v_order.wallet_address,
      'reinvest',
      0,
      v_order.id,
      'Auto-reinvest (24h expired): order #' || v_order.id || ' → order #' || v_new_order_id
        || ' (principal: ' || TRIM(TO_CHAR(v_order.amount, 'FM999999999999.99')) || ')'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
