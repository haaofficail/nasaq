-- Migration 042: subscription_orders table
-- طلبات الشراء (ترقية / تجديد / إضافة) — pending حتى يتم الدفع

CREATE TABLE IF NOT EXISTS subscription_orders (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_type   text         NOT NULL,                        -- upgrade | addon | renewal
  item_key     text         NOT NULL,                        -- planKey or addonKey
  item_name    text         NOT NULL,
  price        integer      DEFAULT 0,
  status       text         DEFAULT 'pending_payment',       -- pending_payment | paid | cancelled | expired
  payment_ref  text,                                         -- filled after Moyasar callback
  expires_at   timestamptz,                                  -- auto-expires 24h after creation
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_orders_org_idx    ON subscription_orders(org_id);
CREATE INDEX IF NOT EXISTS subscription_orders_status_idx ON subscription_orders(status);
