-- نظام الحضور والغياب للطلاب
CREATE TYPE student_attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TABLE IF NOT EXISTS student_attendance (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_room_id    UUID        NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  attendance_date  DATE        NOT NULL,
  status           student_attendance_status NOT NULL DEFAULT 'present',
  late_minutes     INTEGER,
  notes            TEXT,
  recorded_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS student_attendance_org_date_idx  ON student_attendance (org_id, attendance_date);
CREATE INDEX IF NOT EXISTS student_attendance_student_idx   ON student_attendance (student_id);
CREATE INDEX IF NOT EXISTS student_attendance_classroom_idx ON student_attendance (class_room_id, attendance_date);
