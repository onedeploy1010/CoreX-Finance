-- Auto-withdraw on-chain: amount threshold + edge function trigger

-- 1. Add auto_withdraw_limit setting (0 = disabled, >0 = auto-approve+process up to this amount)
INSERT INTO system_settings (key, value) VALUES ('auto_withdraw_limit', '0')
ON CONFLICT (key) DO NOTHING;

-- 2. Update auto-approve trigger to check amount limit
CREATE OR REPLACE FUNCTION process_withdrawal_auto_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_auto TEXT;
  v_limit TEXT;
  v_limit_val DECIMAL;
BEGIN
  -- Check simple auto-approve toggle
  SELECT value INTO v_auto FROM system_settings WHERE key = 'auto_approve_withdrawal';

  -- Check amount-based auto-approve limit
  SELECT value INTO v_limit FROM system_settings WHERE key = 'auto_withdraw_limit';
  v_limit_val := COALESCE(NULLIF(v_limit, '')::DECIMAL, 0);

  -- Auto-approve if: toggle is on, OR amount is within limit (and limit > 0)
  IF v_auto = 'true' OR (v_limit_val > 0 AND NEW.amount <= v_limit_val) THEN
    NEW.status := 'approved';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Function to get approved withdrawals ready for on-chain processing
CREATE OR REPLACE FUNCTION get_approved_withdrawals_for_processing(p_limit INTEGER DEFAULT 50)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(w)), '[]'::JSON)
    FROM (
      SELECT id, wallet_address, amount, fee, actual_amount
      FROM withdrawals
      WHERE status = 'approved' AND tx_hash IS NULL
      ORDER BY created_at ASC
      LIMIT p_limit
    ) w
  );
END;
$$;
