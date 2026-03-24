-- Migration 025: RBAC v2 — Job Titles, Org Members, Delivery
-- Adds new permission layer alongside existing roles system (backward compatible)

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE system_role AS ENUM ('owner','manager','provider','employee','reception');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM ('internal','freelance','outsourced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('active','inactive','suspended','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE commission_type_enum AS ENUM ('percentage','fixed_per_order','tiered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_partner_type AS ENUM ('company','individual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_commission_type AS ENUM ('percentage','fixed_per_order','flat_monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_assigned_to_type AS ENUM ('member','partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending','accepted','picked_up','in_transit','delivered','failed','returned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── job_titles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_titles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  name_en      TEXT,
  system_role  system_role NOT NULL,
  description  TEXT,
  color        TEXT,
  is_default   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_titles_org_idx ON job_titles(org_id);

-- ── job_title_permissions — overrides only ───────────────────────────────────
CREATE TABLE IF NOT EXISTS job_title_permissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_title_id    UUID        NOT NULL REFERENCES job_titles(id) ON DELETE CASCADE,
  permission_key  TEXT        NOT NULL,
  allowed         BOOLEAN     NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, job_title_id, permission_key)
);
CREATE INDEX IF NOT EXISTS job_title_perms_jt_idx ON job_title_permissions(job_title_id);

-- ── org_members ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_members (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID              NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID              NOT NULL REFERENCES users(id),
  job_title_id     UUID              REFERENCES job_titles(id) ON DELETE SET NULL,
  branch_id        UUID,

  employment_type  employment_type   NOT NULL DEFAULT 'internal',
  salary           NUMERIC(10,2),
  commission_rate  NUMERIC(5,2),
  commission_type  commission_type_enum,

  status           member_status     NOT NULL DEFAULT 'active',
  hired_at         TIMESTAMPTZ,
  contract_end     TIMESTAMPTZ,

  phone            TEXT,
  emergency_contact TEXT,
  notes            TEXT,

  created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);
CREATE INDEX IF NOT EXISTS org_members_org_idx ON org_members(org_id);
CREATE INDEX IF NOT EXISTS org_members_jt_idx  ON org_members(job_title_id);

-- ── delivery_partners ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_partners (
  id                UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID                     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT                     NOT NULL,
  type              delivery_partner_type    NOT NULL DEFAULT 'company',
  contact_phone     TEXT,
  commission_type   delivery_commission_type NOT NULL DEFAULT 'fixed_per_order',
  commission_value  NUMERIC(10,2)            NOT NULL DEFAULT 0,
  is_active         BOOLEAN                  NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS delivery_partners_org_idx ON delivery_partners(org_id);

-- ── delivery_assignments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_assignments (
  id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID                        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id            UUID                        NOT NULL,
  assigned_to_type    delivery_assigned_to_type   NOT NULL,
  assigned_to_id      UUID                        NOT NULL,
  status              delivery_status             NOT NULL DEFAULT 'pending',
  assigned_at         TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
  picked_up_at        TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  delivery_fee        NUMERIC(10,2)               DEFAULT 0,
  driver_share        NUMERIC(10,2)               DEFAULT 0,
  notes               TEXT,
  proof_of_delivery   TEXT,
  created_at          TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS delivery_assignments_order_idx ON delivery_assignments(order_id);
CREATE INDEX IF NOT EXISTS delivery_assignments_org_idx   ON delivery_assignments(org_id);

-- ── Seed: default job titles per org (based on business_type) ────────────────
-- salon
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'حلاق',       'provider',  FALSE, 1 FROM organizations WHERE business_type = 'salon' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مصفف',       'provider',  FALSE, 2 FROM organizations WHERE business_type = 'salon' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'كاشير',      'employee',  FALSE, 3 FROM organizations WHERE business_type = 'salon' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'استقبال',    'reception', TRUE,  4 FROM organizations WHERE business_type = 'salon' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مدير فرع',   'manager',   FALSE, 5 FROM organizations WHERE business_type = 'salon' ON CONFLICT DO NOTHING;

-- restaurant
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'شيف',         'provider', FALSE, 1 FROM organizations WHERE business_type = 'restaurant' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'طاهي',        'provider', FALSE, 2 FROM organizations WHERE business_type = 'restaurant' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'ويتر',        'employee', FALSE, 3 FROM organizations WHERE business_type = 'restaurant' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'كاشير',       'employee', FALSE, 4 FROM organizations WHERE business_type = 'restaurant' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مدير مطبخ',  'manager',  FALSE, 5 FROM organizations WHERE business_type = 'restaurant' ON CONFLICT DO NOTHING;

-- flower_shop
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'منسق ورود',    'provider', FALSE, 1 FROM organizations WHERE business_type = 'flower_shop' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'سائق توصيل',  'employee', FALSE, 2 FROM organizations WHERE business_type = 'flower_shop' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'كاشير',        'employee', FALSE, 3 FROM organizations WHERE business_type = 'flower_shop' ON CONFLICT DO NOTHING;

-- rental / car_rental
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'سائق',         'provider', FALSE, 1 FROM organizations WHERE business_type IN ('rental','car_rental') ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مندوب',        'employee', FALSE, 2 FROM organizations WHERE business_type IN ('rental','car_rental') ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مدير أسطول',  'manager',  FALSE, 3 FROM organizations WHERE business_type IN ('rental','car_rental') ON CONFLICT DO NOTHING;

-- hotel
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'موظف استقبال', 'reception', TRUE,  1 FROM organizations WHERE business_type = 'hotel' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مدبرة',         'employee',  FALSE, 2 FROM organizations WHERE business_type = 'hotel' ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مدير فرع',     'manager',   FALSE, 3 FROM organizations WHERE business_type = 'hotel' ON CONFLICT DO NOTHING;

-- generic fallback for all remaining
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مقدم خدمة', 'provider',  FALSE, 1 FROM organizations
WHERE business_type NOT IN ('salon','restaurant','flower_shop','rental','car_rental','hotel')
ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'موظف',      'employee',  FALSE, 2 FROM organizations
WHERE business_type NOT IN ('salon','restaurant','flower_shop','rental','car_rental','hotel')
ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'مدير',      'manager',   FALSE, 3 FROM organizations
WHERE business_type NOT IN ('salon','restaurant','flower_shop','rental','car_rental','hotel')
ON CONFLICT DO NOTHING;
INSERT INTO job_titles (org_id, name, system_role, is_default, sort_order)
SELECT id, 'استقبال',   'reception', TRUE,  4 FROM organizations
WHERE business_type NOT IN ('salon','restaurant','flower_shop','rental','car_rental','hotel')
ON CONFLICT DO NOTHING;

-- ── Backfill: create org_members from existing users ─────────────────────────
INSERT INTO org_members (org_id, user_id, employment_type, status, hired_at)
SELECT u.org_id, u.id, 'internal',
  CASE u.status WHEN 'active' THEN 'active'::member_status
                WHEN 'inactive' THEN 'inactive'::member_status
                WHEN 'suspended' THEN 'suspended'::member_status
                ELSE 'active'::member_status END,
  u.created_at
FROM users u
WHERE u.type != 'owner'
ON CONFLICT (org_id, user_id) DO NOTHING;
