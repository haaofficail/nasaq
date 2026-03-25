-- Add business buyer fields to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_company_name TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_cr_number TEXT;
