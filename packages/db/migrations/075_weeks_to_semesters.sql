-- ============================================================
-- 075 — Link schedule_weeks to school_semesters
-- ============================================================

-- Add semester_id to schedule_weeks
ALTER TABLE schedule_weeks
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES school_semesters(id) ON DELETE SET NULL;

-- Make template_id nullable (backward compat — weeks no longer require a template)
ALTER TABLE schedule_weeks
  ALTER COLUMN template_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS schedule_weeks_semester_idx ON schedule_weeks(org_id, semester_id);
