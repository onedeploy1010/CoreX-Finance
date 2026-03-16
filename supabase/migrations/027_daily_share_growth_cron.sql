-- Daily share growth: increment used_shares by daily_growth for active products
-- This runs independently of actual orders - for display purposes

CREATE OR REPLACE FUNCTION process_daily_share_growth()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET used_shares = LEAST(used_shares + daily_growth, total_shares)
  WHERE is_active = true
    AND daily_growth > 0
    AND used_shares < total_shares;
END;
$$;

-- Schedule: run daily at 00:05 UTC (after midnight)
SELECT cron.schedule(
  'daily-share-growth',
  '5 0 * * *',
  'SELECT process_daily_share_growth()'
);
