-- Fix:
-- 1. get_team_stats: directCount/indirectCount should only count users WITH deposits (有效用户)
-- 2. Add trigger on orders INSERT to auto-check upline levels (ensure levels always trigger)
-- 3. Recheck all member levels now

-- ============================================================
-- 1. Fix get_team_stats: only count users who have deposited
-- ============================================================
CREATE OR REPLACE FUNCTION get_team_stats(root_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_direct_count INTEGER;
  v_direct_effective INTEGER;
  v_indirect_count INTEGER;
  v_total_accounts INTEGER := 0;
  v_total_staking DECIMAL := 0;
BEGIN
  -- Direct count: only members who have at least one order (deposited)
  SELECT COUNT(*) INTO v_direct_count
  FROM members m
  WHERE m.referrer_address = root_address
    AND EXISTS (SELECT 1 FROM orders o WHERE o.wallet_address = m.wallet_address);

  -- Direct effective: direct members with active staking >= 200
  SELECT COUNT(*) INTO v_direct_effective
  FROM members m
  INNER JOIN (
    SELECT wallet_address, SUM(amount) as total_staking
    FROM orders WHERE status = 'active'
    GROUP BY wallet_address
    HAVING SUM(amount) >= 200
  ) stk ON stk.wallet_address = m.wallet_address
  WHERE m.referrer_address = root_address;

  -- Get all team members recursively - only those who deposited
  WITH RECURSIVE team AS (
    SELECT wallet_address, 1 as depth FROM members WHERE referrer_address = root_address
    UNION ALL
    SELECT m.wallet_address, t.depth + 1 FROM members m
    INNER JOIN team t ON m.referrer_address = t.wallet_address
  )
  SELECT
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM orders o WHERE o.wallet_address = team.wallet_address)),
    COUNT(*) FILTER (WHERE depth = 2 AND EXISTS (SELECT 1 FROM orders o WHERE o.wallet_address = team.wallet_address))
  INTO v_total_accounts, v_indirect_count
  FROM team;

  -- Total staking for the team (active orders only)
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

  RETURN json_build_object(
    'totalAccounts', v_total_accounts,
    'totalStaking', v_total_staking::TEXT,
    'directCount', v_direct_count,
    'directEffective', v_direct_effective,
    'indirectCount', v_indirect_count
  );
END;
$$;

-- ============================================================
-- 2. Trigger: auto-check upline levels when a new order is inserted
--    This ensures levels are always rechecked even if orders are created
--    outside of create_order_from_tx (e.g., manual admin operations)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_check_upline_levels()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_addr TEXT;
BEGIN
  -- Check the buyer's own level
  PERFORM check_and_upgrade_level(NEW.wallet_address);

  -- Walk up referral chain and check each ancestor
  SELECT referrer_address INTO v_current_addr
  FROM members WHERE wallet_address = NEW.wallet_address;

  WHILE v_current_addr IS NOT NULL LOOP
    PERFORM check_and_upgrade_level(v_current_addr);
    SELECT referrer_address INTO v_current_addr
    FROM members WHERE wallet_address = v_current_addr;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop if exists, then create
DROP TRIGGER IF EXISTS trg_order_check_levels ON orders;
CREATE TRIGGER trg_order_check_levels
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_upline_levels();

-- ============================================================
-- 3. Also trigger level recheck when order status changes
--    (e.g., active → completed, which reduces staking and may cause downgrade)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_check_levels_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_addr TEXT;
BEGIN
  IF OLD.status != NEW.status THEN
    PERFORM check_and_upgrade_level(NEW.wallet_address);

    SELECT referrer_address INTO v_current_addr
    FROM members WHERE wallet_address = NEW.wallet_address;

    WHILE v_current_addr IS NOT NULL LOOP
      PERFORM check_and_upgrade_level(v_current_addr);
      SELECT referrer_address INTO v_current_addr
      FROM members WHERE wallet_address = v_current_addr;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_check_levels ON orders;
CREATE TRIGGER trg_order_status_check_levels
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_levels_on_status_change();

-- ============================================================
-- 4. Recheck all member levels now
-- ============================================================
DO $$
DECLARE
  v_member RECORD;
BEGIN
  FOR v_member IN SELECT wallet_address FROM members ORDER BY created_at
  LOOP
    PERFORM check_and_upgrade_level(v_member.wallet_address);
  END LOOP;
END;
$$;
