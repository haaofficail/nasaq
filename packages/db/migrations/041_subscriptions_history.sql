-- Migration 041: Subscription history table
-- سجل الاشتراكات لكل منشأة

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_number  TEXT UNIQUE,
  plan_key             TEXT NOT NULL,
  plan_name            TEXT NOT NULL,
  plan_price           INTEGER DEFAULT 0,
  start_date           TIMESTAMPTZ,
  end_date             TIMESTAMPTZ,
  status               TEXT DEFAULT 'active',
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_org_idx ON subscriptions (org_id);
