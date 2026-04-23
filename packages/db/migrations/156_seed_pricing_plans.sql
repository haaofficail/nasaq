-- ============================================================
-- Migration 156: Seed pricing plans
-- جدول plans كان فارغاً — صفحة الأسعار تعتمد عليه
-- آمن: INSERT ... ON CONFLICT DO UPDATE (upsert)
-- ============================================================

INSERT INTO plans
  (code, name_ar, name_en, price_monthly, price_yearly,
   original_price_monthly, original_price_yearly,
   max_branches, max_employees, trial_days, is_launch_offer, is_active, sort_order)
VALUES
  ('basic',      'الأساسي',  'Basic',      79,  756,  249, 2988, 1,  10,  30, true, true, 1),
  ('advanced',   'المتقدم',  'Advanced',  299, 2868,  549, 6588, 3,  30,  30, true, true, 2),
  ('enterprise', 'المؤسسي',  'Enterprise',399, 3828,  799, 9588,10, 100,  30, true, true, 3)
ON CONFLICT (code) DO UPDATE SET
  name_ar               = EXCLUDED.name_ar,
  name_en               = EXCLUDED.name_en,
  price_monthly         = EXCLUDED.price_monthly,
  price_yearly          = EXCLUDED.price_yearly,
  original_price_monthly= EXCLUDED.original_price_monthly,
  original_price_yearly = EXCLUDED.original_price_yearly,
  max_branches          = EXCLUDED.max_branches,
  max_employees         = EXCLUDED.max_employees,
  trial_days            = EXCLUDED.trial_days,
  is_launch_offer       = EXCLUDED.is_launch_offer,
  is_active             = EXCLUDED.is_active,
  sort_order            = EXCLUDED.sort_order;
