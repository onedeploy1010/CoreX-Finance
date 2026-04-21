-- ============================================================
-- 040_audit_fixes.sql
--
-- Consolidated fixes for issues found in the finance audit:
--   #1 unrealizedBalance double-counts daily earnings
--   #2 balance_payment rows pollute withdrawal metrics
--   #3 Reinvest (auto + manual) leaves no history row
--   #4 adminCancelOrder has no refund / audit trail
--   #5 last_earning_date uses CURRENT_DATE (UTC) vs Shanghai tz
--   #6 Equal-level cascade fails to decay v_prev_bonus on skip
--   #7 Team bonus eligibility missing 200U minimum stake
--   #8 create_order_with_balance missing level recheck
--
-- All functions are CREATE OR REPLACE.  No destructive schema changes.
-- ============================================================

-- ============================================================
-- Fix #1 + #2 : admin_finance_monthly
--   - unrealizedBalance now uses rewards-only formula (no double-count)
--   - monthlyWithdrawals excludes balance_payment rows
-- ============================================================
CREATE OR REPLACE FUNCTION admin_finance_monthly()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'monthlyDeposits', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.month), '[]'::JSON)
      FROM (
        SELECT to_char(start_date, 'YYYY-MM') as month,
               COALESCE(SUM(amount), 0)::TEXT as total,
               COUNT(*)::INT as count
        FROM orders
        GROUP BY to_char(start_date, 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
      ) d
    ),
    'monthlyRewards', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.month), '[]'::JSON)
      FROM (
        SELECT to_char(created_at, 'YYYY-MM') as month,
               COALESCE(SUM(CASE WHEN type = 'daily' THEN amount ELSE 0 END), 0)::TEXT as daily_total,
               COALESCE(SUM(CASE WHEN type = 'direct_referral' THEN amount ELSE 0 END), 0)::TEXT as direct_total,
               COALESCE(SUM(CASE WHEN type = 'indirect_referral' THEN amount ELSE 0 END), 0)::TEXT as indirect_total,
               COALESCE(SUM(CASE WHEN type = 'team_bonus' AND (description IS NULL OR description NOT LIKE 'equal-level%') THEN amount ELSE 0 END), 0)::TEXT as team_total,
               COALESCE(SUM(CASE WHEN type = 'team_bonus' AND description LIKE 'equal-level%' THEN amount ELSE 0 END), 0)::TEXT as equal_level_total,
               COALESCE(SUM(amount), 0)::TEXT as all_total
        FROM rewards
        WHERE type <> 'reinvest'
        GROUP BY to_char(created_at, 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
      ) d
    ),
    'monthlyWithdrawals', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.month), '[]'::JSON)
      FROM (
        SELECT to_char(created_at, 'YYYY-MM') as month,
               COALESCE(SUM(actual_amount), 0)::TEXT as total,
               COALESCE(SUM(fee), 0)::TEXT as fees,
               COUNT(*)::INT as count
        FROM withdrawals
        WHERE status != 'rejected'
          AND COALESCE(tx_hash, '') <> 'balance_payment'
        GROUP BY to_char(created_at, 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
      ) d
    ),
    'activeOrders', (
      SELECT json_build_object(
        'count', COUNT(*)::INT,
        'totalAmount', COALESCE(SUM(amount), 0)::TEXT,
        'dailyPayout', COALESCE(SUM(amount * daily_rate / 100), 0)::TEXT,
        'avgDailyRate', COALESCE(AVG(daily_rate), 0)::TEXT,
        'byProduct', (
          SELECT COALESCE(json_agg(row_to_json(p)), '[]'::JSON)
          FROM (
            SELECT product_name,
                   COUNT(*)::INT as count,
                   COALESCE(SUM(amount), 0)::TEXT as total_amount,
                   COALESCE(SUM(amount * daily_rate / 100), 0)::TEXT as daily_payout,
                   daily_rate::TEXT as rate,
                   MIN(end_date)::TEXT as earliest_end,
                   MAX(end_date)::TEXT as latest_end
            FROM orders WHERE status = 'active'
            GROUP BY product_name, daily_rate
            ORDER BY daily_rate
          ) p
        ),
        'expiring30d', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '30 days'),
        'expiring60d', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '60 days'),
        'expiring90d', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '90 days'),
        'expiringAmount30d', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '30 days'),
        'expiringAmount60d', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '60 days'),
        'expiringAmount90d', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '90 days')
      )
      FROM orders WHERE status = 'active'
    ),
    'pendingWithdrawals', (
      SELECT json_build_object(
        'count', COUNT(*)::INT,
        'totalAmount', COALESCE(SUM(actual_amount), 0)::TEXT
      )
      FROM withdrawals
      WHERE status IN ('pending', 'approved')
        AND COALESCE(tx_hash, '') <> 'balance_payment'
    ),
    'rewardRatios', (
      SELECT json_build_object(
        'directToDaily', CASE WHEN COALESCE(SUM(CASE WHEN type = 'daily' THEN amount END), 0) > 0
          THEN (COALESCE(SUM(CASE WHEN type = 'direct_referral' THEN amount END), 0) / SUM(CASE WHEN type = 'daily' THEN amount END))::TEXT
          ELSE '0' END,
        'indirectToDaily', CASE WHEN COALESCE(SUM(CASE WHEN type = 'daily' THEN amount END), 0) > 0
          THEN (COALESCE(SUM(CASE WHEN type = 'indirect_referral' THEN amount END), 0) / SUM(CASE WHEN type = 'daily' THEN amount END))::TEXT
          ELSE '0' END,
        'teamToDaily', CASE WHEN COALESCE(SUM(CASE WHEN type = 'daily' THEN amount END), 0) > 0
          THEN (COALESCE(SUM(CASE WHEN type = 'team_bonus' THEN amount END), 0) / SUM(CASE WHEN type = 'daily' THEN amount END))::TEXT
          ELSE '0' END
      )
      FROM rewards
    ),
    -- FIX: availableBalance = daily + direct + indirect + team + principal_return - on-chain withdrawals
    -- orders.total_earned is cumulative and is ALREADY captured by rewards of type='daily',
    -- so summing both produced a double-count.
    'unrealizedBalance', (
      SELECT COALESCE(SUM(avail), 0)::TEXT FROM (
        SELECT
          (
            COALESCE((SELECT SUM(amount) FROM rewards
                       WHERE wallet_address = m.wallet_address
                         AND type IN ('daily','direct_referral','indirect_referral','team_bonus','principal_return')), 0)
            - COALESCE((SELECT SUM(amount) FROM withdrawals
                         WHERE wallet_address = m.wallet_address AND status != 'rejected'), 0)
          ) as avail
        FROM members m
      ) sub WHERE avail > 0
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- Fix #1 + #2 : admin_withdrawal_forecast
--   - unrealizedBalance now rewards-only (no double-count)
--   - exclude balance_payment from pending pressure
-- ============================================================
CREATE OR REPLACE FUNCTION admin_withdrawal_forecast()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_daily_interest DECIMAL;
  v_daily_direct DECIMAL;
  v_daily_indirect DECIMAL;
  v_daily_team DECIMAL;
  v_daily_equal_level DECIMAL;
  v_root_addr TEXT := '0x0000000000000000000000000000000000000001';
BEGIN
  SELECT COALESCE(SUM(amount * daily_rate / 100), 0) INTO v_daily_interest
  FROM orders WHERE status = 'active' AND amount > 0;

  SELECT COALESCE(SUM(o.amount * o.daily_rate / 100) * 0.10, 0) INTO v_daily_direct
  FROM orders o
  JOIN members m ON m.wallet_address = o.wallet_address
  WHERE o.status = 'active' AND o.amount > 0
    AND m.referrer_address IS NOT NULL
    AND m.referrer_address != v_root_addr
    AND EXISTS (SELECT 1 FROM orders WHERE wallet_address = m.referrer_address AND status = 'active' AND amount > 0);

  SELECT COALESCE(SUM(o.amount * o.daily_rate / 100) * 0.05, 0) INTO v_daily_indirect
  FROM orders o
  JOIN members m ON m.wallet_address = o.wallet_address
  JOIN members m2 ON m2.wallet_address = m.referrer_address
  WHERE o.status = 'active' AND o.amount > 0
    AND m2.referrer_address IS NOT NULL
    AND m2.referrer_address != v_root_addr
    AND EXISTS (SELECT 1 FROM orders WHERE wallet_address = m2.referrer_address AND status = 'active' AND amount > 0);

  SELECT COALESCE(SUM(team_bonus), 0) INTO v_daily_team
  FROM (
    SELECT
      COALESCE((
        WITH RECURSIVE downline AS (
          SELECT wallet_address FROM members WHERE referrer_address = m.wallet_address
          UNION ALL
          SELECT mb.wallet_address FROM members mb JOIN downline d ON mb.referrer_address = d.wallet_address
        )
        SELECT SUM(o.amount) FROM orders o JOIN downline dl ON o.wallet_address = dl.wallet_address WHERE o.status = 'active'
      ), 0)
      * (SELECT COALESCE(MAX(daily_rate), 0) FROM orders WHERE wallet_address = m.wallet_address AND status = 'active' AND amount >= 200) / 100
      * CASE m.level WHEN 1 THEN 8 WHEN 2 THEN 13 WHEN 3 THEN 18 WHEN 4 THEN 22 WHEN 5 THEN 26 WHEN 6 THEN 30 WHEN 7 THEN 33 ELSE 0 END / 100.0
      as team_bonus
    FROM members m
    WHERE m.level >= 1
      AND m.wallet_address != v_root_addr
      AND EXISTS (SELECT 1 FROM orders WHERE wallet_address = m.wallet_address AND status = 'active' AND amount >= 200)
  ) leaders;

  SELECT COALESCE(SUM(equal_bonus), 0) INTO v_daily_equal_level
  FROM (
    SELECT
      CASE WHEN EXISTS (
        SELECT 1 FROM members upline
        WHERE upline.level = m.level
          AND upline.wallet_address != m.wallet_address
          AND upline.wallet_address != v_root_addr
      )
      THEN
        COALESCE((
          WITH RECURSIVE downline AS (
            SELECT wallet_address FROM members WHERE referrer_address = m.wallet_address
            UNION ALL
            SELECT mb.wallet_address FROM members mb JOIN downline d ON mb.referrer_address = d.wallet_address
          )
          SELECT SUM(o.amount) FROM orders o JOIN downline dl ON o.wallet_address = dl.wallet_address WHERE o.status = 'active'
        ), 0)
        * (SELECT COALESCE(MAX(daily_rate), 0) FROM orders WHERE wallet_address = m.wallet_address AND status = 'active' AND amount >= 200) / 100
        * CASE m.level WHEN 1 THEN 8 WHEN 2 THEN 13 WHEN 3 THEN 18 WHEN 4 THEN 22 WHEN 5 THEN 26 WHEN 6 THEN 30 WHEN 7 THEN 33 ELSE 0 END / 100.0
        * 0.10
      ELSE 0
      END as equal_bonus
    FROM members m
    WHERE m.level >= 1
      AND m.wallet_address != v_root_addr
      AND EXISTS (SELECT 1 FROM orders WHERE wallet_address = m.wallet_address AND status = 'active' AND amount >= 200)
  ) eq;

  SELECT json_build_object(
    'dailyInterest', v_daily_interest::TEXT,
    'dailyDirect', v_daily_direct::TEXT,
    'dailyIndirect', v_daily_indirect::TEXT,
    'dailyTeam', v_daily_team::TEXT,
    'dailyEqualLevel', v_daily_equal_level::TEXT,
    'dailyTotal', (v_daily_interest + v_daily_direct + v_daily_indirect + v_daily_team + v_daily_equal_level)::TEXT,
    'activeOrderCount', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active' AND amount > 0),
    'activeStaking', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active' AND amount > 0),
    'expirationByDay', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.exp_date), '[]'::JSON)
      FROM (
        SELECT end_date::DATE::TEXT as exp_date,
          COUNT(*)::INT as order_count,
          COALESCE(SUM(amount), 0)::TEXT as principal,
          json_agg(json_build_object(
            'id', id,
            'wallet', wallet_address,
            'product', product_name,
            'amount', amount::TEXT,
            'rate', daily_rate::TEXT,
            'startDate', start_date::DATE::TEXT,
            'endDate', end_date::DATE::TEXT
          )) as orders
        FROM orders
        WHERE status = 'active' AND amount > 0
        GROUP BY end_date::DATE
        ORDER BY end_date::DATE
      ) d
    ),
    'expirationByMonth', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.month), '[]'::JSON)
      FROM (
        SELECT to_char(end_date, 'YYYY-MM') as month,
          COUNT(*)::INT as order_count,
          COALESCE(SUM(amount), 0)::TEXT as principal
        FROM orders
        WHERE status = 'active' AND amount > 0
        GROUP BY to_char(end_date, 'YYYY-MM')
        ORDER BY month
      ) d
    ),
    'byProduct', (
      SELECT COALESCE(json_agg(row_to_json(p)), '[]'::JSON)
      FROM (
        SELECT product_name as name, daily_rate as rate,
          COUNT(*)::INT as count,
          COALESCE(SUM(amount), 0)::TEXT as staking,
          COALESCE(SUM(amount * daily_rate / 100), 0)::TEXT as daily_payout
        FROM orders WHERE status = 'active' AND amount > 0
        GROUP BY product_name, daily_rate ORDER BY daily_rate
      ) p
    ),
    'pendingWithdrawals', (
      SELECT json_build_object(
        'count', COUNT(*)::INT,
        'totalAmount', COALESCE(SUM(amount), 0)::TEXT
      ) FROM withdrawals
      WHERE status IN ('pending', 'approved')
        AND COALESCE(tx_hash, '') <> 'balance_payment'
    ),
    -- FIX: rewards-only unrealizedBalance (no orders.total_earned double-count)
    'unrealizedBalance', (
      SELECT COALESCE(SUM(avail), 0)::TEXT FROM (
        SELECT (
          COALESCE((SELECT SUM(amount) FROM rewards
                     WHERE wallet_address = m.wallet_address
                       AND type IN ('daily','direct_referral','indirect_referral','team_bonus','principal_return')), 0)
          - COALESCE((SELECT SUM(amount) FROM withdrawals
                       WHERE wallet_address = m.wallet_address AND status != 'rejected'), 0)
        ) as avail FROM members m
        WHERE m.wallet_address != v_root_addr
      ) sub WHERE avail > 0
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- ============================================================
-- Fix #2 : admin_dashboard excludes balance_payment from withdrawal totals
-- ============================================================
CREATE OR REPLACE FUNCTION admin_dashboard()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_today DATE;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;

  SELECT json_build_object(
    'memberCount', (SELECT COUNT(*)::INT FROM members),
    'todayNewMembers', (SELECT COUNT(*)::INT FROM members WHERE (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'orderCount', (SELECT COUNT(*)::INT FROM orders),
    'activeOrderCount', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active'),
    'todayNewOrders', (SELECT COUNT(*)::INT FROM orders WHERE (start_date AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'totalStaking', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active'),
    'todayNewStaking', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE (start_date AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'totalDailyEarnings', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards WHERE type = 'daily'),
    'todayDailyEarnings', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards WHERE type = 'daily'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'totalBonusRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('direct_referral','indirect_referral','team_bonus')),
    'todayBonusRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('direct_referral','indirect_referral','team_bonus')
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'totalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('daily','direct_referral','indirect_referral','team_bonus','principal_return')),
    'todayTotalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('daily','direct_referral','indirect_referral','team_bonus','principal_return')
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    -- FIX: exclude balance_payment from withdrawal totals (on-chain only)
    'totalWithdrawn', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals
      WHERE status = 'completed' AND COALESCE(tx_hash,'') <> 'balance_payment'),
    'withdrawalCount', (SELECT COUNT(*)::INT FROM withdrawals
      WHERE status = 'completed' AND COALESCE(tx_hash,'') <> 'balance_payment'),
    'totalFees', (SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals
      WHERE status = 'completed' AND COALESCE(tx_hash,'') <> 'balance_payment'),
    'todayWithdrawn', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals
      WHERE status = 'completed' AND COALESCE(tx_hash,'') <> 'balance_payment'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'todayWithdrawalCount', (SELECT COUNT(*)::INT FROM withdrawals
      WHERE status = 'completed' AND COALESCE(tx_hash,'') <> 'balance_payment'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'todayWithdrawalFees', (SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals
      WHERE status = 'completed' AND COALESCE(tx_hash,'') <> 'balance_payment'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'pendingWithdrawals', (SELECT json_build_object(
      'count', COUNT(*)::INT,
      'total', COALESCE(SUM(amount), 0)::TEXT
    ) FROM withdrawals WHERE status = 'pending' AND COALESCE(tx_hash,'') <> 'balance_payment'),
    'recentMembers', (SELECT COALESCE(json_agg(row_to_json(m)), '[]'::JSON)
      FROM (SELECT * FROM members ORDER BY created_at DESC LIMIT 7) m),
    'dailyMemberCounts', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD') as date, COUNT(*)::INT as count
            FROM members GROUP BY to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD')
            ORDER BY to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD') LIMIT 30) d),
    'dailyOrderAmounts', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'MM-DD') as date, COALESCE(SUM(amount), 0)::TEXT as total
            FROM orders GROUP BY to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'MM-DD')
            ORDER BY to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'MM-DD') LIMIT 30) d),
    'levelDistribution', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT level, COUNT(*)::INT as count FROM members GROUP BY level ORDER BY level) d)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- Fix #3 + #5 + #8 : reinvest_matured_order
--   - Shanghai date for last_earning_date
--   - write reinvest audit row (amount = 0, type = 'reinvest')
--   - level recheck for buyer + upline chain
-- ============================================================
CREATE OR REPLACE FUNCTION reinvest_matured_order(
  p_wallet_address TEXT,
  p_order_id INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_new_end_date TIMESTAMPTZ;
  v_new_order_id INTEGER;
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
  v_member members%ROWTYPE;
  v_current_addr TEXT;
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
    RAISE EXCEPTION 'Order is not matured (status: %)', v_order.status;
  END IF;

  v_new_end_date := NOW() + (v_order.days || ' days')::INTERVAL;

  INSERT INTO orders (
    wallet_address, product_id, product_name, amount, daily_rate,
    days, start_date, end_date, status, total_earned, last_earning_date,
    tx_hash, reinvested_from_order_id, payment_method
  ) VALUES (
    v_order.wallet_address, v_order.product_id, v_order.product_name,
    v_order.amount, v_order.daily_rate, v_order.days,
    NOW(), v_new_end_date, 'active', 0, v_sh_today,
    NULL, v_order.id, 'balance'
  )
  RETURNING id INTO v_new_order_id;

  UPDATE orders SET status = 'reinvested' WHERE id = p_order_id;

  -- Audit row: neutral-amount reinvest marker so the event appears in history
  INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
  VALUES (
    v_order.wallet_address,
    'reinvest',
    0,
    p_order_id,
    'Manual reinvest: order #' || p_order_id || ' → order #' || v_new_order_id
      || ' (principal: ' || TRIM(TO_CHAR(v_order.amount, 'FM999999999999.99')) || ')'
  );

  -- Level recheck: buyer + upline chain
  PERFORM check_and_upgrade_level(v_order.wallet_address);
  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF FOUND THEN
    v_current_addr := v_member.referrer_address;
    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'oldOrderId', p_order_id,
    'newOrderId', v_new_order_id,
    'amount', v_order.amount::TEXT,
    'days', v_order.days,
    'reinvestedAt', NOW()
  );
END;
$$;

-- ============================================================
-- Fix #3 + #5 : process_matured_reinvestments
--   - Shanghai date for last_earning_date
--   - write reinvest audit row per reinvestment
-- ============================================================
CREATE OR REPLACE FUNCTION process_matured_reinvestments()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_new_end_date TIMESTAMPTZ;
  v_new_order_id INTEGER;
  v_count INTEGER := 0;
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
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
      tx_hash, reinvested_from_order_id, payment_method
    ) VALUES (
      v_order.wallet_address, v_order.product_id, v_order.product_name,
      v_order.amount, v_order.daily_rate, v_order.days,
      NOW(), v_new_end_date, 'active', 0, v_sh_today,
      NULL, v_order.id, 'balance'
    )
    RETURNING id INTO v_new_order_id;

    UPDATE orders SET status = 'reinvested' WHERE id = v_order.id;

    INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
    VALUES (
      v_order.wallet_address,
      'reinvest',
      0,
      v_order.id,
      'Auto-reinvest (24h expired): order #' || v_order.id || ' → order #' || v_new_order_id
        || ' (principal: ' || TRIM(TO_CHAR(v_order.amount, 'FM999999999999.99')) || ')'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- Fix #5 + #8 : create_order_with_balance
--   - Shanghai date for last_earning_date
--   - level recheck for buyer + upline chain after order creation
-- ============================================================
CREATE OR REPLACE FUNCTION create_order_with_balance(
  p_wallet_address TEXT,
  p_product_id INTEGER,
  p_amount DECIMAL,
  p_product_name TEXT,
  p_daily_rate DECIMAL,
  p_days INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_addr TEXT := LOWER(p_wallet_address);
  v_available DECIMAL;
  v_daily_rewards DECIMAL;
  v_total_rewards DECIMAL;
  v_principal_return DECIMAL;
  v_total_withdrawn DECIMAL;
  v_end_date TIMESTAMPTZ;
  v_new_order_id INTEGER;
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
  v_member members%ROWTYPE;
  v_current_addr TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_daily_rewards
  FROM rewards WHERE wallet_address = v_addr AND type = 'daily';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_rewards
  FROM rewards WHERE wallet_address = v_addr
    AND type IN ('direct_referral', 'indirect_referral', 'team_bonus');

  SELECT COALESCE(SUM(amount), 0) INTO v_principal_return
  FROM rewards WHERE wallet_address = v_addr AND type = 'principal_return';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn
  FROM withdrawals WHERE wallet_address = v_addr AND status != 'rejected';

  v_available := v_daily_rewards + v_total_rewards + v_principal_return - v_total_withdrawn;

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Insufficient balance: available=%, requested=%', v_available, p_amount;
  END IF;

  INSERT INTO withdrawals (wallet_address, amount, fee, actual_amount, status, tx_hash)
  VALUES (v_addr, p_amount, 0, p_amount, 'completed', 'balance_payment');

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (
    wallet_address, product_id, product_name, amount, daily_rate,
    days, start_date, end_date, status, total_earned, last_earning_date,
    tx_hash, payment_method
  ) VALUES (
    v_addr, p_product_id, p_product_name, p_amount, p_daily_rate,
    p_days, NOW(), v_end_date, 'active', 0, v_sh_today,
    NULL, 'balance'
  )
  RETURNING id INTO v_new_order_id;

  -- Level recheck: buyer + upline chain
  PERFORM check_and_upgrade_level(v_addr);
  SELECT * INTO v_member FROM members WHERE wallet_address = v_addr;
  IF FOUND THEN
    v_current_addr := v_member.referrer_address;
    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'orderId', v_new_order_id,
    'amount', p_amount::TEXT,
    'paymentMethod', 'balance',
    'remainingBalance', (v_available - p_amount)::TEXT
  );
END;
$$;

-- ============================================================
-- Fix #5 : admin_create_order -- use Shanghai date for last_earning_date
-- ============================================================
CREATE OR REPLACE FUNCTION admin_create_order(
  p_admin_id INTEGER,
  p_wallet_address TEXT,
  p_product_id INTEGER,
  p_amount DECIMAL,
  p_product_name TEXT,
  p_daily_rate DECIMAL,
  p_days INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id INTEGER;
  v_end_date TIMESTAMPTZ;
  v_admin_exists BOOLEAN;
  v_current_addr TEXT;
  v_member members%ROWTYPE;
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
BEGIN
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE id = p_admin_id) INTO v_admin_exists;
  IF NOT v_admin_exists THEN
    RAISE EXCEPTION 'Unauthorized: invalid admin';
  END IF;

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, tx_hash, last_earning_date)
  VALUES (LOWER(p_wallet_address), p_product_id, p_product_name, p_amount, p_daily_rate, p_days, v_end_date, NULL, v_sh_today)
  RETURNING id INTO v_order_id;

  PERFORM check_and_upgrade_level(LOWER(p_wallet_address));

  SELECT * INTO v_member FROM members WHERE wallet_address = LOWER(p_wallet_address);
  IF FOUND THEN
    v_current_addr := v_member.referrer_address;
    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_order(INTEGER, TEXT, INTEGER, DECIMAL, TEXT, DECIMAL, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION admin_create_order(INTEGER, TEXT, INTEGER, DECIMAL, TEXT, DECIMAL, INTEGER) TO service_role;

-- ============================================================
-- Fix #5 : create_order_from_tx -- use Shanghai date for last_earning_date
-- ============================================================
CREATE OR REPLACE FUNCTION create_order_from_tx(
  p_wallet_address TEXT,
  p_product_id INTEGER,
  p_amount TEXT,
  p_tx_hash TEXT,
  p_product_name TEXT,
  p_daily_rate TEXT,
  p_days INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id INTEGER;
  v_end_date TIMESTAMPTZ;
  v_current_addr TEXT;
  v_member members%ROWTYPE;
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE tx_hash = p_tx_hash) THEN
    RAISE EXCEPTION 'Transaction already processed';
  END IF;

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, tx_hash, last_earning_date)
  VALUES (LOWER(p_wallet_address), p_product_id, p_product_name, p_amount::DECIMAL, p_daily_rate::DECIMAL, p_days, v_end_date, p_tx_hash, v_sh_today)
  RETURNING id INTO v_order_id;

  PERFORM check_and_upgrade_level(LOWER(p_wallet_address));

  SELECT * INTO v_member FROM members WHERE wallet_address = LOWER(p_wallet_address);
  IF FOUND THEN
    v_current_addr := v_member.referrer_address;
    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_from_tx(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER) TO service_role;

-- ============================================================
-- Fix #4 : admin_cancel_order_refund
--   Replaces direct UPDATE with a validated RPC that:
--     - requires an admin session id
--     - optionally refunds principal as principal_return (default: refund)
--     - writes an admin_logs row
--     - rechecks levels for buyer + uplines
-- ============================================================
CREATE OR REPLACE FUNCTION admin_cancel_order_refund(
  p_admin_id INTEGER,
  p_order_id INTEGER,
  p_refund BOOLEAN DEFAULT TRUE,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin admin_users%ROWTYPE;
  v_order orders%ROWTYPE;
  v_member members%ROWTYPE;
  v_current_addr TEXT;
  v_refunded BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_admin FROM admin_users WHERE id = p_admin_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: invalid admin';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status NOT IN ('active', 'matured') THEN
    RAISE EXCEPTION 'Order cannot be cancelled (status: %)', v_order.status;
  END IF;

  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;

  IF p_refund AND v_order.amount > 0 THEN
    INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
    VALUES (
      v_order.wallet_address,
      'principal_return',
      v_order.amount,
      p_order_id,
      'Admin cancel refund: order #' || p_order_id
        || CASE WHEN p_reason IS NOT NULL THEN ' — ' || p_reason ELSE '' END
    );
    v_refunded := TRUE;
  END IF;

  INSERT INTO admin_logs (admin_id, admin_username, admin_role, action, target_type, target_id, detail)
  VALUES (
    v_admin.id, v_admin.username, v_admin.role,
    'cancel_order',
    'order',
    p_order_id::TEXT,
    jsonb_build_object(
      'walletAddress', v_order.wallet_address,
      'amount', v_order.amount::TEXT,
      'previousStatus', v_order.status,
      'refunded', v_refunded,
      'reason', p_reason
    )
  );

  PERFORM check_and_upgrade_level(v_order.wallet_address);
  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF FOUND THEN
    v_current_addr := v_member.referrer_address;
    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'orderId', p_order_id,
    'previousStatus', v_order.status,
    'refunded', v_refunded,
    'refundAmount', CASE WHEN v_refunded THEN v_order.amount::TEXT ELSE '0' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_cancel_order_refund(INTEGER, INTEGER, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_cancel_order_refund(INTEGER, INTEGER, BOOLEAN, TEXT) TO service_role;

-- ============================================================
-- Fix #6 + #7 : process_team_bonuses_daily
--   - equal-level cascade decays v_prev_bonus at every same-level upline,
--     regardless of whether they have an active investment
--     (so a skipped same-level ancestor still advances the cascade)
--   - team bonus eligibility raised from amount > 0 to amount >= 200
--     (the same "effective stake" threshold used by level qualification)
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
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.wallet_address = m.wallet_address
          AND o.status = 'active'
          AND o.amount >= 200
      )
  LOOP
    IF EXISTS (
      SELECT 1 FROM rewards
      WHERE wallet_address = v_leader.wallet_address
        AND type = 'team_bonus'
        AND description NOT LIKE 'equal-level%'
        AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE
    ) THEN
      CONTINUE;
    END IF;

    SELECT MAX(daily_rate) INTO v_highest_rate
    FROM orders
    WHERE wallet_address = v_leader.wallet_address
      AND status = 'active'
      AND amount >= 200;

    IF v_highest_rate IS NULL OR v_highest_rate <= 0 THEN
      CONTINUE;
    END IF;

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

      -- Equal-level cascade: walk up, decaying v_prev_bonus by 10% at every
      -- same-level ancestor whether or not they have an active investment.
      -- Only activated uplines actually receive a reward row, but the decay
      -- is applied consistently so the cascade yield matches the intent.
      v_prev_bonus := v_team_reward;
      v_current_addr := v_leader.referrer_address;
      v_equal_count := 0;

      WHILE v_current_addr IS NOT NULL AND v_equal_count < 3 LOOP
        SELECT * INTO v_upline FROM members WHERE wallet_address = v_current_addr;
        IF NOT FOUND THEN EXIT; END IF;

        IF v_upline.level = v_leader.level THEN
          v_equal_bonus := v_prev_bonus * 10 / 100;
          IF v_equal_bonus <= 0 THEN EXIT; END IF;

          v_equal_count := v_equal_count + 1;

          SELECT EXISTS (
            SELECT 1 FROM orders
            WHERE wallet_address = v_upline.wallet_address
              AND status = 'active'
              AND amount >= 200
          ) INTO v_upline_has_investment;

          IF v_upline_has_investment THEN
            INSERT INTO rewards (wallet_address, type, amount, from_address, description)
            VALUES (v_upline.wallet_address, 'team_bonus', v_equal_bonus,
                    v_leader.wallet_address,
                    'equal-level|' || v_equal_count || '|from:' || LEFT(v_leader.wallet_address, 6) || '...|' || ROUND(v_prev_bonus, 4) || 'x10%');
          END IF;

          -- Decay regardless of activation so the cascade can't be gamed by
          -- parking an unactivated same-level account in the middle.
          v_prev_bonus := v_equal_bonus;
        END IF;

        v_current_addr := v_upline.referrer_address;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- End of 040_audit_fixes.sql
-- ============================================================
