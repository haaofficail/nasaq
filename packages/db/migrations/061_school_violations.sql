-- 061: School violations system — أنواع المخالفات + سجل المخالفات

CREATE TABLE IF NOT EXISTS school_violation_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  severity    TEXT        NOT NULL DEFAULT 'medium',  -- low | medium | high
  color       TEXT        NOT NULL DEFAULT '#f59e0b',
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS school_violation_categories_org_idx ON school_violation_categories(org_id);

CREATE TABLE IF NOT EXISTS school_violations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category_id      UUID        REFERENCES school_violation_categories(id) ON DELETE SET NULL,
  description      TEXT,
  violation_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT        NOT NULL DEFAULT 'open',   -- open | resolved | cancelled
  resolution_notes TEXT,
  recorded_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS school_violations_org_idx     ON school_violations(org_id, violation_date DESC);
CREATE INDEX IF NOT EXISTS school_violations_student_idx ON school_violations(org_id, student_id);
