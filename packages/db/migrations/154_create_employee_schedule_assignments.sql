-- ============================================================
-- Migration 154: Create employee_schedule_assignments
-- الجدول كان مفقوداً من الـ migrations وكان يُنشأ فقط في
-- bootstrap الـ server — هذا الـ migration يصحّح السجل الرسمي.
-- آمن على production: CREATE IF NOT EXISTS + ADD IF NOT EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_schedule_assignments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL,
  schedule_id    UUID        NOT NULL,
  effective_from DATE        NOT NULL,
  effective_to   DATE,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esa_org  ON employee_schedule_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_esa_user ON employee_schedule_assignments(org_id, user_id);

-- أضف الـ unique constraint إن لم يكن موجوداً (098 قد يكون طبّقه على DBs قديمة)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_emp_sched_org_user_date'
  ) THEN
    ALTER TABLE employee_schedule_assignments
      ADD CONSTRAINT uq_emp_sched_org_user_date
      UNIQUE (org_id, user_id, effective_from);
  END IF;
END $$;
