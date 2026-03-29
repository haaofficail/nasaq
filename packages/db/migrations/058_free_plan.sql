-- ============================================================
-- 058 — Free Plan: 15-booking lifetime limit
-- يضيف قيمة 'free' للـ enum + عداد الحجوزات للمجانيين
-- ============================================================

-- أضف 'free' للـ enum (يتجاهل إذا كان موجوداً)
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'free';

-- أضف عداد حجوزات المجانيين
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS booking_used integer NOT NULL DEFAULT 0;
