-- Migration 143: Add missing fields to booking_records
-- Phase 1.5 — Pre-Migration Prep
-- Closes feature parity gap between legacy bookings and canonical booking_records

ALTER TABLE booking_records
  ADD COLUMN IF NOT EXISTS coupon_code        TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount    NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS utm_source         TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium         TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign       TEXT,
  ADD COLUMN IF NOT EXISTS utm_term           TEXT,
  ADD COLUMN IF NOT EXISTS utm_content        TEXT,
  ADD COLUMN IF NOT EXISTS is_recurring       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurring_pattern  JSONB,
  ADD COLUMN IF NOT EXISTS parent_booking_id  UUID,
  ADD COLUMN IF NOT EXISTS consent_metadata   JSONB,
  ADD COLUMN IF NOT EXISTS refund_amount      NUMERIC(10, 2);
