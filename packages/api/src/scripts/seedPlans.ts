/**
 * Seed pricing plans, plan features, plan addons, and resource addons.
 * Run: npx tsx packages/api/src/scripts/seedPlans.ts
 */
import "dotenv/config";
import { pool } from "@nasaq/db/client";

const PLANS = [
  { code: "free",       name_ar: "مجاني",     name_en: "Free",         price_monthly: "0",   price_yearly: "0",    original_price_monthly: null,  original_price_yearly: null,   max_branches: 1,      max_employees: 10,     trial_days: 30, sort_order: 1 },
  { code: "basic",      name_ar: "الأساسي",    name_en: "Basic",        price_monthly: "79",  price_yearly: "790",  original_price_monthly: "249", original_price_yearly: "2988", max_branches: 1,      max_employees: 10,     trial_days: 0,  sort_order: 2 },
  { code: "advanced",   name_ar: "المتقدم",    name_en: "Advanced",     price_monthly: "299", price_yearly: "2990", original_price_monthly: "499", original_price_yearly: "5988", max_branches: 3,      max_employees: 30,     trial_days: 0,  sort_order: 3 },
  { code: "enterprise", name_ar: "المؤسسي",   name_en: "Enterprise",   price_monthly: "399", price_yearly: "3990", original_price_monthly: "799", original_price_yearly: "9588", max_branches: 10,     max_employees: 100,    trial_days: 0,  sort_order: 4 },
  { code: "custom",     name_ar: "Enterprise", name_en: "Enterprise+",  price_monthly: "0",   price_yearly: "0",    original_price_monthly: null,  original_price_yearly: null,   max_branches: 999999, max_employees: 999999, trial_days: 0,  sort_order: 5 },
];

const FEATURES: Record<string, string[]> = {
  bookings:         ["free","basic","advanced","enterprise","custom"],
  whatsapp:         ["free","basic","advanced","enterprise","custom"],
  api:              ["free","basic","advanced","enterprise","custom"],
  storefront_qr:    ["free","basic","advanced","enterprise","custom"],
  zatca_invoices:   ["free","basic","advanced","enterprise","custom"],
  pos:              ["free","basic","advanced","enterprise","custom"],
  crm:              ["free","basic","advanced","enterprise","custom"],
  contracts:        ["free","basic","advanced","enterprise","custom"],
  inventory:        ["free","basic","advanced","enterprise","custom"],
  reports_basic:    ["free","basic","advanced","enterprise","custom"],
  custom_domain:    ["basic","advanced","enterprise","custom"],
  hr_payroll:       ["advanced","enterprise","custom"],
  accounting:       ["advanced","enterprise","custom"],
  reports_advanced: ["advanced","enterprise","custom"],
  hide_branding:    ["advanced","enterprise","custom"],
  account_manager:  ["enterprise","custom"],
  priority_support: ["enterprise","custom"],
  sla:              ["enterprise","custom"],
};

const PLAN_ADDONS = [
  { code: "restaurant",   name_ar: "نظام المطعم",    name_en: "Restaurant",    description_ar: "KDS + طلبات + قائمة QR + طاولات",           price_yearly: "790", sort_order: 1 },
  { code: "real_estate",  name_ar: "نظام العقارات",   name_en: "Real Estate",   description_ar: "عقود + تحصيل + صيانة + وحدات",               price_yearly: "790", sort_order: 2 },
  { code: "construction", name_ar: "نظام المقاولات",  name_en: "Construction",  description_ar: "مشاريع + مستخلصات + مواد + مقاولين",          price_yearly: "790", sort_order: 3 },
  { code: "flower_shop",  name_ar: "محل الورود",       name_en: "Flower Shop",   description_ar: "مخزون سيقان + صلاحية + كوشات",                price_yearly: "790", sort_order: 4 },
  { code: "school",       name_ar: "نظام المدرسة",     name_en: "School",        description_ar: "طلاب + معلمون + جداول + سلوك",                price_yearly: "790", sort_order: 5 },
  { code: "delivery",     name_ar: "مناديب وتوصيل",   name_en: "Delivery",      description_ar: "تتبع + تسليم + رسوم توصيل",                   price_yearly: "790", sort_order: 6 },
  { code: "marketing",    name_ar: "تسويق متقدم",      name_en: "Marketing",     description_ar: "جدولة + حملات + AI محتوى",                    price_yearly: "790", sort_order: 7 },
  { code: "loyalty",      name_ar: "برنامج الولاء",    name_en: "Loyalty",       description_ar: "نقاط + أختام + مكافآت",                       price_yearly: "790", sort_order: 8 },
];

const RESOURCE_ADDONS = [
  { code: "extra_branch",    name_ar: "فرع إضافي",       price_monthly: null, price_yearly: "990", unit_ar: "فرع",     quantity: 1  },
  { code: "extra_employees", name_ar: "25 موظف إضافي",   price_monthly: null, price_yearly: "690", unit_ar: "25 موظف", quantity: 25 },
  { code: "hide_branding",   name_ar: "إخفاء علامة نسق", price_monthly: null, price_yearly: "490", unit_ar: "منشأة",   quantity: 1  },
];

async function seed() {
  console.log("Seeding pricing plans...");
  for (const p of PLANS) {
    await pool.query(
      `INSERT INTO plans (code, name_ar, name_en, price_monthly, price_yearly, original_price_monthly, original_price_yearly, max_branches, max_employees, trial_days, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (code) DO UPDATE SET
         name_ar=EXCLUDED.name_ar, name_en=EXCLUDED.name_en,
         price_monthly=EXCLUDED.price_monthly, price_yearly=EXCLUDED.price_yearly,
         original_price_monthly=EXCLUDED.original_price_monthly,
         original_price_yearly=EXCLUDED.original_price_yearly,
         max_branches=EXCLUDED.max_branches, max_employees=EXCLUDED.max_employees,
         trial_days=EXCLUDED.trial_days, sort_order=EXCLUDED.sort_order`,
      [p.code, p.name_ar, p.name_en, p.price_monthly, p.price_yearly,
       p.original_price_monthly, p.original_price_yearly,
       p.max_branches, p.max_employees, p.trial_days, p.sort_order]
    );
  }
  console.log(`  ${PLANS.length} plans seeded`);

  console.log("Seeding pricing plan features...");
  for (const [featureKey, planCodes] of Object.entries(FEATURES)) {
    for (const planCode of ["free","basic","advanced","enterprise","custom"]) {
      await pool.query(
        `INSERT INTO pricing_plan_features (plan_code, feature_key, is_included)
         VALUES ($1,$2,$3)
         ON CONFLICT (plan_code, feature_key) DO UPDATE SET is_included=EXCLUDED.is_included`,
        [planCode, featureKey, planCodes.includes(planCode)]
      );
    }
  }
  console.log(`  ${Object.keys(FEATURES).length * 5} plan feature rows seeded`);

  console.log("Seeding plan addons...");
  for (const a of PLAN_ADDONS) {
    await pool.query(
      `INSERT INTO plan_addons (code, name_ar, name_en, description_ar, price_yearly, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (code) DO UPDATE SET
         name_ar=EXCLUDED.name_ar, description_ar=EXCLUDED.description_ar,
         price_yearly=EXCLUDED.price_yearly`,
      [a.code, a.name_ar, a.name_en, a.description_ar, a.price_yearly, a.sort_order]
    );
  }
  console.log(`  ${PLAN_ADDONS.length} plan addons seeded`);

  console.log("Seeding resource addons...");
  for (const r of RESOURCE_ADDONS) {
    await pool.query(
      `INSERT INTO resource_addons (code, name_ar, price_monthly, price_yearly, unit_ar, quantity)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (code) DO UPDATE SET
         name_ar=EXCLUDED.name_ar, price_yearly=EXCLUDED.price_yearly`,
      [r.code, r.name_ar, r.price_monthly, r.price_yearly, r.unit_ar, r.quantity]
    );
  }
  console.log(`  ${RESOURCE_ADDONS.length} resource addons seeded`);

  console.log("Done.");
  await pool.end();
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
