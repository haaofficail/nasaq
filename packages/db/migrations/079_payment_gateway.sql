-- ============================================================
-- Migration 079: Payment Gateway Tables
-- نظام الدفع المركزي لنسق
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE "payment_tx_status" AS ENUM ('pending','paid','failed','refunded','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "settlement_status" AS ENUM ('pending','processing','completed','failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- payment_transactions
CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"          UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "invoice_id"      UUID REFERENCES "invoices"("id"),
  "booking_id"      UUID REFERENCES "bookings"("id"),
  "customer_id"     UUID REFERENCES "customers"("id"),
  "amount"          NUMERIC(12,2) NOT NULL,
  "platform_fee"    NUMERIC(10,2) NOT NULL DEFAULT 0,
  "merchant_amount" NUMERIC(12,2) NOT NULL,
  "currency"        TEXT NOT NULL DEFAULT 'SAR',
  "status"          payment_tx_status NOT NULL DEFAULT 'pending',
  "moyasar_id"      TEXT UNIQUE,
  "moyasar_status"  TEXT,
  "payment_method"  TEXT,
  "card_info"       JSONB,
  "moyasar_fee"     NUMERIC(10,2),
  "moyasar_data"    JSONB,
  "description"     TEXT,
  "success_url"     TEXT,
  "failure_url"     TEXT,
  "metadata"        JSONB,
  "settlement_id"   UUID,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "paid_at"         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "payment_tx_org_idx"      ON "payment_transactions"("org_id");
CREATE INDEX IF NOT EXISTS "payment_tx_invoice_idx"  ON "payment_transactions"("invoice_id");
CREATE INDEX IF NOT EXISTS "payment_tx_booking_idx"  ON "payment_transactions"("booking_id");
CREATE INDEX IF NOT EXISTS "payment_tx_moyasar_idx"  ON "payment_transactions"("moyasar_id");

-- merchant_settlements
CREATE TABLE IF NOT EXISTS "merchant_settlements" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"              UUID NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "total_amount"        NUMERIC(12,2) NOT NULL,
  "total_platform_fee"  NUMERIC(10,2) NOT NULL,
  "net_amount"          NUMERIC(12,2) NOT NULL,
  "currency"            TEXT NOT NULL DEFAULT 'SAR',
  "status"              settlement_status NOT NULL DEFAULT 'pending',
  "period_start"        TIMESTAMPTZ NOT NULL,
  "period_end"          TIMESTAMPTZ NOT NULL,
  "iban_number"         TEXT,
  "account_name"        TEXT,
  "payout_reference"    TEXT,
  "payout_method"       TEXT DEFAULT 'bank_transfer',
  "admin_note"          TEXT,
  "completed_by"        UUID REFERENCES "users"("id"),
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at"        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "settlement_org_idx"    ON "merchant_settlements"("org_id");
CREATE INDEX IF NOT EXISTS "settlement_status_idx" ON "merchant_settlements"("status");

-- Add settlement_id FK after table exists
ALTER TABLE "payment_transactions"
  ADD CONSTRAINT IF NOT EXISTS "payment_tx_settlement_fk"
  FOREIGN KEY ("settlement_id") REFERENCES "merchant_settlements"("id");

-- payment_settings
CREATE TABLE IF NOT EXISTS "payment_settings" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id"                UUID NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
  "enabled"               BOOLEAN NOT NULL DEFAULT FALSE,
  "platform_fee_percent"  NUMERIC(5,2) DEFAULT 2.5,
  "platform_fee_fixed"    NUMERIC(5,2) DEFAULT 0,
  "iban_number"           TEXT,
  "account_name"          TEXT,
  "bank_name"             TEXT,
  "notify_on_payment"     BOOLEAN DEFAULT TRUE,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
