-- ============================================================
-- Smart Guardian — نظام المراقبة الذاتي
-- 091_smart_guardian.sql
-- ============================================================

-- إصدار المشاكل المكتشفة (مجمّعة بالبصمة)
CREATE TABLE IF NOT EXISTS guardian_issues (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- السياق
  tenant_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  module           TEXT NOT NULL,          -- menu | booking | payment | tenant | auth | system
  page             TEXT,                   -- /dashboard/menu
  api_endpoint     TEXT,                   -- POST /api/v1/menu/items

  -- كتالوج المشكلة
  code             TEXT NOT NULL,          -- MENU-001
  severity         TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  title_ar         TEXT NOT NULL,
  description_ar   TEXT NOT NULL,
  category         TEXT NOT NULL,          -- data_integrity | business_logic | security | performance | infrastructure

  -- تفاصيل تقنية
  technical_detail TEXT,
  error_message    TEXT,
  stack_trace      TEXT,
  request_body     JSONB,
  request_params   JSONB,

  -- تأثير
  is_user_facing   BOOLEAN DEFAULT false,
  affected_count   INT DEFAULT 1,

  -- الإصلاح التلقائي
  auto_fixable     BOOLEAN DEFAULT false,
  auto_fixed       BOOLEAN DEFAULT false,
  fix_description_ar TEXT,
  fix_applied_at   TIMESTAMPTZ,

  -- تجميع التكرار (deduplication)
  fingerprint      TEXT NOT NULL,          -- md5(code+tenant_id+context_key)
  occurrences      INT DEFAULT 1,
  first_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ DEFAULT NOW(),

  -- الحالة
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','ignored')),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note  TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- سجل الإصلاحات التلقائية
CREATE TABLE IF NOT EXISTS guardian_fixes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id         UUID REFERENCES guardian_issues(id) ON DELETE CASCADE,
  action           TEXT NOT NULL,          -- delete_orphan | set_default_price | cancel_stuck | etc.
  description_ar   TEXT NOT NULL,
  before_state     JSONB,
  after_state      JSONB,
  records_affected INT DEFAULT 0,
  success          BOOLEAN DEFAULT true,
  error_if_failed  TEXT,
  fixed_by         TEXT DEFAULT 'system',  -- 'system' or admin user id
  fixed_at         TIMESTAMPTZ DEFAULT NOW()
);

-- سجل الفحوصات الدورية
CREATE TABLE IF NOT EXISTS guardian_scans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL DEFAULT 'scheduled' CHECK (type IN ('scheduled','manual','triggered')),
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INT,
  total_checks    INT DEFAULT 0,
  issues_found    INT DEFAULT 0,
  auto_fixed      INT DEFAULT 0,
  critical_count  INT DEFAULT 0,
  high_count      INT DEFAULT 0,
  medium_count    INT DEFAULT 0,
  low_count       INT DEFAULT 0,
  results         JSONB,                  -- summary per check
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed'))
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_guardian_issues_tenant    ON guardian_issues (tenant_id);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_status    ON guardian_issues (status);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_severity  ON guardian_issues (severity);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_code      ON guardian_issues (code);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_fp        ON guardian_issues (fingerprint);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_last_seen ON guardian_issues (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardian_fixes_issue      ON guardian_fixes (issue_id);
CREATE INDEX IF NOT EXISTS idx_guardian_scans_started    ON guardian_scans (started_at DESC);
