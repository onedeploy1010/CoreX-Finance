-- Fix: settlement check should only count orders that existed at settlement time
-- Orders created after today's settlement should not be counted as "missing"
CREATE OR REPLACE FUNCTION admin_settlement_check()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_orders INTEGER;
  v_active_orders_at_settlement INTEGER;
  v_today_daily INTEGER;
  v_today_direct INTEGER;
  v_today_indirect INTEGER;
  v_today_team INTEGER;
  v_today_equal INTEGER;
  v_today_daily_sum DECIMAL;
  v_today_team_sum DECIMAL;
  v_last_settlement TIMESTAMPTZ;
  v_today_start TIMESTAMPTZ;
BEGIN
  -- Today's start in Shanghai timezone (= settlement time)
  v_today_start := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE::TIMESTAMPTZ AT TIME ZONE 'Asia/Shanghai';

  -- Total active orders (for display)
  SELECT COUNT(*) INTO v_active_orders FROM orders WHERE status = 'active';

  -- Active orders that existed before today's settlement (should have been settled)
  SELECT COUNT(*) INTO v_active_orders_at_settlement
  FROM orders WHERE status = 'active' AND start_date < v_today_start;

  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_today_daily, v_today_daily_sum
  FROM rewards WHERE type = 'daily'
    AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;

  SELECT COUNT(*) INTO v_today_direct
  FROM rewards WHERE type = 'direct_referral'
    AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;

  SELECT COUNT(*) INTO v_today_indirect
  FROM rewards WHERE type = 'indirect_referral'
    AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;

  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_today_team, v_today_team_sum
  FROM rewards WHERE type = 'team_bonus' AND description NOT LIKE 'equal-level%'
    AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;

  SELECT COUNT(*) INTO v_today_equal
  FROM rewards WHERE type = 'team_bonus' AND description LIKE 'equal-level%'
    AND (created_at AT TIME ZONE 'Asia/Shanghai')::DATE = (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;

  SELECT MAX(created_at) INTO v_last_settlement FROM rewards WHERE type = 'daily';

  RETURN json_build_object(
    'active_orders', v_active_orders,
    'active_orders_at_settlement', v_active_orders_at_settlement,
    'today_settled', v_today_daily > 0,
    'today_daily_count', v_today_daily,
    'today_daily_sum', ROUND(v_today_daily_sum, 6),
    'today_direct_count', v_today_direct,
    'today_indirect_count', v_today_indirect,
    'today_team_count', v_today_team,
    'today_team_sum', ROUND(v_today_team_sum, 6),
    'today_equal_count', v_today_equal,
    'last_settlement', v_last_settlement,
    'daily_history', (
      SELECT json_agg(row_to_json(d) ORDER BY d.cn_date DESC)
      FROM (
        SELECT
          (created_at AT TIME ZONE 'Asia/Shanghai')::DATE as cn_date,
          COUNT(*) FILTER (WHERE type = 'daily') as daily_count,
          ROUND(COALESCE(SUM(amount) FILTER (WHERE type = 'daily'), 0), 6) as daily_sum,
          COUNT(*) FILTER (WHERE type = 'direct_referral') as direct_count,
          COUNT(*) FILTER (WHERE type = 'indirect_referral') as indirect_count,
          COUNT(*) FILTER (WHERE type = 'team_bonus' AND description NOT LIKE 'equal-level%') as team_count,
          COUNT(*) FILTER (WHERE type = 'team_bonus' AND description LIKE 'equal-level%') as equal_count,
          ROUND(COALESCE(SUM(amount), 0), 6) as total_sum
        FROM rewards
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY (created_at AT TIME ZONE 'Asia/Shanghai')::DATE
        ORDER BY cn_date DESC
        LIMIT 7
      ) d
    )
  );
END;
$$;
