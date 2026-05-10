-- ============================================================
-- 046: admin_get_logs gains search/role/date filters,
--      and process_matured_reinvestments now auto-redeems when
--      the single-active-order rule blocks the reinvest.
-- ============================================================

-- ------------------------------------------------------------
-- admin_get_logs with optional filters
--   - p_search   ILIKE on action / admin_username / target_type / target_id
--   - p_role     exact match on admin_role
--   - p_date_from / p_date_to inclusive on created_at (date strings 'YYYY-MM-DD')
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_get_logs(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_logs JSON;
  v_search TEXT := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_role TEXT := NULLIF(TRIM(COALESCE(p_role, '')), '');
  v_from TIMESTAMPTZ := CASE
    WHEN COALESCE(TRIM(p_date_from), '') = '' THEN NULL
    ELSE p_date_from::TIMESTAMPTZ
  END;
  v_to TIMESTAMPTZ := CASE
    WHEN COALESCE(TRIM(p_date_to), '') = '' THEN NULL
    ELSE (p_date_to || 'T23:59:59')::TIMESTAMPTZ
  END;
BEGIN
  v_offset := (p_page - 1) * p_limit;

  SELECT count(*) INTO v_total
  FROM admin_logs
  WHERE (v_search IS NULL
         OR action ILIKE '%' || v_search || '%'
         OR admin_username ILIKE '%' || v_search || '%'
         OR target_type ILIKE '%' || v_search || '%'
         OR target_id ILIKE '%' || v_search || '%')
    AND (v_role IS NULL OR admin_role = v_role)
    AND (v_from IS NULL OR created_at >= v_from)
    AND (v_to IS NULL OR created_at <= v_to);

  SELECT json_agg(t) INTO v_logs FROM (
    SELECT id,
           admin_id   AS "adminId",
           admin_username AS "adminUsername",
           admin_role AS "adminRole",
           action,
           target_type AS "targetType",
           target_id   AS "targetId",
           detail,
           created_at  AS "createdAt"
    FROM admin_logs
    WHERE (v_search IS NULL
           OR action ILIKE '%' || v_search || '%'
           OR admin_username ILIKE '%' || v_search || '%'
           OR target_type ILIKE '%' || v_search || '%'
           OR target_id ILIKE '%' || v_search || '%')
      AND (v_role IS NULL OR admin_role = v_role)
      AND (v_from IS NULL OR created_at >= v_from)
      AND (v_to IS NULL OR created_at <= v_to)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN json_build_object(
    'logs', COALESCE(v_logs, '[]'::json),
    'total', v_total,
    'page', p_page,
    'limit', p_limit
  );
END;
$$;

-- ------------------------------------------------------------
-- process_matured_reinvestments: auto-redeem when rule blocks reinvest
--
-- Previously: if assert_single_active_order raised, the cron skipped
-- the matured order and left it sitting forever. With this change, the
-- cron falls back to redeeming the order (principal_return reward, set
-- status='redeemed') so the user's principal returns to balance and the
-- order doesn't pile up indefinitely.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_matured_reinvestments()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_new_end_date TIMESTAMPTZ;
  v_new_order_id INTEGER;
  v_count INTEGER := 0;
  v_blocked BOOLEAN;
  v_sh_today DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
BEGIN
  FOR v_order IN
    SELECT *
    FROM orders
    WHERE status = 'matured'
      AND COALESCE(matured_at, end_date) + INTERVAL '24 hours' <= NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    v_blocked := FALSE;
    BEGIN
      PERFORM assert_single_active_order(v_order.wallet_address, v_order.product_id);
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'PRODUCT_SINGLE_ACTIVE_ORDER' THEN
        v_blocked := TRUE;
      ELSE
        RAISE;
      END IF;
    END;

    IF v_blocked THEN
      -- Fallback: refund principal so the matured order doesn't linger.
      UPDATE orders SET status = 'redeemed' WHERE id = v_order.id;
      INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
      VALUES (
        v_order.wallet_address,
        'principal_return',
        v_order.amount,
        v_order.id,
        'Auto-redeem (single-active-order rule blocked reinvest): order #' || v_order.id
      );
      v_count := v_count + 1;
      CONTINUE;
    END IF;

    -- Normal auto-reinvest path
    v_new_end_date := NOW() + (v_order.days || ' days')::INTERVAL;

    INSERT INTO orders (
      wallet_address, product_id, product_name, amount, daily_rate,
      days, start_date, end_date, status, total_earned, last_earning_date,
      tx_hash, reinvested_from_order_id, payment_method
    ) VALUES (
      v_order.wallet_address, v_order.product_id, v_order.product_name,
      v_order.amount, v_order.daily_rate, v_order.days,
      NOW(), v_new_end_date, 'active', 0, v_sh_today,
      NULL, v_order.id, 'balance'
    )
    RETURNING id INTO v_new_order_id;

    UPDATE orders SET status = 'reinvested' WHERE id = v_order.id;

    INSERT INTO rewards (wallet_address, type, amount, from_order_id, description)
    VALUES (
      v_order.wallet_address,
      'reinvest',
      0,
      v_order.id,
      'Auto-reinvest (24h expired): order #' || v_order.id || ' → order #' || v_new_order_id
        || ' (principal: ' || TRIM(TO_CHAR(v_order.amount, 'FM999999999999.99')) || ')'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
