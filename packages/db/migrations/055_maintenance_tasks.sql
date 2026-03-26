-- Migration 055: Maintenance & Cleaning Tasks
-- Unified task system for all rental types: chalets, apartments, rooms, camps, equipment, hotels

CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Optional links
  service_id     UUID REFERENCES services(id)   ON DELETE SET NULL,
  booking_id     UUID REFERENCES bookings(id)   ON DELETE SET NULL,
  location_id    UUID REFERENCES locations(id)  ON DELETE SET NULL,

  -- Task details
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL DEFAULT 'cleaning',   -- cleaning | maintenance | inspection | damage_repair
  priority       TEXT NOT NULL DEFAULT 'normal',      -- low | normal | high | urgent
  status         TEXT NOT NULL DEFAULT 'pending',     -- pending | in_progress | completed | issue_reported

  -- Assignment
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at    TIMESTAMPTZ,

  -- Schedule
  scheduled_at   TIMESTAMPTZ,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,

  -- Outcome
  notes          TEXT,
  photos         JSONB NOT NULL DEFAULT '[]',
  cost_amount    NUMERIC(10,2),

  created_by_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS maintenance_tasks_org_idx       ON maintenance_tasks(org_id);
CREATE INDEX IF NOT EXISTS maintenance_tasks_service_idx   ON maintenance_tasks(service_id);
CREATE INDEX IF NOT EXISTS maintenance_tasks_booking_idx   ON maintenance_tasks(booking_id);
CREATE INDEX IF NOT EXISTS maintenance_tasks_status_idx    ON maintenance_tasks(org_id, status);
CREATE INDEX IF NOT EXISTS maintenance_tasks_scheduled_idx ON maintenance_tasks(org_id, scheduled_at);
