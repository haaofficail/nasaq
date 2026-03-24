-- Migration 022: Booking Engine v2
-- 1. booking_items: add snapshot fields (service_type, duration_minutes, vat_inclusive)
-- 2. booking_assignments: new table — who performed/will perform the booking
-- 3. booking_commissions: new table — computed commissions per assignment

-- ── 1. booking_items snapshot fields ─────────────────────────────────────────
ALTER TABLE booking_items
  ADD COLUMN IF NOT EXISTS service_type       TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes   INTEGER,
  ADD COLUMN IF NOT EXISTS vat_inclusive      BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 2. booking_assignments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_assignments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id    UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES users(id),
  role          TEXT        NOT NULL DEFAULT 'staff',  -- staff | vendor | driver | supervisor
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS booking_assignments_booking_idx ON booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS booking_assignments_user_idx    ON booking_assignments(user_id);
CREATE INDEX IF NOT EXISTS booking_assignments_org_idx     ON booking_assignments(org_id);

-- ── 3. booking_commissions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_commissions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id        UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_item_id   UUID         REFERENCES booking_items(id),
  user_id           UUID         NOT NULL REFERENCES users(id),
  service_id        UUID         REFERENCES services(id),
  commission_mode   TEXT         NOT NULL DEFAULT 'percentage',  -- percentage | fixed
  rate              NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT         NOT NULL DEFAULT 'pending',  -- pending | approved | paid | voided
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS booking_commissions_booking_idx ON booking_commissions(booking_id);
CREATE INDEX IF NOT EXISTS booking_commissions_user_idx    ON booking_commissions(user_id);
CREATE INDEX IF NOT EXISTS booking_commissions_org_idx     ON booking_commissions(org_id);

-- Backfill booking_assignments from existing assignedUserId
INSERT INTO booking_assignments (org_id, booking_id, user_id, role, assigned_at)
SELECT org_id, id, assigned_user_id, 'staff', created_at
FROM bookings
WHERE assigned_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
