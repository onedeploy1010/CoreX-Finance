-- Fix 1: check_and_upgrade_level must require direct_effective >= 2 for ALL levels
-- Fix 2: equal-level cascade must check recipient has active investment
-- Fix 3: Clean up system/test accounts with wrong level_override

-- ============================================================
-- 1. Fix check_and_upgrade_level: require direct_effective >= 2 for all levels
-- ============================================================
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

  -- All levels require at least 2 direct effective referrals
  IF v_direct_effective < 2 THEN
    v_new_level := 0;
  ELSE
    FOR i IN REVERSE 7..1 LOOP
      IF v_effective_count >= v_levels_people[i + 1] AND v_team_staking >= v_levels_amount[i + 1] THEN
        IF i = 1 THEN
          v_new_level := 1;
          EXIT;
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
  END IF;

  -- Respect level_override: never go below the manually set level
  IF v_member.level_override IS NOT NULL AND v_new_level < v_member.level_override THEN
    v_new_level := v_member.level_override;
  END IF;

  IF v_new_level != v_member.level THEN
    UPDATE members SET level = v_new_level, lifetime_lock = FALSE
    WHERE wallet_address = p_wallet_address;
  END IF;
END;
$$;

-- ============================================================
-- 2. Fix process_team_bonuses_daily: equal-level cascade must check recipient has active investment
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
  v_upline_has_investment BOOLEAN;
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
        AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE
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

    -- Calculate DIFFERENTIAL team staking
    WITH RECURSIVE team AS (
      SELECT m.wallet_address, m.level
      FROM members m
      WHERE m.referrer_address = v_leader.wallet_address
      UNION ALL
      SELECT m.wallet_address, m.level
      FROM members m
      INNER JOIN team t ON m.referrer_address = t.wallet_address
      WHERE t.level < v_leader.level
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

      -- Cascading equal-level bonus: up to 3 same-level ancestors (10% each, decreasing)
      v_prev_bonus := v_team_reward;
      v_current_addr := v_leader.referrer_address;
      v_equal_count := 0;

      WHILE v_current_addr IS NOT NULL AND v_equal_count < 3 LOOP
        SELECT * INTO v_upline FROM members WHERE wallet_address = v_current_addr;
        IF NOT FOUND THEN EXIT; END IF;

        IF v_upline.level = v_leader.level THEN
          -- Check upline has active investment before giving equal-level bonus
          SELECT EXISTS (
            SELECT 1 FROM orders WHERE wallet_address = v_upline.wallet_address AND status = 'active' AND amount > 0
          ) INTO v_upline_has_investment;

          IF v_upline_has_investment THEN
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
        END IF;

        v_current_addr := v_upline.referrer_address;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Clean up system/test accounts
-- ============================================================
-- Remove level_override from system address and 0xabf8 (no investment)
UPDATE members SET level_override = NULL, level = 0
WHERE wallet_address IN (
  '0x0000000000000000000000000000000000000001',
  lower('0xabf8df4b3df20036ae86d7a7930692291de04f4e')
);

-- ============================================================
-- 4. Recalculate all member levels to fix any incorrect levels
-- ============================================================
DO $$
DECLARE
  v_member RECORD;
BEGIN
  FOR v_member IN SELECT wallet_address FROM members ORDER BY created_at
  LOOP
    PERFORM check_and_upgrade_level(v_member.wallet_address);
  END LOOP;
END;
$$;
