-- Withdrawal contract minimum balance: auto-top-up when below this
INSERT INTO system_settings (key, value) VALUES ('withdrawal_contract_min_balance', '0')
ON CONFLICT (key) DO NOTHING;

-- Auto-execute withdrawal minimum batch amount: only execute when total approved >= this
INSERT INTO system_settings (key, value) VALUES ('auto_withdraw_exec_min', '0')
ON CONFLICT (key) DO NOTHING;
