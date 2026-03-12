-- Team bonus new formula:
-- Team Reward = Team Total Staking × Leader's Highest Personal Daily Rate × Level Bonus%
-- Equal-level bonus: walk up referral chain, up to 5 same-level ancestors,
--   each gets 10% of the previous equal-level bonus (cascading)
-- Description format for team_bonus: "业绩:XXXXX|利率:X.XX|比例:XX" (parseable by UI)

-- 1. Remove team bonus from settle_order (no longer per-order)
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
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'active';
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

  INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
  VALUES (v_order.wallet_address, 'daily', v_total_new_earning,
          p_order_id, v_order.product_name || ' daily earnings x' || v_whole_days || ' day(s)');

  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF v_member.referrer_address IS NOT NULL THEN
    v_direct_reward := v_total_new_earning * 0.10;
    IF v_direct_reward > 0 THEN
      INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
      VALUES (v_member.referrer_address, 'direct_referral', v_direct_reward,
              v_order.wallet_address, p_order_id,
              'Direct referral reward from ' || LEFT(v_order.wallet_address, 6) || '...');
    END IF;

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

  RETURN TRUE;
END;
$$;

-- 2. New function: calculate team bonuses + cascading equal-level bonus (up to 5)
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
      AND EXISTS (SELECT 1 FROM orders o WHERE o.wallet_address = m.wallet_address AND o.status = 'active')
  LOOP
    -- Skip if team_bonus already calculated today for this wallet (prevent duplicates)
    IF EXISTS (
      SELECT 1 FROM rewards
      WHERE wallet_address = v_leader.wallet_address
        AND type = 'team_bonus'
        AND description NOT LIKE 'equal-level%'
        AND created_at::DATE = CURRENT_DATE
    ) THEN
      CONTINUE;
    END IF;

    SELECT MAX(daily_rate) INTO v_highest_rate
    FROM orders
    WHERE wallet_address = v_leader.wallet_address AND status = 'active';

    IF v_highest_rate IS NULL OR v_highest_rate <= 0 THEN
      CONTINUE;
    END IF;

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
    v_team_reward := v_team_staking * (v_highest_rate / 100) * (v_bonus_rate / 100.0);

    IF v_team_reward > 0 THEN
      INSERT INTO rewards (wallet_address, type, amount, description)
      VALUES (v_leader.wallet_address, 'team_bonus', v_team_reward,
              '业绩:' || TRIM(TO_CHAR(v_team_staking, '999999999999')) || '|利率:' || v_highest_rate || '|比例:' || v_bonus_rate);

      -- Cascading equal-level bonus: walk up chain, up to 5 same-level ancestors
      v_prev_bonus := v_team_reward;
      v_current_addr := v_leader.referrer_address;
      v_equal_count := 0;

      WHILE v_current_addr IS NOT NULL AND v_equal_count < 5 LOOP
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

-- 3. Update process_daily
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

  PERFORM process_team_bonuses_daily();

  FOR v_member IN SELECT wallet_address FROM members
  LOOP
    PERFORM check_and_upgrade_level(v_member.wallet_address);
  END LOOP;
END;
$$;

-- 4. Update process_wallet_orders with same logic
CREATE OR REPLACE FUNCTION process_wallet_orders(p_wallet_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_member members%ROWTYPE;
  v_upline members%ROWTYPE;
  v_team_staking DECIMAL;
  v_highest_rate DECIMAL;
  v_bonus_rate INTEGER;
  v_team_reward DECIMAL;
  v_current_addr TEXT;
  v_prev_bonus DECIMAL;
  v_equal_bonus DECIMAL;
  v_equal_count INTEGER;
  v_level_configs INTEGER[] := ARRAY[0, 8, 13, 18, 22, 26, 30, 33];
BEGIN
  FOR v_order IN SELECT id FROM orders WHERE wallet_address = p_wallet_address AND status = 'active'
  LOOP
    PERFORM settle_order(v_order.id);
  END LOOP;

  SELECT * INTO v_member FROM members WHERE wallet_address = p_wallet_address;
  -- Skip if team_bonus already calculated today (prevent duplicates)
  IF FOUND AND v_member.level >= 1
    AND NOT EXISTS (
      SELECT 1 FROM rewards
      WHERE wallet_address = p_wallet_address
        AND type = 'team_bonus'
        AND description NOT LIKE 'equal-level%'
        AND created_at::DATE = CURRENT_DATE
    )
  THEN
    SELECT MAX(daily_rate) INTO v_highest_rate
    FROM orders WHERE wallet_address = p_wallet_address AND status = 'active';

    IF v_highest_rate IS NOT NULL AND v_highest_rate > 0 THEN
      WITH RECURSIVE team AS (
        SELECT wallet_address FROM members WHERE referrer_address = p_wallet_address
        UNION ALL
        SELECT m.wallet_address FROM members m INNER JOIN team t ON m.referrer_address = t.wallet_address
      )
      SELECT COALESCE(SUM(o.amount), 0) INTO v_team_staking
      FROM team t
      INNER JOIN orders o ON o.wallet_address = t.wallet_address AND o.status = 'active';

      IF v_team_staking > 0 THEN
        v_bonus_rate := v_level_configs[v_member.level + 1];
        v_team_reward := v_team_staking * (v_highest_rate / 100) * (v_bonus_rate / 100.0);

        IF v_team_reward > 0 THEN
          INSERT INTO rewards (wallet_address, type, amount, description)
          VALUES (p_wallet_address, 'team_bonus', v_team_reward,
                  '业绩:' || TRIM(TO_CHAR(v_team_staking, '999999999999')) || '|利率:' || v_highest_rate || '|比例:' || v_bonus_rate);

          -- Cascading equal-level bonus: up to 5 same-level ancestors
          v_prev_bonus := v_team_reward;
          v_current_addr := v_member.referrer_address;
          v_equal_count := 0;

          WHILE v_current_addr IS NOT NULL AND v_equal_count < 5 LOOP
            SELECT * INTO v_upline FROM members WHERE wallet_address = v_current_addr;
            IF NOT FOUND THEN EXIT; END IF;

            IF v_upline.level = v_member.level THEN
              v_equal_bonus := v_prev_bonus * 10 / 100;
              IF v_equal_bonus > 0 THEN
                v_equal_count := v_equal_count + 1;
                INSERT INTO rewards (wallet_address, type, amount, from_address, description)
                VALUES (v_upline.wallet_address, 'team_bonus', v_equal_bonus,
                        p_wallet_address,
                        'equal-level|' || v_equal_count || '|from:' || LEFT(p_wallet_address, 6) || '...|' || ROUND(v_prev_bonus, 4) || 'x10%');
                v_prev_bonus := v_equal_bonus;
              ELSE
                EXIT;
              END IF;
            END IF;

            v_current_addr := v_upline.referrer_address;
          END LOOP;
        END IF;
      END IF;
    END IF;
  END IF;

  PERFORM check_and_upgrade_level(p_wallet_address);
END;
$$;

-- 5. Clean ALL old reward data and recalculate fresh
DELETE FROM rewards WHERE type = 'team_bonus';

-- 6. Remove lifetime lock
UPDATE members SET lifetime_lock = FALSE WHERE lifetime_lock = TRUE;

-- 7. Update check_and_upgrade_level (no lifetime lock)
CREATE OR REPLACE FUNCTION check_and_upgrade_level(p_wallet_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_member members%ROWTYPE;
  v_effective_count INTEGER;
  v_team_staking DECIMAL;
  v_new_level INTEGER := 0;
  v_sub_count INTEGER;
  v_direct_effective INTEGER;
  v_levels_people INTEGER[] := ARRAY[0, 2, 6, 20, 80, 200, 500, 1000];
  v_levels_amount DECIMAL[] := ARRAY[0, 1000, 20000, 60000, 200000, 800000, 3000000, 10000000];
  v_levels_sublevel INTEGER[] := ARRAY[0, 0, 1, 2, 3, 4, 5, 6];
  v_levels_subcount INTEGER[] := ARRAY[0, 0, 2, 2, 2, 2, 2, 2];
  i INTEGER;
BEGIN
  SELECT * INTO v_member FROM members WHERE wallet_address = p_wallet_address;
  IF NOT FOUND THEN RETURN; END IF;

  WITH RECURSIVE team AS (
    SELECT wallet_address FROM members WHERE referrer_address = p_wallet_address
    UNION ALL
    SELECT m.wallet_address FROM members m INNER JOIN team t ON m.referrer_address = t.wallet_address
  )
  SELECT
    COUNT(DISTINCT t.wallet_address),
    COALESCE(SUM(stk.total_staking), 0)
  INTO v_effective_count, v_team_staking
  FROM team t
  INNER JOIN (
    SELECT wallet_address, SUM(amount) as total_staking
    FROM orders WHERE status = 'active'
    GROUP BY wallet_address
    HAVING SUM(amount) >= 200
  ) stk ON stk.wallet_address = t.wallet_address;

  SELECT COUNT(*) INTO v_direct_effective
  FROM members m
  INNER JOIN (
    SELECT wallet_address, SUM(amount) as total_staking
    FROM orders WHERE status = 'active'
    GROUP BY wallet_address
    HAVING SUM(amount) >= 200
  ) stk ON stk.wallet_address = m.wallet_address
  WHERE m.referrer_address = p_wallet_address;

  FOR i IN REVERSE 7..1 LOOP
    IF v_effective_count >= v_levels_people[i + 1] AND v_team_staking >= v_levels_amount[i + 1] THEN
      IF i = 1 THEN
        IF v_direct_effective >= 2 THEN
          v_new_level := 1;
          EXIT;
        END IF;
      ELSIF v_levels_subcount[i + 1] > 0 THEN
        WITH RECURSIVE team AS (
          SELECT wallet_address FROM members WHERE referrer_address = p_wallet_address
          UNION ALL
          SELECT m.wallet_address FROM members m INNER JOIN team t ON m.referrer_address = t.wallet_address
        )
        SELECT COUNT(*) INTO v_sub_count
        FROM team t
        INNER JOIN members m ON m.wallet_address = t.wallet_address
        WHERE m.level >= v_levels_sublevel[i + 1];

        IF v_sub_count >= v_levels_subcount[i + 1] THEN
          v_new_level := i;
          EXIT;
        END IF;
      ELSE
        v_new_level := i;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF v_new_level != v_member.level THEN
    UPDATE members SET level = v_new_level, lifetime_lock = FALSE
    WHERE wallet_address = p_wallet_address;
  END IF;
END;
$$;
