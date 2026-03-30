-- Update admin_dashboard to include today's stats
CREATE OR REPLACE FUNCTION admin_dashboard()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
  v_today_start TIMESTAMPTZ;
BEGIN
  v_today_start := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE::TIMESTAMPTZ AT TIME ZONE 'Asia/Shanghai';

  SELECT json_build_object(
    -- Members
    'memberCount', (SELECT COUNT(*)::INT FROM members),
    'todayNewMembers', (SELECT COUNT(*)::INT FROM members WHERE created_at >= v_today_start),
    -- Orders
    'orderCount', (SELECT COUNT(*)::INT FROM orders),
    'activeOrderCount', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active'),
    'todayNewOrders', (SELECT COUNT(*)::INT FROM orders WHERE start_date >= v_today_start),
    -- Staking
    'totalStaking', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active'),
    'todayNewStaking', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE start_date >= v_today_start),
    -- Daily earnings (interest)
    'totalDailyEarnings', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards WHERE type = 'daily'),
    'todayDailyEarnings', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards WHERE type = 'daily'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE),
    -- Bonus rewards (direct + indirect + team + equal)
    'totalBonusRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards WHERE type != 'daily'),
    -- Total rewards
    'totalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards),
    -- Withdrawals
    'totalWithdrawn', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals WHERE status = 'completed'),
    'withdrawalCount', (SELECT COUNT(*)::INT FROM withdrawals WHERE status = 'completed'),
    'totalFees', (SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals WHERE status = 'completed'),
    'todayWithdrawn', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals WHERE status = 'completed'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE),
    'todayWithdrawalCount', (SELECT COUNT(*)::INT FROM withdrawals WHERE status = 'completed'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE),
    'todayWithdrawalFees', (SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals WHERE status = 'completed'
      AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE),
    -- Pending withdrawals
    'pendingWithdrawals', (SELECT json_build_object(
      'count', COUNT(*)::INT,
      'total', COALESCE(SUM(amount), 0)::TEXT
    ) FROM withdrawals WHERE status = 'pending'),
    -- Charts & lists
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
