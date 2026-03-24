-- ============================================================
-- Migration 009: Seed permissions table
-- كل صلاحية = resource + action
-- Actions: view, create, edit, delete, approve, export
-- Run: psql $DATABASE_URL -f 009_permissions_seed.sql
-- ============================================================

INSERT INTO permissions (resource, action, description, description_en) VALUES
  -- Services / Catalog
  ('services', 'view',   'عرض الخدمات والفئات',        'View services and categories'),
  ('services', 'create', 'إضافة خدمة أو فئة جديدة',   'Create service or category'),
  ('services', 'edit',   'تعديل الخدمات والفئات',      'Edit services and categories'),
  ('services', 'delete', 'حذف الخدمات والفئات',        'Delete services and categories'),

  -- Bookings
  ('bookings', 'view',   'عرض الحجوزات',               'View bookings'),
  ('bookings', 'create', 'إضافة حجز جديد',             'Create new booking'),
  ('bookings', 'edit',   'تعديل الحجوزات',             'Edit bookings'),
  ('bookings', 'delete', 'إلغاء / حذف الحجوزات',      'Cancel or delete bookings'),
  ('bookings', 'approve','تأكيد أو رفض الحجوزات',     'Approve or reject bookings'),

  -- Customers / CRM
  ('customers', 'view',   'عرض بيانات العملاء',        'View customers'),
  ('customers', 'create', 'إضافة عميل جديد',           'Create new customer'),
  ('customers', 'edit',   'تعديل بيانات العملاء',      'Edit customer data'),
  ('customers', 'delete', 'حذف العملاء',               'Delete customers'),
  ('customers', 'export', 'تصدير بيانات العملاء',      'Export customer data'),

  -- Finance
  ('finance', 'view',   'عرض التقارير المالية',        'View financial reports'),
  ('finance', 'create', 'إضافة معاملة مالية',          'Create financial transaction'),
  ('finance', 'edit',   'تعديل المعاملات المالية',     'Edit financial transactions'),
  ('finance', 'delete', 'حذف المعاملات المالية',       'Delete financial transactions'),
  ('finance', 'approve','اعتماد القيود المحاسبية',     'Approve journal entries'),
  ('finance', 'export', 'تصدير التقارير المالية',      'Export financial reports'),

  -- Inventory
  ('inventory', 'view',   'عرض المخزون والأصول',       'View inventory and assets'),
  ('inventory', 'create', 'إضافة صنف أو أصل',          'Create inventory item or asset'),
  ('inventory', 'edit',   'تعديل المخزون',             'Edit inventory'),
  ('inventory', 'delete', 'حذف أصناف المخزون',        'Delete inventory items'),

  -- Team / HR
  ('team', 'view',   'عرض الفريق والأدوار',            'View team and roles'),
  ('team', 'create', 'إضافة موظف أو دور',              'Create employee or role'),
  ('team', 'edit',   'تعديل بيانات الفريق',            'Edit team data'),
  ('team', 'delete', 'حذف موظف أو دور',               'Delete employee or role'),

  -- Automation
  ('automation', 'view',   'عرض قواعد الأتمتة',        'View automation rules'),
  ('automation', 'create', 'إضافة قاعدة أتمتة',        'Create automation rule'),
  ('automation', 'edit',   'تعديل قواعد الأتمتة',      'Edit automation rules'),
  ('automation', 'delete', 'حذف قواعد الأتمتة',       'Delete automation rules'),

  -- Marketing
  ('marketing', 'view',   'عرض الحملات والكوبونات',   'View campaigns and coupons'),
  ('marketing', 'create', 'إضافة حملة أو كوبون',       'Create campaign or coupon'),
  ('marketing', 'edit',   'تعديل التسويق',             'Edit marketing'),
  ('marketing', 'delete', 'حذف الحملات والكوبونات',   'Delete campaigns and coupons'),
  ('marketing', 'approve','تفعيل / إيقاف الحملات',    'Activate or deactivate campaigns'),

  -- Platform (API keys, webhooks, apps)
  ('platform', 'view',   'عرض مفاتيح API والتطبيقات', 'View API keys and apps'),
  ('platform', 'create', 'إضافة مفتاح API أو webhook', 'Create API key or webhook'),
  ('platform', 'edit',   'تعديل إعدادات المنصة',      'Edit platform settings'),
  ('platform', 'delete', 'حذف مفاتيح API أو apps',    'Delete API keys or apps'),

  -- Website / Blog
  ('website', 'view',   'عرض الموقع والمدونة',         'View website and blog'),
  ('website', 'create', 'إضافة صفحة أو مقال',         'Create page or blog post'),
  ('website', 'edit',   'تعديل محتوى الموقع',         'Edit website content'),
  ('website', 'delete', 'حذف صفحات أو مقالات',       'Delete pages or posts'),

  -- Settings
  ('settings', 'view',   'عرض الإعدادات',             'View settings'),
  ('settings', 'edit',   'تعديل الإعدادات',           'Edit settings')

ON CONFLICT (resource, action) DO NOTHING;
