-- ============================================================
-- Migration 031 — Reminders System + Favicon
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- Favicon fields on organizations
-- ──────────────────────────────────────────────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_files JSONB;

-- ──────────────────────────────────────────────────────────────
-- Reminder Categories
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminder_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  icon VARCHAR(50) DEFAULT 'Bell',
  color VARCHAR(7) DEFAULT '#5b9bd5',
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- Reminder Templates
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES reminder_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  description TEXT,
  icon VARCHAR(50) DEFAULT 'Bell',
  color VARCHAR(7),
  default_title TEXT,
  default_description TEXT,
  default_remind_before_days JSONB DEFAULT '[30, 7, 1]',
  default_recurrence VARCHAR(20),
  default_channels JSONB DEFAULT '["dashboard"]',
  sms_template TEXT,
  email_subject_template TEXT,
  email_body_template TEXT,
  extra_fields JSONB,
  available_variables JSONB DEFAULT '["org_name","due_date","title","days_remaining"]',
  tags JSONB DEFAULT '[]',
  applicable_to JSONB DEFAULT '["all"]',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- Org Reminders
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES reminder_templates(id) ON DELETE SET NULL,
  category_id UUID REFERENCES reminder_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'Bell',
  color VARCHAR(7),
  tags JSONB DEFAULT '[]',
  due_date DATE NOT NULL,
  remind_before_days JSONB DEFAULT '[30, 7, 1]',
  is_recurring BOOLEAN DEFAULT false,
  recurrence VARCHAR(20),
  recurrence_interval INTEGER,
  recurrence_end_date DATE,
  next_occurrence DATE,
  status VARCHAR(20) DEFAULT 'upcoming',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  snoozed_until DATE,
  linked_type VARCHAR(50),
  linked_id UUID,
  linked_label TEXT,
  extra_data JSONB DEFAULT '{}',
  notification_channels JSONB DEFAULT '["dashboard"]',
  notifications_log JSONB DEFAULT '[]',
  priority VARCHAR(10) DEFAULT 'medium',
  created_by_type VARCHAR(20) DEFAULT 'system',
  created_by UUID,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_reminders_org_idx ON org_reminders(org_id);
CREATE INDEX IF NOT EXISTS org_reminders_due_date_idx ON org_reminders(due_date);
CREATE INDEX IF NOT EXISTS org_reminders_status_idx ON org_reminders(status);

-- ──────────────────────────────────────────────────────────────
-- Seed: Reminder Categories (system)
-- ──────────────────────────────────────────────────────────────
INSERT INTO reminder_categories (id, name, name_en, icon, color, sort_order, is_system, is_active)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'وثائق وتراخيص',       'Documents & Licenses',       'FileText',      '#ef4444', 1, true, true),
  ('a0000001-0000-0000-0000-000000000002', 'عمالة وموظفين',        'Staff & Employment',         'Users',         '#f59e0b', 2, true, true),
  ('a0000001-0000-0000-0000-000000000003', 'مالية وضرائب',         'Finance & Taxes',            'DollarSign',    '#22c55e', 3, true, true),
  ('a0000001-0000-0000-0000-000000000004', 'عقود وإيجارات',        'Contracts & Rentals',        'FileSignature', '#8b5cf6', 4, true, true),
  ('a0000001-0000-0000-0000-000000000005', 'اشتراكات وأنظمة',      'Subscriptions & Systems',    'RefreshCw',     '#5b9bd5', 5, true, true),
  ('a0000001-0000-0000-0000-000000000006', 'صيانة ومعدات',         'Maintenance & Equipment',    'Wrench',        '#64748b', 6, true, true),
  ('a0000001-0000-0000-0000-000000000007', 'أخرى',                 'Other',                      'Bell',          '#94a3b8', 7, true, true)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- Seed: Reminder Templates (system)
-- ──────────────────────────────────────────────────────────────
INSERT INTO reminder_templates (name, name_en, category_id, default_title, default_description, default_remind_before_days, default_recurrence, sms_template, tags, applicable_to, is_system, sort_order)
VALUES
  -- وثائق وتراخيص
  ('تجديد السجل التجاري',    'CR Renewal',            'a0000001-0000-0000-0000-000000000001', 'تجديد السجل التجاري',    'موعد تجديد السجل التجاري للمنشأة',        '[90,30,7,1]', 'yearly',   'تذكير: سجلك التجاري ينتهي خلال {{days_remaining}} يوم. جدد الآن.', '["تراخيص","واجب"]', '["all"]', true, 1),
  ('الرخصة البلدية',          'Municipal License',     'a0000001-0000-0000-0000-000000000001', 'تجديد الرخصة البلدية',   'موعد تجديد الرخصة البلدية',               '[90,30,7,1]', 'yearly',   'تذكير: رخصتك البلدية تنتهي خلال {{days_remaining}} يوم.',          '["تراخيص","واجب"]', '["all"]', true, 2),
  ('الدفاع المدني',           'Civil Defense',         'a0000001-0000-0000-0000-000000000001', 'شهادة الدفاع المدني',    'موعد تجديد شهادة الدفاع المدني',          '[60,30,7]',   'yearly',   'تذكير: شهادة الدفاع المدني تنتهي خلال {{days_remaining}} يوم.',    '["تراخيص","سلامة"]', '["all"]', true, 3),
  ('الشهادة الصحية',          'Health Certificate',    'a0000001-0000-0000-0000-000000000001', 'الشهادة الصحية',         'تجديد الشهادة الصحية للمنشأة',            '[30,14,7]',   'yearly',   'تذكير: الشهادة الصحية تنتهي خلال {{days_remaining}} يوم.',         '["صحة","تراخيص"]', '["restaurant","cafe","bakery"]', true, 4),
  ('شهادة الضريبة',           'Tax Certificate',       'a0000001-0000-0000-0000-000000000001', 'شهادة الاستيفاء الضريبي','تجديد شهادة الاستيفاء الضريبي',           '[60,30,7]',   'yearly',   'تذكير: شهادة الضريبة تنتهي خلال {{days_remaining}} يوم.',          '["ضريبة","واجب"]', '["all"]', true, 5),

  -- عمالة
  ('تجديد إقامة عامل',        'Worker Iqama',          'a0000001-0000-0000-0000-000000000002', 'تجديد إقامة',            'تجديد إقامة موظف',                        '[90,30,7,1]', null,        'تذكير: إقامة {{linked_label}} تنتهي خلال {{days_remaining}} يوم.',  '["عمالة","إقامة"]', '["all"]', true, 10),
  ('تجديد رخصة عمل',          'Work Permit',           'a0000001-0000-0000-0000-000000000002', 'تجديد رخصة العمل',       'تجديد رخصة عمل موظف',                     '[60,30,7]',   null,        'تذكير: رخصة عمل {{linked_label}} تنتهي خلال {{days_remaining}} يوم.','["عمالة","تراخيص"]', '["all"]', true, 11),
  ('تجديد تأمين طبي',         'Medical Insurance',     'a0000001-0000-0000-0000-000000000002', 'تجديد التأمين الطبي',    'تجديد التأمين الطبي للموظفين',            '[60,30,7]',   'yearly',   'تذكير: التأمين الطبي ينتهي خلال {{days_remaining}} يوم.',          '["تأمين","عمالة"]', '["all"]', true, 12),
  ('انتهاء عقد موظف',         'Employee Contract End', 'a0000001-0000-0000-0000-000000000002', 'انتهاء عقد موظف',        'موعد انتهاء عقد موظف',                    '[30,14,7]',   null,        'تذكير: عقد {{linked_label}} ينتهي خلال {{days_remaining}} يوم.',    '["عمالة","عقد"]', '["all"]', true, 13),

  -- مالية
  ('الإقرار الضريبي',         'Tax Filing',            'a0000001-0000-0000-0000-000000000003', 'تقديم الإقرار الضريبي',  'موعد تقديم الإقرار الضريبي',              '[30,14,7,1]', 'quarterly','تذكير: موعد الإقرار الضريبي خلال {{days_remaining}} يوم.',         '["ضريبة","مالية"]', '["all"]', true, 20),
  ('التأمينات الاجتماعية',    'Social Insurance',      'a0000001-0000-0000-0000-000000000003', 'دفع التأمينات الاجتماعية','موعد دفع التأمينات الاجتماعية',           '[14,7,1]',    'monthly',  'تذكير: موعد التأمينات الاجتماعية خلال {{days_remaining}} يوم.',    '["تأمين","مالية"]', '["all"]', true, 21),
  ('الزكاة',                  'Zakat',                 'a0000001-0000-0000-0000-000000000003', 'دفع الزكاة',             'موعد دفع الزكاة السنوية',                 '[60,30,7]',   'yearly',   'تذكير: موعد الزكاة خلال {{days_remaining}} يوم.',                  '["زكاة","مالية"]', '["all"]', true, 22),

  -- عقود
  ('تجديد عقد إيجار',         'Lease Renewal',         'a0000001-0000-0000-0000-000000000004', 'تجديد عقد الإيجار',      'موعد تجديد عقد إيجار المقر',              '[90,30,14,7]','yearly',   'تذكير: عقد الإيجار ينتهي خلال {{days_remaining}} يوم.',            '["عقد","إيجار"]', '["all"]', true, 30),

  -- اشتراكات
  ('تجديد اشتراك نسق',        'Nasaq Renewal',         'a0000001-0000-0000-0000-000000000005', 'تجديد اشتراك نسق',       'موعد تجديد الاشتراك في منصة نسق',         '[30,14,7,1]', 'yearly',   'تذكير: اشتراكك في نسق ينتهي خلال {{days_remaining}} يوم. جدد الآن.','["اشتراك","نسق"]', '["all"]', true, 40),
  ('تجديد الدومين',           'Domain Renewal',        'a0000001-0000-0000-0000-000000000005', 'تجديد الدومين',          'موعد تجديد اسم النطاق',                   '[60,30,7]',   'yearly',   'تذكير: الدومين ينتهي خلال {{days_remaining}} يوم.',                '["دومين","موقع"]', '["all"]', true, 41),

  -- صيانة
  ('صيانة دورية',             'Periodic Maintenance',  'a0000001-0000-0000-0000-000000000006', 'صيانة دورية',            'موعد الصيانة الدورية للمعدات',            '[14,7,1]',    'quarterly','تذكير: موعد الصيانة الدورية خلال {{days_remaining}} يوم.',         '["صيانة","معدات"]', '["all"]', true, 50),
  ('فحص معدات السلامة',       'Safety Equipment',      'a0000001-0000-0000-0000-000000000006', 'فحص معدات السلامة',      'موعد فحص معدات السلامة والإطفاء',         '[30,14,7]',   'yearly',   'تذكير: فحص معدات السلامة خلال {{days_remaining}} يوم.',            '["سلامة","معدات"]', '["all"]', true, 51),
  ('تجديد فحص مركبة',         'Vehicle Inspection',    'a0000001-0000-0000-0000-000000000006', 'تجديد فحص مركبة',        'موعد تجديد فحص المركبة',                  '[60,30,7]',   null,        'تذكير: فحص المركبة ينتهي خلال {{days_remaining}} يوم.',            '["مركبة","فحص"]', '["car_rental","rental","logistics"]', true, 52),
  ('تجديد تأمين مركبة',       'Vehicle Insurance',     'a0000001-0000-0000-0000-000000000006', 'تجديد تأمين مركبة',      'موعد تجديد تأمين المركبة',                '[60,30,7]',   null,        'تذكير: تأمين المركبة ينتهي خلال {{days_remaining}} يوم.',          '["مركبة","تأمين"]', '["car_rental","rental","logistics"]', true, 53),
  ('وثيقة العمل الحر',        'Freelance Document',    'a0000001-0000-0000-0000-000000000002', 'تجديد وثيقة العمل الحر', 'موعد تجديد وثيقة العمل الحر',             '[30,14,7]',   'yearly',   'تذكير: وثيقة العمل الحر تنتهي خلال {{days_remaining}} يوم.',       '["عمالة","تراخيص"]', '["all"]', true, 14)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- Website Templates seed (if not already seeded)
-- ──────────────────────────────────────────────────────────────
INSERT INTO website_templates (id, name, name_en, description, category, is_premium, sort_order, is_active)
VALUES
  ('classic',    'الكلاسيكي',  'Classic',    'تصميم أنيق ومرتب يناسب أغلب الأنشطة',             'all',      false, 1,  true),
  ('modern',     'العصري',     'Modern',     'تصميم عصري بألوان جريئة وتأثيرات بصرية',           'all',      false, 2,  true),
  ('luxury',     'الفاخر',     'Luxury',     'تصميم فاخر بألوان داكنة وخطوط أنيقة',             'premium',  true,  3,  true),
  ('minimal',    'البسيط',     'Minimal',    'تصميم مبسط يبرز المحتوى والخدمات',                'all',      false, 4,  true),
  ('cafe',       'الكافيه',    'Cafe',       'تصميم دافئ يناسب المطاعم والكافيهات',              'food',     false, 5,  true),
  ('boutique',   'البوتيك',    'Boutique',   'تصميم راقٍ يناسب الصالونات والبوتيكات',           'beauty',   false, 6,  true),
  ('bold',       'الجريء',     'Bold',       'تصميم جريء بألوان عالية التباين',                  'all',      false, 7,  true),
  ('corporate',  'المؤسسي',    'Corporate',  'تصميم احترافي مناسب للشركات والمؤسسات',           'business', false, 8,  true),
  ('festive',    'الاحتفالي',  'Festive',    'تصميم احتفالي ملون يناسب الفعاليات والمناسبات',  'events',   false, 9,  true),
  ('starter',    'البداية',    'Starter',    'قالب سريع للبدء بأبسط صورة ممكنة',                'all',      false, 10, true)
ON CONFLICT (id) DO NOTHING;
