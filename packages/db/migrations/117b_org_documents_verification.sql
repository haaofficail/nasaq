-- Migration 117: Enhanced org documents for verification
-- Adds expiry tracking, document numbers, rejection reasons

ALTER TABLE org_documents ADD COLUMN IF NOT EXISTS document_number text;
ALTER TABLE org_documents ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE org_documents ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE org_documents ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE org_documents ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Index for expiring documents
CREATE INDEX IF NOT EXISTS org_documents_expires_idx ON org_documents (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS org_documents_status_idx ON org_documents (status);
