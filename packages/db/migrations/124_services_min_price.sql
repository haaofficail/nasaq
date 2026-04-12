-- إضافة حد أدنى للسعر على مستوى الخدمة
-- يُستخدم في POS لمنع تعديل السعر تحت الحد (server-side enforcement)

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS min_price NUMERIC(10, 2) DEFAULT NULL;

COMMENT ON COLUMN services.min_price IS 'الحد الأدنى المسموح به للسعر في POS — NULL = لا قيد';
