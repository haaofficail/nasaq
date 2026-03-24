-- Migration 018: Restaurant Booking Settings
-- Tables: restaurant_sections, restaurant_booking_config

-- Dining sections / zones (Terrace, Indoor, VIP, etc.)
CREATE TABLE IF NOT EXISTS restaurant_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL,
  name        TEXT NOT NULL,
  name_en     TEXT,
  capacity    INT  NOT NULL DEFAULT 20,   -- max guests in this section
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT  NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);
CREATE INDEX IF NOT EXISTS restaurant_sections_org_idx ON restaurant_sections (org_id);

-- Booking configuration (one row per org, JSONB for flexibility)
CREATE TABLE IF NOT EXISTS restaurant_booking_config (
  org_id                      UUID PRIMARY KEY,
  min_guests                  INT  NOT NULL DEFAULT 1,
  max_guests                  INT  NOT NULL DEFAULT 12,
  slot_duration_min           INT  NOT NULL DEFAULT 60,   -- reservation slot in minutes
  advance_booking_days        INT  NOT NULL DEFAULT 30,   -- how far ahead guests can book
  min_notice_hours            INT  NOT NULL DEFAULT 2,    -- min hours before booking
  waitlist_enabled            BOOLEAN NOT NULL DEFAULT false,
  auto_confirm                BOOLEAN NOT NULL DEFAULT false,
  special_requests_enabled    BOOLEAN NOT NULL DEFAULT true,
  max_concurrent_per_slot     INT  NOT NULL DEFAULT 5,    -- max bookings in same slot
  turnover_time_min           INT  NOT NULL DEFAULT 15,   -- buffer between seatings
  deposit_required            BOOLEAN NOT NULL DEFAULT false,
  deposit_amount              NUMERIC(12,2) DEFAULT 0,
  cancellation_hours          INT  NOT NULL DEFAULT 24,   -- cancel by N hours before
  notes                       TEXT,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
