-- ============================================================
-- 044_dashboard_stats_alignment.sql
--
-- 修正 admin_dashboard() 的两处口径偏差：
--
-- 1) 提现累计/今日 — 与 admin_finance() 对齐（使用 status != 'rejected'）。
--    原先只统计 status='completed' 会忽略 pending/approved，导致 Dashboard
--    与 Finance 页两边数字不一致。
--
-- 2) totalRewards / todayTotalRewards — 移除 principal_return。
--    UI 副标题明确写着 "利息+推荐奖励"，本金返还不属于此口径。
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

    -- 分类入金：累计
    'onChainDeposits', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
      WHERE payment_method = 'on_chain' AND reinvested_from_order_id IS NULL
    ),
    'onChainDepositCount', (
      SELECT COUNT(*)::INT FROM orders
      WHERE payment_method = 'on_chain' AND reinvested_from_order_id IS NULL
    ),
    'balanceDeposits', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
      WHERE payment_method = 'balance' AND reinvested_from_order_id IS NULL
    ),
    'balanceDepositCount', (
      SELECT COUNT(*)::INT FROM orders
      WHERE payment_method = 'balance' AND reinvested_from_order_id IS NULL
    ),
    'reinvestDeposits', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
      WHERE reinvested_from_order_id IS NOT NULL
    ),
    'reinvestDepositCount', (
      SELECT COUNT(*)::INT FROM orders
      WHERE reinvested_from_order_id IS NOT NULL
    ),

    -- 分类入金：今日
    'todayOnChainDeposits', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
      WHERE payment_method = 'on_chain' AND reinvested_from_order_id IS NULL
        AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE = v_today
    ),
    'todayOnChainDepositCount', (
      SELECT COUNT(*)::INT FROM orders
      WHERE payment_method = 'on_chain' AND reinvested_from_order_id IS NULL
        AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE = v_today
    ),
    'todayBalanceDeposits', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
      WHERE payment_method = 'balance' AND reinvested_from_order_id IS NULL
        AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE = v_today
    ),
    'todayBalanceDepositCount', (
      SELECT COUNT(*)::INT FROM orders
      WHERE payment_method = 'balance' AND reinvested_from_order_id IS NULL
        AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE = v_today
    ),
    'todayReinvestDeposits', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
      WHERE reinvested_from_order_id IS NOT NULL
        AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE = v_today
    ),
    'todayReinvestDepositCount', (
      SELECT COUNT(*)::INT FROM orders
      WHERE reinvested_from_order_id IS NOT NULL
        AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE = v_today
    ),

    'totalDailyEarnings', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards WHERE type = 'daily'),
    'todayDailyEarnings', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards WHERE type = 'daily'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'totalBonusRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('direct_referral','indirect_referral','team_bonus')),
    'todayBonusRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('direct_referral','indirect_referral','team_bonus')
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),

    -- 「累计/今日发放总额」UI 副标题：利息+推荐奖励 → 不含 principal_return
    'totalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('daily','direct_referral','indirect_referral','team_bonus')),
    'todayTotalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('daily','direct_referral','indirect_referral','team_bonus')
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),

    -- 提现累计/今日 — 与 admin_finance 对齐：含 pending/approved/completed，仅排除 rejected
    'totalWithdrawn', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'),
    'withdrawalCount', (SELECT COUNT(*)::INT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'),
    'totalFees', (SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'),
    'todayWithdrawn', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'todayWithdrawalCount', (SELECT COUNT(*)::INT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),
    'todayWithdrawalFees', (SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
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
      FROM (
        SELECT to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'MM-DD') as date,
          COALESCE(SUM(CASE WHEN payment_method='on_chain' AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS on_chain,
          COALESCE(SUM(CASE WHEN payment_method='balance'  AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS balance,
          COALESCE(SUM(CASE WHEN reinvested_from_order_id IS NOT NULL THEN amount ELSE 0 END), 0)::TEXT AS reinvest,
          COALESCE(SUM(amount), 0)::TEXT AS total
        FROM orders
        GROUP BY to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'MM-DD')
        ORDER BY to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'MM-DD') LIMIT 30
      ) d),
    'levelDistribution', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT level, COUNT(*)::INT as count FROM members GROUP BY level ORDER BY level) d)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
