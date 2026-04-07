-- ============================================================
-- Pass-through direct/indirect referral rewards
--
-- Previous behaviour: if the immediate parent (or grandparent)
-- was unactivated (no active orders), the 10% / 5% reward was
-- silently burned — nobody received it.
--
-- New behaviour: when computing direct/indirect rewards we walk
-- up the referral chain skipping any unactivated ancestor, and
-- pay:
--   * the FIRST  activated ancestor → 10% (direct_referral)
--   * the SECOND activated ancestor →  5% (indirect_referral)
--
-- Because settlement runs daily and re-evaluates the chain on
-- every run, an upline who later activates will automatically
-- start receiving their share starting from the next day's
-- settlement — no backfill / reorganization needed.
--
-- Team bonuses (process_team_bonuses_daily) are unchanged: that
-- function already gates on the leader having an active order
-- and uses a different (level-based) distribution model.
-- ============================================================

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

  -- Pass-through walker state
  v_cursor_addr TEXT;
  v_cursor_member members%ROWTYPE;
  v_cursor_has_inv BOOLEAN;
  v_first_active TEXT;
  v_second_active TEXT;
  v_hops INTEGER := 0;
  v_max_hops CONSTANT INTEGER := 50; -- safety against cycles / runaway chains

  v_direct_reward DECIMAL;
  v_indirect_reward DECIMAL;
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

  -- ----- Pass-through direct + indirect referral distribution -----
  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF v_member.referrer_address IS NOT NULL
     AND v_member.referrer_address != '0x0000000000000000000000000000000000000001'
  THEN
    v_cursor_addr := v_member.referrer_address;
    v_first_active := NULL;
    v_second_active := NULL;
    v_hops := 0;

    WHILE v_cursor_addr IS NOT NULL
          AND v_cursor_addr != '0x0000000000000000000000000000000000000001'
          AND v_second_active IS NULL
          AND v_hops < v_max_hops
    LOOP
      v_hops := v_hops + 1;

      SELECT EXISTS (
        SELECT 1 FROM orders
        WHERE wallet_address = v_cursor_addr
          AND status = 'active'
          AND amount > 0
      ) INTO v_cursor_has_inv;

      IF v_cursor_has_inv THEN
        IF v_first_active IS NULL THEN
          v_first_active := v_cursor_addr;
        ELSE
          v_second_active := v_cursor_addr;
          EXIT;
        END IF;
      END IF;

      -- Walk one step up the referral chain
      SELECT * INTO v_cursor_member FROM members WHERE wallet_address = v_cursor_addr;
      IF NOT FOUND THEN
        EXIT;
      END IF;
      v_cursor_addr := v_cursor_member.referrer_address;
    END LOOP;

    IF v_first_active IS NOT NULL THEN
      v_direct_reward := v_total_new_earning * 0.10;
      IF v_direct_reward > 0 THEN
        INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
        VALUES (v_first_active, 'direct_referral', v_direct_reward,
                v_order.wallet_address, p_order_id,
                CASE
                  WHEN v_first_active = v_member.referrer_address
                    THEN 'Direct referral reward from ' || LEFT(v_order.wallet_address, 6) || '...'
                  ELSE 'Direct referral (pass-through) from ' || LEFT(v_order.wallet_address, 6) || '...'
                END);
      END IF;
    END IF;

    IF v_second_active IS NOT NULL THEN
      v_indirect_reward := v_total_new_earning * 0.05;
      IF v_indirect_reward > 0 THEN
        INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
        VALUES (v_second_active, 'indirect_referral', v_indirect_reward,
                v_order.wallet_address, p_order_id,
                'Indirect referral (pass-through) from ' || LEFT(v_order.wallet_address, 6) || '...');
      END IF;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;
