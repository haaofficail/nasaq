-- ============================================================
-- Migration 116: Admin WhatsApp Gateway — قوالب ورسائل الأدمن
-- ============================================================

-- قوالب الواتساب الخاصة بالسوبر أدمن
CREATE TABLE IF NOT EXISTS admin_wa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- اسم القالب (مثال: "بيانات الدخول")
  slug TEXT NOT NULL UNIQUE,                   -- معرف فريد (مثال: "welcome_credentials")
  category TEXT NOT NULL DEFAULT 'general',    -- general | credentials | offer | notice | renewal
  body TEXT NOT NULL,                          -- محتوى الرسالة مع متغيرات {{org_name}} {{login_url}} ...
  variables JSONB DEFAULT '[]',               -- قائمة المتغيرات المتاحة
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,                            -- admin user id
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- سجل رسائل الأدمن المرسلة
CREATE TABLE IF NOT EXISTS admin_wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,                     -- من أرسل
  org_id UUID,                                -- المنشأة المستهدفة (null = رسالة عامة)
  recipient_phone TEXT NOT NULL,              -- رقم المستلم
  recipient_name TEXT,                        -- اسم المستلم
  template_id UUID REFERENCES admin_wa_templates(id),
  message_text TEXT NOT NULL,                 -- نص الرسالة النهائي
  channel TEXT NOT NULL DEFAULT 'whatsapp',   -- whatsapp | sms
  status TEXT NOT NULL DEFAULT 'pending',     -- pending | sent | failed
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_wa_messages_admin ON admin_wa_messages(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_wa_messages_org ON admin_wa_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_admin_wa_messages_created ON admin_wa_messages(created_at DESC);

-- قوالب افتراضية
INSERT INTO admin_wa_templates (name, slug, category, body, variables, sort_order) VALUES
  ('بيانات الدخول', 'welcome_credentials', 'credentials',
   'مرحباً {{owner_name}}،' || E'\n' || E'\n' ||
   'تم إنشاء حسابك في منصة ترميز OS بنجاح.' || E'\n' || E'\n' ||
   'رابط الدخول: {{login_url}}' || E'\n' ||
   'اسم المستخدم: {{username}}' || E'\n' ||
   'كلمة المرور: {{password}}' || E'\n' || E'\n' ||
   'يرجى تغيير كلمة المرور بعد أول تسجيل دخول.' || E'\n' ||
   'فريق ترميز OS',
   '["owner_name","login_url","username","password","org_name"]'::jsonb, 1),
  
  ('كلمة مرور جديدة', 'password_reset', 'credentials',
   'مرحباً {{owner_name}}،' || E'\n' || E'\n' ||
   'تم إعادة تعيين كلمة المرور لحسابك في ترميز OS.' || E'\n' || E'\n' ||
   'رابط الدخول: {{login_url}}' || E'\n' ||
   'كلمة المرور الجديدة: {{password}}' || E'\n' || E'\n' ||
   'يرجى تغيير كلمة المرور فوراً.' || E'\n' ||
   'فريق ترميز OS',
   '["owner_name","login_url","password","org_name"]'::jsonb, 2),
  
  ('تجديد الاشتراك', 'subscription_renewal', 'renewal',
   'مرحباً {{owner_name}}،' || E'\n' || E'\n' ||
   'نود تذكيركم بأن اشتراك {{org_name}} في باقة {{plan_name}} سينتهي بتاريخ {{expiry_date}}.' || E'\n' || E'\n' ||
   'للتجديد، يرجى التواصل معنا أو الدخول إلى لوحة التحكم.' || E'\n' || E'\n' ||
   'فريق ترميز OS',
   '["owner_name","org_name","plan_name","expiry_date"]'::jsonb, 3),
  
  ('عرض ترقية', 'upgrade_offer', 'offer',
   'مرحباً {{owner_name}}،' || E'\n' || E'\n' ||
   'لدينا عرض خاص لترقية {{org_name}} إلى باقة {{plan_name}}!' || E'\n' || E'\n' ||
   '{{offer_details}}' || E'\n' || E'\n' ||
   'للاستفادة من العرض، تواصل معنا مباشرة.' || E'\n' ||
   'فريق ترميز OS',
   '["owner_name","org_name","plan_name","offer_details"]'::jsonb, 4),
  
  ('إشعار عام', 'general_notice', 'notice',
   'مرحباً {{owner_name}}،' || E'\n' || E'\n' ||
   '{{message}}' || E'\n' || E'\n' ||
   'فريق ترميز OS',
   '["owner_name","org_name","message"]'::jsonb, 5),

  ('إيقاف المنشأة', 'org_suspended', 'notice',
   'مرحباً {{owner_name}}،' || E'\n' || E'\n' ||
   'نود إعلامكم بأنه تم إيقاف منشأة {{org_name}} مؤقتاً.' || E'\n' ||
   'السبب: {{reason}}' || E'\n' || E'\n' ||
   'للاستفسار أو إعادة التفعيل، يرجى التواصل معنا.' || E'\n' ||
   'فريق ترميز OS',
   '["owner_name","org_name","reason"]'::jsonb, 6)
ON CONFLICT (slug) DO NOTHING;
