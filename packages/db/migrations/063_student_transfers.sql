-- سجل تنقلات الطلاب بين الفصول
CREATE TABLE IF NOT EXISTS student_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_class_id    UUID REFERENCES class_rooms(id) ON DELETE SET NULL,
  to_class_id      UUID NOT NULL REFERENCES class_rooms(id) ON DELETE CASCADE,
  reason           TEXT,
  transferred_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  transferred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS student_transfers_student_idx ON student_transfers (org_id, student_id);
CREATE INDEX IF NOT EXISTS student_transfers_date_idx    ON student_transfers (org_id, transferred_at DESC);
