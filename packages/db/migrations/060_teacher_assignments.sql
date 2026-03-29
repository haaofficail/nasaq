-- Migration 060: Teacher Class Assignments
-- جدول ربط المعلمين بالفصول/الصفوف/المراحل مع كشف التعارضات

-- ============================================================
-- teacher_class_assignments — صلاحيات وارتباط المعلم بالفصول
-- scope: يجب أن يكون أحد الثلاثة محدداً (classroom | grade | stage)
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id    UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,

  -- نطاق الصلاحية — يُحدَّد واحد فقط من الثلاثة
  class_room_id UUID REFERENCES class_rooms(id) ON DELETE CASCADE,
  grade         TEXT,   -- مثال: "الأول الابتدائي" (كل فصول الصف)
  stage         TEXT,   -- مثال: "المرحلة الابتدائية" (كل المرحلة)

  subject       TEXT NOT NULL,
  notes         TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS teacher_class_assignments_teacher_idx
  ON teacher_class_assignments(org_id, teacher_id);

CREATE INDEX IF NOT EXISTS teacher_class_assignments_classroom_idx
  ON teacher_class_assignments(org_id, class_room_id);
