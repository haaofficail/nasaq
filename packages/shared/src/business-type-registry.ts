// ============================================================
// Business Type Registry — مرجع الأنواع التجارية
//
// المصدر الوحيد للحقيقة لكل نوع نشاط في نسق.
// يستخدم من: الداشبورد (مصطلحات + sidebar) والـ API (guards + checks).
// ============================================================

// ─────────────────────────────────────────────────────────────────
// ملاحظة: تعريفات الـ sidebar في هذا الملف غير مستخدمة في Layout.
// مصدر الـ sidebar الفعلي: apps/dashboard/src/lib/navigationRegistry.ts
// هذا الملف للـ terminology و itemFields و settingsFields فقط.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type BusinessType =
  | "general"
  | "salon"
  | "barber"
  | "spa"
  | "fitness"
  | "restaurant"
  | "cafe"
  | "bakery"
  | "catering"
  | "flower_shop"
  | "hotel"
  | "car_rental"
  | "rental"
  | "real_estate"
  | "retail"
  | "printing"
  | "laundry"
  | "events"
  | "event_organizer"
  | "digital_services"
  | "technology"
  | "maintenance"
  | "workshop"
  | "logistics"
  | "construction"
  | "photography"
  | "school";

/**
 * مصطلحات الواجهة لكل نوع نشاط.
 * كل نص يظهر للمستخدم يجب أن يأتي من هنا عبر getTerm().
 */
export interface BusinessTerminology {
  // ── الكتالوج / الأصناف ──
  items: string;           // الخدمات / الأصناف / المنتجات / السيارات
  item: string;            // خدمة / صنف / منتج / سيارة
  addItem: string;         // إضافة خدمة / إضافة صنف
  editItem: string;        // تعديل الخدمة / تعديل الصنف
  deleteItem: string;      // حذف الخدمة / حذف الصنف
  itemPrice: string;       // سعر الخدمة / سعر الصنف
  itemDuration: string;    // مدة الجلسة / وقت التحضير
  itemEmpty: string;       // لا توجد خدمات بعد / لا توجد أصناف بعد
  categories: string;      // التصنيفات / الأقسام
  category: string;        // تصنيف / قسم
  addCategory: string;
  catalog: string;         // عنوان الصفحة: الخدمات / القائمة / المنتجات
  catalogEmpty: string;    // حالة فاضي في الكتالوج
  topItems: string;        // أكثر الخدمات / أكثر الأصناف

  // ── الحجوزات / الطلبات ──
  booking: string;         // حجز / موعد / طلب / عقد
  bookings: string;        // الحجوزات / المواعيد / الطلبات / العقود
  addBooking: string;      // إضافة حجز / إضافة موعد
  newBooking: string;      // حجز جديد / موعد جديد
  bookingEmpty: string;    // لا توجد حجوزات / لا توجد مواعيد

  // ── العملاء ──
  client: string;          // عميل / زبون / نزيل / مستأجر / عضو
  clients: string;         // العملاء / الزبائن / النزلاء / المستأجرون / الأعضاء
  newClient: string;       // عميل جديد / زبون جديد
  clientEmpty: string;     // لا يوجد عملاء بعد

  // ── الداشبورد ──
  dashboard: string;       // الرئيسية / لوحة التحكم
  revenue: string;         // الإيرادات / المبيعات
  schedule: string;        // الجدول الزمني / الجدول / التقويم

  // ── الصفحة العامة ──
  publicPage: string;      // صفحة الحجز / قائمة الطعام / المتجر
  publicPageDesc: string;  // وصف الصفحة العامة

  // ── تسجيل الدخول ──
  loginTitle: string;      // مرحباً بعودتك / سجّل الدخول

  // ── الإعداد السريع (Onboarding) ──
  newItem: string;               // "خدمة جديدة" / "صنف جديد" / "منتج جديد" / "باقة جديدة"
  onboardingAddItems: string;    // "أضف أول خدمة أو منتج" / "أضف أصناف القائمة" / "أضف منتجاتك"
  onboardingAddData: string;     // "أضف بيانات المطعم" / "أضف بيانات الصالون" / "أضف بيانات المنشأة"
  onboardingAddDataDesc: string; // "الاسم والمدينة يظهران للعملاء في صفحة الطلب"
  onboardingAddStaff: string;    // "أضف موظفاً لفريقك" / "أضف مختصة" / "أضف طبيباً"
  onboardingAddStaffDesc: string;// "يتمكن الموظف من تسجيل الدخول وإدارة الطلبات"
  onboardingFirstBooking: string;// "استقبل أول طلب" / "استقبل أول حجز" / "استقبل أول موعد"
  onboardingFirstBookingDesc: string; // "أنشئ طلباً يدوياً أو شارك رابط الطلب مع عملائك"

  // ── بحث ──
  searchBookingPlaceholder: string; // "بحث برقم الطلب أو اسم العميل..." / "بحث برقم الموعد..."

  // ── إجمالي KPIs الداشبورد ──
  kpiTodayBookings: string;      // "طلبات اليوم" / "حجوزات اليوم" / "مواعيد اليوم"
  kpiTodayBookingUnit: string;   // "طلب" / "حجز" / "موعد"
  topItemsTitle: string;         // "أبرز الأصناف" / "أبرز الخدمات" / "أبرز المنتجات"
  recentBookingsTitle: string;   // "آخر الطلبات" / "آخر الحجوزات" / "آخر المواعيد"
}

/** حقول عنصر الكتالوج */
export interface ItemFieldsConfig {
  required: string[];
  optional: string[];
  hidden: string[];
}

/** حقول الإعدادات */
export interface SettingsFieldsConfig {
  show: string[];
  hide: string[];
}

/** ويدجت الداشبورد */
export interface DashboardWidgetConfig {
  id: string;
  label: string;
  size: "full" | "two-thirds" | "half" | "third";
}

/** صفحة في الـ sidebar */
export interface SidebarItem {
  key: string;
  label: string;
  href: string;
  iconKey: string;  // مفتاح الأيقونة — يُحوَّل لـ LucideIcon في الداشبورد
  group: string;    // الرئيسية / العمليات / الإدارة / التخصصي / النمو
}

/** إدخال كامل في الـ Registry */
export interface BusinessConfig {
  key: BusinessType;
  label: string;
  icon: string;
  description: string;
  terminology: BusinessTerminology;
  sidebar: SidebarItem[];
  itemFields: ItemFieldsConfig;
  settingsFields: SettingsFieldsConfig;
  dashboardWidgets: DashboardWidgetConfig[];
  guardianChecks: string[];  // كودات من ISSUE_CATALOG
}

// ─────────────────────────────────────────────
// SHARED SIDEBAR GROUPS (مشتركة بين أنواع كثيرة)
// ─────────────────────────────────────────────

const HOME_ITEM: SidebarItem = { key: "home", label: "الرئيسية", href: "/dashboard", iconKey: "LayoutDashboard", group: "الرئيسية" };

const SHARED_OPERATIONS: SidebarItem[] = [
  { key: "bookings",  label: "الحجوزات",   href: "/dashboard/bookings",  iconKey: "CalendarCheck",  group: "العمليات" },
  { key: "customers", label: "العملاء",    href: "/dashboard/customers", iconKey: "Users",           group: "العمليات" },
];

const SHARED_MANAGEMENT: SidebarItem[] = [
  { key: "catalog",  label: "الخدمات والمنتجات", href: "/dashboard/catalog",    iconKey: "Layers",    group: "الإدارة" },
  { key: "team",     label: "الفريق",             href: "/dashboard/team",       iconKey: "UsersRound", group: "الإدارة" },
  { key: "finance",  label: "المالية",             href: "/dashboard/finance",    iconKey: "Wallet",    group: "الإدارة" },
];

const SHARED_GROWTH: SidebarItem[] = [
  { key: "reports",   label: "التقارير", href: "/dashboard/reports",   iconKey: "BarChart3", group: "النمو" },
  { key: "marketing", label: "التسويق",  href: "/dashboard/marketing", iconKey: "Send",      group: "النمو" },
  { key: "website",   label: "الموقع",   href: "/dashboard/website",   iconKey: "Globe",     group: "النمو" },
];

const SETTINGS_ITEM: SidebarItem = { key: "settings", label: "الإعدادات", href: "/dashboard/settings", iconKey: "Settings", group: "الإعدادات" };

// ─────────────────────────────────────────────
// SHARED ITEM FIELDS
// ─────────────────────────────────────────────

const SERVICE_FIELDS: ItemFieldsConfig = {
  required: ["name", "price"],
  optional: ["description", "duration", "image", "category", "location", "maxCapacity", "isActive"],
  hidden:   ["stockQuantity", "sku", "barcode", "vehicleType", "roomType"],
};

const FOOD_ITEM_FIELDS: ItemFieldsConfig = {
  required: ["name", "price"],
  optional: ["description", "category", "image", "preparationTime", "isAvailable", "isPopular", "calories"],
  hidden:   ["duration", "location", "maxCapacity", "stockQuantity", "sku", "vehicleType", "roomType"],
};

const PRODUCT_FIELDS: ItemFieldsConfig = {
  required: ["name", "price"],
  optional: ["description", "category", "image", "sku", "barcode", "stockQuantity", "isActive"],
  hidden:   ["duration", "location", "maxCapacity", "vehicleType", "roomType"],
};

// ─────────────────────────────────────────────
// SHARED GUARDIAN CHECKS
// ─────────────────────────────────────────────

const COMMON_GUARDIAN: string[] = ["BOOK-001", "BOOK-002", "TENANT-001", "AUTH-001"];
const FOOD_GUARDIAN: string[]   = ["MENU-001", "MENU-002", "MENU-003", "MENU-004", ...COMMON_GUARDIAN];

// ─────────────────────────────────────────────
// REGISTRY — 27 أنواع
// ─────────────────────────────────────────────

const REGISTRY: BusinessConfig[] = [

  // ══════════════════════════════════════════════
  // ─── عام ─────────────────────────────────────
  // ══════════════════════════════════════════════
  {
    key: "general",
    label: "عام",
    icon: "Briefcase",
    description: "نشاط عام متعدد الأغراض",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "مدة الخدمة",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "الخدمات", catalogEmpty: "أضف خدماتك الأولى",
      topItems: "أكثر الخدمات طلباً",
      booking: "حجز", bookings: "الحجوزات", addBooking: "إضافة حجز", newBooking: "حجز جديد",
      bookingEmpty: "لا توجد حجوزات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول الزمني",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط صفحة الحجز مع عملائك",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف أول خدمة أو منتج",
      onboardingAddData: "أضف بيانات المنشأة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول حجز",
      onboardingFirstBookingDesc: "شارك رابط الحجز مع عملائك أو أنشئ حجزاً يدوياً",
      searchBookingPlaceholder: "بحث برقم الحجز أو اسم العميل...",
      kpiTodayBookings: "حجوزات اليوم",
      kpiTodayBookingUnit: "حجز",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الحجوزات",
    },
    sidebar: [HOME_ITEM, ...SHARED_OPERATIONS, ...SHARED_MANAGEMENT, ...SHARED_GROWTH, SETTINGS_ITEM],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",       label: "الإيرادات",      size: "third" },
      { id: "kpi_bookings",      label: "الحجوزات",       size: "third" },
      { id: "kpi_customers",     label: "العملاء",         size: "third" },
      { id: "weekly_bookings",   label: "الحجوزات الأسبوعية", size: "two-thirds" },
      { id: "booking_status",    label: "حالات الحجز",    size: "third" },
      { id: "recent_bookings",   label: "آخر الحجوزات",   size: "two-thirds" },
      { id: "top_services",      label: "أكثر الخدمات",   size: "third" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  // ══════════════════════════════════════════════
  // ─── الجمال والتجميل ─────────────────────────
  // ══════════════════════════════════════════════
  {
    key: "salon",
    label: "صالون تجميل",
    icon: "Sparkles",
    description: "صالون نسائي / رجالي / مختلط",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "مدة الجلسة",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "الخدمات", catalogEmpty: "أضف خدمات الصالون",
      topItems: "أكثر الخدمات طلباً",
      booking: "موعد", bookings: "المواعيد", addBooking: "إضافة موعد", newBooking: "موعد جديد",
      bookingEmpty: "لا توجد مواعيد بعد",
      client: "عميلة", clients: "العميلات", newClient: "عميلة جديدة", clientEmpty: "لا يوجد عميلات بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول الزمني",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط الحجز مع عميلاتك",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف خدمات الصالون",
      onboardingAddData: "أضف بيانات الصالون",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف مختصة لفريقك",
      onboardingAddStaffDesc: "يتمكنن المختصات من تسجيل الدخول وإدارة المواعيد",
      onboardingFirstBooking: "استقبل أول موعد",
      onboardingFirstBookingDesc: "شارك رابط الحجز مع عميلاتك أو أنشئ موعداً يدوياً",
      searchBookingPlaceholder: "بحث برقم الموعد أو اسم العميلة...",
      kpiTodayBookings: "مواعيد اليوم",
      kpiTodayBookingUnit: "موعد",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر المواعيد",
    },
    sidebar: [
      HOME_ITEM,
      { key: "schedule",         label: "الجدول الزمني",   href: "/dashboard/schedule",        iconKey: "CalendarCheck",  group: "التخصصي" },
      { key: "bookings",         label: "المواعيد",          href: "/dashboard/bookings",         iconKey: "CalendarCheck",  group: "العمليات" },
      { key: "customers",        label: "العميلات",          href: "/dashboard/customers",        iconKey: "Users",           group: "العمليات" },
      { key: "catalog",          label: "الخدمات",           href: "/dashboard/catalog",          iconKey: "Layers",          group: "الإدارة" },
      { key: "commissions",      label: "العمولات",           href: "/dashboard/commissions",      iconKey: "BarChart3",       group: "التخصصي" },
      { key: "salon_supplies",   label: "مستلزمات الصالون",  href: "/dashboard/salon-supplies",   iconKey: "Box",             group: "التخصصي" },
      { key: "team",             label: "الفريق",             href: "/dashboard/team",             iconKey: "UsersRound",      group: "الإدارة" },
      { key: "finance",          label: "المالية",             href: "/dashboard/finance",          iconKey: "Wallet",          group: "الإدارة" },
      { key: "reports",          label: "التقارير",            href: "/dashboard/reports",          iconKey: "BarChart3",       group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings", "staffSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",       label: "الإيرادات",      size: "third" },
      { id: "kpi_bookings",      label: "المواعيد اليوم", size: "third" },
      { id: "kpi_customers",     label: "العميلات",        size: "third" },
      { id: "weekly_bookings",   label: "المواعيد الأسبوعية", size: "two-thirds" },
      { id: "recent_bookings",   label: "آخر المواعيد",   size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "barber",
    label: "حلاق",
    icon: "Scissors",
    description: "صالون حلاقة رجالي",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "مدة الخدمة",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "الخدمات", catalogEmpty: "أضف خدمات الحلاقة",
      topItems: "أكثر الخدمات طلباً",
      booking: "موعد", bookings: "المواعيد", addBooking: "إضافة موعد", newBooking: "موعد جديد",
      bookingEmpty: "لا توجد مواعيد بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول الزمني",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط الحجز مع عملائك",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف خدمات الحلاقة",
      onboardingAddData: "أضف بيانات الصالون",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة المواعيد",
      onboardingFirstBooking: "استقبل أول موعد",
      onboardingFirstBookingDesc: "شارك رابط الحجز مع عملائك أو أنشئ موعداً يدوياً",
      searchBookingPlaceholder: "بحث برقم الموعد أو اسم العميل...",
      kpiTodayBookings: "مواعيد اليوم",
      kpiTodayBookingUnit: "موعد",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر المواعيد",
    },
    sidebar: [
      HOME_ITEM,
      { key: "schedule",    label: "الجدول الزمني", href: "/dashboard/schedule",    iconKey: "CalendarCheck", group: "التخصصي" },
      { key: "bookings",    label: "المواعيد",        href: "/dashboard/bookings",    iconKey: "CalendarCheck", group: "العمليات" },
      { key: "customers",   label: "العملاء",          href: "/dashboard/customers",   iconKey: "Users",         group: "العمليات" },
      { key: "catalog",     label: "الخدمات",          href: "/dashboard/catalog",     iconKey: "Layers",        group: "الإدارة" },
      { key: "commissions", label: "العمولات",          href: "/dashboard/commissions", iconKey: "BarChart3",     group: "التخصصي" },
      { key: "team",        label: "الفريق",            href: "/dashboard/team",        iconKey: "UsersRound",    group: "الإدارة" },
      { key: "finance",     label: "المالية",            href: "/dashboard/finance",     iconKey: "Wallet",        group: "الإدارة" },
      { key: "reports",     label: "التقارير",           href: "/dashboard/reports",     iconKey: "BarChart3",     group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",       label: "الإيرادات",      size: "third" },
      { id: "kpi_bookings",      label: "المواعيد اليوم", size: "third" },
      { id: "kpi_customers",     label: "العملاء",         size: "third" },
      { id: "weekly_bookings",   label: "المواعيد الأسبوعية", size: "full" },
      { id: "recent_bookings",   label: "آخر المواعيد",   size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "spa",
    label: "سبا",
    icon: "Flower",
    description: "سبا ومركز تجميل وعلاج",
    terminology: {
      items: "الجلسات والعلاجات", item: "جلسة", addItem: "إضافة جلسة", editItem: "تعديل الجلسة",
      deleteItem: "حذف الجلسة", itemPrice: "سعر الجلسة", itemDuration: "مدة الجلسة",
      itemEmpty: "لا توجد جلسات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "الجلسات والعلاجات", catalogEmpty: "أضف جلسات السبا",
      topItems: "أكثر الجلسات طلباً",
      booking: "موعد", bookings: "المواعيد", addBooking: "إضافة موعد", newBooking: "موعد جديد",
      bookingEmpty: "لا توجد مواعيد بعد",
      client: "عميلة", clients: "العميلات", newClient: "عميلة جديدة", clientEmpty: "لا يوجد عميلات بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول الزمني",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط الحجز مع عميلاتك",
      loginTitle: "مرحباً بعودتك",
      newItem: "جلسة جديدة",
      onboardingAddItems: "أضف جلسات وعلاجات السبا",
      onboardingAddData: "أضف بيانات السبا",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف معالجة لفريقك",
      onboardingAddStaffDesc: "يتمكنن المختصات من تسجيل الدخول وإدارة المواعيد",
      onboardingFirstBooking: "استقبل أول موعد",
      onboardingFirstBookingDesc: "شارك رابط الحجز مع عميلاتك أو أنشئ موعداً يدوياً",
      searchBookingPlaceholder: "بحث برقم الموعد أو اسم العميلة...",
      kpiTodayBookings: "مواعيد اليوم",
      kpiTodayBookingUnit: "موعد",
      topItemsTitle: "أبرز الجلسات",
      recentBookingsTitle: "آخر المواعيد",
    },
    sidebar: [
      HOME_ITEM,
      { key: "schedule",  label: "الجدول الزمني", href: "/dashboard/schedule",  iconKey: "CalendarCheck", group: "التخصصي" },
      { key: "bookings",  label: "المواعيد",        href: "/dashboard/bookings",  iconKey: "CalendarCheck", group: "العمليات" },
      { key: "customers", label: "العميلات",         href: "/dashboard/customers", iconKey: "Users",         group: "العمليات" },
      { key: "catalog",   label: "الجلسات",          href: "/dashboard/catalog",   iconKey: "Layers",        group: "الإدارة" },
      { key: "team",      label: "الفريق",            href: "/dashboard/team",      iconKey: "UsersRound",    group: "الإدارة" },
      { key: "finance",   label: "المالية",            href: "/dashboard/finance",   iconKey: "Wallet",        group: "الإدارة" },
      { key: "reports",   label: "التقارير",           href: "/dashboard/reports",   iconKey: "BarChart3",     group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",       label: "الإيرادات",       size: "third" },
      { id: "kpi_bookings",      label: "المواعيد اليوم",  size: "third" },
      { id: "kpi_customers",     label: "العميلات",          size: "third" },
      { id: "weekly_bookings",   label: "الجلسات الأسبوعية", size: "full" },
      { id: "recent_bookings",   label: "آخر المواعيد",    size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "fitness",
    label: "لياقة بدنية",
    icon: "Dumbbell",
    description: "نادي رياضي / جيم / تمارين",
    terminology: {
      items: "البرامج التدريبية", item: "برنامج", addItem: "إضافة برنامج", editItem: "تعديل البرنامج",
      deleteItem: "حذف البرنامج", itemPrice: "سعر البرنامج", itemDuration: "مدة الجلسة",
      itemEmpty: "لا توجد برامج بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "البرامج التدريبية", catalogEmpty: "أضف برامجك التدريبية",
      topItems: "أكثر البرامج طلباً",
      booking: "حجز", bookings: "الحجوزات", addBooking: "إضافة حجز", newBooking: "حجز جديد",
      bookingEmpty: "لا توجد حجوزات بعد",
      client: "عضو", clients: "الأعضاء", newClient: "عضو جديد", clientEmpty: "لا يوجد أعضاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول الفصول",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط التسجيل مع أعضائك",
      loginTitle: "مرحباً بعودتك",
      newItem: "اشتراك جديد",
      onboardingAddItems: "أضف خطط الاشتراك",
      onboardingAddData: "أضف بيانات الجيم",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف مدرباً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول حجز",
      onboardingFirstBookingDesc: "شارك رابط الحجز مع أعضائك أو أنشئ حجزاً يدوياً",
      searchBookingPlaceholder: "بحث برقم الحجز أو اسم العضو...",
      kpiTodayBookings: "حجوزات اليوم",
      kpiTodayBookingUnit: "حجز",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الحجوزات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",       label: "الحجوزات",         href: "/dashboard/bookings",       iconKey: "CalendarCheck", group: "العمليات" },
      { key: "customers",      label: "الأعضاء",           href: "/dashboard/customers",      iconKey: "Users",         group: "العمليات" },
      { key: "catalog",        label: "البرامج",            href: "/dashboard/catalog",        iconKey: "Layers",        group: "الإدارة" },
      { key: "access_control", label: "التحكم في الدخول", href: "/dashboard/access-control", iconKey: "ShieldCheck",   group: "التخصصي" },
      { key: "team",           label: "الفريق",             href: "/dashboard/team",           iconKey: "UsersRound",    group: "الإدارة" },
      { key: "finance",        label: "المالية",             href: "/dashboard/finance",        iconKey: "Wallet",        group: "الإدارة" },
      { key: "reports",        label: "التقارير",            href: "/dashboard/reports",        iconKey: "BarChart3",     group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",   size: "third" },
      { id: "kpi_bookings",    label: "حجوزات اليوم", size: "third" },
      { id: "kpi_customers",   label: "الأعضاء",      size: "third" },
      { id: "weekly_bookings", label: "الأسبوعي",     size: "full" },
      { id: "recent_bookings", label: "آخر الحجوزات", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  // ══════════════════════════════════════════════
  // ─── الأغذية والمشروبات ───────────────────────
  // ══════════════════════════════════════════════

  {
    key: "restaurant",
    label: "مطعم",
    icon: "UtensilsCrossed",
    description: "مطعم بخدمة الطاولات أو التوصيل",
    terminology: {
      items: "أصناف القائمة", item: "صنف", addItem: "إضافة صنف", editItem: "تعديل الصنف",
      deleteItem: "حذف الصنف", itemPrice: "سعر الصنف", itemDuration: "وقت التحضير",
      itemEmpty: "لا توجد أصناف بعد", categories: "تصنيفات القائمة", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "قائمة الطعام", catalogEmpty: "أضف أصناف قائمتك",
      topItems: "أكثر الأصناف مبيعاً",
      booking: "حجز طاولة", bookings: "الحجوزات", addBooking: "حجز طاولة جديد", newBooking: "حجز جديد",
      bookingEmpty: "لا توجد حجوزات بعد",
      client: "زبون", clients: "الزبائن", newClient: "زبون جديد", clientEmpty: "لا يوجد زبائن بعد",
      dashboard: "الرئيسية", revenue: "إيرادات اليوم", schedule: "الجدول",
      publicPage: "رابط المنيو", publicPageDesc: "شارك رابط القائمة مع زبائنك",
      loginTitle: "مرحباً بعودتك",
      newItem: "صنف جديد",
      onboardingAddItems: "أضف أصناف القائمة",
      onboardingAddData: "أضف بيانات المطعم",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الطلبات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط الطلب مع عملائك",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الأصناف",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "menu",      label: "قائمة الطعام", href: "/dashboard/menu",      iconKey: "UtensilsCrossed", group: "التخصصي" },
      { key: "kitchen",   label: "المطبخ",         href: "/dashboard/kitchen",   iconKey: "ChefHat",         group: "التخصصي" },
      { key: "table_map", label: "الطاولات",        href: "/dashboard/table-map", iconKey: "LayoutGrid",      group: "التخصصي" },
      { key: "orders",    label: "الطلبات",         href: "/dashboard/orders",    iconKey: "Package",         group: "العمليات" },
      { key: "customers", label: "الزبائن",          href: "/dashboard/customers", iconKey: "Users",           group: "العمليات" },
      { key: "team",      label: "الفريق",           href: "/dashboard/team",      iconKey: "UsersRound",      group: "الإدارة" },
      { key: "finance",   label: "المالية",           href: "/dashboard/finance",   iconKey: "Wallet",          group: "الإدارة" },
      { key: "reports",   label: "التقارير",          href: "/dashboard/reports",   iconKey: "BarChart3",       group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: FOOD_ITEM_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "menuSettings", "tableSettings"], hide: ["bookingDurationSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "إيرادات اليوم",  size: "third" },
      { id: "kpi_orders",      label: "طلبات اليوم",    size: "third" },
      { id: "kpi_customers",   label: "الزبائن",          size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات",    size: "full" },
    ],
    guardianChecks: FOOD_GUARDIAN,
  },

  {
    key: "cafe",
    label: "مقهى",
    icon: "Coffee",
    description: "مقهى ومشروبات",
    terminology: {
      items: "أصناف المنيو", item: "صنف", addItem: "إضافة صنف", editItem: "تعديل الصنف",
      deleteItem: "حذف الصنف", itemPrice: "سعر الصنف", itemDuration: "وقت التحضير",
      itemEmpty: "لا توجد أصناف بعد", categories: "تصنيفات المنيو", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "المنيو", catalogEmpty: "أضف أصناف المنيو",
      topItems: "أكثر الأصناف مبيعاً",
      booking: "طلب", bookings: "الطلبات", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "زبون", clients: "الزبائن", newClient: "زبون جديد", clientEmpty: "لا يوجد زبائن بعد",
      dashboard: "الرئيسية", revenue: "إيرادات اليوم", schedule: "الجدول",
      publicPage: "رابط المنيو", publicPageDesc: "شارك رابط المنيو مع زبائنك",
      loginTitle: "مرحباً بعودتك",
      newItem: "صنف جديد",
      onboardingAddItems: "أضف أصناف القائمة",
      onboardingAddData: "أضف بيانات المقهى",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الطلبات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط الطلب مع عملائك",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الأصناف",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "menu",      label: "المنيو",    href: "/dashboard/menu",      iconKey: "Coffee",      group: "التخصصي" },
      { key: "kitchen",   label: "المطبخ",     href: "/dashboard/kitchen",   iconKey: "ChefHat",     group: "التخصصي" },
      { key: "table_map", label: "الطاولات",   href: "/dashboard/table-map", iconKey: "LayoutGrid",  group: "التخصصي" },
      { key: "orders",    label: "الطلبات",    href: "/dashboard/orders",    iconKey: "Package",     group: "العمليات" },
      { key: "customers", label: "الزبائن",    href: "/dashboard/customers", iconKey: "Users",       group: "العمليات" },
      { key: "team",      label: "الفريق",     href: "/dashboard/team",      iconKey: "UsersRound",  group: "الإدارة" },
      { key: "finance",   label: "المالية",     href: "/dashboard/finance",   iconKey: "Wallet",      group: "الإدارة" },
      { key: "reports",   label: "التقارير",    href: "/dashboard/reports",   iconKey: "BarChart3",   group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: FOOD_ITEM_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "menuSettings"], hide: ["bookingDurationSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "إيرادات اليوم", size: "third" },
      { id: "kpi_orders",      label: "طلبات اليوم",   size: "third" },
      { id: "kpi_menu_items",  label: "أصناف المنيو",  size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات",   size: "full" },
    ],
    guardianChecks: FOOD_GUARDIAN,
  },

  {
    key: "bakery",
    label: "مخبز",
    icon: "Cake",
    description: "مخبز ومعجنات",
    terminology: {
      items: "المنتجات", item: "منتج", addItem: "إضافة منتج", editItem: "تعديل المنتج",
      deleteItem: "حذف المنتج", itemPrice: "سعر المنتج", itemDuration: "وقت التحضير",
      itemEmpty: "لا توجد منتجات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "المنتجات", catalogEmpty: "أضف منتجات المخبز",
      topItems: "أكثر المنتجات مبيعاً",
      booking: "طلب", bookings: "الطلبات", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "زبون", clients: "الزبائن", newClient: "زبون جديد", clientEmpty: "لا يوجد زبائن بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول",
      publicPage: "رابط المتجر", publicPageDesc: "شارك رابط المتجر مع زبائنك",
      loginTitle: "مرحباً بعودتك",
      newItem: "صنف جديد",
      onboardingAddItems: "أضف أصناف المخبز",
      onboardingAddData: "أضف بيانات المخبز",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الطلبات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط الطلب مع عملائك",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الأصناف",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "menu",      label: "المنتجات",  href: "/dashboard/menu",      iconKey: "ShoppingBag", group: "التخصصي" },
      { key: "kitchen",   label: "المطبخ",     href: "/dashboard/kitchen",   iconKey: "ChefHat",     group: "التخصصي" },
      { key: "orders",    label: "الطلبات",    href: "/dashboard/orders",    iconKey: "Package",     group: "العمليات" },
      { key: "customers", label: "الزبائن",    href: "/dashboard/customers", iconKey: "Users",       group: "العمليات" },
      { key: "inventory", label: "المخزون",    href: "/dashboard/inventory", iconKey: "Box",         group: "الإدارة" },
      { key: "finance",   label: "المالية",     href: "/dashboard/finance",   iconKey: "Wallet",      group: "الإدارة" },
      { key: "reports",   label: "التقارير",    href: "/dashboard/reports",   iconKey: "BarChart3",   group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: FOOD_ITEM_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "menuSettings"], hide: ["hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",     size: "third" },
      { id: "kpi_orders",      label: "الطلبات",        size: "third" },
      { id: "kpi_customers",   label: "الزبائن",         size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات",   size: "full" },
    ],
    guardianChecks: FOOD_GUARDIAN,
  },

  {
    key: "catering",
    label: "تموين وضيافة",
    icon: "UtensilsCrossed",
    description: "تموين حفلات وضيافة",
    terminology: {
      items: "الأصناف والباقات", item: "صنف", addItem: "إضافة صنف", editItem: "تعديل الصنف",
      deleteItem: "حذف الصنف", itemPrice: "سعر الصنف", itemDuration: "وقت التحضير",
      itemEmpty: "لا توجد أصناف بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "قائمة التموين", catalogEmpty: "أضف أصناف التموين",
      topItems: "أكثر الأصناف طلباً",
      booking: "حجز تموين", bookings: "الحجوزات", addBooking: "إضافة حجز", newBooking: "حجز جديد",
      bookingEmpty: "لا توجد حجوزات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول",
      publicPage: "رابط الحجز", publicPageDesc: "شارك رابط الحجز مع عملائك",
      loginTitle: "مرحباً بعودتك",
      newItem: "صنف جديد",
      onboardingAddItems: "أضف أصناف التموين",
      onboardingAddData: "أضف بيانات خدمة التموين",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الطلبات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط الطلب مع عملائك",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الأصناف",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",  label: "الحجوزات",  href: "/dashboard/bookings",  iconKey: "CalendarCheck", group: "العمليات" },
      { key: "menu",      label: "القائمة",    href: "/dashboard/menu",      iconKey: "UtensilsCrossed", group: "التخصصي" },
      { key: "customers", label: "العملاء",    href: "/dashboard/customers", iconKey: "Users",          group: "العمليات" },
      { key: "inventory", label: "المخزون",    href: "/dashboard/inventory", iconKey: "Box",            group: "الإدارة" },
      { key: "finance",   label: "المالية",     href: "/dashboard/finance",   iconKey: "Wallet",         group: "الإدارة" },
      { key: "reports",   label: "التقارير",    href: "/dashboard/reports",   iconKey: "BarChart3",      group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: FOOD_ITEM_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings", "menuSettings"], hide: ["hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "الحجوزات",      size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر الحجوزات", size: "full" },
    ],
    guardianChecks: FOOD_GUARDIAN,
  },

  // ══════════════════════════════════════════════
  // ─── التجزئة ──────────────────────────────────
  // ══════════════════════════════════════════════

  {
    key: "flower_shop",
    label: "محل ورود",
    icon: "Flower2",
    description: "محل زهور وتنسيقات",
    terminology: {
      items: "التنسيقات والباقات", item: "تنسيقة", addItem: "إضافة تنسيقة", editItem: "تعديل التنسيقة",
      deleteItem: "حذف التنسيقة", itemPrice: "سعر التنسيقة", itemDuration: "وقت التحضير",
      itemEmpty: "لا توجد تنسيقات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "التنسيقات والباقات", catalogEmpty: "أضف تنسيقاتك وباقاتك",
      topItems: "أكثر التنسيقات مبيعاً",
      booking: "طلب", bookings: "الطلبات", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول",
      publicPage: "متجر الورود", publicPageDesc: "شارك رابط متجرك مع عملائك",
      loginTitle: "مرحباً بعودتك",
      newItem: "باقة جديدة",
      onboardingAddItems: "أضف منتجات متجر الورود",
      onboardingAddData: "أضف بيانات المتجر",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط المتجر مع عملائك",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز المنتجات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",         label: "الطلبات",         href: "/dashboard/bookings",         iconKey: "Package",    group: "العمليات" },
      { key: "customers",        label: "العملاء",          href: "/dashboard/customers",        iconKey: "Users",      group: "العمليات" },
      { key: "catalog",          label: "التنسيقات",        href: "/dashboard/catalog",          iconKey: "Flower2",    group: "الإدارة" },
      { key: "flower_inventory", label: "مخزون الورد",     href: "/dashboard/flower-inventory", iconKey: "Box",        group: "التخصصي" },
      { key: "flower_master",    label: "بيانات الورد",    href: "/dashboard/flower-master",    iconKey: "Layers",     group: "التخصصي" },
      { key: "arrangements",     label: "التنسيقات",        href: "/dashboard/arrangements",     iconKey: "Flower2",    group: "التخصصي" },
      { key: "finance",          label: "المالية",           href: "/dashboard/finance",          iconKey: "Wallet",     group: "الإدارة" },
      { key: "reports",          label: "التقارير",          href: "/dashboard/reports",          iconKey: "BarChart3",  group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: {
      required: ["name", "price"],
      optional: ["description", "category", "image", "stockQuantity", "sku", "isActive"],
      hidden: ["duration", "vehicleType", "roomType"],
    },
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_orders",      label: "الطلبات",       size: "third" },
      { id: "kpi_stock",       label: "تنبيهات المخزون", size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات",  size: "full" },
    ],
    guardianChecks: [...COMMON_GUARDIAN, "BOOK-003"],
  },

  {
    key: "retail",
    label: "متجر تجزئة",
    icon: "ShoppingBag",
    description: "متجر بيع بالتجزئة",
    terminology: {
      items: "المنتجات", item: "منتج", addItem: "إضافة منتج", editItem: "تعديل المنتج",
      deleteItem: "حذف المنتج", itemPrice: "سعر المنتج", itemDuration: "وقت التوصيل",
      itemEmpty: "لا توجد منتجات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "المنتجات", catalogEmpty: "أضف منتجات متجرك",
      topItems: "أكثر المنتجات مبيعاً",
      booking: "طلب", bookings: "الطلبات", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "المبيعات", schedule: "الجدول",
      publicPage: "المتجر الإلكتروني", publicPageDesc: "شارك رابط متجرك مع عملائك",
      loginTitle: "مرحباً بعودتك",
      newItem: "منتج جديد",
      onboardingAddItems: "أضف منتجات المتجر",
      onboardingAddData: "أضف بيانات المتجر",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط المتجر مع العملاء",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز المنتجات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "pos",       label: "نقطة البيع", href: "/dashboard/pos",       iconKey: "ShoppingBag", group: "العمليات" },
      { key: "orders",    label: "الطلبات",     href: "/dashboard/orders",    iconKey: "Package",     group: "العمليات" },
      { key: "customers", label: "العملاء",      href: "/dashboard/customers", iconKey: "Users",       group: "العمليات" },
      { key: "catalog",   label: "المنتجات",     href: "/dashboard/catalog",   iconKey: "Layers",      group: "الإدارة" },
      { key: "inventory", label: "المخزون",      href: "/dashboard/inventory", iconKey: "Box",         group: "الإدارة" },
      { key: "finance",   label: "المالية",       href: "/dashboard/finance",   iconKey: "Wallet",      group: "الإدارة" },
      { key: "reports",   label: "التقارير",      href: "/dashboard/reports",   iconKey: "BarChart3",   group: "النمو" },
      { key: "website",   label: "المتجر",        href: "/dashboard/website",   iconKey: "Globe",       group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: PRODUCT_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "storeSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "المبيعات",       size: "third" },
      { id: "kpi_orders",      label: "الطلبات",         size: "third" },
      { id: "kpi_customers",   label: "العملاء",          size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات",    size: "full" },
      { id: "top_services",    label: "أكثر المنتجات",  size: "third" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  // ══════════════════════════════════════════════
  // ─── الضيافة والتأجير ────────────────────────
  // ══════════════════════════════════════════════

  {
    key: "hotel",
    label: "فندق",
    icon: "Building",
    description: "فندق وشقق فندقية",
    terminology: {
      items: "أنواع الغرف", item: "نوع الغرفة", addItem: "إضافة نوع", editItem: "تعديل النوع",
      deleteItem: "حذف النوع", itemPrice: "سعر الغرفة / ليلة", itemDuration: "فترة الإقامة",
      itemEmpty: "لا توجد أنواع غرف بعد", categories: "الطوابق والأقسام", category: "طابق",
      addCategory: "إضافة قسم", catalog: "أنواع الغرف", catalogEmpty: "أضف أنواع غرفك",
      topItems: "أكثر الغرف حجزاً",
      booking: "حجز", bookings: "الحجوزات", addBooking: "حجز جديد", newBooking: "حجز جديد",
      bookingEmpty: "لا توجد حجوزات بعد",
      client: "نزيل", clients: "النزلاء", newClient: "نزيل جديد", clientEmpty: "لا يوجد نزلاء بعد",
      dashboard: "الرئيسية", revenue: "إيرادات الفندق", schedule: "جدول الإشغال",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط حجز الفندق",
      loginTitle: "مرحباً بعودتك",
      newItem: "غرفة / خدمة جديدة",
      onboardingAddItems: "أضف غرف الفندق وخدماته",
      onboardingAddData: "أضف بيانات الفندق",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول حجز",
      onboardingFirstBookingDesc: "أنشئ حجزاً يدوياً أو شارك رابط الحجز مع النزلاء",
      searchBookingPlaceholder: "بحث برقم الحجز أو اسم النزيل...",
      kpiTodayBookings: "حجوزات اليوم",
      kpiTodayBookingUnit: "حجز",
      topItemsTitle: "أبرز الغرف",
      recentBookingsTitle: "آخر الحجوزات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "hotel",     label: "إدارة الفندق", href: "/dashboard/hotel",     iconKey: "Building",   group: "التخصصي" },
      { key: "bookings",  label: "الحجوزات",      href: "/dashboard/bookings",  iconKey: "CalendarCheck", group: "العمليات" },
      { key: "customers", label: "النزلاء",         href: "/dashboard/customers", iconKey: "Users",      group: "العمليات" },
      { key: "finance",   label: "المالية",          href: "/dashboard/finance",   iconKey: "Wallet",     group: "الإدارة" },
      { key: "team",      label: "الفريق",           href: "/dashboard/team",      iconKey: "UsersRound", group: "الإدارة" },
      { key: "reports",   label: "التقارير",         href: "/dashboard/reports",   iconKey: "BarChart3",  group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: {
      required: ["name", "price"],
      optional: ["description", "image", "maxCapacity", "amenities", "isActive"],
      hidden: ["duration", "stockQuantity", "sku", "vehicleType"],
    },
    settingsFields: { show: ["branchName", "city", "phone", "hotelSettings"], hide: ["menuSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",      size: "third" },
      { id: "kpi_bookings",    label: "الحجوزات اليوم", size: "third" },
      { id: "kpi_customers",   label: "النزلاء",          size: "third" },
      { id: "recent_bookings", label: "آخر الحجوزات",  size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "car_rental",
    label: "تأجير سيارات",
    icon: "Car",
    description: "تأجير سيارات يومي / طويل الأمد",
    terminology: {
      items: "السيارات", item: "سيارة", addItem: "إضافة سيارة", editItem: "تعديل السيارة",
      deleteItem: "حذف السيارة", itemPrice: "سعر اليوم", itemDuration: "فترة التأجير",
      itemEmpty: "لا توجد سيارات بعد", categories: "أنواع السيارات", category: "فئة",
      addCategory: "إضافة فئة", catalog: "السيارات المتاحة", catalogEmpty: "أضف سياراتك للتأجير",
      topItems: "أكثر السيارات تأجيراً",
      booking: "عقد تأجير", bookings: "عقود التأجير", addBooking: "عقد جديد", newBooking: "عقد جديد",
      bookingEmpty: "لا توجد عقود بعد",
      client: "مستأجر", clients: "المستأجرون", newClient: "مستأجر جديد", clientEmpty: "لا يوجد مستأجرون بعد",
      dashboard: "الرئيسية", revenue: "إيرادات التأجير", schedule: "جدول التأجير",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط حجز السيارات",
      loginTitle: "مرحباً بعودتك",
      newItem: "سيارة جديدة",
      onboardingAddItems: "أضف سيارات الأسطول",
      onboardingAddData: "أضف بيانات شركة التأجير",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول حجز",
      onboardingFirstBookingDesc: "أنشئ عقداً يدوياً أو شارك رابط الحجز مع العملاء",
      searchBookingPlaceholder: "بحث برقم الحجز أو اسم العميل...",
      kpiTodayBookings: "حجوزات اليوم",
      kpiTodayBookingUnit: "حجز",
      topItemsTitle: "أبرز السيارات",
      recentBookingsTitle: "آخر الحجوزات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "car_rental", label: "تأجير السيارات", href: "/dashboard/car-rental", iconKey: "Truck",         group: "التخصصي" },
      { key: "bookings",   label: "العقود",           href: "/dashboard/bookings",   iconKey: "CalendarCheck", group: "العمليات" },
      { key: "customers",  label: "المستأجرون",         href: "/dashboard/customers",  iconKey: "Users",         group: "العمليات" },
      { key: "finance",    label: "المالية",             href: "/dashboard/finance",    iconKey: "Wallet",        group: "الإدارة" },
      { key: "reports",    label: "التقارير",            href: "/dashboard/reports",    iconKey: "BarChart3",     group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: {
      required: ["name", "price"],
      optional: ["description", "image", "vehicleType", "plateNumber", "year", "color", "isActive"],
      hidden: ["duration", "stockQuantity", "roomType"],
    },
    settingsFields: { show: ["branchName", "city", "phone", "rentalSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "إيرادات التأجير", size: "third" },
      { id: "kpi_bookings",    label: "العقود النشطة",   size: "third" },
      { id: "kpi_customers",   label: "المستأجرون",       size: "third" },
      { id: "recent_bookings", label: "آخر العقود",      size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "rental",
    label: "تأجير معدات",
    icon: "Package",
    description: "تأجير معدات وأصول",
    terminology: {
      items: "الأصول والمعدات", item: "أصل", addItem: "إضافة أصل", editItem: "تعديل الأصل",
      deleteItem: "حذف الأصل", itemPrice: "سعر التأجير", itemDuration: "فترة التأجير",
      itemEmpty: "لا توجد أصول للتأجير بعد", categories: "أنواع الأصول", category: "نوع",
      addCategory: "إضافة نوع", catalog: "الأصول المتاحة", catalogEmpty: "أضف الأصول المتاحة للتأجير",
      topItems: "أكثر الأصول تأجيراً",
      booking: "عقد تأجير", bookings: "العقود", addBooking: "عقد جديد", newBooking: "عقد جديد",
      bookingEmpty: "لا توجد عقود بعد",
      client: "مستأجر", clients: "المستأجرون", newClient: "مستأجر جديد", clientEmpty: "لا يوجد مستأجرون بعد",
      dashboard: "الرئيسية", revenue: "إيرادات التأجير", schedule: "جدول التأجير",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط حجز المعدات",
      loginTitle: "مرحباً بعودتك",
      newItem: "أصل جديد",
      onboardingAddItems: "أضف أصولك وأصنافها",
      onboardingAddData: "أضف بيانات المنشأة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول عقد",
      onboardingFirstBookingDesc: "أنشئ عقداً يدوياً أو شارك رابط الحجز مع العملاء",
      searchBookingPlaceholder: "بحث برقم العقد أو اسم العميل...",
      kpiTodayBookings: "عقود اليوم",
      kpiTodayBookingUnit: "عقد",
      topItemsTitle: "أبرز الأصول",
      recentBookingsTitle: "آخر العقود",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",    label: "العقود",          href: "/dashboard/bookings",    iconKey: "CalendarCheck", group: "العمليات" },
      { key: "customers",   label: "المستأجرون",       href: "/dashboard/customers",   iconKey: "Users",         group: "العمليات" },
      { key: "assets",      label: "الأصول",            href: "/dashboard/assets",      iconKey: "Key",           group: "التخصصي" },
      { key: "contracts",   label: "العقود",            href: "/dashboard/contracts",   iconKey: "Layers",        group: "التخصصي" },
      { key: "inspections", label: "التفتيش",           href: "/dashboard/inspections", iconKey: "Package",       group: "التخصصي" },
      { key: "maintenance", label: "الصيانة",           href: "/dashboard/maintenance", iconKey: "Wrench",        group: "التخصصي" },
      { key: "finance",     label: "المالية",            href: "/dashboard/finance",     iconKey: "Wallet",        group: "الإدارة" },
      { key: "reports",     label: "التقارير",           href: "/dashboard/reports",     iconKey: "BarChart3",     group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: {
      required: ["name", "price"],
      optional: ["description", "image", "serialNumber", "condition", "isActive"],
      hidden: ["duration", "vehicleType", "roomType"],
    },
    settingsFields: { show: ["branchName", "city", "phone", "rentalSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "العقود النشطة", size: "third" },
      { id: "kpi_customers",   label: "المستأجرون",    size: "third" },
      { id: "recent_bookings", label: "آخر العقود",   size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  // ══════════════════════════════════════════════
  // ─── الفعاليات والتصوير ──────────────────────
  // ══════════════════════════════════════════════

  {
    key: "events",
    label: "فعاليات",
    icon: "PartyPopper",
    description: "تنظيم الفعاليات والمناسبات",
    terminology: {
      items: "الباقات", item: "باقة", addItem: "إضافة باقة", editItem: "تعديل الباقة",
      deleteItem: "حذف الباقة", itemPrice: "سعر الباقة", itemDuration: "مدة الفعالية",
      itemEmpty: "لا توجد باقات بعد", categories: "أنواع الفعاليات", category: "نوع",
      addCategory: "إضافة نوع", catalog: "باقات الفعاليات", catalogEmpty: "أضف باقات فعالياتك",
      topItems: "أكثر الباقات طلباً",
      booking: "حجز فعالية", bookings: "الحجوزات", addBooking: "حجز جديد", newBooking: "حجز جديد",
      bookingEmpty: "لا توجد حجوزات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول الفعاليات",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط حجز الفعاليات",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف خدمات الفعاليات",
      onboardingAddData: "أضف بيانات شركة الفعاليات",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول حجز",
      onboardingFirstBookingDesc: "أنشئ حجزاً يدوياً أو شارك رابط الفعاليات مع العملاء",
      searchBookingPlaceholder: "بحث برقم الحجز أو اسم العميل...",
      kpiTodayBookings: "حجوزات اليوم",
      kpiTodayBookingUnit: "حجز",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الحجوزات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",  label: "الحجوزات",      href: "/dashboard/bookings",  iconKey: "CalendarCheck", group: "العمليات" },
      { key: "events",    label: "الفعاليات",       href: "/dashboard/events",    iconKey: "PartyPopper",   group: "التخصصي" },
      { key: "packages",  label: "الباقات",         href: "/dashboard/packages",  iconKey: "Box",           group: "التخصصي" },
      { key: "customers", label: "العملاء",          href: "/dashboard/customers", iconKey: "Users",         group: "العمليات" },
      { key: "finance",   label: "المالية",           href: "/dashboard/finance",   iconKey: "Wallet",        group: "الإدارة" },
      { key: "reports",   label: "التقارير",          href: "/dashboard/reports",   iconKey: "BarChart3",     group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "الفعاليات",     size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر الحجوزات", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "event_organizer",
    label: "تنظيم مناسبات",
    icon: "Calendar",
    description: "تنظيم مناسبات وحفلات",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "مدة المناسبة",
      itemEmpty: "لا توجد خدمات بعد", categories: "أنواع المناسبات", category: "نوع",
      addCategory: "إضافة نوع", catalog: "خدمات المناسبات", catalogEmpty: "أضف خدمات التنظيم",
      topItems: "أكثر الخدمات طلباً",
      booking: "حجز مناسبة", bookings: "الحجوزات", addBooking: "حجز جديد", newBooking: "حجز جديد",
      bookingEmpty: "لا توجد حجوزات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول المناسبات",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط حجز المناسبات",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف خدمات التنظيم",
      onboardingAddData: "أضف بيانات شركة التنظيم",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول حجز",
      onboardingFirstBookingDesc: "أنشئ حجزاً يدوياً أو شارك رابط الحجوزات مع العملاء",
      searchBookingPlaceholder: "بحث برقم الحجز أو اسم العميل...",
      kpiTodayBookings: "حجوزات اليوم",
      kpiTodayBookingUnit: "حجز",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الحجوزات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",  label: "الحجوزات",    href: "/dashboard/bookings",  iconKey: "CalendarCheck", group: "العمليات" },
      { key: "events",    label: "المناسبات",     href: "/dashboard/events",    iconKey: "PartyPopper",   group: "التخصصي" },
      { key: "packages",  label: "الباقات",       href: "/dashboard/packages",  iconKey: "Box",           group: "التخصصي" },
      { key: "customers", label: "العملاء",        href: "/dashboard/customers", iconKey: "Users",         group: "العمليات" },
      { key: "catalog",   label: "الخدمات",        href: "/dashboard/catalog",   iconKey: "Layers",        group: "الإدارة" },
      { key: "finance",   label: "المالية",         href: "/dashboard/finance",   iconKey: "Wallet",        group: "الإدارة" },
      { key: "reports",   label: "التقارير",        href: "/dashboard/reports",   iconKey: "BarChart3",     group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "الحجوزات",      size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر الحجوزات", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "photography",
    label: "تصوير",
    icon: "Camera",
    description: "استوديو تصوير وخدمات بصرية",
    terminology: {
      items: "خدمات التصوير", item: "جلسة", addItem: "إضافة جلسة", editItem: "تعديل الجلسة",
      deleteItem: "حذف الجلسة", itemPrice: "سعر الجلسة", itemDuration: "مدة الجلسة",
      itemEmpty: "لا توجد جلسات بعد", categories: "أنواع التصوير", category: "نوع",
      addCategory: "إضافة نوع", catalog: "خدمات التصوير", catalogEmpty: "أضف خدمات التصوير",
      topItems: "أكثر الجلسات طلباً",
      booking: "جلسة", bookings: "الجلسات", addBooking: "جلسة جديدة", newBooking: "جلسة جديدة",
      bookingEmpty: "لا توجد جلسات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول الجلسات",
      publicPage: "صفحة الحجز", publicPageDesc: "شارك رابط حجز الجلسات",
      loginTitle: "مرحباً بعودتك",
      newItem: "جلسة جديدة",
      onboardingAddItems: "أضف خدمات التصوير",
      onboardingAddData: "أضف بيانات الاستوديو",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف مصوراً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول حجز",
      onboardingFirstBookingDesc: "أنشئ حجزاً يدوياً أو شارك رابط الحجز مع العملاء",
      searchBookingPlaceholder: "بحث برقم الحجز أو اسم العميل...",
      kpiTodayBookings: "حجوزات اليوم",
      kpiTodayBookingUnit: "حجز",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الحجوزات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",  label: "الجلسات",       href: "/dashboard/bookings",  iconKey: "CalendarCheck", group: "العمليات" },
      { key: "customers", label: "العملاء",         href: "/dashboard/customers", iconKey: "Users",         group: "العمليات" },
      { key: "catalog",   label: "خدمات التصوير",  href: "/dashboard/catalog",   iconKey: "Layers",        group: "الإدارة" },
      { key: "media",     label: "مكتبة الوسائط",  href: "/dashboard/media",     iconKey: "Camera",        group: "التخصصي" },
      { key: "galleries", label: "معارض العملاء",  href: "/dashboard/galleries", iconKey: "Images",        group: "التخصصي" },
      { key: "finance",   label: "المالية",          href: "/dashboard/finance",   iconKey: "Wallet",        group: "الإدارة" },
      { key: "reports",   label: "التقارير",         href: "/dashboard/reports",   iconKey: "BarChart3",     group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "الجلسات",       size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر الجلسات", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  // ══════════════════════════════════════════════
  // ─── الخدمات الميدانية ───────────────────────
  // ══════════════════════════════════════════════

  {
    key: "maintenance",
    label: "صيانة",
    icon: "Wrench",
    description: "خدمات صيانة وإصلاح",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "الوقت المقدر",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "خدمات الصيانة", catalogEmpty: "أضف خدمات الصيانة",
      topItems: "أكثر الخدمات طلباً",
      booking: "طلب صيانة", bookings: "طلبات الصيانة", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول الأعمال",
      publicPage: "صفحة الطلب", publicPageDesc: "شارك رابط طلب الصيانة",
      loginTitle: "مرحباً بعودتك",
      newItem: "طلب جديد",
      onboardingAddItems: "أضف خدمات الصيانة",
      onboardingAddData: "أضف بيانات المنشأة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف فنياً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلب صيانة يدوياً أو شارك رابط الطلبات",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",    label: "طلبات الصيانة", href: "/dashboard/bookings",    iconKey: "CalendarCheck", group: "العمليات" },
      { key: "work_orders", label: "أوامر العمل",   href: "/dashboard/work-orders", iconKey: "ClipboardCheck", group: "التخصصي" },
      { key: "customers",   label: "العملاء",         href: "/dashboard/customers",   iconKey: "Users",          group: "العمليات" },
      { key: "catalog",     label: "الخدمات",         href: "/dashboard/catalog",     iconKey: "Layers",         group: "الإدارة" },
      { key: "team",        label: "الفريق",           href: "/dashboard/team",        iconKey: "UsersRound",     group: "الإدارة" },
      { key: "finance",     label: "المالية",           href: "/dashboard/finance",     iconKey: "Wallet",         group: "الإدارة" },
      { key: "reports",     label: "التقارير",          href: "/dashboard/reports",     iconKey: "BarChart3",      group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",         size: "third" },
      { id: "kpi_bookings",    label: "طلبات الصيانة",    size: "third" },
      { id: "kpi_customers",   label: "العملاء",             size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات",      size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "workshop",
    label: "ورشة",
    icon: "Hammer",
    description: "ورشة تصنيع أو إصلاح",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "الوقت المقدر",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "خدمات الورشة", catalogEmpty: "أضف خدمات الورشة",
      topItems: "أكثر الخدمات طلباً",
      booking: "طلب عمل", bookings: "طلبات العمل", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول الأعمال",
      publicPage: "صفحة الطلب", publicPageDesc: "شارك رابط طلب الخدمة",
      loginTitle: "مرحباً بعودتك",
      newItem: "طلب جديد",
      onboardingAddItems: "أضف خدمات الورشة",
      onboardingAddData: "أضف بيانات الورشة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف فنياً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط الطلبات",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",    label: "الطلبات",     href: "/dashboard/bookings",    iconKey: "CalendarCheck",  group: "العمليات" },
      { key: "work_orders", label: "أوامر العمل", href: "/dashboard/work-orders", iconKey: "ClipboardCheck", group: "التخصصي" },
      { key: "customers",   label: "العملاء",      href: "/dashboard/customers",   iconKey: "Users",          group: "العمليات" },
      { key: "catalog",     label: "الخدمات",      href: "/dashboard/catalog",     iconKey: "Layers",         group: "الإدارة" },
      { key: "inventory",   label: "المخزون",      href: "/dashboard/inventory",   iconKey: "Box",            group: "الإدارة" },
      { key: "finance",     label: "المالية",       href: "/dashboard/finance",     iconKey: "Wallet",         group: "الإدارة" },
      { key: "reports",     label: "التقارير",      href: "/dashboard/reports",     iconKey: "BarChart3",      group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "الطلبات",       size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "laundry",
    label: "مغسلة",
    icon: "Shirt",
    description: "خدمات غسيل وكوي ملابس",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "وقت التسليم",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "خدمات المغسلة", catalogEmpty: "أضف خدمات الغسيل",
      topItems: "أكثر الخدمات طلباً",
      booking: "طلب", bookings: "الطلبات", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول",
      publicPage: "صفحة الطلب", publicPageDesc: "شارك رابط طلب الخدمة",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف خدمات المغسلة",
      onboardingAddData: "أضف بيانات المغسلة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط الاستلام",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",    label: "الطلبات",     href: "/dashboard/bookings",    iconKey: "Package",        group: "العمليات" },
      { key: "work_orders", label: "أوامر العمل", href: "/dashboard/work-orders", iconKey: "ClipboardCheck", group: "التخصصي" },
      { key: "customers",   label: "العملاء",      href: "/dashboard/customers",   iconKey: "Users",          group: "العمليات" },
      { key: "catalog",     label: "الخدمات",      href: "/dashboard/catalog",     iconKey: "Layers",         group: "الإدارة" },
      { key: "finance",     label: "المالية",       href: "/dashboard/finance",     iconKey: "Wallet",         group: "الإدارة" },
      { key: "reports",     label: "التقارير",      href: "/dashboard/reports",     iconKey: "BarChart3",      group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "الطلبات",       size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "printing",
    label: "طباعة",
    icon: "Printer",
    description: "خدمات طباعة وتصميم",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "وقت التسليم",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "خدمات الطباعة", catalogEmpty: "أضف خدمات الطباعة",
      topItems: "أكثر الخدمات طلباً",
      booking: "طلب", bookings: "الطلبات", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول",
      publicPage: "صفحة الطلب", publicPageDesc: "شارك رابط الطلبات",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف خدمات الطباعة",
      onboardingAddData: "أضف بيانات المطبعة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلب طباعة يدوياً أو شارك رابط الطلب",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",    label: "الطلبات",     href: "/dashboard/bookings",    iconKey: "Package",        group: "العمليات" },
      { key: "work_orders", label: "أوامر العمل", href: "/dashboard/work-orders", iconKey: "ClipboardCheck", group: "التخصصي" },
      { key: "customers",   label: "العملاء",      href: "/dashboard/customers",   iconKey: "Users",          group: "العمليات" },
      { key: "catalog",     label: "الخدمات",      href: "/dashboard/catalog",     iconKey: "Layers",         group: "الإدارة" },
      { key: "finance",     label: "المالية",       href: "/dashboard/finance",     iconKey: "Wallet",         group: "الإدارة" },
      { key: "reports",     label: "التقارير",      href: "/dashboard/reports",     iconKey: "BarChart3",      group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "الطلبات",       size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "logistics",
    label: "لوجستيات",
    icon: "Truck",
    description: "نقل وتوصيل وتخزين",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "الوقت المقدر",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "الخدمات اللوجستية", catalogEmpty: "أضف خدماتك اللوجستية",
      topItems: "أكثر الخدمات طلباً",
      booking: "طلب توصيل", bookings: "الطلبات", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول التوصيل",
      publicPage: "صفحة الطلب", publicPageDesc: "شارك رابط الطلبات",
      loginTitle: "مرحباً بعودتك",
      newItem: "طلب جديد",
      onboardingAddItems: "أضف خدمات الشحن",
      onboardingAddData: "أضف بيانات الشركة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف سائقاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلب شحن يدوياً أو شارك رابط الطلبات",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",    label: "طلبات التوصيل", href: "/dashboard/bookings",    iconKey: "Package",        group: "العمليات" },
      { key: "work_orders", label: "أوامر العمل",   href: "/dashboard/work-orders", iconKey: "ClipboardCheck", group: "التخصصي" },
      { key: "customers",   label: "العملاء",         href: "/dashboard/customers",   iconKey: "Users",          group: "العمليات" },
      { key: "finance",     label: "المالية",          href: "/dashboard/finance",     iconKey: "Wallet",         group: "الإدارة" },
      { key: "reports",     label: "التقارير",         href: "/dashboard/reports",     iconKey: "BarChart3",      group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",          size: "third" },
      { id: "kpi_bookings",    label: "طلبات التوصيل",    size: "third" },
      { id: "kpi_customers",   label: "العملاء",             size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات",      size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "construction",
    label: "مقاولات",
    icon: "HardHat",
    description: "مقاولات وبناء",
    terminology: {
      items: "الخدمات", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "الوقت المقدر",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "خدمات المقاولات", catalogEmpty: "أضف خدمات المقاولات",
      topItems: "أكثر الخدمات طلباً",
      booking: "مشروع", bookings: "المشاريع", addBooking: "مشروع جديد", newBooking: "مشروع جديد",
      bookingEmpty: "لا توجد مشاريع بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول المشاريع",
      publicPage: "صفحة التواصل", publicPageDesc: "شارك رابط التواصل مع عملائك",
      loginTitle: "مرحباً بعودتك",
      newItem: "مشروع جديد",
      onboardingAddItems: "أضف خدمات المقاولات",
      onboardingAddData: "أضف بيانات الشركة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو تواصل مع العميل",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "bookings",    label: "المشاريع",     href: "/dashboard/bookings",    iconKey: "CalendarCheck",  group: "العمليات" },
      { key: "work_orders", label: "أوامر العمل", href: "/dashboard/work-orders", iconKey: "ClipboardCheck", group: "التخصصي" },
      { key: "customers",   label: "العملاء",       href: "/dashboard/customers",   iconKey: "Users",          group: "العمليات" },
      { key: "finance",     label: "المالية",        href: "/dashboard/finance",     iconKey: "Wallet",         group: "الإدارة" },
      { key: "reports",     label: "التقارير",       href: "/dashboard/reports",     iconKey: "BarChart3",      group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "city", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "المشاريع",      size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر المشاريع", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  // ══════════════════════════════════════════════
  // ─── التقنية والرقمية ────────────────────────
  // ══════════════════════════════════════════════

  {
    key: "digital_services",
    label: "خدمات رقمية",
    icon: "Monitor",
    description: "خدمات رقمية ومحتوى",
    terminology: {
      items: "الخدمات الرقمية", item: "خدمة", addItem: "إضافة خدمة", editItem: "تعديل الخدمة",
      deleteItem: "حذف الخدمة", itemPrice: "سعر الخدمة", itemDuration: "وقت التسليم",
      itemEmpty: "لا توجد خدمات بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "الخدمات الرقمية", catalogEmpty: "أضف خدماتك الرقمية",
      topItems: "أكثر الخدمات طلباً",
      booking: "طلب", bookings: "الطلبات", addBooking: "طلب جديد", newBooking: "طلب جديد",
      bookingEmpty: "لا توجد طلبات بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "الجدول",
      publicPage: "صفحة الخدمات", publicPageDesc: "شارك رابط خدماتك الرقمية",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف خدماتك الرقمية",
      onboardingAddData: "أضف بيانات شركتك",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط الطلب مع العملاء",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      ...SHARED_OPERATIONS,
      ...SHARED_MANAGEMENT,
      ...SHARED_GROWTH,
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "الطلبات",       size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر الطلبات", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  {
    key: "technology",
    label: "تقنية",
    icon: "Cpu",
    description: "شركة تقنية وبرمجة",
    terminology: {
      items: "الحلول التقنية", item: "حل", addItem: "إضافة حل", editItem: "تعديل الحل",
      deleteItem: "حذف الحل", itemPrice: "سعر الحل", itemDuration: "وقت التنفيذ",
      itemEmpty: "لا توجد حلول بعد", categories: "التصنيفات", category: "تصنيف",
      addCategory: "إضافة تصنيف", catalog: "الحلول التقنية", catalogEmpty: "أضف حلولك التقنية",
      topItems: "أكثر الحلول طلباً",
      booking: "مشروع", bookings: "المشاريع", addBooking: "مشروع جديد", newBooking: "مشروع جديد",
      bookingEmpty: "لا توجد مشاريع بعد",
      client: "عميل", clients: "العملاء", newClient: "عميل جديد", clientEmpty: "لا يوجد عملاء بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول المشاريع",
      publicPage: "صفحة التواصل", publicPageDesc: "شارك رابط التواصل",
      loginTitle: "مرحباً بعودتك",
      newItem: "خدمة جديدة",
      onboardingAddItems: "أضف خدمات التقنية",
      onboardingAddData: "أضف بيانات الشركة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول طلب",
      onboardingFirstBookingDesc: "أنشئ طلباً يدوياً أو شارك رابط الطلب مع العملاء",
      searchBookingPlaceholder: "بحث برقم الطلب أو اسم العميل...",
      kpiTodayBookings: "طلبات اليوم",
      kpiTodayBookingUnit: "طلب",
      topItemsTitle: "أبرز الخدمات",
      recentBookingsTitle: "آخر الطلبات",
    },
    sidebar: [
      HOME_ITEM,
      ...SHARED_OPERATIONS,
      ...SHARED_MANAGEMENT,
      ...SHARED_GROWTH,
      SETTINGS_ITEM,
    ],
    itemFields: SERVICE_FIELDS,
    settingsFields: { show: ["branchName", "phone", "bookingSettings"], hide: ["menuSettings", "hotelSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",    size: "third" },
      { id: "kpi_bookings",    label: "المشاريع",      size: "third" },
      { id: "kpi_customers",   label: "العملاء",        size: "third" },
      { id: "recent_bookings", label: "آخر المشاريع", size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },

  // ══════════════════════════════════════════════
  // ─── التعليم ──────────────────────────────────
  // ══════════════════════════════════════════════

  {
    key: "school",
    label: "مدرسة",
    icon: "GraduationCap",
    description: "مدرسة وتعليم",
    terminology: {
      items: "المواد الدراسية", item: "مادة", addItem: "إضافة مادة", editItem: "تعديل المادة",
      deleteItem: "حذف المادة", itemPrice: "الرسوم", itemDuration: "مدة الحصة",
      itemEmpty: "لا توجد مواد بعد", categories: "الفصول الدراسية", category: "فصل",
      addCategory: "إضافة فصل", catalog: "المواد الدراسية", catalogEmpty: "أضف المواد الدراسية",
      topItems: "المواد الأكثر متابعة",
      booking: "تسجيل", bookings: "التسجيلات", addBooking: "تسجيل جديد", newBooking: "تسجيل جديد",
      bookingEmpty: "لا توجد تسجيلات بعد",
      client: "طالب", clients: "الطلاب", newClient: "طالب جديد", clientEmpty: "لا يوجد طلاب بعد",
      dashboard: "لوحة التحكم", revenue: "الرسوم الدراسية", schedule: "الجدول الدراسي",
      publicPage: "صفحة المدرسة", publicPageDesc: "رابط صفحة المدرسة",
      loginTitle: "مرحباً بعودتك",
      newItem: "برنامج جديد",
      onboardingAddItems: "أضف المواد والبرامج",
      onboardingAddData: "أضف بيانات المدرسة",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف معلماً للفريق",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول تسجيل",
      onboardingFirstBookingDesc: "أنشئ تسجيلاً يدوياً أو شارك رابط التسجيل",
      searchBookingPlaceholder: "بحث برقم التسجيل أو اسم الطالب...",
      kpiTodayBookings: "تسجيلات اليوم",
      kpiTodayBookingUnit: "تسجيل",
      topItemsTitle: "أبرز البرامج",
      recentBookingsTitle: "آخر التسجيلات",
    },
    sidebar: [
      HOME_ITEM,
      { key: "school_day",      label: "مراقب اليوم",       href: "/dashboard/school/day-monitor",        iconKey: "ClipboardCheck",  group: "التخصصي" },
      { key: "school_students", label: "الطلاب",              href: "/dashboard/school/students",           iconKey: "Users",           group: "التخصصي" },
      { key: "school_classes",  label: "الفصول",              href: "/dashboard/school/classes",            iconKey: "GraduationCap",   group: "التخصصي" },
      { key: "school_attend",   label: "الحضور والغياب",     href: "/dashboard/school/attendance",         iconKey: "UserCheck",       group: "التخصصي" },
      { key: "school_teachers", label: "المعلمون",             href: "/dashboard/school/teachers",           iconKey: "UsersRound",      group: "التخصصي" },
      { key: "school_cases",    label: "الحالات والمتابعة",  href: "/dashboard/school/cases",              iconKey: "AlertCircle",     group: "التخصصي" },
      { key: "school_subjects", label: "المواد الدراسية",    href: "/dashboard/school/subjects",           iconKey: "BookOpen",        group: "التخصصي" },
      { key: "school_settings", label: "إعدادات المدرسة",   href: "/dashboard/school/account",            iconKey: "Settings",        group: "الإعدادات" },
    ],
    itemFields: {
      required: ["name"],
      optional: ["description", "duration", "teacherId", "isActive"],
      hidden: ["price", "stockQuantity", "vehicleType", "roomType"],
    },
    settingsFields: { show: ["schoolSettings", "academicYear"], hide: ["menuSettings", "hotelSettings", "bookingSettings"] },
    dashboardWidgets: [
      { id: "kpi_students",    label: "الطلاب",              size: "third" },
      { id: "kpi_attendance",  label: "نسبة الحضور اليوم",  size: "third" },
      { id: "kpi_cases",       label: "الحالات المفتوحة",   size: "third" },
      { id: "recent_bookings", label: "آخر التسجيلات",     size: "full" },
    ],
    guardianChecks: ["TENANT-001", "AUTH-001"],
  },

  // ══════════════════════════════════════════════
  // ─── العقارات ─────────────────────────────────
  // ══════════════════════════════════════════════

  {
    key: "real_estate",
    label: "عقارات",
    icon: "Building2",
    description: "إدارة عقارات وتأجير وبيع",
    terminology: {
      items: "الوحدات العقارية", item: "وحدة", addItem: "إضافة وحدة", editItem: "تعديل الوحدة",
      deleteItem: "حذف الوحدة", itemPrice: "سعر الإيجار", itemDuration: "فترة العقد",
      itemEmpty: "لا توجد وحدات بعد", categories: "العقارات", category: "عقار",
      addCategory: "إضافة عقار", catalog: "الوحدات المتاحة", catalogEmpty: "أضف وحداتك العقارية",
      topItems: "الوحدات الأكثر طلباً",
      booking: "عقد إيجار", bookings: "عقود الإيجار", addBooking: "عقد جديد", newBooking: "عقد جديد",
      bookingEmpty: "لا توجد عقود بعد",
      client: "مستأجر", clients: "المستأجرون", newClient: "مستأجر جديد", clientEmpty: "لا يوجد مستأجرون بعد",
      dashboard: "الرئيسية", revenue: "الإيرادات", schedule: "جدول العقود",
      publicPage: "بوابة العقارات", publicPageDesc: "شارك رابط الوحدات المتاحة",
      loginTitle: "مرحباً بعودتك",
      newItem: "عقار جديد",
      onboardingAddItems: "أضف العقارات والوحدات",
      onboardingAddData: "أضف بيانات شركة العقارات",
      onboardingAddDataDesc: "الاسم والمدينة يظهران للعملاء في صفحة الطلب",
      onboardingAddStaff: "أضف موظفاً لفريقك",
      onboardingAddStaffDesc: "يتمكن الموظف من تسجيل الدخول وإدارة الحجوزات",
      onboardingFirstBooking: "استقبل أول عقد",
      onboardingFirstBookingDesc: "أنشئ عقد إيجار يدوياً أو تواصل مع المستأجر",
      searchBookingPlaceholder: "بحث برقم العقد أو اسم المستأجر...",
      kpiTodayBookings: "عقود اليوم",
      kpiTodayBookingUnit: "عقد",
      topItemsTitle: "أبرز العقارات",
      recentBookingsTitle: "آخر العقود",
    },
    sidebar: [
      HOME_ITEM,
      { key: "property",      label: "لوحة العقارات",  href: "/dashboard/property",              iconKey: "Building",     group: "التخصصي" },
      { key: "properties",    label: "العقارات",         href: "/dashboard/property/properties",   iconKey: "Building2",    group: "التخصصي" },
      { key: "units",         label: "الوحدات",          href: "/dashboard/property/units",        iconKey: "DoorOpen",     group: "التخصصي" },
      { key: "tenants",       label: "المستأجرون",        href: "/dashboard/property/tenants",      iconKey: "Users",        group: "التخصصي" },
      { key: "contracts",     label: "العقود",            href: "/dashboard/property/contracts",    iconKey: "FileText",     group: "التخصصي" },
      { key: "prop_invoices", label: "الفواتير",          href: "/dashboard/property/invoices",     iconKey: "Receipt",      group: "التخصصي" },
      { key: "prop_payments", label: "المدفوعات",         href: "/dashboard/property/payments",     iconKey: "Banknote",     group: "التخصصي" },
      { key: "prop_maintain", label: "الصيانة",           href: "/dashboard/property/maintenance",  iconKey: "Wrench",       group: "التخصصي" },
      { key: "prop_reports",  label: "التقارير",          href: "/dashboard/property/reports",      iconKey: "BarChart3",    group: "النمو" },
      SETTINGS_ITEM,
    ],
    itemFields: {
      required: ["name", "price"],
      optional: ["description", "image", "area", "bedrooms", "bathrooms", "amenities", "isActive"],
      hidden: ["duration", "stockQuantity", "vehicleType"],
    },
    settingsFields: { show: ["branchName", "city", "phone"], hide: ["menuSettings", "hotelSettings", "bookingSettings"] },
    dashboardWidgets: [
      { id: "kpi_revenue",     label: "الإيرادات",       size: "third" },
      { id: "kpi_bookings",    label: "العقود النشطة",   size: "third" },
      { id: "kpi_customers",   label: "المستأجرون",       size: "third" },
      { id: "recent_bookings", label: "آخر العقود",     size: "full" },
    ],
    guardianChecks: COMMON_GUARDIAN,
  },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const _registryMap: Map<string, BusinessConfig> = new Map(
  REGISTRY.map((r) => [r.key, r]),
);

const DEFAULT_CONFIG: BusinessConfig = REGISTRY.find((r) => r.key === "general")!;

/**
 * جلب إعدادات نوع النشاط الكاملة.
 * إذا لم يُعثر على النوع → يُرجع "general" كافتراضي.
 */
export function getBusinessConfig(type: string): BusinessConfig {
  return _registryMap.get(type) ?? DEFAULT_CONFIG;
}

/**
 * جلب عناصر الـ sidebar لنوع معيّن.
 */
export function getSidebar(type: string): SidebarItem[] {
  return getBusinessConfig(type).sidebar;
}

/**
 * جلب مصطلح واحد لنوع معيّن.
 * المفتاح هو اسم الخاصية في BusinessTerminology.
 */
export function getTerm(type: string, key: keyof BusinessTerminology): string {
  const config = getBusinessConfig(type);
  return config.terminology[key] ?? (DEFAULT_CONFIG.terminology[key] as string);
}

/**
 * جلب حقول عنصر الكتالوج.
 */
export function getItemFields(type: string): ItemFieldsConfig {
  return getBusinessConfig(type).itemFields;
}

/**
 * جلب حقول الإعدادات.
 */
export function getSettingsFields(type: string): SettingsFieldsConfig {
  return getBusinessConfig(type).settingsFields;
}

/**
 * جلب قائمة ويدجت الداشبورد.
 */
export function getDashboardWidgets(type: string): DashboardWidgetConfig[] {
  return getBusinessConfig(type).dashboardWidgets;
}

/**
 * جلب قائمة فحوصات Guardian للنوع.
 */
export function getGuardianChecks(type: string): string[] {
  return getBusinessConfig(type).guardianChecks;
}

/**
 * التحقق من أن صفحة مسموح بها لنوع معيّن.
 * @param type نوع النشاط
 * @param href المسار مثل "/dashboard/menu"
 */
export function isPageAllowed(type: string, href: string): boolean {
  const sidebar = getSidebar(type);
  return sidebar.some((item) => item.href === href || href.startsWith(item.href + "/"));
}

/**
 * جلب كل أنواع الأنشطة المُسجَّلة.
 */
export function getAllBusinessTypes(): BusinessConfig[] {
  return REGISTRY;
}

/**
 * التحقق من أن نوعاً مُسجَّل في الـ Registry.
 */
export function isKnownBusinessType(type: string): type is BusinessType {
  return _registryMap.has(type);
}
