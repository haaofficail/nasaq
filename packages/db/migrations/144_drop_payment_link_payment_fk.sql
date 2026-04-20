-- Migration 144: Drop FK from booking_payment_links.payment_id
--
-- Phase 1.5 changed canonical-bookings.ts to remove this FK reference because
-- the payments table lives in bookings.ts (legacy schema). The FK will be
-- re-added in Phase 3 after payments moves to its own schema file.
--
-- This migration makes the DB consistent with the TypeScript schema.

ALTER TABLE booking_payment_links
  DROP CONSTRAINT IF EXISTS booking_payment_links_payment_id_payments_id_fk;
