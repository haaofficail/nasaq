-- ============================================================
-- Migration 011: Expand Permissions
-- Add new action types and new business-specific resources
-- ============================================================

-- New permission rows (existing seed has view/create/edit/delete/approve/export)
-- Adding: manage_settings, manage_finance, manage_inventory, manage_assets,
--         manage_team, manage_marketing, manage_website, post, reverse, close

INSERT INTO permissions (resource, action, description, description_en) VALUES
  -- Finance extended actions
  ('finance',     'manage_finance',    'إدارة المالية الكاملة',   'Manage Full Finance'),
  ('finance',     'post',              'ترحيل القيود',             'Post Journal Entries'),
  ('finance',     'reverse',           'عكس القيود',               'Reverse Journal Entries'),
  ('finance',     'close',             'إغلاق الفترة المحاسبية',  'Close Accounting Period'),
  ('finance',     'approve',           'اعتماد المدفوعات',         'Approve Payments'),

  -- Settings
  ('settings',    'manage_settings',   'إدارة إعدادات المنشأة',   'Manage Organization Settings'),

  -- Inventory extended
  ('inventory',   'manage_inventory',  'إدارة المخزون الكامل',    'Manage Full Inventory'),
  ('inventory',   'approve',           'اعتماد عمليات المخزون',   'Approve Inventory Operations'),

  -- Assets
  ('assets',      'view',              'عرض الأصول',               'View Assets'),
  ('assets',      'create',            'إضافة الأصول',             'Create Assets'),
  ('assets',      'edit',              'تعديل الأصول',             'Edit Assets'),
  ('assets',      'delete',            'حذف الأصول',               'Delete Assets'),
  ('assets',      'manage_assets',     'إدارة الأصول الكاملة',    'Manage Full Assets'),

  -- Team extended
  ('team',        'manage_team',       'إدارة الفريق الكاملة',    'Manage Full Team'),
  ('team',        'approve',           'اعتماد طلبات الفريق',     'Approve Team Requests'),

  -- Marketing extended
  ('marketing',   'manage_marketing',  'إدارة التسويق الكاملة',   'Manage Full Marketing'),

  -- Website extended
  ('website',     'manage_website',    'إدارة الموقع الكاملة',    'Manage Full Website'),

  -- Reports
  ('reports',     'view',              'عرض التقارير',             'View Reports'),
  ('reports',     'export',            'تصدير التقارير',           'Export Reports'),

  -- Approvals
  ('approvals',   'view',              'عرض الموافقات',            'View Approvals'),
  ('approvals',   'create',            'إنشاء طلب موافقة',         'Create Approval Request'),
  ('approvals',   'approve',           'اعتماد الطلبات',           'Approve Requests'),
  ('approvals',   'reject',            'رفض الطلبات',              'Reject Requests'),

  -- Customers extended
  ('customers',   'manage_customers',  'إدارة العملاء الكاملة',   'Manage Full Customers'),
  ('customers',   'export',            'تصدير بيانات العملاء',    'Export Customer Data'),

  -- Bookings extended
  ('bookings',    'manage_bookings',   'إدارة الحجوزات الكاملة',  'Manage Full Bookings'),
  ('bookings',    'approve',           'اعتماد الحجوزات',          'Approve Bookings'),

  -- Contracts (rental, events)
  ('contracts',   'view',              'عرض العقود',               'View Contracts'),
  ('contracts',   'create',            'إنشاء العقود',             'Create Contracts'),
  ('contracts',   'edit',              'تعديل العقود',             'Edit Contracts'),
  ('contracts',   'delete',            'حذف العقود',               'Delete Contracts'),
  ('contracts',   'approve',           'اعتماد العقود',            'Approve Contracts'),

  -- POS
  ('pos',         'view',              'عرض نقطة البيع',           'View POS'),
  ('pos',         'create',            'إنشاء فاتورة بيع',         'Create Sale'),
  ('pos',         'approve',           'اعتماد عمليات البيع',      'Approve Sales'),

  -- Attendance
  ('attendance',  'manage_attendance', 'إدارة الحضور الكاملة',    'Manage Full Attendance'),
  ('attendance',  'approve',           'اعتماد طلبات الإجازة',    'Approve Leave Requests')

ON CONFLICT (resource, action) DO NOTHING;
