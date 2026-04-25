-- Restore Smart Guardian tables that may be absent in drifted production DBs.
-- Safe to run more than once: creates missing tables, missing columns, and indexes only.

CREATE TABLE IF NOT EXISTS guardian_issues (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  module             TEXT NOT NULL,
  page               TEXT,
  api_endpoint       TEXT,
  code               TEXT NOT NULL,
  severity           TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  title_ar           TEXT NOT NULL,
  description_ar     TEXT NOT NULL,
  category           TEXT NOT NULL,
  technical_detail   TEXT,
  error_message      TEXT,
  stack_trace        TEXT,
  request_body       JSONB,
  request_params     JSONB,
  is_user_facing     BOOLEAN DEFAULT false,
  affected_count     INT DEFAULT 1,
  auto_fixable       BOOLEAN DEFAULT false,
  auto_fixed         BOOLEAN DEFAULT false,
  fix_description_ar TEXT,
  fix_applied_at     TIMESTAMPTZ,
  fingerprint        TEXT NOT NULL,
  occurrences        INT DEFAULT 1,
  first_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ DEFAULT NOW(),
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','ignored')),
  resolved_at        TIMESTAMPTZ,
  resolved_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note    TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'system';
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS page TEXT;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS api_endpoint TEXT;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT 'SYS-001';
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('critical','high','medium','low'));
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS title_ar TEXT NOT NULL DEFAULT '';
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS description_ar TEXT NOT NULL DEFAULT '';
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'infrastructure';
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS technical_detail TEXT;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS stack_trace TEXT;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS request_body JSONB;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS request_params JSONB;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS is_user_facing BOOLEAN DEFAULT false;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS affected_count INT DEFAULT 1;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS auto_fixable BOOLEAN DEFAULT false;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS auto_fixed BOOLEAN DEFAULT false;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS fix_description_ar TEXT;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS fix_applied_at TIMESTAMPTZ;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS fingerprint TEXT NOT NULL DEFAULT '';
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS occurrences INT DEFAULT 1;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','ignored'));
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE guardian_issues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS guardian_fixes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id         UUID REFERENCES guardian_issues(id) ON DELETE CASCADE,
  action           TEXT NOT NULL,
  description_ar   TEXT NOT NULL,
  before_state     JSONB,
  after_state      JSONB,
  records_affected INT DEFAULT 0,
  success          BOOLEAN DEFAULT true,
  error_if_failed  TEXT,
  fixed_by         TEXT DEFAULT 'system',
  fixed_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS issue_id UUID REFERENCES guardian_issues(id) ON DELETE CASCADE;
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '';
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS description_ar TEXT NOT NULL DEFAULT '';
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS before_state JSONB;
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS after_state JSONB;
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS records_affected INT DEFAULT 0;
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true;
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS error_if_failed TEXT;
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS fixed_by TEXT DEFAULT 'system';
ALTER TABLE guardian_fixes ADD COLUMN IF NOT EXISTS fixed_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS guardian_scans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL DEFAULT 'scheduled' CHECK (type IN ('scheduled','manual','triggered')),
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  duration_ms    INT,
  total_checks   INT DEFAULT 0,
  issues_found   INT DEFAULT 0,
  auto_fixed     INT DEFAULT 0,
  critical_count INT DEFAULT 0,
  high_count     INT DEFAULT 0,
  medium_count   INT DEFAULT 0,
  low_count      INT DEFAULT 0,
  results        JSONB,
  status         TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed'))
);

ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'scheduled' CHECK (type IN ('scheduled','manual','triggered'));
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS total_checks INT DEFAULT 0;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS issues_found INT DEFAULT 0;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS auto_fixed INT DEFAULT 0;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS critical_count INT DEFAULT 0;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS high_count INT DEFAULT 0;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS medium_count INT DEFAULT 0;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS low_count INT DEFAULT 0;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS results JSONB;
ALTER TABLE guardian_scans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed'));

CREATE INDEX IF NOT EXISTS idx_guardian_issues_tenant ON guardian_issues (tenant_id);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_status ON guardian_issues (status);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_severity ON guardian_issues (severity);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_code ON guardian_issues (code);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_fp ON guardian_issues (fingerprint);
CREATE INDEX IF NOT EXISTS idx_guardian_issues_last_seen ON guardian_issues (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardian_fixes_issue ON guardian_fixes (issue_id);
CREATE INDEX IF NOT EXISTS idx_guardian_scans_started ON guardian_scans (started_at DESC);
