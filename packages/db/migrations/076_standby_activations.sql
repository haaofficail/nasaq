-- Migration 076: حصص الانتظار — school_standby_activations
-- يُسجَّل عند تكليف معلم لتغطية فصل في حال غياب المعلم الأصلي

CREATE TABLE IF NOT EXISTS school_standby_activations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  activation_date   DATE        NOT NULL,

  absent_teacher_id  UUID        REFERENCES teacher_profiles(id) ON DELETE SET NULL,
  standby_teacher_id UUID        NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,

  class_room_id     UUID        REFERENCES class_rooms(id) ON DELETE SET NULL,
  subject           TEXT        NOT NULL,

  period_label      TEXT,
  start_time        TEXT,
  end_time          TEXT,

  notes             TEXT,
  notified          BOOLEAN     NOT NULL DEFAULT false,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS standby_activations_org_date_idx  ON school_standby_activations(org_id, activation_date);
CREATE INDEX IF NOT EXISTS standby_activations_absent_idx    ON school_standby_activations(org_id, absent_teacher_id);
CREATE INDEX IF NOT EXISTS standby_activations_standby_idx   ON school_standby_activations(org_id, standby_teacher_id);
