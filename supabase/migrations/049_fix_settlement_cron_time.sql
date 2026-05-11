-- ============================================================
-- 049: Fix settlement cron time + historical run diagnostic
--
-- Migration 048 rescheduled process-daily-settlement assuming
-- settlement_hour stored a Shanghai-local hour, so it subtracted 8
-- to derive UTC. In reality update_settlement_time stores the
-- already-converted UTC hour. The result: cron = "0 8 * * *" (UTC
-- 08:00 = SGT 16:00) instead of the intended SGT 00:00. This rewrites
-- the schedule to the correct UTC 16:00.
--
-- Also adds admin_process_daily_history(limit) which scans
-- cron.job_run_details by command (so it still finds runs after the
-- job was unscheduled and re-created with a new jobid), to help RCA
-- why the original cron stopped firing.
-- ============================================================

DO $$
DECLARE
  v_utc_hour INTEGER;
  v_minute INTEGER;
  v_cron_expr TEXT;
BEGIN
  -- settlement_hour is stored as UTC (set by update_settlement_time
  -- after subtracting tz_offset). Use it as-is.
  SELECT COALESCE(value::INTEGER, 16) INTO v_utc_hour FROM system_settings WHERE key = 'settlement_hour';
  SELECT COALESCE(value::INTEGER, 0)  INTO v_minute   FROM system_settings WHERE key = 'settlement_minute';

  v_cron_expr := v_minute || ' ' || v_utc_hour || ' * * *';

  PERFORM cron.unschedule('process-daily-settlement') FROM cron.job WHERE jobname = 'process-daily-settlement';
  PERFORM cron.schedule('process-daily-settlement', v_cron_expr, 'SELECT process_daily()');

  RAISE NOTICE 'process-daily-settlement rescheduled at % (UTC)', v_cron_expr;
END;
$$;

-- ------------------------------------------------------------
-- Historical settlement runs — searches by command so it surfaces
-- runs from previous jobids (unscheduling deletes from cron.job but
-- leaves cron.job_run_details rows behind).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_process_daily_history(p_limit INTEGER DEFAULT 30)
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
        d.jobid,
        COALESCE(j.jobname, '(unscheduled)') AS jobname,
        d.status,
        d.return_message,
        to_char(d.start_time AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS') AS start_time_cn,
        ROUND(EXTRACT(EPOCH FROM (d.end_time - d.start_time)) * 1000) AS duration_ms
      FROM cron.job_run_details d
      LEFT JOIN cron.job j ON j.jobid = d.jobid
      WHERE d.command ILIKE '%process_daily%'
      ORDER BY d.start_time DESC
      LIMIT p_limit
    ) r
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_process_daily_history(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION admin_process_daily_history(INTEGER) TO service_role;
