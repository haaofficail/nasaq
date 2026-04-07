/**
 * seed-flower-shop.ts
 * ───────────────────────────────────────────────────────────────────
 * بيانات تشغيلية شاملة لمحل الورود:
 *  - أصناف الورد (flower_variants) + تسعيرة
 *  - كافة خدمات المتجر (services + categories)
 *  - أصول الديكور (decor_assets): كوش، إطارات، حوامل، خلفيات
 *  - مشروع ميداني تجريبي يربط الأصول بمشروع + فحص مرتجعات
 *  - تحقق من سلامة الترابط في نهاية التنفيذ
 *
 * Usage:
 *   pnpm --filter @nasaq/db tsx seeds/seed-flower-shop.ts [org-slug]
 *   Default slug: demo-flower-shop
 * ───────────────────────────────────────────────────────────────────
 */

import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const TARGET_SLUG = process.argv[2] ?? "demo-flower-shop";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log(`\n>>> بدء زرع بيانات محل الورود للمنشأة: ${TARGET_SLUG}\n`);

    const org = await resolveOrg(client);
    const orgId = org.id;
    console.log(`    org_id = ${orgId}`);

    await ensureFloralCapability(client, orgId);
    await seedCategories(client, orgId);
    await seedServices(client, orgId);
    await seedFlowerVariants(client, orgId);
    await seedDecorAssets(client, orgId);
    const { orderId } = await seedDemoServiceOrder(client, orgId);
    await verifyRelationships(client, orgId, orderId);

    await client.query("COMMIT");
    console.log("\n>>> اكتمل الزرع بنجاح\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("فشل الزرع:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function resolveOrg(client: any) {
  const r = await client.query(
    `SELECT id, name FROM organizations WHERE slug = $1`,
    [TARGET_SLUG]
  );
  if (!r.rows[0]) throw new Error(`منشأة غير موجودة: ${TARGET_SLUG}`);
  console.log(`    المنشأة: ${r.rows[0].name}`);
  return r.rows[0];
}

async function ensureFloralCapability(client: any, orgId: string) {
  await client.query(
    `INSERT INTO organization_capability_overrides (org_id, capability_key, enabled, reason)
     VALUES ($1, 'floral', true, 'seed-flower-shop')
     ON CONFLICT (org_id, capability_key) DO UPDATE SET enabled=true`,
    [orgId]
  );
  console.log("    [1/6] تأكيد كابيليتي floral");
}

// ─── أصناف الخدمات والمنتجات ─────────────────────────────────────────────────

const CATEGORIES = [
  { name: "باقات الورد المفردة",      sort: 1 },
  { name: "صناديق وعلب الورد",        sort: 2 },
  { name: "تنسيقات احتفالية",         sort: 3 },
  { name: "تزيين المناسبات والأفراح", sort: 4 },
  { name: "نباتات طبيعية",            sort: 5 },
  { name: "هدايا مصاحبة",             sort: 6 },
  { name: "ورود مفردة مقطوعة",        sort: 7 },
];

const SERVICES: { cat: string; name: string; price: number; duration: number; desc?: string }[] = [
  // ── باقات الورد المفردة ──────────────────────────────────────────
  { cat: "باقات الورد المفردة", name: "بوكيه ورد صغير (10 ورود)",        price:  95, duration: 20, desc: "10 ورود مختارة بتغليف أنيق" },
  { cat: "باقات الورد المفردة", name: "بوكيه ورد متوسط (20 ورود)",       price: 175, duration: 25, desc: "20 وردة بتنسيق احترافي" },
  { cat: "باقات الورد المفردة", name: "بوكيه ورد كبير (30 ورود)",        price: 260, duration: 30, desc: "30 وردة مع بيبي بريث وخضار" },
  { cat: "باقات الورد المفردة", name: "بوكيه ورد فاخر (50 ورود)",        price: 420, duration: 35, desc: "50 وردة بتنسيق راقٍ مع شريط فاخر" },
  { cat: "باقات الورد المفردة", name: "بوكيه العروس الكلاسيكي",          price: 550, duration: 60, desc: "باقة عروس ورد أبيض + أوركيد" },
  { cat: "باقات الورد المفردة", name: "بوكيه العروس الفاخر",             price: 850, duration: 60, desc: "باقة عروس مميزة بالورد الإيطالي" },
  { cat: "باقات الورد المفردة", name: "طوق ورود للرأس",                  price: 120, duration: 30, desc: "تاج ورود طبيعية للعرائس" },
  { cat: "باقات الورد المفردة", name: "إكليل ورود صغير",                 price:  80, duration: 20 },
  { cat: "باقات الورد المفردة", name: "إكليل ورود كبير",                 price: 150, duration: 30 },
  { cat: "باقات الورد المفردة", name: "بوكيه تخرج مميز",                 price: 220, duration: 25, desc: "مناسب لتهنئة التخرج" },
  { cat: "باقات الورد المفردة", name: "بوكيه العيد الاحتفالي",            price: 190, duration: 25, desc: "تصميم خاص لمواسم الأعياد" },

  // ── صناديق وعلب الورد ────────────────────────────────────────────
  { cat: "صناديق وعلب الورد", name: "صندوق ورد مربع صغير (9 ورود)",     price: 145, duration: 20 },
  { cat: "صناديق وعلب الورد", name: "صندوق ورد مربع كبير (16 ورود)",    price: 245, duration: 25 },
  { cat: "صناديق وعلب الورد", name: "صندوق ورد دائري متوسط",            price: 195, duration: 25 },
  { cat: "صناديق وعلب الورد", name: "صندوق ورد على شكل قلب",            price: 220, duration: 25, desc: "صندوق قلب لورود مرتبة" },
  { cat: "صناديق وعلب الورد", name: "صندوق أكريليك شفاف",               price: 280, duration: 30, desc: "علبة أكريليك فاخرة مع إضاءة LED" },
  { cat: "صناديق وعلب الورد", name: "صندوق هدية فاخر متعدد الطوابق",    price: 380, duration: 35, desc: "صندوق من طابقين مع ورود وهدايا" },
  { cat: "صناديق وعلب الورد", name: "علبة ورود محفوظة (ورود إيترنال)",  price: 450, duration: 15, desc: "ورود محفوظة تدوم سنوات" },

  // ── تنسيقات احتفالية ─────────────────────────────────────────────
  { cat: "تنسيقات احتفالية", name: "تنسيق طاولة استقبال صغير",         price: 250, duration: 45 },
  { cat: "تنسيقات احتفالية", name: "تنسيق طاولة استقبال كبير",         price: 450, duration: 60 },
  { cat: "تنسيقات احتفالية", name: "سلة زهور كبيرة",                   price: 320, duration: 45 },
  { cat: "تنسيقات احتفالية", name: "تنسيق أعواد عمودي فاخر",           price: 380, duration: 50 },
  { cat: "تنسيقات احتفالية", name: "إطار ورود للتصوير",                price: 400, duration: 60, desc: "إطار مزيّن بورود طبيعية للصور التذكارية" },
  { cat: "تنسيقات احتفالية", name: "تنسيق كونسول الاستقبال",           price: 520, duration: 60, desc: "تنسيق كامل لطاولة المدخل" },
  { cat: "تنسيقات احتفالية", name: "كاسكيد ورود معلق",                 price: 300, duration: 45, desc: "تنسيق متدلٍ للسقف أو القاعة" },
  { cat: "تنسيقات احتفالية", name: "تنسيق طاولة رئيسية للأعراس",       price: 650, duration: 90, desc: "طاولة المنصة أو طاولة العروسين" },

  // ── تزيين المناسبات والأفراح ──────────────────────────────────────
  { cat: "تزيين المناسبات والأفراح", name: "تزيين مقعدي العروسين",      price:  800, duration: 120, desc: "كوشة وتزيين مقعد الشرف للعروسين" },
  { cat: "تزيين المناسبات والأفراح", name: "تزيين مائدة عقد القران",    price: 1200, duration: 150, desc: "مائدة عقد القران مع تنسيقات كاملة" },
  { cat: "تزيين المناسبات والأفراح", name: "تزيين مدخل القاعة",         price: 1500, duration: 180, desc: "مدخل قاعة بالورود والإطارات" },
  { cat: "تزيين المناسبات والأفراح", name: "تزيين قاعة أفراح كاملة",   price: 8500, duration: 480, desc: "تزيين شامل: منصة + طاولات + مدخل" },
  { cat: "تزيين المناسبات والأفراح", name: "استقبال مولود أنثى",        price:  950, duration: 120, desc: "تزيين استقبال مولود باللون الوردي" },
  { cat: "تزيين المناسبات والأفراح", name: "استقبال مولود ذكر",         price:  950, duration: 120, desc: "تزيين استقبال مولود باللون الأزرق" },
  { cat: "تزيين المناسبات والأفراح", name: "تزيين حفلة عيد ميلاد",      price:  600, duration: 120, desc: "طاولة عيد ميلاد مع بالونات وورود" },
  { cat: "تزيين المناسبات والأفراح", name: "تزيين حفل تخرج",            price:  750, duration: 120, desc: "منصة وطاولة بورود التخرج" },
  { cat: "تزيين المناسبات والأفراح", name: "تزيين جلسة تصوير",          price:  400, duration:  90, desc: "خلفية وإكسسوارات للتصوير" },

  // ── نباتات طبيعية ────────────────────────────────────────────────
  { cat: "نباتات طبيعية", name: "نبتة سكولينتس في إناء ديكوري",        price:  85, duration: 10 },
  { cat: "نباتات طبيعية", name: "حديقة زجاجية صغيرة (تيراريوم)",       price: 220, duration: 30, desc: "حديقة مصغرة في وعاء زجاجي" },
  { cat: "نباتات طبيعية", name: "نبتة ورد طبيعية في أصيص",             price: 120, duration: 10 },
  { cat: "نباتات طبيعية", name: "نبتة أوركيد في أصيص فاخر",            price: 280, duration: 10 },
  { cat: "نباتات طبيعية", name: "تنسيق نباتات داخلية (مجموعة)",        price: 450, duration: 45, desc: "مجموعة نباتات داخلية للمكتب أو البيت" },
  { cat: "نباتات طبيعية", name: "نبتة بونساي صغيرة",                   price: 350, duration: 10 },

  // ── هدايا مصاحبة ─────────────────────────────────────────────────
  { cat: "هدايا مصاحبة", name: "شوكولاتة بلجيكية فاخرة",               price:  75, duration:  5 },
  { cat: "هدايا مصاحبة", name: "دبدوب هدية (بدون ورد)",                 price:  65, duration:  5 },
  { cat: "هدايا مصاحبة", name: "شمعة معطرة فاخرة",                     price:  65, duration:  5 },
  { cat: "هدايا مصاحبة", name: "بالونات لاتيكس (مجموعة 10)",            price:  45, duration: 10 },
  { cat: "هدايا مصاحبة", name: "بالون فويل بريشة مع ورد",              price:  55, duration: 10 },
  { cat: "هدايا مصاحبة", name: "كرت تهنئة مكتوب يدوياً",               price:  25, duration:  5 },
  { cat: "هدايا مصاحبة", name: "كرت تهنئة فاخر مع تغليف",             price:  40, duration:  5 },
  { cat: "هدايا مصاحبة", name: "عطر فاخر مع باقة",                    price: 180, duration: 10 },

  // ── ورود مفردة مقطوعة ────────────────────────────────────────────
  { cat: "ورود مفردة مقطوعة", name: "وردة حمراء مفردة",                price:  15, duration:  5 },
  { cat: "ورود مفردة مقطوعة", name: "زهرة أوركيد مفردة",              price:  25, duration:  5 },
  { cat: "ورود مفردة مقطوعة", name: "زهرة تيولب مفردة",              price:  12, duration:  5 },
  { cat: "ورود مفردة مقطوعة", name: "زهرة جربيرا مفردة",              price:  10, duration:  5 },
  { cat: "ورود مفردة مقطوعة", name: "بنش (25 ساق) — حسب الصنف",       price:  85, duration:  5, desc: "سعر يختلف حسب الصنف" },
];

function slugify(name: string, sort: number) {
  return `flower-${sort}-${Date.now()}`;
}

async function seedCategories(client: any, orgId: string) {
  console.log("    [2/6] التصنيفات...");
  for (const c of CATEGORIES) {
    const exists = await client.query(
      `SELECT id FROM categories WHERE org_id=$1 AND name=$2`, [orgId, c.name]
    );
    if (exists.rows[0]) continue;
    const slug = `flower-cat-${c.sort}-${Math.random().toString(36).slice(2, 7)}`;
    await client.query(
      `INSERT INTO categories (org_id, name, slug, sort_order)
       VALUES ($1,$2,$3,$4)`,
      [orgId, c.name, slug, c.sort]
    );
  }
  console.log(`          ${CATEGORIES.length} تصنيف`);
}

async function seedServices(client: any, orgId: string) {
  console.log("    [3/6] الخدمات والمنتجات...");
  const cats = await client.query(
    `SELECT id, name FROM categories WHERE org_id = $1`,
    [orgId]
  );
  const catMap: Record<string, string> = {};
  for (const r of cats.rows) catMap[r.name] = r.id;

  let created = 0;
  for (const s of SERVICES) {
    const exists = await client.query(
      `SELECT id FROM services WHERE org_id=$1 AND name=$2`,
      [orgId, s.name]
    );
    if (exists.rows[0]) continue;
    const svcSlug = `flower-svc-${Math.random().toString(36).slice(2, 9)}`;
    await client.query(
      `INSERT INTO services
         (org_id, category_id, name, slug, description, base_price, duration_minutes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active')`,
      [orgId, catMap[s.cat] ?? null, s.name, svcSlug, s.desc ?? null, s.price, s.duration]
    );
    created++;
  }
  console.log(`          ${created} خدمة جديدة (${SERVICES.length} إجمالاً)`);
}

// ─── أصناف الورد ─────────────────────────────────────────────────────────────

// enum values: flower_type, color(en), origin(en), grade(en), size(en), bloom(en)
const FLOWER_VARIANTS = [
  { type: "rose",      color: "red",      origin: "dutch",       grade: "premium_plus", size: "medium", bloom: "semi_open",  nameAr: "ورد أحمر هولندي فاخر",    cost: "3.50", sell: "7.50",  shelf: 7  },
  { type: "rose",      color: "white",    origin: "dutch",       grade: "premium_plus", size: "medium", bloom: "semi_open",  nameAr: "ورد أبيض هولندي",          cost: "3.50", sell: "7.50",  shelf: 7  },
  { type: "rose",      color: "pink",     origin: "dutch",       grade: "grade_a",      size: "medium", bloom: "semi_open",  nameAr: "ورد وردي فاتح هولندي",     cost: "3.00", sell: "6.50",  shelf: 7  },
  { type: "rose",      color: "pink",     origin: "kenyan",      grade: "grade_a",      size: "large",  bloom: "semi_open",  nameAr: "ورد وردي داكن كيني",       cost: "3.80", sell: "8.00",  shelf: 6  },
  { type: "rose",      color: "yellow",   origin: "dutch",       grade: "grade_a",      size: "medium", bloom: "semi_open",  nameAr: "ورد أصفر هولندي",          cost: "3.00", sell: "6.50",  shelf: 7  },
  { type: "rose",      color: "orange",   origin: "ecuadorian",  grade: "premium_plus", size: "large",  bloom: "semi_open",  nameAr: "ورد برتقالي إكوادوري",     cost: "4.00", sell: "8.50",  shelf: 8  },
  { type: "rose",      color: "burgundy", origin: "ecuadorian",  grade: "premium_plus", size: "large",  bloom: "bud",        nameAr: "ورد أحمر ملكي إكوادوري",   cost: "5.50", sell: "11.00", shelf: 9  },
  { type: "rose",      color: "purple",   origin: "dutch",       grade: "grade_a",      size: "medium", bloom: "semi_open",  nameAr: "ورد أرجواني هولندي",        cost: "4.20", sell: "9.00",  shelf: 7  },
  { type: "rose",      color: "peach",    origin: "ecuadorian",  grade: "premium",      size: "large",  bloom: "semi_open",  nameAr: "ورد بيج إكوادوري",         cost: "4.50", sell: "9.50",  shelf: 8  },
  { type: "orchid",    color: "white",    origin: "thailand",    grade: "grade_a",      size: "xl",     bloom: "open",       nameAr: "أوركيد أبيض تايلاندي",    cost: "8.00", sell: "16.00", shelf: 12 },
  { type: "orchid",    color: "purple",   origin: "thailand",    grade: "grade_a",      size: "xl",     bloom: "open",       nameAr: "أوركيد بنفسجي تايلاندي",  cost: "9.00", sell: "18.00", shelf: 12 },
  { type: "gypsophila",color: "white",    origin: "turkish",     grade: "grade_a",      size: "large",  bloom: "open",       nameAr: "بيبي بريث أبيض تركي",     cost: "1.20", sell: "2.80",  shelf: 8  },
  { type: "lavender",  color: "lavender", origin: "france",      grade: "grade_a",      size: "small",  bloom: "open",       nameAr: "لفندر فرنسي طبيعي",        cost: "2.50", sell: "5.50",  shelf: 6  },
  { type: "tulip",     color: "red",      origin: "dutch",       grade: "grade_a",      size: "medium", bloom: "bud",        nameAr: "تيولب أحمر هولندي",        cost: "4.00", sell: "8.50",  shelf: 5  },
  { type: "tulip",     color: "white",    origin: "dutch",       grade: "grade_a",      size: "medium", bloom: "bud",        nameAr: "تيولب أبيض هولندي",        cost: "4.00", sell: "8.50",  shelf: 5  },
  { type: "tulip",     color: "pink",     origin: "dutch",       grade: "grade_a",      size: "medium", bloom: "bud",        nameAr: "تيولب وردي هولندي",        cost: "4.00", sell: "8.50",  shelf: 5  },
  { type: "gerbera",   color: "red",      origin: "kenyan",      grade: "grade_a",      size: "large",  bloom: "open",       nameAr: "جربيرا أحمر كيني",         cost: "2.00", sell: "4.50",  shelf: 6  },
  { type: "gerbera",   color: "pink",     origin: "kenyan",      grade: "grade_a",      size: "large",  bloom: "open",       nameAr: "جربيرا وردي كيني",         cost: "2.00", sell: "4.50",  shelf: 6  },
  { type: "lisianthus",color: "white",    origin: "japan",       grade: "premium_plus", size: "medium", bloom: "semi_open",  nameAr: "ليزيانثس أبيض ياباني",     cost: "6.00", sell: "13.00", shelf: 10 },
  { type: "sunflower", color: "yellow",   origin: "other",       grade: "grade_a",      size: "xl",     bloom: "semi_open",  nameAr: "زهرة عباد الشمس",          cost: "3.50", sell: "7.50",  shelf: 7  },
  { type: "carnation", color: "red",      origin: "colombian",   grade: "grade_a",      size: "medium", bloom: "open",       nameAr: "قرنفل أحمر كولومبي",       cost: "1.80", sell: "4.00",  shelf: 10 },
  { type: "carnation", color: "white",    origin: "colombian",   grade: "grade_a",      size: "medium", bloom: "open",       nameAr: "قرنفل أبيض كولومبي",       cost: "1.80", sell: "4.00",  shelf: 10 },
  { type: "lily",      color: "white",    origin: "dutch",       grade: "premium",      size: "xl",     bloom: "semi_open",  nameAr: "زنبق أبيض هولندي",         cost: "5.00", sell: "10.00", shelf: 8  },
  { type: "freesia",   color: "white",    origin: "dutch",       grade: "grade_a",      size: "medium", bloom: "semi_open",  nameAr: "فريزيا بيضاء هولندية",     cost: "2.50", sell: "5.50",  shelf: 7  },
  { type: "peony",     color: "pink",     origin: "dutch",       grade: "premium_plus", size: "large",  bloom: "semi_open",  nameAr: "فاوانيا وردي هولندي",       cost: "9.00", sell: "18.00", shelf: 5  },
];

async function seedFlowerVariants(client: any, orgId: string) {
  console.log("    [4/6] أصناف الورد والتسعيرة...");
  let created = 0;

  for (const v of FLOWER_VARIANTS) {
    // flower_variants is a GLOBAL table (no org_id) — upsert by unique key
    const ins = await client.query(
      `INSERT INTO flower_variants
         (flower_type, color, origin, grade, size, bloom_stage,
          display_name_ar, shelf_life_days, base_price_per_stem, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       ON CONFLICT (flower_type, color, origin, grade, size, bloom_stage) DO UPDATE
         SET display_name_ar = EXCLUDED.display_name_ar
       RETURNING id`,
      [v.type, v.color, v.origin, v.grade, v.size, v.bloom, v.nameAr, v.shelf, v.cost]
    );
    const variantId = ins.rows[0].id;

    // per-org pricing
    const pricingExists = await client.query(
      `SELECT id FROM flower_variant_pricing WHERE org_id=$1 AND variant_id=$2`,
      [orgId, variantId]
    );
    if (pricingExists.rows[0]) {
      await client.query(
        `UPDATE flower_variant_pricing SET price_per_stem=$3, cost_per_stem=$4 WHERE org_id=$1 AND variant_id=$2`,
        [orgId, variantId, v.sell, v.cost]
      );
    } else {
      await client.query(
        `INSERT INTO flower_variant_pricing (org_id, variant_id, price_per_stem, cost_per_stem, notes)
         VALUES ($1,$2,$3,$4,'سعر مرجعي')`,
        [orgId, variantId, v.sell, v.cost]
      );
    }
    created++;
  }
  console.log(`          ${created} صنف ورد (${FLOWER_VARIANTS.length} إجمالاً)`);
}

// ─── أصول الديكور ────────────────────────────────────────────────────────────

/*
 * سلسلة علاقات الأصل:
 *   decor_assets
 *     ← decor_asset_movements (كل تغيير في الحالة)
 *     ← decor_asset_maintenance_logs (سجل الصيانة)
 *     ← decor_asset_reservations (الحجوزات — تربطه بـ service_orders)
 *         ← service_orders (المشروع الميداني)
 *             ← return_inspections (فحص المرتجعات)
 */

// categories: artificial_flowers | stands | backdrops | vases | holders | decor | kiosk_equipment | other
const DECOR_ASSETS: { name: string; category: string; code: string; cost: number; notes: string }[] = [
  // ── كوشات زفاف (kiosk_equipment) ────────────────────────────────
  { name: "كوش أبيض كلاسيكي مقوس",         category: "kiosk_equipment", code: "ARCH-W-001", cost: 1800, notes: "كوش قوسي معدني أبيض — مناسب للأفراح والخطبة" },
  { name: "كوش ذهبي معدني بأوراق",          category: "kiosk_equipment", code: "ARCH-G-001", cost: 2500, notes: "كوش ذهبي اللون مزيّن بأوراق معدنية" },
  { name: "كوش خشبي ريفي (بوهيمي)",        category: "kiosk_equipment", code: "ARCH-B-001", cost: 1500, notes: "كوش خشب طبيعي للطابع الريفي والبوهيمي" },
  { name: "كوش معدني أسود حديث",           category: "kiosk_equipment", code: "ARCH-K-001", cost: 2200, notes: "كوش أسود اللون للطابع العصري" },
  // ── خلفيات وإطارات (backdrops) ──────────────────────────────────
  { name: "إطار دائري كبير 2 متر (ذهبي)",  category: "backdrops",       code: "CIRC-L-001", cost: 1200, notes: "إطار دائري ذهبي قطر 2 متر — للأزهار والتصوير" },
  { name: "إطار دائري متوسط 1.5 متر",      category: "backdrops",       code: "CIRC-M-001", cost:  900, notes: "إطار دائري ذهبي قطر 1.5 متر" },
  { name: "إطار مربع كبير 2×2 متر",        category: "backdrops",       code: "SQFR-L-001", cost: 1100, notes: "إطار مربع للخلفية الزهرية" },
  { name: "خلفية أزهار جدارية 2×2 متر",    category: "backdrops",       code: "WALL-001",   cost: 3200, notes: "خلفية ورود بيضاء وزهرية جاهزة للتركيب" },
  { name: "خلفية بيبي بريث جدارية",        category: "backdrops",       code: "WALL-002",   cost: 2800, notes: "خلفية بيبي بريث بيضاء فاخرة" },
  // ── حوامل (stands) ──────────────────────────────────────────────
  { name: "حامل باقة أبيض طويل (زوج)",    category: "stands",           code: "STD-W-001",  cost:  600, notes: "زوج حوامل بيضاء طول 1.5 متر" },
  { name: "حامل باقة ذهبي طويل (زوج)",    category: "stands",           code: "STD-G-001",  cost:  750, notes: "زوج حوامل ذهبية طول 1.5 متر" },
  { name: "حامل شمعة طويل ذهبي (زوج)",    category: "stands",           code: "STD-C-001",  cost:  400, notes: "حوامل شموع طويلة للأجواء الرومانسية" },
  { name: "حامل أعواد تنسيق متعدد",        category: "stands",           code: "POLE-001",   cost:  350, notes: "حامل قابل للتعديل لتنسيقات الأعواد" },
  // ── مزهريات (vases) ─────────────────────────────────────────────
  { name: "مزهرية كريستال طويلة (مجموعة 5)", category: "vases",         code: "VAZ-C-001",  cost:  950, notes: "مزهريات كريستال فاخرة للطاولات الرئيسية" },
  { name: "قاعدة زجاجية مرتفعة (مجموعة 10)", category: "vases",         code: "VAZ-G-001",  cost:  800, notes: "قواعد زجاجية مرتفعة للطاولات" },
  // ── ديكور عام (decor) ───────────────────────────────────────────
  { name: "طقم عوارض تعليق سقف",           category: "decor",           code: "CEIL-001",   cost:  700, notes: "نظام تعليق للكاسكيدات والزينة السقفية" },
];

async function seedDecorAssets(client: any, orgId: string) {
  console.log("    [5/6] أصول الديكور (كوش وإطارات وحوامل)...");
  let created = 0;

  for (const a of DECOR_ASSETS) {
    const exists = await client.query(
      `SELECT id FROM decor_assets WHERE org_id=$1 AND code=$2`,
      [orgId, a.code]
    );
    if (exists.rows[0]) continue;

    const ins = await client.query(
      `INSERT INTO decor_assets
         (org_id, name, category, status, purchase_cost, code, notes)
       VALUES ($1,$2,$3,'available',$4,$5,$6)
       RETURNING id`,
      [orgId, a.name, a.category, a.cost, a.code, a.notes]
    );

    // سجّل حركة إضافة أولى (movement_type: available = أصبح متاحاً)
    await client.query(
      `INSERT INTO decor_asset_movements
         (asset_id, org_id, movement_type, notes)
       VALUES ($1,$2,'available','إضافة أصل جديد للمخزون')`,
      [ins.rows[0].id, orgId]
    );
    created++;
  }
  console.log(`          ${created} أصل ديكور جديد`);
}

// ─── مشروع تجريبي يربط الأصول ────────────────────────────────────────────────

async function seedDemoServiceOrder(client: any, orgId: string) {
  // تحقق مسبق: هل يوجد مشروع تجريبي
  const exists = await client.query(
    `SELECT id FROM service_orders WHERE org_id=$1 AND order_number='SO-DEMO-001'`,
    [orgId]
  );
  if (exists.rows[0]) {
    console.log("    [6/6] مشروع تجريبي موجود مسبقاً — تخطي");
    return { orderId: exists.rows[0].id };
  }

  console.log("    [6/6] إنشاء مشروع تجريبي لحفل زفاف + ربط الأصول...");

  // أنشئ المشروع
  const order = await client.query(
    `INSERT INTO service_orders
       (org_id, order_number, type, status,
        customer_name, customer_phone, event_date,
        event_location, deposit_amount, total_amount, notes)
     VALUES ($1,'SO-DEMO-001','kiosk','closed',
       'سارة العلي','+966501234567',
       (NOW() - INTERVAL '7 days')::date,
       'قاعة النجوم — الرياض حي الملك فهد',
       2500, 8500,
       'مشروع تجريبي لفحص ترابط بيانات الكوش والأصول')
     RETURNING id`,
    [orgId]
  );
  const orderId = order.rows[0].id;

  // احجز ثلاثة أصول: كوش أبيض + إطار دائري + حامل ذهبي
  const assets = await client.query(
    `SELECT id, name FROM decor_assets
     WHERE org_id=$1 AND code = ANY($2::text[])`,
    [orgId, ["ARCH-W-001", "CIRC-L-001", "STD-G-001"]]
  );

  for (const asset of assets.rows) {
    await client.query(
      `INSERT INTO decor_asset_reservations
         (asset_id, service_order_id, org_id, status)
       VALUES ($1,$2,$3,'returned_ok')`,
      [asset.id, orderId, orgId]
    );

    // حركة: أُعير ثم أُعيد
    await client.query(
      `INSERT INTO decor_asset_movements (asset_id, org_id, movement_type, notes)
       VALUES ($1,$2,'dispatched','أُرسل لحفل زفاف عائلة العلي')`,
      [asset.id, orgId]
    );
    await client.query(
      `INSERT INTO decor_asset_movements (asset_id, org_id, movement_type, notes)
       VALUES ($1,$2,'returned','أُعيد بحالة سليمة')`,
      [asset.id, orgId]
    );

    // تحديث حالة الأصل إلى متاح
    await client.query(
      `UPDATE decor_assets SET status='available', updated_at=NOW() WHERE id=$1`,
      [asset.id]
    );
  }

  // سجل فحص المرتجعات
  const inspection = [
    { assetId: assets.rows[0]?.id, result: "ok",   note: "الكوش سليم بالكامل" },
    { assetId: assets.rows[1]?.id, result: "ok",   note: "الإطار سليم، لا أضرار" },
    { assetId: assets.rows[2]?.id, result: "ok",   note: "الحوامل سليمة" },
  ].filter(i => i.assetId);

  await client.query(
    `INSERT INTO return_inspections
       (service_order_id, org_id, assets_inspection, materials_waste, notes)
     VALUES ($1,$2,$3::jsonb,'[]'::jsonb,'فحص مكتمل — جميع الأصول سليمة')`,
    [orderId, orgId, JSON.stringify(inspection)]
  );

  console.log(`          مشروع ${orderId} مع ${assets.rows.length} أصول مرتبطة`);
  return { orderId };
}

// ─── التحقق من سلامة الترابط ─────────────────────────────────────────────────

async function verifyRelationships(client: any, orgId: string, orderId: string) {
  console.log("\n    >>> التحقق من سلامة الترابط...\n");
  const checks: { label: string; ok: boolean; count?: number }[] = [];

  const chk = async (label: string, sql: string, params: any[]) => {
    const r = await client.query(sql, params);
    const count = Number(r.rows[0]?.count ?? 0);
    checks.push({ label, ok: count > 0, count });
  };

  await chk("flower_variants",           `SELECT COUNT(*) FROM flower_variants`, []);
  await chk("flower_variant_pricing",    `SELECT COUNT(*) FROM flower_variant_pricing WHERE org_id=$1`, [orgId]);
  await chk("services",                  `SELECT COUNT(*) FROM services WHERE org_id=$1`, [orgId]);
  await chk("categories",                `SELECT COUNT(*) FROM categories WHERE org_id=$1`, [orgId]);
  await chk("decor_assets",              `SELECT COUNT(*) FROM decor_assets WHERE org_id=$1`, [orgId]);
  await chk("decor_asset_movements",     `SELECT COUNT(*) FROM decor_asset_movements WHERE org_id=$1`, [orgId]);
  await chk("service_orders",            `SELECT COUNT(*) FROM service_orders WHERE org_id=$1`, [orgId]);
  await chk("decor_asset_reservations",  `SELECT COUNT(*) FROM decor_asset_reservations WHERE org_id=$1`, [orgId]);
  await chk("return_inspections",        `SELECT COUNT(*) FROM return_inspections WHERE org_id=$1`, [orgId]);

  // فحص FK: كل حجز له أصل وأمر خدمة صالح
  const fkCheck = await client.query(
    `SELECT COUNT(*) FROM decor_asset_reservations r
     LEFT JOIN decor_assets a ON a.id=r.asset_id
     LEFT JOIN service_orders so ON so.id=r.service_order_id
     WHERE r.org_id=$1 AND (a.id IS NULL OR so.id IS NULL)`,
    [orgId]
  );
  checks.push({ label: "FK سلامة decor_asset_reservations", ok: Number(fkCheck.rows[0].count) === 0, count: Number(fkCheck.rows[0].count) });

  // فحص: كل تسعيرة لها variant موجود (flower_variants جدول عالمي)
  const priceFk = await client.query(
    `SELECT COUNT(*) FROM flower_variant_pricing p
     LEFT JOIN flower_variants v ON v.id=p.variant_id
     WHERE p.org_id=$1 AND v.id IS NULL`,
    [orgId]
  );
  checks.push({ label: "FK سلامة flower_variant_pricing", ok: Number(priceFk.rows[0].count) === 0, count: Number(priceFk.rows[0].count) });

  // تحديث: اعتبر flower_variants ناجحة إذا وجدت تسعيرة
  checks[0].ok = checks[1].count > 0;

  for (const c of checks) {
    const icon = c.ok ? "✓" : "✗";
    const val = c.label.startsWith("FK") ? (c.ok ? "صحيح" : `${c.count} خطأ`) : c.count;
    console.log(`          ${icon}  ${c.label.padEnd(40)} ${val}`);
  }

  const failed = checks.filter(c => !c.ok);
  if (failed.length > 0) {
    throw new Error(`فشل في التحقق: ${failed.map(c => c.label).join(", ")}`);
  }
  console.log("\n          جميع الفحوصات ناجحة\n");
}

run().catch(() => process.exit(1));
