-- ============================================================
-- 052_admin_logs_fk_set_null.sql
-- Allow deleting admin_users while preserving their audit logs.
--
-- admin_logs.admin_id was NOT NULL with a NO ACTION FK, so deleting an
-- admin who had any logs failed. Make admin_id nullable and switch the FK
-- to ON DELETE SET NULL: deleting an admin nulls admin_id but keeps the log
-- row (admin_username text is retained, so "who did what" is still visible).
-- ============================================================

ALTER TABLE admin_logs ALTER COLUMN admin_id DROP NOT NULL;

ALTER TABLE admin_logs DROP CONSTRAINT IF EXISTS admin_logs_admin_id_fkey;
ALTER TABLE admin_logs
  ADD CONSTRAINT admin_logs_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL;
