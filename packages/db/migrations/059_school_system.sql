-- Migration 059: School System
-- نظام المدارس — الفصول، المعلمون، الطلاب، الجداول الدراسية، الحالات، الاستيراد

-- ============================================================
-- ENUMs
-- ============================================================

CREATE TYPE school_session_type AS ENUM ('summer', 'winter');
CREATE TYPE school_day_of_week  AS ENUM ('sun', 'mon', 'tue', 'wed', 'thu');
CREATE TYPE school_case_status  AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE school_case_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE school_import_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================================
-- school_settings — بيانات المدرسة (سجل واحد لكل منشأة)
-- ============================================================

CREATE TABLE IF NOT EXISTS school_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  school_name       TEXT NOT NULL,
  school_logo_url   TEXT,
  school_address    TEXT,
  school_phone      TEXT,
  school_email      TEXT,
  school_region     TEXT,
  school_type       TEXT,                          -- حكومية | أهلية | دولية
  education_level   TEXT,                          -- ابتدائية | متوسطة | ثانوية | مختلطة

  -- الأسبوع النشط (بدون FK constraint لتجنب الدائرية مع schedule_weeks)
  active_week_id    UUID,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_settings_org_unique ON school_settings(org_id);

-- ============================================================
-- class_rooms — الفصول الدراسية
-- grade: "الأول" / "الثاني" ...  name: "أ" / "ب" ...
-- ============================================================

CREATE TABLE IF NOT EXISTS class_rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  grade         TEXT NOT NULL,   -- الصف مثل "الأول"
  name          TEXT NOT NULL,   -- اسم الفصل مثل "أ"
  capacity      INTEGER,
  notes         TEXT,

  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS class_rooms_org_idx   ON class_rooms(org_id);
CREATE INDEX IF NOT EXISTS class_rooms_grade_idx ON class_rooms(org_id, grade);
CREATE UNIQUE INDEX IF NOT EXISTS class_rooms_org_grade_name_unique ON class_rooms(org_id, grade, name);

-- ============================================================
-- teacher_profiles — المعلمون
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  full_name       TEXT NOT NULL,
  employee_number TEXT,
  subject         TEXT,          -- التخصص الرئيسي
  phone           TEXT,
  email           TEXT,
  national_id     TEXT,
  gender          TEXT,          -- ذكر | أنثى
  qualification   TEXT,
  notes           TEXT,

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teacher_profiles_org_idx    ON teacher_profiles(org_id);
CREATE INDEX IF NOT EXISTS teacher_profiles_active_idx ON teacher_profiles(org_id, is_active);

-- ============================================================
-- students — الطلاب (مرتبطون بفصل)
-- ============================================================

CREATE TABLE IF NOT EXISTS students (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  class_room_id    UUID REFERENCES class_rooms(id) ON DELETE SET NULL,

  full_name        TEXT NOT NULL,
  student_number   TEXT,
  national_id      TEXT,
  birth_date       DATE,
  gender           TEXT,          -- ذكر | أنثى
  guardian_name    TEXT,
  guardian_phone   TEXT,
  guardian_relation TEXT,         -- أب | أم | أخ | غيره
  address          TEXT,
  notes            TEXT,

  is_active        BOOLEAN NOT NULL DEFAULT TRUE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS students_org_idx        ON students(org_id);
CREATE INDEX IF NOT EXISTS students_class_room_idx ON students(org_id, class_room_id);
CREATE INDEX IF NOT EXISTS students_active_idx     ON students(org_id, is_active);

-- ============================================================
-- timetable_templates — قوالب الدوام (شتوي / صيفي)
-- ============================================================

CREATE TABLE IF NOT EXISTS timetable_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name            TEXT NOT NULL,
  session_type    school_session_type NOT NULL DEFAULT 'winter',
  description     TEXT,

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS timetable_templates_org_idx ON timetable_templates(org_id);

-- ============================================================
-- timetable_template_periods — الحصص في القالب
-- period_number: رقم الحصة (1، 2، 3 ...)
-- is_break: هل هي فسحة؟
-- ============================================================

CREATE TABLE IF NOT EXISTS timetable_template_periods (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  template_id    UUID NOT NULL REFERENCES timetable_templates(id) ON DELETE CASCADE,

  period_number  INTEGER NOT NULL,
  label          TEXT,              -- "الحصة الأولى" أو "الفسحة"
  start_time     TEXT NOT NULL,     -- "07:30"
  end_time       TEXT NOT NULL,     -- "08:15"
  is_break       BOOLEAN NOT NULL DEFAULT FALSE,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS timetable_template_periods_template_idx ON timetable_template_periods(template_id);
CREATE UNIQUE INDEX IF NOT EXISTS timetable_template_periods_unique ON timetable_template_periods(template_id, period_number);

-- ============================================================
-- schedule_weeks — الأسابيع الدراسية (مرتبطة بقالب)
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_weeks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  template_id  UUID NOT NULL REFERENCES timetable_templates(id) ON DELETE CASCADE,

  week_number  INTEGER NOT NULL,
  label        TEXT,               -- "الأسبوع الأول" أو تاريخ مثل "1-5 مارس 2026"
  start_date   DATE,
  end_date     DATE,
  notes        TEXT,

  is_active    BOOLEAN NOT NULL DEFAULT FALSE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedule_weeks_org_idx      ON schedule_weeks(org_id);
CREATE INDEX IF NOT EXISTS schedule_weeks_template_idx ON schedule_weeks(org_id, template_id);

-- ============================================================
-- schedule_entries — مدخلات الجدول الأسبوعي
-- ربط: أسبوع + حصة + فصل + يوم → مادة + معلم
-- UNIQUE: لا يمكن أن يكون في نفس الأسبوع والحصة والفصل واليوم إدخالان
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  week_id              UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
  period_id            UUID NOT NULL REFERENCES timetable_template_periods(id) ON DELETE CASCADE,
  class_room_id        UUID NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  teacher_id           UUID REFERENCES teacher_profiles(id) ON DELETE SET NULL,

  day_of_week          school_day_of_week NOT NULL,
  subject              TEXT NOT NULL,

  -- تتبع التأخر
  teacher_late_minutes INTEGER NOT NULL DEFAULT 0,
  teacher_arrived_at   TEXT,   -- وقت وصول المعلم مثل "07:45"

  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedule_entries_org_idx        ON schedule_entries(org_id);
CREATE INDEX IF NOT EXISTS schedule_entries_week_idx       ON schedule_entries(week_id);
CREATE INDEX IF NOT EXISTS schedule_entries_class_room_idx ON schedule_entries(org_id, class_room_id);
CREATE INDEX IF NOT EXISTS schedule_entries_teacher_idx    ON schedule_entries(org_id, teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS schedule_entries_unique  ON schedule_entries(week_id, period_id, class_room_id, day_of_week);

-- ============================================================
-- school_cases — الحالات والمتابعة
-- student_id: اختياري (قد تكون حالة غير مرتبطة بطالب بعينه)
-- ============================================================

CREATE TABLE IF NOT EXISTS school_cases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  student_id   UUID REFERENCES students(id) ON DELETE SET NULL,
  class_room_id UUID REFERENCES class_rooms(id) ON DELETE SET NULL,

  title        TEXT NOT NULL,
  category     TEXT NOT NULL,   -- سلوكية | أكاديمية | صحية | اجتماعية | إدارية
  description  TEXT,
  status       school_case_status   NOT NULL DEFAULT 'open',
  priority     school_case_priority NOT NULL DEFAULT 'normal',

  assigned_to  TEXT,            -- اسم المسؤول (نص حر أو مرجع)
  resolved_at  TIMESTAMPTZ,
  resolution   TEXT,

  created_by   UUID,            -- user_id
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS school_cases_org_idx       ON school_cases(org_id);
CREATE INDEX IF NOT EXISTS school_cases_student_idx   ON school_cases(org_id, student_id);
CREATE INDEX IF NOT EXISTS school_cases_status_idx    ON school_cases(org_id, status);
CREATE INDEX IF NOT EXISTS school_cases_priority_idx  ON school_cases(org_id, priority);

-- ============================================================
-- school_case_steps — خطوات متابعة الحالات
-- ============================================================

CREATE TABLE IF NOT EXISTS school_case_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  case_id     UUID NOT NULL REFERENCES school_cases(id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  action_taken TEXT,
  result       TEXT,
  done_by      TEXT,            -- اسم المنفذ
  done_at      TIMESTAMPTZ,
  notes        TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS school_case_steps_case_idx ON school_case_steps(case_id);

-- ============================================================
-- school_import_logs — سجل عمليات الاستيراد (Excel / CSV)
-- ============================================================

CREATE TABLE IF NOT EXISTS school_import_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  import_type   TEXT NOT NULL,                      -- students | teachers | schedule
  status        school_import_status NOT NULL DEFAULT 'pending',

  file_name     TEXT,
  file_url      TEXT,

  total_rows    INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows  INTEGER NOT NULL DEFAULT 0,
  error_rows    INTEGER NOT NULL DEFAULT 0,

  errors        JSONB NOT NULL DEFAULT '[]',         -- تفاصيل الأخطاء لكل صف
  notes         TEXT,

  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,

  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS school_import_logs_org_idx    ON school_import_logs(org_id);
CREATE INDEX IF NOT EXISTS school_import_logs_status_idx ON school_import_logs(org_id, status);
CREATE INDEX IF NOT EXISTS school_import_logs_type_idx   ON school_import_logs(org_id, import_type);
