-- ============================================================
-- 041_deposit_categorization_and_range_stats.sql
--
-- Admin-side分类 & 区间统计：
--
--   订单来源分类（3 类）：
--     1) on_chain  — payment_method='on_chain' 且 reinvested_from_order_id IS NULL
--                    (真实 USDT 链上入金)
--     2) balance   — payment_method='balance'  且 reinvested_from_order_id IS NULL
--                    (余额购买新订单)
--     3) reinvest  — reinvested_from_order_id IS NOT NULL
--                    (到期自动/手动复投，不视为新入金)
--
--   "总入金" = 仅 on_chain 类。
--
-- 变更：
--   * admin_dashboard()         — 拆分 totalDeposits → onChainDeposits / balanceDeposits / reinvestDeposits
--                                  + 今日同三类
--   * admin_finance()           — 拆分三类 + depositsByDate 返回每类分列
--   * admin_finance_monthly()   — monthlyDeposits 追加三类分列
--   * admin_date_range_stats()  — 新 RPC，按日期区间返回订单三类 + 提现
-- ============================================================

-- ============================================================
-- admin_dashboard : 拆分总入金 + 保留原字段向后兼容
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
    'totalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('daily','direct_referral','indirect_referral','team_bonus','principal_return')),
    'todayTotalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('daily','direct_referral','indirect_referral','team_bonus','principal_return')
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = v_today),

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
    -- 每日质押金额拆 3 类
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

-- ============================================================
-- admin_finance : overview 分类总览 + depositsByDate 每日分列
-- ============================================================
CREATE OR REPLACE FUNCTION admin_finance()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    -- 总入金 = 仅 on_chain 类（真实 USDT 入金）
    'totalDeposits', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
      WHERE payment_method = 'on_chain' AND reinvested_from_order_id IS NULL
    ),
    'totalDepositCount', (
      SELECT COUNT(*)::INT FROM orders
      WHERE payment_method = 'on_chain' AND reinvested_from_order_id IS NULL
    ),
    -- 分类明细
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

    'totalWithdrawn', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
    ),
    'totalWithdrawnCount', (
      SELECT COUNT(*)::INT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
    ),
    'totalFees', (
      SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
    ),
    'totalActualPaid', (
      SELECT COALESCE(SUM(actual_amount), 0)::TEXT FROM withdrawals
      WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
    ),

    'totalEarned', (SELECT COALESCE(SUM(total_earned), 0)::TEXT FROM orders),
    'totalRewards', (
      SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards
      WHERE type IN ('daily','direct_referral','indirect_referral','team_bonus','principal_return')
    ),
    'activeStaking', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active'),

    -- 净余额 = 真实入金 − 链上提现（不含余额投资 / 复投）
    'netBalance', (
      (SELECT COALESCE(SUM(amount), 0) FROM orders
         WHERE payment_method = 'on_chain' AND reinvested_from_order_id IS NULL)
      - (SELECT COALESCE(SUM(amount), 0) FROM withdrawals
         WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment')
    )::TEXT,

    -- 每日入金：三类分列
    'depositsByDate', (SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.date), '[]'::JSON)
      FROM (
        SELECT to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') as date,
          COALESCE(SUM(CASE WHEN payment_method='on_chain' AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS on_chain,
          COALESCE(SUM(CASE WHEN payment_method='balance'  AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS balance,
          COALESCE(SUM(CASE WHEN reinvested_from_order_id IS NOT NULL THEN amount ELSE 0 END), 0)::TEXT AS reinvest,
          COUNT(*) FILTER (WHERE payment_method='on_chain' AND reinvested_from_order_id IS NULL)::INT AS on_chain_count,
          COUNT(*) FILTER (WHERE payment_method='balance'  AND reinvested_from_order_id IS NULL)::INT AS balance_count,
          COUNT(*) FILTER (WHERE reinvested_from_order_id IS NOT NULL)::INT AS reinvest_count,
          -- 兼容老字段：total = 真实入金
          COALESCE(SUM(CASE WHEN payment_method='on_chain' AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS total,
          COUNT(*) FILTER (WHERE payment_method='on_chain' AND reinvested_from_order_id IS NULL)::INT AS count
        FROM orders
        GROUP BY to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD')
        ORDER BY 1 DESC LIMIT 30
      ) d),

    'withdrawalsByDate', (SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.date), '[]'::JSON)
      FROM (
        SELECT to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') as date,
          COALESCE(SUM(amount), 0)::TEXT as total,
          COUNT(*)::INT as count
        FROM withdrawals
        WHERE status != 'rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
        GROUP BY to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD')
        ORDER BY 1 DESC LIMIT 30
      ) d)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- admin_finance_monthly : monthlyDeposits 追加三类分列
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
        SELECT to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM') as month,
               -- 仅真实入金作为"total"（月度利润计算口径）
               COALESCE(SUM(CASE WHEN payment_method='on_chain' AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS total,
               COUNT(*) FILTER (WHERE payment_method='on_chain' AND reinvested_from_order_id IS NULL)::INT AS count,
               COALESCE(SUM(CASE WHEN payment_method='on_chain' AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS on_chain_total,
               COUNT(*) FILTER (WHERE payment_method='on_chain' AND reinvested_from_order_id IS NULL)::INT AS on_chain_count,
               COALESCE(SUM(CASE WHEN payment_method='balance'  AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS balance_total,
               COUNT(*) FILTER (WHERE payment_method='balance'  AND reinvested_from_order_id IS NULL)::INT AS balance_count,
               COALESCE(SUM(CASE WHEN reinvested_from_order_id IS NOT NULL THEN amount ELSE 0 END), 0)::TEXT AS reinvest_total,
               COUNT(*) FILTER (WHERE reinvested_from_order_id IS NOT NULL)::INT AS reinvest_count
        FROM orders
        GROUP BY to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
      ) d
    ),
    'monthlyRewards', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.month), '[]'::JSON)
      FROM (
        SELECT to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM') as month,
               COALESCE(SUM(CASE WHEN type = 'daily' THEN amount ELSE 0 END), 0)::TEXT as daily_total,
               COALESCE(SUM(CASE WHEN type = 'direct_referral' THEN amount ELSE 0 END), 0)::TEXT as direct_total,
               COALESCE(SUM(CASE WHEN type = 'indirect_referral' THEN amount ELSE 0 END), 0)::TEXT as indirect_total,
               COALESCE(SUM(CASE WHEN type = 'team_bonus' AND (description IS NULL OR description NOT LIKE 'equal-level%') THEN amount ELSE 0 END), 0)::TEXT as team_total,
               COALESCE(SUM(CASE WHEN type = 'team_bonus' AND description LIKE 'equal-level%' THEN amount ELSE 0 END), 0)::TEXT as equal_level_total,
               COALESCE(SUM(amount), 0)::TEXT as all_total
        FROM rewards
        WHERE type <> 'reinvest'
        GROUP BY to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
      ) d
    ),
    'monthlyWithdrawals', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.month), '[]'::JSON)
      FROM (
        SELECT to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM') as month,
               COALESCE(SUM(actual_amount), 0)::TEXT as total,
               COALESCE(SUM(fee), 0)::TEXT as fees,
               COUNT(*)::INT as count
        FROM withdrawals
        WHERE status != 'rejected'
          AND COALESCE(tx_hash,'') <> 'balance_payment'
        GROUP BY to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM')
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
-- admin_date_range_stats(p_start, p_end)
--   新 RPC，返回指定日期区间（上海时区）的订单三类 + 提现统计
--   参数为 YYYY-MM-DD 字符串，含边界（闭区间）
-- ============================================================
CREATE OR REPLACE FUNCTION admin_date_range_stats(
  p_start TEXT,
  p_end TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_start DATE;
  v_end DATE;
BEGIN
  v_start := p_start::DATE;
  v_end := p_end::DATE;

  SELECT json_build_object(
    'range', json_build_object('from', v_start, 'to', v_end, 'days', (v_end - v_start + 1)),

    'orders', json_build_object(
      'onChain', json_build_object(
        'count', (SELECT COUNT(*)::INT FROM orders
                  WHERE payment_method='on_chain' AND reinvested_from_order_id IS NULL
                    AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end),
        'amount', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
                   WHERE payment_method='on_chain' AND reinvested_from_order_id IS NULL
                     AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end)
      ),
      'balance', json_build_object(
        'count', (SELECT COUNT(*)::INT FROM orders
                  WHERE payment_method='balance' AND reinvested_from_order_id IS NULL
                    AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end),
        'amount', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
                   WHERE payment_method='balance' AND reinvested_from_order_id IS NULL
                     AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end)
      ),
      'reinvest', json_build_object(
        'count', (SELECT COUNT(*)::INT FROM orders
                  WHERE reinvested_from_order_id IS NOT NULL
                    AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end),
        'amount', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders
                   WHERE reinvested_from_order_id IS NOT NULL
                     AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end)
      ),
      -- 按产品聚合（仅真实入金）
      'byProductOnChain', (
        SELECT COALESCE(json_agg(row_to_json(p) ORDER BY p.amount DESC), '[]'::JSON)
        FROM (
          SELECT product_name AS name,
                 COUNT(*)::INT AS count,
                 COALESCE(SUM(amount), 0)::TEXT AS amount
          FROM orders
          WHERE payment_method='on_chain' AND reinvested_from_order_id IS NULL
            AND (start_date AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end
          GROUP BY product_name
        ) p
      ),
      -- 每日明细（区间内每一天 × 三类）
      'byDay', (
        SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.date), '[]'::JSON)
        FROM (
          SELECT to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') as date,
            COALESCE(SUM(CASE WHEN payment_method='on_chain' AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS on_chain,
            COALESCE(SUM(CASE WHEN payment_method='balance'  AND reinvested_from_order_id IS NULL THEN amount ELSE 0 END), 0)::TEXT AS balance,
            COALESCE(SUM(CASE WHEN reinvested_from_order_id IS NOT NULL THEN amount ELSE 0 END), 0)::TEXT AS reinvest,
            COUNT(*) FILTER (WHERE payment_method='on_chain' AND reinvested_from_order_id IS NULL)::INT AS on_chain_count,
            COUNT(*) FILTER (WHERE payment_method='balance'  AND reinvested_from_order_id IS NULL)::INT AS balance_count,
            COUNT(*) FILTER (WHERE reinvested_from_order_id IS NOT NULL)::INT AS reinvest_count
          FROM orders
          WHERE (start_date AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end
          GROUP BY to_char(start_date AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD')
        ) d
      )
    ),

    'withdrawals', json_build_object(
      'completed', json_build_object(
        'count', (SELECT COUNT(*)::INT FROM withdrawals
                  WHERE status='completed' AND COALESCE(tx_hash,'') <> 'balance_payment'
                    AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end),
        'amount', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals
                   WHERE status='completed' AND COALESCE(tx_hash,'') <> 'balance_payment'
                     AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end),
        'actualAmount', (SELECT COALESCE(SUM(actual_amount), 0)::TEXT FROM withdrawals
                         WHERE status='completed' AND COALESCE(tx_hash,'') <> 'balance_payment'
                           AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end),
        'fees', (SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals
                 WHERE status='completed' AND COALESCE(tx_hash,'') <> 'balance_payment'
                   AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end)
      ),
      'pending', json_build_object(
        'count', (SELECT COUNT(*)::INT FROM withdrawals
                  WHERE status='pending' AND COALESCE(tx_hash,'') <> 'balance_payment'
                    AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end),
        'amount', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals
                   WHERE status='pending' AND COALESCE(tx_hash,'') <> 'balance_payment'
                     AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end)
      ),
      'rejected', json_build_object(
        'count', (SELECT COUNT(*)::INT FROM withdrawals
                  WHERE status='rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
                    AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end),
        'amount', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals
                   WHERE status='rejected' AND COALESCE(tx_hash,'') <> 'balance_payment'
                     AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end)
      ),
      'byDay', (
        SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.date), '[]'::JSON)
        FROM (
          SELECT to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') as date,
            COUNT(*)::INT as count,
            COALESCE(SUM(amount), 0)::TEXT as amount,
            COALESCE(SUM(fee), 0)::TEXT as fees
          FROM withdrawals
          WHERE status = 'completed' AND COALESCE(tx_hash,'') <> 'balance_payment'
            AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE BETWEEN v_start AND v_end
          GROUP BY to_char(created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD')
        ) d
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_date_range_stats(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_date_range_stats(TEXT, TEXT) TO service_role;
