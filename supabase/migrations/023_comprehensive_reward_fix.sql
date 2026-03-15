-- Comprehensive fix for reward calculation:
-- 1. Drop old per-order process_team_bonus() function
-- 2. Update settle_order() to require active investment for referral rewards
-- 3. Re-create process_team_bonuses_daily() with 3-generation equal-level limit
-- 4. Clean up all incorrect reward records

-- ============================================================
-- 1. Drop old per-order team bonus function (no longer used)
-- ============================================================
DROP FUNCTION IF EXISTS process_team_bonus(INTEGER, DECIMAL);

-- ============================================================
-- 2. Update settle_order: referral rewards only to users with active investments
--    Skip system root address 0x0000...0001
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
  v_referrer members%ROWTYPE;
  v_direct_reward DECIMAL;
  v_indirect_reward DECIMAL;
  v_referrer_has_investment BOOLEAN;
  v_referrer2_has_investment BOOLEAN;
BEGIN
  -- Lock the row to prevent concurrent settlement
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'active' FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  v_last_date := COALESCE(v_order.last_earning_date, v_order.start_date);
  v_effective_now := LEAST(v_now, v_order.end_date);
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
  v_settle_date := v_effective_now::DATE;

  UPDATE orders SET total_earned = v_new_total, last_earning_date = v_settle_date WHERE id = p_order_id;

  IF v_now >= v_order.end_date THEN
    UPDATE orders SET status = 'completed' WHERE id = p_order_id;
  END IF;

  -- Daily earnings reward
  INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
  VALUES (v_order.wallet_address, 'daily', v_total_new_earning,
          p_order_id, v_order.product_name || ' daily earnings x' || v_whole_days || ' day(s)');

  -- Direct referral reward (10%) - only if referrer has active investment
  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF v_member.referrer_address IS NOT NULL
     AND v_member.referrer_address != '0x0000000000000000000000000000000000000001'
  THEN
    -- Check referrer has active investment
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

    -- Indirect referral reward (5%) - only if 2nd-level referrer has active investment
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

  -- NOTE: Team bonuses are calculated separately in process_daily() → process_team_bonuses_daily()
  -- NOT per-order

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 3. Re-create process_team_bonuses_daily with 3-gen equal-level limit
--    Formula: team_staking × leader_highest_daily_rate × level_bonus%
-- ============================================================
CREATE OR REPLACE FUNCTION process_team_bonuses_daily()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_leader RECORD;
  v_team_staking DECIMAL;
  v_highest_rate DECIMAL;
  v_bonus_rate INTEGER;
  v_team_reward DECIMAL;
  v_current_addr TEXT;
  v_upline members%ROWTYPE;
  v_prev_bonus DECIMAL;
  v_equal_bonus DECIMAL;
  v_equal_count INTEGER;
  v_level_configs INTEGER[] := ARRAY[0, 8, 13, 18, 22, 26, 30, 33];
BEGIN
  FOR v_leader IN
    SELECT m.wallet_address, m.level, m.referrer_address
    FROM members m
    WHERE m.level >= 1
      AND m.wallet_address != '0x0000000000000000000000000000000000000001'
      AND EXISTS (SELECT 1 FROM orders o WHERE o.wallet_address = m.wallet_address AND o.status = 'active' AND o.amount > 0)
  LOOP
    -- Skip if team_bonus already calculated today for this wallet
    IF EXISTS (
      SELECT 1 FROM rewards
      WHERE wallet_address = v_leader.wallet_address
        AND type = 'team_bonus'
        AND description NOT LIKE 'equal-level%'
        AND created_at::DATE = CURRENT_DATE
    ) THEN
      CONTINUE;
    END IF;

    -- Get leader's highest daily rate from their own active orders
    SELECT MAX(daily_rate) INTO v_highest_rate
    FROM orders
    WHERE wallet_address = v_leader.wallet_address AND status = 'active' AND amount > 0;

    IF v_highest_rate IS NULL OR v_highest_rate <= 0 THEN
      CONTINUE;
    END IF;

    -- Calculate team staking (all downline active orders)
    WITH RECURSIVE team AS (
      SELECT wallet_address FROM members WHERE referrer_address = v_leader.wallet_address
      UNION ALL
      SELECT m.wallet_address FROM members m INNER JOIN team t ON m.referrer_address = t.wallet_address
    )
    SELECT COALESCE(SUM(o.amount), 0) INTO v_team_staking
    FROM team t
    INNER JOIN orders o ON o.wallet_address = t.wallet_address AND o.status = 'active';

    IF v_team_staking <= 0 THEN
      CONTINUE;
    END IF;

    v_bonus_rate := v_level_configs[v_leader.level + 1];
    -- Formula: team_staking × (highest_daily_rate / 100) × (bonus_rate / 100)
    v_team_reward := v_team_staking * (v_highest_rate / 100) * (v_bonus_rate / 100.0);

    IF v_team_reward > 0 THEN
      INSERT INTO rewards (wallet_address, type, amount, description)
      VALUES (v_leader.wallet_address, 'team_bonus', v_team_reward,
              '业绩:' || TRIM(TO_CHAR(v_team_staking, '999999999999')) || '|利率:' || v_highest_rate || '|比例:' || v_bonus_rate);

      -- Cascading equal-level bonus: up to 3 same-level ancestors (10% each)
      v_prev_bonus := v_team_reward;
      v_current_addr := v_leader.referrer_address;
      v_equal_count := 0;

      WHILE v_current_addr IS NOT NULL AND v_equal_count < 3 LOOP
        SELECT * INTO v_upline FROM members WHERE wallet_address = v_current_addr;
        IF NOT FOUND THEN EXIT; END IF;

        IF v_upline.level = v_leader.level THEN
          v_equal_bonus := v_prev_bonus * 10 / 100;
          IF v_equal_bonus > 0 THEN
            v_equal_count := v_equal_count + 1;
            INSERT INTO rewards (wallet_address, type, amount, from_address, description)
            VALUES (v_upline.wallet_address, 'team_bonus', v_equal_bonus,
                    v_leader.wallet_address,
                    'equal-level|' || v_equal_count || '|from:' || LEFT(v_leader.wallet_address, 6) || '...|' || ROUND(v_prev_bonus, 4) || 'x10%');
            v_prev_bonus := v_equal_bonus;
          ELSE
            EXIT;
          END IF;
        END IF;

        v_current_addr := v_upline.referrer_address;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 4. Clean up ALL incorrect reward records
-- ============================================================

-- 4a. Delete all rewards to system root address
DELETE FROM rewards WHERE wallet_address = '0x0000000000000000000000000000000000000001';

-- 4b. Delete all old-format team_bonus records (from per-order process_team_bonus)
DELETE FROM rewards WHERE type = 'team_bonus' AND description LIKE 'V%team bonus%';

-- 4c. Delete equal-level bonus beyond generation 3
DELETE FROM rewards WHERE type = 'team_bonus'
  AND (description LIKE 'equal-level|4|%' OR description LIKE 'equal-level|5|%');
