-- ============================================================
-- Migration 037: Events & Tickets System
-- نظام الفعاليات والتذاكر — بنية تحتية كاملة
-- ============================================================

-- Enums
CREATE TYPE event_status AS ENUM (
  'draft', 'published', 'sold_out', 'ongoing', 'completed', 'cancelled'
);

CREATE TYPE ticket_type_status AS ENUM (
  'active', 'paused', 'sold_out'
);

CREATE TYPE ticket_issuance_status AS ENUM (
  'issued', 'checked_in', 'cancelled', 'transferred'
);

CREATE TYPE seat_status AS ENUM (
  'available', 'reserved', 'sold', 'blocked'
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id         UUID REFERENCES locations(id) ON DELETE SET NULL,

  name                TEXT NOT NULL,
  name_en             TEXT,
  description         TEXT,
  cover_image         TEXT,

  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  doors_open_at       TIMESTAMPTZ,

  venue_name          TEXT,
  venue_address       TEXT,
  venue_city          TEXT,
  venue_map_url       TEXT,

  total_capacity      INTEGER,
  sold_tickets        INTEGER NOT NULL DEFAULT 0,
  reserved_tickets    INTEGER NOT NULL DEFAULT 0,

  min_price           NUMERIC(10,2),
  max_price           NUMERIC(10,2),

  has_seating         BOOLEAN DEFAULT FALSE,
  allow_transfer      BOOLEAN DEFAULT FALSE,
  requires_approval   BOOLEAN DEFAULT FALSE,

  tags                JSONB DEFAULT '[]',
  age_restriction     INTEGER,

  status              event_status NOT NULL DEFAULT 'draft',

  created_by          UUID REFERENCES users(id),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_org_id_idx        ON events(org_id);
CREATE INDEX IF NOT EXISTS events_org_status_idx    ON events(org_id, status);
CREATE INDEX IF NOT EXISTS events_org_starts_at_idx ON events(org_id, starts_at);

-- Ticket Types
CREATE TABLE IF NOT EXISTS ticket_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  name              TEXT NOT NULL,
  name_en           TEXT,
  description       TEXT,

  price             NUMERIC(10,2) NOT NULL,

  total_quantity    INTEGER NOT NULL,
  sold_quantity     INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,

  max_per_order     INTEGER DEFAULT 10,
  min_per_order     INTEGER DEFAULT 1,

  sale_starts_at    TIMESTAMPTZ,
  sale_ends_at      TIMESTAMPTZ,

  seat_section_id   UUID,

  sort_order        INTEGER DEFAULT 0,
  status            ticket_type_status NOT NULL DEFAULT 'active',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_types_event_idx ON ticket_types(event_id);

-- Seat Sections
CREATE TABLE IF NOT EXISTS seat_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  name          TEXT NOT NULL,
  name_en       TEXT,
  color         TEXT,
  row_count     INTEGER,
  seats_per_row INTEGER,
  total_seats   INTEGER,
  sort_order    INTEGER DEFAULT 0,

  position_x    NUMERIC(8,2),
  position_y    NUMERIC(8,2),
  width         NUMERIC(8,2),
  height        NUMERIC(8,2),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seat_sections_event_idx ON seat_sections(event_id);

-- Seats
CREATE TABLE IF NOT EXISTS seats (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  section_id            UUID NOT NULL REFERENCES seat_sections(id) ON DELETE CASCADE,

  row                   TEXT NOT NULL,
  number                INTEGER NOT NULL,
  label                 TEXT,

  status                seat_status NOT NULL DEFAULT 'available',

  held_until            TIMESTAMPTZ,
  held_by_customer_id   UUID,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS seats_event_section_row_num_uidx
  ON seats(event_id, section_id, row, number);
CREATE INDEX IF NOT EXISTS seats_event_status_idx ON seats(event_id, status);

-- Ticket Issuances
CREATE TABLE IF NOT EXISTS ticket_issuances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id        UUID NOT NULL REFERENCES ticket_types(id),
  booking_id            UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  seat_id               UUID REFERENCES seats(id) ON DELETE SET NULL,

  ticket_number         TEXT NOT NULL,
  qr_code               TEXT NOT NULL,
  barcode               TEXT,

  attendee_name         TEXT,
  attendee_phone        TEXT,
  attendee_email        TEXT,

  paid_price            NUMERIC(10,2) NOT NULL,
  vat_amount            NUMERIC(10,2) DEFAULT 0,

  checked_in_at         TIMESTAMPTZ,
  checked_in_by         UUID REFERENCES users(id) ON DELETE SET NULL,

  transferred_from_id   UUID,
  transferred_at        TIMESTAMPTZ,

  status                ticket_issuance_status NOT NULL DEFAULT 'issued',

  issued_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ticket_issuances_qr_uidx
  ON ticket_issuances(qr_code);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_issuances_number_uidx
  ON ticket_issuances(org_id, ticket_number);
CREATE INDEX IF NOT EXISTS ticket_issuances_event_idx    ON ticket_issuances(event_id);
CREATE INDEX IF NOT EXISTS ticket_issuances_booking_idx  ON ticket_issuances(booking_id);
CREATE INDEX IF NOT EXISTS ticket_issuances_customer_idx ON ticket_issuances(customer_id);
CREATE INDEX IF NOT EXISTS ticket_issuances_status_idx   ON ticket_issuances(event_id, status);
