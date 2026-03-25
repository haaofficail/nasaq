-- Migration 047: service_questions table
-- أسئلة مخصصة تُطرح على العميل عند الحجز، مع دعم المقابل المالي

CREATE TYPE question_type AS ENUM ('text', 'select', 'checkbox', 'number');

CREATE TABLE service_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

  question    TEXT NOT NULL,
  type        question_type NOT NULL DEFAULT 'text',
  is_required BOOLEAN NOT NULL DEFAULT false,
  options     JSONB NOT NULL DEFAULT '[]',

  -- مقابل مالي
  is_paid     BOOLEAN NOT NULL DEFAULT false,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,

  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX service_questions_service_idx ON service_questions(service_id);
CREATE INDEX service_questions_org_idx ON service_questions(org_id);
