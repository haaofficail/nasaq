-- Migration 024: Service Sub-Tables (Long-term Architecture)
-- Extracts service concerns into focused tables while keeping services as the primary record.
-- All tables use service_id FK — services remains the single source of truth for identity.
-- Backfills from existing services columns. Old columns NOT dropped here (backward compat).

-- ── 1. service_pricing — pricing model, base price, VAT, deposit ──────────────
CREATE TABLE IF NOT EXISTS service_pricing (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id      UUID         NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,

  pricing_mode    TEXT         NOT NULL DEFAULT 'fixed',   -- fixed | from_price | variable
  base_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        TEXT         NOT NULL DEFAULT 'SAR',
  vat_inclusive   BOOLEAN      NOT NULL DEFAULT TRUE,
  deposit_percent NUMERIC(5,2) NOT NULL DEFAULT 30,

  -- Cancellation policy snapshot
  cancellation_policy JSONB    NOT NULL DEFAULT '{}',

  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_pricing_org_idx ON service_pricing(org_id);

-- ── 2. service_timing — duration, buffers, advance booking rules ──────────────
CREATE TABLE IF NOT EXISTS service_timing (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id           UUID    NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,

  duration_minutes     INTEGER NOT NULL DEFAULT 60,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes  INTEGER NOT NULL DEFAULT 0,
  setup_minutes        INTEGER NOT NULL DEFAULT 0,
  teardown_minutes     INTEGER NOT NULL DEFAULT 0,
  min_advance_hours    INTEGER,
  max_advance_days     INTEGER,

  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_timing_org_idx ON service_timing(org_id);

-- ── 3. service_visibility — bookable, POS, online, featured ──────────────────
CREATE TABLE IF NOT EXISTS service_visibility (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id        UUID    NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,

  is_bookable        BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_in_pos  BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible_online  BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
  assignment_mode    TEXT    NOT NULL DEFAULT 'open',  -- open | restricted

  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_visibility_org_idx ON service_visibility(org_id);

-- ── 4. service_delivery — delivery, pickup, in-venue ─────────────────────────
CREATE TABLE IF NOT EXISTS service_delivery (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id       UUID    NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,

  has_delivery     BOOLEAN NOT NULL DEFAULT FALSE,
  allows_pickup    BOOLEAN NOT NULL DEFAULT FALSE,
  allows_in_venue  BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,

  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS service_delivery_org_idx ON service_delivery(org_id);

-- ── Backfill from existing services columns ───────────────────────────────────

INSERT INTO service_pricing (org_id, service_id, pricing_mode, base_price, currency, vat_inclusive, deposit_percent, cancellation_policy)
SELECT org_id, id,
  COALESCE(service_pricing_mode, 'fixed'),
  COALESCE(base_price, 0),
  COALESCE(currency, 'SAR'),
  COALESCE(vat_inclusive, TRUE),
  COALESCE(deposit_percent::NUMERIC, 30),
  COALESCE(cancellation_policy, '{}')
FROM services
ON CONFLICT (service_id) DO NOTHING;

INSERT INTO service_timing (org_id, service_id, duration_minutes, buffer_before_minutes, buffer_after_minutes, setup_minutes, teardown_minutes, min_advance_hours, max_advance_days)
SELECT org_id, id,
  COALESCE(duration_minutes, 60),
  COALESCE(buffer_before_minutes, 0),
  COALESCE(buffer_after_minutes, 0),
  COALESCE(setup_minutes, 0),
  COALESCE(teardown_minutes, 0),
  min_advance_hours,
  max_advance_days
FROM services
ON CONFLICT (service_id) DO NOTHING;

INSERT INTO service_visibility (org_id, service_id, is_bookable, is_visible_in_pos, is_visible_online, is_featured, assignment_mode)
SELECT org_id, id,
  COALESCE(is_bookable, TRUE),
  COALESCE(is_visible_in_pos, TRUE),
  COALESCE(is_visible_online, TRUE),
  COALESCE(is_featured, FALSE),
  COALESCE(assignment_mode, 'open')
FROM services
ON CONFLICT (service_id) DO NOTHING;

INSERT INTO service_delivery (org_id, service_id, has_delivery, allows_pickup, allows_in_venue, delivery_cost)
SELECT org_id, id,
  COALESCE(has_delivery, FALSE),
  COALESCE(allows_pickup, FALSE),
  COALESCE(allows_in_venue, FALSE),
  COALESCE(delivery_cost::NUMERIC, 0)
FROM services
ON CONFLICT (service_id) DO NOTHING;
