// ============================================================
// Smart Guardian — Issue Catalog
// كتالوج المشاكل المعرّفة في النظام
// ============================================================

export type IssueSeverity  = "critical" | "high" | "medium" | "low";
export type IssueCategory  = "data_integrity" | "business_logic" | "security" | "performance" | "infrastructure";

export interface IssueDefinition {
  code:            string;
  module:          string;
  severity:        IssueSeverity;
  category:        IssueCategory;
  titleAr:         string;
  descriptionAr:   string;
  isUserFacing:    boolean;
  autoFixable:     boolean;
  fixDescriptionAr?: string;
}

export const ISSUE_CATALOG: Record<string, IssueDefinition> = {

  // ─── MENU ───────────────────────────────────────────────
  "MENU-001": {
    code:            "MENU-001",
    module:          "menu",
    severity:        "high",
    category:        "data_integrity",
    titleAr:         "صنف بدون سعر",
    descriptionAr:   "يوجد صنف في القائمة سعره صفر أو غير محدد — يظهر للعملاء بسعر 0",
    isUserFacing:    true,
    autoFixable:     false,
    fixDescriptionAr: "راجع سعر الصنف وأدخل قيمة صحيحة",
  },
  "MENU-002": {
    code:            "MENU-002",
    module:          "menu",
    severity:        "medium",
    category:        "data_integrity",
    titleAr:         "أصناف مكررة بنفس الاسم",
    descriptionAr:   "يوجد أكثر من صنف بنفس الاسم في القائمة — قد يُربك العملاء",
    isUserFacing:    true,
    autoFixable:     false,
    fixDescriptionAr: "راجع الأصناف المكررة واحذف أو أعد تسمية",
  },
  "MENU-003": {
    code:            "MENU-003",
    module:          "menu",
    severity:        "low",
    category:        "data_integrity",
    titleAr:         "تصنيف بدون أصناف",
    descriptionAr:   "يوجد تصنيف في القائمة لا يحتوي على أي صنف نشط",
    isUserFacing:    false,
    autoFixable:     false,
  },
  "MENU-004": {
    code:            "MENU-004",
    module:          "menu",
    severity:        "medium",
    category:        "data_integrity",
    titleAr:         "صنف بدون تصنيف",
    descriptionAr:   "يوجد صنف في القائمة غير مرتبط بأي تصنيف — لن يظهر في القائمة",
    isUserFacing:    true,
    autoFixable:     false,
  },

  // ─── BOOKING ────────────────────────────────────────────
  "BOOK-001": {
    code:            "BOOK-001",
    module:          "booking",
    severity:        "high",
    category:        "business_logic",
    titleAr:         "حجز عالق في حالة 'قيد الانتظار' لأكثر من 24 ساعة",
    descriptionAr:   "حجز لم يُأكَّد أو يُلغَ منذ أكثر من 24 ساعة — يشغل مكاناً ويربك التقارير",
    isUserFacing:    false,
    autoFixable:     true,
    fixDescriptionAr: "تم إلغاء الحجز العالق تلقائياً وإشعار العميل",
  },
  "BOOK-002": {
    code:            "BOOK-002",
    module:          "booking",
    severity:        "medium",
    category:        "business_logic",
    titleAr:         "حجز مؤكد في تاريخ ماضٍ دون إكمال",
    descriptionAr:   "حجز تاريخه انتهى وحالته لا تزال 'مؤكدة' — لم يُسجَّل حضوره أو غيابه",
    isUserFacing:    false,
    autoFixable:     false,
    fixDescriptionAr: "راجع الحجوزات الماضية وأغلقها يدوياً",
  },
  "BOOK-003": {
    code:            "BOOK-003",
    module:          "booking",
    severity:        "low",
    category:        "data_integrity",
    titleAr:         "حجز بدون بيانات عميل",
    descriptionAr:   "حجز لا يرتبط بأي عميل أو رقم هاتف — لن يُرسَل له تأكيد أو تذكير",
    isUserFacing:    false,
    autoFixable:     false,
  },

  // ─── PAYMENT ────────────────────────────────────────────
  "PAY-001": {
    code:            "PAY-001",
    module:          "payment",
    severity:        "critical",
    category:        "business_logic",
    titleAr:         "دفعة عالقة في حالة 'pending' لأكثر من ساعة",
    descriptionAr:   "دفعة لم تكتمل ولم تُلغَ — قد تكون فشلت وتحتاج مراجعة يدوية",
    isUserFacing:    true,
    autoFixable:     false,
    fixDescriptionAr: "راجع بوابة الدفع وأكد أو ألغِ الدفعة",
  },

  // ─── TENANT ─────────────────────────────────────────────
  "TENANT-001": {
    code:            "TENANT-001",
    module:          "tenant",
    severity:        "high",
    category:        "data_integrity",
    titleAr:         "منشأة بدون مالك نشط",
    descriptionAr:   "لا يوجد مستخدم بدور 'owner' نشط في هذه المنشأة — لا يمكن الوصول للإعدادات الحساسة",
    isUserFacing:    false,
    autoFixable:     false,
  },
  "TENANT-002": {
    code:            "TENANT-002",
    module:          "tenant",
    severity:        "low",
    category:        "business_logic",
    titleAr:         "منشأة فارغة بدون بيانات",
    descriptionAr:   "المنشأة لا تحتوي على أي خدمات أو حجوزات أو عملاء منذ أكثر من 7 أيام من التسجيل",
    isUserFacing:    false,
    autoFixable:     false,
  },
  "TENANT-003": {
    code:            "TENANT-003",
    module:          "tenant",
    severity:        "critical",
    category:        "security",
    titleAr:         "محاولة تسرّب بيانات بين المنشآت",
    descriptionAr:   "كُشف طلب API يحاول الوصول لبيانات منشأة أخرى — قد يكون bug أو محاولة اختراق",
    isUserFacing:    false,
    autoFixable:     false,
  },
  "TENANT-004": {
    code:            "TENANT-004",
    module:          "tenant",
    severity:        "medium",
    category:        "business_logic",
    titleAr:         "منشأة غير نشطة تستهلك حصصاً",
    descriptionAr:   "منشأة حالتها 'suspended' أو 'cancelled' لا تزال تظهر في استعلامات نشطة",
    isUserFacing:    false,
    autoFixable:     false,
  },

  // ─── AUTH ────────────────────────────────────────────────
  "AUTH-001": {
    code:            "AUTH-001",
    module:          "auth",
    severity:        "critical",
    category:        "security",
    titleAr:         "محاولات تسجيل دخول مشبوهة متكررة",
    descriptionAr:   "تم رصد 10+ محاولات OTP فاشلة لنفس الرقم في أقل من 10 دقائق",
    isUserFacing:    false,
    autoFixable:     true,
    fixDescriptionAr: "تم تعطيل محاولات OTP مؤقتاً لهذا الرقم",
  },

  // ─── SYSTEM ─────────────────────────────────────────────
  "SYS-001": {
    code:            "SYS-001",
    module:          "system",
    severity:        "high",
    category:        "performance",
    titleAr:         "استجابة قاعدة البيانات بطيئة",
    descriptionAr:   "متوسط استجابة قاعدة البيانات تجاوز 500ms — يؤثر على تجربة المستخدم",
    isUserFacing:    true,
    autoFixable:     false,
  },
  "SYS-002": {
    code:            "SYS-002",
    module:          "system",
    severity:        "high",
    category:        "infrastructure",
    titleAr:         "استهلاك ذاكرة مرتفع",
    descriptionAr:   "عملية Node.js تستهلك أكثر من 80% من الذاكرة المتاحة",
    isUserFacing:    false,
    autoFixable:     false,
  },
  "SYS-003": {
    code:            "SYS-003",
    module:          "system",
    severity:        "critical",
    category:        "infrastructure",
    titleAr:         "شهادة SSL تقترب من الانتهاء",
    descriptionAr:   "شهادة SSL تنتهي خلال أقل من 14 يوماً — قد يتوقف الموقع",
    isUserFacing:    true,
    autoFixable:     false,
  },
  "SYS-004": {
    code:            "SYS-004",
    module:          "system",
    severity:        "critical",
    category:        "infrastructure",
    titleAr:         "مساحة القرص منخفضة",
    descriptionAr:   "مساحة القرص أقل من 10% — قد تفشل عمليات الكتابة",
    isUserFacing:    false,
    autoFixable:     false,
  },
};

export function getCatalogEntry(code: string): IssueDefinition | null {
  return ISSUE_CATALOG[code] ?? null;
}
