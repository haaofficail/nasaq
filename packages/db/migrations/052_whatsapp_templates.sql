-- Migration 052: WhatsApp Templates
-- Templates for automated WhatsApp messages tied to booking lifecycle events

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL DEFAULT 'booking_confirmed',
  -- trigger events: booking_confirmed, booking_reminder_24h, booking_reminder_1h, booking_cancelled, payment_received
  message_body TEXT NOT NULL,
  -- supports variables: {{customer_name}}, {{service_name}}, {{booking_date}}, {{booking_time}}, {{amount}}, {{business_name}}
  is_active BOOLEAN NOT NULL DEFAULT true,
  language TEXT NOT NULL DEFAULT 'ar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_org_id_idx ON whatsapp_templates(org_id);
