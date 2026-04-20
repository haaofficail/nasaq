-- Migration 148: Feature Flag System
-- Adds kill_switch, rollout_percentage, default_for_new_orgs to capability_registry.
-- Creates capability_audit_log for tracking all flag changes.
-- Seeds page_builder_v2 capability.

-- ── 1. Add feature-flag columns to capability_registry ────────────────────

ALTER TABLE capability_registry
  ADD COLUMN IF NOT EXISTS kill_switch         BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_for_new_orgs BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rollout_percentage   INTEGER  NOT NULL DEFAULT 0
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 2. Create capability_audit_log ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS capability_audit_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_key    TEXT        NOT NULL,
  action            TEXT        NOT NULL, -- 'kill_switch_on' | 'kill_switch_off' | 'rollout_changed' | 'default_changed' | 'override_added' | 'override_removed' | 'override_updated'
  target_org_id     UUID        REFERENCES organizations(id) ON DELETE SET NULL,
  old_value         JSONB,
  new_value         JSONB,
  changed_by        UUID        REFERENCES users(id) ON DELETE SET NULL,
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cap_audit_log_key_idx    ON capability_audit_log (capability_key);
CREATE INDEX IF NOT EXISTS cap_audit_log_org_idx    ON capability_audit_log (target_org_id) WHERE target_org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cap_audit_log_at_idx     ON capability_audit_log (changed_at DESC);

-- ── 3. Seed page_builder_v2 in capability_registry ───────────────────────

INSERT INTO capability_registry (key, label_ar, label_en, description, category, kill_switch, default_for_new_orgs, rollout_percentage)
VALUES (
  'page_builder_v2',
  'منشئ الصفحات v2',
  'Page Builder v2',
  'نظام بناء الصفحات المرئي الجديد - السحب والإفلات',
  'addon',
  false,
  false,
  0
)
ON CONFLICT DO NOTHING;
