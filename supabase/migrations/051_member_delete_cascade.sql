-- ============================================================
-- 051_member_delete_cascade.sql
-- Admin "delete member" feature.
--
-- Adds foreign keys with ON DELETE CASCADE so removing a member
-- automatically cleans up everything that references it:
--   - members.referrer_address (self-ref) -> CASCADE
--       deleting a member recursively deletes its whole downline,
--       which powers the "delete umbrella" mode.
--   - orders / rewards / withdrawals (wallet_address) -> CASCADE
--   - messages.target_address -> CASCADE (targeted messages removed)
--   - rewards.from_address -> SET NULL (preserve surviving members'
--       reward rows; just drop the dangling source pointer)
--
-- Pre-checked on production data (440 members / 33.7k rewards / 990
-- withdrawals / 323 orders): zero orphans, all lowercase, so the
-- constraints apply cleanly with no data cleanup needed.
-- ============================================================

-- ---- Foreign keys (idempotent: drop-if-exists then add) ----

ALTER TABLE members      DROP CONSTRAINT IF EXISTS fk_members_referrer;
ALTER TABLE members      ADD  CONSTRAINT fk_members_referrer
  FOREIGN KEY (referrer_address) REFERENCES members(wallet_address) ON DELETE CASCADE;

ALTER TABLE orders       DROP CONSTRAINT IF EXISTS fk_orders_member;
ALTER TABLE orders       ADD  CONSTRAINT fk_orders_member
  FOREIGN KEY (wallet_address) REFERENCES members(wallet_address) ON DELETE CASCADE;

ALTER TABLE rewards      DROP CONSTRAINT IF EXISTS fk_rewards_member;
ALTER TABLE rewards      ADD  CONSTRAINT fk_rewards_member
  FOREIGN KEY (wallet_address) REFERENCES members(wallet_address) ON DELETE CASCADE;

ALTER TABLE rewards      DROP CONSTRAINT IF EXISTS fk_rewards_from;
ALTER TABLE rewards      ADD  CONSTRAINT fk_rewards_from
  FOREIGN KEY (from_address) REFERENCES members(wallet_address) ON DELETE SET NULL;

ALTER TABLE withdrawals  DROP CONSTRAINT IF EXISTS fk_withdrawals_member;
ALTER TABLE withdrawals  ADD  CONSTRAINT fk_withdrawals_member
  FOREIGN KEY (wallet_address) REFERENCES members(wallet_address) ON DELETE CASCADE;

ALTER TABLE messages     DROP CONSTRAINT IF EXISTS fk_messages_target;
ALTER TABLE messages     ADD  CONSTRAINT fk_messages_target
  FOREIGN KEY (target_address) REFERENCES members(wallet_address) ON DELETE CASCADE;

-- ============================================================
-- Preview: what a deletion would affect (used by the admin dialog)
-- ============================================================
CREATE OR REPLACE FUNCTION admin_member_delete_preview(p_wallet_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_addr   TEXT := lower(p_wallet_address);
  v_upline TEXT;
  v_direct INTEGER;
  v_total  INTEGER;
BEGIN
  SELECT referrer_address INTO v_upline FROM members WHERE wallet_address = v_addr;
  IF NOT FOUND THEN
    RETURN json_build_object('exists', false);
  END IF;

  SELECT count(*) INTO v_direct FROM members WHERE referrer_address = v_addr;

  WITH RECURSIVE tree AS (
    SELECT wallet_address FROM members WHERE wallet_address = v_addr
    UNION ALL
    SELECT m.wallet_address FROM members m JOIN tree t ON m.referrer_address = t.wallet_address
  )
  SELECT count(*) INTO v_total FROM tree;

  RETURN json_build_object(
    'exists', true,
    'wallet', v_addr,
    'upline', v_upline,            -- NULL if this member is a root
    'direct_count', v_direct,      -- direct downline that would be rebound (single mode)
    'umbrella_total', v_total,     -- accounts deleted in umbrella mode (includes self)
    'umbrella_others', v_total - 1 -- downline accounts excluding self
  );
END;
$$;

-- ============================================================
-- Delete a SINGLE account: rebind its direct downline to its upline,
-- then delete it (its own orders/rewards/withdrawals cascade away).
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_member_single(p_wallet_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_addr    TEXT := lower(p_wallet_address);
  v_upline  TEXT;
  v_rebound INTEGER;
  v_cursor  TEXT;
BEGIN
  SELECT referrer_address INTO v_upline FROM members WHERE wallet_address = v_addr;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found: %', v_addr;
  END IF;

  -- Rebind direct downline to the deleted member's upline (NULL => become roots).
  -- Done BEFORE delete so the self-ref cascade does not touch them.
  UPDATE members SET referrer_address = v_upline WHERE referrer_address = v_addr;
  GET DIAGNOSTICS v_rebound = ROW_COUNT;

  -- Delete the member; FK cascade removes its orders/rewards/withdrawals
  -- and any targeted messages. rewards.from_address pointers are nulled.
  DELETE FROM members WHERE wallet_address = v_addr;

  -- Team shrank by one account -> recompute levels up the upline chain.
  v_cursor := v_upline;
  WHILE v_cursor IS NOT NULL LOOP
    PERFORM check_and_upgrade_level(v_cursor);
    SELECT referrer_address INTO v_cursor FROM members WHERE wallet_address = v_cursor;
  END LOOP;

  RETURN json_build_object('deleted', v_addr, 'rebound_to', v_upline, 'rebound_count', v_rebound);
END;
$$;

-- ============================================================
-- Delete an account AND its entire umbrella (downline tree).
-- The self-referencing FK cascade removes the whole subtree, and each
-- per-table FK cascade removes their orders/rewards/withdrawals.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_member_with_downline(p_wallet_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_addr   TEXT := lower(p_wallet_address);
  v_upline TEXT;
  v_total  INTEGER;
  v_cursor TEXT;
BEGIN
  SELECT referrer_address INTO v_upline FROM members WHERE wallet_address = v_addr;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found: %', v_addr;
  END IF;

  WITH RECURSIVE tree AS (
    SELECT wallet_address FROM members WHERE wallet_address = v_addr
    UNION ALL
    SELECT m.wallet_address FROM members m JOIN tree t ON m.referrer_address = t.wallet_address
  )
  SELECT count(*) INTO v_total FROM tree;

  -- Deleting the root cascades the whole subtree + all their data.
  DELETE FROM members WHERE wallet_address = v_addr;

  -- Recompute levels up the surviving upline chain.
  v_cursor := v_upline;
  WHILE v_cursor IS NOT NULL LOOP
    PERFORM check_and_upgrade_level(v_cursor);
    SELECT referrer_address INTO v_cursor FROM members WHERE wallet_address = v_cursor;
  END LOOP;

  RETURN json_build_object('deleted_root', v_addr, 'deleted_total', v_total, 'upline', v_upline);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_member_delete_preview(TEXT)      TO anon;
GRANT EXECUTE ON FUNCTION admin_member_delete_preview(TEXT)      TO service_role;
GRANT EXECUTE ON FUNCTION admin_delete_member_single(TEXT)       TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_member_single(TEXT)       TO service_role;
GRANT EXECUTE ON FUNCTION admin_delete_member_with_downline(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_delete_member_with_downline(TEXT) TO service_role;
