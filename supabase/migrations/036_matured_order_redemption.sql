-- ============================================================
-- Matured order redemption window (24 hours) + auto reinvest
--
-- Flow:
--   1. settle_order: when end_date reached, status becomes 'matured'
--      and matured_at is stamped (instead of going straight to 'completed').
--   2. User has 24 hours to call redeem_matured_order() to get the
--      principal back (credited as a rewards row of type 'principal_return'
--      so it counts in availableBalance for normal withdrawal).
--   3. If the 24h window lapses without redemption, the daily cron
--      calls process_matured_reinvestments() which clones the order
--      into a new active one (same product/amount/rate/days) and
--      marks the old one as 'reinvested'.
--
-- Statuses now possible on orders:
--   active     - earning daily
--   matured    - past end_date, inside 24h redemption window
--   redeemed   - user claimed principal back
--   reinvested - auto-reinvested after 24h window
--   completed  - legacy (kept so existing rows don't break)
-- ============================================================

-- 1. Schema -----------------------------------------------------------------

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS matured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reinvested_from_order_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_matured_at
  ON orders(matured_at) WHERE status = 'matured';

-- 2. settle_order: mature instead of complete on end_date -------------------

CREATE OR REPLACE FUNCTION settle_order(p_order_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_last_date TIMESTAMPTZ;
  v_effective_now TIMESTAMPTZ;
  v_whole_days INTEGER;
  v_daily_earning DECIMAL;
  v_total_new_earning DECIMAL;
  v_new_total DECIMAL;
  v_settle_date TIMESTAMPTZ;
  v_member members%ROWTYPE;
  v_referrer members%ROWTYPE;
  v_direct_reward DECIMAL;
  v_indirect_reward DECIMAL;
  v_referrer_has_investment BOOLEAN;
  v_referrer2_has_investment BOOLEAN;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'active' FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  v_last_date := COALESCE(v_order.last_earning_date, v_order.start_date);
  v_effective_now := LEAST(v_now, v_order.end_date);
  v_whole_days := ((v_effective_now AT TIME ZONE 'Asia/Shanghai')::DATE - (v_last_date AT TIME ZONE 'Asia/Shanghai')::DATE);

  IF v_whole_days < 1 THEN
    IF v_now >= v_order.end_date THEN
      UPDATE orders SET status = 'matured', matured_at = v_now WHERE id = p_order_id;
    END IF;
    RETURN FALSE;
  END IF;

  v_daily_earning := v_order.amount * v_order.daily_rate / 100;
  v_total_new_earning := v_daily_earning * v_whole_days;
  v_new_total := v_order.total_earned + v_total_new_earning;
  v_settle_date := (v_effective_now AT TIME ZONE 'Asia/Shanghai')::DATE;

  UPDATE orders SET total_earned = v_new_total, last_earning_date = v_settle_date WHERE id = p_order_id;

  IF v_now >= v_order.end_date THEN
    UPDATE orders SET status = 'matured', matured_at = v_now WHERE id = p_order_id;
  END IF;

  INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
  VALUES (v_order.wallet_address, 'daily', v_total_new_earning,
          p_order_id, v_order.product_name || ' daily earnings x' || v_whole_days || ' day(s)');

  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF v_member.referrer_address IS NOT NULL
     AND v_member.referrer_address != '0x0000000000000000000000000000000000000001'
  THEN
    SELECT EXISTS (
      SELECT 1 FROM orders WHERE wallet_address = v_member.referrer_address AND status = 'active' AND amount > 0
    ) INTO v_referrer_has_investment;

    IF v_referrer_has_investment THEN
      v_direct_reward := v_total_new_earning * 0.10;
      IF v_direct_reward > 0 THEN
        INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
        VALUES (v_member.referrer_address, 'direct_referral', v_direct_reward,
                v_order.wallet_address, p_order_id,
                'Direct referral reward from ' || LEFT(v_order.wallet_address, 6) || '...');
      END IF;
    END IF;

    SELECT * INTO v_referrer FROM members WHERE wallet_address = v_member.referrer_address;
    IF v_referrer.referrer_address IS NOT NULL
       AND v_referrer.referrer_address != '0x0000000000000000000000000000000000000001'
    THEN
      SELECT EXISTS (
        SELECT 1 FROM orders WHERE wallet_address = v_referrer.referrer_address AND status = 'active' AND amount > 0
      ) INTO v_referrer2_has_investment;

      IF v_referrer2_has_investment THEN
        v_indirect_reward := v_total_new_earning * 0.05;
        IF v_indirect_reward > 0 THEN
          INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
          VALUES (v_referrer.referrer_address, 'indirect_referral', v_indirect_reward,
                  v_order.wallet_address, p_order_id,
                  'Indirect referral reward from ' || LEFT(v_order.wallet_address, 6) || '...');
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- 3. redeem_matured_order: user claims back principal -----------------------

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
  v_deadline TIMESTAMPTZ;
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
    RAISE EXCEPTION 'Order is not in the redemption window (status: %)', v_order.status;
  END IF;

  v_deadline := COALESCE(v_order.matured_at, v_order.end_date) + INTERVAL '24 hours';
  IF v_now > v_deadline THEN
    RAISE EXCEPTION 'Redemption window has expired';
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

-- 4. process_matured_reinvestments: auto reinvest after 24h ----------------

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
      tx_hash, reinvested_from_order_id
    ) VALUES (
      v_order.wallet_address, v_order.product_id, v_order.product_name,
      v_order.amount, v_order.daily_rate, v_order.days,
      NOW(), v_new_end_date, 'active', 0, CURRENT_DATE,
      NULL, v_order.id
    );

    UPDATE orders SET status = 'reinvested' WHERE id = v_order.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 5. get_earnings: include principal_return in availableBalance -------------

CREATE OR REPLACE FUNCTION get_earnings(p_wallet_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_earnings DECIMAL;
  v_total_rewards DECIMAL;
  v_direct_rewards DECIMAL;
  v_indirect_rewards DECIMAL;
  v_team_rewards DECIMAL;
  v_daily_rewards DECIMAL;
  v_principal_return DECIMAL;
  v_total_withdrawn DECIMAL;
  v_available DECIMAL;
BEGIN
  SELECT COALESCE(SUM(total_earned), 0) INTO v_total_earnings
  FROM orders WHERE wallet_address = p_wallet_address;

  SELECT COALESCE(SUM(amount), 0) INTO v_daily_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'daily';

  SELECT COALESCE(SUM(amount), 0) INTO v_direct_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'direct_referral';

  SELECT COALESCE(SUM(amount), 0) INTO v_indirect_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'indirect_referral';

  SELECT COALESCE(SUM(amount), 0) INTO v_team_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'team_bonus';

  SELECT COALESCE(SUM(amount), 0) INTO v_principal_return
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'principal_return';

  v_total_rewards := v_direct_rewards + v_indirect_rewards + v_team_rewards;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn
  FROM withdrawals WHERE wallet_address = p_wallet_address AND status != 'rejected';

  v_available := v_daily_rewards + v_total_rewards + v_principal_return - v_total_withdrawn;

  RETURN json_build_object(
    'totalEarnings', v_total_earnings::TEXT,
    'totalRewards', v_total_rewards::TEXT,
    'directRewards', v_direct_rewards::TEXT,
    'indirectRewards', v_indirect_rewards::TEXT,
    'teamRewards', v_team_rewards::TEXT,
    'dailyRewards', v_daily_rewards::TEXT,
    'principalReturn', v_principal_return::TEXT,
    'availableBalance', v_available::TEXT,
    'totalWithdrawn', v_total_withdrawn::TEXT
  );
END;
$$;

-- 6. process_daily: also run reinvestments ----------------------------------

CREATE OR REPLACE FUNCTION process_daily()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_member RECORD;
BEGIN
  FOR v_order IN SELECT id FROM orders WHERE status = 'active'
  LOOP
    PERFORM settle_order(v_order.id);
  END LOOP;

  PERFORM process_matured_reinvestments();

  FOR v_member IN SELECT wallet_address FROM members
  LOOP
    PERFORM check_and_upgrade_level(v_member.wallet_address);
  END LOOP;
END;
$$;
