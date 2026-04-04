-- ============================================================
-- نسق — Pricing & Subscription Tables
-- Created: 2026-04-03
-- NOTE: plan_features already exists with different schema → using pricing_plan_features
-- NOTE: addons already exists as service addons → using plan_addons for plan-level addons
-- ============================================================

-- plans (الباقات الجديدة)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,
  name_ar VARCHAR(50) NOT NULL,
  name_en VARCHAR(50) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  original_price_monthly DECIMAL(10,2),
  original_price_yearly DECIMAL(10,2),
  max_branches INTEGER NOT NULL DEFAULT 1,
  max_employees INTEGER NOT NULL DEFAULT 10,
  trial_days INTEGER NOT NULL DEFAULT 0,
  is_launch_offer BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- pricing_plan_features (plan_features already exists with different schema)
CREATE TABLE IF NOT EXISTS pricing_plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(20) NOT NULL REFERENCES plans(code) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  is_included BOOLEAN DEFAULT false,
  UNIQUE(plan_code, feature_key)
);

-- plan_addons (addons table already exists as org-scoped service addons)
CREATE TABLE IF NOT EXISTS plan_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_ar TEXT,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 790,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- resource_addons
CREATE TABLE IF NOT EXISTS resource_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  unit_ar VARCHAR(50),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- org_addons (plan-level addons per org)
CREATE TABLE IF NOT EXISTS org_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_code VARCHAR(50) NOT NULL REFERENCES plan_addons(code),
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  amount_paid DECIMAL(10,2),
  UNIQUE(org_id, addon_code)
);

-- org_resource_addons
CREATE TABLE IF NOT EXISTS org_resource_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_code VARCHAR(50) NOT NULL REFERENCES resource_addons(code),
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  amount_paid DECIMAL(10,2)
);

-- Add billing columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS current_plan_code VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_plan_features_plan_code ON pricing_plan_features(plan_code);
CREATE INDEX IF NOT EXISTS idx_org_addons_org_id ON org_addons(org_id);
CREATE INDEX IF NOT EXISTS idx_org_resource_addons_org_id ON org_resource_addons(org_id);
