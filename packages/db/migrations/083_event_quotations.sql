-- ============================================================
-- Migration 083: Event Quotations + Execution Tasks
-- Adds quotation/contract flow and execution tracking to events
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE event_quotation_status AS ENUM ('draft','sent','accepted','rejected','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_execution_task_status AS ENUM ('pending','in_progress','done','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- event_quotations
CREATE TABLE IF NOT EXISTS event_quotations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id          UUID REFERENCES events(id) ON DELETE SET NULL,
  quotation_number  TEXT NOT NULL,
  client_name       TEXT NOT NULL,
  client_phone      TEXT,
  client_email      TEXT,
  title             TEXT NOT NULL,
  event_date        DATE,
  event_venue       TEXT,
  guest_count       INTEGER,
  notes             TEXT,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate          NUMERIC(5,2) NOT NULL DEFAULT 15,
  vat_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_required  NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until       DATE,
  payment_terms     TEXT,
  status            event_quotation_status NOT NULL DEFAULT 'draft',
  accepted_at       TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_quotations_org_idx    ON event_quotations(org_id);
CREATE INDEX IF NOT EXISTS event_quotations_status_idx ON event_quotations(org_id, status);

-- Sequence for quotation numbers
CREATE SEQUENCE IF NOT EXISTS event_quotation_seq START 1;

-- event_quotation_items
CREATE TABLE IF NOT EXISTS event_quotation_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quotation_id  UUID NOT NULL REFERENCES event_quotations(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  category      TEXT,
  qty           NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL,
  total_price   NUMERIC(12,2) NOT NULL,
  notes         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_quotation_items_quotation_idx ON event_quotation_items(quotation_id);

-- event_execution_tasks
CREATE TABLE IF NOT EXISTS event_execution_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE,
  quotation_id  UUID REFERENCES event_quotations(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  assigned_to   TEXT,
  due_date      TIMESTAMPTZ,
  event_phase   TEXT NOT NULL DEFAULT 'pre_event',
  status        event_execution_task_status NOT NULL DEFAULT 'pending',
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_execution_tasks_org_idx    ON event_execution_tasks(org_id);
CREATE INDEX IF NOT EXISTS event_execution_tasks_event_idx  ON event_execution_tasks(event_id);
CREATE INDEX IF NOT EXISTS event_execution_tasks_status_idx ON event_execution_tasks(org_id, status);
