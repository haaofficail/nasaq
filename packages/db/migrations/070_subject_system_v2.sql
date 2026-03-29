-- 070: تحديث نظام المواد الدراسية
-- إضافة: code (مفتاح ثابت)، is_required، weekly_periods، updated_at
-- فرض: قيد "تفكير ناقد" يُطبَّق على مستوى API باستخدام code='critical_thinking'

-- ── subjects ──────────────────────────────────────────────────
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code          TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- ── grade_levels ──────────────────────────────────────────────
ALTER TABLE grade_levels ADD COLUMN IF NOT EXISTS code       TEXT;
ALTER TABLE grade_levels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── subject_grade_levels ──────────────────────────────────────
ALTER TABLE subject_grade_levels ADD COLUMN IF NOT EXISTS is_required    BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE subject_grade_levels ADD COLUMN IF NOT EXISTS weekly_periods INTEGER  DEFAULT 4;
ALTER TABLE subject_grade_levels ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- نسخ weekly_hours → weekly_periods للبيانات الحالية
UPDATE subject_grade_levels SET weekly_periods = weekly_hours WHERE weekly_periods IS NULL;

-- ── ترقيم المواد الحالية بـ code ──────────────────────────────
UPDATE subjects SET code = CASE
  WHEN name IN ('رياضيات')                                                   THEN 'math'
  WHEN name IN ('علوم')                                                       THEN 'science'
  WHEN name IN ('لغتي العربية','لغة عربية','اللغة العربية')                   THEN 'arabic'
  WHEN name IN ('التربية الإسلامية','تربية إسلامية')                          THEN 'islamic'
  WHEN name IN ('الدراسات الاجتماعية والوطنية','دراسات اجتماعية','الدراسات الاجتماعية') THEN 'social_studies'
  WHEN name IN ('اللغة الإنجليزية','إنجليزي','لغة إنجليزية')                  THEN 'english'
  WHEN name IN ('مهارات رقمية')                                               THEN 'digital_skills'
  WHEN name IN ('مهارات حياتية')                                              THEN 'life_skills'
  WHEN name IN ('تفكير ناقد')                                                 THEN 'critical_thinking'
  WHEN name IN ('تربية فنية')                                                 THEN 'art'
  WHEN name IN ('تربية بدنية')                                                THEN 'pe'
  WHEN name IN ('فيزياء')                                                     THEN 'physics'
  WHEN name IN ('كيمياء')                                                     THEN 'chemistry'
  WHEN name IN ('أحياء')                                                      THEN 'biology'
  WHEN name IN ('حاسب آلي')                                                   THEN 'cs'
  ELSE NULL
END
WHERE code IS NULL;

-- ── ترقيم الصفوف الحالية بـ code ─────────────────────────────
UPDATE grade_levels SET code = CASE
  WHEN name IN ('الأول المتوسط','الأول متوسط','اول متوسط')     THEN 'middle_1'
  WHEN name IN ('الثاني المتوسط','الثاني متوسط','ثاني متوسط')  THEN 'middle_2'
  WHEN name IN ('الثالث المتوسط','الثالث متوسط','ثالث متوسط')  THEN 'middle_3'
  WHEN name IN ('الأول الابتدائي','الأول ابتدائي')              THEN 'elem_1'
  WHEN name IN ('الثاني الابتدائي','الثاني ابتدائي')            THEN 'elem_2'
  WHEN name IN ('الثالث الابتدائي','الثالث ابتدائي')            THEN 'elem_3'
  WHEN name IN ('الرابع الابتدائي','الرابع ابتدائي')            THEN 'elem_4'
  WHEN name IN ('الخامس الابتدائي','الخامس ابتدائي')            THEN 'elem_5'
  WHEN name IN ('السادس الابتدائي','السادس ابتدائي')            THEN 'elem_6'
  WHEN name IN ('الأول الثانوي','الأول ثانوي')                  THEN 'high_1'
  WHEN name IN ('الثاني الثانوي','الثاني ثانوي')                THEN 'high_2'
  WHEN name IN ('الثالث الثانوي','الثالث ثانوي')                THEN 'high_3'
  ELSE NULL
END
WHERE code IS NULL;

-- ── Unique indexes ────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS subjects_org_code_idx
  ON subjects(org_id, code) WHERE code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS grade_levels_org_code_idx
  ON grade_levels(org_id, code) WHERE code IS NOT NULL;
