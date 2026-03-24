/**
 * Form Registry
 *
 * Declares form field configurations for every business context.
 * This is pure configuration — no React components.
 *
 * The actual form UI reads from this registry via getBookingFormConfig()
 * and renders the appropriate fields.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "datetime"
  | "select"
  | "number"
  | "phone"
  | "email"
  | "toggle"
  | "multiselect"
  | "address"
  | "duration";

export interface FieldConfig {
  key: string;
  label: string;              // Arabic label
  labelEn?: string;           // optional English
  type: FieldType;
  required: boolean;
  options?: string[];         // for select/multiselect
  placeholder?: string;
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
  requiredCapabilities: string[];  // field only shows if capabilities include all of these
}

export interface FormVariant {
  id: string;
  label: string;              // Arabic name for this form variant
  // Match rules — most specific match wins
  allowedBusinessTypes: string[];
  allowedOperatingProfiles: string[];
  // Field sections in order
  sections: FormSection[];
}

export interface FormSection {
  id: string;
  label: string;
  fields: FieldConfig[];
  requiredCapabilities: string[];  // section only shows if capabilities include all
}

// ============================================================
// BOOKING FORM VARIANTS
// ============================================================

export const BOOKING_FORM_REGISTRY: FormVariant[] = [

  // ── RENTAL booking ─────────────────────────────────────────
  {
    id: "booking_rental",
    label: "حجز تأجير",
    allowedBusinessTypes: ["rental"],
    allowedOperatingProfiles: ["rental_equipment", "rental_furniture", "rental_venues", "rental_daily", "rental_event_based", "rental_warehouse", "rental_hybrid"],
    sections: [
      {
        id: "customer",
        label: "بيانات العميل",
        requiredCapabilities: [],
        fields: [
          { key: "customerName",  label: "اسم العميل",     type: "text",     required: true,  requiredCapabilities: [] },
          { key: "customerPhone", label: "رقم الجوال",     type: "phone",    required: true,  requiredCapabilities: [] },
          { key: "customerId",    label: "العميل المسجل",  type: "select",   required: false, requiredCapabilities: [] },
        ],
      },
      {
        id: "rental_details",
        label: "تفاصيل التأجير",
        requiredCapabilities: [],
        fields: [
          { key: "startDate",  label: "تاريخ البداية",   type: "date",     required: true,  requiredCapabilities: [] },
          { key: "endDate",    label: "تاريخ النهاية",   type: "date",     required: true,  requiredCapabilities: [] },
          { key: "assetId",    label: "الأصل",           type: "select",   required: false, requiredCapabilities: ["assets"] },
          { key: "rate",       label: "السعر اليومي",    type: "number",   required: false, requiredCapabilities: [] },
          { key: "deposit",    label: "التأمين",         type: "number",   required: false, requiredCapabilities: [] },
          { key: "notes",      label: "ملاحظات",         type: "textarea", required: false, requiredCapabilities: [] },
        ],
      },
      {
        id: "contract",
        label: "العقد",
        requiredCapabilities: ["contracts"],
        fields: [
          { key: "generateContract", label: "إنشاء عقد تلقائياً", type: "toggle", required: false, defaultValue: true,  requiredCapabilities: ["contracts"] },
          { key: "signatureRequired", label: "يتطلب توقيع",       type: "toggle", required: false, defaultValue: false, requiredCapabilities: ["contracts"] },
        ],
      },
    ],
  },

  // ── HOTEL / Apartment booking ──────────────────────────────
  {
    id: "booking_hotel",
    label: "حجز فندقي",
    allowedBusinessTypes: ["hotel"],
    allowedOperatingProfiles: ["hotel_standard", "hotel_apartments", "hotel_resort", "hotel_hybrid"],
    sections: [
      {
        id: "guest",
        label: "بيانات النزيل",
        requiredCapabilities: [],
        fields: [
          { key: "guestName",    label: "اسم النزيل",       type: "text",   required: true,  requiredCapabilities: [] },
          { key: "guestPhone",   label: "رقم الجوال",       type: "phone",  required: true,  requiredCapabilities: [] },
          { key: "guestEmail",   label: "البريد الإلكتروني", type: "email",  required: false, requiredCapabilities: [] },
          { key: "idNumber",     label: "رقم الهوية",        type: "text",   required: false, requiredCapabilities: [] },
          { key: "nationality",  label: "الجنسية",           type: "text",   required: false, requiredCapabilities: [] },
          { key: "guestCount",   label: "عدد الضيوف",        type: "number", required: true,  min: 1, requiredCapabilities: [] },
        ],
      },
      {
        id: "stay",
        label: "تفاصيل الإقامة",
        requiredCapabilities: [],
        fields: [
          { key: "checkIn",    label: "تسجيل الدخول",   type: "datetime", required: true,  requiredCapabilities: [] },
          { key: "checkOut",   label: "تسجيل الخروج",   type: "datetime", required: true,  requiredCapabilities: [] },
          { key: "roomId",     label: "الغرفة",          type: "select",   required: false, requiredCapabilities: ["hotel"] },
          { key: "roomType",   label: "نوع الغرفة",      type: "select",   required: false, options: ["standard", "deluxe", "suite", "family"], requiredCapabilities: [] },
          { key: "ratePerNight", label: "السعر لليلة",   type: "number",   required: false, requiredCapabilities: [] },
        ],
      },
      {
        id: "payment",
        label: "الدفع",
        requiredCapabilities: [],
        fields: [
          { key: "paymentMethod", label: "طريقة الدفع", type: "select", required: false,
            options: ["cash", "card", "bank_transfer", "pay_later"], requiredCapabilities: [] },
          { key: "paidAmount",    label: "المبلغ المدفوع", type: "number", required: false, requiredCapabilities: [] },
        ],
      },
    ],
  },

  // ── EVENTS booking ─────────────────────────────────────────
  {
    id: "booking_events",
    label: "حجز فعالية",
    allowedBusinessTypes: ["events", "events_vendor", "event_organizer"],
    allowedOperatingProfiles: ["events_full", "events_decor", "event_full_planning", "event_coordination", "event_production"],
    sections: [
      {
        id: "client",
        label: "بيانات العميل",
        requiredCapabilities: [],
        fields: [
          { key: "clientName",  label: "اسم العميل",  type: "text",  required: true, requiredCapabilities: [] },
          { key: "clientPhone", label: "رقم الجوال",  type: "phone", required: true, requiredCapabilities: [] },
          { key: "clientEmail", label: "البريد",       type: "email", required: false, requiredCapabilities: [] },
        ],
      },
      {
        id: "event_details",
        label: "تفاصيل الفعالية",
        requiredCapabilities: [],
        fields: [
          { key: "eventDate",      label: "تاريخ الفعالية",    type: "date",     required: true, requiredCapabilities: [] },
          { key: "eventType",      label: "نوع الفعالية",      type: "select",   required: false,
            options: ["wedding", "birthday", "corporate", "graduation", "other"], requiredCapabilities: [] },
          { key: "venueLocation",  label: "مكان الفعالية",     type: "text",     required: false, requiredCapabilities: [] },
          { key: "guestCount",     label: "عدد المدعوين",      type: "number",   required: false, requiredCapabilities: [] },
          { key: "packageId",      label: "الباقة",            type: "select",   required: false, requiredCapabilities: [] },
          { key: "requirements",   label: "المتطلبات الخاصة",  type: "textarea", required: false, requiredCapabilities: [] },
        ],
      },
      {
        id: "contract",
        label: "العقد",
        requiredCapabilities: ["contracts"],
        fields: [
          { key: "deposit",           label: "دفعة مقدمة",     type: "number",  required: false, requiredCapabilities: [] },
          { key: "generateContract",  label: "إنشاء عقد",      type: "toggle",  required: false, defaultValue: true, requiredCapabilities: ["contracts"] },
        ],
      },
    ],
  },

  // ── SERVICES booking (generic: salon, medical, education, etc.) ──
  {
    id: "booking_services",
    label: "حجز خدمة",
    allowedBusinessTypes: ["salon", "barber", "spa", "fitness", "services", "medical", "education", "maintenance", "workshop"],
    allowedOperatingProfiles: ["salon_in_branch", "salon_home_service", "salon_spa", "salon_hybrid", "appointments", "field_service"],
    sections: [
      {
        id: "customer",
        label: "بيانات العميل",
        requiredCapabilities: [],
        fields: [
          { key: "customerName",  label: "اسم العميل",  type: "text",  required: true, requiredCapabilities: [] },
          { key: "customerPhone", label: "رقم الجوال",  type: "phone", required: true, requiredCapabilities: [] },
        ],
      },
      {
        id: "appointment",
        label: "تفاصيل الموعد",
        requiredCapabilities: [],
        fields: [
          { key: "serviceId",   label: "الخدمة",        type: "select",   required: true, requiredCapabilities: ["catalog"] },
          { key: "providerId",  label: "مقدم الخدمة",  type: "select",   required: false, requiredCapabilities: [] },
          { key: "date",        label: "التاريخ",       type: "date",     required: true, requiredCapabilities: [] },
          { key: "time",        label: "الوقت",         type: "select",   required: true, requiredCapabilities: [] },
          { key: "duration",    label: "المدة (دقيقة)", type: "number",   required: false, defaultValue: 60, requiredCapabilities: [] },
          { key: "notes",       label: "ملاحظات",       type: "textarea", required: false, requiredCapabilities: [] },
        ],
      },
    ],
  },

  // ── RESTAURANT table booking ────────────────────────────────
  {
    id: "booking_restaurant",
    label: "حجز طاولة",
    allowedBusinessTypes: ["restaurant", "cafe", "catering", "bakery"],
    allowedOperatingProfiles: ["restaurant_dine_in", "restaurant_takeaway", "restaurant_hybrid", "restaurant_catering"],
    sections: [
      {
        id: "customer",
        label: "بيانات العميل",
        requiredCapabilities: [],
        fields: [
          { key: "customerName",  label: "اسم العميل",  type: "text",  required: true, requiredCapabilities: [] },
          { key: "customerPhone", label: "رقم الجوال",  type: "phone", required: true, requiredCapabilities: [] },
        ],
      },
      {
        id: "reservation",
        label: "تفاصيل الحجز",
        requiredCapabilities: [],
        fields: [
          { key: "date",        label: "التاريخ",      type: "date",   required: true, requiredCapabilities: [] },
          { key: "time",        label: "الوقت",        type: "select", required: true, requiredCapabilities: [] },
          { key: "partySize",   label: "عدد الأشخاص", type: "number", required: true, min: 1, requiredCapabilities: [] },
          { key: "tableId",     label: "الطاولة",      type: "select", required: false, requiredCapabilities: [] },
          { key: "notes",       label: "ملاحظات",      type: "textarea", required: false, requiredCapabilities: [] },
        ],
      },
    ],
  },

  // ── DIGITAL / PROJECT booking ───────────────────────────────
  {
    id: "booking_project",
    label: "مشروع جديد",
    allowedBusinessTypes: ["digital_services", "marketing", "agency", "technology", "photography"],
    allowedOperatingProfiles: ["digital_projects", "digital_subscriptions", "digital_agency", "digital_freelance", "photography_studio"],
    sections: [
      {
        id: "client",
        label: "بيانات العميل",
        requiredCapabilities: [],
        fields: [
          { key: "clientName",  label: "اسم العميل",  type: "text",  required: true, requiredCapabilities: [] },
          { key: "clientPhone", label: "رقم الجوال",  type: "phone", required: true, requiredCapabilities: [] },
          { key: "clientEmail", label: "البريد",       type: "email", required: false, requiredCapabilities: [] },
        ],
      },
      {
        id: "project",
        label: "تفاصيل المشروع",
        requiredCapabilities: [],
        fields: [
          { key: "serviceId",   label: "الخدمة / الباقة", type: "select",   required: false, requiredCapabilities: ["catalog"] },
          { key: "startDate",   label: "تاريخ البداية",   type: "date",     required: true, requiredCapabilities: [] },
          { key: "deadline",    label: "الموعد النهائي",  type: "date",     required: false, requiredCapabilities: [] },
          { key: "budget",      label: "الميزانية",       type: "number",   required: false, requiredCapabilities: [] },
          { key: "description", label: "وصف المشروع",     type: "textarea", required: false, requiredCapabilities: [] },
        ],
      },
      {
        id: "contract",
        label: "العقد",
        requiredCapabilities: ["contracts"],
        fields: [
          { key: "generateContract", label: "إنشاء عقد", type: "toggle", required: false, defaultValue: true, requiredCapabilities: ["contracts"] },
          { key: "deposit",         label: "دفعة مقدمة", type: "number", required: false, requiredCapabilities: [] },
        ],
      },
    ],
  },

  // ── DEFAULT / GENERIC booking (safe fallback) ───────────────
  {
    id: "booking_default",
    label: "حجز",
    allowedBusinessTypes: [],    // matches anything not matched above
    allowedOperatingProfiles: [],
    sections: [
      {
        id: "customer",
        label: "بيانات العميل",
        requiredCapabilities: [],
        fields: [
          { key: "customerName",  label: "اسم العميل",  type: "text",  required: true, requiredCapabilities: [] },
          { key: "customerPhone", label: "رقم الجوال",  type: "phone", required: true, requiredCapabilities: [] },
        ],
      },
      {
        id: "appointment",
        label: "تفاصيل الحجز",
        requiredCapabilities: [],
        fields: [
          { key: "serviceId",  label: "الخدمة",    type: "select",   required: false, requiredCapabilities: ["catalog"] },
          { key: "date",       label: "التاريخ",   type: "date",     required: true, requiredCapabilities: [] },
          { key: "time",       label: "الوقت",     type: "select",   required: true, requiredCapabilities: [] },
          { key: "notes",      label: "ملاحظات",   type: "textarea", required: false, requiredCapabilities: [] },
        ],
      },
    ],
  },
];

// ============================================================
// Lookup — returns the most specific form variant for the context
// Priority: operatingProfile match > businessType match > default
// ============================================================
export function getBookingFormConfig(ctx: {
  businessType: string;
  operatingProfile: string;
  capabilities: string[];
}): FormVariant {
  // 1. Most specific: operatingProfile match
  const byProfile = BOOKING_FORM_REGISTRY.find(
    (v) =>
      v.allowedOperatingProfiles.includes(ctx.operatingProfile) &&
      (v.allowedBusinessTypes.length === 0 || v.allowedBusinessTypes.includes(ctx.businessType))
  );
  if (byProfile) return byProfile;

  // 2. BusinessType match
  const byType = BOOKING_FORM_REGISTRY.find(
    (v) =>
      v.allowedOperatingProfiles.length === 0 &&
      v.allowedBusinessTypes.includes(ctx.businessType)
  );
  if (byType) return byType;

  // 3. Safe fallback — generic booking
  return BOOKING_FORM_REGISTRY.find((v) => v.id === "booking_default")!;
}

/**
 * Filter sections and fields by capabilities.
 * Returns only sections and fields the org has access to.
 */
export function resolveFormSections(
  variant: FormVariant,
  capabilities: string[]
): FormSection[] {
  return variant.sections
    .filter((s) => s.requiredCapabilities.every((cap) => capabilities.includes(cap)))
    .map((s) => ({
      ...s,
      fields: s.fields.filter((f) =>
        f.requiredCapabilities.every((cap) => capabilities.includes(cap))
      ),
    }))
    .filter((s) => s.fields.length > 0);
}
