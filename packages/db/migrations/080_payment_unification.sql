-- ============================================================
-- Migration 080: Payment Unification
-- يربط payment_transactions (بوابة Moyasar) بـ payments (السجل المالي الكنوني)
-- ============================================================

-- 1) أضف payment_id FK على payment_transactions
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payment_tx_payment_id_idx ON payment_transactions(payment_id);

-- 2) ربط التلقائي: إذا شاركا نفس booking_id → اربطهما
UPDATE payment_transactions pt
SET payment_id = p.id
FROM payments p
WHERE pt.booking_id = p.booking_id
  AND pt.status = 'paid'
  AND p.status = 'completed'
  AND pt.payment_id IS NULL;

-- 3) جدول الـ canonical payment record
-- payments يبقى المصدر الأساسي (finance.ts)
-- payment_transactions = gateway events فقط (لا يُكتب عليه يدوياً)
COMMENT ON TABLE payment_transactions IS
  'Gateway-only events from Moyasar. Always linked to payments.id via payment_id. Do NOT write directly — use payments table as canonical record.';

COMMENT ON TABLE payments IS
  'Canonical financial payment record. Single source of truth for all payment data regardless of gateway.';
