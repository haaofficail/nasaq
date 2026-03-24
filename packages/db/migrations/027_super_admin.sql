-- Super Admin Panel — schema extensions
-- Migration: 027_super_admin

-- ── Users: super admin fields ─────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip  text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count    integer DEFAULT 0;

-- ── Organizations: admin management fields ───────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_verified    boolean     DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified_at    timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS suspended_at   timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS suspend_reason text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_notes    text;

-- ── Platform Audit Log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_audit_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action       text        NOT NULL,   -- verify_org, suspend_org, change_plan, impersonate, etc.
  target_type  text        NOT NULL,   -- org, user, ticket, announcement
  target_id    text,
  details      jsonb       DEFAULT '{}',
  ip           text,
  created_at   timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_audit_log_admin_idx ON platform_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS platform_audit_log_target_idx ON platform_audit_log(target_type, target_id);

-- ── Org Documents (KYC) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type         text        NOT NULL,   -- commercial_register, vat_certificate, id_copy, other
  label        text,
  file_url     text        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
  reviewed_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  notes        text,
  created_at   timestamptz DEFAULT NOW(),
  updated_at   timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS org_documents_org_idx ON org_documents(org_id);

-- ── Support Tickets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opened_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  subject       text        NOT NULL,
  body          text        NOT NULL,
  category      text        DEFAULT 'general',   -- general, billing, technical, onboarding
  priority      text        DEFAULT 'normal',    -- low, normal, high, urgent
  status        text        NOT NULL DEFAULT 'open',  -- open, in_progress, resolved, closed
  assigned_to   uuid        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   timestamptz,
  messages      jsonb       DEFAULT '[]',
  created_at    timestamptz DEFAULT NOW(),
  updated_at    timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_tickets_org_idx ON support_tickets(org_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);

-- ── Platform Announcements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_announcements (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  body         text        NOT NULL,
  type         text        DEFAULT 'info',   -- info, warning, maintenance, feature
  target_plan  text,                          -- NULL = all plans; basic, advanced, pro, enterprise
  is_active    boolean     DEFAULT true,
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_by   uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT NOW(),
  updated_at   timestamptz DEFAULT NOW()
);

-- ── System Health Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_health_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_latency_ms  integer,
  db_latency_ms   integer,
  error_rate      numeric(5,2),   -- % of 5xx in last window
  active_orgs     integer,
  active_sessions integer,
  notes           text,
  recorded_at     timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_health_log_time_idx ON system_health_log(recorded_at DESC);
