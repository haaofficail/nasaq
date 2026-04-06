-- ============================================================
-- Migration 109: Booking Consent Metadata + Public Privacy Requests
-- PDPL م/8-أ: تسجيل الموافقة الصريحة على الشروط والخصوصية
-- ============================================================

-- 1. consent_metadata JSONB column on bookings
--    يخزن: { acceptedTermsAt, acceptedPrivacyAt, policyVersion, source }
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS consent_metadata JSONB DEFAULT NULL;

-- 2. Allow null org_id in privacy_requests
--    للطلبات القادمة من صفحة المنصة العامة (/legal/privacy)
ALTER TABLE privacy_requests
  ALTER COLUMN org_id DROP NOT NULL;

-- 3. Index for dedup check (phone + type within 24h)
CREATE INDEX IF NOT EXISTS idx_privacy_requests_phone_type
  ON privacy_requests (requester_phone, type, created_at);
