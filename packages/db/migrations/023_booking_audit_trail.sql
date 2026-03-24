-- Migration 023: Booking Audit Trail
-- 1. booking_events  — immutable log of every state change on a booking
-- 2. booking_consumptions — inventory deduction records per booking completion

-- ── 1. booking_events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id   UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES users(id),

  event_type   TEXT        NOT NULL,
    -- created | status_changed | payment_received | note_added
    -- rescheduled | assigned | cancelled | refunded

  from_status  TEXT,
  to_status    TEXT,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  notes        TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS booking_events_booking_idx ON booking_events(booking_id);
CREATE INDEX IF NOT EXISTS booking_events_org_idx     ON booking_events(org_id);
CREATE INDEX IF NOT EXISTS booking_events_type_idx    ON booking_events(event_type);

-- ── 2. booking_consumptions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_consumptions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id       UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_item_id  UUID         REFERENCES booking_items(id),

  -- Supply reference (salon_supplies for now; inventory_item_id for future general inventory)
  supply_id        UUID,
  inventory_item_id UUID,

  quantity         NUMERIC(10,2) NOT NULL,
  unit             TEXT,
  consumed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by       UUID         REFERENCES users(id),
  notes            TEXT,

  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS booking_consumptions_booking_idx ON booking_consumptions(booking_id);
CREATE INDEX IF NOT EXISTS booking_consumptions_org_idx     ON booking_consumptions(org_id);
CREATE INDEX IF NOT EXISTS booking_consumptions_supply_idx  ON booking_consumptions(supply_id);

-- Backfill: create a "created" event for every existing booking
INSERT INTO booking_events (org_id, booking_id, user_id, event_type, to_status, metadata, created_at)
SELECT org_id, id, assigned_user_id, 'created', status::TEXT,
       jsonb_build_object('bookingNumber', booking_number, 'source', source),
       created_at
FROM bookings
ON CONFLICT DO NOTHING;
