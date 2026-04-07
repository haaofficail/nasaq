-- ============================================================
-- Migration 111: Canonical Booking Completion (Phase 1)
-- Adds canonical booking aggregate tables only.
-- No data migration, no backfill, no legacy table changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS booking_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  booking_ref         UUID REFERENCES bookings(id),

  booking_number      TEXT NOT NULL UNIQUE,
  booking_type        TEXT NOT NULL DEFAULT 'appointment',

  status              TEXT NOT NULL DEFAULT 'pending',
  payment_status      TEXT NOT NULL DEFAULT 'pending',

  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ,
  setup_at            TIMESTAMPTZ,
  teardown_at         TIMESTAMPTZ,

  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,
  custom_location     TEXT,
  location_notes      TEXT,

  subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  vat_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due         NUMERIC(12,2) NOT NULL DEFAULT 0,

  source              TEXT DEFAULT 'dashboard',
  tracking_token      TEXT UNIQUE,
  customer_notes      TEXT,
  internal_notes      TEXT,
  question_answers    JSONB DEFAULT '[]',
  metadata            JSONB DEFAULT '{}',

  assigned_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_id           UUID REFERENCES users(id) ON DELETE SET NULL,

  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  reviewed_at         TIMESTAMPTZ,
  rating              INTEGER,
  review_text         TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_records_org_idx       ON booking_records(org_id);
CREATE INDEX IF NOT EXISTS booking_records_customer_idx  ON booking_records(customer_id);
CREATE INDEX IF NOT EXISTS booking_records_type_idx      ON booking_records(booking_type);
CREATE INDEX IF NOT EXISTS booking_records_status_idx    ON booking_records(status);
CREATE INDEX IF NOT EXISTS booking_records_starts_at_idx ON booking_records(starts_at);
CREATE INDEX IF NOT EXISTS booking_records_ref_idx       ON booking_records(booking_ref);


CREATE TABLE IF NOT EXISTS booking_lines (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_record_id   UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE,

  item_ref_id         UUID,
  service_ref_id      UUID,
  line_type           TEXT NOT NULL DEFAULT 'service',

  item_name           TEXT NOT NULL,
  item_type           TEXT,
  duration_minutes    INTEGER,
  vat_inclusive       BOOLEAN NOT NULL DEFAULT TRUE,

  quantity            INTEGER NOT NULL DEFAULT 1,
  unit_price          NUMERIC(10,2) NOT NULL,
  total_price         NUMERIC(12,2) NOT NULL,
  pricing_breakdown   JSONB DEFAULT '[]',
  snapshot            JSONB DEFAULT '{}',
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_lines_record_idx      ON booking_lines(booking_record_id);
CREATE INDEX IF NOT EXISTS booking_lines_item_ref_idx    ON booking_lines(item_ref_id);
CREATE INDEX IF NOT EXISTS booking_lines_service_ref_idx ON booking_lines(service_ref_id);


CREATE TABLE IF NOT EXISTS booking_line_addons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_line_id     UUID NOT NULL REFERENCES booking_lines(id) ON DELETE CASCADE,

  addon_ref_id        UUID,
  addon_name          TEXT NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1,
  unit_price          NUMERIC(10,2) NOT NULL,
  total_price         NUMERIC(12,2) NOT NULL,
  snapshot            JSONB DEFAULT '{}',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_line_addons_line_idx ON booking_line_addons(booking_line_id);
CREATE INDEX IF NOT EXISTS booking_line_addons_ref_idx  ON booking_line_addons(addon_ref_id);


CREATE TABLE IF NOT EXISTS booking_timeline_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_record_id   UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,

  event_type          TEXT NOT NULL,
  from_status         TEXT,
  to_status           TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_timeline_events_record_idx  ON booking_timeline_events(booking_record_id);
CREATE INDEX IF NOT EXISTS booking_timeline_events_org_idx     ON booking_timeline_events(org_id);
CREATE INDEX IF NOT EXISTS booking_timeline_events_type_idx    ON booking_timeline_events(event_type);
CREATE INDEX IF NOT EXISTS booking_timeline_events_created_idx ON booking_timeline_events(created_at);


CREATE TABLE IF NOT EXISTS booking_record_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_record_id   UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id),

  role                TEXT NOT NULL DEFAULT 'staff',
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_record_assignments_record_idx ON booking_record_assignments(booking_record_id);
CREATE INDEX IF NOT EXISTS booking_record_assignments_user_idx   ON booking_record_assignments(user_id);
CREATE INDEX IF NOT EXISTS booking_record_assignments_org_idx    ON booking_record_assignments(org_id);


CREATE TABLE IF NOT EXISTS booking_record_commissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_record_id   UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE,
  booking_line_id     UUID REFERENCES booking_lines(id) ON DELETE SET NULL,
  user_id             UUID NOT NULL REFERENCES users(id),

  service_ref_id      UUID,
  commission_mode     TEXT NOT NULL DEFAULT 'percentage',
  rate                NUMERIC(10,2) NOT NULL DEFAULT 0,
  base_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_record_commissions_record_idx ON booking_record_commissions(booking_record_id);
CREATE INDEX IF NOT EXISTS booking_record_commissions_line_idx   ON booking_record_commissions(booking_line_id);
CREATE INDEX IF NOT EXISTS booking_record_commissions_user_idx   ON booking_record_commissions(user_id);
CREATE INDEX IF NOT EXISTS booking_record_commissions_org_idx    ON booking_record_commissions(org_id);


CREATE TABLE IF NOT EXISTS booking_consumptions_canonical (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_record_id   UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE,
  booking_line_id     UUID REFERENCES booking_lines(id) ON DELETE SET NULL,

  supply_id           UUID,
  inventory_item_id   UUID,
  quantity            NUMERIC(10,2) NOT NULL,
  unit                TEXT,
  consumed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata            JSONB DEFAULT '{}',
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_consumptions_canonical_record_idx ON booking_consumptions_canonical(booking_record_id);
CREATE INDEX IF NOT EXISTS booking_consumptions_canonical_line_idx   ON booking_consumptions_canonical(booking_line_id);
CREATE INDEX IF NOT EXISTS booking_consumptions_canonical_org_idx    ON booking_consumptions_canonical(org_id);
CREATE INDEX IF NOT EXISTS booking_consumptions_canonical_supply_idx ON booking_consumptions_canonical(supply_id);


CREATE TABLE IF NOT EXISTS booking_payment_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_record_id   UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE,
  payment_id          UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  link_type           TEXT NOT NULL DEFAULT 'payment',
  amount_applied      NUMERIC(12,2),
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_payment_links_record_idx  ON booking_payment_links(booking_record_id);
CREATE INDEX IF NOT EXISTS booking_payment_links_payment_idx ON booking_payment_links(payment_id);
CREATE INDEX IF NOT EXISTS booking_payment_links_org_idx     ON booking_payment_links(org_id);
