-- ============================================================
-- Migration 132: Contracts V2 — نظام العقود الاحترافي
-- يضيف: ضريبة القيمة المضافة، الطرف الأول (المنشأة)، الشهود،
-- البنود القانونية، التنسيق النصي، إعدادات الطباعة،
-- الحقول النوعية لكل نوع عقد.
-- ============================================================

-- ── 1. حقول الطرف الأول (المنشأة) ──────────────────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS first_party_name       TEXT,   -- اسم المنشأة (يُعبأ من org)
  ADD COLUMN IF NOT EXISTS first_party_cr          TEXT,   -- السجل التجاري
  ADD COLUMN IF NOT EXISTS first_party_vat         TEXT,   -- الرقم الضريبي
  ADD COLUMN IF NOT EXISTS first_party_address     TEXT,   -- العنوان
  ADD COLUMN IF NOT EXISTS first_party_phone       TEXT,   -- الجوال
  ADD COLUMN IF NOT EXISTS first_party_rep_name    TEXT,   -- اسم الممثل القانوني
  ADD COLUMN IF NOT EXISTS first_party_rep_title   TEXT;   -- المسمى الوظيفي للممثل

-- ── 2. حقول الطرف الثاني (المتعاقد) الموسّعة ─────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS party_address          TEXT,   -- عنوان الطرف الثاني
  ADD COLUMN IF NOT EXISTS party_cr               TEXT,   -- سجل تجاري (إن كان شركة)
  ADD COLUMN IF NOT EXISTS party_vat              TEXT,   -- رقم ضريبي (إن كان شركة)
  ADD COLUMN IF NOT EXISTS party_type             TEXT    -- 'individual' | 'company'
                            CHECK (party_type IN ('individual','company')) DEFAULT 'individual';

-- ── 3. الضريبة والمالية ─────────────────────────────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS vat_rate               NUMERIC(5,2) NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS vat_amount             NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_with_vat         NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bank_name              TEXT,   -- اسم البنك للتحويل
  ADD COLUMN IF NOT EXISTS iban                   TEXT;   -- رقم الآيبان

-- ── 4. البنود القانونية والتنسيق النصي ─────────────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS legal_clauses          JSONB   NOT NULL DEFAULT '[]',
  -- مصفوفة: [{title, body, order}]
  ADD COLUMN IF NOT EXISTS special_conditions     TEXT,   -- شروط خاصة (نص حر)
  ADD COLUMN IF NOT EXISTS formatted_content      TEXT,   -- محتوى العقد كامل (HTML/Markdown)
  ADD COLUMN IF NOT EXISTS standard_terms_key     TEXT;   -- مفتاح قالب البنود القياسية

-- ── 5. الشهود والتوقيعات ────────────────────────────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS witness_1_name         TEXT,
  ADD COLUMN IF NOT EXISTS witness_1_id           TEXT,
  ADD COLUMN IF NOT EXISTS witness_2_name         TEXT,
  ADD COLUMN IF NOT EXISTS witness_2_id           TEXT,
  ADD COLUMN IF NOT EXISTS party_signed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signature_data         JSONB   NOT NULL DEFAULT '{}';
  -- {firstParty: {signedAt, signedBy, method}, secondParty: {...}}

-- ── 6. إعدادات الطباعة والهوية ─────────────────────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS print_language         TEXT    NOT NULL DEFAULT 'ar'
                            CHECK (print_language IN ('ar','en','ar_en')),
  ADD COLUMN IF NOT EXISTS print_header_notes     TEXT,   -- ملاحظات رأس الصفحة
  ADD COLUMN IF NOT EXISTS print_footer_notes     TEXT,   -- ملاحظات أسفل الصفحة
  ADD COLUMN IF NOT EXISTS show_logo              BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stamp_area        BOOLEAN NOT NULL DEFAULT true;

-- ── 7. حقول نوعية حسب نوع العقد ────────────────────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS metadata               JSONB   NOT NULL DEFAULT '{}';
  -- lease:      {property_address, area_sqm, permitted_use}
  -- employment: {job_title, department, salary, work_hours}
  -- vendor:     {delivery_terms, warranty_period, penalty_clause}
  -- service:    {deliverables, milestones, acceptance_criteria}

-- ── 8. تتبع التجديد ──────────────────────────────────────────────
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS renewal_count          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewed_from_id        UUID    REFERENCES contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renewal_value          NUMERIC(15,2);

-- ── 9. فهارس إضافية ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contracts_party_type ON contracts(org_id, party_type);
CREATE INDEX IF NOT EXISTS idx_contracts_renewed     ON contracts(renewed_from_id) WHERE renewed_from_id IS NOT NULL;

-- ── 10. جدول قوالب البنود القياسية ──────────────────────────────
CREATE TABLE IF NOT EXISTS contract_clause_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  -- NULL = قالب منصة عام / NOT NULL = قالب خاص بالمنشأة
  key           TEXT        NOT NULL,
  contract_type contract_type,   -- NULL = يصلح لجميع الأنواع
  title         TEXT        NOT NULL,
  body          TEXT        NOT NULL,
  sort_order    INT         NOT NULL DEFAULT 0,
  is_default    BOOLEAN     NOT NULL DEFAULT false,
  language      TEXT        NOT NULL DEFAULT 'ar',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cct_org  ON contract_clause_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_cct_type ON contract_clause_templates(contract_type);

-- ── 11. سجل توقيعات العقد ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_signatures (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  UUID        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  org_id       UUID        NOT NULL,
  party        TEXT        NOT NULL CHECK (party IN ('first_party','second_party','witness_1','witness_2')),
  signer_name  TEXT        NOT NULL,
  signer_id    TEXT,       -- رقم الهوية
  method       TEXT        NOT NULL DEFAULT 'manual',  -- manual | digital | otp
  otp_verified BOOLEAN     NOT NULL DEFAULT false,
  signed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   TEXT,
  notes        TEXT
);
CREATE INDEX IF NOT EXISTS idx_contract_sigs_contract ON contract_signatures(contract_id);
