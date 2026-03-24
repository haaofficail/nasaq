-- ============================================================
-- Migration 033 — Phase 1: Data Integrity Fixes
-- ============================================================

-- 1) منع تكرار رقم جوال العميل في نفس المنشأة
--    عميل واحد برقم جوال واحد لكل org
CREATE UNIQUE INDEX IF NOT EXISTS customers_org_phone_idx
  ON customers(org_id, phone);

-- 2) إضافة FK مفقودة: customer_interactions.user_id → users.id
--    يمنع تراكم سجلات يتيمة عند حذف موظف
ALTER TABLE customer_interactions
  ADD CONSTRAINT customer_interactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
