-- ============================================================
-- Migration 065: نظام السلوك والمواظبة
-- لائحة تنظيم سلوك الطلاب — وزارة التعليم السعودية
-- الإصدار الخامس 1447هـ
-- ============================================================

CREATE TYPE IF NOT EXISTS behavior_incident_degree AS ENUM ('1', '2', '3', '4', '5');

-- student_behavior_scores — نقاط السلوك التراكمية لكل طالب
CREATE TABLE IF NOT EXISTS student_behavior_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year       TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY'),
  behavior_score      INTEGER NOT NULL DEFAULT 80,
  attendance_score    INTEGER NOT NULL DEFAULT 100,
  total_score         INTEGER NOT NULL DEFAULT 90,
  last_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, student_id, academic_year)
);

-- behavior_incidents — الحوادث السلوكية المفصّلة (بدرجة وخصم)
CREATE TABLE IF NOT EXISTS behavior_incidents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category_id        UUID REFERENCES school_violation_categories(id) ON DELETE SET NULL,

  incident_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  degree             behavior_incident_degree NOT NULL DEFAULT '1',
  violation_code     TEXT,
  description        TEXT,
  deduction_points   INTEGER NOT NULL DEFAULT 0,

  action_taken       TEXT,
  guardian_notified  BOOLEAN NOT NULL DEFAULT FALSE,

  status             TEXT NOT NULL DEFAULT 'open',
  resolution_notes   TEXT,

  recorded_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- behavior_compensations — التعويضات والسلوك الإيجابي
CREATE TABLE IF NOT EXISTS behavior_compensations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  compensation_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  compensation_type   TEXT NOT NULL,
  description         TEXT,
  points_added        INTEGER NOT NULL DEFAULT 5,

  recorded_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- guardian_notifications — إشعارات أولياء الأمور
CREATE TABLE IF NOT EXISTS guardian_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  incident_id         UUID REFERENCES behavior_incidents(id) ON DELETE SET NULL,

  notification_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notification_type   TEXT NOT NULL,
  message             TEXT,
  sent_to             TEXT,
  status              TEXT NOT NULL DEFAULT 'sent',

  sent_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS behavior_incidents_org_idx        ON behavior_incidents(org_id, incident_date DESC);
CREATE INDEX IF NOT EXISTS behavior_incidents_student_idx    ON behavior_incidents(org_id, student_id);
CREATE INDEX IF NOT EXISTS behavior_incidents_status_idx     ON behavior_incidents(org_id, status);
CREATE INDEX IF NOT EXISTS behavior_compensations_org_idx    ON behavior_compensations(org_id, compensation_date DESC);
CREATE INDEX IF NOT EXISTS behavior_compensations_student_idx ON behavior_compensations(org_id, student_id);
CREATE INDEX IF NOT EXISTS student_behavior_scores_idx       ON student_behavior_scores(org_id, student_id);
CREATE INDEX IF NOT EXISTS guardian_notifications_student_idx ON guardian_notifications(org_id, student_id);
