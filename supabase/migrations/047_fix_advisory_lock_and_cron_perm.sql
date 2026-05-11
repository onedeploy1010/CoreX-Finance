-- ============================================================
-- 047: Critical fix
--   - assert_single_active_order called pg_advisory_xact_lock(bigint, bigint)
--     which does not exist (two-arg form is (int, int)). Result: ALL
--     orders on a product with single_active_order_per_user = true
--     failed with "function pg_advisory_xact_lock(bigint, bigint) does
--     not exist", and on-chain USDT deposits went orphaned (no row in
--     orders, USDT already left the user's wallet).
--   - admin_cron_history needs SECURITY DEFINER to read cron.* (anon
--     role lacks USAGE on the cron schema), otherwise the SystemHealth
--     page can't show settlement / reconcile run results.
-- ============================================================

CREATE OR REPLACE FUNCTION assert_single_active_order(
  p_wallet_address TEXT,
  p_product_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_addr TEXT := LOWER(p_wallet_address);
  v_flag BOOLEAN;
  v_active_count INTEGER;
BEGIN
  SELECT single_active_order_per_user INTO v_flag
  FROM products WHERE id = p_product_id;
  IF NOT COALESCE(v_flag, FALSE) THEN
    RETURN;
  END IF;

  -- Single-arg bigint form. hashtextextended returns bigint directly
  -- and combines wallet+product into one 64-bit advisory key. The
  -- earlier two-arg form needed (int, int) but we cast to bigint,
  -- which silently fell off both overloads.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('order_guard:' || v_addr || ':' || p_product_id::TEXT, 0)
  );

  SELECT COUNT(*) INTO v_active_count
  FROM orders
  WHERE wallet_address = v_addr
    AND product_id = p_product_id
    AND status = 'active';

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'PRODUCT_SINGLE_ACTIVE_ORDER'
      USING HINT = 'User already has an active order for this product; wait until it matures.';
  END IF;
END;
$$;

-- Make cron history readable by the front end (it was 'permission
-- denied for schema cron' before because anon doesn't have USAGE on
-- cron. The function runs as the migration owner, which does).
CREATE OR REPLACE FUNCTION admin_cron_history()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
    FROM (
      SELECT
        COALESCE(j.jobname, 'job-' || d.jobid) as jobname,
        d.status,
        d.return_message,
        to_char(d.start_time AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS') as start_time_cn,
        ROUND(EXTRACT(EPOCH FROM (d.end_time - d.start_time)) * 1000) as duration_ms
      FROM cron.job_run_details d
      LEFT JOIN cron.job j ON j.jobid = d.jobid
      ORDER BY d.start_time DESC
      LIMIT 20
    ) r
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_cron_history() TO anon;
GRANT EXECUTE ON FUNCTION admin_cron_history() TO authenticated;
