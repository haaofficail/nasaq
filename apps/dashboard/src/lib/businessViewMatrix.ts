import { Activity, Car, Heart, Sparkles, User, FileText, Beaker, Shield, Scissors } from 'lucide-react';

export type FieldType = "text" | "textarea" | "select" | "number" | "date" | "multiselect";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SectionDef {
  id: string;
  title: string;
  iconName: "Sparkles" | "User" | "Heart" | "Activity" | "Car" | "FileText" | "Shield" | "Scissors";
  colorClass: string;
  fields: FieldDef[];
}

export interface ViewMatrix {
  profileTitle: string;
  sections: SectionDef[];
  visitNoteFields: FieldDef[];
}

// ============================================================
// REUSABLE FIELDS DIRECTORY
// ============================================================

const HAIR_FIELDS: FieldDef[] = [
  { key: "hairType", label: "نوع الشعر", type: "select", options: [
      { value: "straight", label: "ناعم مستقيم" }, { value: "wavy", label: "موجي" },
      { value: "curly", label: "مجعد" }, { value: "coily", label: "مجعد كثيف" }
  ]},
  { key: "hairCondition", label: "حالة الشعر", type: "select", options: [
      { value: "healthy", label: "سليم" }, { value: "damaged", label: "تالف" },
      { value: "color_treated", label: "مصبوغ" }, { value: "dry", label: "جاف" }, { value: "oily", label: "دهني" }
  ]},
  { key: "naturalColor", label: "اللون الطبيعي", type: "text", placeholder: "أسود داكن" },
  { key: "currentColor", label: "اللون الحالي", type: "text", placeholder: "بني فاتح" }
];

const BEARD_FIELDS: FieldDef[] = [
  { key: "beardStyle", label: "ستايل الذقن المفضل", type: "text", placeholder: "خليجي / كلاسيك" },
  { key: "haircutPref", label: "قصة الشعر المفضلة", type: "text", placeholder: "تخفيف بالمكينة مكينة 2" }
];

const SKIN_FIELDS: FieldDef[] = [
  { key: "skinType", label: "نوع البشرة", type: "select", options: [
      { value: "normal", label: "عادي" }, { value: "oily", label: "دهني" },
      { value: "dry", label: "جاف" }, { value: "combination", label: "مختلط" }, { value: "sensitive", label: "حساس" }
  ]},
  { key: "skinConcerns", label: "المشاكل", type: "text", placeholder: "مسامات، حب شباب" }
];

const HEALTH_ALERTS: FieldDef[] = [
  { key: "allergies", label: "حساسية لمواد/منتجات", type: "text", placeholder: "أوكسيجين 40 / مكسرات" },
  { key: "sensitivities", label: "حساسية جسدية", type: "text", placeholder: "فروة رأس حساسة" },
  { key: "medicalNotes", label: "ملاحظات طبية", type: "textarea", placeholder: "السكر / الضغط / عمليات سابقة" }
];

const PREFERENCES: FieldDef[] = [
  { key: "preferences", label: "التفضيلات العامة", type: "textarea", placeholder: "يحب الهدوء / درجة التكييف منخفضة" },
  { key: "avoidNotes", label: "أمور يفضل تجنبها", type: "text", placeholder: "تجنب المياه الساخنة جداً" }
];

const FITNESS_FIELDS: FieldDef[] = [
  { key: "weight", label: "الوزن الحالي (كج)", type: "number" },
  { key: "height", label: "الطول (سم)", type: "number" },
  { key: "goals", label: "الأهداف الرياضية", type: "text", placeholder: "خسارة وزن / بناء عضل" },
  { key: "injuries", label: "إصابات سابقة", type: "text", placeholder: "ديسك الظهر / تمزق أربطة" }
];

const DIET_FIELDS: FieldDef[] = [
  { key: "dietaryRestrictions", label: "النظام الغذائي", type: "select", options: [
      { value: "none", label: "بدون قيود" }, { value: "vegetarian", label: "نباتي" },
      { value: "vegan", label: "فيجن" }, { value: "keto", label: "كيتو" }, { value: "gluten_free", label: "خالٍ من الجلوتين" }
  ]},
  { key: "foodAllergies", label: "حساسية طعام", type: "text", placeholder: "مكسرات، محار، حليب" },
  { key: "favoriteItems", label: "الأطباق المفضلة", type: "text", placeholder: "ستيك ميديوم رير" }
];

const CAR_RENTAL_FIELDS: FieldDef[] = [
  { key: "licenseNumber", label: "رقم رخصة القيادة", type: "text" },
  { key: "licenseExpiry", label: "تاريخ انتهاء الرخصة", type: "date" },
  { key: "preferredCategory", label: "الفئة المفضلة", type: "select", options: [
      { value: "sedan", label: "سيدان" }, { value: "suv", label: "عائلي SUV" },
      { value: "luxury", label: "فارهة" }, { value: "sport", label: "رياضية" }
  ]},
  { key: "insurancePref", label: "تفضيل التأمين", type: "select", options: [
      { value: "comprehensive", label: "شامل" }, { value: "third_party", label: "ضد الغير" }
  ]}
];

// ============================================================
// VISIT NOTE FIELDS DIRECTORY
// ============================================================

const SALON_VISIT_NOTES: FieldDef[] = [
  { key: "formula", label: "الفورمولا (للصبغات/المعالجات)", type: "text", placeholder: "لوريال 7.1 + أوكسيجين 20 | 1:1" },
  { key: "productsUsed", label: "المنتجات المستخدمة", type: "text", placeholder: "شامبو حماية اللون" },
  { key: "technique", label: "الأسلوب المتبع", type: "text", placeholder: "بالياج، قص طبقات" },
  { key: "resultNotes", label: "ملاحظات النتيجة", type: "textarea", placeholder: "النتيجة ممتازة، العميل راضٍ" }
];

const BARBER_VISIT_NOTES: FieldDef[] = [
  { key: "styleUsed", label: "تفاصيل القصة / التحديد", type: "text", placeholder: "تخفيف جوانب درجة 1" },
  { key: "productsUsed", label: "كريمات/جل مستخدمة", type: "text", placeholder: "جل تثبيت / شمع" },
  { key: "resultNotes", label: "التوصيات للزيارة القادمة", type: "textarea", placeholder: "إبقاء الشعر من الأعلى أطول قليلاً" }
];

const SPA_VISIT_NOTES: FieldDef[] = [
  { key: "focusAreas", label: "مناطق التركيز", type: "text", placeholder: "أسفل الظهر، الأكتاف" },
  { key: "pressureLevel", label: "مستوى الضغط المستخدم", type: "select", options: [
      { value: "light", label: "خفيف" }, { value: "medium", label: "متوسط" }, { value: "firm", label: "قوي" }, { value: "deep_tissue", label: "عميق مبرح" }
  ]},
  { key: "oilsUsed", label: "الزيوت / الكريمات المستخدمة", type: "text", placeholder: "زيت اللافندر للاسترخاء" },
  { key: "resultNotes", label: "حالة العضلات وملاحظات", type: "textarea", placeholder: "شد في الكتف الأيمن يحتاج جلسة إضافية" }
];

const FITNESS_VISIT_NOTES: FieldDef[] = [
  { key: "workoutFocus", label: "تركيز الجلسة/التمرين", type: "text", placeholder: "أكتاف / كارديو" },
  { key: "performance", label: "أداء العميل", type: "text", placeholder: "تحسن في القدرة على التحمل" },
  { key: "resultNotes", label: "ملاحظات وتوصيات للمنزل", type: "textarea", placeholder: "استطالة أسفل الظهر يومياً" }
];

const CAR_RENTAL_NOTES: FieldDef[] = [
  { key: "vehicleOut", label: "رقم اللوحة المستلمة", type: "text" },
  { key: "conditionOut", label: "حالة السيارة عند التسليم", type: "text", placeholder: "نظيفة، خدش بسيط باب أيمن" },
  { key: "resultNotes", label: "ملاحظات", type: "textarea" }
];

const GENERIC_NOTES: FieldDef[] = [
  { key: "actionTaken", label: "الخدمة المُقدمة بالتفصيل", type: "textarea" },
  { key: "resultNotes", label: "النتيجة وملاحظات العميل", type: "textarea" }
];

// ============================================================
// THE GLOBAL MATRIX
// ============================================================

export const BUSINESS_VIEW_MATRIX: Record<string, ViewMatrix> = {
  salon: {
    profileTitle: "بطاقة الجمال والتجميل",
    sections: [
      { id: "health", title: "تنبيهات طبية", iconName: "Shield", colorClass: "bg-red-50/60", fields: HEALTH_ALERTS },
      { id: "hair", title: "ملف الشعر", iconName: "Sparkles", colorClass: "bg-violet-50/60", fields: HAIR_FIELDS },
      { id: "skin", title: "ملف البشرة", iconName: "User", colorClass: "bg-pink-50/60", fields: SKIN_FIELDS },
      { id: "pref", title: "التفضيلات والملاحظات", iconName: "Heart", colorClass: "bg-rose-50/60", fields: [ ...PREFERENCES, { key: "lastFormula", label: "آخر فورمولا", type: "text" } ] }
    ],
    visitNoteFields: SALON_VISIT_NOTES
  },
  barber: {
    profileTitle: "ملف العناية الخاص",
    sections: [
      { id: "health", title: "تنبيهات طبية وحساسيات", iconName: "Shield", colorClass: "bg-red-50/60", fields: HEALTH_ALERTS },
      { id: "beard", title: "تفضيلات الحلاقة", iconName: "Scissors", colorClass: "bg-slate-50/60", fields: BEARD_FIELDS },
      { id: "pref", title: "التفضيلات والملاحظات", iconName: "Heart", colorClass: "bg-rose-50/60", fields: PREFERENCES }
    ],
    visitNoteFields: BARBER_VISIT_NOTES
  },
  spa: {
    profileTitle: "الملف الصحي (Spa)",
    sections: [
      { id: "health", title: "محاذير طبية", iconName: "Shield", colorClass: "bg-red-50/60", fields: HEALTH_ALERTS },
      { id: "skin", title: "ملف البشرة والجسم", iconName: "User", colorClass: "bg-teal-50/60", fields: SKIN_FIELDS },
      { id: "pref", title: "تفضيلات المساج والاسترخاء", iconName: "Heart", colorClass: "bg-indigo-50/60", fields: PREFERENCES }
    ],
    visitNoteFields: SPA_VISIT_NOTES
  },
  fitness: {
    profileTitle: "الملف الرياضي والصحي",
    sections: [
      { id: "health", title: "التاريخ الطبي والإصابات", iconName: "Shield", colorClass: "bg-red-50/60", fields: HEALTH_ALERTS },
      { id: "stats", title: "القياسات والأهداف", iconName: "Activity", colorClass: "bg-orange-50/60", fields: FITNESS_FIELDS },
      { id: "pref", title: "ملاحظات المدرب", iconName: "Heart", colorClass: "bg-cyan-50/60", fields: PREFERENCES }
    ],
    visitNoteFields: FITNESS_VISIT_NOTES
  },
  car_rental: {
    profileTitle: "ملف المستأجر",
    sections: [
      { id: "docs", title: "تراخيص وتفضيلات التأجير", iconName: "Car", colorClass: "bg-blue-50/60", fields: CAR_RENTAL_FIELDS },
      { id: "pref", title: "ملاحظات العميل", iconName: "FileText", colorClass: "bg-slate-50/60", fields: PREFERENCES }
    ],
    visitNoteFields: CAR_RENTAL_NOTES
  },
  restaurant: {
    profileTitle: "تفضيلات الضيف",
    sections: [
      { id: "health", title: "حساسيات الطعام والقيود", iconName: "Shield", colorClass: "bg-red-50/60", fields: [
        { key: "foodAllergies", label: "حساسية طعام", type: "text" },
        { key: "diet", label: "نظام غذائي", type: "select", options: [{value:"none", label:"الكل"}, {value:"vegan", label:"نباتي"}] }
      ] },
      { id: "pref", title: "التفضيلات الخاصة", iconName: "Heart", colorClass: "bg-rose-50/60", fields: PREFERENCES }
    ],
    visitNoteFields: GENERIC_NOTES
  }
};

// Fallback logic for keys missing from dictionary
export const getMatrixForBusiness = (bizType: string): ViewMatrix => {
  return BUSINESS_VIEW_MATRIX[bizType] || {
    profileTitle: "البيانات الإضافية",
    sections: [
      { id: "health", title: "ملاحظات طبية وتنبيهات", iconName: "Shield", colorClass: "bg-red-50/60", fields: HEALTH_ALERTS },
      { id: "pref", title: "تعليمات وتفضيلات", iconName: "Heart", colorClass: "bg-gray-50/60", fields: PREFERENCES }
    ],
    visitNoteFields: GENERIC_NOTES
  };
};
