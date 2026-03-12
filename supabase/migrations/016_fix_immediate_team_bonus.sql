-- Fix: team bonus should only be calculated during daily settlement (process_daily),
-- NOT on every page view via process_wallet_orders.
-- This prevents "earn immediately on invest" for team leaders.

CREATE OR REPLACE FUNCTION process_wallet_orders(p_wallet_address TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Only settle individual orders (daily earnings, referral rewards)
  -- Team bonuses are calculated separately in process_daily() → process_team_bonuses_daily()
  FOR v_order IN SELECT id FROM orders WHERE wallet_address = p_wallet_address AND status = 'active'
  LOOP
    PERFORM settle_order(v_order.id);
  END LOOP;

  PERFORM check_and_upgrade_level(p_wallet_address);
END;
$$;
