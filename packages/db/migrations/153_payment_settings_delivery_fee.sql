-- 153: أضف عمود رسوم التوصيل الافتراضية إلى payment_settings
ALTER TABLE payment_settings
  ADD COLUMN IF NOT EXISTS default_delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;
