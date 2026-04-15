-- ============================================================
-- Migration 135: Composite Index for Rebooking Rate Query
-- يُسرّع self-JOIN على الحجوزات لحساب معدل عودة العميل
-- في /salon/staff-performance
-- ============================================================

-- Index على (org_id, customer_id, event_date) مع فلتر على الحجوزات الفعلية
-- CONCURRENTLY لتجنب قفل الجدول أثناء البناء
CREATE INDEX IF NOT EXISTS idx_bookings_rebooking
  ON bookings(org_id, customer_id, event_date)
  WHERE status NOT IN ('cancelled', 'no_show');
