-- 068: نظام المواد الدراسية والصفوف الدراسية الديناميكي
-- subjects + grade_levels + subject_grade_levels (join)

-- subjects — سجل المواد الدراسية للمنشأة
CREATE TABLE IF NOT EXISTS subjects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'core',   -- core | skill | activity
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);

-- grade_levels — الصفوف الدراسية (الأول المتوسط، الثاني المتوسط …)
CREATE TABLE IF NOT EXISTS grade_levels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,                  -- e.g. "الأول المتوسط"
  stage       TEXT        NOT NULL DEFAULT 'متوسط', -- ابتدائي | متوسط | ثانوي
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);

-- subject_grade_levels — ربط المادة بالصف الدراسي
CREATE TABLE IF NOT EXISTS subject_grade_levels (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_id      UUID        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  grade_level_id  UUID        NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  weekly_hours    INTEGER     NOT NULL DEFAULT 4,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, subject_id, grade_level_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS subjects_org_idx              ON subjects(org_id, type);
CREATE INDEX IF NOT EXISTS grade_levels_org_stage_idx    ON grade_levels(org_id, stage);
CREATE INDEX IF NOT EXISTS sgl_grade_idx                 ON subject_grade_levels(org_id, grade_level_id);
CREATE INDEX IF NOT EXISTS sgl_subject_idx               ON subject_grade_levels(org_id, subject_id);
