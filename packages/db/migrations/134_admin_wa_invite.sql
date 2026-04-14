-- ============================================================
-- Migration 134: دعوة منشأة — توسيع admin_wa_messages
-- يضيف: attachment_url، category، provider_message_id، updated_at
-- ============================================================

ALTER TABLE admin_wa_messages
  ADD COLUMN IF NOT EXISTS attachment_url      TEXT,
  ADD COLUMN IF NOT EXISTS category            TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_admin_wa_messages_category ON admin_wa_messages(category);
CREATE INDEX IF NOT EXISTS idx_admin_wa_messages_phone    ON admin_wa_messages(recipient_phone);
