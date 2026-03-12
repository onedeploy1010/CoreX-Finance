-- Add on-chain tracking columns to withdrawals table
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_batch_id ON withdrawals(batch_id);
CREATE INDEX IF NOT EXISTS idx_orders_tx_hash ON orders(tx_hash);

-- Function to get pending withdrawals for batch processing
CREATE OR REPLACE FUNCTION get_pending_withdrawals(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  id INTEGER,
  wallet_address TEXT,
  amount DECIMAL,
  fee DECIMAL,
  actual_amount DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.wallet_address, w.amount, w.fee, w.actual_amount
  FROM withdrawals w
  WHERE w.status = 'approved'
    AND w.tx_hash IS NULL
  ORDER BY w.created_at ASC
  LIMIT p_limit;
END;
$$;

-- Function to mark a batch of withdrawals as processed
CREATE OR REPLACE FUNCTION mark_withdrawals_processed(
  p_ids INTEGER[],
  p_batch_id TEXT,
  p_tx_hash TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE withdrawals
  SET status = 'completed',
      tx_hash = p_tx_hash,
      batch_id = p_batch_id,
      processed_at = NOW()
  WHERE id = ANY(p_ids)
    AND status = 'approved';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to validate and create order from on-chain transaction
CREATE OR REPLACE FUNCTION create_order_from_tx(
  p_wallet_address TEXT,
  p_product_id INTEGER,
  p_amount TEXT,
  p_tx_hash TEXT,
  p_product_name TEXT,
  p_daily_rate TEXT,
  p_days INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id INTEGER;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Check duplicate tx_hash
  IF EXISTS (SELECT 1 FROM orders WHERE tx_hash = p_tx_hash) THEN
    RAISE EXCEPTION 'Transaction already processed';
  END IF;

  v_end_date := NOW() + (p_days || ' days')::INTERVAL;

  INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, tx_hash)
  VALUES (LOWER(p_wallet_address), p_product_id, p_product_name, p_amount::DECIMAL, p_daily_rate::DECIMAL, p_days, v_end_date, p_tx_hash)
  RETURNING id INTO v_order_id;

  -- Trigger settlement and level check
  PERFORM process_wallet_orders(LOWER(p_wallet_address));
  PERFORM check_and_upgrade_level(LOWER(p_wallet_address));

  RETURN v_order_id;
END;
$$;
