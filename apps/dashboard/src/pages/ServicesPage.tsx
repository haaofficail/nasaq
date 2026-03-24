import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Grid3X3, List, Eye, EyeOff, Copy, Trash2, Pencil, Star, Package, Globe, Loader2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, categoriesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { ServiceFormModal } from "@/components/services/ServiceFormModal";
import { PageHeader, Button } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";

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

const TYPE_META: Record<string, { label: string; icon: string }> = {
  appointment:      { label: "بموعد",          icon: "🗓️" },
  execution:        { label: "تنفيذ",          icon: "🔧" },
  field_service:    { label: "ميداني",         icon: "📍" },
  rental:           { label: "تأجير",          icon: "🏠" },
  event_rental:     { label: "تأجير ميداني",   icon: "⛺" },
  product:          { label: "منتج",           icon: "📦" },
  product_shipping: { label: "شحن",            icon: "🚚" },
  food_order:       { label: "طعام",           icon: "🍽️" },
  package:          { label: "باقة",           icon: "🎁" },
  add_on:           { label: "إضافة",          icon: "➕" },
  project:          { label: "مشروع",          icon: "📋" },
};

function TypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type];
  if (!m) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-medium">
      <span>{m.icon}</span>{m.label}
    </span>
  );
}

export function ServicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

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

  const handleDuplicate = async (id: string) => { await duplicateService(id); refetch(); };
  const handleToggleWebsite = async (service: any) => {
    const newStatus = service.status === "active" ? "draft" : "active";
    await updateService({ id: service.id, data: { status: newStatus } });
    refetch();
  };
  const handleCreated = () => { setShowCreate(false); refetch(); };
  const handleEdited = () => { setEditId(null); refetch(); };

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
      <PageHeader
        title="الخدمات"
        description={`${services.length} خدمة`}
        actions={<Button icon={Plus} onClick={() => setShowCreate(true)}>خدمة جديدة</Button>}
      />

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
              const m = t === "الكل" ? null : TYPE_META[t];
              return (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={clsx(
                    "flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                    typeFilter === t ? "bg-gray-800 text-white shadow-sm" : "bg-white border border-gray-100 text-gray-600 hover:bg-gray-50"
                  )}>
                  {m && <span>{m.icon}</span>}
                  {m ? m.label : t}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
          <button onClick={() => setView("grid")} className={clsx("p-2 rounded-lg transition-colors", view === "grid" ? "bg-brand-500 text-white" : "text-gray-400 hover:bg-gray-50")}><Grid3X3 className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={clsx("p-2 rounded-lg transition-colors", view === "list" ? "bg-brand-500 text-white" : "text-gray-400 hover:bg-gray-50")}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">{search ? "لا توجد نتائج" : "لا توجد خدمات بعد"}</h3>
          <p className="text-sm text-gray-400 mb-4">{search ? "جرب كلمات بحث مختلفة" : "أضف أول خدمة لك"}</p>
          {!search && (
            <button onClick={() => setShowCreate(true)}
              className="bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4 inline ml-1" /> إضافة خدمة
            </button>
          )}
        </div>
      )}

      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((service: any) => (
            <div key={service.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all group flex flex-col">
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
                  onClick={() => setEditId(service.id)}
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
                      <button onClick={() => setEditId(service.id)} title="تعديل" className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors"><Pencil className="w-3.5 h-3.5 text-brand-500" /></button>
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

      <ServiceFormModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={handleCreated} />
      {editId && <ServiceFormModal open={true} serviceId={editId} onClose={() => setEditId(null)} onSuccess={handleEdited} />}
    </div>
  );
}
