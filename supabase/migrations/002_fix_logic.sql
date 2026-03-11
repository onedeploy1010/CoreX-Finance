-- ============================================================
-- Fix 1: get_earnings - remove double counting of daily rewards
-- The daily earnings exist both in orders.total_earned AND rewards(type='daily')
-- Available balance should NOT add both together
-- ============================================================

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
  v_total_withdrawn DECIMAL;
  v_available DECIMAL;
BEGIN
  -- Daily earnings from orders (for display)
  SELECT COALESCE(SUM(total_earned), 0) INTO v_total_earnings
  FROM orders WHERE wallet_address = p_wallet_address;

  -- All rewards by type
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'daily';

  SELECT COALESCE(SUM(amount), 0) INTO v_direct_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'direct_referral';

  SELECT COALESCE(SUM(amount), 0) INTO v_indirect_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'indirect_referral';

  SELECT COALESCE(SUM(amount), 0) INTO v_team_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'team_bonus';

  -- Total referral+team rewards (excluding daily to avoid double count)
  v_total_rewards := v_direct_rewards + v_indirect_rewards + v_team_rewards;

  -- Total withdrawn
  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn
  FROM withdrawals WHERE wallet_address = p_wallet_address AND status != 'rejected';

  -- Available = daily earnings + referral/team rewards - withdrawn
  -- v_total_earnings == v_daily_rewards (same data, different source)
  -- Use v_daily_rewards from rewards table as single source of truth
  v_available := v_daily_rewards + v_total_rewards - v_total_withdrawn;

  RETURN json_build_object(
    'totalEarnings', v_total_earnings::TEXT,
    'totalRewards', v_total_rewards::TEXT,
    'directRewards', v_direct_rewards::TEXT,
    'indirectRewards', v_indirect_rewards::TEXT,
    'teamRewards', v_team_rewards::TEXT,
    'dailyRewards', v_daily_rewards::TEXT,
    'availableBalance', v_available::TEXT,
    'totalWithdrawn', v_total_withdrawn::TEXT
  );
END;
$$;

-- ============================================================
-- Fix 2: process_team_bonus - use differential rate (极差制)
-- V1=8%, V2 gets 13%-8%=5%, V3 gets 18%-13%=5%, etc.
-- Total payout capped at highest leader's rate
-- ============================================================

CREATE OR REPLACE FUNCTION process_team_bonus(p_order_id INTEGER, p_earning DECIMAL)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_current members%ROWTYPE;
  v_leader members%ROWTYPE;
  v_max_rate_used INTEGER := 0;  -- track highest bonus rate already distributed
  v_leader_rate INTEGER;
  v_diff_rate INTEGER;
  v_team_reward DECIMAL;
  v_equal_bonus DECIMAL;
  v_prev_level INTEGER := 0;
  v_level_configs INTEGER[] := ARRAY[0, 8, 13, 18, 22, 26, 30, 33]; -- bonus rates per level
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  SELECT * INTO v_current FROM members WHERE wallet_address = v_order.wallet_address;

  WHILE v_current.referrer_address IS NOT NULL LOOP
    SELECT * INTO v_leader FROM members WHERE wallet_address = v_current.referrer_address;
    IF NOT FOUND THEN
      EXIT;
    END IF;

    IF v_leader.level >= 1 THEN
      v_leader_rate := v_level_configs[v_leader.level + 1];

      -- Differential: only get the difference above what's already been distributed
      IF v_leader_rate > v_max_rate_used THEN
        v_diff_rate := v_leader_rate - v_max_rate_used;
        v_team_reward := p_earning * v_diff_rate / 100;

        IF v_team_reward > 0 THEN
          INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
          VALUES (v_leader.wallet_address, 'team_bonus', v_team_reward,
                  v_order.wallet_address, p_order_id,
                  'V' || v_leader.level || ' team bonus ' || v_diff_rate || '% (differential)');
        END IF;

        v_max_rate_used := v_leader_rate;
      END IF;

      -- Equal-level bonus (10%): same level as the previous leader who got team bonus
      IF v_prev_level >= 1 AND v_leader.level = v_prev_level THEN
        v_equal_bonus := p_earning * 10 / 100;
        IF v_equal_bonus > 0 THEN
          INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
          VALUES (v_leader.wallet_address, 'team_bonus', v_equal_bonus,
                  v_order.wallet_address, p_order_id,
                  'V' || v_leader.level || ' equal-level bonus 10%');
        END IF;
      END IF;

      v_prev_level := v_leader.level;
    END IF;

    v_current := v_leader;
  END LOOP;
END;
$$;

-- ============================================================
-- Fix 3: check_and_upgrade_level - count distinct direct sub-lines
-- that contain members at the required level, not total count
-- e.g., V2 needs 2 direct sub-lines each having at least 1 V1 member
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_upgrade_level(p_wallet_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_member members%ROWTYPE;
  v_team_count INTEGER;
  v_team_staking DECIMAL;
  v_new_level INTEGER := 0;
  v_qualifying_lines INTEGER;
  v_direct RECORD;
  v_has_qualified BOOLEAN;
  v_sub_member_count INTEGER;
  -- Level requirements: people, amount, subLevel, subCount
  v_levels_people INTEGER[] := ARRAY[0, 2, 6, 20, 80, 200, 500, 1000];
  v_levels_amount DECIMAL[] := ARRAY[0, 1000, 20000, 60000, 200000, 800000, 3000000, 10000000];
  v_levels_sublevel INTEGER[] := ARRAY[0, 0, 1, 2, 3, 4, 5, 6];
  v_levels_subcount INTEGER[] := ARRAY[0, 0, 2, 2, 2, 2, 2, 2];
  v_lifetime_lock BOOLEAN[] := ARRAY[FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, TRUE];
  i INTEGER;
BEGIN
  SELECT * INTO v_member FROM members WHERE wallet_address = p_wallet_address;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_member.lifetime_lock THEN RETURN; END IF;

  -- Get total team stats (active staking accounts and staking amount)
  WITH RECURSIVE team AS (
    SELECT wallet_address FROM members WHERE referrer_address = p_wallet_address
    UNION ALL
    SELECT m.wallet_address FROM members m INNER JOIN team t ON m.referrer_address = t.wallet_address
  )
  SELECT
    COUNT(DISTINCT t.wallet_address) FILTER (WHERE o.id IS NOT NULL),
    COALESCE(SUM(o.amount), 0)
  INTO v_team_count, v_team_staking
  FROM team t
  LEFT JOIN orders o ON o.wallet_address = t.wallet_address AND o.status = 'active';

  -- Check each level from highest to lowest
  FOR i IN REVERSE 7..1 LOOP
    IF v_team_count >= v_levels_people[i + 1] AND v_team_staking >= v_levels_amount[i + 1] THEN
      IF v_levels_subcount[i + 1] > 0 THEN
        -- Count how many DIRECT sub-lines have at least one member at the required level
        v_qualifying_lines := 0;

        FOR v_direct IN SELECT wallet_address FROM members WHERE referrer_address = p_wallet_address
        LOOP
          -- Check if this direct referral OR anyone in their sub-tree has the required level
          -- First check the direct referral themselves
          IF (SELECT level FROM members WHERE wallet_address = v_direct.wallet_address) >= v_levels_sublevel[i + 1] THEN
            v_qualifying_lines := v_qualifying_lines + 1;
            CONTINUE;
          END IF;

          -- Then check their entire sub-tree
          WITH RECURSIVE subtree AS (
            SELECT wallet_address FROM members WHERE referrer_address = v_direct.wallet_address
            UNION ALL
            SELECT m.wallet_address FROM members m INNER JOIN subtree st ON m.referrer_address = st.wallet_address
          )
          SELECT COUNT(*) INTO v_sub_member_count
          FROM subtree st
          INNER JOIN members m ON m.wallet_address = st.wallet_address
          WHERE m.level >= v_levels_sublevel[i + 1];

          IF v_sub_member_count > 0 THEN
            v_qualifying_lines := v_qualifying_lines + 1;
          END IF;

          -- Early exit if we already have enough qualifying lines
          IF v_qualifying_lines >= v_levels_subcount[i + 1] THEN
            EXIT;
          END IF;
        END LOOP;

        IF v_qualifying_lines >= v_levels_subcount[i + 1] THEN
          v_new_level := i;
          EXIT;
        END IF;
      ELSE
        v_new_level := i;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF v_new_level > v_member.level THEN
    UPDATE members SET level = v_new_level, lifetime_lock = v_lifetime_lock[v_new_level + 1]
    WHERE wallet_address = p_wallet_address;
  END IF;
END;
$$;
