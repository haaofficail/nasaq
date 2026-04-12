-- Migration 125: Referral system for organizations
-- كل منشأة تحصل على كود دعوة، وعند تفعيل الاشتراك من المدعو تحصل المنشأة المحيلة على شهر مجاني

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_credited BOOLEAN NOT NULL DEFAULT FALSE;

-- Generate referral codes for existing orgs (8-char uppercase)
UPDATE organizations
SET referral_code = UPPER(SUBSTR(MD5(id::text || RANDOM()::text), 1, 8))
WHERE referral_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_orgs_referral_code      ON organizations(referral_code);
CREATE INDEX IF NOT EXISTS idx_orgs_referred_by_org_id ON organizations(referred_by_org_id);
