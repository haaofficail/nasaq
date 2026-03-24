-- Platform Plans — configurable plan definitions
-- Migration: 028_platform_plans

CREATE TABLE IF NOT EXISTS platform_plans (
  id              text        PRIMARY KEY,  -- basic, advanced, pro, enterprise
  name_ar         text        NOT NULL,
  name_en         text,
  price_monthly   numeric(10,2) DEFAULT 0,
  price_yearly    numeric(10,2) DEFAULT 0,
  currency        text        DEFAULT 'SAR',
  trial_days      integer     DEFAULT 14,
  max_users       integer     DEFAULT 5,
  max_locations   integer     DEFAULT 1,
  features        jsonb       DEFAULT '[]',       -- ["inventory","marketing",...]
  capabilities    jsonb       DEFAULT '[]',       -- default enabled capabilities
  is_active       boolean     DEFAULT true,
  sort_order      integer     DEFAULT 0,
  updated_at      timestamptz DEFAULT NOW()
);

INSERT INTO platform_plans (id, name_ar, name_en, price_monthly, price_yearly, trial_days, max_users, max_locations, features, capabilities, sort_order)
VALUES
  ('basic',      'الأساسي',   'Basic',      199,  1990,  14, 5,   1,
   '["كتالوج الخدمات","الحجوزات","CRM أساسي","تقارير بسيطة"]',
   '["bookings","customers","catalog","media"]',
   1),
  ('advanced',   'المتقدم',   'Advanced',   499,  4990,  14, 15,  3,
   '["كل ما في الأساسي","المالية","المخزون","إدارة الفريق","الأتمتة","التقارير المتقدمة"]',
   '["bookings","customers","catalog","media","inventory","accounting","delivery"]',
   2),
  ('pro',        'الاحترافي', 'Pro',        999,  9990,  30, 50,  10,
   '["كل ما في المتقدم","التسويق","الموقع الإلكتروني","التحليلات","حضور الموظفين"]',
   '["bookings","customers","catalog","media","inventory","accounting","delivery","marketing","website","attendance"]',
   3),
  ('enterprise', 'المؤسسي',  'Enterprise', 0,    0,     30, 999, 999,
   '["كل الميزات","API مخصص","White Label","دعم مخصص","SLA مضمون"]',
   '["bookings","customers","catalog","media","inventory","accounting","delivery","marketing","website","attendance","hotel","car_rental","floral","pos"]',
   4)
ON CONFLICT (id) DO NOTHING;
