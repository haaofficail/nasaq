-- 073_teacher_attendance.sql
-- حضور المعلمين — الوكيل يسجّل، النظام يُخطر المعلم

-- جدول حضور المعلمين
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  class_room_id   UUID REFERENCES class_rooms(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'absent',  -- present | absent | late | excused
  period_number   INTEGER,
  notes           TEXT,
  recorded_by     UUID,
  notified        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS teacher_attendance_unique_idx
  ON teacher_attendance(org_id, teacher_id, class_room_id, attendance_date, period_number)
  WHERE period_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS teacher_attendance_org_date_idx ON teacher_attendance(org_id, attendance_date);
CREATE INDEX IF NOT EXISTS teacher_attendance_teacher_idx  ON teacher_attendance(org_id, teacher_id);

GRANT ALL ON TABLE teacher_attendance TO nasaq_user;

-- إضافة قالب رسالة غياب المعلم في notification_settings
UPDATE school_settings
SET notification_settings = notification_settings ||
  '{
    "notifyTeacherOnAbsence": true,
    "teacherAbsenceMessage": "{school_name}\n\nالأستاذ / {teacher_name}\nالسلام عليكم ورحمة الله وبركاته\n\nنفيدكم بأنه تم تسجيل غيابكم عن فصل {class_name} في {date}.\n\nنأمل التواصل مع إدارة المدرسة لتوضيح سبب الغياب.\nمع تحيات إدارة {school_name}"
  }'::jsonb
WHERE notification_settings IS NOT NULL
  AND NOT (notification_settings ? 'teacherAbsenceMessage');
