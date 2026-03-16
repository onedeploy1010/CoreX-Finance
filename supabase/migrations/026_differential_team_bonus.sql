-- Fix: Team bonus uses DIFFERENTIAL team staking
-- Team staking should EXCLUDE subtrees under same-or-higher level leaders
-- Those leaders get their own team bonus; the upper leader only gets equal-level 10% cascade
-- This was applied directly to DB but not captured in migration files

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

    -- Calculate DIFFERENTIAL team staking:
    -- Include same-level members' PERSONAL staking, but stop recursion into their subtrees
    -- The CTE includes same-level members (first SELECT) but does NOT recurse into them
    -- So summing ALL members in the CTE gives: lower-level staking + same-level personal staking
    WITH RECURSIVE team AS (
      SELECT m.wallet_address, m.level
      FROM members m
      WHERE m.referrer_address = v_leader.wallet_address
      UNION ALL
      SELECT m.wallet_address, m.level
      FROM members m
      INNER JOIN team t ON m.referrer_address = t.wallet_address
      WHERE t.level < v_leader.level  -- stop recursion at same/higher level (don't enter their subtrees)
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
