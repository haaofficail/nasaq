-- ============================================================
-- WhatsApp Connections — ربط واتساب لكل منشأة
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mode           TEXT        NOT NULL DEFAULT 'api',   -- 'api' | 'qr'
  status         TEXT        NOT NULL DEFAULT 'disconnected', -- 'disconnected' | 'pending_qr' | 'connected' | 'error'
  phone_number   TEXT,
  display_name   TEXT,

  -- API mode (Meta Business API)
  api_phone_id          TEXT,
  api_access_token      TEXT,
  api_webhook_verify    TEXT,

  -- QR mode (Baileys session)
  session_id     TEXT,
  qr_code        TEXT,   -- base64 QR image for display

  -- Stats
  messages_sent  INTEGER     NOT NULL DEFAULT 0,
  last_activity  TIMESTAMPTZ,
  error_message  TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(org_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_org ON whatsapp_connections(org_id);
