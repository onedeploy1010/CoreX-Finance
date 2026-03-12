-- Monthly finance analytics for admin dashboard
-- Provides monthly breakdown + forecast for withdrawal pressure analysis

CREATE OR REPLACE FUNCTION admin_finance_monthly()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    -- Monthly deposits (investments)
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
    -- Monthly reward payouts by type
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
        GROUP BY to_char(created_at, 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
      ) d
    ),
    -- Monthly withdrawals
    'monthlyWithdrawals', (
      SELECT COALESCE(json_agg(row_to_json(d) ORDER BY d.month), '[]'::JSON)
      FROM (
        SELECT to_char(created_at, 'YYYY-MM') as month,
               COALESCE(SUM(actual_amount), 0)::TEXT as total,
               COALESCE(SUM(fee), 0)::TEXT as fees,
               COUNT(*)::INT as count
        FROM withdrawals
        WHERE status != 'rejected'
        GROUP BY to_char(created_at, 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
      ) d
    ),
    -- Active order breakdown for forecast
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
        -- Orders expiring in next 30/60/90 days
        'expiring30d', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '30 days'),
        'expiring60d', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '60 days'),
        'expiring90d', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '90 days'),
        'expiringAmount30d', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '30 days'),
        'expiringAmount60d', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '60 days'),
        'expiringAmount90d', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active' AND end_date <= NOW() + INTERVAL '90 days')
      )
      FROM orders WHERE status = 'active'
    ),
    -- Pending withdrawal pressure
    'pendingWithdrawals', (
      SELECT json_build_object(
        'count', COUNT(*)::INT,
        'totalAmount', COALESCE(SUM(actual_amount), 0)::TEXT
      )
      FROM withdrawals WHERE status IN ('pending', 'approved')
    ),
    -- Referral reward ratios (for estimating future referral costs)
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
    -- Unrealized earnings (balance available but not withdrawn)
    'unrealizedBalance', (
      SELECT COALESCE(SUM(avail), 0)::TEXT FROM (
        SELECT
          (COALESCE((SELECT SUM(total_earned) FROM orders WHERE wallet_address = m.wallet_address), 0)
           + COALESCE((SELECT SUM(amount) FROM rewards WHERE wallet_address = m.wallet_address), 0)
           - COALESCE((SELECT SUM(amount) FROM withdrawals WHERE wallet_address = m.wallet_address AND status != 'rejected'), 0)
          ) as avail
        FROM members m
      ) sub WHERE avail > 0
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
