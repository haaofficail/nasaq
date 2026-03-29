-- 072: إعدادات الإشعارات المدرسية + سجل رسائل الواتساب
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS notification_settings JSONB NOT NULL DEFAULT '{
    "notifyGuardianOnViolation": true,
    "notifyGuardianOnAbsence": true,
    "notifyTeacherOnAssignment": false,
    "violationMessage": "مدرسة {school_name}\nطالبكم {student_name} ({grade})\nتم تسجيل مخالفة: {category}\nالدرجة: {degree}\nبتاريخ {date}",
    "absenceMessage": "مدرسة {school_name}\nغياب طالبكم {student_name} ({grade})\nبتاريخ {date}\nللاستفسار تواصل مع المدرسة",
    "teacherAssignMessage": "تم إسنادك لتدريس مادة {subject} في {scope}\nمدرسة {school_name}"
  }'::jsonb;

-- جدول لسجل إشعارات واتساب المدرسة
CREATE TABLE IF NOT EXISTS school_whatsapp_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id    UUID        REFERENCES students(id) ON DELETE SET NULL,
  teacher_id    UUID        REFERENCES teacher_profiles(id) ON DELETE SET NULL,
  recipient     TEXT        NOT NULL,   -- رقم الجوال
  event_type    TEXT        NOT NULL,   -- violation | absence | teacher_assignment
  message       TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'sent',  -- sent | failed | pending
  ref_id        UUID,                   -- violation/attendance/assignment id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS school_whatsapp_logs_org_idx  ON school_whatsapp_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS school_whatsapp_logs_student  ON school_whatsapp_logs(org_id, student_id);

GRANT ALL ON TABLE school_whatsapp_logs TO nasaq_user;
