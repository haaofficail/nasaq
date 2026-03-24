-- ============================================================
-- Migration 010: Architecture Foundation
-- Adds capability registry, org overrides, business vocabulary,
-- dashboard profile column, and metadata to audit_logs
-- ============================================================

-- 1. Add dashboardProfile to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS dashboard_profile text DEFAULT 'default';

-- 2. Add metadata to audit_logs for structured context
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS audit_logs_metadata_idx
  ON audit_logs USING gin(metadata);

-- ============================================================
-- 3. CAPABILITY REGISTRY
-- Master list of all possible capabilities with metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS capability_registry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,          -- e.g. "inventory", "pos", "hotel"
  label_ar      text NOT NULL,                 -- الاسم العربي
  label_en      text NOT NULL,                 -- English name
  description   text,
  category      text NOT NULL,                 -- core | vertical | financial | marketing | operational
  requires      text[],                        -- capability keys that must also be enabled
  is_premium    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. ORGANIZATION CAPABILITY OVERRIDES
-- Per-org additions/removals on top of businessType defaults
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_capability_overrides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  capability_key text NOT NULL,
  enabled       boolean NOT NULL DEFAULT true,  -- true = force-on, false = force-off
  reason        text,                           -- why this override was set
  set_by        uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, capability_key)
);

CREATE INDEX IF NOT EXISTS org_cap_overrides_org_idx
  ON organization_capability_overrides(org_id);

-- ============================================================
-- 5. BUSINESS VOCABULARY
-- Org/type-level label overrides (booking = موعد vs حجز vs مشروع)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_vocabulary (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = global for businessType
  business_type text,
  term_key      text NOT NULL,              -- e.g. "booking", "service", "customer", "staff"
  value_ar      text NOT NULL,
  value_en      text,
  context       text,                       -- optional: "plural", "short"
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, term_key)
);

CREATE INDEX IF NOT EXISTS business_vocab_org_idx
  ON business_vocabulary(org_id);
CREATE INDEX IF NOT EXISTS business_vocab_type_idx
  ON business_vocabulary(business_type, term_key)
  WHERE org_id IS NULL;

-- ============================================================
-- 6. SEED: CAPABILITY REGISTRY
-- ============================================================
INSERT INTO capability_registry (key, label_ar, label_en, category, is_premium) VALUES
  -- Core (always available)
  ('bookings',       'الحجوزات',          'Bookings',          'core',        false),
  ('customers',      'العملاء',           'Customers',         'core',        false),
  ('catalog',        'الكتالوج',          'Catalog',           'core',        false),
  ('media',          'الوسائط',           'Media',             'core',        false),
  ('team',           'الفريق',            'Team',              'core',        false),
  ('settings',       'الإعدادات',         'Settings',          'core',        false),

  -- Financial
  ('finance',        'المالية الأساسية',  'Finance',           'financial',   false),
  ('accounting',     'المحاسبة الكاملة', 'Full Accounting',   'financial',   true),
  ('reconciliation', 'التسوية البنكية',  'Reconciliation',    'financial',   true),
  ('treasury',       'الخزينة',           'Treasury',          'financial',   true),
  ('pos',            'نقطة البيع',        'Point of Sale',     'financial',   false),

  -- Inventory & Assets
  ('inventory',      'المخزون',           'Inventory',         'operational', false),
  ('assets',         'الأصول',            'Assets',            'operational', false),
  ('suppliers',      'الموردين',          'Suppliers',         'operational', false),

  -- Verticals
  ('floral',         'زهور - متجر',       'Floral Retail',     'vertical',    false),
  ('kosha',          'زهور - كوشات',      'Floral Kosha',      'vertical',    false),
  ('flower_master',  'إدارة الزهور',      'Flower Master',     'vertical',    false),
  ('hotel',          'الفندقة',           'Hotel',             'vertical',    false),
  ('car_rental',     'تأجير السيارات',    'Car Rental',        'vertical',    false),
  ('restaurant',     'المطعم',            'Restaurant',        'vertical',    false),
  ('menu',           'قائمة الطعام',      'Menu',              'vertical',    false),
  ('online_orders',  'الطلبات الإلكترونية', 'Online Orders',   'vertical',    false),
  ('attendance',     'الحضور والانصراف', 'Attendance',        'operational', false),
  ('schedules',      'جداول العمل',       'Schedules',         'operational', false),

  -- Marketing & Growth
  ('marketing',      'التسويق',           'Marketing',         'marketing',   true),
  ('website',        'الموقع الإلكتروني', 'Website',           'marketing',   true),
  ('messaging',      'الرسائل',           'Messaging',         'marketing',   false),
  ('automation',     'الأتمتة',           'Automation',        'marketing',   true),

  -- Advanced
  ('contracts',      'العقود',            'Contracts',         'operational', false),
  ('delivery',       'التوصيل',           'Delivery',          'operational', false),
  ('bundles',        'الباقات',           'Bundles',           'operational', false),
  ('marketplace',    'المتجر',            'Marketplace',       'marketing',   true),
  ('approvals',      'الموافقات',         'Approvals',         'operational', false),
  ('reports',        'التقارير',          'Reports',           'core',        false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. SEED: BUSINESS VOCABULARY (global defaults by businessType)
-- ============================================================
INSERT INTO business_vocabulary (org_id, business_type, term_key, value_ar, value_en) VALUES
  -- salon / barber / spa
  (NULL, 'salon',       'booking',  'موعد',    'Appointment'),
  (NULL, 'salon',       'service',  'خدمة',    'Service'),
  (NULL, 'salon',       'customer', 'عميلة',   'Client'),
  (NULL, 'barber',      'booking',  'حلاقة',   'Haircut'),
  (NULL, 'barber',      'customer', 'زبون',    'Customer'),
  -- flower_shop
  (NULL, 'flower_shop', 'booking',  'طلب',     'Order'),
  (NULL, 'flower_shop', 'service',  'تنسيق',   'Arrangement'),
  (NULL, 'flower_shop', 'customer', 'عميل',    'Customer'),
  -- hotel
  (NULL, 'hotel',       'booking',  'حجز',     'Reservation'),
  (NULL, 'hotel',       'service',  'غرفة',    'Room'),
  (NULL, 'hotel',       'customer', 'نزيل',    'Guest'),
  -- car_rental
  (NULL, 'car_rental',  'booking',  'عقد إيجار', 'Rental Contract'),
  (NULL, 'car_rental',  'service',  'سيارة',   'Vehicle'),
  (NULL, 'car_rental',  'customer', 'مستأجر',  'Renter'),
  -- restaurant / cafe
  (NULL, 'restaurant',  'booking',  'حجز طاولة', 'Table Reservation'),
  (NULL, 'restaurant',  'service',  'طبق',     'Dish'),
  (NULL, 'restaurant',  'customer', 'زبون',    'Guest'),
  -- photography
  (NULL, 'photography', 'booking',  'جلسة',    'Session'),
  (NULL, 'photography', 'service',  'باقة تصوير', 'Photography Package'),
  (NULL, 'photography', 'customer', 'عميل',    'Client'),
  -- events
  (NULL, 'events',      'booking',  'مناسبة',  'Event'),
  (NULL, 'events',      'service',  'خدمة مناسبات', 'Event Service'),
  (NULL, 'events',      'customer', 'صاحب المناسبة', 'Client'),
  -- retail / store
  (NULL, 'retail',      'booking',  'طلب',     'Order'),
  (NULL, 'retail',      'service',  'منتج',    'Product'),
  (NULL, 'retail',      'customer', 'عميل',    'Customer'),
  -- general / default
  (NULL, 'general',     'booking',  'حجز',     'Booking'),
  (NULL, 'general',     'service',  'خدمة',    'Service'),
  (NULL, 'general',     'customer', 'عميل',    'Customer')
ON CONFLICT (org_id, term_key) DO NOTHING;
