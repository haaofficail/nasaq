-- ============================================================
-- Migration 008: Constitution Fields (Q2 + Soft Delete)
-- Run: psql $DATABASE_URL -f 008_constitution_fields.sql
-- ============================================================

-- ============================================================
-- 1. Organizations: operating_profile + service_delivery_modes + enabled_capabilities
-- ============================================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS operating_profile TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS service_delivery_modes JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS enabled_capabilities JSONB DEFAULT '["bookings","customers","catalog","media"]';

-- Auto-populate based on existing business_type
UPDATE organizations SET
  operating_profile = CASE
    WHEN business_type = 'flower_shop'                        THEN 'florist_retail'
    WHEN business_type IN ('restaurant','cafe')               THEN 'restaurant_dine_in'
    WHEN business_type = 'catering'                           THEN 'restaurant_catering'
    WHEN business_type = 'bakery'                             THEN 'restaurant_dine_in'
    WHEN business_type IN ('salon','barber')                  THEN 'salon_in_branch'
    WHEN business_type = 'spa'                                THEN 'salon_spa'
    WHEN business_type = 'fitness'                            THEN 'salon_in_branch'
    WHEN business_type = 'hotel'                              THEN 'hotel_standard'
    WHEN business_type = 'car_rental'                         THEN 'car_rental_daily'
    WHEN business_type = 'rental'                             THEN 'rental_equipment'
    WHEN business_type = 'events'                             THEN 'events_full'
    ELSE 'general'
  END,
  service_delivery_modes = CASE
    WHEN business_type = 'flower_shop'                        THEN '["on_site","delivery","pickup"]'::jsonb
    WHEN business_type IN ('restaurant','cafe','bakery')      THEN '["on_site","delivery","pickup"]'::jsonb
    WHEN business_type = 'catering'                           THEN '["at_customer_location","delivery"]'::jsonb
    WHEN business_type IN ('salon','barber','spa','fitness')  THEN '["on_site","at_customer_location"]'::jsonb
    WHEN business_type = 'hotel'                              THEN '["on_site","reservation_based"]'::jsonb
    WHEN business_type = 'car_rental'                         THEN '["pickup","at_customer_location"]'::jsonb
    WHEN business_type = 'rental'                             THEN '["delivery","pickup","on_site"]'::jsonb
    WHEN business_type = 'events'                             THEN '["at_customer_location","on_site"]'::jsonb
    ELSE '["on_site"]'::jsonb
  END,
  enabled_capabilities = CASE
    WHEN business_type = 'flower_shop'                        THEN '["bookings","customers","catalog","media","inventory","floral","pos","website"]'::jsonb
    WHEN business_type IN ('restaurant','cafe','bakery')      THEN '["bookings","customers","catalog","media","pos","website","schedules"]'::jsonb
    WHEN business_type = 'catering'                           THEN '["bookings","customers","catalog","media","inventory","contracts","website"]'::jsonb
    WHEN business_type IN ('salon','barber','spa','fitness')  THEN '["bookings","customers","catalog","media","attendance","schedules","pos","website"]'::jsonb
    WHEN business_type = 'hotel'                              THEN '["bookings","customers","catalog","media","inventory","accounting","website","hotel"]'::jsonb
    WHEN business_type = 'car_rental'                         THEN '["bookings","customers","catalog","media","assets","contracts","accounting","car_rental"]'::jsonb
    WHEN business_type = 'rental'                             THEN '["bookings","customers","catalog","media","assets","inventory","contracts","accounting"]'::jsonb
    WHEN business_type = 'events'                             THEN '["bookings","customers","catalog","media","inventory","contracts","attendance","website"]'::jsonb
    ELSE '["bookings","customers","catalog","media"]'::jsonb
  END
WHERE operating_profile = 'general';

-- ============================================================
-- 2. Soft Delete: roles
-- ============================================================
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- 3. Soft Delete: vendor_profiles
-- ============================================================
ALTER TABLE vendor_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- 4. Soft Delete: site_pages
-- ============================================================
ALTER TABLE site_pages
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- 5. Soft Delete: raw SQL tables (suppliers, arrangements, menu, etc.)
-- ============================================================
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE flower_packages
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE menu_categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE attendance_schedules
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE pos_quick_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE message_variables
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE flower_builder_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
