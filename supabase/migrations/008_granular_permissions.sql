-- Replace role with granular permissions JSONB
-- Each permission: module.action (e.g. "members.read", "withdrawals.write")

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::JSONB;

-- Migrate existing roles to permissions
UPDATE admin_users SET permissions = '["dashboard.read","members.read","members.write","referrals.read","orders.read","withdrawals.read","withdrawals.write","messages.read","messages.write","finance.read","settings.read","settings.write","admins.read","admins.write","logs.read"]'::JSONB
WHERE role = 'superadmin';

UPDATE admin_users SET permissions = '["members.read","referrals.read","orders.read","withdrawals.read","withdrawals.write","finance.read"]'::JSONB
WHERE role = 'finance';

UPDATE admin_users SET permissions = '["members.read","referrals.read"]'::JSONB
WHERE role = 'customer_service';

-- Auto-approve withdrawal setting
INSERT INTO system_settings (key, value) VALUES ('auto_approve_withdrawal', 'false')
ON CONFLICT (key) DO NOTHING;

-- Update admin_login to return permissions
CREATE OR REPLACE FUNCTION admin_login(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin admin_users%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM admin_users
    WHERE username = p_username AND password_hash = crypt(p_password, password_hash);
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN json_build_object(
    'id', v_admin.id,
    'username', v_admin.username,
    'role', v_admin.role,
    'permissions', v_admin.permissions,
    'token', encode(gen_random_bytes(32), 'hex')
  );
END;
$$;

-- Update admin_list_admins to return permissions
CREATE OR REPLACE FUNCTION admin_list_admins()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(json_build_object(
      'id', id,
      'username', username,
      'role', role,
      'permissions', permissions,
      'createdAt', created_at
    ) ORDER BY id)
    FROM admin_users
  );
END;
$$;

-- Update create user to accept permissions
CREATE OR REPLACE FUNCTION admin_create_user(p_username TEXT, p_password TEXT, p_role TEXT, p_permissions JSONB DEFAULT '[]'::JSONB)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO admin_users (username, password_hash, role, permissions)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_role, p_permissions)
  RETURNING id INTO v_id;
  RETURN json_build_object('id', v_id, 'username', p_username, 'role', p_role);
END;
$$;

-- Update admin user: role, permissions, optional password reset
CREATE OR REPLACE FUNCTION admin_update_user(p_id INTEGER, p_role TEXT, p_password TEXT DEFAULT NULL, p_permissions JSONB DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_password IS NOT NULL AND p_password != '' THEN
    UPDATE admin_users SET role = p_role, password_hash = crypt(p_password, gen_salt('bf')),
      permissions = COALESCE(p_permissions, permissions)
    WHERE id = p_id;
  ELSE
    UPDATE admin_users SET role = p_role,
      permissions = COALESCE(p_permissions, permissions)
    WHERE id = p_id;
  END IF;
  RETURN FOUND;
END;
$$;

-- Auto-approve: process withdrawal creation
CREATE OR REPLACE FUNCTION process_withdrawal_auto_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_auto TEXT;
BEGIN
  SELECT value INTO v_auto FROM system_settings WHERE key = 'auto_approve_withdrawal';
  IF v_auto = 'true' THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_auto_approve ON withdrawals;
CREATE TRIGGER trg_withdrawal_auto_approve
  BEFORE INSERT ON withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION process_withdrawal_auto_approve();
