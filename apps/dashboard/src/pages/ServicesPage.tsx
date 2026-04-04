import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Grid3X3, List, Eye, EyeOff, Copy, Trash2, Pencil, Star, Package, Globe, Loader2, AlertCircle, X, Download, ChevronDown, ChevronUp, Calendar, Wrench, MapPin, Home, Truck, UtensilsCrossed, Gift, ClipboardList } from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, categoriesApi, templatesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { PageHeader, Button } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useBusiness } from "@/hooks/useBusiness";
import { useOrgContext } from "@/hooks/useOrgContext";
import { toast } from "@/hooks/useToast";

const SERVICE_TYPES: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "appointment",      label: "بموعد",         icon: Calendar },
  { value: "execution",        label: "تنفيذ",          icon: Wrench },
  { value: "field_service",    label: "ميداني",         icon: MapPin },
  { value: "rental",           label: "تأجير",          icon: Home },
  { value: "event_rental",     label: "تأجير فعالية",   icon: Star },
  { value: "product",          label: "منتج",           icon: Package },
  { value: "product_shipping", label: "شحن",            icon: Truck },
  { value: "food_order",       label: "طعام",           icon: UtensilsCrossed },
  { value: "package",          label: "باقة",           icon: Gift },
  { value: "add_on",           label: "إضافة",          icon: Plus },
  { value: "project",          label: "مشروع",          icon: ClipboardList },
];

function TypePickerOverlay({ onSelect, onClose }: { onSelect: (type: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">نوع الخدمة</h2>
            <p className="text-xs text-gray-400 mt-0.5">اختر نوع الخدمة التي تريد إضافتها</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SERVICE_TYPES.map(t => {
            const TIcon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onSelect(t.value)}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border border-gray-100 bg-white text-center hover:border-brand-400 hover:bg-brand-50 transition-all"
              >
                <TIcon className="w-5 h-5 text-gray-500" />
                <span className="text-[11px] font-medium text-gray-600 leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    active: { label: "نشطة", class: "bg-green-50 text-green-600" },
    draft: { label: "مسودة", class: "bg-gray-100 text-gray-500" },
    paused: { label: "معلقة", class: "bg-amber-50 text-amber-600" },
    archived: { label: "مؤرشفة", class: "bg-red-50 text-red-500" },
  };
  const c = config[status] || config.draft;
  return <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-medium", c.class)}>{c.label}</span>;
}

const TYPE_META: Record<string, string> = {
  appointment:      "بموعد",
  execution:        "تنفيذ",
  field_service:    "ميداني",
  rental:           "تأجير",
  event_rental:     "تأجير ميداني",
  product:          "منتج",
  product_shipping: "شحن",
  food_order:       "طعام",
  package:          "باقة",
  add_on:           "إضافة",
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

export function ServicesPage({ embedded }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const biz = useBusiness();
  const { context } = useOrgContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
    if (!confirm("حذف \"" + name + "\"؟")) return;
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
        <PageHeader
          title={biz.terminology.catalog}
          description={`${services.length} ${biz.terminology.item}`}
          actions={
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                استيراد قالب
              </button>
              <Button icon={Plus} onClick={() => setShowTypePicker(true)}>{biz.terminology.newItem}</Button>
            </div>
          }
        />
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم..."
            className="w-full bg-white border border-gray-100 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={clsx(
                "px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                categoryFilter === cat ? "bg-brand-500 text-white shadow-sm" : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
              )}>{cat}</button>
          ))}
        </div>
        {presentTypes.length > 2 && (
          <div className="flex gap-1.5 overflow-x-auto">
            {presentTypes.map(t => {
              const label = t === "الكل" ? "الكل" : (TYPE_META[t] || t);
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={clsx(
                    "flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                    typeFilter === t ? "bg-gray-800 text-white shadow-sm" : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                  )}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
          <button onClick={() => setView("grid")} className={clsx("p-2 rounded-lg transition-colors", view === "grid" ? "bg-brand-500 text-white" : "text-gray-400 hover:bg-gray-50")}><Grid3X3 className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={clsx("p-2 rounded-lg transition-colors", view === "list" ? "bg-brand-500 text-white" : "text-gray-400 hover:bg-gray-50")}><List className="w-4 h-4" /></button>
        </div>
        {embedded && (
          <Button icon={Plus} onClick={() => setShowTypePicker(true)}>{biz.terminology.newItem}</Button>
        )}
      </div>

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
              {/* Checkbox overlay */}
              <div className="absolute top-2 left-2 z-10">
                <input type="checkbox" checked={selected.has(service.id)} onChange={() => toggleOne(service.id)} onClick={e => e.stopPropagation()} className="rounded" />
              </div>
              {/* Clickable image area */}
              <div
                className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center relative overflow-hidden cursor-pointer"
                onClick={() => navigate("/dashboard/services/" + service.id)}
              >
                {service.coverImage
                  ? <img src={service.coverImage} alt={service.name} className="w-full h-full object-cover" />
                  : <Package className="w-9 h-9 text-gray-300 group-hover:scale-110 transition-transform duration-300" />
                }
                <div className="absolute top-3 right-3"><StatusBadge status={service.status} /></div>
                {service.status === "active" && (
                  <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                      <Globe className="w-2.5 h-2.5" /> موقع
                    </span>
                  </div>
                )}
              </div>

              {/* Info area */}
              <div
                className="p-4 flex-1 cursor-pointer"
                onClick={() => navigate("/dashboard/services/" + service.id)}
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5 group-hover:text-brand-600 line-clamp-1 transition-colors">{service.name}</h3>
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-xs text-gray-400">{service.categoryName || "بدون تصنيف"}</p>
                  {service.serviceType && <TypeBadge type={service.serviceType} />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-brand-600 tabular-nums">
                    {Number(service.basePrice || 0).toLocaleString()}
                    <span className="text-xs font-normal text-gray-400"> ر.س</span>
                  </span>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {service.avgRating && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400" fill="currentColor" />
                        {Number(service.avgRating).toFixed(1)}
                      </span>
                    )}
                    <span className="tabular-nums">{service.totalBookings || 0} حجز</span>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="border-t border-gray-50 px-3 py-2 flex items-center justify-between gap-1">
                <button
                  onClick={() => navigate(`/dashboard/services/${service.id}/edit`)}
                  title="تعديل"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> تعديل
                </button>
                <button
                  onClick={() => handleDuplicate(service.id)}
                  title="تكرار"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> تكرار
                </button>
                <button
                  onClick={() => handleToggleWebsite(service)}
                  title={service.status === "active" ? "إخفاء من الموقع" : "إظهار في الموقع"}
                  className={clsx(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    service.status === "active"
                      ? "text-emerald-600 hover:bg-emerald-50"
                      : "text-gray-400 hover:bg-gray-100"
                  )}
                >
                  {service.status === "active"
                    ? <><Eye className="w-3.5 h-3.5" /> ظاهر</>
                    : <><EyeOff className="w-3.5 h-3.5" /> مخفي</>
                  }
                </button>
                <button
                  onClick={() => handleDelete(service.id, service.name)}
                  title="حذف"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "list" && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold uppercase tracking-wide">الخدمة</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">التصنيف</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">السعر</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">الحالة</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold uppercase tracking-wide">حجوزات</th>
                <th className="py-3 px-4 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((service: any) => (
                <tr
                  key={service.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors"
                  onClick={() => navigate("/dashboard/services/" + service.id)}
                >
                  <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(service.id)} onChange={() => toggleOne(service.id)} onClick={e => e.stopPropagation()} className="rounded" />
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="font-medium text-gray-900 line-clamp-1">{service.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{service.categoryName || "—"}</span>
                      {service.serviceType && <TypeBadge type={service.serviceType} />}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-gray-900 tabular-nums">{Number(service.basePrice || 0).toLocaleString()} ر.س</td>
                  <td className="py-3.5 px-4"><StatusBadge status={service.status} /></td>
                  <td className="py-3.5 px-4 text-gray-500 tabular-nums">{service.totalBookings || 0}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/dashboard/services/${service.id}/edit`)} title="تعديل" className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors"><Pencil className="w-3.5 h-3.5 text-brand-500" /></button>
                      <button onClick={() => handleDuplicate(service.id)} title="تكرار" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                      <button
                        onClick={() => handleToggleWebsite(service)}
                        title={service.status === "active" ? "إخفاء من الموقع" : "إظهار في الموقع"}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        {service.status === "active"
                          ? <Eye className="w-3.5 h-3.5 text-emerald-500" />
                          : <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                        }
                      </button>
                      <button onClick={() => handleDelete(service.id, service.name)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTypePicker && (
        <TypePickerOverlay
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
