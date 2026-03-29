-- Migration 078: الجدول الدراسي الأسبوعي المرن
-- يتيح إنشاء جدول حصص أسبوعي لكل فصل دراسي قابل للتعديل الكامل

CREATE TABLE IF NOT EXISTS school_timetable (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  class_room_id  UUID        NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,

  day_of_week    INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0=الأحد  1=الاثنين  2=الثلاثاء  3=الأربعاء  4=الخميس

  period_number  INTEGER     NOT NULL CHECK (period_number BETWEEN 1 AND 15),

  subject        TEXT,
  teacher_id     UUID        REFERENCES teacher_profiles(id) ON DELETE SET NULL,

  start_time     TEXT,   -- "07:30"
  end_time       TEXT,   -- "08:15"
  is_break       BOOLEAN     NOT NULL DEFAULT false,
  notes          TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT school_timetable_unique UNIQUE (org_id, class_room_id, day_of_week, period_number)
);

CREATE INDEX IF NOT EXISTS school_timetable_class_idx   ON school_timetable(org_id, class_room_id);
CREATE INDEX IF NOT EXISTS school_timetable_teacher_idx ON school_timetable(org_id, teacher_id);
