-- ============================================================
-- Migration 032 — Preserve audit logs when org is deleted
-- Change onDelete: cascade → SET NULL for audit_logs.org_id
-- Reason: audit trail must survive org deletion for compliance
-- ============================================================

-- audit_logs table (auth.ts schema)
ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_org_id_fkey;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- audit_log table (accounting audit-log.ts schema)
ALTER TABLE audit_log
  DROP CONSTRAINT IF EXISTS audit_log_org_id_fkey;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL;
