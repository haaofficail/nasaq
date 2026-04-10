-- migration 119: enforce service duration
-- يُعيّن مدة افتراضية (30 دقيقة) لأي خدمة مجدولة بدون مدة
-- يضمن عدم وجود NULL في duration_minutes للخدمات المجدولة
-- ملاحظة: لا يُضيف NOT NULL constraint لحماية أنواع أخرى (منتجات، طلبات)

UPDATE services
SET duration_minutes = 30
WHERE duration_minutes IS NULL
  AND service_type IN ('appointment', 'execution', 'field_service');
