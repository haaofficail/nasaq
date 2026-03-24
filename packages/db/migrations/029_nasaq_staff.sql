-- Migration 029: Nasaq staff roles + account manager assignment

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nasaq_role text
  CHECK (nasaq_role IN ('account_manager', 'support_agent', 'content_manager', 'viewer'));

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS account_manager_id uuid REFERENCES users(id) ON DELETE SET NULL;
