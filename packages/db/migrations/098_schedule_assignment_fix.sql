-- ============================================================
-- Migration 098: Fix employee_schedule_assignments unique constraint
-- يضيف unique constraint مطلوب لعمل ON CONFLICT في route الجدولة
-- ============================================================

-- 1. أزل التكرارات إن وجدت (احتفظ بالأحدث فقط)
DELETE FROM employee_schedule_assignments a
WHERE a.id <> (
  SELECT b.id FROM employee_schedule_assignments b
  WHERE b.org_id = a.org_id
    AND b.user_id = a.user_id
    AND b.effective_from = a.effective_from
  ORDER BY b.created_at DESC
  LIMIT 1
);

-- 2. أضف الـ unique constraint
ALTER TABLE employee_schedule_assignments
  ADD CONSTRAINT uq_emp_sched_org_user_date
  UNIQUE (org_id, user_id, effective_from);
