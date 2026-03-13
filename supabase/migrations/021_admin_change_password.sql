-- Admin change own password (all admins)
CREATE OR REPLACE FUNCTION admin_change_password(p_admin_id INTEGER, p_old_password TEXT, p_new_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin admin_users%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM admin_users WHERE id = p_admin_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', '用户不存在');
  END IF;

  IF NOT (v_admin.password_hash = crypt(p_old_password, v_admin.password_hash)) THEN
    RETURN json_build_object('success', false, 'message', '旧密码错误');
  END IF;

  UPDATE admin_users SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_admin_id;
  RETURN json_build_object('success', true, 'message', '密码修改成功');
END;
$$;

-- Superadmin reset other admin's password
CREATE OR REPLACE FUNCTION admin_reset_password(p_caller_id INTEGER, p_target_id INTEGER, p_new_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller admin_users%ROWTYPE;
BEGIN
  SELECT * INTO v_caller FROM admin_users WHERE id = p_caller_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', '操作者不存在');
  END IF;

  IF v_caller.role != 'superadmin' THEN
    RETURN json_build_object('success', false, 'message', '只有超级管理员可以重置密码');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_target_id) THEN
    RETURN json_build_object('success', false, 'message', '目标用户不存在');
  END IF;

  UPDATE admin_users SET password_hash = crypt(p_new_password, gen_salt('bf')) WHERE id = p_target_id;
  RETURN json_build_object('success', true, 'message', '密码重置成功');
END;
$$;
