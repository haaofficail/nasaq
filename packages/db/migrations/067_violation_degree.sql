-- 067: إضافة درجة المخالفة لجدول المخالفات المدرسية
ALTER TABLE school_violations ADD COLUMN IF NOT EXISTS degree TEXT NOT NULL DEFAULT '1';
CREATE INDEX IF NOT EXISTS school_violations_degree_idx ON school_violations(org_id, degree);
