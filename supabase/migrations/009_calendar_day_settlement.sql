-- Change settlement from 24-hour intervals to calendar day (UTC date) based
-- If settlement runs on a new calendar day, count 1 day even if < 24 hours since start

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
  v_referrer2 members%ROWTYPE;
  v_direct_reward DECIMAL;
  v_indirect_reward DECIMAL;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'active';
  IF NOT FOUND THEN RETURN FALSE; END IF;

  v_last_date := COALESCE(v_order.last_earning_date, v_order.start_date);
  v_effective_now := LEAST(v_now, v_order.end_date);

  -- Use calendar date difference instead of 24-hour intervals
  v_whole_days := (v_effective_now::DATE - v_last_date::DATE);

  IF v_whole_days < 1 THEN
    IF v_now >= v_order.end_date THEN
      UPDATE orders SET status = 'completed' WHERE id = p_order_id;
    END IF;
    RETURN FALSE;
  END IF;

  v_daily_earning := v_order.amount * v_order.daily_rate / 100;
  v_total_new_earning := v_daily_earning * v_whole_days;
  v_new_total := v_order.total_earned + v_total_new_earning;
  -- Set last_earning_date to today's date (midnight UTC)
  v_settle_date := v_effective_now::DATE;

  UPDATE orders SET total_earned = v_new_total, last_earning_date = v_settle_date WHERE id = p_order_id;

  IF v_now >= v_order.end_date THEN
    UPDATE orders SET status = 'completed' WHERE id = p_order_id;
  END IF;

  -- Create daily reward
  INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
  VALUES (v_order.wallet_address, 'daily', v_total_new_earning,
          p_order_id, v_order.product_name || ' daily earnings x' || v_whole_days || ' day(s)');

  -- Direct referral reward (10%)
  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF v_member.referrer_address IS NOT NULL THEN
    v_direct_reward := v_total_new_earning * 0.10;
    IF v_direct_reward > 0 THEN
      INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
      VALUES (v_member.referrer_address, 'direct_referral', v_direct_reward,
              v_order.wallet_address, p_order_id,
              'Direct referral reward from ' || LEFT(v_order.wallet_address, 6) || '...');
    END IF;

    -- Indirect referral reward (5%)
    SELECT * INTO v_referrer FROM members WHERE wallet_address = v_member.referrer_address;
    IF v_referrer.referrer_address IS NOT NULL THEN
      v_indirect_reward := v_total_new_earning * 0.05;
      IF v_indirect_reward > 0 THEN
        INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
        VALUES (v_referrer.referrer_address, 'indirect_referral', v_indirect_reward,
                v_order.wallet_address, p_order_id,
                'Indirect referral reward from ' || LEFT(v_order.wallet_address, 6) || '...');
      END IF;
    END IF;
  END IF;

  -- Team and equal-level bonuses
  PERFORM process_team_bonus(p_order_id, v_total_new_earning);

  RETURN TRUE;
END;
$$;
