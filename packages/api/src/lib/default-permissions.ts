// ============================================================
// DEFAULT PERMISSIONS — الصلاحيات الافتراضية لكل system role
// ============================================================

export type SystemRole = "owner" | "manager" | "provider" | "employee" | "reception";

export const ALL_PERMISSIONS = [
  "bookings.view", "bookings.create", "bookings.update", "bookings.cancel", "bookings.view_all", "bookings.assign",
  "orders.view", "orders.create", "orders.update", "orders.cancel", "orders.view_all",
  "finance.invoices", "finance.reports", "finance.commissions", "finance.salaries", "finance.expenses", "finance.payment_gateway",
  "team.view", "team.add", "team.remove", "team.edit", "team.schedules", "team.attendance", "team.permissions",
  "products.view", "products.create", "products.update", "products.delete", "products.inventory", "products.pricing",
  "customers.view", "customers.create", "customers.update", "customers.history", "customers.loyalty", "customers.communicate",
  "reports.performance", "reports.sales", "reports.customers", "reports.analytics", "reports.export",
  "settings.org", "settings.branches", "settings.integrations", "settings.billing", "settings.roles",
  "content.website", "content.menu", "content.offers", "content.notifications",
  "delivery.view_own", "delivery.view_all", "delivery.assign", "delivery.manage_zones", "delivery.manage_fees",
  "pos.sell", "pos.refund", "pos.discount", "pos.close_shift", "pos.view_shifts",
  // School module
  "school.students.read", "school.students.write",
  "school.timetable.view", "school.timetable.edit",
  "school.attendance.record", "school.attendance.view_all",
  "school.behavior.view", "school.behavior.write",
  "school.cases.access", "school.cases.manage",
  "school.referrals.create", "school.referrals.manage",
  "school.counseling.access",
  "school.reports.view",
  "school.settings.manage",
  "school.preparations.write",
  "school.daily_logs.write",
] as const;

export const PERMISSION_GROUPS: Record<string, { label: string; permissions: string[] }> = {
  bookings:  { label: "الحجوزات",          permissions: ["bookings.view", "bookings.create", "bookings.update", "bookings.cancel", "bookings.view_all", "bookings.assign"] },
  orders:    { label: "الطلبات",            permissions: ["orders.view", "orders.create", "orders.update", "orders.cancel", "orders.view_all"] },
  finance:   { label: "المالية",            permissions: ["finance.invoices", "finance.reports", "finance.commissions", "finance.salaries", "finance.expenses", "finance.payment_gateway"] },
  team:      { label: "الفريق",             permissions: ["team.view", "team.add", "team.remove", "team.edit", "team.schedules", "team.attendance", "team.permissions"] },
  products:  { label: "المنتجات والخدمات", permissions: ["products.view", "products.create", "products.update", "products.delete", "products.inventory", "products.pricing"] },
  customers: { label: "العملاء",            permissions: ["customers.view", "customers.create", "customers.update", "customers.history", "customers.loyalty", "customers.communicate"] },
  reports:   { label: "التقارير",           permissions: ["reports.performance", "reports.sales", "reports.customers", "reports.analytics", "reports.export"] },
  settings:  { label: "الاعدادات",          permissions: ["settings.org", "settings.branches", "settings.integrations", "settings.billing", "settings.roles"] },
  content:   { label: "المحتوى",            permissions: ["content.website", "content.menu", "content.offers", "content.notifications"] },
  delivery:  { label: "التوصيل",            permissions: ["delivery.view_own", "delivery.view_all", "delivery.assign", "delivery.manage_zones", "delivery.manage_fees"] },
  pos:       { label: "نقطة البيع",         permissions: ["pos.sell", "pos.refund", "pos.discount", "pos.close_shift", "pos.view_shifts"] },
  school:    { label: "المدرسة", permissions: [
    "school.students.read", "school.students.write",
    "school.timetable.view", "school.timetable.edit",
    "school.attendance.record", "school.attendance.view_all",
    "school.behavior.view", "school.behavior.write",
    "school.cases.access", "school.cases.manage",
    "school.referrals.create", "school.referrals.manage",
    "school.counseling.access",
    "school.reports.view",
    "school.settings.manage",
    "school.preparations.write",
    "school.daily_logs.write",
  ]},
};

export const PERMISSION_LABELS: Record<string, string> = {
  "bookings.view": "عرض الحجوزات", "bookings.create": "اضافة حجز", "bookings.update": "تعديل حجز",
  "bookings.cancel": "الغاء حجز", "bookings.view_all": "عرض جميع الحجوزات", "bookings.assign": "تعيين موظف للحجز",
  "orders.view": "عرض الطلبات", "orders.create": "اضافة طلب", "orders.update": "تعديل طلب",
  "orders.cancel": "الغاء طلب", "orders.view_all": "عرض جميع الطلبات",
  "finance.invoices": "الفواتير", "finance.reports": "التقارير المالية", "finance.commissions": "العمولات",
  "finance.salaries": "الرواتب", "finance.expenses": "المصاريف", "finance.payment_gateway": "بوابات الدفع",
  "team.view": "عرض الفريق", "team.add": "اضافة عضو", "team.remove": "حذف عضو", "team.edit": "تعديل عضو",
  "team.schedules": "الجداول", "team.attendance": "الحضور والانصراف", "team.permissions": "ادارة الصلاحيات",
  "products.view": "عرض المنتجات", "products.create": "اضافة منتج", "products.update": "تعديل منتج",
  "products.delete": "حذف منتج", "products.inventory": "المخزون", "products.pricing": "الاسعار",
  "customers.view": "عرض العملاء", "customers.create": "اضافة عميل", "customers.update": "تعديل عميل",
  "customers.history": "سجل العميل", "customers.loyalty": "نقاط الولاء", "customers.communicate": "التواصل مع العملاء",
  "reports.performance": "تقارير الاداء", "reports.sales": "تقارير المبيعات", "reports.customers": "تقارير العملاء",
  "reports.analytics": "التحليلات", "reports.export": "تصدير التقارير",
  "settings.org": "اعدادات المنشأة", "settings.branches": "الفروع", "settings.integrations": "التكاملات",
  "settings.billing": "الاشتراك والفوترة", "settings.roles": "الادوار والصلاحيات",
  "content.website": "الموقع", "content.menu": "القائمة", "content.offers": "العروض", "content.notifications": "الاشعارات",
  "delivery.view_own": "عرض توصيلاتي", "delivery.view_all": "عرض جميع التوصيلات",
  "delivery.assign": "اسناد توصيل", "delivery.manage_zones": "ادارة المناطق", "delivery.manage_fees": "ادارة الرسوم",
  "pos.sell": "البيع", "pos.refund": "الاسترداد", "pos.discount": "الخصومات",
  "pos.close_shift": "اغلاق الوردية", "pos.view_shifts": "عرض الورديات",
  "school.students.read": "عرض الطلاب", "school.students.write": "تعديل بيانات الطلاب",
  "school.timetable.view": "عرض الجدول الدراسي", "school.timetable.edit": "تعديل الجدول الدراسي",
  "school.attendance.record": "تسجيل الحضور", "school.attendance.view_all": "عرض كل الحضور",
  "school.behavior.view": "عرض السلوك والمخالفات", "school.behavior.write": "تسجيل مخالفة",
  "school.cases.access": "الوصول للحالات", "school.cases.manage": "ادارة كل الحالات",
  "school.referrals.create": "احالة طالب", "school.referrals.manage": "ادارة الاحالات",
  "school.counseling.access": "الجلسات الارشادية",
  "school.reports.view": "تقارير المدرسة",
  "school.settings.manage": "اعدادات المدرسة",
  "school.preparations.write": "تحضير الدروس",
  "school.daily_logs.write": "يومية التدريس",
};

export const DEFAULT_PERMISSIONS: Record<SystemRole, string[]> = {
  owner: [...ALL_PERMISSIONS],

  manager: [
    "bookings.view", "bookings.create", "bookings.update", "bookings.cancel", "bookings.view_all", "bookings.assign",
    "orders.view", "orders.create", "orders.update", "orders.cancel", "orders.view_all",
    "finance.invoices", "finance.reports", "finance.commissions", "finance.expenses",
    "team.view", "team.add", "team.edit", "team.schedules", "team.attendance", "team.permissions",
    "products.view", "products.create", "products.update", "products.inventory", "products.pricing",
    "customers.view", "customers.create", "customers.update", "customers.history", "customers.loyalty", "customers.communicate",
    "reports.performance", "reports.sales", "reports.customers", "reports.analytics",
    "content.website", "content.menu", "content.offers", "content.notifications",
    "delivery.view_all", "delivery.assign",
    "pos.sell", "pos.refund", "pos.discount", "pos.close_shift", "pos.view_shifts",
  ],

  provider: [
    "bookings.view",
    "orders.view",
    "finance.commissions",
    "delivery.view_own",
    "pos.sell",
  ],

  employee: [
    "bookings.view",
    "customers.view",
    "pos.sell",
  ],

  reception: [
    "bookings.view", "bookings.create", "bookings.update", "bookings.cancel", "bookings.view_all",
    "customers.view", "customers.create", "customers.update",
    "pos.sell",
  ],
};

/** حسب system_role + overrides من DB */
export function resolvePermissions(
  systemRole: SystemRole,
  overrides: Array<{ permissionKey: string; allowed: boolean }>
): string[] {
  if (systemRole === "owner") return [...ALL_PERMISSIONS];

  const base = new Set(DEFAULT_PERMISSIONS[systemRole] ?? []);
  for (const ov of overrides) {
    if (ov.allowed) base.add(ov.permissionKey);
    else base.delete(ov.permissionKey);
  }
  return Array.from(base);
}
