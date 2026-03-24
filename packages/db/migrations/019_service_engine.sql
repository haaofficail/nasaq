-- Migration 019: Service Engine — operational fields + staff assignment table
-- Adds the fields needed to make a service a full operational entity:
-- serviceType, pricingMode, assignmentMode, visibility flags, buffer split, displayName
-- Plus: service_staff table for per-staff assignment + commission overrides

-- ── Add operational columns to services ─────────────────────────────────────

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS service_type          TEXT NOT NULL DEFAULT 'single',
    -- single | session | package | add_on | bundle
  ADD COLUMN IF NOT EXISTS service_pricing_mode  TEXT NOT NULL DEFAULT 'fixed',
    -- fixed | from_price | variable
  ADD COLUMN IF NOT EXISTS assignment_mode       TEXT NOT NULL DEFAULT 'open',
    -- open (any staff) | restricted (specific staff only)
  ADD COLUMN IF NOT EXISTS is_bookable           BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_visible_in_pos     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_visible_online     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_name          TEXT;
    -- customer-facing name if different from internal name

-- ── service_staff — per-staff assignment + commission overrides ──────────────

CREATE TABLE IF NOT EXISTS service_staff (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID        NOT NULL,
  service_id              UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id                 UUID        NOT NULL,
  commission_mode         TEXT        NOT NULL DEFAULT 'inherit',
    -- inherit (use service default) | none | percentage | fixed
  commission_value        NUMERIC(10, 2) DEFAULT 0,
  custom_duration_minutes INTEGER,       -- override service duration for this staff member
  custom_price            NUMERIC(10, 2),-- override base price for this staff member
  is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id, user_id)
);

CREATE INDEX IF NOT EXISTS ss_service_idx ON service_staff (service_id);
CREATE INDEX IF NOT EXISTS ss_org_idx     ON service_staff (org_id);
CREATE INDEX IF NOT EXISTS ss_user_idx    ON service_staff (user_id);
