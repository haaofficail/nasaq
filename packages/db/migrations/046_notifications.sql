-- Migration 046: Push notifications & notification log
-- إشعارات الدفع وسجل الإشعارات

CREATE TYPE IF NOT EXISTS notification_type AS ENUM ('auto', 'manual', 'scheduled', 'broadcast');

-- Push subscriptions (web push endpoints)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  platform    TEXT DEFAULT 'web',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_org_id_idx ON push_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- Notification log
CREATE TABLE IF NOT EXISTS notification_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  type             notification_type NOT NULL DEFAULT 'auto',
  recipient_count  INT NOT NULL DEFAULT 0,
  created_by       UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_log_org_id_idx ON notification_log(org_id);
CREATE INDEX IF NOT EXISTS notification_log_created_at_idx ON notification_log(created_at DESC);

-- Scheduled notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scheduled_notifications_org_id_idx ON scheduled_notifications(org_id);
CREATE INDEX IF NOT EXISTS scheduled_notifications_scheduled_at_idx ON scheduled_notifications(scheduled_at);
