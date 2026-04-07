/**
 * FlowerCatalogPage — قسم التأجير الميداني المتكامل
 * خدمات الكوش + قوالبها + ملحقاتها في صفحة واحدة مترابطة
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, MapPin, Package, Puzzle, Tag, Pencil, Trash2, Search, Loader2, AlertCircle, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, eventPackagesApi, addonsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { EventPackagesPage } from "./EventPackagesPage";
import { AddonsPage } from "./AddonsPage";
import { CategoriesPage } from "./CategoriesPage";

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "services",   label: "الخدمات",  icon: MapPin },
  { id: "templates",  label: "خطط التجهيز",  icon: Package },
  { id: "addons",     label: "الإضافات", icon: Puzzle },
  { id: "categories", label: "الفئات",   icon: Tag },
];

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  draft:    "bg-gray-100 text-gray-500",
  inactive: "bg-red-100 text-red-500",
};
const STATUS_LABELS: Record<string, string> = {
  active: "نشط", draft: "مسودة", inactive: "غير نشط",
};

// ── ServiceCard ────────────────────────────────────────────────────────────────

function ServiceCard({
  service, onEdit, onTemplate, onDelete,
}: {
  service: any;
  onEdit: () => void;
  onTemplate: () => void;
  onDelete: () => void;  // فقط إذا isDeletable=true
}) {
  const price = service.basePrice != null
    ? `${Number(service.basePrice).toLocaleString("ar-SA")} ر.س`
    : "—";

  const duration = service.duration
    ? service.duration >= 60
      ? `${Math.round(service.duration / 60)} س`
      : `${service.duration} د`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:border-brand-200 transition-colors group">
      {/* Row 1: name + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{service.name}</p>
          {service.shortDescription && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{service.shortDescription}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            title="تعديل"
          >
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {service.isDeletable ? (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
              title="أرشفة الخدمة"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          ) : (
            <button
              disabled
              className="p-1.5 rounded-lg opacity-40 cursor-not-allowed shrink-0"
              title="لا يمكن حذف هذا العنصر لأنه مستخدم في طلب أو قالب"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: status + readiness badge + price + duration */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={clsx(
          "text-[11px] font-medium px-2 py-0.5 rounded-full",
          STATUS_COLORS[service.status] ?? "bg-gray-100 text-gray-500"
        )}>
          {STATUS_LABELS[service.status] ?? service.status}
        </span>
        {/* Execution readiness badge — shown when field is available */}
        {service.executionReady === true && (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />جاهزة للتنفيذ
          </span>
        )}
        {service.executionReady === false && (
          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="w-3 h-3" />ناقصة
          </span>
        )}
        <span className="text-sm font-bold text-gray-900 mr-auto">{price}</span>
        {duration && (
          <span className="flex items-center gap-0.5 text-xs text-gray-400">
            <Clock className="w-3 h-3" />{duration}
          </span>
        )}
      </div>

      {/* Row 3: template link */}
      {service.template ? (
        <button
          onClick={onTemplate}
          className="flex items-center gap-1.5 w-fit bg-purple-50 border border-purple-100 text-purple-700 rounded-xl px-2.5 py-1 text-xs font-medium hover:bg-purple-100 transition-colors"
        >
          <Package className="w-3 h-3" />
          {service.template.name}
        </button>
      ) : (
        <button
          onClick={onEdit}
          className="flex items-center gap-1 w-fit text-xs text-gray-400 hover:text-brand-500 transition-colors"
        >
          <Plus className="w-3 h-3" />
          ربط بقالب
        </button>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function FlowerCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get("tab") || "services";
  const [search, setSearch] = useState("");

  const { data: svcRes, loading: svcLoading, error: svcError, refetch: refetchSvc } = useApi(
    () => servicesApi.list({ serviceType: "field_service" }), []
  );
  const { data: tplRes } = useApi(() => eventPackagesApi.list(), []);
  const { data: addRes } = useApi(() => addonsApi.list(), []);

  // حذف الخدمة الميدانية (catalog item فقط — ليس execution item)
  const { mutate: deleteService } = useMutation((id: string) => servicesApi.delete(id));

  const handleDeleteService = async (svc: any) => {
    if (!confirm(`أرشفة "${svc.name}"؟\n\nلن تُحذف المشاريع المرتبطة بها.`)) return;
    await deleteService(svc.id);
    refetchSvc();
  };

  const services: any[] = svcRes?.data ?? [];
  const templates: any[] = tplRes?.data ?? [];
  const addons: any[]   = addRes?.data ?? [];

  const filtered = search
    ? services.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    : services;

  const stats = [
    { label: "خدمة ميدانية", value: services.length, cls: "text-brand-600",  bg: "bg-brand-50",  border: "border-brand-100" },
    { label: "خطة تجهيز",  value: templates.length, cls: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
    { label: "إضافة",        value: addons.length,    cls: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100" },
  ];

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الكوش والخدمات الميدانية</h1>
          <p className="text-sm text-gray-400 mt-0.5">خدمات التأجير الميداني — الخدمات وقوالبها وملحقاتها</p>
        </div>
        {tab === "services" && (
          <button
            onClick={() => navigate("/dashboard/services/new?type=field_service")}
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            خدمة جديدة
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {stats.map(s => (
          <div key={s.label} className={clsx("flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white", s.border)}>
            <span className={clsx("text-2xl font-black", s.cls)}>{s.value}</span>
            <span className="text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSearchParams({ tab: t.id })}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Services Tab ─────────────────────────────────────────────────────── */}
      {tab === "services" && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن خدمة..."
              className="w-full border border-gray-200 rounded-xl pr-9 pl-3 h-9 text-sm outline-none focus:border-brand-400 transition-all"
            />
          </div>

          {svcLoading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          )}

          {svcError && !svcLoading && (
            <div className="flex items-center gap-2 text-red-500 text-sm p-4 bg-red-50 rounded-2xl border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              حدث خطأ في تحميل الخدمات
            </div>
          )}

          {!svcLoading && !svcError && filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <MapPin className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">
                {search ? "لا توجد نتائج" : "لا توجد خدمات ميدانية بعد"}
              </p>
              {!search && (
                <>
                  <p className="text-xs text-gray-400 mt-1">أضف خدمتك الأولى للبدء</p>
                  <button
                    onClick={() => navigate("/dashboard/services/new?type=field_service")}
                    className="mt-4 inline-flex items-center gap-1.5 bg-brand-500 text-white text-sm px-4 py-2 rounded-xl hover:bg-brand-600 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة خدمة ميدانية
                  </button>
                </>
              )}
            </div>
          )}

          {!svcLoading && !svcError && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(svc => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  onEdit={() => navigate(`/dashboard/services/${svc.id}`)}
                  onTemplate={() => setSearchParams({ tab: "templates" })}
                  onDelete={() => handleDeleteService(svc)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Other Tabs ───────────────────────────────────────────────────────── */}
      {tab === "templates"  && <EventPackagesPage embedded />}
      {tab === "addons"     && <AddonsPage />}
      {tab === "categories" && <CategoriesPage />}
    </div>
  );
}
