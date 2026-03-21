-- Add observation account fields to members table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS is_observed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS principal_withdrawal_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS earnings_withdrawal_enabled boolean NOT NULL DEFAULT true;

-- Create index for filtering observed accounts
CREATE INDEX IF NOT EXISTS idx_members_is_observed ON members (is_observed) WHERE is_observed = true;

-- Function to update member observation controls
CREATE OR REPLACE FUNCTION admin_update_member_observation(
  p_wallet_address text,
  p_is_observed boolean DEFAULT NULL,
  p_principal_withdrawal_enabled boolean DEFAULT NULL,
  p_earnings_withdrawal_enabled boolean DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE members SET
    is_observed = COALESCE(p_is_observed, is_observed),
    principal_withdrawal_enabled = COALESCE(p_principal_withdrawal_enabled, principal_withdrawal_enabled),
    earnings_withdrawal_enabled = COALESCE(p_earnings_withdrawal_enabled, earnings_withdrawal_enabled)
  WHERE wallet_address = lower(p_wallet_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the 3 specific addresses to V3, disable withdrawals, mark as observed
UPDATE members SET
  level = 3,
  is_observed = true,
  principal_withdrawal_enabled = false,
  earnings_withdrawal_enabled = false
WHERE wallet_address IN (
  lower('0xAFd7aAB167d168279c6A059E1920c5002d57D4DB'),
  lower('0x78a3032Ad7f2514E89b75D8cff7a31A14Bc30F2D'),
  lower('0x4F5876D03289ceD8abB73A6635ee0C75561Bae9E')
);
