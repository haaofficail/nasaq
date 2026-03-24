-- Website Builder: extend site_config + templates table
-- Migration: 026_website_builder

-- Add builder_config JSONB column to site_config (stores all builder-specific settings)
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS builder_config jsonb DEFAULT '{}';
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Website templates table
CREATE TABLE IF NOT EXISTS website_templates (
  id          varchar(50)  PRIMARY KEY,
  name        varchar(100) NOT NULL,
  name_en     varchar(100),
  description text,
  thumbnail   text,
  category    varchar(50)  DEFAULT 'all',
  is_premium  boolean      DEFAULT false,
  sort_order  integer      DEFAULT 0,
  is_active   boolean      DEFAULT true,
  created_at  timestamptz  DEFAULT NOW()
);

INSERT INTO website_templates (id, name, name_en, description, category, sort_order) VALUES
  ('classic',   'كلاسيكي', 'Classic',   'تصميم نظيف واحترافي — يناسب كل الأنشطة',               'all',       1),
  ('modern',    'عصري',    'Modern',    'تصميم حديث مع زوايا حادة وخطوط جريئة',                 'all',       2),
  ('luxury',    'فاخر',    'Luxury',    'أناقة وفخامة — للصالونات والسبا الراقية',              'salon',     3),
  ('minimal',   'بسيط',    'Minimal',   'أقل تعقيد — للمستقلين والمنشآت الصغيرة',              'all',       4),
  ('cafe',      'كافيه',   'Café',      'دافئ ومريح — للمطاعم والكافيهات',                     'restaurant',5),
  ('boutique',  'بوتيك',   'Boutique',  'أنيق ومميز — لمحلات الورود والهدايا',                 'flowers',   6),
  ('bold',      'جريء',    'Bold',      'ألوان قوية وخطوط كبيرة — للصالونات الرجالية',         'salon',     7),
  ('corporate', 'مؤسسي',   'Corporate', 'رسمي واحترافي — للشركات وتأجير المعدات',              'rental',    8),
  ('festive',   'احتفالي', 'Festive',   'حيوي ومبهج — للفعاليات والمناسبات',                   'events',    9),
  ('starter',   'بداية',   'Starter',   'صفحة واحدة بسيطة — ابدأ بسرعة',                       'all',      10)
ON CONFLICT (id) DO NOTHING;
