-- ============================================================
-- Migration 093: General-Purpose Contracts System
-- عقود عامة لأي نوع منشأة
-- ============================================================

-- ============================================================
-- Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM ('lease','service','vendor','employment','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('draft','active','expired','terminated','renewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_payment_terms AS ENUM ('monthly','quarterly','annual','one_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contract_payment_status AS ENUM ('pending','paid','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- contracts
-- ============================================================

CREATE TABLE IF NOT EXISTS contracts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number      TEXT NOT NULL,
  contract_type        contract_type NOT NULL DEFAULT 'other',
  title                TEXT NOT NULL,

  -- الطرف الآخر
  party_name           TEXT NOT NULL,
  party_id_number      TEXT,
  party_phone          TEXT,
  party_email          TEXT,

  -- التواريخ والقيمة
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  value                NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'SAR',
  payment_terms        contract_payment_terms NOT NULL DEFAULT 'monthly',

  -- الحالة
  status               contract_status NOT NULL DEFAULT 'draft',
  auto_renew           BOOLEAN NOT NULL DEFAULT FALSE,
  renewal_notice_days  INTEGER NOT NULL DEFAULT 30,

  -- الربط بكيان آخر (اختياري)
  linked_entity_type   TEXT,   -- 'property' | 'car' | 'equipment' | 'service'
  linked_entity_id     UUID,

  -- التوثيق
  notes                TEXT,
  terms_and_conditions TEXT,

  -- السجل
  created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  signed_at            TIMESTAMPTZ,
  terminated_at        TIMESTAMPTZ,
  termination_reason   TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- contract_payments — دفعات العقد
-- ============================================================

CREATE TABLE IF NOT EXISTS contract_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id     UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  due_date        DATE NOT NULL,
  amount          NUMERIC(15,2) NOT NULL,
  status          contract_payment_status NOT NULL DEFAULT 'pending',

  paid_at         TIMESTAMPTZ,
  payment_method  TEXT,           -- 'cash' | 'bank_transfer' | 'cheque' | 'online'
  reference       TEXT,
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- contract_documents — مستندات العقد
-- ============================================================

CREATE TABLE IF NOT EXISTS contract_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id  UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT,
  file_size    INTEGER,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contracts_org_id        ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status        ON contracts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date      ON contracts(org_id, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_number        ON contracts(org_id, contract_number);
CREATE INDEX IF NOT EXISTS idx_contract_payments_org   ON contract_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_cid   ON contract_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_due   ON contract_payments(org_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_contract_documents_cid  ON contract_documents(contract_id);
