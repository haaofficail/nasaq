-- ============================================================
-- Migration 130: Seed ترميز OS Admin User
-- ينشئ org الأدمن + مستخدم super_admin إذا لم يكونا موجودَين.
-- آمن للتشغيل أكثر من مرة (ON CONFLICT DO NOTHING / DO UPDATE).
-- ============================================================

-- 1. Create ترميز OS admin org
INSERT INTO organizations (
  id,
  name,
  name_en,
  slug,
  phone,
  business_type,
  plan,
  subscription_status,
  has_demo_data
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ترميز OS',
  'Tarmiz OS',
  'tarmizos-admin',
  '+966000000000',
  'services',
  'enterprise',
  'active',
  false
) ON CONFLICT (id) DO NOTHING;

-- 2. Create super admin user (password: Admin@tarmiz2026)
-- Change password after first login via admin panel
INSERT INTO users (
  org_id,
  name,
  name_en,
  email,
  phone,
  type,
  status,
  password_hash,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'مدير النظام',
  'System Admin',
  'info@tarmizos.com',
  '+966000000001',
  'owner',
  'active',
  '6d4c3a4f31d622e244439eac5bd2b759:2bb0432d214c916cd47c02b6ada74f27ed908b335c1c62b6db90000051cc89d443161accfbb32c46d95e2d7c120ce540f0ff270b591f754c56d4e8c4a57ed81d',
  true
) ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      is_super_admin = true,
      status        = 'active';
