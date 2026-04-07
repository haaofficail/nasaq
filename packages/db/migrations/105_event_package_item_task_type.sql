-- Migration 105: إضافة نوع "task" لبنود خطط التجهيز
-- يسمح بإضافة بنود من نوع مهمة/عمالة لخطط التجهيز

ALTER TABLE event_package_template_items
  DROP CONSTRAINT IF EXISTS epti_type_check;

ALTER TABLE event_package_template_items
  ADD CONSTRAINT epti_type_check CHECK (
    item_type = ANY (ARRAY[
      'asset'::text,
      'consumable_natural'::text,
      'consumable_product'::text,
      'service_fee'::text,
      'task'::text
    ])
  );
