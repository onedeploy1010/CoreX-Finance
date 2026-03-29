-- Add note/remark field to members table
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS note text DEFAULT NULL;

-- Function to update member note
CREATE OR REPLACE FUNCTION admin_update_member_note(p_wallet_address text, p_note text)
RETURNS boolean AS $$
BEGIN
  UPDATE members SET note = p_note WHERE wallet_address = lower(p_wallet_address);
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
