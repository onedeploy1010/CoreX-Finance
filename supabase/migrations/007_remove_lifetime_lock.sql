-- Remove lifetime lock: V6/V7 can now be downgraded
-- Level drops when team staking, effective accounts, or own staking no longer meet requirements

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
  v_own_staking DECIMAL;
  -- Level requirements: people(有效账户), amount(业绩), subLevel, subCount
  v_levels_people INTEGER[] := ARRAY[0, 2, 6, 20, 80, 200, 500, 1000];
  v_levels_amount DECIMAL[] := ARRAY[0, 1000, 20000, 60000, 200000, 800000, 3000000, 10000000];
  v_levels_sublevel INTEGER[] := ARRAY[0, 0, 1, 2, 3, 4, 5, 6];
  v_levels_subcount INTEGER[] := ARRAY[0, 0, 2, 2, 2, 2, 2, 2];
  i INTEGER;
BEGIN
  SELECT * INTO v_member FROM members WHERE wallet_address = p_wallet_address;
  IF NOT FOUND THEN RETURN; END IF;

  -- Own active staking
  SELECT COALESCE(SUM(amount), 0) INTO v_own_staking
  FROM orders WHERE wallet_address = p_wallet_address AND status = 'active';

  -- Count "有效账户" in entire team: members whose active staking >= 200
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

  -- Count direct referrals who are "有效" (staking >= 200)
  SELECT COUNT(*) INTO v_direct_effective
  FROM members m
  INNER JOIN (
    SELECT wallet_address, SUM(amount) as total_staking
    FROM orders WHERE status = 'active'
    GROUP BY wallet_address
    HAVING SUM(amount) >= 200
  ) stk ON stk.wallet_address = m.wallet_address
  WHERE m.referrer_address = p_wallet_address;

  -- Check each level from highest to lowest
  FOR i IN REVERSE 7..1 LOOP
    IF v_effective_count >= v_levels_people[i + 1] AND v_team_staking >= v_levels_amount[i + 1] THEN
      IF i = 1 THEN
        -- V1 special: needs 2 direct effective referrals (投资200U以上)
        IF v_direct_effective >= 2 THEN
          v_new_level := 1;
          EXIT;
        END IF;
      ELSIF v_levels_subcount[i + 1] > 0 THEN
        -- V2+: count total team members at required level (同线也算)
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

  -- Update level (both upgrade AND downgrade)
  IF v_new_level != v_member.level THEN
    UPDATE members SET level = v_new_level, lifetime_lock = FALSE
    WHERE wallet_address = p_wallet_address;
  END IF;
END;
$$;

-- Reset any existing lifetime locks
UPDATE members SET lifetime_lock = FALSE WHERE lifetime_lock = TRUE;
