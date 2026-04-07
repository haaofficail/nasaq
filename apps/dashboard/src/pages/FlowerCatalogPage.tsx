/**
 * FlowerCatalogPage — لوحة تشغيل الخدمات الميدانية
 * إدارة الخدمات + خطط التجهيز + الإضافات والفئات في صفحة واحدة تشغيلية
 */
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, MapPin, Package, Pencil, Trash2, Search,
  Clock, CheckCircle2, AlertTriangle, Copy, X,
  Banknote, RefreshCw, Settings, BoxesIcon, ClipboardList,
} from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, eventPackagesApi, addonsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, confirmDialog } from "@/components/ui";

import { toast } from "@/hooks/useToast";
import { EventPackagesPage } from "./EventPackagesPage";
import { AddonsPage } from "./AddonsPage";
import { CategoriesPage } from "./CategoriesPage";

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "",         label: "الكل" },
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

// ── Operational Indicators ─────────────────────────────────────────────────────

function IndicatorDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" title={label}>
      <span className={clsx(
        "w-2 h-2 rounded-full shrink-0",
        active ? "bg-green-500" : "bg-gray-200",
      )} />
      <span className={active ? "text-gray-600" : "text-gray-300"}>{label}</span>
    </span>
  );
}

// ── ServiceCard — Operational ──────────────────────────────────────────────────

function ServiceCard({
  service,
  onEdit,
  onDuplicate,
  onDelete,
  onLinkInventory,
  onLinkTemplate,
}: {
  service: any;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLinkInventory: () => void;
  onLinkTemplate: () => void;
}) {
  const status = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.draft;
  const duration = formatDuration(service.duration);
  const hasInventory = !!(service.components?.length || service.hasInventory);
  const hasTemplate = !!service.template;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2.5 hover:border-brand-200 transition-all group">
      {/* Row 1: Name + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-gray-900 text-sm truncate">{service.name}</h3>
          {service.shortDescription && (
            <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{service.shortDescription}</p>
          )}
        </div>
        <span className={clsx(
          "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
          status.color,
        )}>
          <span className={clsx("w-1.5 h-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      {/* Row 2: Operational indicators */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1 text-sm font-bold text-gray-900">
          <Banknote className="w-3.5 h-3.5 text-gray-300" />
          {formatPrice(service.basePrice)}
        </span>
        {duration && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />{duration}
          </span>
        )}
        {service.executionReady === true && (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" />جاهزة
          </span>
        )}
        {service.executionReady === false && (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle className="w-3 h-3" />ناقصة
          </span>
        )}
      </div>

      {/* Row 3: Linkage status */}
      <div className="flex items-center gap-4 py-1.5 border-t border-gray-50">
        <IndicatorDot active={hasInventory} label="مخزون" />
        <IndicatorDot active={hasTemplate} label="خطة تجهيز" />
        {hasTemplate && service.template?.name && (
          <span className="text-[10px] text-purple-500 truncate mr-auto" title={service.template.name}>
            {service.template.name}
          </span>
        )}
      </div>

      {/* Row 4: Quick Actions — always visible */}
      <div className="flex items-center gap-1 pt-1.5 border-t border-gray-50" onClick={e => e.stopPropagation()}>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          title="تعديل"
        >
          <Pencil className="w-3 h-3" />تعديل
        </button>
        <button
          onClick={onDuplicate}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          title="تكرار"
        >
          <Copy className="w-3 h-3" />تكرار
        </button>
        <button
          onClick={onLinkInventory}
          className={clsx(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
            hasInventory
              ? "text-green-600 hover:bg-green-50"
              : "text-gray-400 hover:bg-gray-100",
          )}
          title="ربط مخزون"
        >
          <BoxesIcon className="w-3 h-3" />مخزون
        </button>
        <button
          onClick={onLinkTemplate}
          className={clsx(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
            hasTemplate
              ? "text-purple-600 hover:bg-purple-50"
              : "text-gray-400 hover:bg-gray-100",
          )}
          title="ربط قالب تجهيز"
        >
          <ClipboardList className="w-3 h-3" />تجهيز
        </button>
        <div className="mr-auto">
          {service.isDeletable !== false ? (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="حذف"
            >
              <Trash2 className="w-3 h-3 text-red-300 hover:text-red-500" />
            </button>
          ) : (
            <button disabled className="p-1.5 rounded-lg opacity-30 cursor-not-allowed" title="مرتبطة بطلب او قالب">
              <Trash2 className="w-3 h-3 text-gray-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Catalog Skeleton ─────────────────────────────────────────────────────────

function CatalogSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 space-y-2">
            <div className="h-6 bg-gray-100 rounded-lg w-10" />
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-100 rounded w-32" />
              <div className="h-4 bg-gray-100 rounded-full w-14" />
            </div>
            <div className="flex gap-3">
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="h-4 bg-gray-100 rounded w-14" />
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-50">
              <div className="h-3 bg-gray-100 rounded w-12" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
            <div className="flex gap-1 pt-2 border-t border-gray-50">
              <div className="h-6 bg-gray-100 rounded w-12" />
              <div className="h-6 bg-gray-100 rounded w-12" />
              <div className="h-6 bg-gray-100 rounded w-12" />
              <div className="h-6 bg-gray-100 rounded w-12" />
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

  // ── Readiness counts ───────────────────────────────────────────────
  const readyCounts = useMemo(() => {
    let ready = 0;
    let incomplete = 0;
    for (const s of services) {
      if (s.executionReady === true) ready++;
      else if (s.executionReady === false) incomplete++;
    }
    return { ready, incomplete };
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

  // ── Tab config — 3 tabs: services, templates, settings (merged addons+categories) ──
  const TABS = [
    { id: "services",  label: "الخدمات",     icon: MapPin,   count: services.length,  desc: "إدارة وتشغيل" },
    { id: "templates", label: "خطط التجهيز", icon: Package,  count: templates.length, desc: "قوالب العمل" },
    { id: "settings",  label: "الإضافات والفئات", icon: Settings, count: addons.length, desc: "إعدادات" },
  ];

  const setTab = (id: string) => setSearchParams({ tab: id });
  const hasFilters = search || statusFilter;

  // ── Settings sub-tab ──
  const [settingsSubTab, setSettingsSubTab] = useState<"addons" | "categories">("addons");

  return (
    <div dir="rtl" className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">لوحة تشغيل الخدمات</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            إدارة الخدمات الميدانية وخطط التجهيز والإعدادات
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "services" && (
            <Button icon={Plus} onClick={() => navigate("/dashboard/services/new?type=field_service")}>
              خدمة جديدة
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats strip — compact ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: "الخدمات",     value: services.length,         cls: "text-brand-600",  border: "border-brand-100" },
          { label: "نشطة",       value: statusCounts.active,      cls: "text-green-600",  border: "border-green-100" },
          { label: "جاهزة للتنفيذ", value: readyCounts.ready,     cls: "text-emerald-600", border: "border-emerald-100" },
          { label: "خطط تجهيز",  value: templates.length,         cls: "text-purple-600", border: "border-purple-100" },
          { label: "إضافات",     value: addons.length,            cls: "text-amber-600",  border: "border-amber-100" },
        ].map(s => (
          <div key={s.label} className={clsx("flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-white", s.border)}>
            <span className={clsx("text-xl font-black leading-none", s.cls)}>{s.value}</span>
            <span className="text-[11px] text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs — 3 clear tabs ──────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== undefined && (
              <span className={clsx(
                "text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center",
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
        <div className="space-y-3">
          {/* Search & Filters bar — compact inline */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث..."
                className="w-full border border-gray-200 rounded-lg pr-9 pl-3 h-9 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all bg-white"
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

            {/* Status filter pills — compact */}
            <div className="flex items-center gap-1">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
                    statusFilter === opt.value
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-brand-300",
                  )}
                >
                  {opt.label}
                  {opt.value && (
                    <span className="mr-1 opacity-75">
                      {statusCounts[opt.value] ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(""); }}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />مسح
              </button>
            )}

            {/* Result count — inline */}
            {hasFilters && !svcLoading && (
              <span className="text-[11px] text-gray-400 mr-auto">
                {filtered.length} / {services.length}
              </span>
            )}
          </div>

          {/* Loading */}
          {svcLoading && <CatalogSkeleton />}

          {/* Error */}
          {svcError && !svcLoading && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-medium text-red-600 mb-1">خطأ في تحميل الخدمات</p>
              <p className="text-xs text-red-400 mb-3">تحقق من الاتصال وحاول مرة اخرى</p>
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refetchSvc}>
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* Empty */}
          {!svcLoading && !svcError && filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-gray-300" />
              </div>
              {hasFilters ? (
                <>
                  <p className="text-sm font-semibold text-gray-700 mb-1">لا توجد نتائج</p>
                  <p className="text-xs text-gray-400 mb-3">جرب تغيير الفلاتر او البحث</p>
                  <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); }}>
                    مسح الفلاتر
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-700 mb-1">لا توجد خدمات ميدانية بعد</p>
                  <p className="text-xs text-gray-400 mb-3">أضف خدمتك الأولى</p>
                  <Button icon={Plus} onClick={() => navigate("/dashboard/services/new?type=field_service")}>
                    إضافة خدمة
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Services Grid — 4 columns on xl for tighter layout */}
          {!svcLoading && !svcError && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(svc => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  onEdit={() => navigate(`/dashboard/services/${svc.id}/edit`)}
                  onDuplicate={() => handleDuplicate(svc)}
                  onDelete={() => handleDelete(svc)}
                  onLinkInventory={() => navigate(`/dashboard/services/${svc.id}/edit?section=components`)}
                  onLinkTemplate={() => navigate(`/dashboard/services/${svc.id}/edit?section=template`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Templates Tab ──────────────────────────────────────────────── */}
      {tab === "templates" && <EventPackagesPage embedded />}

      {/* ── Settings Tab (merged: addons + categories) ──────────────────── */}
      {tab === "settings" && (
        <div className="space-y-3">
          <div className="flex gap-1 border-b border-gray-100 pb-2">
            <button
              onClick={() => setSettingsSubTab("addons")}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                settingsSubTab === "addons"
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              الإضافات
              <span className={clsx(
                "mr-1.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5",
                settingsSubTab === "addons" ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-500",
              )}>
                {addons.length}
              </span>
            </button>
            <button
              onClick={() => setSettingsSubTab("categories")}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                settingsSubTab === "categories"
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              الفئات
            </button>
          </div>
          {settingsSubTab === "addons" && <AddonsPage />}
          {settingsSubTab === "categories" && <CategoriesPage />}
        </div>
      )}
    </div>
  );
}
