-- Fix: Settlement timezone issue
-- Cron runs at UTC 16:00 (= CN midnight 00:00), but settle_order used UTC dates
-- for comparison, so whole_days was always 0 at cron time (same UTC date).
-- Fix: Use Asia/Shanghai timezone for all date comparisons.

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
  -- Use Asia/Shanghai timezone for date comparison (cron runs at UTC 16:00 = CN midnight)
  v_whole_days := ((v_effective_now AT TIME ZONE 'Asia/Shanghai')::DATE - (v_last_date AT TIME ZONE 'Asia/Shanghai')::DATE);

  IF v_whole_days < 1 THEN
    IF v_now >= v_order.end_date THEN
      UPDATE orders SET status = 'completed' WHERE id = p_order_id;
    END IF;
    RETURN FALSE;
  END IF;

  v_daily_earning := v_order.amount * v_order.daily_rate / 100;
  v_total_new_earning := v_daily_earning * v_whole_days;
  v_new_total := v_order.total_earned + v_total_new_earning;
  v_settle_date := (v_effective_now AT TIME ZONE 'Asia/Shanghai')::DATE;

  UPDATE orders SET total_earned = v_new_total, last_earning_date = v_settle_date WHERE id = p_order_id;

  IF v_now >= v_order.end_date THEN
    UPDATE orders SET status = 'completed' WHERE id = p_order_id;
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
