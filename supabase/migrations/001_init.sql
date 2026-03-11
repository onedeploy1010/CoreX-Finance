-- ============================================================
-- CoreX Finance - Supabase Database Setup
-- Tables, Functions, Triggers, and Cron Jobs
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  referrer_address TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  lifetime_lock BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_members_wallet ON members(wallet_address);
CREATE INDEX IF NOT EXISTS idx_members_referrer ON members(referrer_address);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  amount DECIMAL(18,6) NOT NULL,
  daily_rate DECIMAL(10,4) NOT NULL,
  days INTEGER NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  total_earned DECIMAL(18,6) NOT NULL DEFAULT 0,
  last_earning_date TIMESTAMPTZ,
  tx_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_wallet ON orders(wallet_address);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS rewards (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(18,6) NOT NULL,
  from_address TEXT,
  from_order_id INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rewards_wallet ON rewards(wallet_address);

CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount DECIMAL(18,6) NOT NULL,
  fee DECIMAL(18,6) NOT NULL DEFAULT 1,
  actual_amount DECIMAL(18,6) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet ON withdrawals(wallet_address);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  target_address TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anon to read/write all tables (since auth is wallet-based, not Supabase auth)
CREATE POLICY "Allow all for anon" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON withdrawals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON admin_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Admin login function with bcrypt
CREATE OR REPLACE FUNCTION admin_login(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin admin_users%ROWTYPE;
  v_token TEXT;
BEGIN
  SELECT * INTO v_admin FROM admin_users WHERE username = p_username;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF NOT (v_admin.password_hash = crypt(p_password, v_admin.password_hash)) THEN
    RETURN NULL;
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  RETURN json_build_object(
    'id', v_admin.id,
    'username', v_admin.username,
    'token', v_token
  );
END;
$$;

-- Insert default admin user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin') THEN
    INSERT INTO admin_users (username, password_hash)
    VALUES ('admin', crypt('admin123', gen_salt('bf')));
  END IF;
END $$;

-- Get team stats recursively
CREATE OR REPLACE FUNCTION get_team_stats(root_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_direct_count INTEGER;
  v_indirect_count INTEGER;
  v_total_accounts INTEGER := 0;
  v_total_staking DECIMAL := 0;
  v_rec RECORD;
BEGIN
  -- Direct count
  SELECT COUNT(*) INTO v_direct_count
  FROM members WHERE referrer_address = root_address;

  -- Get all team members recursively
  WITH RECURSIVE team AS (
    SELECT wallet_address, 1 as depth FROM members WHERE referrer_address = root_address
    UNION ALL
    SELECT m.wallet_address, t.depth + 1 FROM members m
    INNER JOIN team t ON m.referrer_address = t.wallet_address
  )
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE depth = 2) as indirect
  INTO v_total_accounts, v_indirect_count
  FROM team;

  -- Total staking for the team
  WITH RECURSIVE team AS (
    SELECT wallet_address FROM members WHERE referrer_address = root_address
    UNION ALL
    SELECT m.wallet_address FROM members m
    INNER JOIN team t ON m.referrer_address = t.wallet_address
  )
  SELECT COALESCE(SUM(o.amount), 0) INTO v_total_staking
  FROM orders o
  INNER JOIN team t ON o.wallet_address = t.wallet_address
  WHERE o.status = 'active';

  -- Count active staking accounts
  WITH RECURSIVE team AS (
    SELECT wallet_address FROM members WHERE referrer_address = root_address
    UNION ALL
    SELECT m.wallet_address FROM members m
    INNER JOIN team t ON m.referrer_address = t.wallet_address
  )
  SELECT COUNT(DISTINCT t.wallet_address) INTO v_total_accounts
  FROM team t
  INNER JOIN orders o ON o.wallet_address = t.wallet_address AND o.status = 'active';

  RETURN json_build_object(
    'totalAccounts', v_total_accounts,
    'totalStaking', v_total_staking::TEXT,
    'directCount', v_direct_count,
    'indirectCount', v_indirect_count
  );
END;
$$;

-- Settle a single order
CREATE OR REPLACE FUNCTION settle_order(p_order_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_last_date TIMESTAMPTZ;
  v_effective_now TIMESTAMPTZ;
  v_diff_ms BIGINT;
  v_whole_days INTEGER;
  v_daily_earning DECIMAL;
  v_total_new_earning DECIMAL;
  v_new_total DECIMAL;
  v_settle_date TIMESTAMPTZ;
  v_member members%ROWTYPE;
  v_referrer members%ROWTYPE;
  v_referrer2 members%ROWTYPE;
  v_direct_reward DECIMAL;
  v_indirect_reward DECIMAL;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id AND status = 'active';
  IF NOT FOUND THEN RETURN FALSE; END IF;

  v_last_date := COALESCE(v_order.last_earning_date, v_order.start_date);
  v_effective_now := LEAST(v_now, v_order.end_date);

  v_whole_days := EXTRACT(EPOCH FROM (v_effective_now - v_last_date))::BIGINT / 86400;

  IF v_whole_days < 1 THEN
    IF v_now >= v_order.end_date THEN
      UPDATE orders SET status = 'completed' WHERE id = p_order_id;
    END IF;
    RETURN FALSE;
  END IF;

  v_daily_earning := v_order.amount * v_order.daily_rate / 100;
  v_total_new_earning := v_daily_earning * v_whole_days;
  v_new_total := v_order.total_earned + v_total_new_earning;
  v_settle_date := v_last_date + (v_whole_days || ' days')::INTERVAL;

  UPDATE orders SET total_earned = v_new_total, last_earning_date = v_settle_date WHERE id = p_order_id;

  IF v_now >= v_order.end_date THEN
    UPDATE orders SET status = 'completed' WHERE id = p_order_id;
  END IF;

  -- Create daily reward
  INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
  VALUES (v_order.wallet_address, 'daily', v_total_new_earning,
          p_order_id, v_order.product_name || ' daily earnings x' || v_whole_days || ' day(s)');

  -- Direct referral reward (10%)
  SELECT * INTO v_member FROM members WHERE wallet_address = v_order.wallet_address;
  IF v_member.referrer_address IS NOT NULL THEN
    v_direct_reward := v_total_new_earning * 0.10;
    IF v_direct_reward > 0 THEN
      INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
      VALUES (v_member.referrer_address, 'direct_referral', v_direct_reward,
              v_order.wallet_address, p_order_id,
              'Direct referral reward from ' || LEFT(v_order.wallet_address, 6) || '...');
    END IF;

    -- Indirect referral reward (5%)
    SELECT * INTO v_referrer FROM members WHERE wallet_address = v_member.referrer_address;
    IF v_referrer.referrer_address IS NOT NULL THEN
      v_indirect_reward := v_total_new_earning * 0.05;
      IF v_indirect_reward > 0 THEN
        INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
        VALUES (v_referrer.referrer_address, 'indirect_referral', v_indirect_reward,
                v_order.wallet_address, p_order_id,
                'Indirect referral reward from ' || LEFT(v_order.wallet_address, 6) || '...');
      END IF;
    END IF;
  END IF;

  -- Team and equal-level bonuses
  PERFORM process_team_bonus(p_order_id, v_total_new_earning);

  RETURN TRUE;
END;
$$;

-- Process team and equal-level bonuses
CREATE OR REPLACE FUNCTION process_team_bonus(p_order_id INTEGER, p_earning DECIMAL)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_current members%ROWTYPE;
  v_leader members%ROWTYPE;
  v_prev_level INTEGER := -1;
  v_bonus_rate INTEGER;
  v_team_reward DECIMAL;
  v_equal_bonus DECIMAL;
  v_level_configs INTEGER[] := ARRAY[0, 8, 13, 18, 22, 26, 30, 33]; -- bonus rates per level
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  SELECT * INTO v_current FROM members WHERE wallet_address = v_order.wallet_address;

  WHILE v_current.referrer_address IS NOT NULL LOOP
    SELECT * INTO v_leader FROM members WHERE wallet_address = v_current.referrer_address;
    IF NOT FOUND OR v_leader.level < 1 THEN
      v_current := v_leader;
      CONTINUE;
    END IF;

    v_bonus_rate := v_level_configs[v_leader.level + 1]; -- +1 because arrays are 1-indexed

    IF v_prev_level >= 0 AND v_prev_level >= v_leader.level THEN
      v_bonus_rate := 0;
    END IF;

    IF v_bonus_rate > 0 THEN
      v_team_reward := p_earning * v_bonus_rate / 100;
      IF v_team_reward > 0 THEN
        INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
        VALUES (v_leader.wallet_address, 'team_bonus', v_team_reward,
                v_order.wallet_address, p_order_id,
                'V' || v_leader.level || ' team bonus ' || v_bonus_rate || '%');
      END IF;
    END IF;

    -- Equal-level bonus (10%)
    IF v_prev_level >= 1 AND v_leader.level = v_prev_level THEN
      v_equal_bonus := p_earning * 10 / 100;
      IF v_equal_bonus > 0 THEN
        INSERT INTO rewards (wallet_address, type, amount, from_address, from_order_id, description)
        VALUES (v_leader.wallet_address, 'team_bonus', v_equal_bonus,
                v_order.wallet_address, p_order_id,
                'V' || v_leader.level || ' equal-level bonus 10%');
      END IF;
    END IF;

    IF v_leader.level > v_prev_level THEN
      v_prev_level := v_leader.level;
    END IF;

    v_current := v_leader;
  END LOOP;
END;
$$;

-- Process all orders for a specific wallet
CREATE OR REPLACE FUNCTION process_wallet_orders(p_wallet_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN SELECT id FROM orders WHERE wallet_address = p_wallet_address AND status = 'active'
  LOOP
    PERFORM settle_order(v_order.id);
  END LOOP;

  PERFORM check_and_upgrade_level(p_wallet_address);
END;
$$;

-- Check and upgrade member level
CREATE OR REPLACE FUNCTION check_and_upgrade_level(p_wallet_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_member members%ROWTYPE;
  v_team_count INTEGER;
  v_team_staking DECIMAL;
  v_new_level INTEGER := 0;
  v_sub_count INTEGER;
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

  -- Get team stats
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
        -- Count sub-members at required level
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

  IF v_new_level > v_member.level THEN
    UPDATE members SET level = v_new_level, lifetime_lock = v_lifetime_lock[v_new_level + 1]
    WHERE wallet_address = p_wallet_address;
  END IF;
END;
$$;

-- Process daily settlement (called by cron)
CREATE OR REPLACE FUNCTION process_daily()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_member RECORD;
BEGIN
  -- Settle all active orders
  FOR v_order IN SELECT id FROM orders WHERE status = 'active'
  LOOP
    PERFORM settle_order(v_order.id);
  END LOOP;

  -- Check and upgrade all members
  FOR v_member IN SELECT wallet_address FROM members
  LOOP
    PERFORM check_and_upgrade_level(v_member.wallet_address);
  END LOOP;
END;
$$;

-- Admin dashboard stats
CREATE OR REPLACE FUNCTION admin_dashboard()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'memberCount', (SELECT COUNT(*)::INT FROM members),
    'orderCount', (SELECT COUNT(*)::INT FROM orders),
    'activeOrderCount', (SELECT COUNT(*)::INT FROM orders WHERE status = 'active'),
    'withdrawalCount', (SELECT COUNT(*)::INT FROM withdrawals),
    'totalStaking', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active'),
    'totalEarned', (SELECT COALESCE(SUM(total_earned), 0)::TEXT FROM orders),
    'totalWithdrawn', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM withdrawals WHERE status != 'rejected'),
    'totalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards),
    'pendingWithdrawals', (SELECT json_build_object(
      'count', COUNT(*)::INT,
      'total', COALESCE(SUM(amount), 0)::TEXT
    ) FROM withdrawals WHERE status = 'pending'),
    'completedOrderAmount', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'completed'),
    'recentMembers', (SELECT COALESCE(json_agg(row_to_json(m)), '[]'::JSON)
      FROM (SELECT * FROM members ORDER BY created_at DESC LIMIT 7) m),
    'dailyMemberCounts', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT to_char(created_at, 'MM-DD') as date, COUNT(*)::INT as count
            FROM members GROUP BY to_char(created_at, 'MM-DD')
            ORDER BY to_char(created_at, 'MM-DD') LIMIT 30) d),
    'dailyOrderAmounts', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT to_char(start_date, 'MM-DD') as date, COALESCE(SUM(amount), 0)::TEXT as total
            FROM orders GROUP BY to_char(start_date, 'MM-DD')
            ORDER BY to_char(start_date, 'MM-DD') LIMIT 30) d),
    'levelDistribution', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT level, COUNT(*)::INT as count FROM members GROUP BY level ORDER BY level) d)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Admin finance stats
CREATE OR REPLACE FUNCTION admin_finance()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'totalDeposits', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders),
    'totalDepositCount', (SELECT COUNT(*)::INT FROM orders),
    'totalWithdrawn', (SELECT COALESCE(SUM(actual_amount), 0)::TEXT FROM withdrawals WHERE status != 'rejected'),
    'totalWithdrawnCount', (SELECT COUNT(*)::INT FROM withdrawals WHERE status != 'rejected'),
    'totalFees', (SELECT COALESCE(SUM(fee), 0)::TEXT FROM withdrawals WHERE status != 'rejected'),
    'totalEarned', (SELECT COALESCE(SUM(total_earned), 0)::TEXT FROM orders),
    'totalRewards', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM rewards),
    'activeStaking', (SELECT COALESCE(SUM(amount), 0)::TEXT FROM orders WHERE status = 'active'),
    'netBalance', ((SELECT COALESCE(SUM(amount), 0) FROM orders) - (SELECT COALESCE(SUM(actual_amount), 0) FROM withdrawals WHERE status != 'rejected'))::TEXT,
    'depositsByDate', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT to_char(start_date, 'YYYY-MM-DD') as date, COALESCE(SUM(amount), 0)::TEXT as total, COUNT(*)::INT as count
            FROM orders GROUP BY to_char(start_date, 'YYYY-MM-DD')
            ORDER BY to_char(start_date, 'YYYY-MM-DD') DESC LIMIT 30) d),
    'withdrawalsByDate', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::JSON)
      FROM (SELECT to_char(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(actual_amount), 0)::TEXT as total, COUNT(*)::INT as count
            FROM withdrawals WHERE status != 'rejected'
            GROUP BY to_char(created_at, 'YYYY-MM-DD')
            ORDER BY to_char(created_at, 'YYYY-MM-DD') DESC LIMIT 30) d)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Get earnings for a wallet
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
  SELECT COALESCE(SUM(total_earned), 0) INTO v_total_earnings
  FROM orders WHERE wallet_address = p_wallet_address;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_rewards
  FROM rewards WHERE wallet_address = p_wallet_address;

  SELECT COALESCE(SUM(amount), 0) INTO v_direct_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'direct_referral';

  SELECT COALESCE(SUM(amount), 0) INTO v_indirect_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'indirect_referral';

  SELECT COALESCE(SUM(amount), 0) INTO v_team_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'team_bonus';

  SELECT COALESCE(SUM(amount), 0) INTO v_daily_rewards
  FROM rewards WHERE wallet_address = p_wallet_address AND type = 'daily';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn
  FROM withdrawals WHERE wallet_address = p_wallet_address AND status != 'rejected';

  v_available := v_total_earnings + v_total_rewards - v_total_withdrawn;

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
-- CRON JOB - Process daily settlement every hour
-- ============================================================
-- Note: pg_cron must be enabled in Supabase Dashboard > Database > Extensions
-- Then run:
SELECT cron.schedule(
  'process-daily-settlement',
  '0 * * * *',  -- Every hour
  $$SELECT process_daily()$$
);
