/**
 * FlowerCatalogPage — كتالوج الخدمات الميدانية
 * خدمات الكوش + خطط التجهيز + الإضافات + الفئات في صفحة واحدة مترابطة
 */
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, MapPin, Package, Puzzle, Tag, Pencil, Trash2, Search,
  Clock, CheckCircle2, AlertTriangle, Eye, Copy, Filter, X,
  ChevronLeft, Banknote, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, eventPackagesApi, addonsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, confirmDialog } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { toast } from "@/hooks/useToast";
import { EventPackagesPage } from "./EventPackagesPage";
import { AddonsPage } from "./AddonsPage";
import { CategoriesPage } from "./CategoriesPage";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "",         label: "جميع الحالات" },
  { value: "active",   label: "نشطة" },
  { value: "draft",    label: "مسودة" },
  { value: "inactive", label: "غير نشطة" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active:   { label: "نشطة",     color: "bg-green-50 text-green-700",  dot: "bg-green-500" },
  draft:    { label: "مسودة",    color: "bg-gray-100 text-gray-500",   dot: "bg-gray-400" },
  inactive: { label: "غير نشطة", color: "bg-red-50 text-red-500",      dot: "bg-red-400" },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: number | string | null | undefined): string {
  if (price == null) return "—";
  const n = Number(price);
  return isNaN(n) ? "—" : `${n.toLocaleString("ar-SA")} ر.س`;
}

function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} س ${m} د` : `${h} ساعة`;
  }
  return `${minutes} دقيقة`;
}

// ── ServiceCard ────────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onTemplate,
}: {
  service: any;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTemplate: () => void;
}) {
  const status = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.draft;
  const duration = formatDuration(service.duration);

  return (
    <div
      onClick={onView}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:border-brand-200 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Row 1: Status + Actions */}
      <div className="flex items-center justify-between gap-2">
        <span className={clsx(
          "inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full",
          status.color,
        )}>
          <span className={clsx("w-1.5 h-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onView} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="عرض التفاصيل">
            <Eye className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="تعديل">
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={onDuplicate} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="تكرار">
            <Copy className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {service.isDeletable !== false ? (
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="حذف">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          ) : (
            <button disabled className="p-1.5 rounded-lg opacity-30 cursor-not-allowed" title="مرتبطة بطلب او قالب">
              <Trash2 className="w-3.5 h-3.5 text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Name + Description */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-sm truncate">{service.name}</h3>
        {service.shortDescription && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{service.shortDescription}</p>
        )}
      </div>

      {/* Row 3: Readiness */}
      {service.executionReady === true && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 w-fit">
          <CheckCircle2 className="w-3 h-3" />جاهزة للتنفيذ
        </span>
      )}
      {service.executionReady === false && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 w-fit">
          <AlertTriangle className="w-3 h-3" />تحتاج استكمال
        </span>
      )}

      {/* Row 4: Price + Duration + Template */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-50 flex-wrap">
        <span className="flex items-center gap-1 text-sm font-bold text-gray-900">
          <Banknote className="w-3.5 h-3.5 text-gray-300" />
          {formatPrice(service.basePrice)}
        </span>
        {duration && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />{duration}
          </span>
        )}
        {service.template ? (
          <button
            onClick={e => { e.stopPropagation(); onTemplate(); }}
            className="flex items-center gap-1 mr-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
          >
            <Package className="w-3 h-3" />
            {service.template.name}
          </button>
        ) : (
          <span className="flex items-center gap-1 mr-auto text-[11px] text-gray-300">
            <Package className="w-3 h-3" />بدون خطة
          </span>
        )}
      </div>
    </div>
  );
}

// ── Catalog Skeleton ─────────────────────────────────────────────────────────

function CatalogSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <div className="h-7 bg-gray-100 rounded-lg w-12" />
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-5 bg-gray-100 rounded w-20" />
            </div>
            <div className="h-5 bg-gray-100 rounded w-40" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="flex gap-3 pt-3 border-t border-gray-50">
              <div className="h-5 bg-gray-100 rounded w-24" />
              <div className="h-5 bg-gray-100 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function FlowerCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get("tab") || "services";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // ── Data ────────────────────────────────────────────────────────────
  const { data: svcRes, loading: svcLoading, error: svcError, refetch: refetchSvc } = useApi(
    () => servicesApi.list({ serviceType: "field_service" }), [],
  );
  const { data: tplRes } = useApi(() => eventPackagesApi.list(), []);
  const { data: addRes } = useApi(() => addonsApi.list(), []);

  // ── Mutations ───────────────────────────────────────────────────────
  const { mutate: deleteService } = useMutation((id: string) => servicesApi.delete(id));
  const { mutate: duplicateService } = useMutation((id: string) => servicesApi.duplicate(id));

  const services: any[] = svcRes?.data ?? [];
  const templates: any[] = tplRes?.data ?? [];
  const addons: any[]   = addRes?.data ?? [];

  // ── Filtering ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = services;
    if (statusFilter) {
      result = result.filter(s => s.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.shortDescription?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [services, statusFilter, search]);

  // ── Status counts ───────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, draft: 0, inactive: 0 };
    for (const s of services) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    return counts;
  }, [services]);

  // ── Actions ─────────────────────────────────────────────────────────
  const handleDelete = async (svc: any) => {
    const ok = await confirmDialog({
      title: `حذف "${svc.name}"؟`,
      message: "سيتم أرشفة الخدمة. لن تُحذف المشاريع المرتبطة بها.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteService(svc.id);
      toast.success(`تم حذف "${svc.name}"`);
      refetchSvc();
    } catch {
      toast.error("فشل حذف الخدمة");
    }
  };

  const handleDuplicate = async (svc: any) => {
    try {
      await duplicateService(svc.id);
      toast.success(`تم تكرار "${svc.name}"`);
      refetchSvc();
    } catch {
      toast.error("فشل تكرار الخدمة");
    }
  };

  // ── Tab config with counts ──────────────────────────────────────────
  const TABS = [
    { id: "services",   label: "الخدمات الميدانية", icon: MapPin,   count: services.length },
    { id: "templates",  label: "خطط التجهيز",       icon: Package,  count: templates.length },
    { id: "addons",     label: "الإضافات",          icon: Puzzle,   count: addons.length },
    { id: "categories", label: "الفئات",            icon: Tag,      count: undefined },
  ];

  const setTab = (id: string) => setSearchParams({ tab: id });
  const hasFilters = search || statusFilter;

  return (
    <div dir="rtl" className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">كتالوج الخدمات الميدانية</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            ادارة الخدمات وخطط التجهيز والإضافات والفئات
          </p>
        </div>
        {tab === "services" && (
          <Button icon={Plus} onClick={() => navigate("/dashboard/services/new?type=field_service")}>
            خدمة جديدة
          </Button>
        )}
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "اجمالي الخدمات", value: services.length,   cls: "text-brand-600",  border: "border-brand-100",  bg: "bg-brand-50/50" },
          { label: "نشطة",           value: statusCounts.active,   cls: "text-green-600",  border: "border-green-100",  bg: "bg-green-50/50" },
          { label: "خطة تجهيز",     value: templates.length,  cls: "text-purple-600", border: "border-purple-100", bg: "bg-purple-50/50" },
          { label: "إضافة",          value: addons.length,     cls: "text-amber-600",  border: "border-amber-100",  bg: "bg-amber-50/50" },
        ].map(s => (
          <div key={s.label} className={clsx("flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white", s.border)}>
            <span className={clsx("text-2xl font-black", s.cls)}>{s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-2xl w-fit overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== undefined && (
              <span className={clsx(
                "text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                tab === t.id ? "bg-brand-100 text-brand-600" : "bg-gray-200/70 text-gray-500",
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Services Tab ──────────────────────────────────────────────── */}
      {tab === "services" && (
        <div className="space-y-4">
          {/* Search & Filters bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث بالاسم او الوصف..."
                className="w-full border border-gray-200 rounded-xl pr-9 pl-3 h-10 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    statusFilter === opt.value
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300",
                  )}
                >
                  {opt.label}
                  {opt.value && (
                    <span className="mr-1 opacity-75">
                      ({statusCounts[opt.value] ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(""); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />مسح الفلاتر
              </button>
            )}
          </div>

          {/* Loading */}
          {svcLoading && <CatalogSkeleton />}

          {/* Error */}
          {svcError && !svcLoading && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-600 mb-1">حدث خطأ في تحميل الخدمات</p>
              <p className="text-xs text-red-400 mb-4">تحقق من اتصالك بالإنترنت وحاول مرة اخرى</p>
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refetchSvc}>
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* Empty */}
          {!svcLoading && !svcError && filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-gray-300" />
              </div>
              {hasFilters ? (
                <>
                  <p className="text-sm font-semibold text-gray-700 mb-1">لا توجد نتائج</p>
                  <p className="text-xs text-gray-400 mb-4">جرب تغيير الفلاتر او كلمة البحث</p>
                  <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); }}>
                    مسح الفلاتر
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-700 mb-1">لا توجد خدمات ميدانية بعد</p>
                  <p className="text-xs text-gray-400 mb-4">أضف خدمتك الأولى لتبدأ في تقديم خدماتك الميدانية</p>
                  <Button icon={Plus} onClick={() => navigate("/dashboard/services/new?type=field_service")}>
                    إضافة خدمة ميدانية
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Services Grid */}
          {!svcLoading && !svcError && filtered.length > 0 && (
            <>
              {/* Result count */}
              {hasFilters && (
                <p className="text-xs text-gray-400">
                  عرض {filtered.length} من {services.length} خدمة
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(svc => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    onView={() => navigate(`/dashboard/services/${svc.id}`)}
                    onEdit={() => navigate(`/dashboard/services/${svc.id}/edit`)}
                    onDuplicate={() => handleDuplicate(svc)}
                    onDelete={() => handleDelete(svc)}
                    onTemplate={() => setTab("templates")}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Other Tabs ──────────────────────────────────────────────────── */}
      {tab === "templates"  && <EventPackagesPage embedded />}
      {tab === "addons"     && <AddonsPage />}
      {tab === "categories" && <CategoriesPage />}
    </div>
  );
}
