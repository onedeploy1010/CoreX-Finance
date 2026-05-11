-- ============================================================
-- 048: Cron diagnostics + settlement reschedule
--
-- Why: `admin_cron_history` limit 20 is dominated by the per-minute
-- chain-reconcile job, so it never surfaces process-daily-settlement
-- entries. We need:
--   - admin_cron_jobs(): list every scheduled job + cron expression,
--     so we can confirm process-daily-settlement is still in cron.job.
--   - admin_cron_history_by_job(jobname, limit): targeted history so
--     we can read the last N runs of a specific job (settlement,
--     reconcile, share growth, etc).
--   - Re-schedule process-daily-settlement defensively using the
--     stored Asia/Shanghai hour/minute from system_settings, in case
--     it was unscheduled at some point. cron.schedule replaces an
--     existing schedule of the same name, so this is safe.
-- ============================================================

-- ------------------------------------------------------------
-- List scheduled cron jobs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_cron_jobs()
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
        j.jobid,
        j.jobname,
        j.schedule,
        j.command,
        j.active,
        (
          SELECT to_char(MAX(d.start_time) AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS')
          FROM cron.job_run_details d
          WHERE d.jobid = j.jobid
        ) AS last_run_cn
      FROM cron.job j
      ORDER BY j.jobname
    ) r
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_cron_jobs() TO anon;
GRANT EXECUTE ON FUNCTION admin_cron_jobs() TO authenticated;

-- ------------------------------------------------------------
-- Filtered cron history
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_cron_history_by_job(
  p_jobname TEXT,
  p_limit INTEGER DEFAULT 30
)
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
        COALESCE(j.jobname, 'job-' || d.jobid) AS jobname,
        d.status,
        d.return_message,
        to_char(d.start_time AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS') AS start_time_cn,
        ROUND(EXTRACT(EPOCH FROM (d.end_time - d.start_time)) * 1000) AS duration_ms
      FROM cron.job_run_details d
      LEFT JOIN cron.job j ON j.jobid = d.jobid
      WHERE COALESCE(j.jobname, '') = p_jobname
      ORDER BY d.start_time DESC
      LIMIT p_limit
    ) r
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_cron_history_by_job(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION admin_cron_history_by_job(TEXT, INTEGER) TO service_role;

-- ------------------------------------------------------------
-- Defensive reschedule of process-daily-settlement
-- Uses the same UTC translation the admin RPC does: SGT hour stored in
-- system_settings, converted to UTC by subtracting 8 hours (mod 24).
-- ------------------------------------------------------------
DO $$
DECLARE
  v_hour  INTEGER;
  v_minute INTEGER;
  v_utc_hour INTEGER;
  v_cron_expr TEXT;
BEGIN
  SELECT COALESCE(value::INTEGER, 0)  INTO v_hour   FROM system_settings WHERE key = 'settlement_hour';
  SELECT COALESCE(value::INTEGER, 0)  INTO v_minute FROM system_settings WHERE key = 'settlement_minute';

  v_utc_hour := (COALESCE(v_hour, 0) - 8 + 24) % 24;
  v_cron_expr := COALESCE(v_minute, 0) || ' ' || v_utc_hour || ' * * *';

  -- cron.schedule replaces an existing job of the same name, so this
  -- restores the schedule if it was ever unscheduled.
  PERFORM cron.unschedule('process-daily-settlement') FROM cron.job WHERE jobname = 'process-daily-settlement';
  PERFORM cron.schedule('process-daily-settlement', v_cron_expr, 'SELECT process_daily()');

  RAISE NOTICE 'process-daily-settlement scheduled at %', v_cron_expr;
END;
$$;
