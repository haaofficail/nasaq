-- ═══════════════════════════════════════════════════════════
-- Migration 030: Absolute Flex Commercial Engine
-- ═══════════════════════════════════════════════════════════

-- ─── Feature Groups ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_groups (
  id          text PRIMARY KEY,
  name_ar     text NOT NULL,
  name_en     text,
  icon        text,
  sort_order  integer DEFAULT 0,
  is_active   boolean DEFAULT true
);

-- ─── Feature Catalog ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS features_catalog (
  id              text PRIMARY KEY,
  group_id        text REFERENCES feature_groups(id) ON DELETE SET NULL,
  name_ar         text NOT NULL,
  name_en         text,
  description_ar  text,
  type            text DEFAULT 'toggle' CHECK (type IN ('toggle','quota','select','info')),
  icon            text,
  is_core         boolean DEFAULT false,
  is_premium      boolean DEFAULT false,
  is_enterprise   boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ─── Quotas Catalog ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotas_catalog (
  id              text PRIMARY KEY,
  name_ar         text NOT NULL,
  name_en         text,
  unit_ar         text,
  description_ar  text,
  default_value   integer DEFAULT 0,
  hard_cap        integer,                              -- null = no cap
  soft_limit      boolean DEFAULT false,
  overage_policy  text DEFAULT 'block'                 -- 'block' | 'charge' | 'notify'
                  CHECK (overage_policy IN ('block','charge','notify')),
  overage_price   numeric(10,2),
  is_active       boolean DEFAULT true,
  sort_order      integer DEFAULT 0
);

-- ─── Plan Feature Assignments ─────────────────────────────
CREATE TABLE IF NOT EXISTS plan_features (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id     text NOT NULL REFERENCES platform_plans(id) ON DELETE CASCADE,
  feature_id  text NOT NULL REFERENCES features_catalog(id) ON DELETE CASCADE,
  enabled     boolean DEFAULT true,
  config      jsonb DEFAULT '{}',
  UNIQUE(plan_id, feature_id)
);

-- ─── Plan Quotas ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_quotas (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id     text NOT NULL REFERENCES platform_plans(id) ON DELETE CASCADE,
  quota_id    text NOT NULL REFERENCES quotas_catalog(id) ON DELETE CASCADE,
  value       integer NOT NULL DEFAULT 0,              -- -1 = unlimited
  UNIQUE(plan_id, quota_id)
);

-- ─── Add-ons Catalog ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS add_ons (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key             text UNIQUE NOT NULL,
  name_ar         text NOT NULL,
  name_en         text,
  description_ar  text,
  type            text NOT NULL                        -- 'feature' | 'quota' | 'bundle' | 'service'
                  CHECK (type IN ('feature','quota','bundle','service')),
  target_feature  text REFERENCES features_catalog(id) ON DELETE SET NULL,
  target_quota    text REFERENCES quotas_catalog(id) ON DELETE SET NULL,
  quota_increment integer DEFAULT 0,
  price_monthly   numeric(10,2) DEFAULT 0,
  price_yearly    numeric(10,2) DEFAULT 0,
  price_one_time  numeric(10,2) DEFAULT 0,
  billing_cycle   text DEFAULT 'monthly'
                  CHECK (billing_cycle IN ('monthly','yearly','one_time','custom')),
  is_free         boolean DEFAULT false,
  is_recurring    boolean DEFAULT true,
  max_quantity    integer DEFAULT 99,
  allowed_plans   text[] DEFAULT '{}',
  is_active       boolean DEFAULT true,
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ─── Tenant Add-ons (purchased / granted) ─────────────────
CREATE TABLE IF NOT EXISTS tenant_add_ons (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  add_on_id       uuid NOT NULL REFERENCES add_ons(id) ON DELETE CASCADE,
  quantity        integer DEFAULT 1,
  price_override  numeric(10,2),                       -- null = use catalog price
  is_free         boolean DEFAULT false,
  granted_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  starts_at       timestamptz DEFAULT now(),
  ends_at         timestamptz,
  is_permanent    boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- ─── Tenant Feature Overrides ─────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_id    text NOT NULL REFERENCES features_catalog(id) ON DELETE CASCADE,
  enabled       boolean NOT NULL,
  reason        text,
  granted_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  starts_at     timestamptz DEFAULT now(),
  ends_at       timestamptz,
  is_permanent  boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(org_id, feature_id)
);

-- ─── Tenant Quota Overrides ───────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_quota_overrides (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quota_id      text NOT NULL REFERENCES quotas_catalog(id) ON DELETE CASCADE,
  value         integer NOT NULL,                      -- -1 = unlimited
  reason        text,
  granted_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  starts_at     timestamptz DEFAULT now(),
  ends_at       timestamptz,
  is_permanent  boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(org_id, quota_id)
);

-- ─── Free Grants / Commercial Exceptions ──────────────────
CREATE TABLE IF NOT EXISTS tenant_grants (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            text NOT NULL                        -- 'feature'|'quota'|'addon'|'plan_upgrade'|'commercial'
                  CHECK (type IN ('feature','quota','addon','plan_upgrade','commercial','free_period')),
  target_id       text,                               -- feature_id | quota_id | addon_key | etc.
  value           jsonb DEFAULT '{}',                 -- { "amount": 5 } for quotas
  name_ar         text NOT NULL,
  reason          text NOT NULL,
  granted_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  starts_at       timestamptz DEFAULT now(),
  ends_at         timestamptz,
  is_permanent    boolean DEFAULT false,
  billing_effect  text DEFAULT 'free'                 -- 'free' | 'credited' | 'deferred'
                  CHECK (billing_effect IN ('free','credited','deferred')),
  is_active       boolean DEFAULT true,
  revoked_at      timestamptz,
  revoked_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  revoke_reason   text,
  created_at      timestamptz DEFAULT now()
);

-- ─── Discounts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discounts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  type            text NOT NULL
                  CHECK (type IN ('percentage','fixed','free_period','free_month')),
  value           numeric(10,2) NOT NULL DEFAULT 0,
  target_scope    text NOT NULL                       -- 'tenant'|'plan'|'global'|'addon'
                  CHECK (target_scope IN ('tenant','plan','global','addon')),
  target_id       text,                              -- org_id or plan_id
  billing_cycle   text DEFAULT 'all'                 -- 'monthly'|'yearly'|'all'
                  CHECK (billing_cycle IN ('monthly','yearly','all','one_time')),
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_permanent    boolean DEFAULT false,
  is_stackable    boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  reason          text,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

-- ─── Promotions / Offers ──────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  description_ar  text,
  internal_key    text UNIQUE,
  type            text NOT NULL
                  CHECK (type IN ('percentage','fixed','free_period','free_feature','bundle','upgrade')),
  value           numeric(10,2) DEFAULT 0,
  coupon_code     text UNIQUE,
  is_automatic    boolean DEFAULT false,
  priority        integer DEFAULT 0,
  is_stackable    boolean DEFAULT false,
  target_plans    text[] DEFAULT '{}',
  billing_cycle   text,
  usage_limit     integer,
  usage_count     integer DEFAULT 0,
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean DEFAULT true,
  free_features   text[] DEFAULT '{}',
  free_period_days integer DEFAULT 0,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

-- ─── Promotion Redemptions ────────────────────────────────
CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id    uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  applied_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  applied_at      timestamptz DEFAULT now(),
  discount_amount numeric(10,2) DEFAULT 0,
  notes           text
);

-- ─── Billing Overrides ────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_overrides (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_mode          text NOT NULL DEFAULT 'standard'
                        CHECK (billing_mode IN ('standard','manual','enterprise','free','custom','contract')),
  custom_price_monthly  numeric(10,2),
  custom_price_yearly   numeric(10,2),
  billing_cycle         text,
  payment_terms         text,
  invoice_notes         text,
  contract_start        timestamptz,
  contract_end          timestamptz,
  is_billing_paused     boolean DEFAULT false,
  reason                text NOT NULL,
  created_by            uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ─── Rule Definitions (No-Code Rules) ────────────────────
CREATE TABLE IF NOT EXISTS rule_definitions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text,
  trigger     text NOT NULL,                          -- 'subscription_expired'|'quota_80pct'|'payment_overdue'|etc.
  conditions  jsonb DEFAULT '[]',
  actions     jsonb DEFAULT '[]',
  priority    integer DEFAULT 0,
  scope       text DEFAULT 'global'
              CHECK (scope IN ('global','plan','tenant')),
  target_id   text,
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- SEED: Feature Groups
-- ═══════════════════════════════════════════════════════════

INSERT INTO feature_groups (id, name_ar, name_en, icon, sort_order) VALUES
  ('core',        'الأساسيات',            'Core',            'layers',       1),
  ('commerce',    'التجارة والمبيعات',    'Commerce',        'shopping-cart',2),
  ('operations',  'العمليات',             'Operations',      'settings',     3),
  ('finance',     'المالية',              'Finance',         'dollar-sign',  4),
  ('channels',    'القنوات والتسويق',     'Channels',        'globe',        5),
  ('enterprise',  'المؤسسات',            'Enterprise',      'crown',        6),
  ('specialty',   'وحدات متخصصة',         'Specialty',       'star',         7)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SEED: Feature Catalog (24 features)
-- ═══════════════════════════════════════════════════════════

INSERT INTO features_catalog (id, group_id, name_ar, name_en, type, is_core, sort_order) VALUES
  -- Core
  ('bookings',          'core',       'الحجوزات',              'Bookings',           'toggle', true,  1),
  ('customers',         'core',       'إدارة العملاء',          'Customers',          'toggle', true,  2),
  ('catalog',           'core',       'كتالوج الخدمات',        'Service Catalog',    'toggle', true,  3),
  ('media',             'core',       'مكتبة الوسائط',         'Media Library',      'toggle', true,  4),
  -- Commerce
  ('pos',               'commerce',   'نقطة البيع',             'POS',                'toggle', false, 5),
  ('inventory',         'commerce',   'إدارة المخزون',          'Inventory',          'toggle', false, 6),
  ('online_orders',     'commerce',   'الطلبات الإلكترونية',    'Online Orders',      'toggle', false, 7),
  ('delivery',          'commerce',   'التوصيل',                'Delivery',           'toggle', false, 8),
  -- Operations
  ('attendance',        'operations', 'الحضور والانصراف',       'Attendance',         'toggle', false, 9),
  ('contracts',         'operations', 'العقود والإيجارات',      'Contracts',          'toggle', false, 10),
  ('assets',            'operations', 'الأصول والمعدات',        'Assets',             'toggle', false, 11),
  -- Finance
  ('accounting',        'finance',    'المحاسبة',               'Accounting',         'toggle', false, 12),
  ('advanced_reports',  'finance',    'التقارير المتقدمة',      'Advanced Reports',   'toggle', false, 13),
  -- Channels
  ('marketing',         'channels',   'التسويق',                'Marketing',          'toggle', false, 14),
  ('website',           'channels',   'الموقع الإلكتروني',     'Website',            'toggle', false, 15),
  ('sms',               'channels',   'رسائل SMS',              'SMS',                'toggle', false, 16),
  ('whatsapp',          'channels',   'واتساب بيزنس',           'WhatsApp Business',  'toggle', false, 17),
  -- Enterprise
  ('api_access',        'enterprise', 'وصول API',               'API Access',         'toggle', false, 18, null, null, false, false, true),
  ('white_label',       'enterprise', 'الواجهة الخاصة',         'White Label',        'toggle', false, 19),
  ('webhooks',          'enterprise', 'Webhooks',               'Webhooks',           'toggle', false, 20),
  ('custom_roles',      'enterprise', 'أدوار مخصصة',            'Custom Roles',       'toggle', false, 21),
  ('sandbox_mode',      'enterprise', 'بيئة التطوير',           'Sandbox Mode',       'toggle', false, 22),
  -- Specialty
  ('hotel',             'specialty',  'إدارة الفندق',           'Hotel Management',   'toggle', false, 23),
  ('car_rental',        'specialty',  'تأجير السيارات',         'Car Rental',         'toggle', false, 24),
  ('floral',            'specialty',  'محلات الورود',           'Floral Management',  'toggle', false, 25)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  group_id = EXCLUDED.group_id;

-- ═══════════════════════════════════════════════════════════
-- SEED: Quotas Catalog
-- ═══════════════════════════════════════════════════════════

INSERT INTO quotas_catalog (id, name_ar, name_en, unit_ar, default_value, soft_limit, sort_order) VALUES
  ('max_branches',      'عدد الفروع',           'Branches',         'فرع',         1,    false, 1),
  ('max_users',         'عدد المستخدمين',        'Users',            'مستخدم',      3,    false, 2),
  ('max_employees',     'عدد الموظفين',          'Employees',        'موظف',        5,    true,  3),
  ('max_providers',     'مقدمو الخدمة',          'Service Providers','مقدم',        10,   true,  4),
  ('max_products',      'عدد المنتجات',          'Products',         'منتج',        100,  true,  5),
  ('max_orders_month',  'طلبات شهرياً',          'Monthly Orders',   'طلب',         500,  true,  6),
  ('max_customers',     'عدد العملاء',           'Customers',        'عميل',        1000, true,  7),
  ('max_sms_month',     'رسائل SMS شهرياً',      'Monthly SMS',      'رسالة',       100,  true,  8),
  ('max_api_calls',     'طلبات API شهرياً',      'Monthly API Calls','طلب',         0,    true,  9),
  ('max_storage_gb',    'مساحة التخزين (GB)',    'Storage (GB)',     'جيجابايت',   5,    true,  10),
  ('max_invoices',      'الفواتير شهرياً',       'Monthly Invoices', 'فاتورة',      50,   true,  11),
  ('max_warehouses',    'عدد المستودعات',        'Warehouses',       'مستودع',      1,    false, 12)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SEED: Plan Features (basic / advanced / pro / enterprise)
-- ═══════════════════════════════════════════════════════════

-- BASIC
INSERT INTO plan_features (plan_id, feature_id, enabled) VALUES
  ('basic','bookings',true),('basic','customers',true),('basic','catalog',true),('basic','media',true)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ADVANCED
INSERT INTO plan_features (plan_id, feature_id, enabled) VALUES
  ('advanced','bookings',true),('advanced','customers',true),('advanced','catalog',true),('advanced','media',true),
  ('advanced','pos',true),('advanced','inventory',true),('advanced','attendance',true),
  ('advanced','accounting',true),('advanced','marketing',true)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- PRO
INSERT INTO plan_features (plan_id, feature_id, enabled) VALUES
  ('pro','bookings',true),('pro','customers',true),('pro','catalog',true),('pro','media',true),
  ('pro','pos',true),('pro','inventory',true),('pro','attendance',true),('pro','accounting',true),
  ('pro','marketing',true),('pro','online_orders',true),('pro','delivery',true),
  ('pro','website',true),('pro','advanced_reports',true),('pro','sms',true),('pro','contracts',true),('pro','assets',true)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ENTERPRISE
INSERT INTO plan_features (plan_id, feature_id, enabled) VALUES
  ('enterprise','bookings',true),('enterprise','customers',true),('enterprise','catalog',true),('enterprise','media',true),
  ('enterprise','pos',true),('enterprise','inventory',true),('enterprise','attendance',true),('enterprise','accounting',true),
  ('enterprise','marketing',true),('enterprise','online_orders',true),('enterprise','delivery',true),
  ('enterprise','website',true),('enterprise','advanced_reports',true),('enterprise','sms',true),
  ('enterprise','whatsapp',true),('enterprise','api_access',true),('enterprise','white_label',true),
  ('enterprise','webhooks',true),('enterprise','custom_roles',true),('enterprise','sandbox_mode',true),
  ('enterprise','contracts',true),('enterprise','assets',true),('enterprise','hotel',true),
  ('enterprise','car_rental',true),('enterprise','floral',true)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SEED: Plan Quotas
-- ═══════════════════════════════════════════════════════════

INSERT INTO plan_quotas (plan_id, quota_id, value) VALUES
  -- BASIC
  ('basic','max_branches',1),('basic','max_users',3),('basic','max_employees',5),
  ('basic','max_products',50),('basic','max_orders_month',100),('basic','max_customers',200),
  ('basic','max_storage_gb',2),('basic','max_invoices',20),('basic','max_sms_month',0),
  ('basic','max_warehouses',0),('basic','max_providers',0),('basic','max_api_calls',0),
  -- ADVANCED
  ('advanced','max_branches',3),('advanced','max_users',10),('advanced','max_employees',20),
  ('advanced','max_products',500),('advanced','max_orders_month',1000),('advanced','max_customers',2000),
  ('advanced','max_storage_gb',10),('advanced','max_invoices',100),('advanced','max_sms_month',200),
  ('advanced','max_warehouses',2),('advanced','max_providers',15),('advanced','max_api_calls',0),
  -- PRO
  ('pro','max_branches',10),('pro','max_users',30),('pro','max_employees',50),
  ('pro','max_products',5000),('pro','max_orders_month',10000),('pro','max_customers',20000),
  ('pro','max_storage_gb',50),('pro','max_invoices',500),('pro','max_sms_month',1000),
  ('pro','max_warehouses',5),('pro','max_providers',50),('pro','max_api_calls',10000),
  -- ENTERPRISE
  ('enterprise','max_branches',-1),('enterprise','max_users',-1),('enterprise','max_employees',-1),
  ('enterprise','max_products',-1),('enterprise','max_orders_month',-1),('enterprise','max_customers',-1),
  ('enterprise','max_storage_gb',-1),('enterprise','max_invoices',-1),('enterprise','max_sms_month',-1),
  ('enterprise','max_warehouses',-1),('enterprise','max_providers',-1),('enterprise','max_api_calls',-1)
ON CONFLICT (plan_id, quota_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SEED: Add-ons Catalog (10 add-ons)
-- ═══════════════════════════════════════════════════════════

INSERT INTO add_ons (key, name_ar, name_en, type, target_quota, quota_increment, price_monthly, price_yearly, billing_cycle, allowed_plans, sort_order) VALUES
  ('extra_branch',     'فرع إضافي',         'Extra Branch',     'quota', 'max_branches',   1, 49,  490,  'monthly', ARRAY['basic','advanced','pro'],      1),
  ('extra_5_users',    '+5 مستخدمين',        '+5 Users',         'quota', 'max_users',      5, 29,  290,  'monthly', ARRAY['basic','advanced','pro'],      2),
  ('extra_sms_1000',  '+1000 رسالة SMS',    '+1000 SMS',        'quota', 'max_sms_month',  1000,  19,  190,  'monthly', ARRAY['advanced','pro','enterprise'], 3),
  ('api_package',      'حزمة API',           'API Package',      'feature','api_access',   0, 99,  990,  'monthly', ARRAY['pro','enterprise'],            4),
  ('white_label',      'الواجهة الخاصة',     'White Label',      'feature','white_label',  0, 199, 1990, 'monthly', ARRAY['pro','enterprise'],            5),
  ('extra_storage_10', '+10 GB تخزين',       '+10 GB Storage',   'quota', 'max_storage_gb', 10, 9,  90,   'monthly', ARRAY['basic','advanced','pro'],      6),
  ('whatsapp_addon',   'واتساب بيزنس',       'WhatsApp Business','feature','whatsapp',     0, 79,  790,  'monthly', ARRAY['advanced','pro'],              7),
  ('advanced_reports', 'التقارير المتقدمة',  'Advanced Reports', 'feature','advanced_reports',0,49, 490,  'monthly', ARRAY['basic','advanced'],            8),
  ('extra_warehouse',  'مستودع إضافي',       'Extra Warehouse',  'quota', 'max_warehouses', 1, 39,  390,  'monthly', ARRAY['advanced','pro','enterprise'], 9),
  ('priority_support', 'دعم أولوية',         'Priority Support', 'service',null,           0, 149, 1490, 'monthly', ARRAY['basic','advanced','pro'],      10)
ON CONFLICT (key) DO NOTHING;
