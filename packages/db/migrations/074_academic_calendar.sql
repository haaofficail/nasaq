-- ============================================================
-- 074 — Academic Calendar: سemesters + events
-- ============================================================

-- school_semesters — الفصول الدراسية
CREATE TABLE IF NOT EXISTS school_semesters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year_label       TEXT NOT NULL,           -- "1446-1447"
  semester_number  INTEGER NOT NULL,        -- 1 or 2
  label            TEXT,                    -- "الفصل الدراسي الأول"
  start_date       DATE,
  end_date         DATE,
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT school_semesters_unique UNIQUE (org_id, year_label, semester_number)
);

CREATE INDEX IF NOT EXISTS school_semesters_org_idx ON school_semesters(org_id);

-- school_event_type enum
DO $$ BEGIN
  CREATE TYPE school_event_type AS ENUM (
    'holiday', 'national_day', 'exam', 'activity', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- school_events — الأحداث والإجازات والاختبارات
CREATE TABLE IF NOT EXISTS school_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  semester_id         UUID REFERENCES school_semesters(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  event_type          school_event_type NOT NULL DEFAULT 'other',
  start_date          DATE NOT NULL,
  end_date            DATE,
  description         TEXT,
  color               TEXT,
  affects_attendance  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS school_events_org_idx      ON school_events(org_id);
CREATE INDEX IF NOT EXISTS school_events_semester_idx ON school_events(org_id, semester_id);
CREATE INDEX IF NOT EXISTS school_events_date_idx     ON school_events(org_id, start_date);

-- Grants
GRANT ALL ON school_semesters TO nasaq;
GRANT ALL ON school_events    TO nasaq;
