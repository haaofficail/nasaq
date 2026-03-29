// ============================================================
// نظام السلوك والمواظبة — لائحة وزارة التعليم السعودية
// الإصدار الخامس 1447هـ
// ============================================================

export const BEHAVIOR_SCORE_CONFIG = {
  initialScore:        100,
  positiveBase:         80,   // النقاط الأساسية للسلوك
  distinguishedBonus:   20,   // نقاط التميّز القابلة للإضافة
  attendanceInitial:   100,   // نقاط المواظبة الأولية
  absenceDeduction:      1,   // خصم لكل غياب غير مبرر
  maxAbsenceDeduction:  30,   // الحد الأقصى للخصم من المواظبة
};

// الخصم بحسب درجة المخالفة
export const DEDUCTION_BY_DEGREE: Record<string, number> = {
  "1": 2,
  "2": 5,
  "3": 10,
  "4": 20,
  "5": 30,
};

// ============================================================
// مخالفات المرحلة الابتدائية (4 درجات)
// ============================================================
export const ELEMENTARY_VIOLATIONS = [
  {
    code: "E-01",
    name: "التأخر عن الدراسة",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد",       deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي",         deduction: 5 },
      { degree: "3", action: "الإخطار الكتابي للوالدين", deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر",      deduction: 20 },
    ],
  },
  {
    code: "E-02",
    name: "عدم ارتداء الزي المدرسي",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد",       deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي",         deduction: 5 },
      { degree: "3", action: "الإخطار الكتابي للوالدين", deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر",      deduction: 20 },
    ],
  },
  {
    code: "E-03",
    name: "إهمال الواجبات المدرسية",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد",       deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي",         deduction: 5 },
      { degree: "3", action: "الإخطار الكتابي للوالدين", deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر",      deduction: 20 },
    ],
  },
  {
    code: "E-04",
    name: "الإخلال بالنظام داخل الفصل",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد",       deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي",         deduction: 5 },
      { degree: "3", action: "الإخطار الكتابي للوالدين", deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر",      deduction: 20 },
    ],
  },
  {
    code: "E-05",
    name: "العبث بممتلكات الآخرين",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد",       deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي",         deduction: 5 },
      { degree: "3", action: "الإخطار الكتابي للوالدين", deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر",      deduction: 20 },
    ],
  },
  {
    code: "E-06",
    name: "الغياب غير المبرر",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد",       deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي",         deduction: 5 },
      { degree: "3", action: "الإخطار الكتابي للوالدين", deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر",      deduction: 20 },
    ],
  },
];

// ============================================================
// مخالفات المرحلة المتوسطة والثانوية (5 درجات)
// ============================================================
export const SECONDARY_VIOLATIONS = [
  {
    code: "S-01",
    name: "التأخر عن الدراسة",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-02",
    name: "عدم ارتداء الزي المدرسي",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-03",
    name: "الغياب غير المبرر",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-04",
    name: "الإخلال بالنظام والهدوء",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-05",
    name: "الإساءة اللفظية",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-06",
    name: "الاعتداء الجسدي",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-07",
    name: "التنمر والإيذاء",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-08",
    name: "الغش في الاختبارات",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-09",
    name: "التخريب في ممتلكات المدرسة",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
  {
    code: "S-10",
    name: "استخدام الجوال أثناء الدراسة",
    degrees: [
      { degree: "1", action: "التوجيه والإرشاد الشفهي",   deduction: 2 },
      { degree: "2", action: "الإنذار الشفهي مع التوثيق", deduction: 5 },
      { degree: "3", action: "الإنذار الكتابي",           deduction: 10 },
      { degree: "4", action: "استدعاء ولي الأمر كتابياً", deduction: 20 },
      { degree: "5", action: "الفصل المؤقت مع إشعار الوالدين", deduction: 30 },
    ],
  },
];

// مخالفات المعلمين
export const STAFF_VIOLATIONS = [
  { code: "T-01", name: "التأخر عن الحصص",           deduction: 5 },
  { code: "T-02", name: "الغياب غير المبرر",          deduction: 10 },
  { code: "T-03", name: "إهمال متابعة الطلاب",        deduction: 5 },
  { code: "T-04", name: "عدم تسليم الواجبات في وقتها", deduction: 5 },
];

// أنواع التعويضات (السلوك الإيجابي)
export const COMPENSATION_TYPES = [
  { value: "participation",        label: "المشاركة الإيجابية" },
  { value: "excellence",           label: "التميز الأكاديمي" },
  { value: "behavior_improvement", label: "تحسن ملحوظ في السلوك" },
  { value: "helping_others",       label: "مساعدة الآخرين" },
  { value: "community_service",    label: "خدمة المجتمع المدرسي" },
  { value: "attendance_perfect",   label: "الانتظام والمواظبة" },
  { value: "creative_work",        label: "العمل الإبداعي" },
  { value: "leadership",           label: "المبادرة والقيادة" },
];

// تصعيد الغياب (بعد كم يوم يتم الإجراء)
export const ABSENCE_ESCALATION = [
  { days: 5,  action: "إشعار ولي الأمر هاتفياً",             notifyGuardian: true },
  { days: 10, action: "استدعاء ولي الأمر للمدرسة",           notifyGuardian: true },
  { days: 15, action: "رفع تقرير للإدارة مع توقيع تعهد",    notifyGuardian: true },
  { days: 20, action: "إحالة للمرشد الطلابي",               notifyGuardian: true },
  { days: 25, action: "رفع الأمر للجهة التعليمية المختصة",  notifyGuardian: true },
];

// المسوّغات المقبولة للغياب
export const VALID_EXCUSES = [
  { value: "medical",         label: "إجازة مرضية (بتقرير طبي)" },
  { value: "family",          label: "ظروف عائلية" },
  { value: "bereavement",     label: "وفاة أحد الأقارب" },
  { value: "official",        label: "مهمة رسمية أو حكومية" },
  { value: "natural_disaster",label: "ظروف قاهرة" },
  { value: "other",           label: "أخرى (تُحدد)" },
];

// درجات تقييم السلوك الكلي
export const BEHAVIOR_RATING_LEVELS = [
  { min: 90, max: 100, label: "ممتاز",   color: "#10b981" },
  { min: 75, max: 89,  label: "جيد جداً", color: "#3b82f6" },
  { min: 60, max: 74,  label: "جيد",     color: "#f59e0b" },
  { min: 40, max: 59,  label: "مقبول",   color: "#f97316" },
  { min: 0,  max: 39,  label: "ضعيف",   color: "#ef4444" },
];
