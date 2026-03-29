-- 071: إضافة تاريخ الميلاد الهجري لجدول المعلمين
ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth_hijri TEXT;
