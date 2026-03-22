/**
 * Demo seed data for Nasaq platform
 * Creates one demo organization per business type with realistic Arabic data
 *
 * Usage: pnpm --filter @nasaq/db seed
 */

import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const biz of DEMO_BUSINESSES) {
      console.log(`Seeding: ${biz.name} (${biz.businessType})`);
      await seedBusiness(client, biz);
    }

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedBusiness(client: any, biz: DemoBusiness) {
  // 1. Upsert org (skip if slug exists)
  const existing = await client.query(
    `SELECT id FROM organizations WHERE slug = $1`,
    [biz.slug]
  );
  if (existing.rows[0]) {
    console.log(`  → Already exists, skipping`);
    return;
  }

  const orgResult = await client.query(
    `INSERT INTO organizations
       (name, slug, subdomain, phone, email, business_type, plan, subscription_status,
        trial_ends_at, city, tagline, description, onboarding_completed, has_demo_data)
     VALUES ($1,$2,$3,$4,$5,$6,'basic','trialing',NOW()+INTERVAL '14 days',$7,$8,$9,true,true)
     RETURNING id`,
    [biz.name, biz.slug, biz.slug, biz.phone, biz.email, biz.businessType,
     biz.city, biz.tagline, biz.description]
  );
  const orgId = orgResult.rows[0].id;

  // 2. Owner user
  await client.query(
    `INSERT INTO users (org_id, name, phone, email, type, status)
     VALUES ($1,$2,$3,$4,'owner','active')`,
    [orgId, biz.ownerName, biz.phone, biz.email]
  );

  // 3. Default roles
  await client.query(
    `INSERT INTO roles (org_id, name, name_en, is_system) VALUES
       ($1,'مدير عمليات','Operations Manager',true),
       ($1,'مشرف حجوزات','Booking Supervisor',true),
       ($1,'محاسب','Accountant',true)`,
    [orgId]
  );

  // 4. Default pipeline stages
  await client.query(
    `INSERT INTO booking_pipeline_stages
       (org_id, name, color, sort_order, is_default, is_terminal) VALUES
       ($1,'طلب جديد','#9E9E9E',1,true,false),
       ($1,'تأكيد أولي','#FF9800',2,false,false),
       ($1,'عربون مدفوع','#2196F3',3,false,false),
       ($1,'تأكيد نهائي','#4CAF50',4,false,false),
       ($1,'مكتمل','#4CAF50',5,false,true),
       ($1,'ملغي','#F44336',6,false,true)`,
    [orgId]
  );

  // 5. Categories
  for (const cat of biz.categories) {
    await client.query(
      `INSERT INTO categories (org_id, name, sort_order) VALUES ($1,$2,$3)`,
      [orgId, cat.name, cat.sortOrder]
    );
  }

  // 6. Services
  const catRows = await client.query(
    `SELECT id, name FROM categories WHERE org_id = $1 ORDER BY sort_order`,
    [orgId]
  );
  const catMap: Record<string, string> = {};
  for (const r of catRows.rows) catMap[r.name] = r.id;

  for (const svc of biz.services) {
    await client.query(
      `INSERT INTO services
         (org_id, category_id, name, base_price, duration_minutes, is_active)
       VALUES ($1,$2,$3,$4,$5,true)`,
      [orgId, catMap[svc.category] || null, svc.name, svc.price, svc.duration]
    );
  }

  // 7. Demo customers
  for (const cust of DEMO_CUSTOMERS) {
    await client.query(
      `INSERT INTO customers (org_id, name, phone, source)
       VALUES ($1,$2,$3,'demo')
       ON CONFLICT DO NOTHING`,
      [orgId, cust.name, cust.phone]
    );
  }

  console.log(`  → Created org ${orgId}`);
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

interface DemoBusiness {
  name: string;
  slug: string;
  phone: string;
  email: string;
  businessType: string;
  city: string;
  ownerName: string;
  tagline: string;
  description: string;
  categories: { name: string; sortOrder: number }[];
  services: { name: string; category: string; price: number; duration: number }[];
}

const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    name: "مطعم الديوانية",
    slug: "demo-restaurant",
    phone: "+966500000001",
    email: "demo-restaurant@nasaq.sa",
    businessType: "restaurant",
    city: "الرياض",
    ownerName: "محمد العتيبي",
    tagline: "أصيل الطعم السعودي",
    description: "مطعم متخصص في المأكولات السعودية الأصيلة والخليجية.",
    categories: [
      { name: "مقبلات", sortOrder: 1 },
      { name: "الأطباق الرئيسية", sortOrder: 2 },
      { name: "المشويات", sortOrder: 3 },
      { name: "المشروبات", sortOrder: 4 },
      { name: "الحلويات", sortOrder: 5 },
    ],
    services: [
      { name: "حجز طاولة للعائلة (4 أشخاص)", category: "الأطباق الرئيسية", price: 0, duration: 90 },
      { name: "حجز قاعة خاصة", category: "الأطباق الرئيسية", price: 500, duration: 180 },
      { name: "باقة عشاء رجال الأعمال", category: "الأطباق الرئيسية", price: 280, duration: 120 },
    ],
  },
  {
    name: "كافيه بلو",
    slug: "demo-cafe",
    phone: "+966500000002",
    email: "demo-cafe@nasaq.sa",
    businessType: "cafe",
    city: "جدة",
    ownerName: "سارة الزهراني",
    tagline: "تجربة قهوة استثنائية",
    description: "كافيه متخصص في القهوة المختصة والمشروبات الباردة.",
    categories: [
      { name: "القهوة الساخنة", sortOrder: 1 },
      { name: "المشروبات الباردة", sortOrder: 2 },
      { name: "الإفطار", sortOrder: 3 },
      { name: "الكيك والمعجنات", sortOrder: 4 },
    ],
    services: [
      { name: "حجز ركن خاص (ساعتان)", category: "القهوة الساخنة", price: 150, duration: 120 },
      { name: "باقة اجتماع العمل", category: "المشروبات الباردة", price: 200, duration: 180 },
    ],
  },
  {
    name: "صالون لمسة",
    slug: "demo-salon",
    phone: "+966500000003",
    email: "demo-salon@nasaq.sa",
    businessType: "salon",
    city: "الرياض",
    ownerName: "نورة الشمري",
    tagline: "جمالك يبدأ هنا",
    description: "صالون تجميل نسائي متكامل للشعر والعناية بالبشرة.",
    categories: [
      { name: "العناية بالشعر", sortOrder: 1 },
      { name: "الميك أب", sortOrder: 2 },
      { name: "الأظافر", sortOrder: 3 },
      { name: "العناية بالبشرة", sortOrder: 4 },
      { name: "العروس", sortOrder: 5 },
    ],
    services: [
      { name: "قصة شعر + سشوار", category: "العناية بالشعر", price: 120, duration: 60 },
      { name: "صبغة شعر كاملة", category: "العناية بالشعر", price: 350, duration: 120 },
      { name: "ميك أب سهرة", category: "الميك أب", price: 250, duration: 90 },
      { name: "ميك أب عروس", category: "العروس", price: 800, duration: 150 },
      { name: "مانيكير + باديكير", category: "الأظافر", price: 150, duration: 60 },
      { name: "جلسة تنظيف بشرة", category: "العناية بالبشرة", price: 200, duration: 75 },
    ],
  },
  {
    name: "صالون الحلاق الفارس",
    slug: "demo-barber",
    phone: "+966500000004",
    email: "demo-barber@nasaq.sa",
    businessType: "barber",
    city: "الدمام",
    ownerName: "خالد الدوسري",
    tagline: "لأناقة الرجل",
    description: "صالون حلاقة رجالي متخصص بأحدث الأساليب العصرية.",
    categories: [
      { name: "الحلاقة", sortOrder: 1 },
      { name: "العناية باللحية", sortOrder: 2 },
      { name: "الصبغة", sortOrder: 3 },
    ],
    services: [
      { name: "حلاقة شعر", category: "الحلاقة", price: 40, duration: 30 },
      { name: "حلاقة + لحية", category: "الحلاقة", price: 70, duration: 45 },
      { name: "تشكيل لحية", category: "العناية باللحية", price: 50, duration: 30 },
      { name: "صبغة شعر", category: "الصبغة", price: 120, duration: 60 },
    ],
  },
  {
    name: "سبا أندالسيا",
    slug: "demo-spa",
    phone: "+966500000005",
    email: "demo-spa@nasaq.sa",
    businessType: "spa",
    city: "الرياض",
    ownerName: "منى البقمي",
    tagline: "استرخِ وجدّد طاقتك",
    description: "مركز سبا فاخر متخصص في العلاجات التقليدية والحديثة.",
    categories: [
      { name: "المساج", sortOrder: 1 },
      { name: "العلاجات المائية", sortOrder: 2 },
      { name: "جلسات الحمام المغربي", sortOrder: 3 },
      { name: "الباقات المتكاملة", sortOrder: 4 },
    ],
    services: [
      { name: "مساج استرخاء (60 دقيقة)", category: "المساج", price: 280, duration: 60 },
      { name: "مساج عميق للعضلات (90 دقيقة)", category: "المساج", price: 380, duration: 90 },
      { name: "حمام مغربي كامل", category: "جلسات الحمام المغربي", price: 350, duration: 90 },
      { name: "باقة العروس الكاملة", category: "الباقات المتكاملة", price: 1200, duration: 240 },
    ],
  },
  {
    name: "زهور الرياض",
    slug: "demo-flower-shop",
    phone: "+966500000006",
    email: "demo-flowers@nasaq.sa",
    businessType: "flower_shop",
    city: "الرياض",
    ownerName: "ريم العنزي",
    tagline: "كل مناسبة بحلة أجمل",
    description: "متجر ورود متخصص في التنسيقات الاحتفالية والهدايا الفاخرة.",
    categories: [
      { name: "باقات الورود", sortOrder: 1 },
      { name: "تنسيقات الأعراس", sortOrder: 2 },
      { name: "الهدايا والصناديق", sortOrder: 3 },
      { name: "النباتات الطبيعية", sortOrder: 4 },
    ],
    services: [
      { name: "باقة ورد احتفالية صغيرة", category: "باقات الورود", price: 150, duration: 30 },
      { name: "باقة ورد كبيرة متميزة", category: "باقات الورود", price: 350, duration: 30 },
      { name: "تنسيق زفاف كامل", category: "تنسيقات الأعراس", price: 3500, duration: 480 },
      { name: "صندوق هدايا فاخر", category: "الهدايا والصناديق", price: 450, duration: 30 },
    ],
  },
  {
    name: "مركز الفعاليات الذهبية",
    slug: "demo-events",
    phone: "+966500000007",
    email: "demo-events@nasaq.sa",
    businessType: "events",
    city: "جدة",
    ownerName: "عبدالله القرشي",
    tagline: "نصنع لحظاتك الاستثنائية",
    description: "شركة تنظيم فعاليات وأعراس متكاملة.",
    categories: [
      { name: "الأعراس", sortOrder: 1 },
      { name: "حفلات الأطفال", sortOrder: 2 },
      { name: "الفعاليات الشركاتية", sortOrder: 3 },
      { name: "حفلات التخرج", sortOrder: 4 },
    ],
    services: [
      { name: "حفل زفاف كامل (300 شخص)", category: "الأعراس", price: 25000, duration: 480 },
      { name: "حفل خطوبة", category: "الأعراس", price: 8000, duration: 240 },
      { name: "يوم ميلاد (50 شخص)", category: "حفلات الأطفال", price: 3500, duration: 180 },
      { name: "حفل تخرج مدرسي", category: "حفلات التخرج", price: 15000, duration: 360 },
    ],
  },
  {
    name: "مؤجرون — تأجير المعدات",
    slug: "demo-rental",
    phone: "+966500000008",
    email: "demo-rental@nasaq.sa",
    businessType: "rental",
    city: "الرياض",
    ownerName: "فيصل الحربي",
    tagline: "أجّر بكل سهولة",
    description: "شركة تأجير معدات وأدوات للأفراد والمشاريع.",
    categories: [
      { name: "معدات البناء", sortOrder: 1 },
      { name: "معدات الحفلات", sortOrder: 2 },
      { name: "كاميرات وتصوير", sortOrder: 3 },
      { name: "سيارات وشاحنات", sortOrder: 4 },
    ],
    services: [
      { name: "إيجار طاولات (10 طاولات/يوم)", category: "معدات الحفلات", price: 200, duration: 1440 },
      { name: "إيجار كراسي (50 كرسي/يوم)", category: "معدات الحفلات", price: 150, duration: 1440 },
      { name: "إيجار مولد كهربائي (يومي)", category: "معدات البناء", price: 500, duration: 1440 },
      { name: "إيجار كاميرا احترافية (يومي)", category: "كاميرات وتصوير", price: 350, duration: 1440 },
    ],
  },
];

const DEMO_CUSTOMERS = [
  { name: "أحمد محمد", phone: "+966500001001" },
  { name: "سعود العتيبي", phone: "+966500001002" },
  { name: "نورة الزهراني", phone: "+966500001003" },
  { name: "خديجة المطيري", phone: "+966500001004" },
  { name: "عبدالرحمن الدوسري", phone: "+966500001005" },
  { name: "فاطمة الشمري", phone: "+966500001006" },
  { name: "محمد العنزي", phone: "+966500001007" },
  { name: "ريم القحطاني", phone: "+966500001008" },
  { name: "بدر الحربي", phone: "+966500001009" },
  { name: "هنوف الغامدي", phone: "+966500001010" },
];

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
