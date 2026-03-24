-- Migration 040: subscription_addons
-- إضافات الاشتراك المفعّلة لكل منشأة

CREATE TABLE IF NOT EXISTS subscription_addons (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_key       text        NOT NULL,
  addon_name      text        NOT NULL,
  price           text        DEFAULT '0',
  is_active       boolean     NOT NULL DEFAULT true,
  activated_at    timestamptz DEFAULT now(),
  deactivated_at  timestamptz,
  metadata        jsonb       DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_addons_org_idx     ON subscription_addons(org_id);
CREATE INDEX IF NOT EXISTS subscription_addons_key_idx     ON subscription_addons(org_id, addon_key);
