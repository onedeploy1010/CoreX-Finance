-- Add role column to admin_users
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'superadmin';

-- Create admin operation logs table
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admin_users(id),
  admin_username TEXT NOT NULL,
  admin_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);

-- Update admin_login to return role
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
    'token', encode(gen_random_bytes(32), 'hex')
  );
END;
$$;

-- Function to get admin list (superadmin only)
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
      'createdAt', created_at
    ) ORDER BY id)
    FROM admin_users
  );
END;
$$;

-- Function to create admin user
CREATE OR REPLACE FUNCTION admin_create_user(p_username TEXT, p_password TEXT, p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  IF p_role NOT IN ('superadmin', 'finance', 'customer_service') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  INSERT INTO admin_users (username, password_hash, role)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_role)
  RETURNING id INTO v_id;
  RETURN json_build_object('id', v_id, 'username', p_username, 'role', p_role);
END;
$$;

-- Function to update admin user role
CREATE OR REPLACE FUNCTION admin_update_user(p_id INTEGER, p_role TEXT, p_password TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_role NOT IN ('superadmin', 'finance', 'customer_service') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF p_password IS NOT NULL AND p_password != '' THEN
    UPDATE admin_users SET role = p_role, password_hash = crypt(p_password, gen_salt('bf')) WHERE id = p_id;
  ELSE
    UPDATE admin_users SET role = p_role WHERE id = p_id;
  END IF;
  RETURN FOUND;
END;
$$;

-- Function to delete admin user (cannot delete self)
CREATE OR REPLACE FUNCTION admin_delete_user(p_id INTEGER, p_caller_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_id = p_caller_id THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;
  DELETE FROM admin_users WHERE id = p_id;
  RETURN FOUND;
END;
$$;

-- Function to insert admin log
CREATE OR REPLACE FUNCTION admin_add_log(
  p_admin_id INTEGER,
  p_admin_username TEXT,
  p_admin_role TEXT,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_detail JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_logs (admin_id, admin_username, admin_role, action, target_type, target_id, detail)
  VALUES (p_admin_id, p_admin_username, p_admin_role, p_action, p_target_type, p_target_id, p_detail);
END;
$$;

-- Function to query admin logs with pagination
CREATE OR REPLACE FUNCTION admin_get_logs(p_page INTEGER DEFAULT 1, p_limit INTEGER DEFAULT 50)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_logs JSON;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  SELECT count(*) INTO v_total FROM admin_logs;
  SELECT json_agg(t) INTO v_logs FROM (
    SELECT id, admin_id as "adminId", admin_username as "adminUsername", admin_role as "adminRole",
           action, target_type as "targetType", target_id as "targetId", detail,
           created_at as "createdAt"
    FROM admin_logs ORDER BY created_at DESC
    LIMIT p_limit OFFSET v_offset
  ) t;
  RETURN json_build_object('logs', COALESCE(v_logs, '[]'::json), 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

-- Function to update member level (superadmin only)
CREATE OR REPLACE FUNCTION admin_update_member_level(p_wallet_address TEXT, p_level INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE members SET level = p_level WHERE wallet_address = LOWER(p_wallet_address);
  RETURN FOUND;
END;
$$;

-- Ensure pgcrypto extension for crypt/gen_salt
CREATE EXTENSION IF NOT EXISTS pgcrypto;
