import "dotenv/config";
import { db } from "../client";
import { DEFAULT_VAT_RATE, DEFAULT_DEPOSIT_PERCENT } from "../constants";
import {
  organizations, locations, users, roles, permissions,
  rolePermissions, categories, services, addons, serviceAddons,
  customers, seasons, bookingPipelineStages,
} from "../schema";

async function seed() {
  console.log("🌱 بدأ ملء البيانات التجريبية...\n");

  // ============================================================
  // 1. ORGANIZATION — محفل كأول مشترك تجريبي
  // ============================================================

  const [org] = await db.insert(organizations).values({
    name: "محفل",
    nameEn: "Mahfal",
    slug: "mahfal",
    phone: "0535834020",
    email: "info@almahfal.com",
    website: "https://almahfal.com",
    primaryColor: "#800020",
    secondaryColor: "#C8A951",
    city: "الرياض",
    plan: "pro",
    subscriptionStatus: "active",
    subdomain: "mahfal",
    settings: {
      timezone: "Asia/Riyadh",
      currency: "SAR",
      language: "ar",
      dateFormat: "YYYY-MM-DD",
      weekStartsOn: "sunday",
      vatRate: DEFAULT_VAT_RATE,
      vatInclusive: true,
    },
  }).returning();

  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ============================================================
  // 2. LOCATIONS
  // ============================================================

  const locationData = [
    { name: "القيروان", type: "venue", city: "الرياض" },
    { name: "مطل الدائري 34", type: "venue", city: "الرياض" },
    { name: "مطل عرقة", type: "venue", city: "الرياض" },
    { name: "مخطط مخرج 16", type: "venue", city: "الرياض" },
    { name: "مطل الهدا", type: "venue", city: "الرياض" },
    { name: "المستودع الرئيسي", type: "warehouse", city: "الرياض" },
  ];

  const locs = await db.insert(locations)
    .values(locationData.map(l => ({ orgId: org.id, ...l })))
    .returning();

  console.log(`✅ Locations: ${locs.length} مواقع`);

  // ============================================================
  // 3. PERMISSIONS
  // ============================================================

  const permData = [
    // Services
    { resource: "services", action: "view", description: "عرض الخدمات" },
    { resource: "services", action: "create", description: "إنشاء خدمة" },
    { resource: "services", action: "edit", description: "تعديل خدمة" },
    { resource: "services", action: "delete", description: "حذف خدمة" },
    // Bookings
    { resource: "bookings", action: "view", description: "عرض الحجوزات" },
    { resource: "bookings", action: "create", description: "إنشاء حجز" },
    { resource: "bookings", action: "edit", description: "تعديل حجز" },
    { resource: "bookings", action: "delete", description: "حذف/إلغاء حجز" },
    { resource: "bookings", action: "approve", description: "قبول/رفض حجز" },
    { resource: "bookings", action: "edit_price", description: "تعديل سعر الحجز" },
    // Customers
    { resource: "customers", action: "view", description: "عرض العملاء" },
    { resource: "customers", action: "create", description: "إضافة عميل" },
    { resource: "customers", action: "edit", description: "تعديل عميل" },
    { resource: "customers", action: "delete", description: "حذف عميل" },
    { resource: "customers", action: "export", description: "تصدير بيانات العملاء" },
    // Finance
    { resource: "finance", action: "view", description: "عرض المالية" },
    { resource: "finance", action: "create_invoice", description: "إنشاء فاتورة" },
    { resource: "finance", action: "refund", description: "إصدار استرداد" },
    { resource: "finance", action: "edit_discount", description: "تعديل خصم" },
    // Settings
    { resource: "settings", action: "view", description: "عرض الإعدادات" },
    { resource: "settings", action: "edit", description: "تعديل الإعدادات" },
    { resource: "settings", action: "manage_roles", description: "إدارة الأدوار" },
    { resource: "settings", action: "manage_users", description: "إدارة الموظفين" },
    // Marketing
    { resource: "marketing", action: "view", description: "عرض التسويق" },
    { resource: "marketing", action: "create_campaign", description: "إنشاء حملة" },
    { resource: "marketing", action: "send_message", description: "إرسال رسالة جماعية" },
    // Reports
    { resource: "reports", action: "view", description: "عرض التقارير" },
    { resource: "reports", action: "export", description: "تصدير التقارير" },
  ];

  const perms = await db.insert(permissions).values(permData).returning();
  console.log(`✅ Permissions: ${perms.length} صلاحية`);

  // ============================================================
  // 4. ROLES
  // ============================================================

  // مدير عمليات — كل شيء ما عدا الإعدادات
  const [opsManager] = await db.insert(roles).values({
    orgId: org.id, name: "مدير عمليات", nameEn: "Operations Manager", isSystem: true,
  }).returning();

  // مشرف حجوزات — الحجوزات والعملاء فقط
  const [bookingSupervisor] = await db.insert(roles).values({
    orgId: org.id, name: "مشرف حجوزات", nameEn: "Booking Supervisor", isSystem: true,
  }).returning();

  // محاسب — المالية والتقارير فقط
  const [accountant] = await db.insert(roles).values({
    orgId: org.id, name: "محاسب", nameEn: "Accountant", isSystem: true,
  }).returning();

  // مقدم خدمة خارجي — حجوزاته فقط
  const [vendorRole] = await db.insert(roles).values({
    orgId: org.id, name: "مقدم خدمة", nameEn: "Vendor", isSystem: true,
  }).returning();

  // Assign permissions to roles
  const allPerms = perms.map(p => p.id);
  const viewPerms = perms.filter(p => p.action === "view").map(p => p.id);
  const bookingPerms = perms.filter(p => ["bookings", "customers"].includes(p.resource)).map(p => p.id);
  const financePerms = perms.filter(p => ["finance", "reports"].includes(p.resource)).map(p => p.id);

  // Ops manager gets everything except settings.manage_roles
  const opsPerms = perms.filter(p => !(p.resource === "settings" && p.action === "manage_roles")).map(p => p.id);
  await db.insert(rolePermissions).values(
    opsPerms.map(pid => ({ roleId: opsManager.id, permissionId: pid }))
  );

  // Booking supervisor
  await db.insert(rolePermissions).values(
    bookingPerms.map(pid => ({ roleId: bookingSupervisor.id, permissionId: pid }))
  );

  // Accountant
  await db.insert(rolePermissions).values(
    financePerms.map(pid => ({ roleId: accountant.id, permissionId: pid }))
  );

  // Vendor — view bookings only
  const vendorPerms = perms.filter(p => p.resource === "bookings" && p.action === "view").map(p => p.id);
  await db.insert(rolePermissions).values(
    vendorPerms.map(pid => ({ roleId: vendorRole.id, permissionId: pid }))
  );

  console.log(`✅ Roles: 4 أدوار مع صلاحياتهم`);

  // ============================================================
  // 5. USERS
  // ============================================================

  const [owner] = await db.insert(users).values({
    orgId: org.id, name: "بندر", phone: "+966535834020",
    email: "bander@almahfal.com", type: "owner", status: "active",
  }).returning();

  await db.insert(users).values([
    { orgId: org.id, name: "أحمد السوداني", phone: "+966566073573", type: "employee", status: "active", roleId: bookingSupervisor.id, allowedLocationIds: [locs[0].id] },
    { orgId: org.id, name: "الترفيه المتكامل", phone: "+966504646578", type: "vendor", status: "active", roleId: vendorRole.id },
    { orgId: org.id, name: "حفلات لافندر", phone: "+966533973552", type: "vendor", status: "active", roleId: vendorRole.id },
  ]);

  console.log(`✅ Users: 4 مستخدمين (مالك + موظف + 2 مقدمي خدمة)`);

  // ============================================================
  // 6. CATEGORIES
  // ============================================================

  const [catTents] = await db.insert(categories).values({
    orgId: org.id, name: "الخيام الشعبية", slug: "الخيام-الشعبية", sortOrder: 1,
  }).returning();

  const [catMoroccan] = await db.insert(categories).values({
    orgId: org.id, name: "خيام مغربية", slug: "خيام-مغربية", parentId: catTents.id, sortOrder: 1,
  }).returning();

  const [catHair] = await db.insert(categories).values({
    orgId: org.id, name: "بيوت الشعر", slug: "بيوت-الشعر", parentId: catTents.id, sortOrder: 2,
  }).returning();

  const [catSeating] = await db.insert(categories).values({
    orgId: org.id, name: "جلسات", slug: "جلسات", sortOrder: 2,
  }).returning();

  const [catTables] = await db.insert(categories).values({
    orgId: org.id, name: "طاولات الطعام", slug: "طاولات-الطعام", sortOrder: 3,
  }).returning();

  const [catAccessories] = await db.insert(categories).values({
    orgId: org.id, name: "إكسسوارات", slug: "إكسسوارات", sortOrder: 4,
  }).returning();

  console.log(`✅ Categories: 6 تصنيفات (شجرة بمستويين)`);

  // ============================================================
  // 7. ADDONS
  // ============================================================

  const [addonHeater] = await db.insert(addons).values({
    orgId: org.id, name: "دفاية غاز (الفيصلية)", priceMode: "fixed", price: "200", type: "optional",
  }).returning();

  const [addonLighting] = await db.insert(addons).values({
    orgId: org.id, name: "إضاءة LED", priceMode: "fixed", price: "500", type: "optional",
  }).returning();

  const [addonStaff] = await db.insert(addons).values({
    orgId: org.id, name: "طاقم خدمة (3 أشخاص)", priceMode: "fixed", price: "1500", type: "optional",
  }).returning();

  const [addonDecor] = await db.insert(addons).values({
    orgId: org.id, name: "ديكور استقبال", priceMode: "fixed", price: "800", type: "optional",
  }).returning();

  console.log(`✅ Addons: 4 إضافات`);

  // ============================================================
  // 8. SERVICES
  // ============================================================

  const [svc1] = await db.insert(services).values({
    orgId: org.id, categoryId: catMoroccan.id,
    name: "خيمة مغربية فاخرة 12×12 — تسع 60 ضيف",
    slug: "خيمة-مغربية-فاخرة-12x12",
    shortDescription: "خيمة مغربية فاخرة بتصميم تقليدي أصيل تسع حتى 60 ضيف",
    basePrice: "16000", status: "active", publishedAt: new Date(),
    maxCapacity: 60, durationMinutes: 1440, setupMinutes: 180, teardownMinutes: 120,
    depositPercent: String(DEFAULT_DEPOSIT_PERCENT), isFeatured: true, sortOrder: 1,
  }).returning();

  const [svc2] = await db.insert(services).values({
    orgId: org.id, categoryId: catMoroccan.id,
    name: "خيمة مغربية فاخرة 8×8 — تسع 40 ضيف",
    slug: "خيمة-مغربية-فاخرة-8x8",
    basePrice: "12000", status: "active", publishedAt: new Date(),
    maxCapacity: 40, durationMinutes: 1440, setupMinutes: 120, teardownMinutes: 90,
    depositPercent: String(DEFAULT_DEPOSIT_PERCENT), sortOrder: 2,
  }).returning();

  const [svc3] = await db.insert(services).values({
    orgId: org.id, categoryId: catMoroccan.id,
    name: "خيمة مغربية فاخرة 6×6 — تسع 30 ضيف",
    slug: "خيمة-مغربية-فاخرة-6x6",
    basePrice: "8000", status: "active", publishedAt: new Date(),
    maxCapacity: 30, durationMinutes: 1440, setupMinutes: 90, teardownMinutes: 60,
    depositPercent: String(DEFAULT_DEPOSIT_PERCENT), sortOrder: 3,
  }).returning();

  const [svc4] = await db.insert(services).values({
    orgId: org.id, categoryId: catTables.id,
    name: "تأجير طاولات طعام ريفي — يبدأ من 30 ضيف",
    slug: "طاولات-طعام-ريفي",
    basePrice: "1200", status: "active", publishedAt: new Date(),
    minCapacity: 30, durationMinutes: 1440,
    depositPercent: String(DEFAULT_DEPOSIT_PERCENT), sortOrder: 1,
  }).returning();

  const [svc5] = await db.insert(services).values({
    orgId: org.id, categoryId: catTables.id,
    name: "تأجير طاولات طعام كلاسيك — يبدأ من 30 ضيف",
    slug: "طاولات-طعام-كلاسيك",
    basePrice: "1375", status: "active", publishedAt: new Date(),
    minCapacity: 30, durationMinutes: 1440,
    depositPercent: String(DEFAULT_DEPOSIT_PERCENT), sortOrder: 2,
  }).returning();

  const [svc6] = await db.insert(services).values({
    orgId: org.id, categoryId: catSeating.id,
    name: "جلسة كنب فاخرة بثيم حسب الطلب — يبدأ من 30 ضيف",
    slug: "جلسة-كنب-فاخرة-ثيم",
    basePrice: "6000", status: "active", publishedAt: new Date(),
    minCapacity: 30, durationMinutes: 1440,
    depositPercent: String(DEFAULT_DEPOSIT_PERCENT), sortOrder: 1,
  }).returning();

  // Link addons to services
  await db.insert(serviceAddons).values([
    { serviceId: svc1.id, addonId: addonHeater.id, sortOrder: 1 },
    { serviceId: svc1.id, addonId: addonLighting.id, sortOrder: 2 },
    { serviceId: svc1.id, addonId: addonStaff.id, sortOrder: 3 },
    { serviceId: svc1.id, addonId: addonDecor.id, sortOrder: 4 },
    { serviceId: svc2.id, addonId: addonHeater.id, sortOrder: 1 },
    { serviceId: svc2.id, addonId: addonLighting.id, sortOrder: 2 },
    { serviceId: svc3.id, addonId: addonHeater.id, sortOrder: 1 },
  ]);

  console.log(`✅ Services: 6 خدمات مع إضافات مربوطة`);

  // ============================================================
  // 9. CUSTOMERS
  // ============================================================

  await db.insert(customers).values([
    { orgId: org.id, name: "منى الشهري", phone: "+966580490229", type: "individual", tier: "regular", source: "direct" },
    { orgId: org.id, name: "محمد العتيبي", phone: "+966535285441", type: "individual", tier: "vip", source: "referral", totalSpent: "45000", totalBookings: 5 },
    { orgId: org.id, name: "شركة أوتاد العقارية", phone: "+966559515955", type: "business", tier: "enterprise", companyName: "شركة أوتاد العقارية", source: "direct", totalSpent: "120000", totalBookings: 12 },
    { orgId: org.id, name: "هايل العتيبي", phone: "+966500200939", type: "individual", tier: "regular", source: "google_ads" },
    { orgId: org.id, name: "مدارس التقنيات العالية", phone: "+966594927000", type: "business", tier: "regular", companyName: "مدارس التقنيات العالية", source: "direct" },
  ]);

  console.log(`✅ Customers: 5 عملاء (3 أفراد + 2 مؤسسات)`);

  // ============================================================
  // 10. SEASONS
  // ============================================================

  await db.insert(seasons).values([
    { orgId: org.id, name: "رمضان 2026", startDate: new Date("2026-02-18"), endDate: new Date("2026-03-19"), color: "#2E7D32" },
    { orgId: org.id, name: "موسم الشتاء 2026", startDate: new Date("2026-11-01"), endDate: new Date("2027-02-28"), color: "#1565C0" },
    { orgId: org.id, name: "عيد الفطر 2026", startDate: new Date("2026-03-20"), endDate: new Date("2026-03-24"), color: "#F57F17" },
  ]);

  console.log(`✅ Seasons: 3 مواسم`);

  // ============================================================
  // 11. BOOKING PIPELINE STAGES
  // ============================================================

  await db.insert(bookingPipelineStages).values([
    { orgId: org.id, name: "طلب جديد", color: "#9E9E9E", sortOrder: 1, isDefault: true },
    { orgId: org.id, name: "تأكيد أولي", color: "#FF9800", sortOrder: 2 },
    { orgId: org.id, name: "عربون مدفوع", color: "#2196F3", sortOrder: 3 },
    { orgId: org.id, name: "تأكيد نهائي", color: "#4CAF50", sortOrder: 4 },
    { orgId: org.id, name: "قيد التجهيز", color: "#9C27B0", sortOrder: 5 },
    { orgId: org.id, name: "قيد التنفيذ", color: "#E91E63", sortOrder: 6 },
    { orgId: org.id, name: "مكتمل", color: "#4CAF50", sortOrder: 7, isTerminal: true },
    { orgId: org.id, name: "ملغي", color: "#F44336", sortOrder: 8, isTerminal: true },
  ]).returning();

  console.log(`✅ Pipeline: 8 مراحل حجز`);

  // ============================================================
  // DONE
  // ============================================================

  console.log(`
╔══════════════════════════════════════════╗
║   ✅ تم ملء البيانات التجريبية بنجاح     ║
║                                          ║
║   Org ID: ${org.id}    ║
║   Owner ID: ${owner.id}   ║
║                                          ║
║   استخدم هذه القيم في X-Org-Id           ║
║   و X-User-Id عند اختبار الـ API         ║
╚══════════════════════════════════════════╝
  `);

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ خطأ في ملء البيانات:", err);
  process.exit(1);
});
