import { useState, useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Grid3X3, List, Eye, EyeOff, Copy, Trash2, Pencil, Star, Package, Globe, Loader2, AlertCircle, X, Download, ChevronDown, ChevronUp, Calendar, Wrench, MapPin, Home, Truck, UtensilsCrossed, Gift, ClipboardList, MoreHorizontal, SlidersHorizontal, Clock } from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, categoriesApi, templatesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, confirmDialog } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useBusiness } from "@/hooks/useBusiness";
import { useOrgContext } from "@/hooks/useOrgContext";
import { toast } from "@/hooks/useToast";

const SERVICE_TYPES: Array<{ value: string; label: string; desc: string; icon: LucideIcon }> = [
  { value: "appointment",      label: "حجز موعد",      desc: "العميل يحجز وقتاً محدداً مع موظف",         icon: Calendar },
  { value: "execution",        label: "تنفيذ وصيانة",  desc: "تنفيذ عمل أو صيانة في موعد محدد",          icon: Wrench },
  { value: "field_service",    label: "خدمة ميدانية",  desc: "الموظف يزور العميل في موقعه",              icon: MapPin },
  { value: "rental",           label: "تأجير",          desc: "العميل يستأجر أصلاً لفترة محددة",          icon: Home },
  { value: "event_rental",     label: "تأجير فعالية",   desc: "تأجير قاعة أو مكان لحدث بعينه",           icon: Star },
  { value: "product",          label: "منتج",           desc: "منتج يُباع مباشرة عبر الكاشير أو الموقع", icon: Package },
  { value: "product_shipping", label: "منتج بشحن",     desc: "منتج يُشحن للعميل عبر المتجر الإلكتروني", icon: Truck },
  { value: "food_order",       label: "طعام ومشروبات", desc: "وجبة أو منتج غذائي يظهر في قائمة الطعام", icon: UtensilsCrossed },
  { value: "package",          label: "باقة",           desc: "مجموعة خدمات مجمّعة بسعر موحد",            icon: Gift },
  { value: "add_on",           label: "خيار إضافي",    desc: "خيار يختاره العميل مع خدمة أخرى",          icon: Plus },
  { value: "project",          label: "مشروع",          desc: "عمل طويل المدى يُنفَّذ على مراحل",         icon: ClipboardList },
];

const BUSINESS_TYPE_GROUPS: Record<string, string[]> = {
  salon:           ["appointment", "package", "product", "add_on"],
  barber:          ["appointment", "package", "product", "add_on"],
  spa:             ["appointment", "package", "product", "add_on"],
  fitness:         ["appointment", "package", "product", "add_on"],
  massage:         ["appointment", "package", "add_on"],
  photography:     ["appointment", "package", "add_on"],
  cafe:            ["food_order", "product", "package", "add_on"],
  restaurant:      ["food_order", "product", "package", "add_on"],
  bakery:          ["food_order", "product", "product_shipping", "package"],
  catering:        ["food_order", "package", "execution"],
  rental:          ["rental", "event_rental", "product", "add_on"],
  car_rental:      ["rental", "product", "add_on"],
  hotel:           ["rental", "event_rental", "add_on"],
  real_estate:     ["rental"],
  events:          ["event_rental", "rental", "package", "add_on"],
  event_organizer: ["event_rental", "package", "add_on"],
  workshop:        ["execution", "field_service", "product", "add_on"],
  maintenance:     ["execution", "field_service", "add_on"],
  logistics:       ["field_service", "product_shipping", "execution"],
  construction:    ["project", "execution", "field_service"],
  retail:          ["product", "product_shipping", "package", "add_on"],
  flower_shop:     ["product", "package", "add_on"],
  school:          ["product", "package", "appointment"],
};

function TypePickerOverlay({ onSelect, onClose, businessType }: {
  onSelect: (type: string) => void;
  onClose: () => void;
  businessType?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const allowedKeys = !showAll && businessType && BUSINESS_TYPE_GROUPS[businessType]
    ? BUSINESS_TYPE_GROUPS[businessType]
    : null;
  const visibleTypes = allowedKeys
    ? SERVICE_TYPES.filter(t => allowedKeys.includes(t.value))
    : SERVICE_TYPES;
  const isFiltered = !showAll && !!allowedKeys;
  const showAddOnNote = visibleTypes.some(t => t.value === "add_on");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">نوع الخدمة</h2>
            <p className="text-xs text-gray-400 mt-0.5">اختر النوع المناسب لنشاطك</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleTypes.map(t => {
              const TIcon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onSelect(t.value)}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-white text-right hover:border-brand-300 hover:bg-brand-50 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                    <TIcon className="w-5 h-5 text-gray-500 group-hover:text-brand-600 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{t.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {showAddOnNote && (
            <p className="text-[11px] text-gray-400 text-center pb-1">
              للإضافات المرتبطة بخدمات قائمة، استخدم تبويب «الإضافات المدفوعة»
            </p>
          )}
          {isFiltered && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-xs text-gray-400 hover:text-brand-500 transition-colors border-t border-gray-50"
            >
              عرض جميع أنواع الخدمات
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    active: { label: "منشور", class: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    draft: { label: "مسودة", class: "bg-gray-50 text-gray-500 border-gray-100" },
    paused: { label: "معلقة", class: "bg-amber-50 text-amber-600 border-amber-100" },
    archived: { label: "مؤرشفة", class: "bg-red-50 text-red-500 border-red-100" },
  };
  const c = config[status] || config.draft;
  return <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium border", c.class)}>{c.label}</span>;
}

/** Dropdown menu for row actions — matches ركاز-style three-dot menu */
function RowActionMenu({ service, onEdit, onDuplicate, onToggle, onDelete }: {
  service: any;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 w-40 text-sm">
          <button onClick={() => { onEdit(); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-right text-gray-700 hover:bg-gray-50 transition-colors">
            <Pencil className="w-3.5 h-3.5 text-gray-400" /> تعديل
          </button>
          <button onClick={() => { onDuplicate(); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-right text-gray-700 hover:bg-gray-50 transition-colors">
            <Copy className="w-3.5 h-3.5 text-gray-400" /> تكرار
          </button>
          <button onClick={() => { onToggle(); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-right text-gray-700 hover:bg-gray-50 transition-colors">
            {service.status === "active"
              ? <><EyeOff className="w-3.5 h-3.5 text-gray-400" /> إخفاء</>
              : <><Eye className="w-3.5 h-3.5 text-gray-400" /> نشر</>
            }
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <button onClick={() => { onDelete(); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-right text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> حذف
          </button>
        </div>
      )}
    </div>
  );
}

const TYPE_META: Record<string, string> = {
  appointment:      "حجز موعد",
  execution:        "تنفيذ وصيانة",
  field_service:    "خدمة ميدانية",
  rental:           "تأجير",
  event_rental:     "تأجير فعالية",
  product:          "منتج",
  product_shipping: "منتج بشحن",
  food_order:       "طعام ومشروبات",
  package:          "باقة",
  add_on:           "خيار إضافي",
  project:          "مشروع",
};

function TypeBadge({ type }: { type: string }) {
  const label = TYPE_META[type];
  if (!label) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-medium">
      {label}
    </span>
  );
}

function ImportTemplateModal({ businessType, onClose, onImported }: {
  businessType: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);

  useEffect(() => {
    templatesApi.getByType(businessType)
      .then(r => {
        setTemplate(r.data);
        setSelectedCategories(r.data.categories.map((c: any) => c.categoryName));
        setExpanded([r.data.categories[0]?.categoryName].filter(Boolean));
      })
      .catch(() => setTemplate(null))
      .finally(() => setLoading(false));
  }, [businessType]);

  const toggleCat = (cat: string) => setSelectedCategories(prev =>
    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
  );
  const toggleExpand = (cat: string) => setExpanded(prev =>
    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
  );

  const doImport = async () => {
    setImporting(true);
    try {
      const r = await templatesApi.import(businessType, {
        categories: selectedCategories,
        overwrite,
        status: "active",
      });
      toast.success(r.data.message);
      onImported();
      onClose();
    } catch {
      toast.error("فشل الاستيراد — حاول مجدداً");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">استيراد قالب جاهز</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? "جاري التحميل..." : template ? `${template.totalItems} خدمة متاحة` : "لا يوجد قالب"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            </div>
          ) : !template ? (
            <div className="text-center py-8 text-sm text-gray-500">
              لا توجد قوالب جاهزة لهذا النوع من النشاط
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{template.categories.length} تصنيف</span>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setSelectedCategories(template.categories.map((c: any) => c.categoryName))} className="text-brand-500 hover:underline">تحديد الكل</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setSelectedCategories([])} className="text-gray-400 hover:underline">إلغاء الكل</button>
                </div>
              </div>

              {template.categories.map((cat: any) => {
                const isSelected = selectedCategories.includes(cat.categoryName);
                const isExpanded = expanded.includes(cat.categoryName);
                return (
                  <div key={cat.categoryName} className={clsx("rounded-xl border transition-all", isSelected ? "border-brand-200 bg-brand-50" : "border-gray-100")}>
                    <div className="flex items-center gap-3 p-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleCat(cat.categoryName)} className="w-4 h-4 accent-brand-500 cursor-pointer" />
                      <span className="flex-1 text-sm font-medium text-gray-900">{cat.categoryName}</span>
                      <span className="text-xs text-gray-400">{cat.items.length} خدمات</span>
                      <button onClick={() => toggleExpand(cat.categoryName)} className="text-gray-400 hover:text-gray-600">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-3 pb-3 pt-1.5 space-y-1">
                        {cat.items.map((item: any) => (
                          <div key={item.name} className="flex items-center justify-between text-xs text-gray-600 bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                            <span>{item.name}</span>
                            <span className="text-gray-400">{item.basePrice > 0 ? `${item.basePrice} ر.س` : "مجاناً"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer pt-1">
                <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} className="w-4 h-4 accent-brand-500" />
                استبدال الخدمات المكررة (إن وجدت)
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && template && (
          <div className="flex gap-3 p-5 border-t border-gray-100">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50">
              إلغاء
            </button>
            <button
              onClick={doImport}
              disabled={importing || selectedCategories.length === 0}
              className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              استيراد {selectedCategories.length > 0 ? `(${selectedCategories.length})` : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ServicesPage({ embedded, defaultServiceType }: { embedded?: boolean; defaultServiceType?: string } = {}) {
  const navigate = useNavigate();
  const biz = useBusiness();
  const { context } = useOrgContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState(defaultServiceType ?? "الكل");
  const [view, setView] = useState<"grid" | "list">("list");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Auto-open type picker if ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowTypePicker(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const { data: servicesRes, loading, error, refetch } = useApi(() => servicesApi.list(), []);
  const { data: categoriesRes } = useApi(() => categoriesApi.list(true), []);
  const { mutate: deleteService } = useMutation((id: string) => servicesApi.delete(id));
  const { mutate: duplicateService } = useMutation((id: string) => servicesApi.duplicate(id));
  const { mutate: updateService } = useMutation(({ id, data }: { id: string; data: any }) => servicesApi.update(id, data));

  const services = servicesRes?.data || [];
  const categories = ["الكل", ...(categoriesRes?.data?.map((c: any) => c.name) || [])];

  const filtered = services.filter((s: any) => {
    if (search && !s.name?.includes(search)) return false;
    if (categoryFilter !== "الكل" && s.categoryName !== categoryFilter) return false;
    if (typeFilter !== "الكل" && s.serviceType !== typeFilter) return false;
    return true;
  });

  // Unique types present in this org's services
  const presentTypes: string[] = ["الكل", ...Array.from(new Set(services.map((s: any) => s.serviceType).filter(Boolean) as string[]))];

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirmDialog({ title: `حذف "${name}"؟`, message: "سيتم حذف الخدمة نهائياً", confirmLabel: "حذف", danger: true }))) return;
    await deleteService(id);
    refetch();
  };

  const handleDuplicate = async (id: string) => { await duplicateService(id); toast.success("تم نسخ الخدمة بنجاح"); refetch(); };
  const handleToggleWebsite = async (service: any) => {
    const newStatus = service.status === "active" ? "draft" : "active";
    await updateService({ id: service.id, data: { status: newStatus } });
    refetch();
  };

  const allIds = filtered.map((s: any) => s.id);
  const allSelected = allIds.length > 0 && allIds.every((id: string) => selected.has(id));
  const toggleOne = (id: string) => setSelected(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));

  const handleBulkDelete = async () => {
    if (!confirm(`حذف ${selected.size} خدمة؟ لا يمكن التراجع.`)) return;
    for (const id of selected) await deleteService(id);
    setSelected(new Set());
    refetch();
    toast.success(`تم حذف ${selected.size} خدمة`);
  };

  const handleBulkArchive = async () => {
    if (!confirm(`أرشفة ${selected.size} خدمة؟`)) return;
    for (const id of selected) await updateService({ id, data: { status: "archived" } });
    setSelected(new Set());
    refetch();
    toast.success(`تم أرشفة ${selected.size} خدمة`);
  };

  if (loading) return <PageSkeleton />;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">قائمة الخدمات</h1>
            <p className="text-sm text-gray-400 mt-0.5">يمكنك إنشاء خدماتك وإدارتها من هذه الصفحة</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              استيراد قالب
            </button>
            <Button icon={Plus} onClick={() => setShowTypePicker(true)}>{biz.terminology.newItem}</Button>
          </div>
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث عن خدمة"
            className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all placeholder-gray-400" />
        </div>
        <button
          onClick={() => setShowFilterMenu(p => !p)}
          className={clsx(
            "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors border",
            (categoryFilter !== "الكل" || typeFilter !== "الكل")
              ? "border-brand-200 bg-brand-50 text-brand-600"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          تصفية
          {(categoryFilter !== "الكل" || typeFilter !== "الكل") && (
            <span className="bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {(categoryFilter !== "الكل" ? 1 : 0) + (typeFilter !== "الكل" ? 1 : 0)}
            </span>
          )}
        </button>
        {embedded && (
          <Button icon={Plus} onClick={() => setShowTypePicker(true)}>{biz.terminology.newItem}</Button>
        )}
      </div>

      {/* Inline filter panel */}
      {showFilterMenu && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 mb-2">التصنيف</p>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                    categoryFilter === cat ? "bg-brand-500 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}>{cat}</button>
              ))}
            </div>
          </div>
          {presentTypes.length > 2 && (
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 mb-2">النوع</p>
              <div className="flex gap-1.5 flex-wrap">
                {presentTypes.map(t => {
                  const label = t === "الكل" ? "الكل" : (TYPE_META[t] || t);
                  return (
                    <button key={t} onClick={() => setTypeFilter(t)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                        typeFilter === t ? "bg-gray-800 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      )}>{label}</button>
                  );
                })}
              </div>
            </div>
          )}
          {(categoryFilter !== "الكل" || typeFilter !== "الكل") && (
            <button onClick={() => { setCategoryFilter("الكل"); setTypeFilter("الكل"); }} className="text-xs text-red-500 hover:underline self-end whitespace-nowrap">
              مسح الفلاتر
            </button>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-brand-700">تم تحديد {selected.size} خدمة</span>
          <div className="flex-1" />
          <button onClick={handleBulkArchive} className="text-sm px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
            أرشفة
          </button>
          <button onClick={handleBulkDelete} className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
            حذف
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            إلغاء
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">{search ? "لا توجد نتائج" : biz.terminology.itemEmpty}</h3>
          <p className="text-sm text-gray-400 mb-4">{search ? "جرب كلمات بحث مختلفة" : biz.terminology.catalogEmpty}</p>
          {!search && (
            <button onClick={() => setShowTypePicker(true)}
              className="bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4 inline ml-1" /> {biz.terminology.addItem}
            </button>
          )}
        </div>
      )}

      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((service: any) => (
            <div key={service.id} className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all group flex flex-col">
              {/* Clickable image area */}
              <div
                className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden cursor-pointer"
                onClick={() => navigate(`/dashboard/services/${service.id}/edit`)}
              >
                {service.coverImage
                  ? <img src={service.coverImage} alt={service.name} className="w-full h-full object-cover" />
                  : <Package className="w-9 h-9 text-gray-300 group-hover:scale-110 transition-transform duration-300" />
                }
                <div className="absolute top-3 right-3"><StatusBadge status={service.status} /></div>
              </div>

              {/* Info area */}
              <div
                className="p-4 flex-1 cursor-pointer"
                onClick={() => navigate(`/dashboard/services/${service.id}/edit`)}
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5 group-hover:text-brand-600 line-clamp-1 transition-colors">{service.name}</h3>
                <p className="text-xs text-gray-400 line-clamp-1 mb-2">{service.description || service.categoryName || "بدون وصف"}</p>
                <div className="flex items-center gap-1.5 mb-2">
                  {service.serviceType && <TypeBadge type={service.serviceType} />}
                  {service.duration && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {service.duration >= 60 ? `${Math.floor(service.duration / 60)} ساعات` : `${service.duration} دقيقة`}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-gray-900 tabular-nums">
                    {Number(service.basePrice || 0).toLocaleString("ar-SA")}
                    <span className="text-xs font-normal text-gray-400 mr-1">ر.س</span>
                  </span>
                </div>
              </div>

              {/* Action bar */}
              <div className="border-t border-gray-50 px-3 py-2 flex items-center justify-end">
                <RowActionMenu
                  service={service}
                  onEdit={() => navigate(`/dashboard/services/${service.id}/edit`)}
                  onDuplicate={() => handleDuplicate(service.id)}
                  onToggle={() => handleToggleWebsite(service)}
                  onDelete={() => handleDelete(service.id, service.name)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "list" && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_120px_100px_80px] gap-4 items-center border-b border-gray-100 bg-gray-50/50 px-5 py-3 text-xs font-semibold text-gray-400">
            <span>الخدمة</span>
            <span>نوع الخدمة</span>
            <span>السعر</span>
            <span>الحالة</span>
            <span className="text-center">إجراءات</span>
          </div>
          {/* Table body */}
          <div className="divide-y divide-gray-50">
            {filtered.map((service: any) => (
              <div
                key={service.id}
                className="grid grid-cols-[1fr_140px_120px_100px_80px] gap-4 items-center px-5 py-3.5 hover:bg-gray-50/60 cursor-pointer transition-colors"
                onClick={() => navigate(`/dashboard/services/${service.id}/edit`)}
              >
                {/* Service: image + name + description */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {service.coverImage
                      ? <img src={service.coverImage} alt={service.name} className="w-full h-full object-cover" />
                      : <Package className="w-6 h-6 text-gray-300" />
                    }
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{service.name}</h4>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{service.description || service.categoryName || "بدون وصف"}</p>
                  </div>
                </div>
                {/* Type */}
                <div className="flex items-center gap-2">
                  {service.serviceType && <TypeBadge type={service.serviceType} />}
                  {service.duration && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {service.duration >= 60 ? `${Math.floor(service.duration / 60)} ساعات` : `${service.duration} دقيقة`}
                    </span>
                  )}
                </div>
                {/* Price */}
                <div className="tabular-nums">
                  <span className="font-semibold text-gray-900 text-sm">
                    {Number(service.basePrice || 0).toLocaleString("ar-SA")}
                  </span>
                  <span className="text-xs text-gray-400 mr-1">ر.س</span>
                </div>
                {/* Status */}
                <StatusBadge status={service.status} />
                {/* Actions */}
                <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                  <RowActionMenu
                    service={service}
                    onEdit={() => navigate(`/dashboard/services/${service.id}/edit`)}
                    onDuplicate={() => handleDuplicate(service.id)}
                    onToggle={() => handleToggleWebsite(service)}
                    onDelete={() => handleDelete(service.id, service.name)}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Footer: total count */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/30">
            <span className="text-xs text-gray-400">إجمالي الخدمات: {filtered.length}</span>
          </div>
        </div>
      )}

      {showTypePicker && (
        <TypePickerOverlay
          businessType={context?.businessType}
          onSelect={type => { setShowTypePicker(false); navigate(`/dashboard/services/new?type=${type}`); }}
          onClose={() => setShowTypePicker(false)}
        />
      )}

      {showImportModal && (
        <ImportTemplateModal
          businessType={context?.businessType || "events"}
          onClose={() => setShowImportModal(false)}
          onImported={refetch}
        />
      )}
    </div>
  );
}
