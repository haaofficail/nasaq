-- Migration 147: Add booking_record_id FK to engine tables
-- Wave 2 (Phase 3.A.2 TODO 5): canonical POST / needs to link engine rows to booking_records
--
-- booking_records.bookingRef and engine_table.bookingRef both reference bookings.id (legacy).
-- For new canonical bookings, we link via booking_record_id (nullable, set only for canonical bookings).
-- Legacy rows keep bookingRef populated; booking_record_id stays NULL until Phase 3.D.

ALTER TABLE appointment_bookings
  ADD COLUMN IF NOT EXISTS booking_record_id UUID
    REFERENCES booking_records(id) ON DELETE CASCADE;

ALTER TABLE stay_bookings
  ADD COLUMN IF NOT EXISTS booking_record_id UUID
    REFERENCES booking_records(id) ON DELETE CASCADE;

ALTER TABLE table_reservations
  ADD COLUMN IF NOT EXISTS booking_record_id UUID
    REFERENCES booking_records(id) ON DELETE CASCADE;

ALTER TABLE event_bookings
  ADD COLUMN IF NOT EXISTS booking_record_id UUID
    REFERENCES booking_records(id) ON DELETE CASCADE;

-- Indexes for reverse lookup: engine_table → booking_records
CREATE INDEX IF NOT EXISTS appt_bookings_record_id_idx ON appointment_bookings(booking_record_id);
CREATE INDEX IF NOT EXISTS stay_bookings_record_id_idx ON stay_bookings(booking_record_id);
CREATE INDEX IF NOT EXISTS table_res_record_id_idx ON table_reservations(booking_record_id);
CREATE INDEX IF NOT EXISTS event_bookings_record_id_idx ON event_bookings(booking_record_id);
