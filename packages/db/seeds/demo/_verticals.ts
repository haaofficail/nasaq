/**
 * Special Verticals — بيانات عميقة للأنواع التي لها جداول متخصصة
 * يستخدم الأعمدة الفعلية الموجودة في قاعدة البيانات.
 */

import { pick, rand, fmt, iso, randomDate, nextBookingNumber } from "./_shared";

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Product shape accepted by seedInventoryVertical */
export interface InventoryProductInput {
  name: string;
  nameEn?: string;
  sku?: string;
  category: string;
  unit: string;
  unitCost: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  maxStock?: number | null;
  notes?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgCustomers(client: any, orgId: string) {
  const r = await client.query(
    `SELECT id, name, phone FROM customers WHERE org_id = $1 LIMIT 30`,
    [orgId]
  );
  return r.rows as Array<{ id: string; name: string; phone: string }>;
}

async function getOrgServices(client: any, orgId: string) {
  const r = await client.query(
    `SELECT id, name, base_price, duration_minutes FROM services WHERE org_id = $1`,
    [orgId]
  );
  return r.rows as Array<{ id: string; name: string; base_price: string; duration_minutes: number }>;
}

// ─── FLOWER SHOP ─────────────────────────────────────────────────────────────
// Tables: flower_variants, flower_batches, categories, services,
//         event_package_templates, event_package_template_items,
//         decor_assets, service_orders
// NOTE: inventory_products are seeded via seedInventoryVertical(FLOWER_SHOP_PRODUCTS)

/** 20 realistic flower-shop inventory products passed to seedInventoryVertical */
export const FLOWER_SHOP_PRODUCTS: InventoryProductInput[] = [
  { name: "ورق تغليف شفاف للباقات",         nameEn: "Clear Cellophane Wrap",             sku: "FLWR-00101", category: "أدوات التغليف",         unit: "رول",      unitCost: 25, sellingPrice: 45, stock: 50,  minStock: 10,  maxStock: 100, notes: "ورق شفاف عالي الجودة لتغليف الباقات بمقاس 60×60 سم" },
  { name: "شريط ساتان أبيض 5م",              nameEn: "White Satin Ribbon 5m",             sku: "FLWR-00102", category: "أدوات التغليف",         unit: "رول",      unitCost: 8,  sellingPrice: 15, stock: 200, minStock: 50,  maxStock: 500, notes: null },
  { name: "إسفنج الزهور الأخضر Oasis",       nameEn: "Oasis Floral Foam",                 sku: "FLWR-00201", category: "مستلزمات الزهور",       unit: "قطعة",     unitCost: 12, sellingPrice: 22, stock: 100, minStock: 30,  maxStock: null, notes: null },
  { name: "سلك الزهور 0.8mm",                nameEn: "Floral Wire 0.8mm",                 sku: "FLWR-00202", category: "مستلزمات الزهور",       unit: "علبة",     unitCost: 18, sellingPrice: 35, stock: 60,  minStock: 15,  maxStock: null, notes: null },
  { name: "مادة حافظة للزهور Chrysal",       nameEn: "Chrysal Flower Food",               sku: "FLWR-00203", category: "مستلزمات الزهور",       unit: "لتر",      unitCost: 45, sellingPrice: 80, stock: 30,  minStock: 8,   maxStock: null, notes: null },
  { name: "مقص الزهور الاحترافي",             nameEn: "Professional Floral Scissors",      sku: "FLWR-00204", category: "مستلزمات الزهور",       unit: "قطعة",     unitCost: 85, sellingPrice: 150, stock: 10, minStock: 2,   maxStock: null, notes: null },
  { name: "وعاء زجاجي شفاف 30cm",            nameEn: "Glass Vase 30cm",                   sku: "FLWR-00301", category: "الأوعية والقواعد",      unit: "قطعة",     unitCost: 35, sellingPrice: 75, stock: 40,  minStock: 10,  maxStock: null, notes: null },
  { name: "وعاء خزفي أبيض مربع",             nameEn: "White Ceramic Square Pot",          sku: "FLWR-00302", category: "الأوعية والقواعد",      unit: "قطعة",     unitCost: 28, sellingPrice: 65, stock: 30,  minStock: 8,   maxStock: null, notes: null },
  { name: "قاعدة سيلندر كريستال 20cm",       nameEn: "Crystal Cylinder Base 20cm",        sku: "FLWR-00303", category: "الأوعية والقواعد",      unit: "قطعة",     unitCost: 55, sellingPrice: 120, stock: 20, minStock: 5,   maxStock: null, notes: null },
  { name: "صندوق هدية أبيض مع غطاء",         nameEn: "White Gift Box with Lid",           sku: "FLWR-00401", category: "أدوات التغليف",         unit: "قطعة",     unitCost: 12, sellingPrice: 25, stock: 80,  minStock: 20,  maxStock: null, notes: null },
  { name: "ورق كرافت بني للتغليف",           nameEn: "Brown Kraft Paper",                 sku: "FLWR-00402", category: "أدوات التغليف",         unit: "رول",      unitCost: 20, sellingPrice: 38, stock: 35,  minStock: 10,  maxStock: null, notes: null },
  { name: "سبراي لمعة الأوراق الخضراء",      nameEn: "Leaf Shine Spray",                  sku: "FLWR-00501", category: "مواد الحفظ والصيانة",   unit: "علبة",     unitCost: 30, sellingPrice: 55, stock: 25,  minStock: 6,   maxStock: null, notes: null },
  { name: "محلول حفظ الورود المقطوعة",       nameEn: "Cut Flower Preservative",           sku: "FLWR-00502", category: "مواد الحفظ والصيانة",   unit: "لتر",      unitCost: 40, sellingPrice: 75, stock: 20,  minStock: 5,   maxStock: null, notes: null },
  { name: "ربطة حرير ذهبية 2م",              nameEn: "Gold Silk Ribbon 2m",               sku: "FLWR-00403", category: "أدوات التغليف",         unit: "قطعة",     unitCost: 6,  sellingPrice: 12, stock: 150, minStock: 30,  maxStock: null, notes: null },
  { name: "كارت رسالة شخصي فاخر",            nameEn: "Luxury Personal Message Card",      sku: "FLWR-00601", category: "الإضافات والهدايا",     unit: "قطعة",     unitCost: 2,  sellingPrice: 5,  stock: 500, minStock: 100, maxStock: null, notes: null },
  { name: "شمع عطري هدية صغير",              nameEn: "Small Aromatic Candle Gift",        sku: "FLWR-00602", category: "الإضافات والهدايا",     unit: "قطعة",     unitCost: 25, sellingPrice: 55, stock: 40,  minStock: 10,  maxStock: null, notes: null },
  { name: "بالون لاتكس شفاف 30cm",           nameEn: "Clear Latex Balloon 30cm",          sku: "FLWR-00603", category: "الإضافات والهدايا",     unit: "علبة 10",  unitCost: 15, sellingPrice: 28, stock: 60,  minStock: 15,  maxStock: null, notes: null },
  { name: "تربة نباتية عالية الجودة 5L",     nameEn: "Premium Potting Soil 5L",           sku: "FLWR-00304", category: "الأوعية والقواعد",      unit: "كيس",      unitCost: 18, sellingPrice: 35, stock: 45,  minStock: 10,  maxStock: null, notes: null },
  { name: "أحجار عرض ملونة للأوعية",         nameEn: "Decorative Colored Stones",         sku: "FLWR-00305", category: "الأوعية والقواعد",      unit: "كيس",      unitCost: 10, sellingPrice: 22, stock: 70,  minStock: 15,  maxStock: null, notes: null },
  { name: "شوكولاتة هدية بلجيكية صغيرة",    nameEn: "Small Belgian Gift Chocolate",       sku: "FLWR-00604", category: "الإضافات والهدايا",     unit: "علبة",     unitCost: 30, sellingPrice: 65, stock: 35,  minStock: 8,   maxStock: null, notes: null },
];

export async function seedFlowerVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // ── [A] flower_variants — 12 varieties ──────────────────────────────────────
  // Enums verified: flower_type, flower_color, flower_origin, flower_grade,
  //                 flower_size, bloom_stage
  const flowerVariants = [
    {
      type: "rose", color: "red", origin: "netherlands", grade: "grade_a",
      size: "medium", bloom: "semi_open",
      nameAr: "وردة حمراء هولندية درجة أولى", nameEn: "Red Rose Netherlands Grade A",
      price: 8, shelf: 10,
      notesAr: "وردة حمراء كثيفة البتلات ذات رائحة عطرة قوية مثالية للمناسبات الرومانسية.",
    },
    {
      type: "rose", color: "white", origin: "kenya", grade: "grade_a",
      size: "medium", bloom: "bud",
      nameAr: "وردة بيضاء كينية برعم", nameEn: "White Rose Kenya Bud",
      price: 6, shelf: 10,
      notesAr: "وردة بيضاء نقية في مرحلة البرعم مناسبة لتنسيقات الأعراس والعرائس.",
    },
    {
      type: "rose", color: "pink", origin: "ecuador", grade: "premium",
      size: "large", bloom: "semi_open",
      nameAr: "وردة وردية إكوادورية بريميوم", nameEn: "Pink Rose Ecuador Premium",
      price: 9, shelf: 12,
      notesAr: "وردة وردية كبيرة الحجم من أجود مزارع الإكوادور ذات عمر افتراضي ممتاز.",
    },
    {
      type: "lily", color: "white", origin: "netherlands", grade: "grade_a",
      size: "large", bloom: "open",
      nameAr: "زنبق أبيض هولندي", nameEn: "White Lily Netherlands",
      price: 12, shelf: 8,
      notesAr: "زنبق أبيض فاخر برائحة زكية يضفي جواً رومانسياً راقياً على أي تنسيق.",
    },
    {
      type: "orchid", color: "purple", origin: "thailand", grade: "premium",
      size: "small", bloom: "semi_open",
      nameAr: "أوركيد بنفسجي تايلاندي", nameEn: "Purple Orchid Thailand Premium",
      price: 35, shelf: 21,
      notesAr: "أوركيد بنفسجي نادر من تايلاند يعيش أسابيع مع الرعاية المناسبة.",
    },
    {
      type: "orchid", color: "white", origin: "thailand", grade: "premium",
      size: "small", bloom: "open",
      nameAr: "أوركيد أبيض فندالا", nameEn: "White Phalaenopsis Orchid",
      price: 40, shelf: 21,
      notesAr: "أوركيد أبيض من نوع فالينوبسيس مثالي للهدايا الراقية والمكاتب الفاخرة.",
    },
    {
      type: "tulip", color: "red", origin: "netherlands", grade: "grade_a",
      size: "medium", bloom: "bud",
      nameAr: "توليب أحمر هولندي", nameEn: "Red Tulip Netherlands",
      price: 10, shelf: 7,
      notesAr: "توليب أحمر زاهي اللون يفتح تدريجياً ليعطي بهاءً مميزاً للباقة.",
    },
    {
      type: "carnation", color: "pink", origin: "colombia", grade: "grade_a",
      size: "medium", bloom: "open",
      nameAr: "قرنفل وردي كولومبي", nameEn: "Pink Carnation Colombia",
      price: 4, shelf: 14,
      notesAr: "قرنفل وردي ذو عمر افتراضي طويل مناسب للباقات الاقتصادية والهدايا اليومية.",
    },
    {
      type: "sunflower", color: "yellow", origin: "local_saudi", grade: "grade_b",
      size: "large", bloom: "full_bloom",
      nameAr: "عباد الشمس الأصفر المحلي", nameEn: "Sunflower Local Saudi",
      price: 5, shelf: 7,
      notesAr: "عباد شمس بهيج اللون يضفي طابع البهجة والحيوية على أي تنسيق زهري.",
    },
    {
      type: "gypsophila", color: "white", origin: "netherlands", grade: "grade_a",
      size: "small", bloom: "open",
      nameAr: "جبسوفيلا أبيض (نسمة)", nameEn: "White Gypsophila Baby Breath",
      price: 3, shelf: 7,
      notesAr: "نسمة بيضاء ناعمة تستخدم لملء الباقات وإضافة اللمسة الخفيفة الجمالية.",
    },
    {
      type: "iris", color: "purple", origin: "netherlands", grade: "grade_a",
      size: "medium", bloom: "bud",
      nameAr: "أيريس بنفسجي هولندي", nameEn: "Purple Iris Netherlands",
      price: 9, shelf: 8,
      notesAr: "أيريس بنفسجي أنيق ذو شكل هندسي مميز يبرز في تنسيقات المؤتمرات والمكاتب.",
    },
    {
      type: "peony", color: "pink", origin: "france", grade: "premium",
      size: "large", bloom: "semi_open",
      nameAr: "فاوانيا وردية فرنسية", nameEn: "Pink Peony France Premium",
      price: 25, shelf: 7,
      notesAr: "فاوانيا فرنسية فاخرة ذات بتلات كثيفة ورائحة سحرية تُعدّ ملكة الزهور.",
    },
  ];

  const variantIds: string[] = [];
  const variantMap: Map<string, string> = new Map(); // key: type+color → id

  for (const v of flowerVariants) {
    const r = await client.query(
      `INSERT INTO flower_variants
         (flower_type, color, origin, grade, size, bloom_stage,
          display_name_ar, display_name_en, base_price_per_stem,
          shelf_life_days, notes_ar, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)
       ON CONFLICT (flower_type, color, origin, grade, size, bloom_stage) DO NOTHING
       RETURNING id`,
      [v.type, v.color, v.origin, v.grade, v.size, v.bloom,
       v.nameAr, v.nameEn, fmt(v.price), v.shelf, v.notesAr]
    );
    let vid: string | null = r.rows[0]?.id ?? null;
    if (!vid) {
      const existing = await client.query(
        `SELECT id FROM flower_variants
         WHERE flower_type=$1 AND color=$2 AND origin=$3 AND grade=$4 AND size=$5 AND bloom_stage=$6
         LIMIT 1`,
        [v.type, v.color, v.origin, v.grade, v.size, v.bloom]
      );
      vid = existing.rows[0]?.id ?? null;
    }
    if (vid) {
      variantIds.push(vid);
      variantMap.set(`${v.type}:${v.color}`, vid);
    }
  }

  // ── [B] flower_batches — one batch per variant ───────────────────────────────
  const batchQuantities = [200, 180, 150, 120, 80, 70, 100, 130, 90, 300, 110, 60];
  for (let i = 0; i < variantIds.length; i++) {
    const vid = variantIds[i];
    const v = flowerVariants[i];
    const qty = batchQuantities[i] ?? rand(50, 200);
    await client.query(
      `INSERT INTO flower_batches
         (org_id, variant_id, batch_number, quantity_received, quantity_remaining,
          unit_cost, received_at, expiry_estimated,
          current_bloom_stage, quality_status, is_active)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,'fresh',true)
       ON CONFLICT DO NOTHING`,
      [
        orgId, vid,
        `BATCH-${String(i + 1).padStart(3, "0")}-${rand(1000, 9999)}`,
        qty,
        fmt(v.price),
        iso(randomDate(7)),
        iso(new Date(Date.now() + v.shelf * 86400000)),
        v.bloom,
      ]
    );
  }

  // ── [C] categories — 6 categories ──────────────────────────────────────────
  const categoryDefs = [
    {
      slug: "flower-bouquets", name: "باقات الورود", nameEn: "Flower Bouquets",
      description: "تشكيلة متنوعة من الباقات المصممة لكل مناسبة بأفضل الزهور الطازجة",
      icon: "bouquet", sort: 1,
    },
    {
      slug: "wedding-floral", name: "تنسيقات الأعراس", nameEn: "Wedding Floral",
      description: "خدمات تنسيق زهور الأعراس الكاملة من الكوش حتى طاولات الضيوف",
      icon: "wedding", sort: 2,
    },
    {
      slug: "gift-boxes", name: "الهدايا والصناديق", nameEn: "Gift Boxes",
      description: "صناديق هدايا فاخرة تجمع بين الورود والشوكولاتة والإكسسوارات",
      icon: "gift", sort: 3,
    },
    {
      slug: "natural-plants", name: "النباتات الطبيعية", nameEn: "Natural Plants",
      description: "نباتات داخلية وخارجية مع وعاء مميز ودليل العناية",
      icon: "plant", sort: 4,
    },
    {
      slug: "event-arrangements", name: "تنسيقات المناسبات", nameEn: "Event Arrangements",
      description: "تنسيقات خاصة للمؤتمرات والحفلات وافتتاح المحلات",
      icon: "event", sort: 5,
    },
    {
      slug: "floral-decor", name: "الديكور الزهري", nameEn: "Floral Decor",
      description: "لوحات وإطارات وديكورات من الورود الجافة والمحفوظة",
      icon: "decor", sort: 6,
    },
  ];

  const catMap: Map<string, string> = new Map(); // name → id
  for (const cat of categoryDefs) {
    const r = await client.query(
      `INSERT INTO categories
         (org_id, name, name_en, slug, description, icon, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (org_id, slug) DO UPDATE
         SET description = EXCLUDED.description,
             name_en     = EXCLUDED.name_en,
             icon        = EXCLUDED.icon
       RETURNING id`,
      [orgId, cat.name, cat.nameEn, cat.slug, cat.description, cat.icon, cat.sort]
    );
    let catId: string | null = r.rows[0]?.id ?? null;
    if (!catId) {
      const ex = await client.query(
        `SELECT id FROM categories WHERE org_id=$1 AND slug=$2`, [orgId, cat.slug]
      );
      catId = ex.rows[0]?.id ?? null;
    }
    // Always patch ALL categories with this name (including auto-slug ones from createCatalog)
    await client.query(
      `UPDATE categories
       SET description = $1,
           name_en     = COALESCE(name_en, $2),
           icon        = COALESCE(icon, $3)
       WHERE org_id = $4 AND name = $5 AND (description IS NULL OR description = '')`,
      [cat.description, cat.nameEn, cat.icon, orgId, cat.name]
    );
    // Fall back to fetching by name if catId still null
    if (!catId) {
      const byName = await client.query(
        `SELECT id FROM categories WHERE org_id=$1 AND name=$2 LIMIT 1`, [orgId, cat.name]
      );
      catId = byName.rows[0]?.id ?? null;
    }
    if (catId) catMap.set(cat.name, catId);
  }

  // ── [D] services — 12 services ───────────────────────────────────────────────
  const serviceDefs = [
    {
      slug: "bouquet-red-24",
      name: "بوكيه ورد أحمر رومانسي 24 وردة",
      nameEn: "Romantic Red Rose Bouquet 24 Stems",
      category: "باقات الورود",
      price: 280, duration: 30,
      shortDesc: "باقة من 24 وردة حمراء طازجة مع ورق تغليف فاخر وشريط ساتان",
      desc: "باقة ورد أحمر رومانسية تضم 24 وردة هولندية طازجة من الدرجة الأولى. تُعبّأ بورق تغليف شفاف فاخر مع شريط ساتان أحمر وكارت إهداء شخصي. مثالية لأعياد الميلاد والذكرى السنوية وإظهار المشاعر الصادقة.",
    },
    {
      slug: "bouquet-mixed-seasonal",
      name: "بوكيه ورد مختلط موسمي",
      nameEn: "Mixed Seasonal Bouquet",
      category: "باقات الورود",
      price: 180, duration: 25,
      shortDesc: "مزيج مبهج من أجمل الزهور الموسمية بألوان زاهية",
      desc: "باقة زهور موسمية مبهجة تجمع بين أفضل أصناف الزهور المتوفرة في الموسم من ورود وقرنفل وجبسوفيلا. تُصمم يدوياً من قبل خبراء التنسيق بألوان منسجمة تناسب كل الأذواق. مثالية كهدية يومية أو تعبير عن الامتنان.",
    },
    {
      slug: "wedding-entrance-arch",
      name: "تنسيق كوش مدخل زفاف",
      nameEn: "Wedding Entrance Arch Floral Design",
      category: "تنسيقات الأعراس",
      price: 3500, duration: 240,
      shortDesc: "كوش زفاف ملكي بالورد الأبيض والأخضر مع إضاءة دافئة",
      desc: "كوش زفاف ملكي للمدخل يتضمن قوساً كبيراً من الورود الطبيعية البيضاء والخضراء مع أوراق نباتية منسجمة. يُنفذ بإضاءة LED دافئة تعزز الجمال وتمنح صوراً لا تُنسى. يشمل التركيب والإزالة بعد الحفل.",
    },
    {
      slug: "bridal-bouquet-crown",
      name: "بوكيه عروس مع تاج ورد طبيعي",
      nameEn: "Bridal Bouquet with Natural Flower Crown",
      category: "تنسيقات الأعراس",
      price: 650, duration: 60,
      shortDesc: "بوكيه عروس أنيق مع تاج ورد طبيعي يتناسق مع فستان الزفاف",
      desc: "بوكيه عروس بيد يصمم خصيصاً وفق لون وطراز فستان الزفاف من ورود وفاوانيا وأوركيد فاخرة. يرافقه تاج ورد طبيعي يُحاك يدوياً من ورود صغيرة وأوراق خضراء. يُقدم في صندوق هدية فاخر مع ضمان الطازجية.",
    },
    {
      slug: "wedding-table-arrangement",
      name: "تنسيق طاولات حفل زفاف (لكل طاولة)",
      nameEn: "Wedding Table Floral Arrangement Per Table",
      category: "تنسيقات الأعراس",
      price: 450, duration: 45,
      shortDesc: "تنسيق زهور احترافي لطاولة واحدة مع مزهرية كريستال",
      desc: "تنسيق زهري احترافي لطاولة ضيوف واحدة يشمل مزهرية كريستال مع ورود وفراشات خضراء ومتممات زهرية أنيقة. يُصمم بتناسق تام مع باقي تنسيقات القاعة ليعطي صورة متكاملة وجمالية. السعر للطاولة الواحدة مع إمكانية الخصم عند الطلب الجماعي.",
    },
    {
      slug: "orchid-gift-box",
      name: "صندوق هدية فاخر مع أوركيد",
      nameEn: "Luxury Gift Box with Orchid",
      category: "الهدايا والصناديق",
      price: 480, duration: 20,
      shortDesc: "صندوق هدية راقٍ يضم وردة أوركيد فاخرة مع شوكولاتة بلجيكية وكارت شخصي",
      desc: "صندوق هدية فاخر يحتوي على وردة أوركيد فالينوبسيس تايلاندية أصيلة في قصرة أنيقة مع علبة شوكولاتة بلجيكية فاخرة. يُغلف بورق الكرافت الفاخر ويرافقه كارت إهداء شخصي يُكتب باليد. هدية لا تُنسى لكل مناسبة.",
    },
    {
      slug: "preserved-flowers-box",
      name: "صندوق ورد دائم Preserved Flowers",
      nameEn: "Preserved Flowers Luxury Box",
      category: "الهدايا والصناديق",
      price: 580, duration: 20,
      shortDesc: "ورود محفوظة طبيعية تدوم لسنوات بدون ماء داخل صندوق هدية فاخر",
      desc: "ورود طبيعية محفوظة بتقنية إيتيرنا الياباني تدوم من سنة إلى ثلاث سنوات بدون ماء أو رعاية. تُوضع في صندوق هدية مخملي أسود أو أبيض حسب الطلب وتشكيلة ألوان متعددة. الخيار المثالي لمن يريد لفتة رومانسية دائمة.",
    },
    {
      slug: "ficus-ceramic-pot",
      name: "نبات فيكس داخلي مع وعاء خزفي",
      nameEn: "Indoor Ficus with Ceramic Pot",
      category: "النباتات الطبيعية",
      price: 220, duration: 15,
      shortDesc: "نبات فيكس صحي ومُعتنى به مع وعاء خزفي أنيق وتعليمات العناية",
      desc: "نبات فيكس داخلي صحي يُعتنى به بشكل احترافي في وعاء خزفي أبيض أو بيج أنيق. يأتي مع كارت عناية مكتوب يوضح احتياجات الريّ والإضاءة والتسميد. هدية مثالية للمنازل والمكاتب والاستقبالات الراقية.",
    },
    {
      slug: "succulent-set-3",
      name: "نبات سكولنت مجموعة 3 قطع",
      nameEn: "Succulent Set 3 Pcs",
      category: "النباتات الطبيعية",
      price: 150, duration: 15,
      shortDesc: "ثلاثة نباتات سكولنت متنوعة في أوعية صغيرة مثالية كهدية مكتبية",
      desc: "مجموعة ثلاثة نباتات سكولنت متنوعة الأشكال والألوان في أوعية سيراميك صغيرة تناسب المكاتب والطاولات. تحتاج حداً أدنى من الرعاية وتحمل درجات الحرارة العالية. هدية مكتبية عملية وجمالية لا تحتاج اهتماماً يومياً.",
    },
    {
      slug: "conference-table-arrangement",
      name: "تنسيق طاولة مؤتمر أو حفل",
      nameEn: "Conference Table Floral Arrangement",
      category: "تنسيقات المناسبات",
      price: 320, duration: 30,
      shortDesc: "تنسيق احترافي لطاولة مؤتمر أو حفل شركات مع الإزالة بعد الفعالية",
      desc: "تنسيق زهري احترافي لطاولات المؤتمرات والفعاليات الشركاتية يعكس هوية المنشأة وراقيّتها. يشمل الزهور الطازجة والأوعية الزجاجية الشفافة مع الإعداد والإزالة بعد الفعالية. متوفر بأحجام مختلفة ويمكن التخصيص حسب ألوان الشركة.",
    },
    {
      slug: "shop-opening-decor",
      name: "زينة افتتاح محل تجاري",
      nameEn: "Commercial Shop Opening Floral Package",
      category: "تنسيقات المناسبات",
      price: 1800, duration: 180,
      shortDesc: "حزمة زهور كاملة لافتتاح المحلات تشمل الكوش والطاولات والمدخل",
      desc: "حزمة تنسيق زهري شاملة لافتتاح المحلات التجارية تضم كوش مدخل وتنسيقات طاولات العرض وتزيين الواجهة بالزهور الطازجة. تُعطي انطباعاً أول لا يُنسى للعملاء وتعزز المصداقية التجارية. تشمل الإعداد والإشراف طوال فترة الافتتاح.",
    },
    {
      slug: "dried-flowers-wall-frame",
      name: "لوحة ورد جاف للجدار",
      nameEn: "Dried Flower Wall Art Frame",
      category: "الديكور الزهري",
      price: 380, duration: 45,
      shortDesc: "لوحة فنية من الورود الجافة المحفوظة بإطار خشبي للتعليق على الجدار",
      desc: "لوحة فنية يدوية الصنع من الورود الجافة والمحفوظة المرتبة في تصميم جمالي داخل إطار خشبي عصري. تدوم سنوات عدة دون أن تفقد جمالها وتُعدّ قطعة ديكور فريدة لأي منزل أو مكتب. متوفرة بأحجام متعددة وألوان قابلة للتخصيص.",
    },
  ];

  for (const svc of serviceDefs) {
    const catId = catMap.get(svc.category) ?? null;
    // Insert with clean slug (ON CONFLICT DO NOTHING for the clean slug)
    await client.query(
      `INSERT INTO services
         (org_id, category_id, name, name_en, slug, short_description, description,
          base_price, duration_minutes, status, offering_type,
          is_bookable, is_visible_in_pos, is_visible_online, is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active','service',true,true,true,true)
       ON CONFLICT (org_id, slug) DO UPDATE
         SET short_description = EXCLUDED.short_description,
             description       = EXCLUDED.description,
             name_en           = EXCLUDED.name_en,
             category_id       = COALESCE(EXCLUDED.category_id, services.category_id),
             base_price        = EXCLUDED.base_price,
             duration_minutes  = EXCLUDED.duration_minutes,
             status            = 'active'`,
      [orgId, catId, svc.name, svc.nameEn, svc.slug,
       svc.shortDesc, svc.desc, fmt(svc.price), svc.duration]
    );
    // Also update any existing service with the same name (created by createCatalog with auto-slug)
    // to ensure descriptions are never empty
    await client.query(
      `UPDATE services
       SET short_description = $1,
           description       = $2,
           name_en           = COALESCE(name_en, $3),
           category_id       = COALESCE(category_id, $4),
           status            = 'active'
       WHERE org_id = $5
         AND name   = $6
         AND (short_description IS NULL OR description IS NULL)`,
      [svc.shortDesc, svc.desc, svc.nameEn, catId, orgId, svc.name]
    );
  }

  // ── [E] event_package_templates — 5 packages ─────────────────────────────────
  // type values (CHECK constraint): kiosk|reception_table|entrance|wedding|newborn|custom
  const packageDefs = [
    {
      name: "باقة الزفاف الملكي الكامل", type: "wedding", workers: 8,
      description: "باقة شاملة تغطي كامل تنسيق زهور حفل الزفاف من الكوش إلى طاولات الضيوف وبوكيه العروس والمداخل وكل التفاصيل الزهرية الاحتفالية.",
      setupNotes: "يبدأ الإعداد قبل 6 ساعات من الحفل — فريق 8 أشخاص — يشمل التركيب والإشراف والإزالة الكاملة بعد الحفل.",
    },
    {
      name: "باقة طاولة الاستقبال", type: "reception_table", workers: 3,
      description: "تنسيق راقٍ لطاولة الاستقبال والتسجيل مع ورود طازجة وشموع وبطاقات ترحيب تعكس هوية المناسبة وتستقبل الضيوف بأسلوب فاخر.",
      setupNotes: "إعداد خلال ساعة — يشمل صيانة الزهور وتجديدها إذا تجاوزت الفعالية 8 ساعات.",
    },
    {
      name: "باقة كوش المدخل الفاخر", type: "entrance", workers: 4,
      description: "كوش زفاف كامل للمدخل بالورد الطبيعي الأبيض والأخضر مع قوسين جانبيين وممر من الورود يمتد لمسافة 3 أمتار على جانبي المدخل.",
      setupNotes: "إعداد خلال 3 ساعات — الارتفاع الأقصى 4 أمتار — يحتاج تصريح مسبق من إدارة القاعة.",
    },
    {
      name: "باقة استقبال مولود", type: "newborn", workers: 2,
      description: "تنسيق زهور احتفالي دافئ لاستقبال المولود الجديد مع بالونات وورود وردية أو زرقاء وهدايا احتفالية مناسبة للأم والمولود.",
      setupNotes: "إعداد خلال 45 دقيقة — مناسب للمستشفيات والبيوت — يراعي متطلبات بيئة النظافة.",
    },
    {
      name: "باقة مخصصة حسب الطلب", type: "custom", workers: 2,
      description: "نصمم معك باقتك المثالية حسب ميزانيتك وذوقك وطبيعة المناسبة سواء كانت عرساً أو خطوبة أو حفلاً أو تكريماً أو أي فعالية خاصة.",
      setupNotes: "يتطلب اجتماع تصميم مع خبير التنسيق قبل 48 ساعة على الأقل من موعد الفعالية.",
    },
  ];

  const templateIds: string[] = [];
  const templateNames: string[] = [];
  for (const pkg of packageDefs) {
    const r = await client.query(
      `INSERT INTO event_package_templates
         (org_id, name, type, description, worker_count, setup_notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, pkg.name, pkg.type, pkg.description, pkg.workers, pkg.setupNotes]
    );
    if (r.rows[0]) {
      templateIds.push(r.rows[0].id);
      templateNames.push(pkg.name);
    }
  }

  // ── [F] event_package_template_items ─────────────────────────────────────────
  // item_type CHECK: asset|consumable_natural|consumable_product|service_fee
  // Resolve variant IDs for items
  const roseRedId    = variantMap.get("rose:red")       ?? variantIds[0] ?? null;
  const roseWhiteId  = variantMap.get("rose:white")     ?? variantIds[1] ?? null;
  const rosePinkId   = variantMap.get("rose:pink")      ?? variantIds[2] ?? null;
  const lilyWhiteId  = variantMap.get("lily:white")     ?? variantIds[3] ?? null;
  const orchidPurpId = variantMap.get("orchid:purple")  ?? variantIds[4] ?? null;
  const orchidWhiteId= variantMap.get("orchid:white")   ?? variantIds[5] ?? null;
  const tulipRedId   = variantMap.get("tulip:red")      ?? variantIds[6] ?? null;
  const gypsophilaId = variantMap.get("gypsophila:white") ?? variantIds[9] ?? null;
  const peonyPinkId  = variantMap.get("peony:pink")     ?? variantIds[11] ?? null;

  type PkgItem = {
    itemType: string; variantId: string | null;
    description: string; qty: number; unit: string; costEstimate: number;
  };

  const packageItems: PkgItem[][] = [
    // [0] wedding — 5 items
    [
      { itemType: "consumable_natural", variantId: roseWhiteId,   description: "ورود بيضاء للكوش الرئيسي",        qty: 200, unit: "ساق",  costEstimate: 6  },
      { itemType: "consumable_natural", variantId: lilyWhiteId,   description: "زنبق أبيض لمداخل القاعة",          qty: 60,  unit: "ساق",  costEstimate: 12 },
      { itemType: "consumable_natural", variantId: gypsophilaId,  description: "جبسوفيلا لتكملة التنسيقات",       qty: 80,  unit: "حزمة", costEstimate: 15 },
      { itemType: "consumable_natural", variantId: orchidWhiteId, description: "أوركيد أبيض لطاولات الشرف",       qty: 20,  unit: "ساق",  costEstimate: 40 },
      { itemType: "service_fee",        variantId: null,          description: "رسوم التركيب والإشراف والإزالة",  qty: 1,   unit: "باقة", costEstimate: 1200 },
    ],
    // [1] reception_table — 3 items
    [
      { itemType: "consumable_natural", variantId: rosePinkId,    description: "ورود وردية لطاولة الاستقبال",      qty: 30,  unit: "ساق",  costEstimate: 9  },
      { itemType: "consumable_natural", variantId: gypsophilaId,  description: "جبسوفيلا لتكملة الطاولة",         qty: 20,  unit: "حزمة", costEstimate: 15 },
      { itemType: "service_fee",        variantId: null,          description: "رسوم الإعداد والصيانة",            qty: 1,   unit: "خدمة", costEstimate: 200 },
    ],
    // [2] entrance arch — 4 items
    [
      { itemType: "consumable_natural", variantId: roseWhiteId,   description: "ورود بيضاء للقوس الرئيسي",        qty: 150, unit: "ساق",  costEstimate: 6  },
      { itemType: "consumable_natural", variantId: lilyWhiteId,   description: "زنبق أبيض للقوسين الجانبيين",     qty: 40,  unit: "ساق",  costEstimate: 12 },
      { itemType: "consumable_natural", variantId: gypsophilaId,  description: "جبسوفيلا بيضاء للتكملة",          qty: 50,  unit: "حزمة", costEstimate: 15 },
      { itemType: "service_fee",        variantId: null,          description: "رسوم التركيب والإزالة",            qty: 1,   unit: "خدمة", costEstimate: 800 },
    ],
    // [3] newborn — 2 items
    [
      { itemType: "consumable_natural", variantId: rosePinkId,    description: "ورود وردية لتنسيق استقبال المولود", qty: 30,  unit: "ساق",  costEstimate: 9  },
      { itemType: "consumable_product", variantId: null,          description: "بالونات ولوازم احتفالية",          qty: 1,   unit: "طقم",  costEstimate: 50 },
    ],
    // [4] custom — 2 items
    [
      { itemType: "consumable_natural", variantId: roseRedId,     description: "ورود حسب الطلب والتصميم المتفق عليه", qty: 50, unit: "ساق",  costEstimate: 8  },
      { itemType: "service_fee",        variantId: null,          description: "رسوم التصميم والتنفيذ المخصص",    qty: 1,   unit: "خدمة", costEstimate: 300 },
    ],
  ];

  for (let ti = 0; ti < templateIds.length; ti++) {
    const tId = templateIds[ti];
    const items = packageItems[ti] ?? [];
    for (let ii = 0; ii < items.length; ii++) {
      const it = items[ii];
      await client.query(
        `INSERT INTO event_package_template_items
           (template_id, org_id, item_type, variant_id, description,
            quantity, unit, unit_cost_estimate, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT DO NOTHING`,
        [tId, orgId, it.itemType, it.variantId, it.description,
         fmt(it.qty), it.unit, fmt(it.costEstimate), ii + 1]
      );
    }
  }

  // ── [H] decor_assets — 10 assets ─────────────────────────────────────────────
  // category CHECK: artificial_flowers|stands|backdrops|vases|holders|decor|kiosk_equipment|other
  // status CHECK:   available|reserved|in_use|returned|maintenance|damaged
  const decorDefs = [
    { name: "ثلاجة حفظ الزهور 6 أرفف",           category: "kiosk_equipment", status: "available", cost: 8500,  code: "EQUIP-001", location: "مستودع الزهور", notes: "ثلاجة احترافية لحفظ الزهور بين 2-8 درجات مئوية — سعة 200 باقة" },
    { name: "طاولة تنسيق استانلس ستيل",           category: "other",          status: "available", cost: 3200,  code: "FURN-001",  location: "ورشة التنسيق",  notes: "طاولة عمل استانلس ستيل مقاومة للرطوبة بمقاس 180×80 سم" },
    { name: "حامل كوش زهور قابل للتعديل 3م",      category: "stands",         status: "available", cost: 4500,  code: "DISP-001",  location: "المستودع",      notes: "حامل معدني قابل للتعديل من 1.5 إلى 3 أمتار مع قاعدة مثبتة" },
    { name: "رف معدني للباقات 5 طوابق",           category: "stands",         status: "available", cost: 1800,  code: "DISP-002",  location: "صالة العرض",    notes: "رف معدني خفيف الوزن لعرض الباقات المتنوعة في صالة العرض" },
    { name: "قاعدة سيلندر كريستال كبيرة",         category: "vases",          status: "available", cost: 950,   code: "DECO-001",  location: "صالة العرض",    notes: "قاعدة كريستال شفاف بارتفاع 60 سم تستخدم لتنسيقات المدخل الفاخرة" },
    { name: "إطار صور ورد جاف 60×80cm",           category: "decor",          status: "available", cost: 1200,  code: "DECO-002",  location: "المعرض",       notes: "إطار خشبي أبيض بزهور جافة محفوظة — قطعة عرض نموذجية للبيع" },
    { name: "كوش ذهبي زفاف فاخر",                 category: "backdrops",      status: "available", cost: 12000, code: "BACK-001",  location: "المستودع",      notes: "كوش كامل مع إطار ذهبي وإضاءة LED قابل للتعديل في الأحجام" },
    { name: "طاولة عرض زجاجية",                   category: "other",          status: "available", cost: 2200,  code: "FURN-002",  location: "صالة العرض",    notes: "طاولة عرض زجاجية شفافة مع إضاءة داخلية لعرض الهدايا والصناديق" },
    { name: "حاملات شموع ذهبية (طقم 10)",         category: "holders",        status: "available", cost: 1500,  code: "HOLD-001",  location: "المستودع",      notes: "طقم 10 حاملات شموع ذهبية بأحجام متدرجة لتنسيقات الطاولات" },
    { name: "ديكور مدخل ورود صناعية فاخرة",       category: "artificial_flowers", status: "available", cost: 3800, code: "ARTF-001", location: "مستودع الأصول", notes: "ديكور مدخل كامل من الورود الصناعية عالية الجودة يُستخدم للعروض والمعارض" },
  ];

  for (const a of decorDefs) {
    await client.query(
      `INSERT INTO decor_assets
         (org_id, name, category, code, location, status, purchase_cost, notes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
       ON CONFLICT DO NOTHING`,
      [orgId, a.name, a.category, a.code, a.location, a.status, fmt(a.cost), a.notes]
    );
  }

  // ── Service orders — 20 flower orders ────────────────────────────────────────
  const soStatuses = ["closed", "closed", "scheduled", "confirmed", "cancelled"];
  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const total = rand(150, 800) * 1.15;
    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `FO-${rand(100000, 999999)}`,
        pick(soStatuses),
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── HOTEL ───────────────────────────────────────────────────────────────────
// Tables: hotel_reservations, room_units, room_types

export async function seedHotelVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. Room types (columns: org_id, name, name_en, max_occupancy, price_per_night, is_active)
  const roomTypeData = [
    { name: "غرفة قياسية",  nameEn: "Standard Room",   pricePerNight: 450, maxOccupancy: 2 },
    { name: "غرفة ديلوكس",  nameEn: "Deluxe Room",     pricePerNight: 650, maxOccupancy: 2 },
    { name: "جناح تنفيذي",  nameEn: "Executive Suite", pricePerNight: 1200, maxOccupancy: 3 },
    { name: "جناح ملكي",    nameEn: "Royal Suite",     pricePerNight: 2500, maxOccupancy: 4 },
  ];

  const roomTypeIds: string[] = [];
  for (const rt of roomTypeData) {
    const r = await client.query(
      `INSERT INTO room_types
         (org_id, name, name_en, price_per_night, max_occupancy, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, rt.name, rt.nameEn, fmt(rt.pricePerNight), rt.maxOccupancy]
    );
    if (r.rows[0]) roomTypeIds.push(r.rows[0].id);
  }

  // 2. Room units (columns: org_id, room_type_id, room_number, floor, status, is_active)
  let roomNum = 101;
  for (const [idx] of roomTypeData.entries()) {
    const count = [8, 6, 3, 2][idx] || 4;
    const typeId = roomTypeIds[idx];
    if (!typeId) continue;
    for (let i = 0; i < count; i++) {
      await client.query(
        `INSERT INTO room_units
           (org_id, room_type_id, room_number, floor, status, is_active)
         VALUES ($1,$2,$3,$4,'available',true)
         ON CONFLICT DO NOTHING`,
        [orgId, typeId, String(roomNum), Math.ceil(roomNum / 10) - 9]
      );
      roomNum++;
    }
  }

  // 3. Hotel reservations
  const statuses = ["confirmed", "checked_in", "checked_out", "checked_out", "cancelled"];

  for (let i = 0; i < 25; i++) {
    const cust = pick(customers);
    const checkIn = randomDate(60);
    const nights = rand(1, 5);
    const checkOut = new Date(checkIn.getTime() + nights * 86400000);
    const status = pick(statuses);
    const rtData = pick(roomTypeData);
    const pricePerNight = rtData.pricePerNight;
    const totalRoomCost = pricePerNight * nights;
    const taxAmount = totalRoomCost * 0.15;
    const totalAmount = totalRoomCost + taxAmount;
    const payStatus = ["checked_out", "confirmed"].includes(status) ? "paid" :
                       status === "checked_in" ? "partially_paid" : "pending";

    await client.query(
      `INSERT INTO hotel_reservations
         (org_id, customer_id, guest_name, guest_phone, status, payment_status,
          check_in_date, check_out_date, nights,
          price_per_night, total_room_cost, tax_amount, total_amount,
          adult_count, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        status, payStatus,
        iso(checkIn), iso(checkOut), nights,
        fmt(pricePerNight), fmt(totalRoomCost), fmt(taxAmount), fmt(totalAmount),
        rand(1, rtData.maxOccupancy),
      ]
    );
  }
}

// ─── CAR RENTAL ──────────────────────────────────────────────────────────────
// Tables: car_rental_reservations, assets

export async function seedCarRentalVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. Asset type for vehicles (required — asset_type_id is NOT NULL)
  const atRes = await client.query(
    `INSERT INTO asset_types (org_id, name, name_en, category)
     VALUES ($1, 'مركبات', 'Vehicles', 'vehicles')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [orgId]
  );
  const assetTypeId: string | null = atRes.rows[0]?.id ?? null;
  if (!assetTypeId) return; // shouldn't happen

  // 2. Vehicles as assets
  const vehicles = [
    { name: "تويوتا كامري 2024",    serial: "CAM-001", dailyRate: 220 },
    { name: "تويوتا هايلاندر 2023", serial: "HLX-001", dailyRate: 380 },
    { name: "هوندا سيفيك 2024",     serial: "CIV-001", dailyRate: 180 },
    { name: "فورد إكسبلورر 2023",   serial: "EXP-001", dailyRate: 420 },
    { name: "لكزس ES350 2024",      serial: "LXS-001", dailyRate: 750 },
    { name: "تويوتا يارس 2024",     serial: "YRS-001", dailyRate: 120 },
  ];

  for (const v of vehicles) {
    await client.query(
      `INSERT INTO assets (org_id, asset_type_id, name, serial_number, status, is_active, notes)
       VALUES ($1,$2,$3,$4,'available',true,$5)
       ON CONFLICT DO NOTHING`,
      [orgId, assetTypeId, v.name, v.serial, `معدل الإيجار اليومي: ${v.dailyRate} ريال`]
    );
  }

  // 2. Car rental reservations
  const statuses = ["confirmed", "picked_up", "completed", "completed", "completed", "cancelled"];

  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const startDate = randomDate(60);
    const days = rand(1, 7);
    const endDate = new Date(startDate.getTime() + days * 86400000);
    const status = pick(statuses);
    const vehicle = pick(vehicles);
    const dailyRate = vehicle.dailyRate;
    const totalRentalCost = dailyRate * days;
    const taxAmount = totalRentalCost * 0.15;
    const totalAmount = totalRentalCost + taxAmount;
    const payStatus = ["completed", "active"].includes(status) ? "paid" :
                       status === "confirmed" ? "partially_paid" : "pending";

    await client.query(
      `INSERT INTO car_rental_reservations
         (org_id, customer_id, driver_name, driver_phone, status, payment_status, payment_method,
          pickup_date, return_date, rental_days,
          daily_rate, total_rental_cost, tax_amount, total_amount,
          source)
       VALUES ($1,$2,$3,$4,$5,$6,'cash',$7,$8,$9,$10,$11,$12,$13,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        status, payStatus,
        iso(startDate), iso(endDate), days,
        fmt(dailyRate), fmt(totalRentalCost), fmt(taxAmount), fmt(totalAmount),
      ]
    );
  }
}

// ─── SALON ───────────────────────────────────────────────────────────────────
// Tables: service_orders, salon_supplies, client_beauty_profiles

export async function seedSalonVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  // 1. Service orders (type must be: kiosk|newborn_reception|custom_arrangement|field_execution|custom_decor)
  // (order_kind must be: sale|booking|project)
  // (status must be: draft|confirmed|deposit_pending|scheduled|preparing|ready|dispatched|in_setup|completed_on_site|returned|inspected|closed|cancelled)
  const statuses = ["closed", "closed", "closed", "scheduled", "cancelled"];

  for (let i = 0; i < 35; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const eventDate = randomDate(60);
    const status = pick(statuses);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id,
          event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `SAL-${rand(100000, 999999)}`,
        status, svc.id,
        iso(eventDate), fmt(total),
      ]
    );
  }

  // 2. Salon supplies (columns: org_id, name, category, unit, quantity, cost_per_unit, is_active)
  const supplies = [
    { name: "أكسجين شعر 30vol", category: "chemicals", unit: "liter",  qty: 10, cost: 25 },
    { name: "صبغة Wella N5",    category: "chemicals", unit: "tube",   qty: 50, cost: 35 },
    { name: "كيراتين برازيلي",   category: "chemicals", unit: "ml",     qty: 5000, cost: 180 },
    { name: "أسيتون إزالة",     category: "chemicals", unit: "liter",  qty: 8,  cost: 15 },
    { name: "قفازات بلاستيك",   category: "tools",     unit: "box",    qty: 20, cost: 22 },
    { name: "قطن تنظيف",        category: "tools",     unit: "pack",   qty: 30, cost: 12 },
  ];

  for (const s of supplies) {
    await client.query(
      `INSERT INTO salon_supplies (org_id, name, category, unit, quantity, cost_per_unit, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT DO NOTHING`,
      [orgId, s.name, s.category, s.unit, s.qty, fmt(s.cost)]
    );
  }

  // 3. Client beauty profiles (table: client_beauty_profiles, PK unique on org_id + customer_id)
  for (const cust of customers.slice(0, 10)) {
    await client.query(
      `INSERT INTO client_beauty_profiles
         (org_id, customer_id, hair_type, skin_type, allergies, preferences)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (org_id, customer_id) DO NOTHING`,
      [
        orgId, cust.id,
        pick(["طبيعي", "جاف", "دهني", "مختلط"]),
        pick(["طبيعية", "حساسة", "دهنية", "جافة"]),
        pick([null, "حساسية للأمونيا", "حساسية للعطور", null]),
        pick([null, "تفضل الأسلوب الكلاسيكي", "تفضل الألوان الداكنة", null]),
      ]
    );
  }
}

// ─── BARBER ──────────────────────────────────────────────────────────────────

export async function seedBarberVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["closed", "closed", "closed", "scheduled", "cancelled"];

  for (let i = 0; i < 40; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `BAR-${rand(100000, 999999)}`,
        pick(statuses), svc.id,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── SPA ─────────────────────────────────────────────────────────────────────

export async function seedSpaVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["closed", "closed", "scheduled", "cancelled"];

  for (let i = 0; i < 30; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `SPA-${rand(100000, 999999)}`,
        pick(statuses), svc.id,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── MAINTENANCE / WORKSHOP ───────────────────────────────────────────────────

export async function seedMaintenanceVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["closed", "closed", "preparing", "scheduled", "cancelled"];

  for (let i = 0; i < 25; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'field_execution','project',$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `SO-${rand(100000, 999999)}`,
        pick(statuses), svc.id,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── EVENTS / PHOTOGRAPHY ────────────────────────────────────────────────────
// Tables: event_quotations, event_quotation_items

export async function seedEventsVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["accepted", "accepted", "sent", "draft", "rejected"];
  const eventTypes = ["زفاف", "خطوبة", "مؤتمر", "يوم ميلاد", "حفل تخرج", "فعالية شركاتية"];

  for (let i = 0; i < 20; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const status = pick(statuses);
    const eventDate = randomDate(90);
    const subtotal = Number(svc.base_price);
    const vatRate = 15;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    const r = await client.query(
      `INSERT INTO event_quotations
         (org_id, quotation_number, client_name, client_phone, status,
          title, event_date, subtotal, vat_rate, vat_amount, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId,
        `EQ-2026-${rand(1000, 9999)}`,
        cust.name, cust.phone,
        status,
        `عرض سعر — ${pick(eventTypes)}`,
        iso(eventDate),
        fmt(subtotal), vatRate, fmt(vatAmount), fmt(total),
      ]
    );
    if (!r.rows[0]) continue;

    // Quotation items (columns: quotation_id, org_id, description, qty, unit_price, total_price)
    await client.query(
      `INSERT INTO event_quotation_items
         (quotation_id, org_id, description, qty, unit_price, total_price)
       VALUES ($1,$2,$3,1,$4,$4)
       ON CONFLICT DO NOTHING`,
      [r.rows[0].id, orgId, svc.name, fmt(subtotal)]
    );
  }
}

// ─── SCHOOL ──────────────────────────────────────────────────────────────────
// Tables: students, student_attendance, school_settings

export async function seedSchoolVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. School settings (columns: org_id, school_name, school_type, education_level, setup_status)
  await client.query(
    `INSERT INTO school_settings
       (org_id, school_name, school_type, education_level, setup_status)
     VALUES ($1,$2,'private','primary','complete')
     ON CONFLICT (org_id) DO NOTHING`,
    [orgId, "مدرسة ترميز النموذجية"]
  );

  // 2. Class rooms (required by student_attendance FK)
  const grades = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"];
  const classRoomIds: Record<string, string> = {};

  for (const grade of grades) {
    const r = await client.query(
      `INSERT INTO class_rooms (org_id, grade, name, capacity, is_active)
       VALUES ($1,$2,$3,30,true)
       RETURNING id`,
      [orgId, grade, `فصل ${grade}`]
    );
    classRoomIds[grade] = r.rows[0].id;
  }

  // 3. Students
  const genders = ["male", "female"];

  for (const cust of customers.slice(0, 20)) {
    const grade = pick(grades);
    const classRoomId = classRoomIds[grade];

    const r = await client.query(
      `INSERT INTO students
         (org_id, class_room_id, full_name, grade, gender, guardian_name, guardian_phone, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       RETURNING id`,
      [orgId, classRoomId, cust.name, grade, pick(genders), `ولي أمر ${cust.name}`, cust.phone]
    );

    if (!r.rows[0]) continue;
    const studentId = r.rows[0].id;

    // 4. Attendance records (class_room_id required)
    for (let d = 0; d < rand(10, 20); d++) {
      const attendDate = randomDate(60);
      await client.query(
        `INSERT INTO student_attendance
           (org_id, student_id, class_room_id, attendance_date, status)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (org_id, student_id, attendance_date) DO NOTHING`,
        [
          orgId, studentId, classRoomId,
          iso(attendDate).slice(0, 10),
          pick(["present", "present", "present", "absent", "late"]),
        ]
      );
    }
  }
}

// ─── MEDICAL ─────────────────────────────────────────────────────────────────

export async function seedMedicalVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length || !services.length) return;

  const statuses = ["closed", "closed", "scheduled", "cancelled"];

  for (let i = 0; i < 30; i++) {
    const cust = pick(customers);
    const svc = pick(services);
    const total = Number(svc.base_price) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,'custom_arrangement','booking',$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `MED-${rand(100000, 999999)}`,
        pick(statuses), svc.id,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── FOOD & BEVERAGE ─────────────────────────────────────────────────────────
// Tables: menu_categories, menu_items, restaurant_tables, loyalty_stamps

async function seedFoodVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);

  // Detect sub-type from org business_type
  const typeRes = await client.query(
    `SELECT business_type FROM organizations WHERE id = $1`,
    [orgId]
  );
  const businessType: string = typeRes.rows[0]?.business_type ?? "restaurant";

  // ── Menu Categories ───────────────────────────────────────────────────────
  type MenuCatDef = { name: string; name_en: string };
  const catsByType: Record<string, MenuCatDef[]> = {
    restaurant: [
      { name: "المقبلات",    name_en: "Starters" },
      { name: "الأطباق الرئيسية", name_en: "Main Dishes" },
      { name: "الشوايات",   name_en: "Grills" },
      { name: "السلطات",    name_en: "Salads" },
      { name: "الحلويات",   name_en: "Desserts" },
    ],
    cafe: [
      { name: "القهوة والمشروبات الساخنة", name_en: "Hot Drinks" },
      { name: "المشروبات الباردة",         name_en: "Cold Drinks" },
      { name: "الحلويات والكيك",           name_en: "Sweets & Cake" },
      { name: "الوجبات الخفيفة",           name_en: "Snacks" },
    ],
    bakery: [
      { name: "الخبز والمعجنات", name_en: "Bread & Pastries" },
      { name: "الكيك والتورتات", name_en: "Cakes & Tarts" },
      { name: "الحلويات الشرقية", name_en: "Oriental Sweets" },
      { name: "المشروبات",       name_en: "Drinks" },
    ],
    catering: [
      { name: "باقات الأفراح",   name_en: "Wedding Packages" },
      { name: "باقات الفعاليات", name_en: "Event Packages" },
      { name: "الوجبات الجاهزة", name_en: "Ready Meals" },
      { name: "المشروبات",       name_en: "Drinks" },
    ],
  };
  const cats = catsByType[businessType] ?? catsByType.restaurant;

  const catIds: string[] = [];
  for (let i = 0; i < cats.length; i++) {
    const r = await client.query(
      `INSERT INTO menu_categories (org_id, name, name_en, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, cats[i].name, cats[i].name_en, i + 1]
    );
    if (r.rows[0]) catIds.push(r.rows[0].id);
  }
  if (catIds.length === 0) return;

  // ── Menu Items ────────────────────────────────────────────────────────────
  type MenuItemDef = { name: string; price: number; popular?: boolean; prep?: number };
  const itemsByType: Record<string, MenuItemDef[][]> = {
    restaurant: [
      // Starters
      [
        { name: "حراق إصبعه",       price: 18, popular: true, prep: 10 },
        { name: "سلطة فتوش",        price: 14, prep: 5 },
        { name: "حمص بالزيت",       price: 12, prep: 5 },
        { name: "متبل",             price: 12, prep: 5 },
      ],
      // Main
      [
        { name: "مندي دجاج",        price: 55, popular: true, prep: 40 },
        { name: "كبسة لحم",         price: 75, popular: true, prep: 45 },
        { name: "هريس باللحم",      price: 45, prep: 35 },
        { name: "مكلوبة",           price: 50, prep: 40 },
      ],
      // Grills
      [
        { name: "مشويات مشكلة",     price: 95, popular: true, prep: 30 },
        { name: "دجاج مشوي",        price: 60, prep: 25 },
        { name: "كباب عراقي",       price: 65, prep: 20 },
      ],
      // Salads
      [
        { name: "سلطة قيصر",        price: 22, prep: 10 },
        { name: "سلطة خضراء",       price: 18, prep: 8 },
      ],
      // Desserts
      [
        { name: "أم علي",           price: 20, popular: true, prep: 15 },
        { name: "كنافة",            price: 22, prep: 10 },
        { name: "بسبوسة",           price: 16, prep: 5 },
      ],
    ],
    cafe: [
      // Hot
      [
        { name: "قهوة عربية",       price: 12, popular: true, prep: 5 },
        { name: "كابتشينو",         price: 18, popular: true, prep: 5 },
        { name: "لاتيه",            price: 20, prep: 5 },
        { name: "موكا",             price: 22, prep: 5 },
        { name: "شاي كرك",         price: 10, prep: 5 },
      ],
      // Cold
      [
        { name: "فرابتشينو",        price: 24, popular: true, prep: 7 },
        { name: "آيس لاتيه",        price: 22, prep: 5 },
        { name: "عصير طازج",        price: 18, prep: 5 },
        { name: "سموذي فراولة",     price: 22, prep: 7 },
      ],
      // Sweets
      [
        { name: "تشيز كيك",         price: 28, popular: true, prep: 3 },
        { name: "براونيز",          price: 20, prep: 3 },
        { name: "كروف",            price: 22, prep: 3 },
      ],
      // Snacks
      [
        { name: "سندويش كلوب",      price: 30, prep: 10 },
        { name: "باستا دجاج",       price: 35, prep: 15 },
        { name: "بيتزا صغيرة",      price: 32, prep: 20 },
      ],
    ],
    bakery: [
      // Bread
      [
        { name: "خبز التميس",       price: 8,  popular: true, prep: 20 },
        { name: "كرواسون زبدة",     price: 12, prep: 15 },
        { name: "خبز الثوم",        price: 10, prep: 15 },
      ],
      // Cake
      [
        { name: "كيك الشوكولاتة",   price: 35, popular: true, prep: 3 },
        { name: "تورتة الفراولة",   price: 45, prep: 3 },
        { name: "كيك الريد فيلفت",  price: 40, prep: 3 },
        { name: "كب كيك مشكل",      price: 25, prep: 3 },
      ],
      // Oriental
      [
        { name: "بقلاوة",           price: 30, popular: true, prep: 3 },
        { name: "معمول تمر",        price: 28, prep: 3 },
        { name: "بسبوسة",           price: 22, prep: 3 },
      ],
      // Drinks
      [
        { name: "قهوة سادة",        price: 10, prep: 5 },
        { name: "شاي بالنعناع",     price: 8,  prep: 5 },
        { name: "عصير برتقال",      price: 15, prep: 5 },
      ],
    ],
    catering: [
      [
        { name: "باقة فرح اقتصادية (50 شخص)",    price: 2500, popular: true, prep: 120 },
        { name: "باقة فرح مميزة (100 شخص)",      price: 5000, prep: 120 },
      ],
      [
        { name: "باقة فعالية ذهبية (30 شخص)",    price: 1800, popular: true, prep: 90 },
        { name: "باقة فعالية فضية (50 شخص)",     price: 2800, prep: 90 },
      ],
      [
        { name: "صحن كبسة دجاج",    price: 35, prep: 40 },
        { name: "صحن مندي لحم",     price: 55, popular: true, prep: 45 },
        { name: "صحن أرز بالخضار",  price: 25, prep: 30 },
      ],
      [
        { name: "طقم مشروبات باردة", price: 80, prep: 10 },
        { name: "قهوة وتمر للحفلات", price: 120, prep: 15 },
      ],
    ],
  };
  const itemGroups = itemsByType[businessType] ?? itemsByType.restaurant;

  for (let ci = 0; ci < catIds.length && ci < itemGroups.length; ci++) {
    const group = itemGroups[ci];
    for (let si = 0; si < group.length; si++) {
      const item = group[si];
      await client.query(
        `INSERT INTO menu_items
           (org_id, category_id, name, price, is_available, is_active, is_popular, preparation_time, sort_order)
         VALUES ($1,$2,$3,$4,true,true,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [orgId, catIds[ci], item.name, item.price, item.popular ?? false, item.prep ?? 15, si + 1]
      );
    }
  }

  // ── Restaurant Tables ─────────────────────────────────────────────────────
  if (businessType === "restaurant" || businessType === "cafe") {
    const sections = businessType === "restaurant"
      ? ["داخلي", "داخلي", "داخلي", "خارجي", "خارجي", "VIP", "VIP", "عائلي", "عائلي", "عائلي"]
      : ["قاعة رئيسية", "قاعة رئيسية", "قاعة رئيسية", "تيراس", "تيراس", "VIP", "VIP", "داخلي", "داخلي", "داخلي"];
    const caps  = [2, 4, 4, 4, 2, 6, 8, 6, 6, 4];
    for (let t = 0; t < 10; t++) {
      await client.query(
        `INSERT INTO restaurant_tables (org_id, number, section, capacity, status)
         VALUES ($1,$2,$3,$4,'available')
         ON CONFLICT (org_id, number) DO NOTHING`,
        [orgId, t + 1, sections[t], caps[t]]
      );
    }
  }

  // ── Loyalty Stamps ────────────────────────────────────────────────────────
  const stampCusts = customers.slice(0, 15);
  for (const c of stampCusts) {
    const stampsCount = rand(1, 12);
    const freeRedeemed = Math.floor(stampsCount / 10);
    await client.query(
      `INSERT INTO loyalty_stamps
         (org_id, customer_id, stamps_count, stamps_goal, free_items_redeemed, last_stamp_at)
       VALUES ($1,$2,$3,10,$4,NOW() - INTERVAL '1 day' * $5)
       ON CONFLICT (org_id, customer_id) DO NOTHING`,
      [orgId, c.id, stampsCount, freeRedeemed, rand(1, 30)]
    );
  }
}

// ─── RENTAL ───────────────────────────────────────────────────────────────────
// Tables: rental_assets

async function seedRentalVertical(client: any, orgId: string) {
  // Check table exists first
  const tblCheck = await client.query(
    `SELECT to_regclass('public.rental_assets') AS tbl`
  );
  if (!tblCheck.rows[0]?.tbl) return;

  type AssetDef = { name: string; category: string; daily_rate: number; deposit: number };
  const assets: AssetDef[] = [
    { name: "شاشة LED 55 بوصة",        category: "أجهزة عرض",    daily_rate: 350,  deposit: 2000 },
    { name: "بروجيكتور 4K",             category: "أجهزة عرض",    daily_rate: 250,  deposit: 1500 },
    { name: "كاميرا Canon EOS R5",       category: "كاميرات",       daily_rate: 450,  deposit: 5000 },
    { name: "طاولة مستديرة 10 أشخاص",   category: "أثاث",          daily_rate: 120,  deposit: 500  },
    { name: "كرسي فولاذي",              category: "أثاث",          daily_rate: 15,   deposit: 80   },
    { name: "خيمة ضيافة 10×10م",        category: "خيم وظلال",     daily_rate: 800,  deposit: 3000 },
    { name: "مولد كهربائي 10 كيلو",      category: "معدات كهربائية", daily_rate: 600,  deposit: 2500 },
    { name: "مكيف تبريد محمول",          category: "معدات كهربائية", daily_rate: 200,  deposit: 1000 },
    { name: "نظام صوت متكامل",           category: "صوتيات",        daily_rate: 500,  deposit: 3000 },
    { name: "إضاءة LED ملونة (طقم)",     category: "إضاءة",         daily_rate: 180,  deposit: 800  },
    { name: "سيارة نقل 4 طن",           category: "مركبات",        daily_rate: 900,  deposit: 5000 },
    { name: "رافعة شوكية",              category: "معدات ثقيلة",    daily_rate: 1200, deposit: 8000 },
  ];

  // Try to detect column names (some schemas use status, some condition)
  const colRes = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'rental_assets'
     ORDER BY ordinal_position`
  );
  const cols: string[] = colRes.rows.map((r: any) => r.column_name);
  const hasStatus    = cols.includes("status");
  const hasDailyRate = cols.includes("daily_rate");
  const hasDeposit   = cols.includes("deposit_amount");
  const hasCategory  = cols.includes("category");

  if (!hasDailyRate) return; // schema doesn't match, skip silently

  for (const a of assets) {
    const parts: string[] = ["org_id", "name"];
    const vals: any[]     = [orgId, a.name];
    let idx = 3;

    if (hasCategory)  { parts.push("category");         vals.push(a.category);    idx++; }
    if (hasDailyRate) { parts.push("daily_rate");        vals.push(a.daily_rate);  idx++; }
    if (hasDeposit)   { parts.push("deposit_amount");    vals.push(a.deposit);     idx++; }
    if (hasStatus)    { parts.push("status");            vals.push("available");   idx++; }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `INSERT INTO rental_assets (${parts.join(", ")})
       VALUES (${placeholders})
       ON CONFLICT DO NOTHING`,
      vals
    );
  }

  // ── Seed contracts linked to rental assets ──────────────────────────────────
  // Check contracts table exists
  const contractsTblCheck = await client.query(
    `SELECT to_regclass('public.contracts') AS tbl`
  );
  if (!contractsTblCheck.rows[0]?.tbl) return;

  // Fetch the assets we just inserted (to get their IDs)
  const assetRows = await client.query(
    `SELECT id, name, daily_rate FROM rental_assets WHERE org_id = $1 ORDER BY created_at LIMIT 12`,
    [orgId]
  );
  if (!assetRows.rows.length) return;

  // Reference customers for contracts
  const custRows = await client.query(
    `SELECT id, name, phone FROM customers WHERE org_id = $1 ORDER BY created_at LIMIT 8`,
    [orgId]
  );
  const customers = custRows.rows;
  if (!customers.length) return;

  // Skip if contracts already seeded
  const existingContracts = await client.query(
    `SELECT id FROM contracts WHERE org_id = $1 LIMIT 1`, [orgId]
  );
  if (existingContracts.rows.length) return;

  type ContractDef = {
    assetIdx: number; custIdx: number;
    startOffset: number; durationDays: number;
    status: string; paymentTerms: string;
  };

  const contractDefs: ContractDef[] = [
    { assetIdx: 0,  custIdx: 0, startOffset: -60,  durationDays: 90,  status: "active",      paymentTerms: "monthly"  },
    { assetIdx: 1,  custIdx: 1, startOffset: -30,  durationDays: 60,  status: "active",      paymentTerms: "monthly"  },
    { assetIdx: 2,  custIdx: 2, startOffset: -10,  durationDays: 30,  status: "active",      paymentTerms: "one_time" },
    { assetIdx: 5,  custIdx: 3, startOffset: -5,   durationDays: 14,  status: "active",      paymentTerms: "one_time" },
    { assetIdx: 6,  custIdx: 4, startOffset: -90,  durationDays: 180, status: "active",      paymentTerms: "monthly"  },
    { assetIdx: 8,  custIdx: 0, startOffset: -120, durationDays: 90,  status: "expired",     paymentTerms: "monthly"  },
    { assetIdx: 3,  custIdx: 5, startOffset: -180, durationDays: 90,  status: "expired",     paymentTerms: "monthly"  },
    { assetIdx: 9,  custIdx: 1, startOffset:  0,   durationDays: 7,   status: "draft",       paymentTerms: "one_time" },
    { assetIdx: 11, custIdx: 6, startOffset: -25,  durationDays: 365, status: "active",      paymentTerms: "quarterly"},
    { assetIdx: 7,  custIdx: 7, startOffset: -14,  durationDays: 14,  status: "active",      paymentTerms: "one_time" },
  ];

  const now = new Date();
  let contractNum = 1001;

  for (const def of contractDefs) {
    const asset = assetRows.rows[def.assetIdx % assetRows.rows.length];
    const cust  = customers[def.custIdx % customers.length];

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + def.startOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + def.durationDays);

    const dailyRate  = parseFloat(asset.daily_rate) || 200;
    const totalValue = Math.round(dailyRate * def.durationDays);

    const insertedContract = await client.query(
      `INSERT INTO contracts
         (org_id, contract_number, contract_type, title,
          party_name, party_phone,
          start_date, end_date, value, payment_terms,
          status, linked_entity_type, linked_entity_id,
          notes)
       VALUES ($1,$2,'lease',$3,$4,$5,$6,$7,$8,$9,$10,'equipment',$11,$12)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId,
        `EQ-${contractNum++}`,
        `عقد تأجير ${asset.name}`,
        cust.name,
        cust.phone || null,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        totalValue,
        def.paymentTerms,
        def.status,
        asset.id,
        `عقد تأجير ${asset.name} لمدة ${def.durationDays} يوم`,
      ]
    );

    if (!insertedContract.rows.length) continue;
    const contractId = insertedContract.rows[0].id;

    // Seed contract payments based on payment terms
    if (def.paymentTerms === "one_time") {
      const paidAt = def.status === "active" || def.status === "expired"
        ? startDate.toISOString() : null;
      await client.query(
        `INSERT INTO contract_payments
           (org_id, contract_id, due_date, amount, status, paid_at, payment_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [
          orgId, contractId,
          startDate.toISOString().split("T")[0],
          totalValue,
          paidAt ? "paid" : "pending",
          paidAt,
          paidAt ? "bank_transfer" : null,
        ]
      );
    } else {
      // Monthly/quarterly — split into installments
      const installCount = def.paymentTerms === "monthly"
        ? Math.ceil(def.durationDays / 30)
        : Math.ceil(def.durationDays / 90);
      const installAmount = Math.round(totalValue / installCount);
      const intervalDays  = def.paymentTerms === "monthly" ? 30 : 90;

      for (let i = 0; i < installCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + i * intervalDays);
        const isPast   = dueDate < now;
        const paidAt   = isPast && def.status !== "draft" ? dueDate.toISOString() : null;

        await client.query(
          `INSERT INTO contract_payments
             (org_id, contract_id, due_date, amount, status, paid_at, payment_method)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT DO NOTHING`,
          [
            orgId, contractId,
            dueDate.toISOString().split("T")[0],
            installAmount,
            paidAt ? "paid" : (isPast ? "overdue" : "pending"),
            paidAt,
            paidAt ? "cash" : null,
          ]
        );
      }
    }
  }
}

// ─── REAL ESTATE ─────────────────────────────────────────────────────────────
// Tables: properties → property_units → tenants → lease_contracts →
//         lease_invoices → lease_payments → property_expenses → property_maintenance

async function seedRealEstateVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // ── 1. Properties ─────────────────────────────────────────────────────────
  const propertyDefs = [
    {
      name: "برج الياسمين السكني",     type: "residential",  city: "الرياض",  district: "العليا",
      totalUnits: 12, totalFloors: 6, buildYear: 2018,
      plotArea: 600, builtArea: 3200, ownerName: "شركة التطوير العقاري السعودية",
      deedNumber: `700${rand(1000000, 9999999)}`, licenseNumber: `RIC-${rand(10000,99999)}`,
    },
    {
      name: "مجمع النخيل التجاري",      type: "commercial",   city: "الرياض",  district: "الملقا",
      totalUnits: 8, totalFloors: 4, buildYear: 2020,
      plotArea: 1200, builtArea: 4800, ownerName: "مؤسسة النخيل للاستثمار",
      deedNumber: `700${rand(1000000, 9999999)}`, licenseNumber: `RIC-${rand(10000,99999)}`,
    },
    {
      name: "فلل حي السفارات",          type: "residential",  city: "الرياض",  district: "السفارات",
      totalUnits: 4, totalFloors: 2, buildYear: 2015,
      plotArea: 2000, builtArea: 1600, ownerName: "عمر ياسين النجدي",
      deedNumber: `700${rand(1000000, 9999999)}`, licenseNumber: `RIC-${rand(10000,99999)}`,
    },
  ];

  const propertyIds: string[] = [];
  for (const p of propertyDefs) {
    const r = await client.query(
      `INSERT INTO properties
         (org_id, name, type, city, district, total_units, total_floors, build_year,
          plot_area_sqm, built_area_sqm, owner_name, deed_number, license_number,
          disposal_status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'free',true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId, p.name, p.type, p.city, p.district,
        p.totalUnits, p.totalFloors, p.buildYear,
        fmt(p.plotArea), fmt(p.builtArea),
        p.ownerName, p.deedNumber, p.licenseNumber,
      ]
    );
    if (r.rows[0]) propertyIds.push(r.rows[0].id);
  }
  if (!propertyIds.length) return;

  // ── 2. Property Units ──────────────────────────────────────────────────────
  const unitDefs = [
    // برج الياسمين — 12 شقة
    ...Array.from({ length: 12 }, (_, i) => ({
      propIdx: 0,
      unitNumber: `${Math.floor(i / 3) + 1}0${(i % 3) + 1}`,
      floor: Math.floor(i / 3) + 1,
      type: "apartment" as const,
      areaSqm: [100, 120, 140, 160][i % 4],
      bedrooms: [2, 2, 3, 3][i % 4],
      bathrooms: [1, 2, 2, 3][i % 4],
      monthlyRent: [3500, 4000, 4800, 5500][i % 4],
      status: i < 9 ? "occupied" : "vacant",
    })),
    // مجمع النخيل — 8 مكاتب
    ...Array.from({ length: 8 }, (_, i) => ({
      propIdx: 1,
      unitNumber: `${Math.floor(i / 2) + 1}0${(i % 2) + 1}`,
      floor: Math.floor(i / 2) + 1,
      type: "office" as const,
      areaSqm: [80, 120, 160, 200][i % 4],
      bedrooms: 0, bathrooms: 1,
      monthlyRent: [5000, 6500, 8000, 10000][i % 4],
      status: i < 6 ? "occupied" : "vacant",
    })),
    // فلل السفارات — 4 فلل
    ...Array.from({ length: 4 }, (_, i) => ({
      propIdx: 2,
      unitNumber: `VILLA-${i + 1}`,
      floor: 1,
      type: "villa" as const,
      areaSqm: [350, 400, 450, 500][i],
      bedrooms: [4, 4, 5, 5][i],
      bathrooms: [3, 3, 4, 4][i],
      monthlyRent: [12000, 13000, 15000, 18000][i],
      status: i < 3 ? "occupied" : "vacant",
    })),
  ];

  const unitIds: string[] = [];
  for (const u of unitDefs) {
    const propId = propertyIds[u.propIdx];
    if (!propId) continue;
    const r = await client.query(
      `INSERT INTO property_units
         (org_id, property_id, unit_number, floor, type, area_sqm, bedrooms, bathrooms,
          monthly_rent, yearly_rent, deposit_amount, status, furnishing, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'unfurnished',true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId, propId, u.unitNumber, u.floor, u.type,
        fmt(u.areaSqm), u.bedrooms, u.bathrooms,
        fmt(u.monthlyRent), fmt(u.monthlyRent * 12), fmt(u.monthlyRent),
        u.status,
      ]
    );
    if (r.rows[0]) unitIds.push(r.rows[0].id);
  }

  // ── 3. Tenants ─────────────────────────────────────────────────────────────
  const nationalities = ["SA", "SA", "SA", "EG", "JO", "SY", "PK", "BD"];
  const tenantIds: string[] = [];
  const tenantCustomers = customers.slice(0, 15);
  for (const cust of tenantCustomers) {
    const natl = pick(nationalities);
    const isSaudi = natl === "SA";
    const r = await client.query(
      `INSERT INTO tenants
         (org_id, customer_id, national_id, nationality, is_active)
       VALUES ($1,$2,$3,$4,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId, cust.id,
        isSaudi ? `1${rand(100000000, 999999999)}` : null,
        natl,
      ]
    );
    if (r.rows[0]) tenantIds.push(r.rows[0].id);
  }
  if (!tenantIds.length) return;

  // ── 4. Lease Contracts + Invoices + Payments ───────────────────────────────
  const occupiedUnits = unitDefs
    .map((u, i) => ({ ...u, id: unitIds[i] }))
    .filter(u => u.status === "occupied" && u.id);

  let contractNum = 1001;
  let invoiceNum  = 2001;
  let receiptNum  = 3001;

  for (let i = 0; i < Math.min(occupiedUnits.length, tenantIds.length); i++) {
    const unit     = occupiedUnits[i];
    const tenantId = tenantIds[i % tenantIds.length];
    const propId   = propertyIds[unit.propIdx] ?? propertyIds[0];

    const startMonthsAgo = rand(3, 18);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - startMonthsAgo);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const isPast   = endDate < new Date();
    const status   = isPast ? "expired" : "active";
    const ejarStatus = Math.random() > 0.3 ? "documented" : "pending";

    const contractRes = await client.query(
      `INSERT INTO lease_contracts
         (org_id, contract_number, property_id, unit_id, tenant_id,
          start_date, end_date, contract_type, rent_amount, payment_frequency,
          deposit_amount, deposit_status,
          ejar_status, auto_renew, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'annual',$8,'monthly',$9,'paid',$10,true,$11)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId,
        `LC-2025-${String(contractNum++).padStart(4,"0")}`,
        propId, unit.id, tenantId,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
        fmt(unit.monthlyRent),
        fmt(unit.monthlyRent),
        ejarStatus,
        status,
      ]
    );
    if (!contractRes.rows[0]) continue;
    const contractId = contractRes.rows[0].id;

    // Monthly invoices for past months
    const monthsElapsed = Math.min(startMonthsAgo, 12);
    for (let m = 0; m < monthsElapsed; m++) {
      const periodStart = new Date(startDate);
      periodStart.setMonth(periodStart.getMonth() + m);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);

      const dueDate = new Date(periodStart);
      const isPaid  = periodEnd < new Date();
      const invStatus = isPaid ? "paid" : (dueDate < new Date() ? "overdue" : "pending");
      const rent = unit.monthlyRent;
      const vat  = 0; // residential = 0% VAT in KSA

      const invRes = await client.query(
        `INSERT INTO lease_invoices
           (org_id, contract_id, invoice_number, period_start, period_end, period_label,
            rent_amount, subtotal, vat_rate, vat_amount, total_amount,
            status, due_date, paid_at, paid_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$7,$10,$11,$12,$13)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          orgId, contractId,
          `LI-2026-${String(invoiceNum++).padStart(4,"0")}`,
          periodStart.toISOString().split("T")[0],
          periodEnd.toISOString().split("T")[0],
          `إيجار ${periodStart.toLocaleDateString("ar-SA", { month: "long", year: "numeric" })}`,
          fmt(rent),
          fmt(vat), fmt(rent * vat / 100), invStatus,
          dueDate.toISOString().split("T")[0],
          isPaid ? periodEnd.toISOString() : null,
          isPaid ? fmt(rent) : "0.00",
        ]
      );

      // Payment record for paid invoices
      if (isPaid && invRes.rows[0]) {
        const methods = ["bank_transfer", "bank_transfer", "cash", "cheque"];
        await client.query(
          `INSERT INTO lease_payments
             (org_id, invoice_id, contract_id, receipt_number, amount, method,
              paid_at, received_by, is_reconciled)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
           ON CONFLICT DO NOTHING`,
          [
            orgId, invRes.rows[0].id, contractId,
            `RCP-${String(receiptNum++).padStart(5,"0")}`,
            fmt(rent), pick(methods),
            periodEnd.toISOString(),
            "المدير المالي",
          ]
        );
      }
    }
  }

  // ── 5. Property Expenses ───────────────────────────────────────────────────
  let expNum = 5001;
  const expCategories = [
    { category: "maintenance",   desc: "صيانة المصاعد الدورية",        amount: rand(800,  2000) },
    { category: "cleaning",      desc: "نظافة وتنظيف المبنى",           amount: rand(500,  1200) },
    { category: "security",      desc: "خدمات الأمن والحراسة",          amount: rand(1500, 3000) },
    { category: "utilities",     desc: "فاتورة الكهرباء المشتركة",      amount: rand(300,  800)  },
    { category: "insurance",     desc: "تأمين العقار السنوي",           amount: rand(2000, 5000) },
    { category: "management_fee",desc: "رسوم إدارة العقار الشهرية",     amount: rand(1000, 2500) },
  ];
  for (const exp of expCategories) {
    for (const propId of propertyIds) {
      await client.query(
        `INSERT INTO property_expenses
           (org_id, property_id, expense_number, category, description, amount, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [
          orgId, propId,
          `EXP-${String(expNum++).padStart(5,"0")}`,
          exp.category, exp.desc, fmt(exp.amount),
          randomDate(60).toISOString().split("T")[0],
        ]
      );
    }
  }

  // ── 6. Property Maintenance Requests ──────────────────────────────────────
  let ticketNum = 6001;
  const maintenanceDefs = [
    { category: "plumbing",    priority: "high",   title: "تسريب مياه في وحدة 101",   status: "completed"   },
    { category: "electrical",  priority: "urgent", title: "انقطاع الكهرباء جزئياً",   status: "in_progress" },
    { category: "ac_heating",  priority: "normal", title: "صيانة مكيف مركزي",          status: "assigned"    },
    { category: "painting",    priority: "low",    title: "دهانات وإعادة تشطيب شقة",  status: "reported"    },
    { category: "general",     priority: "normal", title: "تنظيف خزانات المياه",       status: "completed"   },
    { category: "elevator",    priority: "urgent", title: "صيانة دورية للمصعد",        status: "completed"   },
  ];
  for (const m of maintenanceDefs) {
    await client.query(
      `INSERT INTO property_maintenance
         (org_id, property_id, ticket_number, title, category, priority, status, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'tenant')
       ON CONFLICT DO NOTHING`,
      [
        orgId, pick(propertyIds),
        `TKT-${String(ticketNum++).padStart(5,"0")}`,
        m.title, m.category, m.priority, m.status,
      ]
    );
  }
}

// ─── CONSTRUCTION / LOGISTICS — Field Work Orders ────────────────────────────
// Uses work_orders table: order_number + item_name + problem_description required

let woSeq = 8001;
function nextWoNumber(prefix = "WO"): string {
  return `${prefix}-2026-${String(woSeq++).padStart(4,"0")}`;
}

async function seedConstructionVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  const workOrderDefs = [
    { itemName: "سور حدودي — مشروع الملقا",      problem: "إنشاء سور حدودي جديد وفق المخططات المعتمدة",   category: "installation", status: "in_progress", cost: rand(25000, 80000) },
    { itemName: "أساسات مبنى سكني",               problem: "صبة أساسات وحفر وتسليح وفق التصميم الإنشائي",  category: "installation", status: "received",    cost: rand(40000, 120000) },
    { itemName: "تشطيب داخلي — مجمع تجاري",       problem: "أعمال تشطيب كاملة: بلاط وجبصبورد ودهانات",     category: "service",      status: "delivered",   cost: rand(60000, 200000) },
    { itemName: "سقف معدني — مستودع صناعي",        problem: "توريد وتركيب سقف معدني عازل للمستودع",         category: "installation", status: "delivered",   cost: rand(30000, 90000) },
    { itemName: "مبنى حكومي — إصلاح هيكلي",       problem: "إصلاح تشققات وتدعيم هيكل المبنى",              category: "repair",       status: "received",    cost: rand(15000, 50000) },
    { itemName: "خزان سطحي — عزل مائي",            problem: "أعمال عزل مائي شامل للخزان والأسطح",           category: "maintenance",  status: "in_progress", cost: rand(8000, 25000)  },
    { itemName: "حديقة مشروع سكني",                problem: "لاندسكيب وتنسيق موارد مائية وزراعة",           category: "service",      status: "delivered",   cost: rand(20000, 60000) },
    { itemName: "أبواب ألمنيوم — مجمع تجاري",      problem: "توريد وتركيب أبواب ونوافذ ألمنيوم مقاومة للحرارة", category: "installation", status: "delivered", cost: rand(15000, 45000) },
  ];

  for (const wo of workOrderDefs) {
    const cust = pick(customers);
    await client.query(
      `INSERT INTO work_orders
         (org_id, order_number, customer_id, customer_name, item_name, problem_description,
          category, status, estimated_cost, payment_status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'unpaid',true)
       ON CONFLICT DO NOTHING`,
      [
        orgId, nextWoNumber("CO"),
        cust.id, cust.name,
        wo.itemName, wo.problem,
        wo.category, wo.status,
        fmt(wo.cost),
      ]
    );
  }
}

async function seedLogisticsVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  const workOrderDefs = [
    { itemName: "شحنة بضائع — الرياض → جدة",       problem: "توصيل شحنة بضائع 3 طن في غضون 24 ساعة",        category: "service",      status: "delivered",   cost: rand(800,  3000)  },
    { itemName: "أثاث مكتبي — برج الفيصلية",        problem: "فك ونقل وتركيب أثاث مكتبي كامل للطابق الثامن", category: "service",      status: "in_progress", cost: rand(2500, 8000)  },
    { itemName: "مستلزمات مطعم — جدة",              problem: "توصيل شحنة مواد غذائية مبردة لفرع جدة",         category: "service",      status: "delivered",   cost: rand(600,  2000)  },
    { itemName: "شحنة دولية — دبي",                  problem: "شحن ومتابعة تخليص جمارك لحاوية 20 قدم",         category: "other",        status: "received",    cost: rand(5000, 15000) },
    { itemName: "منتجات صيدلية — 12 نقطة",          problem: "توزيع منتجات طبية على 12 فرع صيدلية في الرياض",  category: "service",      status: "delivered",   cost: rand(1200, 4000)  },
    { itemName: "وحدات موسمية — مستودع",             problem: "تخزين وجرد 500 وحدة بضاعة موسمية",              category: "other",        status: "delivered",   cost: rand(3000, 9000)  },
    { itemName: "معدات ثقيلة — موقع إنشاء",          problem: "نقل رافعة ومعدات حفر من الدمام للرياض",          category: "other",        status: "in_progress", cost: rand(4000, 12000) },
  ];

  for (const wo of workOrderDefs) {
    const cust = pick(customers);
    await client.query(
      `INSERT INTO work_orders
         (org_id, order_number, customer_id, customer_name, item_name, problem_description,
          category, status, estimated_cost, payment_status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'unpaid',true)
       ON CONFLICT DO NOTHING`,
      [
        orgId, nextWoNumber("LG"),
        cust.id, cust.name,
        wo.itemName, wo.problem,
        wo.category, wo.status,
        fmt(wo.cost),
      ]
    );
  }
}

// ─── A) FOOD DEEP VERTICAL ────────────────────────────────────────────────────
// Adds restaurant_sections, enriches restaurant_tables, table_reservations,
// menu_modifier_groups, menu_modifiers

export async function seedFoodDeepVertical(client: any, orgId: string, businessType: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. restaurant_sections (unique on org_id, name)
  const sectionDefs = businessType === "cafe"
    ? [
        { name: "الصالة الرئيسية", nameEn: "Main Hall",    capacity: 30 },
        { name: "ركن VIP",        nameEn: "VIP Corner",    capacity: 12 },
      ]
    : [
        { name: "القاعة الرئيسية", nameEn: "Main Hall",    capacity: 60 },
        { name: "قاعة VIP",       nameEn: "VIP Hall",      capacity: 20 },
      ];

  const sectionIds: string[] = [];
  for (let i = 0; i < sectionDefs.length; i++) {
    const sd = sectionDefs[i];
    const r = await client.query(
      `INSERT INTO restaurant_sections (org_id, name, name_en, capacity, sort_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (org_id, name) DO NOTHING
       RETURNING id`,
      [orgId, sd.name, sd.nameEn, sd.capacity, i + 1]
    );
    if (r.rows[0]) {
      sectionIds.push(r.rows[0].id);
    } else {
      const ex = await client.query(
        `SELECT id FROM restaurant_sections WHERE org_id=$1 AND name=$2 LIMIT 1`,
        [orgId, sd.name]
      );
      if (ex.rows[0]) sectionIds.push(ex.rows[0].id);
    }
  }

  // 2. Additional restaurant_tables linked to sections (section column = section name text)
  const sectionNames = sectionDefs.map(s => s.name);
  for (let t = 11; t <= 18; t++) {
    const sectionName = sectionNames[t % sectionNames.length];
    await client.query(
      `INSERT INTO restaurant_tables (org_id, number, section, capacity, status, sort_order)
       VALUES ($1,$2,$3,$4,'available',$5)
       ON CONFLICT (org_id, number) DO NOTHING`,
      [orgId, String(t), sectionName, pick([2, 4, 6]), t]
    );
  }

  // 3. Fetch existing menu items to add modifier groups
  const itemsRes = await client.query(
    `SELECT id FROM menu_items WHERE org_id=$1 AND is_active=true LIMIT 5`,
    [orgId]
  );
  for (const item of itemsRes.rows) {
    const grpRes = await client.query(
      `INSERT INTO menu_modifier_groups
         (org_id, menu_item_id, name, selection_type, is_required, min_select, max_select, sort_order)
       VALUES ($1,$2,'الحجم','single',false,0,1,1)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, item.id]
    );
    if (!grpRes.rows[0]) continue;
    const grpId = grpRes.rows[0].id;
    const mods = [
      { name: "صغير",  delta: -5  },
      { name: "وسط",   delta: 0   },
      { name: "كبير",  delta: 8   },
    ];
    for (let mi = 0; mi < mods.length; mi++) {
      await client.query(
        `INSERT INTO menu_modifiers (org_id, group_id, name, price_delta, is_default, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [orgId, grpId, mods[mi].name, fmt(mods[mi].delta), mi === 1, mi + 1]
      );
    }
  }

  // 4. table_reservations
  const tableRes = await client.query(
    `SELECT id FROM restaurant_tables WHERE org_id=$1 LIMIT 8`, [orgId]
  );
  const tableIds = tableRes.rows.map((r: any) => r.id);
  if (!tableIds.length) return;

  const resStatuses = ["confirmed", "confirmed", "seated", "completed", "cancelled", "no_show"];
  for (let i = 0; i < 15; i++) {
    const cust = pick(customers);
    const resDate = randomDate(30);
    await client.query(
      `INSERT INTO table_reservations
         (org_id, customer_id, reservation_number, status, table_id,
          covers, section, reserved_at, duration_minutes, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,90,'dashboard')
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id,
        `TR-${rand(100000, 999999)}`,
        pick(resStatuses),
        pick(tableIds),
        rand(1, 6),
        pick(sectionNames),
        iso(resDate),
      ]
    );
  }
}

// ─── B) HOTEL DEEP VERTICAL ───────────────────────────────────────────────────
// room_units already created in seedHotelVertical.
// This adds: hotel_seasonal_pricing + housekeeping_logs

export async function seedHotelDeepVertical(client: any, orgId: string) {
  // Fetch existing room_types and room_units created by seedHotelVertical
  const rtRes = await client.query(
    `SELECT id FROM room_types WHERE org_id=$1 LIMIT 4`, [orgId]
  );
  const roomTypeIds = rtRes.rows.map((r: any) => r.id);

  const ruRes = await client.query(
    `SELECT id FROM room_units WHERE org_id=$1 LIMIT 12`, [orgId]
  );
  const roomUnitIds = ruRes.rows.map((r: any) => r.id);

  if (!roomTypeIds.length || !roomUnitIds.length) return;

  // 1. Seasonal pricing (2 seasons)
  const seasons = [
    { name: "موسم الذروة — الصيف",  startM: "06-01", endM: "08-31", multiplier: 1.3 },
    { name: "موسم الحج والرمضان",  startM: "03-01", endM: "04-30", multiplier: 1.5 },
  ];

  const now = new Date();
  const year = now.getFullYear();

  for (const s of seasons) {
    for (const rtId of roomTypeIds.slice(0, 2)) {
      // Get the base price for this room type
      const priceRes = await client.query(
        `SELECT price_per_night FROM room_types WHERE id=$1`, [rtId]
      );
      const basePrice = parseFloat(priceRes.rows[0]?.price_per_night || "500");
      const seasonPrice = Math.round(basePrice * s.multiplier);

      await client.query(
        `INSERT INTO hotel_seasonal_pricing
           (org_id, room_type_id, name, start_date, end_date, price_per_night)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [
          orgId, rtId, s.name,
          `${year}-${s.startM}`,
          `${year}-${s.endM}`,
          fmt(seasonPrice),
        ]
      );
    }
  }

  // 2. Housekeeping logs
  // task_type: 'cleaning'|'inspection'|'maintenance' (free text)
  // status: pending|in_progress|completed|inspected|issue_reported
  const taskTypes = ["cleaning", "deep_cleaning", "inspection", "turndown"];
  const hkStatuses = ["completed", "completed", "in_progress", "pending", "inspected"];

  for (let i = 0; i < 10; i++) {
    const ruId = pick(roomUnitIds);
    await client.query(
      `INSERT INTO housekeeping_logs
         (org_id, room_unit_id, task_type, priority, status, scheduled_at)
       VALUES ($1,$2,$3,'normal',$4,$5)
       ON CONFLICT DO NOTHING`,
      [
        orgId, ruId,
        pick(taskTypes),
        pick(hkStatuses),
        iso(randomDate(14)),
      ]
    );
  }
}

// ─── C) CAR RENTAL DEEP VERTICAL ─────────────────────────────────────────────
// Adds vehicle_categories, vehicle_units, vehicle_inspections

export async function seedCarRentalDeepVertical(client: any, orgId: string) {
  // 1. vehicle_categories
  const catDefs = [
    { name: "اقتصادية",  nameEn: "Economy",  priceDay: 120,  priceWeek: 700,  priceMonth: 2500, deposit: 500  },
    { name: "فاخرة",     nameEn: "Luxury",   priceDay: 750,  priceWeek: 4500, priceMonth: 16000,deposit: 3000 },
    { name: "دفع رباعي", nameEn: "SUV 4x4",  priceDay: 380,  priceWeek: 2300, priceMonth: 8000, deposit: 1500 },
  ];

  const catIds: string[] = [];
  for (const c of catDefs) {
    const r = await client.query(
      `INSERT INTO vehicle_categories
         (org_id, name, name_en, price_per_day, price_per_week, price_per_month,
          deposit_amount, insurance_included, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, c.name, c.nameEn, fmt(c.priceDay), fmt(c.priceWeek), fmt(c.priceMonth), fmt(c.deposit)]
    );
    if (r.rows[0]) catIds.push(r.rows[0].id);
  }
  if (!catIds.length) return;

  // 2. vehicle_units
  // status: available|reserved|rented|maintenance|inspection|out_of_service
  const vehicleDefs = [
    { make: "Toyota",  model: "Yaris",     year: 2024, color: "white",  plate: `ABC-${rand(1000,9999)}`, catIdx: 0, status: "available"  },
    { make: "Toyota",  model: "Corolla",   year: 2023, color: "silver", plate: `DEF-${rand(1000,9999)}`, catIdx: 0, status: "rented"      },
    { make: "Toyota",  model: "Camry",     year: 2024, color: "black",  plate: `GHI-${rand(1000,9999)}`, catIdx: 0, status: "available"  },
    { make: "Lexus",   model: "ES350",     year: 2024, color: "black",  plate: `JKL-${rand(1000,9999)}`, catIdx: 1, status: "available"  },
    { make: "BMW",     model: "7 Series",  year: 2023, color: "white",  plate: `MNO-${rand(1000,9999)}`, catIdx: 1, status: "reserved"   },
    { make: "Toyota",  model: "Prado",     year: 2023, color: "silver", plate: `PQR-${rand(1000,9999)}`, catIdx: 2, status: "available"  },
    { make: "Nissan",  model: "Patrol",    year: 2024, color: "white",  plate: `STU-${rand(1000,9999)}`, catIdx: 2, status: "rented"      },
    { make: "Ford",    model: "Explorer",  year: 2023, color: "grey",   plate: `VWX-${rand(1000,9999)}`, catIdx: 2, status: "maintenance" },
  ];

  const vehicleUnitIds: string[] = [];
  for (const v of vehicleDefs) {
    const catId = catIds[v.catIdx % catIds.length];
    const r = await client.query(
      `INSERT INTO vehicle_units
         (org_id, category_id, make, model, year, color, plate_number,
          mileage, status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vehicle_status,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId, catId, v.make, v.model, v.year, v.color, v.plate,
        rand(5000, 80000), v.status,
      ]
    );
    if (r.rows[0]) vehicleUnitIds.push(r.rows[0].id);
  }
  if (!vehicleUnitIds.length) return;

  // 3. vehicle_inspections
  // inspection_type: pre_rental|post_rental|routine|damage
  const inspTypes: string[] = ["pre_rental", "post_rental", "routine", "pre_rental", "post_rental", "routine"];
  for (let i = 0; i < 6; i++) {
    const vuId = vehicleUnitIds[i % vehicleUnitIds.length];
    await client.query(
      `INSERT INTO vehicle_inspections
         (org_id, vehicle_unit_id, inspection_type, inspected_at,
          mileage_at_inspection, fuel_level,
          exterior_condition, interior_condition, tires_condition, has_damage)
       VALUES ($1,$2,$3,$4,$5,$6,'good','good','good',false)
       ON CONFLICT DO NOTHING`,
      [
        orgId, vuId,
        inspTypes[i] as string,
        iso(randomDate(30)),
        rand(5000, 80000),
        pick(["full", "3/4", "1/2", "1/4"]),
      ]
    );
  }
}

// ─── D) SCHOOL DEEP VERTICAL ──────────────────────────────────────────────────
// school_semesters, grade_levels, subjects, teacher_profiles,
// school_timetable, school_violation_categories, school_violations

export async function seedSchoolDeepVertical(client: any, orgId: string) {
  // 1. school_semesters (unique on org_id, year_label, semester_number)
  const semesterDefs = [
    { yearLabel: "1446-1447", semNum: 1, label: "الفصل الأول", startDate: "2024-09-01", endDate: "2025-01-15", isActive: false },
    { yearLabel: "1446-1447", semNum: 2, label: "الفصل الثاني", startDate: "2025-01-20", endDate: "2025-05-30", isActive: true  },
  ];
  const semesterIds: string[] = [];
  for (const s of semesterDefs) {
    const r = await client.query(
      `INSERT INTO school_semesters
         (org_id, year_label, semester_number, label, start_date, end_date, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (org_id, year_label, semester_number) DO NOTHING
       RETURNING id`,
      [orgId, s.yearLabel, s.semNum, s.label, s.startDate, s.endDate, s.isActive]
    );
    if (r.rows[0]) {
      semesterIds.push(r.rows[0].id);
    } else {
      const ex = await client.query(
        `SELECT id FROM school_semesters WHERE org_id=$1 AND year_label=$2 AND semester_number=$3`,
        [orgId, s.yearLabel, s.semNum]
      );
      if (ex.rows[0]) semesterIds.push(ex.rows[0].id);
    }
  }

  // 2. grade_levels (unique on org_id, name)
  const gradeDefs = [
    { code: "G4", name: "الصف الرابع",  stage: "ابتدائي" },
    { code: "G5", name: "الصف الخامس",  stage: "ابتدائي" },
    { code: "G6", name: "الصف السادس",  stage: "ابتدائي" },
  ];
  const gradeLevelIds: string[] = [];
  for (let i = 0; i < gradeDefs.length; i++) {
    const g = gradeDefs[i];
    const r = await client.query(
      `INSERT INTO grade_levels (org_id, code, name, stage, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT (org_id, name) DO NOTHING
       RETURNING id`,
      [orgId, g.code, g.name, g.stage, i + 1]
    );
    if (r.rows[0]) {
      gradeLevelIds.push(r.rows[0].id);
    } else {
      const ex = await client.query(
        `SELECT id FROM grade_levels WHERE org_id=$1 AND name=$2`, [orgId, g.name]
      );
      if (ex.rows[0]) gradeLevelIds.push(ex.rows[0].id);
    }
  }

  // 3. subjects (unique on org_id, name)
  const subjectDefs = [
    { code: "MATH", name: "الرياضيات",   type: "core"     },
    { code: "ARB",  name: "اللغة العربية", type: "core"   },
    { code: "ENG",  name: "اللغة الإنجليزية", type: "core" },
    { code: "SCI",  name: "العلوم",       type: "core"     },
    { code: "SOC",  name: "الدراسات الاجتماعية", type: "core" },
    { code: "ISL",  name: "التربية الإسلامية", type: "core" },
    { code: "ART",  name: "التربية الفنية", type: "elective" },
    { code: "PE",   name: "التربية البدنية", type: "elective" },
  ];
  const subjectIds: string[] = [];
  for (let i = 0; i < subjectDefs.length; i++) {
    const s = subjectDefs[i];
    const r = await client.query(
      `INSERT INTO subjects (org_id, code, name, type, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT (org_id, name) DO NOTHING
       RETURNING id`,
      [orgId, s.code, s.name, s.type, i + 1]
    );
    if (r.rows[0]) {
      subjectIds.push(r.rows[0].id);
    } else {
      const ex = await client.query(
        `SELECT id FROM subjects WHERE org_id=$1 AND name=$2`, [orgId, s.name]
      );
      if (ex.rows[0]) subjectIds.push(ex.rows[0].id);
    }
  }

  // 4. teacher_profiles (no FK to hr_employees required — standalone)
  const teacherDefs = [
    { name: "أحمد عبدالله السالم",   subject: "الرياضيات",   phone: "+966500020001" },
    { name: "منيرة سالم الحربي",     subject: "اللغة العربية", phone: "+966500020002" },
    { name: "خالد محمد الزهراني",   subject: "العلوم",       phone: "+966500020003" },
    { name: "هدى عبدالرحمن العمري", subject: "اللغة الإنجليزية", phone: "+966500020004" },
  ];
  const teacherIds: string[] = [];
  for (let i = 0; i < teacherDefs.length; i++) {
    const t = teacherDefs[i];
    const r = await client.query(
      `INSERT INTO teacher_profiles
         (org_id, full_name, employee_number, subject, phone, gender, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId, t.name,
        `T-${String(rand(1000, 9999))}`,
        t.subject, t.phone,
        i % 2 === 0 ? "male" : "female",
      ]
    );
    if (r.rows[0]) teacherIds.push(r.rows[0].id);
  }

  // 5. school_timetable (unique on org_id, class_room_id, day_of_week, period_number)
  const classRoomRes = await client.query(
    `SELECT id FROM class_rooms WHERE org_id=$1 LIMIT 3`, [orgId]
  );
  const classRoomIds = classRoomRes.rows.map((r: any) => r.id);
  if (classRoomIds.length && teacherIds.length && subjectIds.length) {
    const periods = [
      { day: 0, period: 1, start: "07:30", end: "08:15" },
      { day: 0, period: 2, start: "08:20", end: "09:05" },
      { day: 1, period: 1, start: "07:30", end: "08:15" },
      { day: 1, period: 2, start: "08:20", end: "09:05" },
      { day: 2, period: 1, start: "07:30", end: "08:15" },
      { day: 2, period: 2, start: "08:20", end: "09:05" },
      { day: 3, period: 1, start: "07:30", end: "08:15" },
      { day: 3, period: 2, start: "08:20", end: "09:05" },
      { day: 4, period: 1, start: "07:30", end: "08:15" },
      { day: 4, period: 2, start: "08:20", end: "09:05" },
    ];
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const crId = classRoomIds[i % classRoomIds.length];
      const tchId = teacherIds.length ? teacherIds[i % teacherIds.length] : null;
      const subName = subjectDefs[i % subjectDefs.length]?.name ?? "الرياضيات";
      await client.query(
        `INSERT INTO school_timetable
           (org_id, class_room_id, day_of_week, period_number, subject, teacher_id, start_time, end_time)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (org_id, class_room_id, day_of_week, period_number) DO NOTHING`,
        [orgId, crId, p.day, p.period, subName, tchId, p.start, p.end]
      );
    }
  }

  // 6. school_violation_categories
  const violCatDefs = [
    { name: "غياب بدون عذر",         severity: "medium", degree: "1", color: "#f59e0b" },
    { name: "تأخر عن الحصة",          severity: "low",    degree: "1", color: "#6b7280" },
    { name: "سلوك مخالف للنظام",     severity: "high",   degree: "2", color: "#ef4444" },
  ];
  const violCatIds: string[] = [];
  for (const vc of violCatDefs) {
    const r = await client.query(
      `INSERT INTO school_violation_categories
         (org_id, name, severity, default_degree, color, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, vc.name, vc.severity, vc.degree, vc.color]
    );
    if (r.rows[0]) violCatIds.push(r.rows[0].id);
  }

  // 7. school_violations (need student_ids)
  const studentRes = await client.query(
    `SELECT id FROM students WHERE org_id=$1 LIMIT 10`, [orgId]
  );
  const studentIds = studentRes.rows.map((r: any) => r.id);
  if (studentIds.length && violCatIds.length) {
    for (let i = 0; i < 5; i++) {
      const catId = violCatIds.length ? pick(violCatIds) : null;
      await client.query(
        `INSERT INTO school_violations
           (org_id, student_id, category_id, description, degree, violation_date, status)
         VALUES ($1,$2,$3,$4,$5,$6,'open')
         ON CONFLICT DO NOTHING`,
        [
          orgId, pick(studentIds), catId,
          pick(["غياب بدون إذن", "تأخر متكرر", "إخلال بالنظام", "عدم الاستعداد للدرس"]),
          pick(["1", "1", "2"]),
          randomDate(30).toISOString().slice(0, 10),
        ]
      );
    }
  }
}

// ─── E) CONSTRUCTION DEEP VERTICAL ───────────────────────────────────────────
// Creates property_construction record + phases, costs, daily_logs,
// payments, change_orders

export async function seedConstructionDeepVertical(client: any, orgId: string) {
  // First create a property_construction record
  const statuses = ["foundation", "structure", "finishing"];
  const projTypes = ["new_build", "renovation"];
  const contractTypes = ["lump_sum", "cost_plus"];

  const totalBudget = rand(500000, 3000000);
  const contractAmount = Math.round(totalBudget * 0.95);

  const pcRes = await client.query(
    `INSERT INTO property_construction
       (org_id, project_name, project_type, contractor_name, contractor_phone,
        total_budget, contract_amount, contract_type, status,
        overall_progress, estimated_completion_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      orgId,
      `مشروع إنشاء ${rand(1000, 9999)}`,
      pick(projTypes),
      "شركة الإنشاءات المتكاملة",
      "+966500030001",
      fmt(totalBudget),
      fmt(contractAmount),
      pick(contractTypes),
      pick(statuses),
      rand(20, 80),
      new Date(Date.now() + rand(90, 365) * 86400000).toISOString().slice(0, 10),
    ]
  );
  if (!pcRes.rows[0]) {
    // Already exists — fetch it
    const ex = await client.query(
      `SELECT id FROM property_construction WHERE org_id=$1 LIMIT 1`, [orgId]
    );
    if (!ex.rows[0]) return;
  }
  const constructionId = pcRes.rows[0]?.id ?? (await client.query(
    `SELECT id FROM property_construction WHERE org_id=$1 LIMIT 1`, [orgId]
  )).rows[0]?.id;
  if (!constructionId) return;

  // 1. construction_phases (4 phases)
  // phase_status: not_started|in_progress|completed|on_hold|delayed
  const phaseDefs = [
    { name: "التصميم والتخطيط", status: "completed",  progress: 100, orderIdx: 0, estCost: rand(20000,  60000)  },
    { name: "التأسيس والحفر",   status: "completed",  progress: 100, orderIdx: 1, estCost: rand(80000,  200000) },
    { name: "البناء الهيكلي",   status: "in_progress",progress: 65,  orderIdx: 2, estCost: rand(200000, 600000) },
    { name: "التشطيب الداخلي",  status: "not_started",progress: 0,   orderIdx: 3, estCost: rand(100000, 400000) },
  ];

  const phaseIds: string[] = [];
  for (const ph of phaseDefs) {
    const now = new Date();
    const planStart = new Date(now.getTime() - rand(90, 180) * 86400000);
    const planEnd   = new Date(planStart.getTime() + rand(30, 90) * 86400000);

    const r = await client.query(
      `INSERT INTO construction_phases
         (org_id, construction_id, name, order_index, status, progress,
          planned_start_date, planned_end_date, estimated_cost)
       VALUES ($1,$2,$3,$4,$5::phase_status,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        orgId, constructionId,
        ph.name, ph.orderIdx, ph.status, ph.progress,
        planStart.toISOString().slice(0, 10),
        planEnd.toISOString().slice(0, 10),
        fmt(ph.estCost),
      ]
    );
    if (r.rows[0]) phaseIds.push(r.rows[0].id);
  }

  // 2. construction_costs (8 costs)
  const costCategories = ["materials", "labor", "equipment", "subcontractors", "permits"];
  const costDefs = [
    { desc: "حديد تسليح",           cat: "materials",      amount: rand(50000,  150000) },
    { desc: "خرسانة جاهزة",         cat: "materials",      amount: rand(30000,   80000) },
    { desc: "أعمال الحفر والجرف",    cat: "labor",          amount: rand(20000,   60000) },
    { desc: "رافعة شوكية — إيجار",   cat: "equipment",      amount: rand(15000,   40000) },
    { desc: "أعمال كهرباء",          cat: "subcontractors", amount: rand(25000,   70000) },
    { desc: "أعمال السباكة",          cat: "subcontractors", amount: rand(20000,   55000) },
    { desc: "رسوم رخصة البناء",      cat: "permits",        amount: rand(5000,    15000) },
    { desc: "مواد تشطيب (بلاط)",     cat: "materials",      amount: rand(40000,  100000) },
  ];

  for (let i = 0; i < costDefs.length; i++) {
    const c = costDefs[i];
    const phaseId = phaseIds.length ? phaseIds[i % phaseIds.length] : null;
    const vat = Math.round(c.amount * 0.15);
    await client.query(
      `INSERT INTO construction_costs
         (org_id, construction_id, phase_id, cost_date, category, description,
          total_amount, vat_amount, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        orgId, constructionId, phaseId,
        randomDate(60).toISOString().slice(0, 10),
        c.cat, c.desc,
        fmt(c.amount), fmt(vat),
        pick(["paid", "paid", "pending"]),
      ]
    );
  }

  // 3. construction_daily_logs (10 logs)
  const weathers = ["صافٍ", "غائم جزئياً", "رياح خفيفة", "حار وجاف"];
  for (let i = 0; i < 10; i++) {
    await client.query(
      `INSERT INTO construction_daily_logs
         (org_id, construction_id, log_date, weather, temperature,
          workers_count, supervisor_present, work_description, logged_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        orgId, constructionId,
        randomDate(30).toISOString().slice(0, 10),
        pick(weathers),
        rand(28, 45),
        rand(5, 30),
        Math.random() > 0.3,
        pick([
          "أعمال الصبة الخرسانية للطابق الثاني",
          "تركيب حديد التسليح للجدران",
          "أعمال البناء بالطوب",
          "تنظيف الموقع وترتيب المواد",
          "أعمال الكهرباء والسباكة المخفية",
        ]),
        "مشرف الموقع",
      ]
    );
  }

  // 4. construction_payments (4 payments)
  const payStatuses = ["paid", "paid", "approved", "draft"];
  for (let i = 0; i < 4; i++) {
    const gross = Math.round(contractAmount * [0.1, 0.2, 0.3, 0.25][i]);
    const retention = Math.round(gross * 0.1);
    const net = gross - retention;
    await client.query(
      `INSERT INTO construction_payments
         (org_id, construction_id, payment_number, gross_amount, retention_deducted,
          net_payable, status, completion_percentage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [
        orgId, constructionId, i + 1,
        fmt(gross), fmt(retention), fmt(net),
        payStatuses[i],
        [10, 20, 30, 25][i],
      ]
    );
  }

  // 5. construction_change_orders (2 orders)
  const coStatuses = ["approved", "proposed"];
  for (let i = 0; i < 2; i++) {
    await client.query(
      `INSERT INTO construction_change_orders
         (org_id, construction_id, change_order_number, title, description,
          reason, cost_impact, time_impact, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        orgId, constructionId,
        `CO-${rand(100, 999)}`,
        pick(["تعديل مخطط الطابق الثالث", "إضافة مواقف إضافية", "تغيير نوع التشطيب"]),
        "تعديل بناءً على طلب المالك",
        "owner_request",
        fmt(rand(10000, 80000)),
        rand(7, 30),
        coStatuses[i],
      ]
    );
  }
}

// ─── F) EVENTS DEEP VERTICAL ──────────────────────────────────────────────────
// event_package_templates, event_package_template_items, decor_assets,
// decor_asset_reservations (need service_orders)

export async function seedEventsDeepVertical(client: any, orgId: string) {
  const customers = await getOrgCustomers(client, orgId);
  if (!customers.length) return;

  // 1. decor_assets
  // category: artificial_flowers|stands|backdrops|vases|holders|decor|kiosk_equipment|other
  // status: available|reserved|in_use|returned|maintenance|damaged
  const assetDefs = [
    { name: "كوش ذهبي فاخر",          category: "stands",            cost: 3500,  status: "available" },
    { name: "خلفية بالون ورد أبيض",   category: "backdrops",         cost: 1800,  status: "available" },
    { name: "طاولة استقبال مع زهور",  category: "stands",            cost: 2200,  status: "in_use"    },
    { name: "مزهريات كريستال (طقم)",  category: "vases",             cost: 1200,  status: "available" },
    { name: "حاملات شموع ذهبية (10)", category: "holders",           cost: 800,   status: "available" },
    { name: "ديكور مدخل ورود صناعية", category: "artificial_flowers", cost: 2500, status: "reserved"  },
  ];

  const assetIds: string[] = [];
  for (const a of assetDefs) {
    const r = await client.query(
      `INSERT INTO decor_assets
         (org_id, name, category, status, purchase_cost, is_active)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, a.name, a.category, a.status, fmt(a.cost)]
    );
    if (r.rows[0]) assetIds.push(r.rows[0].id);
  }

  // 2. event_package_templates
  // type: kiosk|reception_table|entrance|wedding|newborn|custom
  const templateDefs = [
    { name: "باقة أساسية",     type: "custom",   workers: 2 },
    { name: "باقة بريميوم",    type: "wedding",  workers: 4 },
    { name: "باقة VIP فاخرة", type: "wedding",  workers: 6 },
  ];

  const templateIds: string[] = [];
  for (const t of templateDefs) {
    const r = await client.query(
      `INSERT INTO event_package_templates
         (org_id, name, type, worker_count, is_active)
       VALUES ($1,$2,$3,$4,true)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [orgId, t.name, t.type, t.workers]
    );
    if (r.rows[0]) templateIds.push(r.rows[0].id);
  }

  // 3. event_package_template_items
  // item_type: asset|consumable_natural|consumable_product|service_fee
  for (let ti = 0; ti < templateIds.length; ti++) {
    const tId = templateIds[ti];
    const items = [
      { desc: "كوش رئيسي",     type: "asset",              qty: 1,  cost: 3500, assetId: assetIds[0] ?? null },
      { desc: "ورود طازجة",    type: "consumable_natural",  qty: 50, cost: 10,   assetId: null },
      { desc: "رسوم التركيب", type: "service_fee",          qty: 1,  cost: 500,  assetId: null },
    ];
    for (let ii = 0; ii < items.length; ii++) {
      const it = items[ii];
      await client.query(
        `INSERT INTO event_package_template_items
           (template_id, org_id, item_type, asset_id, description, quantity, unit, unit_cost_estimate, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,'قطعة',$7,$8)
         ON CONFLICT DO NOTHING`,
        [tId, orgId, it.type, it.assetId, it.desc, fmt(it.qty), fmt(it.cost), ii + 1]
      );
    }
  }

  // 4. decor_asset_reservations (need service_order_id)
  if (assetIds.length >= 2) {
    // Fetch existing service_orders for this org
    const soRes = await client.query(
      `SELECT id FROM service_orders WHERE org_id=$1 LIMIT 4`, [orgId]
    );
    for (let i = 0; i < Math.min(4, soRes.rows.length); i++) {
      const soId = soRes.rows[i].id;
      const assetId = assetIds[i % assetIds.length];
      const fromDate = randomDate(30);
      const toDate = new Date(fromDate.getTime() + rand(1, 3) * 86400000);
      await client.query(
        `INSERT INTO decor_asset_reservations
           (asset_id, service_order_id, org_id, reserved_from, reserved_to, status)
         VALUES ($1,$2,$3,$4,$5,'reserved')
         ON CONFLICT DO NOTHING`,
        [assetId, soId, orgId, iso(fromDate), iso(toDate)]
      );
    }
  }
}

// ─── G) INVENTORY VERTICAL ────────────────────────────────────────────────────
// suppliers, inventory_products, stock_movements, purchase_orders,
// purchase_order_items

export async function seedInventoryVertical(
  client: any,
  orgId: string,
  productPrefixOrProducts: string | InventoryProductInput[] = "منتج"
) {
  // 1. suppliers
  const supplierDefs = [
    { name: "شركة الإمداد السعودية",    code: `SUP-${rand(100,999)}`, contact: "محمد المطيري",  phone: "+966500040001", city: "الرياض"  },
    { name: "مورد الخليج المتحد",       code: `SUP-${rand(100,999)}`, contact: "خالد الزهراني", phone: "+966500040002", city: "جدة"     },
    { name: "مستودعات النهضة الحديثة", code: `SUP-${rand(100,999)}`, contact: "سعد العتيبي",   phone: "+966500040003", city: "الدمام"  },
  ];

  const supplierIds: string[] = [];
  for (const s of supplierDefs) {
    const r = await client.query(
      `INSERT INTO suppliers
         (org_id, name, code, contact_name, phone, city, currency, status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,'SAR','active',true)
       ON CONFLICT (org_id, code) DO NOTHING
       RETURNING id`,
      [orgId, s.name, s.code, s.contact, s.phone, s.city]
    );
    if (r.rows[0]) {
      supplierIds.push(r.rows[0].id);
    } else {
      const ex = await client.query(
        `SELECT id FROM suppliers WHERE org_id=$1 AND code=$2`, [orgId, s.code]
      );
      if (ex.rows[0]) supplierIds.push(ex.rows[0].id);
    }
  }

  // 2. inventory_products — use custom list if provided, otherwise generate generic ones
  let productIds: string[] = [];

  if (Array.isArray(productPrefixOrProducts)) {
    // Custom product list provided (e.g., flower_shop)
    for (const p of productPrefixOrProducts) {
      const sku = p.sku ?? `SKU-${rand(10000, 99999)}`;
      const r = await client.query(
        `INSERT INTO inventory_products
           (org_id, name, name_en, sku, category, unit,
            unit_cost, cost_price, selling_price,
            current_stock, min_stock, max_stock, notes, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [orgId, p.name, p.nameEn ?? null, sku, p.category, p.unit,
         fmt(p.unitCost), fmt(p.sellingPrice),
         p.stock, p.minStock, p.maxStock ?? null, p.notes ?? null]
      );
      if (r.rows[0]) productIds.push(r.rows[0].id);
    }
  } else {
    // Generic prefix-based product list (retail, laundry, etc.)
    const productPrefix = productPrefixOrProducts as string;
    const genericDefs = [
      { name: `${productPrefix} أ`,    category: "مواد خام",     unit: "كيلوغرام", cost: rand(10,  50),  sell: rand(20, 80)  },
      { name: `${productPrefix} ب`,    category: "مواد خام",     unit: "لتر",       cost: rand(5,   30),  sell: rand(10, 50)  },
      { name: `${productPrefix} ج`,    category: "عبوات",        unit: "قطعة",      cost: rand(2,   10),  sell: rand(5,  20)  },
      { name: `${productPrefix} د`,    category: "مستلزمات",     unit: "علبة",      cost: rand(15,  60),  sell: rand(30, 100) },
      { name: `${productPrefix} هـ`,   category: "مستلزمات",     unit: "قطعة",      cost: rand(8,   40),  sell: rand(15, 70)  },
      { name: `${productPrefix} و`,    category: "معدات",        unit: "قطعة",      cost: rand(100, 500), sell: rand(200,800) },
      { name: `${productPrefix} ز`,    category: "كيماويات",     unit: "لتر",       cost: rand(20,  80),  sell: rand(40,120)  },
      { name: `${productPrefix} ح`,    category: "مواد خام",     unit: "كيس",       cost: rand(30,  100), sell: rand(60,180)  },
      { name: `${productPrefix} ط`,    category: "مستلزمات",     unit: "رزمة",      cost: rand(5,   25),  sell: rand(10, 45)  },
      { name: `${productPrefix} ي`,    category: "عبوات",        unit: "كرتون",     cost: rand(50,  200), sell: rand(100,350) },
      { name: `${productPrefix} ك`,    category: "كيماويات",     unit: "براميل",    cost: rand(150, 600), sell: rand(300,900) },
      { name: `${productPrefix} ل`,    category: "مواد خام",     unit: "كيلوغرام", cost: rand(10,  40),  sell: rand(20, 70)  },
      { name: `${productPrefix} م`,    category: "معدات",        unit: "قطعة",      cost: rand(200, 800), sell: rand(400,1200)},
      { name: `${productPrefix} ن`,    category: "مستلزمات",     unit: "علبة",      cost: rand(10,  50),  sell: rand(20, 80)  },
      { name: `${productPrefix} س`,    category: "عبوات",        unit: "قطعة",      cost: rand(3,   15),  sell: rand(7,  25)  },
    ];

    for (const p of genericDefs) {
      const qty = rand(10, 200);
      const sku  = `SKU-${rand(10000, 99999)}`;
      const r = await client.query(
        `INSERT INTO inventory_products
           (org_id, name, sku, category, unit, unit_cost, cost_price, selling_price,
            current_stock, min_stock, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,5,true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [orgId, p.name, sku, p.category, p.unit, fmt(p.cost), fmt(p.sell), qty]
      );
      if (r.rows[0]) productIds.push(r.rows[0].id);
    }
  }

  // 3. stock_movements (10 movements)
  // type: in|out|adjustment|transfer
  const movTypes = ["in", "in", "in", "out", "out", "adjustment"];
  for (let i = 0; i < 10; i++) {
    if (!productIds.length) break;
    const prodId = pick(productIds);
    await client.query(
      `INSERT INTO stock_movements
         (org_id, product_id, type, quantity, notes)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT DO NOTHING`,
      [
        orgId, prodId,
        pick(movTypes),
        rand(1, 50),
        pick(["استلام من المورد", "بيع للعميل", "تعديل جرد", "مرتجع من العميل"]),
      ]
    );
  }

  // 4. purchase_orders (3 orders) — need a user_id for created_by
  const userRes = await client.query(
    `SELECT id FROM users WHERE org_id=$1 LIMIT 1`, [orgId]
  );
  const userId = userRes.rows[0]?.id;
  if (!userId || !supplierIds.length) return;

  for (let i = 0; i < 3; i++) {
    const supId = supplierIds[i % supplierIds.length];
    const subtotal = rand(5000, 30000);
    const vat = Math.round(subtotal * 0.15);
    const total = subtotal + vat;
    const poStatus = ["received", "partially_received", "draft"][i];

    const poRes = await client.query(
      `INSERT INTO purchase_orders
         (org_id, supplier_id, po_number, order_date, subtotal, vat_amount, total_amount,
          status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::po_status,$9)
       ON CONFLICT (org_id, po_number) DO NOTHING
       RETURNING id`,
      [
        orgId, supId,
        `PO-${rand(10000, 99999)}`,
        iso(randomDate(60)),
        fmt(subtotal), fmt(vat), fmt(total),
        poStatus, userId,
      ]
    );
    if (!poRes.rows[0]) continue;
    const poId = poRes.rows[0].id;

    // PO items (2–3 per order)
    for (let j = 0; j < rand(2, 3); j++) {
      const prodId = productIds.length ? pick(productIds) : null;
      const qty = rand(5, 50);
      const unitPrice = rand(10, 200);
      const lineTotal = qty * unitPrice;
      await client.query(
        `INSERT INTO purchase_order_items
           (po_id, org_id, item_name, ordered_quantity, received_quantity, unit_price, total_price)
         VALUES ($1,$2,$3,$4,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [poId, orgId, `صنف ${j + 1}`, qty, fmt(unitPrice), fmt(lineTotal)]
      );
    }
  }
}

// ─── H) FINANCIAL LAYER ───────────────────────────────────────────────────────
// treasury_transactions, hr_payroll + hr_payroll_items, hr_leaves,
// customer_interactions

export async function seedFinancialLayer(client: any, orgId: string) {
  // 1. treasury_transactions — ensure treasury_account exists (non-POS orgs may not have one)
  let taRes = await client.query(
    `SELECT id, current_balance FROM treasury_accounts WHERE org_id=$1 AND is_active=true LIMIT 1`,
    [orgId]
  );
  if (!taRes.rows[0]) {
    // Create a bank account for non-POS orgs
    const created = await client.query(
      `INSERT INTO treasury_accounts (org_id, name, type)
       VALUES ($1, 'الحساب البنكي الرئيسي', 'bank_account')
       ON CONFLICT DO NOTHING
       RETURNING id, current_balance`,
      [orgId]
    );
    if (created.rows[0]) taRes = created;
  }
  if (taRes.rows[0]) {
    const taId = taRes.rows[0].id;
    let runningBalance = parseFloat(taRes.rows[0].current_balance || "0");

    // transaction_type: receipt|payment|transfer_in|transfer_out|opening|closing|adjustment
    // source_type: booking|invoice|expense|pos|transfer|payroll|manual
    const txDefs = [
      { type: "receipt",  src: "booking", desc: "استلام دفعة حجز", amount: rand(500,  3000) },
      { type: "receipt",  src: "booking", desc: "دفعة عميل نقداً", amount: rand(200,  1500) },
      { type: "receipt",  src: "invoice", desc: "سداد فاتورة",     amount: rand(800,  5000) },
      { type: "payment",  src: "expense", desc: "دفع إيجار",        amount: rand(2000, 8000) },
      { type: "payment",  src: "expense", desc: "مصاريف تشغيلية",  amount: rand(300,  2000) },
      { type: "receipt",  src: "pos",     desc: "إيراد نقطة بيع",  amount: rand(100,  800)  },
      { type: "payment",  src: "payroll", desc: "صرف رواتب",       amount: rand(5000, 20000)},
      { type: "receipt",  src: "booking", desc: "عربون حجز",       amount: rand(500,  2000) },
      { type: "payment",  src: "expense", desc: "مشتريات",         amount: rand(1000, 5000) },
      { type: "receipt",  src: "manual",  desc: "تحويل وارد",      amount: rand(3000, 10000)},
    ];

    for (const tx of txDefs) {
      const delta = tx.type === "receipt" || tx.type === "transfer_in"
        ? tx.amount : -tx.amount;
      runningBalance += delta;
      if (runningBalance < 0) runningBalance = 0;

      await client.query(
        `INSERT INTO treasury_transactions
           (org_id, treasury_account_id, transaction_type, amount, balance_after,
            description, source_type, voucher_number)
         VALUES ($1,$2,$3::treasury_transaction_type,$4,$5,$6,$7::treasury_source_type,$8)
         ON CONFLICT DO NOTHING`,
        [
          orgId, taId, tx.type, fmt(tx.amount), fmt(runningBalance),
          tx.desc, tx.src,
          `VCH-${rand(10000, 99999)}`,
        ]
      );
    }
  }

  // 2. hr_payroll + hr_payroll_items
  const empRes = await client.query(
    `SELECT id, full_name, basic_salary, housing_allowance, transport_allowance
     FROM hr_employees WHERE org_id=$1 AND status='active' LIMIT 5`,
    [orgId]
  );
  if (empRes.rows.length > 0) {
    const payrollMonth = "2026-03";
    const payrollDate  = "2026-03-31";

    let totalBasic  = 0;
    let totalAllows = 0;
    let totalNet    = 0;

    const payrollRes = await client.query(
      `INSERT INTO hr_payroll
         (org_id, payroll_number, payroll_month, payroll_date, status)
       VALUES ($1,$2,$3,$4,'paid')
       ON CONFLICT (org_id, payroll_number) DO NOTHING
       RETURNING id`,
      [orgId, `PAY-${rand(10000, 99999)}`, payrollMonth, payrollDate]
    );

    if (payrollRes.rows[0]) {
      const payrollId = payrollRes.rows[0].id;
      for (const emp of empRes.rows) {
        const basic     = parseFloat(emp.basic_salary      || "3000");
        const housing   = parseFloat(emp.housing_allowance  || "500");
        const transport = parseFloat(emp.transport_allowance || "300");
        const net = basic + housing + transport;

        totalBasic  += basic;
        totalAllows += housing + transport;
        totalNet    += net;

        await client.query(
          `INSERT INTO hr_payroll_items
             (org_id, payroll_id, employee_id, basic_salary, housing_allowance,
              transport_allowance, net_salary, working_days, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,26,'included')
           ON CONFLICT DO NOTHING`,
          [
            orgId, payrollId, emp.id,
            fmt(basic), fmt(housing), fmt(transport), fmt(net),
          ]
        );
      }

      // Update payroll totals
      await client.query(
        `UPDATE hr_payroll
         SET total_basic=$2, total_allowances=$3, total_net=$4
         WHERE id=$1`,
        [payrollId, fmt(totalBasic), fmt(totalAllows), fmt(totalNet)]
      );
    }
  }

  // 3. hr_leaves
  if (empRes.rows.length > 0) {
    const leaveTypes = ["annual", "sick", "emergency", "unpaid"];
    for (let i = 0; i < Math.min(3, empRes.rows.length); i++) {
      const emp = empRes.rows[i];
      const startDate = randomDate(30);
      const days = rand(2, 7);
      const endDate = new Date(startDate.getTime() + days * 86400000);
      await client.query(
        `INSERT INTO hr_leaves
           (org_id, employee_id, leave_type, start_date, end_date, days_count, status)
         VALUES ($1,$2,$3,$4,$5,$6,'approved')
         ON CONFLICT DO NOTHING`,
        [
          orgId, emp.id,
          pick(leaveTypes),
          startDate.toISOString().slice(0, 10),
          endDate.toISOString().slice(0, 10),
          days,
        ]
      );
    }
  }

  // 4. customer_interactions (5 per org)
  // interaction_type: call|whatsapp|sms|email|note|meeting
  const customers = await getOrgCustomers(client, orgId);
  if (customers.length > 0) {
    const intTypes: string[] = ["call", "whatsapp", "email", "note", "meeting"];
    const subjects = [
      "استفسار عن الخدمات",
      "متابعة طلب",
      "شكوى وحلها",
      "عرض ترقية",
      "تأكيد موعد",
    ];
    for (let i = 0; i < 5; i++) {
      const cust = pick(customers);
      await client.query(
        `INSERT INTO customer_interactions
           (customer_id, type, subject, content)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [
          cust.id,
          intTypes[i % intTypes.length],
          subjects[i % subjects.length],
          pick(["تم التواصل بنجاح", "في انتظار رد العميل", "تمت معالجة الطلب"]),
        ]
      );
    }
  }
}

// ─── I) SERVICE ORDERS HELPER ─────────────────────────────────────────────────
// Simple helper for orgs that primarily use service_orders

export async function seedServiceOrdersVertical(
  client: any, orgId: string, prefix: string, count: number
) {
  const customers = await getOrgCustomers(client, orgId);
  const services = await getOrgServices(client, orgId);
  if (!customers.length) return;

  const statuses = ["closed", "closed", "closed", "scheduled", "cancelled", "confirmed"];
  const orderTypes = ["custom_arrangement", "field_execution", "kiosk"];
  const orderKinds = ["booking", "sale", "project"];

  for (let i = 0; i < count; i++) {
    const cust = pick(customers);
    const svc  = services.length ? pick(services) : null;
    const total = svc ? Number(svc.base_price) * 1.15 : rand(100, 5000) * 1.15;

    await client.query(
      `INSERT INTO service_orders
         (org_id, customer_id, customer_name, customer_phone,
          order_number, type, order_kind, status, service_id, event_date, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [
        orgId, cust.id, cust.name, cust.phone,
        `${prefix}-${rand(100000, 999999)}`,
        pick(orderTypes), pick(orderKinds),
        pick(statuses),
        svc?.id ?? null,
        iso(randomDate(60)), fmt(total),
      ]
    );
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

type VerticalFn = (client: any, orgId: string) => Promise<void>;

const VERTICAL_MAP: Record<string, VerticalFn> = {
  flower_shop:      async (c, o) => { await seedFlowerVertical(c, o); await seedInventoryVertical(c, o, FLOWER_SHOP_PRODUCTS); await seedEventsDeepVertical(c, o); },
  hotel:            async (c, o) => { await seedHotelVertical(c, o); await seedHotelDeepVertical(c, o); },
  car_rental:       async (c, o) => { await seedCarRentalVertical(c, o); await seedCarRentalDeepVertical(c, o); },
  salon:            seedSalonVertical,
  barber:           seedBarberVertical,
  spa:              seedSpaVertical,
  fitness:          seedSalonVertical,
  school:           async (c, o) => { await seedSchoolVertical(c, o); await seedSchoolDeepVertical(c, o); },
  education:        async (c, o) => { await seedSchoolVertical(c, o); await seedSchoolDeepVertical(c, o); },
  medical:          seedMedicalVertical,
  maintenance:      seedMaintenanceVertical,
  workshop:         seedMaintenanceVertical,
  events:           async (c, o) => { await seedEventsVertical(c, o); await seedEventsDeepVertical(c, o); },
  event_organizer:  async (c, o) => { await seedEventsVertical(c, o); await seedEventsDeepVertical(c, o); },
  events_vendor:    async (c, o) => { await seedEventsVertical(c, o); await seedEventsDeepVertical(c, o); },
  photography:      async (c, o) => { await seedEventsVertical(c, o); await seedEventsDeepVertical(c, o); },
  restaurant:       async (c, o) => { await seedFoodVertical(c, o); await seedFoodDeepVertical(c, o, "restaurant"); },
  cafe:             async (c, o) => { await seedFoodVertical(c, o); await seedFoodDeepVertical(c, o, "cafe"); },
  bakery:           async (c, o) => { await seedFoodVertical(c, o); await seedFoodDeepVertical(c, o, "bakery"); },
  catering:         async (c, o) => { await seedFoodVertical(c, o); await seedFoodDeepVertical(c, o, "catering"); },
  rental:           seedRentalVertical,
  real_estate:      seedRealEstateVertical,
  construction:     async (c, o) => { await seedConstructionVertical(c, o); await seedConstructionDeepVertical(c, o); },
  logistics:        seedLogisticsVertical,
  // New verticals
  retail:           async (c, o) => { await seedInventoryVertical(c, o, "بضاعة"); await seedServiceOrdersVertical(c, o, "RET", 15); },
  store:            async (c, o) => { await seedInventoryVertical(c, o, "سلعة"); await seedServiceOrdersVertical(c, o, "STR", 15); },
  printing:         async (c, o) => { await seedInventoryVertical(c, o, "مادة طباعة"); await seedServiceOrdersVertical(c, o, "PRN", 20); },
  digital_services: async (c, o) => { await seedServiceOrdersVertical(c, o, "DIG", 20); },
  marketing:        async (c, o) => { await seedServiceOrdersVertical(c, o, "MKT", 20); },
  agency:           async (c, o) => { await seedServiceOrdersVertical(c, o, "AGN", 20); },
  technology:       async (c, o) => { await seedServiceOrdersVertical(c, o, "TEC", 20); },
  laundry:          async (c, o) => { await seedInventoryVertical(c, o, "مواد تنظيف"); await seedServiceOrdersVertical(c, o, "LAU", 20); },
  services:         async (c, o) => { await seedServiceOrdersVertical(c, o, "SVC", 20); },
  general:          async (c, o) => { await seedServiceOrdersVertical(c, o, "GEN", 15); },
};

export async function seedVertical(client: any, orgId: string, businessType: string) {
  const fn = VERTICAL_MAP[businessType];
  if (fn) {
    try {
      await fn(client, orgId);
    } catch (err: any) {
      // Don't fail the whole seed if a vertical has a schema issue
      console.warn(`    [vertical:${businessType}] warning: ${err.message}`);
    }
  }
}
