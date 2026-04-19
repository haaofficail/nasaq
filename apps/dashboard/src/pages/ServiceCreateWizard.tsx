/**
 * ServiceCreateWizard — معالج إنشاء خدمة جديدة بخطوات واضحة
 *
 * بديل مبسّط لنموذج ServiceFormPage الطويل.
 * 4 خطوات: الأساسيات → التفاصيل → الوسائط والمكونات → المراجعة والنشر
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Loader2, AlertCircle, Upload, X, Plus,
  Trash2, Save, Check, ChevronDown, MapPin, Package, Wrench,
  Home, Star, Truck, Gift, FileText, ShoppingBag, CalendarCheck,
  DollarSign, Clock, Image, Settings, Layers, CheckSquare,
  AlignLeft, AlignJustify, Hash, Calendar, LayoutList, Paperclip,
  MessageSquare, Barcode, Eye, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import {
  servicesApi, categoriesApi, mediaApi, addonsApi, questionsApi,
  membersApi, inventoryApi, settingsApi, eventPackagesApi,
} from "@/lib/api";
import { DurationInput } from "@/components/ui/DurationInput";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { toast } from "@/hooks/useToast";
import { RENTAL_AMENITIES, AMENITY_CATEGORY_LABELS } from "@/lib/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

type DurationUnit = "minute" | "hour" | "day";
const UNIT_MINS: Record<DurationUnit, number> = { minute: 1, hour: 60, day: 1440 };

function parseDur(mins: number): { v: string; u: DurationUnit } {
  if (mins >= 1440 && mins % 1440 === 0) return { v: String(mins / 1440), u: "day" };
  if (mins >= 60 && mins % 60 === 0) return { v: String(mins / 60), u: "hour" };
  return { v: String(mins), u: "minute" };
}

const DEFAULT_SERVICE_TYPES: { value: string; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "appointment",      label: "حجز موعد",      desc: "العميل يحجز وقت محدد", icon: CalendarCheck },
  { value: "execution",        label: "تنفيذ وصيانة",  desc: "تنفيذ عمل ميداني",    icon: Wrench },
  { value: "field_service",    label: "خدمة ميدانية",  desc: "زيارة في موقع العميل", icon: MapPin },
  { value: "rental",           label: "تأجير",          desc: "تأجير أصول ومعدات",    icon: Home },
  { value: "event_rental",     label: "تأجير فعالية",   desc: "قاعات ومساحات",       icon: Star },
  { value: "product",          label: "منتج",           desc: "بيع مباشر",           icon: Package },
  { value: "product_shipping", label: "منتج بشحن",     desc: "منتج يُشحن",          icon: Truck },
  { value: "food_order",       label: "طعام ومشروبات", desc: "وجبات ومنتجات غذائية", icon: ShoppingBag },
  { value: "package",          label: "باقة",           desc: "خدمات مجمّعة",        icon: Gift },
  { value: "add_on",           label: "خيار إضافي",    desc: "يُضاف على خدمة",      icon: Plus },
  { value: "project",          label: "مشروع",          desc: "عمل طويل المدى",      icon: FileText },
];

const FLOWER_SHOP_TYPES = [
  { value: "product",          label: "باقات الورد والهدايا",  desc: "باقات جاهزة، تغليف، فازات تباع للعميل مباشرة", icon: Package },
  { value: "event_rental",     label: "تأجير الكوش والاستقبالات", desc: "تجهيز وتأجير الكوش، طاولات الاستقبال، والمداخل", icon: Star },
  { value: "execution",        label: "تنسيق موقع وحفلات",   desc: "فريق المنسقين يجهز ورد طبيعي أو صناعي في القاعة", icon: Wrench },
  { value: "product_shipping", label: "باقات وشحنات توصيل",     desc: "باقات مخصصة للإهداء وتوصيل المناسبات",          icon: Truck },
  { value: "package",          label: "عروض مجمّعة (توفير)",   desc: "باقة (ورد + شوكولاتة + كرت) بسعر موحد وحصري", icon: Gift },
];

const BUSINESS_CUSTOM_TYPES: Record<string, typeof DEFAULT_SERVICE_TYPES> = {
  flower_shop: FLOWER_SHOP_TYPES,
};

const NEEDS_TIMING = new Set(["appointment", "execution", "field_service", "rental", "event_rental", "project", "food_order"]);
const NEEDS_CAPACITY = new Set(["event_rental", "package", "food_order", "rental"]);
const EXECUTION_TYPES = new Set(["execution", "field_service", "project"]);

type TypeConfig = {
  hint: string;
  durationLabel: string;
  componentTitle: string;
  componentDesc: string;
  showBookingRules: boolean;
  showComponents: boolean;
  showStaff: boolean;
  showAddons: boolean;
  defaults: Partial<Form>;
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
  appointment: {
    hint: "العميل يحجز وقتا محددا مع موظف — الأنسب للصالونات والعيادات.",
    durationLabel: "مدة الموعد", componentTitle: "المواد المستهلكة", componentDesc: "المواد التي تستهلك في كل جلسة",
    showBookingRules: true, showComponents: true, showStaff: true, showAddons: true,
    defaults: { durationValue: "60", durationUnit: "minute", depositPercent: "0", cancellationFreeHours: "24", servicePricingMode: "fixed" },
  },
  execution: {
    hint: "العميل يطلب تنفيذ عمل ويحدد موعدا — الأنسب للصيانة والتركيب.",
    durationLabel: "مدة التنفيذ المتوقعة", componentTitle: "مواد التنفيذ", componentDesc: "المواد والمعدات اللازمة",
    showBookingRules: true, showComponents: true, showStaff: true, showAddons: true,
    defaults: { durationValue: "2", durationUnit: "hour", depositPercent: "50", servicePricingMode: "fixed" },
  },
  field_service: {
    hint: "الموظف يزور العميل في موقعه — الأنسب للخدمات المنزلية والميدانية.",
    durationLabel: "مدة الزيارة المتوقعة", componentTitle: "معدات الزيارة", componentDesc: "المعدات والأدوات المطلوبة",
    showBookingRules: true, showComponents: true, showStaff: true, showAddons: false,
    defaults: { durationValue: "2", durationUnit: "hour", depositPercent: "30", servicePricingMode: "fixed" },
  },
  rental: {
    hint: "تأجير أصل لفترة محددة.", durationLabel: "وحدة الإيجار", componentTitle: "تجهيزات مشمولة", componentDesc: "ملحقات الإيجار",
    showBookingRules: false, showComponents: true, showStaff: false, showAddons: true,
    defaults: { durationValue: "1", durationUnit: "day", servicePricingMode: "fixed", depositPercent: "50", cancellationFreeHours: "48" },
  },
  event_rental: {
    hint: "تأجير قاعة أو مكان لحدث.", durationLabel: "مدة الفعالية", componentTitle: "ما يشمله التأجير", componentDesc: "التجهيزات المشمولة",
    showBookingRules: false, showComponents: true, showStaff: false, showAddons: true,
    defaults: { durationValue: "4", durationUnit: "hour", depositPercent: "50", servicePricingMode: "fixed" },
  },
  product: {
    hint: "منتج يباع مباشرة في الكاشير.", durationLabel: "", componentTitle: "مكونات المنتج", componentDesc: "المواد الخام",
    showBookingRules: false, showComponents: true, showStaff: false, showAddons: false,
    defaults: { servicePricingMode: "fixed", isBookable: false, isVisibleInPOS: true, depositPercent: "0" },
  },
  product_shipping: {
    hint: "منتج يشحن للعميل.", durationLabel: "", componentTitle: "مكونات المنتج", componentDesc: "المواد الخام",
    showBookingRules: false, showComponents: true, showStaff: false, showAddons: false,
    defaults: { servicePricingMode: "fixed", isBookable: false, isVisibleOnline: true, isVisibleInPOS: false, depositPercent: "0" },
  },
  food_order: {
    hint: "وجبة أو منتج غذائي.", durationLabel: "وقت التحضير", componentTitle: "المكونات", componentDesc: "مكونات الوجبة",
    showBookingRules: false, showComponents: true, showStaff: false, showAddons: true,
    defaults: { durationValue: "15", durationUnit: "minute", servicePricingMode: "fixed", depositPercent: "0", isVisibleInPOS: true },
  },
  package: {
    hint: "مجموعة خدمات مجمّعة بسعر موحد.", durationLabel: "", componentTitle: "الخدمات المشمولة", componentDesc: "عناصر الباقة",
    showBookingRules: false, showComponents: true, showStaff: false, showAddons: true,
    defaults: { servicePricingMode: "fixed", depositPercent: "30" },
  },
  add_on: {
    hint: "خيار اختياري يُضاف على خدمة أساسية.", durationLabel: "", componentTitle: "مواد الإضافة", componentDesc: "المواد المستهلكة",
    showBookingRules: false, showComponents: false, showStaff: false, showAddons: false,
    defaults: { depositPercent: "0", isBookable: false, isVisibleOnline: false },
  },
  project: {
    hint: "عمل طويل المدى ينفذ على مراحل.", durationLabel: "المدة التقديرية", componentTitle: "موارد المشروع", componentDesc: "المواد المطلوبة",
    showBookingRules: true, showComponents: true, showStaff: true, showAddons: false,
    defaults: { durationValue: "7", durationUnit: "day", depositPercent: "30", cancellationFreeHours: "72" },
  },
};

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  hint: "", durationLabel: "المدة", componentTitle: "مكونات الخدمة", componentDesc: "المواد المطلوبة",
  showBookingRules: true, showComponents: true, showStaff: true, showAddons: true, defaults: {},
};

const BUSINESS_DEFAULT_SERVICE_TYPE: Record<string, string> = {
  salon: "appointment", barber: "appointment", spa: "appointment", fitness: "appointment",
  massage: "appointment", photography: "appointment", cafe: "food_order", restaurant: "food_order",
  bakery: "food_order", catering: "food_order", rental: "rental", car_rental: "rental",
  hotel: "rental", real_estate: "rental", events: "event_rental", event_organizer: "event_rental",
  workshop: "execution", maintenance: "execution", logistics: "field_service", construction: "project",
  retail: "product", flower_shop: "product", school: "product",
};

const SERVICE_TYPE_PLACEHOLDERS: Record<string, string> = {
  appointment: "مثال: جلسة ليزر، مساج سويدي...",
  execution: "مثال: صيانة مكيف، تركيب لوحات...",
  field_service: "مثال: تنظيف منزلي، تنسيق حدائق...",
  rental: "مثال: تأجير معدات، تأجير سيارة...",
  event_rental: "مثال: قاعة أفراح، خيمة مناسبات...",
  product: "مثال: باقة ورد جوري، عطر، منتج تغليف...",
  product_shipping: "مثال: بوكس هدايا، منتج جاهز...",
  food_order: "مثال: كيكة زفاف، بوكس قهوة...",
  package: "مثال: باقة العروس، باقة التوفير...",
  project: "مثال: تصميم ديكور، حملة تسويقية...",
  add_on: "مثال: تغليف فاخر، إضافة كرت هدية..."
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceMode = "booking" | "execution";

type Form = {
  serviceType: string;
  name: string;
  nameEn: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  servicePricingMode: string;
  durationValue: string;
  durationUnit: DurationUnit;
  status: string;
  vatInclusive: boolean;
  maxCapacity: string;
  isFeatured: boolean;
  depositPercent: string;
  minAdvanceHours: string;
  maxAdvanceDays: string;
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
  cancellationFreeHours: string;
  isBookable: boolean;
  isVisibleInPOS: boolean;
  isVisibleOnline: boolean;
  barcode: string;
  amenities: string[];
  templateId: string;
  serviceMode: ServiceMode;
};

const INIT: Form = {
  serviceType: "", name: "", nameEn: "", categoryId: "", shortDescription: "", description: "",
  basePrice: "", servicePricingMode: "fixed",
  durationValue: "60", durationUnit: "minute", status: "active",
  vatInclusive: true, maxCapacity: "", isFeatured: false,
  depositPercent: "30", minAdvanceHours: "", maxAdvanceDays: "",
  bufferBeforeMinutes: "0", bufferAfterMinutes: "0", cancellationFreeHours: "24",
  isBookable: true, isVisibleInPOS: true, isVisibleOnline: true,
  barcode: "", amenities: [], templateId: "", serviceMode: "booking",
};

type AddonDraft = { name: string; nameEn: string; description: string; price: string; type: "optional" | "required"; imageUrl: string };
type QuestionType = "text" | "textarea" | "number" | "date" | "select" | "multi" | "checkbox" | "location" | "file" | "image";
type QuestionDraft = { question: string; type: QuestionType; isRequired: boolean; isPaid: boolean; price: string; options: string[] };
type ComponentDraft = { sourceType: "manual" | "inventory"; inventoryItemId: string; name: string; quantity: string; unit: string; unitCost: string };
type MediaItem = { preview: string; url: string | null; mediaId: string | null; isCover: boolean; uploading: boolean };

const INIT_ADDON: AddonDraft = { name: "", nameEn: "", description: "", price: "", type: "optional", imageUrl: "" };
const INIT_Q: QuestionDraft = { question: "", type: "text", isRequired: false, isPaid: false, price: "", options: [] };
const INIT_COMP: ComponentDraft = { sourceType: "manual", inventoryItemId: "", name: "", quantity: "1", unit: "قطعة", unitCost: "0" };

const QUESTION_TYPES: { value: QuestionType; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "نصّي", icon: AlignLeft },
  { value: "textarea", label: "فقرة نصية", icon: AlignJustify },
  { value: "number", label: "رقم", icon: Hash },
  { value: "date", label: "تاريخ", icon: Calendar },
  { value: "select", label: "قائمة منسدلة", icon: ChevronDown },
  { value: "multi", label: "اختيار متعدد", icon: LayoutList },
  { value: "checkbox", label: "موافقة", icon: CheckSquare },
  { value: "location", label: "موقع", icon: MapPin },
  { value: "file", label: "ملف", icon: Paperclip },
  { value: "image", label: "صورة", icon: Image },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const iCls = "w-full border border-[#eef2f6] h-10 rounded-xl px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-50/60 transition-all bg-white placeholder:text-gray-300";

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5"><AlertCircle className="w-3 h-3 shrink-0" />{msg}</p>;
}

// ─── Steps Definition ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "الأساسيات", icon: FileText, desc: "الاسم والسعر والمدة" },
  { id: 2, label: "التفاصيل", icon: Settings, desc: "القسم والإعدادات" },
  { id: 3, label: "الوسائط", icon: Image, desc: "الصور والمكونات" },
  { id: 4, label: "المراجعة", icon: Eye, desc: "تأكيد وإنشاء" },
];

// ── Helper: derive service mode ──────────────────────────────────────────────

function deriveServiceMode(serviceType: string): ServiceMode {
  return EXECUTION_TYPES.has(serviceType) ? "execution" : "booking";
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ServiceCreateWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeFromUrl = searchParams.get("type") || "";

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(typeFromUrl ? 1 : 0); // 0 = type picker
  const [form, setForm] = useState<Form>(INIT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [addonDrafts, setAddonDrafts] = useState<AddonDraft[]>([]);
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>([]);
  const [componentDrafts, setComponentDrafts] = useState<ComponentDraft[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [pendingStaffIds, setPendingStaffIds] = useState<string[]>([]);
  const [allowedBranches, setAllowedBranches] = useState<string[]>([]);

  // ── Reference data ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [refLoading, setRefLoading] = useState(true);

  // ── Media ──────────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const addonFileRef = useRef<HTMLInputElement>(null);
  const [addonUploadIdx, setAddonUploadIdx] = useState<number | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [questionPickerIdx, setQuestionPickerIdx] = useState<number | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
  }, []);
  const isFlowerShop = user?.businessType === "flower_shop";
  const availableTypes = BUSINESS_CUSTOM_TYPES[user?.businessType || ""] || DEFAULT_SERVICE_TYPES;

  const needsTiming = NEEDS_TIMING.has(form.serviceType);
  
  // Apply dynamic overrides based on business type
  const baseTypeConfig = TYPE_CONFIG[form.serviceType] || DEFAULT_TYPE_CONFIG;
  const typeConfig = useMemo(() => {
    const conf = { ...baseTypeConfig };
    if (isFlowerShop) {
      if (form.serviceType === "product") {
        conf.componentTitle = "الورد ومواد التغليف";
        conf.componentDesc = "الفازات، أنواع الورد، وشرائط التغليف المستخدمة";
      } else if (form.serviceType === "event_rental" || form.serviceType === "execution") {
        conf.componentTitle = "المواد والمعدات والأزهار";
        conf.componentDesc = "الورد الصناعي، الهياكل المعدنية، ومعدات الإضاءة";
      }
    }
    return conf;
  }, [baseTypeConfig, isFlowerShop, form.serviceType]);
  
  const isExecutionMode = form.serviceMode === "execution";
  const canToggleMode = EXECUTION_TYPES.has(form.serviceType) || ["appointment", "execution", "field_service", "project"].includes(form.serviceType);

  // ── Apply type defaults ────────────────────────────────────────────────────
  useEffect(() => {
    if (form.serviceType && TYPE_CONFIG[form.serviceType]) {
      setForm(f => ({
        ...f,
        ...TYPE_CONFIG[form.serviceType].defaults,
        serviceMode: deriveServiceMode(form.serviceType),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.serviceType]);

  // ── Always start at Step 0 (Type Picker) unless passed via URL ───────
  useEffect(() => {
    if (typeFromUrl) {
      setForm(f => ({ ...f, serviceType: typeFromUrl }));
      setStep(1);
    } else {
      setStep(0);
    }
  }, [typeFromUrl]);

  // ── Load reference data ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      categoriesApi.list(true).then(r => setCategories(r.data || [])).catch(() => {}),
      membersApi.list().then(r => setStaffMembers(
        (r.data || []).map((m: any) => ({ id: m.user?.id ?? m.id, name: m.user?.name ?? m.name ?? "موظف", jobTitle: m.jobTitle }))
      )).catch(() => {}),
      inventoryApi.products().then(r => setProducts(r.data || [])).catch(() => {}),
      settingsApi.branches().then(r => setBranches(r.data || [])).catch(() => {}),
      eventPackagesApi.list().then(r => setTemplates(r.data || [])).catch(() => {}),
    ]).finally(() => setRefLoading(false));
  }, []);

  const upd = (f: keyof Form) => (e: any) => {
    setForm(p => ({ ...p, [f]: e?.target !== undefined ? e.target.value : e }));
    setErrors(p => ({ ...p, [f]: "" }));
  };

  // ── Image upload ───────────────────────────────────────────────────────────
  const pickFile = async (file: File) => {
    const preview = URL.createObjectURL(file);
    const idx = mediaItems.length;
    setMediaItems(p => [...p, { preview, url: null, mediaId: null, isCover: p.length === 0, uploading: true }]);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "services");
      const res = await mediaApi.upload(fd, () => {});
      const url = res.data?.fileUrl || res.data?.url || res.data?.publicUrl;
      if (!url) throw new Error("لم يرجع السيرفر رابط الصورة");
      setMediaItems(p => p.map((m, i) => i === idx ? { ...m, url, preview: url, uploading: false } : m));
    } catch (e: any) {
      setUploadErr(e.message || "فشل رفع الصورة");
      setMediaItems(p => p.filter((_, i) => i !== idx));
    }
  };

  const pickAddonImage = async (file: File, idx: number) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "addons");
      const res = await mediaApi.upload(fd, () => {});
      const url = res.data?.fileUrl || res.data?.url || res.data?.publicUrl;
      if (url) setAddonDrafts(d => d.map((x, j) => j === idx ? { ...x, imageUrl: url } : x));
    } catch {
      toast.error("فشل رفع صورة الإضافة");
    }
    setAddonUploadIdx(null);
  };

  // ── Per-step validation ────────────────────────────────────────────────────
  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.serviceType) e.serviceType = "اختر نوع الخدمة";
    }
    if (s === 1) {
      if (!form.name.trim()) e.name = "اسم الخدمة مطلوب";
      if (!form.basePrice || parseFloat(form.basePrice) <= 0) e.basePrice = "أدخل السعر";
      if (needsTiming && (!form.durationValue || parseFloat(form.durationValue) <= 0))
        e.durationValue = "المدة مطلوبة";
    }
    // Steps 2 and 3 have no required fields
    return e;
  };

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(s => Math.min(s + 1, 4));
  };

  const goBack = () => setStep(s => Math.max(s - 1, typeFromUrl ? 1 : 0));

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const durationMinutes = needsTiming
        ? Math.round((parseFloat(form.durationValue) || 60) * UNIT_MINS[form.durationUnit])
        : undefined;

      const baseInfo = {
        name: form.name,
        nameEn: form.nameEn || undefined,
        categoryId: form.categoryId || undefined,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        basePrice: form.basePrice,
        servicePricingMode: form.servicePricingMode as "fixed" | "from_price" | "variable",
        isFeatured: form.isFeatured,
        status: form.status,
        allowedLocationIds: allowedBranches,
        ...(durationMinutes ? { durationMinutes } : {}),
        vatInclusive: form.vatInclusive,
        maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : undefined,
        depositPercent: form.depositPercent || "0",
        minAdvanceHours: form.minAdvanceHours ? parseInt(form.minAdvanceHours) : undefined,
        maxAdvanceDays: form.maxAdvanceDays ? parseInt(form.maxAdvanceDays) : undefined,
        bufferBeforeMinutes: parseInt(form.bufferBeforeMinutes) || 0,
        bufferAfterMinutes: parseInt(form.bufferAfterMinutes) || 0,
        isBookable: form.isBookable,
        isVisibleInPOS: form.isVisibleInPOS,
        isVisibleOnline: form.isVisibleOnline,
        cancellationPolicy: { freeHours: parseInt(form.cancellationFreeHours) || 24, refundPercentBefore: 50, refundDaysBefore: 3, noRefundDaysBefore: 1 },
        barcode: form.barcode || undefined,
        amenities: form.amenities,
        templateId: form.templateId || undefined,
        serviceType: form.serviceType,
      };

      const res = await servicesApi.create(baseInfo);
      const svcId = res.data.id;
      const warnings: string[] = [];

      // Save media
      for (let i = 0; i < mediaItems.length; i++) {
        const m = mediaItems[i];
        if (m.url) {
          try { await servicesApi.addMedia(svcId, { url: m.url, type: "image", isCover: m.isCover }); }
          catch { warnings.push("فشل رفع بعض الصور"); }
        }
      }

      // Save addons
      for (const a of addonDrafts.filter(a => a.name.trim() && a.price)) {
        try {
          const addon = await addonsApi.create({
            name: a.name.trim(), nameEn: a.nameEn || undefined,
            description: a.description || undefined, image: a.imageUrl || undefined,
            price: a.price, type: a.type,
          });
          await servicesApi.linkAddon(svcId, { addonId: addon.data.id });
        } catch { warnings.push("فشل إضافة بعض الإضافات"); }
      }

      // Save questions
      for (let i = 0; i < questionDrafts.length; i++) {
        const q = questionDrafts[i];
        if (!q.question.trim()) continue;
        try {
          await questionsApi.create(svcId, {
            question: q.question.trim(), type: q.type,
            isRequired: q.isRequired, isPaid: q.isPaid,
            price: q.isPaid ? (q.price || "0") : "0",
            options: ["select", "multi", "checkbox"].includes(q.type) ? q.options.filter(Boolean) : [],
            sortOrder: i,
          });
        } catch { warnings.push("فشل إضافة بعض الأسئلة"); }
      }

      // Save components
      for (let i = 0; i < componentDrafts.length; i++) {
        const c = componentDrafts[i];
        if (!c.name.trim() && !c.inventoryItemId) continue;
        try {
          await servicesApi.addComponent(svcId, {
            sourceType: c.sourceType,
            inventoryItemId: c.inventoryItemId || undefined,
            name: c.name.trim() || undefined,
            quantity: parseFloat(c.quantity) || 1,
            unit: c.unit || "قطعة",
            unitCost: parseFloat(c.unitCost) || 0,
            sortOrder: i,
          });
        } catch { warnings.push("فشل إضافة بعض المكونات"); }
      }

      // Save staff
      for (const userId of pendingStaffIds) {
        try { await servicesApi.addStaff(svcId, { userId }); }
        catch { warnings.push("فشل تعيين بعض الموظفين"); }
      }

      // Show result
      const uniqueWarnings = [...new Set(warnings)];
      if (uniqueWarnings.length > 0) {
        toast.success("تم إنشاء الخدمة — " + uniqueWarnings.join("، "));
      } else {
        toast.success("تم إنشاء الخدمة بنجاح");
      }
      navigate(`/dashboard/services/${svcId}`);
    } catch (e: any) {
      setErrors({ _submit: e.message || "حدث خطأ أثناء الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  // ── Summary helpers ────────────────────────────────────────────────────────
  const selType = availableTypes.find(t => t.value === form.serviceType) || DEFAULT_SERVICE_TYPES.find(t => t.value === form.serviceType);
  const categoryName = categories.find((c: any) => c.id === form.categoryId)?.name;

  const formatPrice = (p: string) => {
    const n = Number(p);
    return isNaN(n) ? "—" : `${n.toLocaleString("ar-SA")} ر.س`;
  };

  const formatDuration = () => {
    if (!needsTiming) return null;
    const v = parseFloat(form.durationValue) || 0;
    if (v <= 0) return null;
    const labels: Record<DurationUnit, string> = { minute: "دقيقة", hour: "ساعة", day: "يوم" };
    return `${v} ${labels[form.durationUnit]}`;
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (refLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" className="min-h-screen pb-28">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">خدمة جديدة</h1>
            <p className="text-xs text-gray-400 mt-0.5">أنشئ خدمة جديدة خطوة بخطوة</p>
          </div>
        </div>
      </div>

      {/* ── Stepper ───────────────────────────────────────────────────── */}
      {step >= 1 && (
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between relative">
            {/* Background line */}
            <div className="absolute top-5 right-8 left-8 h-0.5 bg-gray-100 -z-0" />
            <div
              className="absolute top-5 right-8 h-0.5 bg-brand-500 -z-0 transition-all duration-500"
              style={{ width: `calc(${((step - 1) / (STEPS.length - 1)) * 100}% - 4rem)` }}
            />
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    // Allow going back to completed steps
                    if (s.id < step) setStep(s.id);
                  }}
                  disabled={s.id > step}
                  className="flex flex-col items-center gap-1.5 relative z-10"
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
                    isDone ? "bg-brand-500 border-brand-500 text-white" :
                    isActive ? "bg-white border-brand-500 text-brand-600 shadow-md" :
                    "bg-white border-[#eef2f6] text-gray-300",
                  )}>
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={clsx(
                    "text-[11px] font-medium whitespace-nowrap",
                    isActive ? "text-brand-600" : isDone ? "text-gray-600" : "text-gray-400",
                  )}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-4">

        {/* ══════════════════ STEP 0: TYPE PICKER ══════════════════════ */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-6 space-y-5">
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900 mb-1">ما نوع الخدمة؟</h2>
              <p className="text-sm text-gray-400">اختر النوع الأقرب لخدمتك — يحدد الحقول والإعدادات</p>
            </div>
            {errors.serviceType && <Err msg={errors.serviceType} />}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableTypes.map(t => {
                const Icon = t.icon;
                const active = form.serviceType === t.value;
                return (
                  <button key={t.value} type="button"
                    onClick={() => { setForm(f => ({ ...f, serviceType: t.value })); setErrors(p => ({ ...p, serviceType: "" })); }}
                    className={clsx(
                      "flex items-start gap-3 p-3.5 rounded-xl border text-right transition-all hover:border-brand-300 hover:bg-brand-50/30",
                      active ? "border-brand-500 bg-brand-50 shadow-sm" : "border-[#eef2f6] bg-white",
                    )}
                  >
                    <div className={clsx(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      active ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400",
                    )}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={clsx("text-sm font-semibold", active ? "text-brand-700" : "text-gray-800")}>{t.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-50"
                disabled={!form.serviceType}
              >
                التالي
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 1: BASICS ═══════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Type hint */}
            {typeConfig.hint && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-brand-50 border border-brand-100 rounded-xl text-sm text-brand-700">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5" />
                {typeConfig.hint}
              </div>
            )}

            {/* Service mode toggle */}
            {canToggleMode && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#eef2f6] rounded-xl">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">نوع التشغيل</p>
                    <p className="text-xs text-gray-400">
                      {isExecutionMode ? "وضع التنفيذ — مواد وفريق" : "وضع الحجز — توقيت وإتاحة"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5 bg-[#f1f5f9] rounded-xl p-0.5">
                  {([{ v: "booking" as const, l: "حجز" }, { v: "execution" as const, l: "تنفيذ" }]).map(m => (
                    <button key={m.v} type="button" onClick={() => setForm(f => ({ ...f, serviceMode: m.v }))}
                      className={clsx("px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                        form.serviceMode === m.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}>{m.l}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Basics Card */}
            <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">معلومات الخدمة</h3>
                  <p className="text-[11px] text-gray-400">البيانات الأساسية المطلوبة لإنشاء الخدمة</p>
                </div>
              </div>

              {/* Service type badge */}
              {selType && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-lg">
                    {(() => { const Icon = selType.icon; return <Icon className="w-3.5 h-3.5" />; })()}{selType.label}
                  </span>
                  {!typeFromUrl && (
                    <button onClick={() => setStep(0)} className="text-xs text-gray-400 hover:text-brand-500 underline transition-colors">تغيير</button>
                  )}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">اسم الخدمة / المنتج <span className="text-red-400">*</span></label>
                <input autoFocus value={form.name} onChange={upd("name")}
                  placeholder={SERVICE_TYPE_PLACEHOLDERS[form.serviceType] || "مثال: اكتب الاسم هنا..."}
                  className={clsx(iCls, errors.name && "border-red-300")} />
                <Err msg={errors.name} />
              </div>

              {/* Short description */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">
                  وصف مختصر <span className="text-gray-400 font-normal text-[11px]">(يظهر في البطاقات)</span>
                </label>
                <input value={form.shortDescription} onChange={upd("shortDescription")} maxLength={150}
                  placeholder="جملة تصف الخدمة بإيجاز..."
                  className={iCls} />
                <p className="text-[10px] text-gray-400 mt-0.5 text-left" dir="ltr">{form.shortDescription.length}/150</p>
              </div>

              {/* Price section */}
              <div className="flex flex-wrap gap-4">
                <div className="w-40">
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">
                    {form.servicePricingMode === "from_price" ? "يبدأ من (ر.س)" : "السعر (ر.س)"} <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min={0} value={form.basePrice} onChange={upd("basePrice")}
                    placeholder="0.00" dir="ltr"
                    className={clsx(iCls, errors.basePrice && "border-red-300")} />
                  <Err msg={errors.basePrice} />
                </div>

                {needsTiming && (
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">
                      {typeConfig.durationLabel || "المدة"} <span className="text-red-400">*</span>
                    </label>
                    <DurationInput
                      valueMinutes={(parseFloat(form.durationValue) || 0) * UNIT_MINS[form.durationUnit]}
                      onChange={mins => {
                        const { v, u } = parseDur(mins || 1);
                        setForm(f => ({ ...f, durationValue: v, durationUnit: u }));
                        setErrors(p => ({ ...p, durationValue: "" }));
                      }}
                    />
                    <Err msg={errors.durationValue} />
                  </div>
                )}

                {NEEDS_CAPACITY.has(form.serviceType) && (
                  <div className="w-36">
                    <label className="text-xs font-medium text-gray-700 block mb-1.5">الطاقة <span className="text-gray-400 font-normal text-[11px]">(أشخاص)</span></label>
                    <input type="number" min={1} value={form.maxCapacity} onChange={upd("maxCapacity")}
                      placeholder="∞" dir="ltr" className={iCls} />
                  </div>
                )}
              </div>

              {/* Pricing mode */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">طريقة التسعير</label>
                <div className="flex gap-0.5 bg-[#f1f5f9] rounded-xl p-0.5 w-fit">
                  {[{ v: "fixed", l: "سعر ثابت" }, { v: "from_price", l: "يبدأ من" }, { v: "variable", l: "متغير" }].map(pm => (
                    <button key={pm.v} type="button" onClick={() => setForm(f => ({ ...f, servicePricingMode: pm.v }))}
                      className={clsx("px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                        form.servicePricingMode === pm.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}>{pm.l}</button>
                  ))}
                </div>
              </div>

              {/* VAT */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none w-fit">
                <div className={clsx(
                  "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors shrink-0",
                  form.vatInclusive ? "bg-brand-500 border-brand-500" : "border-[#eef2f6] bg-white"
                )}>
                  {form.vatInclusive && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-none stroke-white stroke-2"><polyline points="1,4 4,7 9,1" /></svg>}
                </div>
                <input type="checkbox" checked={form.vatInclusive}
                  onChange={e => setForm(f => ({ ...f, vatInclusive: e.target.checked }))}
                  className="sr-only" />
                السعر شامل الضريبة
              </label>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 2: DETAILS ══════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Description & Category */}
            <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">التفاصيل والإعدادات</h3>
                  <p className="text-[11px] text-gray-400">إعدادات إضافية — يمكنك تخطي هذه الخطوة</p>
                </div>
              </div>

              {/* English name */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">الاسم بالإنجليزية <span className="text-gray-400 font-normal text-[11px]">(اختياري)</span></label>
                <input value={form.nameEn} onChange={upd("nameEn")} dir="ltr" placeholder="e.g. Garden Landscaping" className={iCls} />
              </div>

              {/* Full description */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">الوصف التفصيلي <span className="text-gray-400 font-normal text-[11px]">(اختياري)</span></label>
                <RichTextEditor
                  value={form.description}
                  onChange={v => upd("description")({ target: { value: v } } as any)}
                  placeholder="تفاصيل الخدمة، ما تشمل، الشروط..."
                  minHeight={100}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">القسم</label>
                {categories.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">لا توجد أقسام بعد</p>
                ) : (
                  <select value={form.categoryId} onChange={upd("categoryId")} className={clsx(iCls, "max-w-xs")}>
                    <option value="">بدون قسم</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {/* Deposit */}
              <div className="w-32">
                <label className="text-xs font-medium text-gray-700 block mb-1.5">العربون <span className="text-gray-400 font-normal text-[11px]">(%)</span></label>
                <input type="number" min={0} max={100} value={form.depositPercent} onChange={upd("depositPercent")}
                  placeholder="30" dir="ltr" className={iCls} />
              </div>
            </div>

            {/* Booking rules */}
            {typeConfig.showBookingRules && !isExecutionMode && (
              <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-0">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">قواعد الحجز</h3>
                    <p className="text-[11px] text-gray-400">إعدادات الإلغاء والحجز المسبق</p>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-700">إلغاء مجاني</span>
                    <DurationInput
                      valueMinutes={(parseFloat(form.cancellationFreeHours) || 0) * 60}
                      onChange={m => setForm(f => ({ ...f, cancellationFreeHours: String(Math.round(m / 60)) }))}
                      units={["minute", "hour", "day"]}
                      placeholder="24"
                    />
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-700">أقل حجز مسبق</span>
                    <DurationInput
                      valueMinutes={(parseFloat(form.minAdvanceHours) || 0) * 60}
                      onChange={m => setForm(f => ({ ...f, minAdvanceHours: String(Math.round(m / 60)) }))}
                      units={["minute", "hour", "day"]}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-700">أقصى حجز مسبق</span>
                    <DurationInput
                      valueMinutes={(parseFloat(form.maxAdvanceDays) || 0) * 1440}
                      onChange={m => setForm(f => ({ ...f, maxAdvanceDays: String(Math.round(m / 1440)) }))}
                      units={["day"]}
                      placeholder="∞"
                    />
                  </div>
                  {needsTiming && (
                    <>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-sm text-gray-700">فاصل قبل الموعد</span>
                        <DurationInput
                          valueMinutes={parseFloat(form.bufferBeforeMinutes) || 0}
                          onChange={m => setForm(f => ({ ...f, bufferBeforeMinutes: String(m) }))}
                          units={["minute", "hour"]}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-sm text-gray-700">فاصل بعد الموعد</span>
                        <DurationInput
                          valueMinutes={parseFloat(form.bufferAfterMinutes) || 0}
                          onChange={m => setForm(f => ({ ...f, bufferAfterMinutes: String(m) }))}
                          units={["minute", "hour"]}
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Visibility & Branches */}
            <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">الظهور والفروع</h3>
                  <p className="text-[11px] text-gray-400">أين تظهر هذه الخدمة</p>
                </div>
              </div>

              {/* Visibility toggles */}
              {[
                { key: "isFeatured" as const, label: "خدمة مميزة", desc: "تظهر في المميزات أولا" },
                { key: "isBookable" as const, label: "الحجز الإلكتروني", desc: "صفحة الحجز" },
                { key: "isVisibleInPOS" as const, label: "نقطة البيع", desc: "الكاشير" },
                { key: "isVisibleOnline" as const, label: "المتجر الإلكتروني", desc: "المتجر" },
              ].map(({ key, label, desc }) => (
                <label key={key}
                  className="flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer select-none hover:bg-[#f8fafc] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-400">{desc}</p>
                  </div>
                  <div className={clsx("relative w-9 h-5 rounded-full transition-colors", form[key] ? "bg-brand-500" : "bg-gray-200")}>
                    <div className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all", form[key] ? "right-0.5" : "left-0.5")} />
                    <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} className="sr-only" />
                  </div>
                </label>
              ))}

              {/* Branches */}
              {branches.length > 0 && (
                <div className="pt-2 border-t border-gray-50">
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">الفروع <span className="text-gray-400 font-normal">— فارغة = كل الفروع</span></label>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((b: any) => {
                      const active = allowedBranches.includes(b.id);
                      return (
                        <button key={b.id} type="button"
                          onClick={() => setAllowedBranches(p => active ? p.filter(x => x !== b.id) : [...p, b.id])}
                          className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            active ? "bg-brand-50 text-brand-700 border-brand-300" : "bg-gray-50 text-gray-500 border-[#eef2f6] hover:border-[#eef2f6]"
                          )}>
                          {b.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="pt-2 border-t border-gray-50">
                <label className="text-xs font-medium text-gray-600 block mb-2">الحالة عند الإنشاء</label>
                <div className="flex gap-0.5 bg-[#f1f5f9] rounded-xl p-0.5 w-fit">
                  {[{ v: "active", l: "نشطة" }, { v: "draft", l: "مسودة" }].map(s => (
                    <button key={s.v} type="button" onClick={() => setForm(f => ({ ...f, status: s.v }))}
                      className={clsx("px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                        form.status === s.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}>{s.l}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 3: MEDIA & COMPONENTS ══════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Images */}
            <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                  <Image className="w-4 h-4 text-pink-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">الصور</h3>
                  <p className="text-[11px] text-gray-400">أضف صور الخدمة — الأولى تكون الغلاف</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {mediaItems.map((m, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#eef2f6] group">
                    <img src={m.preview} alt="" className="w-full h-full object-cover" />
                    {m.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                    {!m.uploading && (
                      <button onClick={() => {
                        setMediaItems(p => {
                          const next = p.filter((_, j) => j !== i);
                          if (m.isCover && next.length > 0) next[0] = { ...next[0], isCover: true };
                          return next;
                        });
                      }} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-md flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                    {m.isCover && !m.uploading && (
                      <span className="absolute bottom-1 right-1 text-[9px] bg-brand-500 text-white px-1.5 py-0.5 rounded-md">غلاف</span>
                    )}
                    {!m.isCover && !m.uploading && (
                      <button onClick={() => setMediaItems(p => p.map((x, j) => ({ ...x, isCover: j === i })))}
                        className="absolute bottom-1 right-1 text-[9px] bg-black/40 hover:bg-brand-500 text-white px-1.5 py-0.5 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        غلاف
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-[#eef2f6] hover:border-brand-300 hover:bg-brand-50/20 transition-all">
                  <Upload className="w-5 h-5 text-gray-300 mb-1" />
                  <span className="text-[11px] text-gray-400">إضافة</span>
                </button>
              </div>
              {uploadErr && <p className="text-xs text-red-500 mt-1">{uploadErr}</p>}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => { Array.from(e.target.files || []).forEach(pickFile); e.target.value = ""; }} />
            </div>

            {/* Staff — only for execution/staff types */}
            {typeConfig.showStaff && (
              <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Package className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{isFlowerShop ? "المنسقون وفريق العمل" : "مقدمو الخدمة"}</h3>
                    <p className="text-[11px] text-gray-400">{isFlowerShop ? "المنسقين والمؤهلين لتجهيز وتصميم هذا العمل" : "الموظفون المؤهلون لتقديم هذه الخدمة"}</p>
                  </div>
                </div>
                {pendingStaffIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingStaffIds.map(uid => {
                      const m = staffMembers.find((x: any) => x.id === uid);
                      return (
                        <div key={uid} className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-xl text-sm">
                          <span>{m?.name || uid}</span>
                          <button onClick={() => setPendingStaffIds(p => p.filter(x => x !== uid))}
                            className="text-brand-400 hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {staffMembers.filter((m: any) => !pendingStaffIds.includes(m.id)).length > 0 && (
                  <select value="" onChange={e => { if (e.target.value) setPendingStaffIds(p => [...p, e.target.value]); }}
                    className={clsx(iCls, "max-w-xs")}>
                    <option value="">اختر موظفا...</option>
                    {staffMembers.filter((m: any) => !pendingStaffIds.includes(m.id)).map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                )}
                {staffMembers.length === 0 && pendingStaffIds.length === 0 && (
                  <p className="text-xs text-gray-400 py-1">لا يوجد موظفون — أضفهم من صفحة الفريق</p>
                )}
              </div>
            )}

            {/* Components */}
            {typeConfig.showComponents && (
              <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Package className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{typeConfig.componentTitle}</h3>
                      <p className="text-[11px] text-gray-400">{typeConfig.componentDesc}</p>
                    </div>
                  </div>
                  <button onClick={() => setComponentDrafts(d => [...d, { ...INIT_COMP }])}
                    className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                    <Plus className="w-3.5 h-3.5" /> إضافة
                  </button>
                </div>
                {componentDrafts.length === 0 && (
                  <p className="text-xs text-gray-400 py-1">لا توجد مكونات بعد</p>
                )}
                {componentDrafts.map((c, i) => (
                  <div key={i} className="border border-[#eef2f6] rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-0.5 bg-[#f1f5f9] rounded-lg p-0.5">
                        {(["manual", "inventory"] as const).map(t => (
                          <button key={t} type="button"
                            onClick={() => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, sourceType: t, inventoryItemId: "", name: "" } : x))}
                            className={clsx("px-3 py-1 rounded-md text-xs font-medium transition-all",
                              c.sourceType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                            )}>{t === "manual" ? "إدخال يدوي" : (isFlowerShop ? "من مستودع الورد" : "مخزون")}</button>
                        ))}
                      </div>
                      <button onClick={() => setComponentDrafts(d => d.filter((_, j) => j !== i))} className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      {c.sourceType === "inventory" ? (
                        products.length > 0 ? (
                          <select value={c.inventoryItemId}
                            onChange={e => {
                              const p = products.find((x: any) => x.id === e.target.value);
                              setComponentDrafts(d => d.map((x, j) => j === i
                                ? { ...x, inventoryItemId: e.target.value, name: p?.name || "", unit: p?.unit || "قطعة", unitCost: p?.unitCost ? String(p.unitCost) : x.unitCost }
                                : x));
                            }} className={iCls}>
                            <option value="">اختر منتجا...</option>
                            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        ) : <p className="text-xs text-gray-400">لا توجد منتجات في المخزون</p>
                      ) : (
                        <input value={c.name} placeholder="اسم المكون" onChange={e => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={iCls} />
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">الكمية</label>
                        <input type="number" min={0} step="0.1" value={c.quantity} dir="ltr"
                          onChange={e => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} className={iCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">الوحدة</label>
                        <input value={c.unit} placeholder="قطعة"
                          onChange={e => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} className={iCls} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">التكلفة</label>
                        <input type="number" min={0} value={c.unitCost} dir="ltr"
                          onChange={e => setComponentDrafts(d => d.map((x, j) => j === i ? { ...x, unitCost: e.target.value } : x))} className={iCls} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Addons — hidden in execution mode */}
            {typeConfig.showAddons && !isExecutionMode && (
              <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-teal-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">الإضافات</h3>
                      <p className="text-[11px] text-gray-400">خيارات إضافية يختارها العميل</p>
                    </div>
                  </div>
                  <button onClick={() => setAddonDrafts(d => [...d, { ...INIT_ADDON }])}
                    className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                    <Plus className="w-3.5 h-3.5" /> إضافة
                  </button>
                </div>
                {addonDrafts.length === 0 && (
                  <p className="text-xs text-gray-400 py-1">لا توجد إضافات بعد</p>
                )}
                {addonDrafts.map((a, i) => (
                  <div key={i} className="border border-[#eef2f6] rounded-xl p-3 space-y-2">
                    <div className="flex gap-3 items-start">
                      {a.imageUrl ? (
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-[#eef2f6] shrink-0">
                          <img src={a.imageUrl} className="w-full h-full object-cover" alt="" />
                          <button onClick={() => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, imageUrl: "" } : x))}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded flex items-center justify-center">
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => { setAddonUploadIdx(i); addonFileRef.current?.click(); }}
                          className="w-12 h-12 rounded-xl border-2 border-dashed border-[#eef2f6] hover:border-brand-300 flex items-center justify-center shrink-0">
                          <Upload className="w-3.5 h-3.5 text-gray-300" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <input value={a.name} placeholder="اسم الإضافة"
                          onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={iCls} />
                      </div>
                      <button onClick={() => setAddonDrafts(d => d.filter((_, j) => j !== i))}
                        className="mt-2 p-1 text-gray-300 hover:text-red-500 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <input type="number" min={0} value={a.price} placeholder="السعر (ر.س)" dir="ltr"
                          onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} className={iCls} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id={`addon-req-${i}`} checked={a.type === "required"}
                          onChange={e => setAddonDrafts(d => d.map((x, j) => j === i ? { ...x, type: e.target.checked ? "required" : "optional" } : x))}
                          className="w-4 h-4 rounded border-[#eef2f6] accent-brand-500 cursor-pointer" />
                        <label htmlFor={`addon-req-${i}`} className="text-sm text-gray-700 cursor-pointer">إلزامي</label>
                      </div>
                    </div>
                  </div>
                ))}
                <input ref={addonFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f && addonUploadIdx !== null) pickAddonImage(f, addonUploadIdx); e.target.value = ""; }} />
              </div>
            )}

            {/* Questions */}
            <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">أسئلة مخصصة</h3>
                    <p className="text-[11px] text-gray-400">أسئلة تُطرح على العميل عند الحجز</p>
                  </div>
                </div>
                <button onClick={() => setQuestionDrafts(d => [...d, { ...INIT_Q }])}
                  className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" /> سؤال
                </button>
              </div>
              {questionDrafts.length === 0 && (
                <p className="text-xs text-gray-400 py-1">لا توجد أسئلة بعد</p>
              )}
              {questionDrafts.map((q, i) => (
                <div key={i} className="border border-[#eef2f6] rounded-xl p-3 space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input value={q.question} placeholder="نص السؤال"
                        onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} className={iCls} />
                    </div>
                    <div className="relative shrink-0">
                      <button type="button" onClick={() => setQuestionPickerIdx(questionPickerIdx === i ? null : i)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#eef2f6] bg-white hover:border-brand-300 text-sm text-gray-700 min-w-[120px]">
                        {(() => { const t = QUESTION_TYPES.find(x => x.value === q.type); const Icon = t?.icon; return Icon ? <Icon className="w-3.5 h-3.5 text-gray-400" /> : null; })()}
                        <span className="flex-1 text-right text-xs">{QUESTION_TYPES.find(x => x.value === q.type)?.label || "اختر"}</span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>
                      {questionPickerIdx === i && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setQuestionPickerIdx(null)} />
                          <div className="absolute z-20 mt-1 right-0 p-2 bg-white border border-[#eef2f6] rounded-xl shadow-lg min-w-[240px]">
                            <div className="grid grid-cols-2 gap-1.5">
                              {QUESTION_TYPES.map(t => {
                                const Icon = t.icon;
                                return (
                                  <button key={t.value} type="button"
                                    onClick={() => { setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, type: t.value } : x)); setQuestionPickerIdx(null); }}
                                    className={clsx("flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition-all border",
                                      q.type === t.value ? "bg-brand-50 border-brand-300 text-brand-700" : "bg-gray-50 border-transparent hover:bg-gray-100 text-gray-600"
                                    )}>
                                    <Icon className="w-3.5 h-3.5" />{t.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <button type="button" onClick={() => setQuestionDrafts(d => d.filter((_, j) => j !== i))}
                      className="p-1.5 text-gray-300 hover:text-red-500 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isRequired: !x.isRequired } : x))}
                      className={clsx("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                        q.isRequired ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-400 border-[#eef2f6]"
                      )}>إلزامي</button>
                    <button type="button" onClick={() => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, isPaid: !x.isPaid } : x))}
                      className={clsx("px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                        q.isPaid ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-400 border-[#eef2f6]"
                      )}>بمقابل</button>
                    {q.isPaid && (
                      <input type="number" min={0} value={q.price} placeholder="الرسوم" dir="ltr"
                        onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                        className={clsx(iCls, "w-24 h-8 text-xs")} />
                    )}
                  </div>
                  {(q.type === "select" || q.type === "multi") && (
                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input value={opt} placeholder={`خيار ${oi + 1}`}
                            onChange={e => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, options: x.options.map((o, k) => k === oi ? e.target.value : o) } : x))}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, options: [...x.options, ""] } : x)); } }}
                            className={clsx(iCls, "flex-1 h-8 text-xs")} />
                          <button type="button" onClick={() => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, options: x.options.filter((_, k) => k !== oi) } : x))}
                            className="p-1 text-gray-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setQuestionDrafts(d => d.map((x, j) => j === i ? { ...x, options: [...x.options, ""] } : x))}
                        className="flex items-center gap-1 text-[11px] text-brand-500 hover:text-brand-700 font-medium">
                        <Plus className="w-3 h-3" /> خيار
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Execution template */}
            {isExecutionMode && templates.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Package className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">قالب التنفيذ</h3>
                    <p className="text-[11px] text-gray-400">خطة تجهيز تُطبق تلقائيا عند الطلب</p>
                  </div>
                </div>
                <select value={form.templateId} onChange={upd("templateId")} className={clsx(iCls, "max-w-sm")}>
                  <option value="">بدون خطة تجهيز</option>
                  {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ STEP 4: REVIEW ══════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-brand-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">مراجعة قبل الإنشاء</h3>
                  <p className="text-[11px] text-gray-400">تأكد من البيانات ثم اضغط إنشاء</p>
                </div>
              </div>

              {/* Summary sections */}
              <div className="space-y-3">
                {/* Basics */}
                <div className="flex items-start justify-between bg-[#f8fafc] rounded-xl p-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {selType && (() => { const Icon = selType.icon; return <Icon className="w-3.5 h-3.5 text-brand-500" />; })()}
                      <span className="text-xs font-medium text-gray-500">{selType?.label}</span>
                    </div>
                    <p className="text-base font-bold text-gray-900">{form.name || "—"}</p>
                    {form.shortDescription && <p className="text-xs text-gray-400">{form.shortDescription}</p>}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <span className="text-sm font-bold text-brand-600">{formatPrice(form.basePrice)}</span>
                      {formatDuration() && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">
                          <Clock className="w-3 h-3" />{formatDuration()}
                        </span>
                      )}
                      {form.depositPercent && Number(form.depositPercent) > 0 && (
                        <span className="text-xs text-gray-500">عربون {form.depositPercent}%</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-brand-500 hover:text-brand-700 underline shrink-0">تعديل</button>
                </div>

                {/* Details */}
                <div className="flex items-start justify-between bg-[#f8fafc] rounded-xl p-3.5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600">التفاصيل</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {categoryName && <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">{categoryName}</span>}
                      <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">
                        {form.status === "active" ? "نشطة" : "مسودة"}
                      </span>
                      {form.isBookable && <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">حجز</span>}
                      {form.isVisibleInPOS && <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">كاشير</span>}
                      {form.isVisibleOnline && <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">متجر</span>}
                      {form.vatInclusive && <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">شامل الضريبة</span>}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} className="text-xs text-brand-500 hover:text-brand-700 underline shrink-0">تعديل</button>
                </div>

                {/* Media & Extras */}
                <div className="flex items-start justify-between bg-[#f8fafc] rounded-xl p-3.5">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-600">الوسائط والمكونات</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">
                        {mediaItems.filter(m => m.url).length} صورة
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">
                        {componentDrafts.length} مكون
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">
                        {addonDrafts.filter(a => a.name.trim()).length} إضافة
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">
                        {questionDrafts.filter(q => q.question.trim()).length} سؤال
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded-full border border-[#eef2f6]">
                        {pendingStaffIds.length} موظف
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setStep(3)} className="text-xs text-brand-500 hover:text-brand-700 underline shrink-0">تعديل</button>
                </div>

                {/* Preview images */}
                {mediaItems.filter(m => m.url).length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {mediaItems.filter(m => m.url).map((m, i) => (
                      <img key={i} src={m.preview} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#eef2f6] shrink-0" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {errors._submit && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />{errors._submit}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Navigation Bar ─────────────────────────────────────── */}
      {step >= 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#eef2f6] py-3 px-6 z-10">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* Right side: back */}
            <button onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#eef2f6] text-sm font-medium text-gray-600 hover:bg-[#f8fafc] transition-colors">
              <ArrowRight className="w-4 h-4" />
              {step === 1 && !typeFromUrl ? "نوع الخدمة" : "السابق"}
            </button>

            {/* Center: step indicator */}
            <div className="flex items-center gap-1.5">
              {STEPS.map(s => (
                <div key={s.id} className={clsx(
                  "w-2 h-2 rounded-full transition-all",
                  step === s.id ? "bg-brand-500 w-5" : step > s.id ? "bg-brand-300" : "bg-gray-200"
                )} />
              ))}
            </div>

            {/* Left side: next/save */}
            {step < 4 ? (
              <button onClick={goNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm">
                التالي
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isFlowerShop && form.serviceType === "product" ? "اعتماد وإضافة للمتجر" : "إنشاء وحفظ"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
