-- Migration 077: إعدادات توقيت الدوام المدرسي
-- يدعم ضبط بداية الدوام ونهايته مع مراعاة المناطق والفصول

ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS session_start_time        TEXT DEFAULT '07:30',
  ADD COLUMN IF NOT EXISTS session_end_time          TEXT DEFAULT '14:30',
  ADD COLUMN IF NOT EXISTS period_duration_minutes   INTEGER DEFAULT 45,
  ADD COLUMN IF NOT EXISTS break_duration_minutes    INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS number_of_periods         INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS session_type              TEXT DEFAULT 'winter';
  -- session_type: 'winter' | 'summer' | 'ramadan'
