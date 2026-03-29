-- 069: إضافة الدرجة الافتراضية لتصنيفات المخالفات
-- الربط الذكي: كل تصنيف له درجة افتراضية تُقترح تلقائياً عند اختياره

ALTER TABLE school_violation_categories
  ADD COLUMN IF NOT EXISTS default_degree TEXT NOT NULL DEFAULT '1';

-- تحديث القيم الافتراضية بناءً على الخطورة الحالية
UPDATE school_violation_categories
SET default_degree = CASE
  WHEN severity = 'low'    THEN '1'
  WHEN severity = 'medium' THEN '3'
  WHEN severity = 'high'   THEN '5'
  ELSE '1'
END;
