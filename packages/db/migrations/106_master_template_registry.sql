-- Migration 106: Master Template Registry
-- نظام قوالب الإعداد الديناميكي — بديل لـ flower-setup-data.ts و serviceTemplates.ts
-- كل البيانات التجارية تُخزَّن في DB — لا hardcoded data في الكود

-- ── 1. الجداول ───────────────────────────────────────────────────────────────

CREATE TABLE master_business_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type TEXT NOT NULL,
  locale        TEXT NOT NULL DEFAULT 'ar-SA',
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE master_template_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES master_business_templates(id) ON DELETE CASCADE,
  profile_key  TEXT NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  version      INTEGER NOT NULL DEFAULT 1,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (template_id, profile_key, version)
);

CREATE TABLE master_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  name_en     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE master_products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES master_categories(id),
  name         TEXT NOT NULL,
  name_en      TEXT,
  description  TEXT,
  base_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit         TEXT NOT NULL DEFAULT 'قطعة',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE master_setup_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  plan_key     TEXT NOT NULL,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'custom',
  worker_count INTEGER NOT NULL DEFAULT 1,
  setup_notes  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE master_setup_plan_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id            UUID NOT NULL REFERENCES master_setup_plans(id) ON DELETE CASCADE,
  item_type          TEXT NOT NULL,
  description        TEXT NOT NULL,
  quantity           NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit               TEXT NOT NULL,
  unit_cost_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  asset_category     TEXT,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT mspi_type_check CHECK (
    item_type = ANY (ARRAY['asset','consumable_natural','consumable_product','service_fee','task'])
  )
);

CREATE TABLE master_services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES master_categories(id),
  setup_plan_id    UUID REFERENCES master_setup_plans(id),
  name             TEXT NOT NULL,
  name_en          TEXT,
  description      TEXT,
  service_type     TEXT NOT NULL DEFAULT 'regular',
  offering_type    TEXT NOT NULL DEFAULT 'service',
  base_price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_percent  NUMERIC(5,2),
  duration_minutes INTEGER,
  is_bookable      BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT ms_field_plan_check CHECK (
    (service_type = 'field_service' AND setup_plan_id IS NOT NULL)
    OR (service_type != 'field_service' AND setup_plan_id IS NULL)
  )
);

CREATE TABLE master_arrangements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES master_categories(id),
  name         TEXT NOT NULL,
  description  TEXT,
  category_tag TEXT,
  base_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  components   JSONB NOT NULL DEFAULT '[]',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE master_addons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES master_categories(id),
  name        TEXT NOT NULL,
  name_en     TEXT,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_mode  TEXT NOT NULL DEFAULT 'fixed',
  type        TEXT NOT NULL DEFAULT 'optional',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE master_suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  name_en     TEXT,
  code        TEXT NOT NULL,
  phone       TEXT,
  notes       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE master_supplier_categories (
  supplier_id  UUID NOT NULL REFERENCES master_suppliers(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES master_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, category_id)
);

CREATE TABLE master_job_titles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  name_en     TEXT,
  system_role TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6b7280',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE master_price_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES master_template_profiles(id) ON DELETE CASCADE,
  region          TEXT NOT NULL DEFAULT 'default',
  product_id      UUID REFERENCES master_products(id),
  service_id      UUID REFERENCES master_services(id),
  addon_id        UUID REFERENCES master_addons(id),
  suggested_price NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'SAR',
  CONSTRAINT mpl_single_item CHECK (
    (product_id IS NOT NULL)::int
    + (service_id IS NOT NULL)::int
    + (addon_id  IS NOT NULL)::int = 1
  )
);

-- ── 2. أعمدة bootstrap على organizations ────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS bootstrap_profile_id UUID REFERENCES master_template_profiles(id),
  ADD COLUMN IF NOT EXISTS bootstrap_version    INTEGER;

-- ── 3. Seed: flower_shop / flower_events ─────────────────────────────────────

DO $$
DECLARE
  v_tmpl      UUID;
  v_prof      UUID;
  v_cat_bq    UUID;  -- باقات الورد
  v_cat_bx    UUID;  -- صناديق وهدايا
  v_cat_ar    UUID;  -- تنسيقات
  v_cat_pl    UUID;  -- نباتات
  v_cat_ad    UUID;  -- إضافات
  v_cat_sv    UUID;  -- خدمات
  v_cat_ev    UUID;  -- تنسيقات مناسبات
  v_p_nb      UUID;  -- plan: newborn_reception
  v_p_we      UUID;  -- plan: welcome_entrance
  v_p_rt      UUID;  -- plan: reception_table
  v_p_pc      UUID;  -- plan: photo_corner
  v_p_ps      UUID;  -- plan: photo_session
  v_p_hp      UUID;  -- plan: home_party
  v_p_hc      UUID;  -- plan: hospitality_corner
  v_s_fl1     UUID;
  v_s_fl2     UUID;
  v_s_pkg     UUID;
  v_s_cnd     UUID;
  v_s_frn     UUID;
  v_s_std     UUID;
  v_s_plt     UUID;
BEGIN

  -- master_business_templates
  INSERT INTO master_business_templates (business_type, locale, name, description)
  VALUES ('flower_shop','ar-SA','محل ورد','قوالب متجر الورد — منتجات وخدمات ميدانية وخطط تجهيز')
  RETURNING id INTO v_tmpl;

  -- master_template_profiles
  INSERT INTO master_template_profiles (template_id, profile_key, name, description, version, is_active)
  VALUES (v_tmpl,'flower_events','محل ورد — تنسيقات ومناسبات',
          'يشمل المنتجات والخدمات الميدانية وخطط التجهيز والموردين',1,true)
  RETURNING id INTO v_prof;

  -- ── categories ───────────────────────────────────────────────
  INSERT INTO master_categories (profile_id,name,name_en,sort_order) VALUES (v_prof,'باقات الورد','Flower Bouquets',1) RETURNING id INTO v_cat_bq;
  INSERT INTO master_categories (profile_id,name,name_en,sort_order) VALUES (v_prof,'صناديق وهدايا','Boxes & Gifts',2) RETURNING id INTO v_cat_bx;
  INSERT INTO master_categories (profile_id,name,name_en,sort_order) VALUES (v_prof,'تنسيقات','Arrangements',3) RETURNING id INTO v_cat_ar;
  INSERT INTO master_categories (profile_id,name,name_en,sort_order) VALUES (v_prof,'نباتات','Plants',4) RETURNING id INTO v_cat_pl;
  INSERT INTO master_categories (profile_id,name,name_en,sort_order) VALUES (v_prof,'إضافات','Add-ons',5) RETURNING id INTO v_cat_ad;
  INSERT INTO master_categories (profile_id,name,name_en,sort_order) VALUES (v_prof,'خدمات','Services',6) RETURNING id INTO v_cat_sv;
  INSERT INTO master_categories (profile_id,name,name_en,sort_order) VALUES (v_prof,'تنسيقات مناسبات','Event Floral',7) RETURNING id INTO v_cat_ev;

  -- ── master_products ──────────────────────────────────────────
  INSERT INTO master_products (profile_id,category_id,name,description,base_price,unit,sort_order) VALUES
    (v_prof,v_cat_bq,'وردة مفردة فاخرة','وردة طازجة مفردة مع تغليف أنيق',15,'قطعة',1),
    (v_prof,v_cat_bq,'باقة ورد صغيرة','باقة 12 وردة طازجة مع خضرة زينية',80,'باقة',2),
    (v_prof,v_cat_bq,'باقة ورد متوسطة','باقة 24 وردة مع تغليف فاخر وبطاقة',150,'باقة',3),
    (v_prof,v_cat_bq,'باقة ورد فاخرة','باقة 50 وردة فاخرة بتصميم احترافي',350,'باقة',4),
    (v_prof,v_cat_bx,'صندوق ورد صغير','صندوق هدايا مع ورد طازج وبطاقة',120,'قطعة',5),
    (v_prof,v_cat_bx,'صندوق ورد فاخر','صندوق فاخر مع ورد وشوكولاتة وبطاقة شخصية',280,'قطعة',6),
    (v_prof,v_cat_bx,'بوكس ورد مع هدية','بوكس ورد مميز مع هدية مرفقة حسب المناسبة',350,'قطعة',7),
    (v_prof,v_cat_ar,'تنسيق طاولة صغير','تنسيق ورد لطاولة صغيرة أو كاونتر',120,'تنسيق',8),
    (v_prof,v_cat_ar,'تنسيق مكتبي','تنسيق ورد طبيعي للمكاتب والاستقبالات',150,'تنسيق',9),
    (v_prof,v_cat_ar,'تيراريوم نباتي','تيراريوم زجاجي بالنباتات الصغيرة',200,'قطعة',10),
    (v_prof,v_cat_pl,'نبتة أوركيد','أوركيد أبيض أو وردي في أصيص أنيق',180,'قطعة',11),
    (v_prof,v_cat_pl,'نبتة منزلية','نبتة منزلية جميلة مناسبة للهدايا',120,'قطعة',12),
    (v_prof,v_cat_ad,'شمعة معطرة','شمعة معطرة فاخرة مناسبة للهدايا',65,'قطعة',13),
    (v_prof,v_cat_ad,'بطاقة إهداء مخصصة','بطاقة إهداء بكتابة خط يد جميلة',20,'قطعة',14);

  -- ── master_services (regular) ────────────────────────────────
  INSERT INTO master_services (profile_id,category_id,name,description,service_type,offering_type,base_price,duration_minutes,is_bookable,sort_order) VALUES
    (v_prof,v_cat_sv,'توصيل باقة ورد','توصيل الطلبات للعنوان المطلوب خلال 3 ساعات','regular','service',30,90,true,15),
    (v_prof,v_cat_sv,'تغليف هدية خاص','تغليف احترافي للهدايا مع ريبون وبطاقة','regular','service',25,15,true,16),
    (v_prof,v_cat_ev,'تنسيق طاولة زفاف','تنسيق زهور لطاولة عروس مع كانديلابرا','regular','service',500,120,true,17),
    (v_prof,v_cat_ev,'تنسيق قاعة احتفالات','تنسيق زهور لقاعة احتفالات (25 طاولة)','regular','service',3500,240,true,18);

  -- ── master_setup_plans + items ───────────────────────────────

  INSERT INTO master_setup_plans (profile_id,plan_key,name,type,worker_count,setup_notes,sort_order)
  VALUES (v_prof,'newborn_reception','خطة تجهيز استقبال مولود','newborn',2,'يجب الوصول قبل ساعتين من الحفل',1)
  RETURNING id INTO v_p_nb;
  INSERT INTO master_setup_plan_items (plan_id,item_type,description,quantity,unit,unit_cost_estimate,asset_category,sort_order) VALUES
    (v_p_nb,'asset','ستاند ورد كبير',2,'قطعة',50,'stands',1),
    (v_p_nb,'asset','طاولة عرض',1,'قطعة',80,'kiosk_equipment',2),
    (v_p_nb,'consumable_natural','تنسيق ورد طازج',3,'تنسيق',60,NULL,3),
    (v_p_nb,'asset','خلفية مناسبة',1,'قطعة',100,'backdrops',4),
    (v_p_nb,'task','توفير فريق عمل',2,'عامل',0,NULL,5);

  INSERT INTO master_setup_plans (profile_id,plan_key,name,type,worker_count,setup_notes,sort_order)
  VALUES (v_prof,'welcome_entrance','خطة تجهيز مدخل ترحيبي','entrance',1,'التركيب قبل ساعة من الضيوف',2)
  RETURNING id INTO v_p_we;
  INSERT INTO master_setup_plan_items (plan_id,item_type,description,quantity,unit,unit_cost_estimate,asset_category,sort_order) VALUES
    (v_p_we,'asset','ستاند ورد جانبي',2,'قطعة',50,'stands',1),
    (v_p_we,'asset','لوحة ترحيب',1,'قطعة',120,'decor',2),
    (v_p_we,'consumable_natural','ورد طازج للتزيين',2,'تنسيق',60,NULL,3),
    (v_p_we,'asset','إضاءة ليد',1,'مجموعة',80,'decor',4),
    (v_p_we,'task','عامل تركيب وفك',1,'عامل',0,NULL,5);

  INSERT INTO master_setup_plans (profile_id,plan_key,name,type,worker_count,setup_notes,sort_order)
  VALUES (v_prof,'reception_table','خطة تجهيز طاولة استقبال','reception_table',1,'التنسيق يستغرق ساعة واحدة',3)
  RETURNING id INTO v_p_rt;
  INSERT INTO master_setup_plan_items (plan_id,item_type,description,quantity,unit,unit_cost_estimate,asset_category,sort_order) VALUES
    (v_p_rt,'asset','طاولة استقبال',1,'قطعة',80,'kiosk_equipment',1),
    (v_p_rt,'consumable_natural','تنسيق ورد طاولة',2,'تنسيق',60,NULL,2),
    (v_p_rt,'consumable_product','شموع ديكورية',4,'شمعة',15,NULL,3),
    (v_p_rt,'task','عامل تنسيق',1,'عامل',0,NULL,4);

  INSERT INTO master_setup_plans (profile_id,plan_key,name,type,worker_count,setup_notes,sort_order)
  VALUES (v_prof,'photo_corner','خطة تجهيز ركن تصوير','custom',1,'التأكد من جودة الإضاءة قبل الحفل',4)
  RETURNING id INTO v_p_pc;
  INSERT INTO master_setup_plan_items (plan_id,item_type,description,quantity,unit,unit_cost_estimate,asset_category,sort_order) VALUES
    (v_p_pc,'asset','خلفية تصوير',1,'قطعة',100,'backdrops',1),
    (v_p_pc,'asset','ستاند جانبي',2,'قطعة',50,'stands',2),
    (v_p_pc,'consumable_natural','ورد طازج متنوع',50,'ساق',3,NULL,3),
    (v_p_pc,'consumable_product','زينة إضافية',1,'مجموعة',40,NULL,4),
    (v_p_pc,'task','إعداد الركن',1,'عامل',0,NULL,5);

  INSERT INTO master_setup_plans (profile_id,plan_key,name,type,worker_count,setup_notes,sort_order)
  VALUES (v_prof,'photo_session','خطة تجهيز جلسة تصوير','custom',1,'يجب إحضار الورد طازجاً في يوم الجلسة',5)
  RETURNING id INTO v_p_ps;
  INSERT INTO master_setup_plan_items (plan_id,item_type,description,quantity,unit,unit_cost_estimate,asset_category,sort_order) VALUES
    (v_p_ps,'asset','طاولة صغيرة للمشهد',1,'قطعة',60,'kiosk_equipment',1),
    (v_p_ps,'consumable_natural','باقة ورد للتصوير',2,'باقة',80,NULL,2),
    (v_p_ps,'consumable_product','شموع للخلفية',3,'شمعة',15,NULL,3),
    (v_p_ps,'task','إعداد المشهد',1,'عامل',0,NULL,4);

  INSERT INTO master_setup_plans (profile_id,plan_key,name,type,worker_count,setup_notes,sort_order)
  VALUES (v_prof,'home_party','خطة تجهيز حفلة منزلية','custom',2,'التواصل مع العميل لتحديد أماكن التركيب مسبقاً',6)
  RETURNING id INTO v_p_hp;
  INSERT INTO master_setup_plan_items (plan_id,item_type,description,quantity,unit,unit_cost_estimate,asset_category,sort_order) VALUES
    (v_p_hp,'asset','ستاند ورد كبير',3,'قطعة',50,'stands',1),
    (v_p_hp,'asset','طاولة جانبية',2,'قطعة',80,'kiosk_equipment',2),
    (v_p_hp,'consumable_natural','تنسيقات ورد متنوعة',5,'تنسيق',60,NULL,3),
    (v_p_hp,'asset','خلفية احتفالية',1,'قطعة',100,'backdrops',4),
    (v_p_hp,'task','فريق تركيب وفك',2,'عامل',0,NULL,5);

  INSERT INTO master_setup_plans (profile_id,plan_key,name,type,worker_count,setup_notes,sort_order)
  VALUES (v_prof,'hospitality_corner','خطة تجهيز ركن ضيافة','custom',1,'التنسيق بسيط ومناسب للأماكن الضيقة',7)
  RETURNING id INTO v_p_hc;
  INSERT INTO master_setup_plan_items (plan_id,item_type,description,quantity,unit,unit_cost_estimate,asset_category,sort_order) VALUES
    (v_p_hc,'asset','طاولة ضيافة',1,'قطعة',80,'kiosk_equipment',1),
    (v_p_hc,'consumable_natural','ورد زيني',2,'تنسيق',40,NULL,2),
    (v_p_hc,'consumable_product','شموع معطرة',2,'شمعة',25,NULL,3),
    (v_p_hc,'task','ترتيب الركن',1,'عامل',0,NULL,4);

  -- ── master_services (field_service) ──────────────────────────
  INSERT INTO master_services (profile_id,name,service_type,offering_type,description,base_price,deposit_percent,is_bookable,setup_plan_id,sort_order) VALUES
    (v_prof,'استقبال مولود','field_service','service','تنسيق ورد وديكور لمناسبة استقبال المولود في المستشفى أو البيت',900,30,false,v_p_nb,1),
    (v_prof,'مدخل ترحيبي','field_service','service','تنسيق مدخل بالورد والإضاءة والزينة',1200,30,false,v_p_we,2),
    (v_prof,'تنسيق طاولة استقبال','field_service','service','تنسيق طاولة الاستقبال بالورد والشموع',500,30,false,v_p_rt,3),
    (v_prof,'تنسيق ركن تصوير','field_service','service','تجهيز ركن تصوير بالورد والخلفية والإضاءة',700,30,false,v_p_pc,4),
    (v_prof,'تنسيق جلسة تصوير','field_service','service','تنسيق خاص لجلسة تصوير احترافية بالورد',600,30,false,v_p_ps,5),
    (v_prof,'تنسيق حفلة منزلية','field_service','service','تنسيق شامل لحفلة منزلية بالورد والزينة',1500,30,false,v_p_hp,6),
    (v_prof,'تنسيق ركن ضيافة','field_service','service','تنسيق ركن الضيافة والقهوة بالورد',800,30,false,v_p_hc,7);

  -- ── master_arrangements ───────────────────────────────────────
  INSERT INTO master_arrangements (profile_id,category_id,name,description,category_tag,base_price,components,sort_order) VALUES
    (v_prof,v_cat_bq,'باقة عيد ميلاد','باقة ورد ملونة مع بطاقة تهنئة لعيد الميلاد','birthday',150,'["24 وردة ملونة","بطاقة تهنئة","تغليف فاخر"]'::jsonb,1),
    (v_prof,v_cat_bq,'باقة تخرج','باقة احتفالية خاصة بمناسبة التخرج','graduation',180,'["30 وردة بيضاء وذهبية","بطاقة تخرج","شريط مميز"]'::jsonb,2),
    (v_prof,v_cat_bq,'باقة مولود','باقة وردية أو زرقاء لاستقبال المولود','newborn',200,'["20 وردة وردية أو زرقاء","بالونات صغيرة","بطاقة تهنئة"]'::jsonb,3),
    (v_prof,v_cat_bq,'باقة رومانسية','باقة من الورد الأحمر الفاخر للمناسبات الرومانسية','love',250,'["24 وردة حمراء","شريط حرير","بطاقة شخصية"]'::jsonb,4),
    (v_prof,v_cat_bq,'باقة تهنئة','باقة ورد مشكّلة للتهاني العامة','celebration',120,'["15 وردة مشكلة","خضرة زينية","تغليف هدية"]'::jsonb,5),
    (v_prof,v_cat_bq,'باقة مفاجأة فاخرة','باقة ورد مميزة مع هدية مرفقة','surprise',300,'["30 وردة فاخرة","هدية مرفقة","صندوق تغليف فاخر"]'::jsonb,6);

  -- ── master_addons ─────────────────────────────────────────────
  INSERT INTO master_addons (profile_id,category_id,name,name_en,description,price,price_mode,type,sort_order) VALUES
    (v_prof,v_cat_ad,'توصيل سريع (خلال ساعتين)','Express Delivery','توصيل الطلب لأي عنوان خلال ساعتين من الطلب',50,'fixed','optional',1),
    (v_prof,v_cat_ad,'تغليف فاخر مميز','Premium Wrapping','تغليف احترافي بالورق الفاخر مع ريبون وإكسسوار',25,'fixed','optional',2),
    (v_prof,v_cat_ad,'بطاقة إهداء مخصصة','Personalized Card','بطاقة إهداء مكتوبة بخط جميل بالرسالة التي تريدها',20,'fixed','optional',3),
    (v_prof,v_cat_ad,'شوكولاتة هدية','Chocolate Gift','علبة شوكولاتة فاخرة مرفقة مع الطلب',45,'fixed','optional',4),
    (v_prof,v_cat_ad,'إضافة وردة (لكل وردة)','Extra Flower','أضف وروداً إضافية لباقتك',15,'fixed','optional',5);

  -- ── master_job_titles ─────────────────────────────────────────
  INSERT INTO master_job_titles (profile_id,name,name_en,system_role,color,sort_order) VALUES
    (v_prof,'منسق ورد','Floral Designer','provider','#e879a0',1),
    (v_prof,'مشرف تجهيز','Setup Supervisor','manager','#7c6ee0',2),
    (v_prof,'سائق توصيل','Delivery Driver','employee','#3b82f6',3),
    (v_prof,'عامل تجهيز','Setup Worker','employee','#10b981',4),
    (v_prof,'موظف استقبال','Front Desk','reception','#f59e0b',5);

  -- ── master_suppliers ──────────────────────────────────────────
  INSERT INTO master_suppliers (profile_id,name,name_en,code,phone,notes,sort_order)
  VALUES (v_prof,'مورد ورد طازج - الأول','Fresh Flowers Supplier 1','SUP-FL-01','05xxxxxxxx','مورد الورد المحلي الرئيسي — توصيل يومي',1)
  RETURNING id INTO v_s_fl1;

  INSERT INTO master_suppliers (profile_id,name,name_en,code,phone,notes,sort_order)
  VALUES (v_prof,'مورد ورد طازج - الثاني','Fresh Flowers Supplier 2','SUP-FL-02','05xxxxxxxx','مورد بديل للورد — مناسب لطلبات الكميات',2)
  RETURNING id INTO v_s_fl2;

  INSERT INTO master_suppliers (profile_id,name,name_en,code,phone,notes,sort_order)
  VALUES (v_prof,'مورد تغليف وريبون','Packaging Supplier','SUP-PKG-01','05xxxxxxxx','جميع أنواع التغليف والأشرطة والورق',3)
  RETURNING id INTO v_s_pkg;

  INSERT INTO master_suppliers (profile_id,name,name_en,code,phone,notes,sort_order)
  VALUES (v_prof,'مورد شموع وعطور','Candles Supplier','SUP-CND-01','05xxxxxxxx','شموع معطرة وديكورية',4)
  RETURNING id INTO v_s_cnd;

  INSERT INTO master_suppliers (profile_id,name,name_en,code,phone,notes,sort_order)
  VALUES (v_prof,'مورد طاولات وأثاث','Furniture Supplier','SUP-FRN-01','05xxxxxxxx','طاولات وكراسي لمشاريع التأجير',5)
  RETURNING id INTO v_s_frn;

  INSERT INTO master_suppliers (profile_id,name,name_en,code,phone,notes,sort_order)
  VALUES (v_prof,'مورد ستاندات وحوامل','Stands Supplier','SUP-STD-01','05xxxxxxxx','ستاندات وحوامل ورد وإطارات',6)
  RETURNING id INTO v_s_std;

  INSERT INTO master_suppliers (profile_id,name,name_en,code,phone,notes,sort_order)
  VALUES (v_prof,'مورد نباتات طبيعية','Natural Plants Supplier','SUP-PLT-01','05xxxxxxxx','نباتات طبيعية ونادرة',7)
  RETURNING id INTO v_s_plt;

  -- ── master_supplier_categories (pivot) ───────────────────────
  INSERT INTO master_supplier_categories (supplier_id,category_id) VALUES
    (v_s_fl1,v_cat_bq),(v_s_fl1,v_cat_ar),
    (v_s_fl2,v_cat_bq),(v_s_fl2,v_cat_ar),
    (v_s_pkg,v_cat_bx),
    (v_s_cnd,v_cat_ad),
    (v_s_plt,v_cat_pl);
  -- v_s_frn و v_s_std: مورد معدات، بدون تصنيف كتالوج مباشر

END $$;
