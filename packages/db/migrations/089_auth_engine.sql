-- ============================================================
-- 089: Authorization Engine Tables
-- user_constraints + platform_kill_switches + quota_usage
-- ============================================================

-- user_constraints: per-user overrides on top of RBAC
CREATE TABLE IF NOT EXISTS user_constraints (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  max_discount_pct        NUMERIC(5,2),
  max_void_count          INTEGER,
  require_approval_above  NUMERIC(10,2),

  can_create_invoice      BOOLEAN,
  can_void_invoice        BOOLEAN,
  can_give_discount       BOOLEAN,
  can_access_reports      BOOLEAN,
  can_export_data         BOOLEAN,
  can_manage_team         BOOLEAN,

  notes                   TEXT,
  created_by              UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS user_constraints_org_idx ON user_constraints(org_id);

-- platform_kill_switches: instantly disable any feature platform-wide
CREATE TABLE IF NOT EXISTS platform_kill_switches (
  id           TEXT PRIMARY KEY,
  is_disabled  BOOLEAN NOT NULL DEFAULT FALSE,
  reason       TEXT,
  disabled_by  TEXT,
  disabled_at  TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- quota_usage: real-time counters per org per metric per period
CREATE TABLE IF NOT EXISTS quota_usage (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL,
  metric_key   TEXT NOT NULL,
  period       TEXT NOT NULL,
  used_count   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id, metric_key, period)
);

CREATE INDEX IF NOT EXISTS quota_usage_org_idx ON quota_usage(org_id);
