-- 140: Composite indexes for bookings query performance
-- Covers the most frequent query patterns in bookings.ts:
--   1. List by org + status (most common filter)
--   2. List by org + createdAt (default sort)
--   3. List by org + eventDate (upcoming bookings)
--   4. List by org + customerId (customer profile 360)

CREATE INDEX IF NOT EXISTS bookings_org_status_idx
  ON bookings (org_id, status);

CREATE INDEX IF NOT EXISTS bookings_org_created_idx
  ON bookings (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bookings_org_event_date_idx
  ON bookings (org_id, event_date)
  WHERE event_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_org_customer_idx
  ON bookings (org_id, customer_id);

-- payments: frequent lookup by booking_id + created_at
CREATE INDEX IF NOT EXISTS payments_booking_created_idx
  ON payments (booking_id, created_at DESC);

-- message_logs: frequent lookup by org_id + created_at (bulk send history)
CREATE INDEX IF NOT EXISTS message_logs_org_created_idx
  ON message_logs (org_id, created_at DESC);
