-- ============================================================
-- Migration 108: Compliance Layer (طبقة الامتثال القانوني)
-- PDPL (م/19) + نظام التجارة الإلكترونية (م/69) + ZATCA
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE privacy_request_type AS ENUM ('export', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE privacy_request_status AS ENUM ('pending', 'processing', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE security_incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- organization_legal_settings
-- إعدادات قانونية لكل منشأة
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_legal_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  business_name           TEXT,
  commercial_registration TEXT,   -- رقم السجل التجاري
  vat_number              TEXT,   -- الرقم الضريبي (15 رقم)
  contact_email           TEXT,
  contact_phone           TEXT,
  address                 TEXT,
  refund_policy           TEXT,
  cancellation_policy     TEXT,
  data_retention_days     INTEGER DEFAULT 365,
  allow_data_export       BOOLEAN DEFAULT TRUE,
  allow_data_deletion     BOOLEAN DEFAULT TRUE,
  dpo_email               TEXT,   -- مسؤول حماية البيانات
  privacy_policy_url      TEXT,
  terms_url               TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- privacy_requests
-- طلبات حقوق البيانات — PDPL المادة 11-16
-- ============================================================
CREATE TABLE IF NOT EXISTS privacy_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  type            privacy_request_type NOT NULL,
  status          privacy_request_status NOT NULL DEFAULT 'pending',
  requester_name  TEXT,
  requester_email TEXT,
  requester_phone TEXT,
  notes           TEXT,
  processed_by    UUID,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- security_incidents
-- سجل حوادث الأمان — PDPL المادة 20 (إخطار NDMO خلال 72 ساعة)
-- ============================================================
CREATE TABLE IF NOT EXISTS security_incidents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID REFERENCES organizations(id) ON DELETE SET NULL,
  type              TEXT NOT NULL,
  description       TEXT NOT NULL,
  severity          security_incident_severity NOT NULL,
  affected_data     TEXT,
  actions_taken     TEXT,
  reported_to_ndmo  BOOLEAN DEFAULT FALSE,
  ndmo_reported_at  TIMESTAMPTZ,
  detected_at       TIMESTAMPTZ DEFAULT NOW(),
  reported_at       TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_privacy_requests_org_id    ON privacy_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status    ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_org_id  ON security_incidents(org_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
