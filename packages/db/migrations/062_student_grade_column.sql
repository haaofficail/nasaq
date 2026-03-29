-- Add grade column to students for standalone grade tracking (independent of classroom)
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade TEXT;

-- Index for filtering by grade
CREATE INDEX IF NOT EXISTS students_grade_idx ON students (org_id, grade);
