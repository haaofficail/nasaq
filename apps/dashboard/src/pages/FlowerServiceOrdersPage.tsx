import { useState } from "react";
import type React from "react";
import { Plus, AlertCircle, Loader2, Calendar, MapPin, Users,
         ChevronLeft, CheckCircle2, Clock, Truck, Package,
         Wrench, X, Search, Wallet, Archive, Flower2,
         ClipboardCheck, Pencil, Trash2, LayoutGrid, FileText,
         ShoppingBag, BookOpen, FolderKanban } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "@/hooks/useToast";
import { useApi, useMutation } from "@/hooks/useApi";
import { serviceOrdersApi, decorAssetsApi, flowerMasterApi, eventPackagesApi, staffApi } from "@/lib/api";
import { OrderWizard } from "@/components/flower/OrderWizard";
import { Modal, Input, Select, Button } from "@/components/ui";
import { confirmDialog } from "@/components/ui";

const ORDER_TYPES = [
  { value: "kiosk",               label: "كوشة",                    icon: "🏛️",  desc: "كوشة زفاف أو حفل، تشمل تجهيزات ميدانية وأصول" },
  { value: "newborn_reception",   label: "استقبال مولود",           icon: "👶",  desc: "تنسيق استقبال مولود هجين: طبيعي + صناعي + منتجات" },
  { value: "custom_arrangement",  label: "تنسيق مخصص",              icon: "💐",  desc: "تنسيق بالطلب حسب مواصفات العميل" },
  { value: "field_execution",     label: "تنفيذ ميداني",            icon: "🚚",  desc: "خدمة تنفيذ في موقع العميل" },
  { value: "custom_decor",        label: "ديكور مناسبة",            icon: "✨",  desc: "تزيين قاعة أو مناسبة" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string[] }> = {
  draft:             { label: "مسودة",            color: "bg-gray-100 text-gray-600",    next: ["confirmed","deposit_pending","cancelled"] },
  deposit_pending:   { label: "بانتظار العربون",  color: "bg-amber-100 text-amber-700",  next: ["confirmed","cancelled"] },
  confirmed:         { label: "مؤكد",             color: "bg-blue-100 text-blue-700",    next: ["scheduled","preparing"] },
  scheduled:         { label: "مجدول",            color: "bg-violet-100 text-violet-700", next: ["preparing"] },
  preparing:         { label: "تحت التجهيز",      color: "bg-orange-100 text-orange-700", next: ["ready"] },
  ready:             { label: "جاهز",             color: "bg-teal-100 text-teal-700",    next: ["dispatched"] },
  dispatched:        { label: "خرج للموقع",       color: "bg-blue-100 text-blue-600",    next: ["in_setup"] },
  in_setup:          { label: "قيد التركيب",      color: "bg-indigo-100 text-indigo-700", next: ["completed_on_site"] },
  completed_on_site: { label: "اكتمل في الموقع",  color: "bg-green-100 text-green-700",  next: ["returned"] },
  returned:          { label: "عاد من الموقع",    color: "bg-amber-100 text-amber-700",  next: ["inspected"] },
  inspected:         { label: "تم الفحص",         color: "bg-teal-100 text-teal-700",    next: ["closed"] },
  closed:            { label: "مغلق",             color: "bg-gray-100 text-gray-500",    next: [] },
  cancelled:         { label: "ملغي",             color: "bg-red-100 text-red-500",      next: [] },
};

const STATUS_LABELS_AR: Record<string, string> = {
  confirmed: "تأكيد", deposit_pending: "طلب عربون", scheduled: "جدولة",
  preparing: "بدء التجهيز", ready: "جاهز للإرسال", dispatched: "تم الإرسال",
  in_setup: "قيد التركيب", completed_on_site: "اكتمل في الموقع",
  returned: "عاد من الموقع", inspected: "تم الفحص", closed: "إغلاق", cancelled: "إلغاء",
};

export function FlowerServiceOrdersPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showInspect, setShowInspect] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: res, loading, error, refetch } = useApi(
    () => serviceOrdersApi.list({ status: filterStatus, type: filterType }),
    [filterStatus, filterType]
  );
  const { data: statsRes, refetch: refetchStats } = useApi(() => serviceOrdersApi.stats(), []);
  const { mutate: changeStatus } = useMutation(({ id, status }: any) => serviceOrdersApi.changeStatus(id, { status }));

  const orders: any[] = res?.data ?? [];
  const stats: any = statsRes?.data ?? {};


  const handleStatusChange = async (orderId: string, status: string) => {
    await changeStatus({ id: orderId, status });
    toast.success(`تم التحديث: ${STATUS_LABELS_AR[status] ?? status}`);
    refetch(); refetchStats();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev: any) => ({ ...prev, status }));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">طلبات الخدمات والتنفيذ</h1>
          <p className="text-sm text-gray-400 mt-0.5">كوشات، استقبال مولود، تنسيقات مخصصة، وتنفيذ ميداني</p>
        </div>
        <Button icon={Plus} onClick={() => setWizardOpen(true)}>طلب جديد</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "نشطة",           value: stats.active ?? 0,          color: "text-brand-600" },
          { label: "اليوم",          value: stats.today ?? 0,           color: "text-green-600" },
          { label: "قيد التنفيذ",   value: stats.in_progress ?? 0,     color: "text-blue-600" },
          { label: "بانتظار الفحص", value: stats.pending_inspection ?? 0, color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:border-brand-400">
          <option value="">جميع الحالات</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:border-brand-400">
          <option value="">جميع الأنواع</option>
          {ORDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">لا توجد طلبات خدمات بعد</h3>
          <p className="text-sm text-gray-400 mb-4">أنشئ كوشة أو طلب استقبال مولود أو تنسيق مخصص</p>
          <Button icon={Plus} onClick={() => setWizardOpen(true)}>طلب جديد</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const sc = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.draft;
            const typeInfo = ORDER_TYPES.find(t => t.value === o.type);
            return (
              <div key={o.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-brand-200 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(o)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{typeInfo?.icon ?? "📦"}</span>
                      <span className="text-xs font-medium text-gray-400">{o.order_number}</span>
                      <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", sc.color)}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800">{o.customer_name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {o.event_date && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(o.event_date).toLocaleDateString("ar-SA")}
                        </span>
                      )}
                      {o.event_location && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {o.event_location}
                        </span>
                      )}
                      {o.total_amount && (
                        <span className="text-xs text-brand-600 font-medium">
                          {Number(o.total_amount).toLocaleString("ar-SA")} ر.س
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {sc.next.filter(n => !["cancelled"].includes(n)).slice(0, 1).map(next => (
                      <button
                        key={next}
                        onClick={e => { e.stopPropagation(); handleStatusChange(o.id, next); }}
                        className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-600 font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {STATUS_LABELS_AR[next] ?? next}
                      </button>
                    ))}
                    <ChevronLeft className="w-4 h-4 text-gray-300 self-center" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OrderWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => { refetch(); refetchStats(); }}
      />

      {/* Order Detail Side Panel — simplified */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}

// ── Item type labels ───────────────────────────────────────────────────────────
const ITEM_TYPES = [
  { value: "consumable_natural",  label: "ورد طبيعي مستهلك",  color: "bg-green-100 text-green-700" },
  { value: "consumable_product",  label: "منتج/هدية",          color: "bg-purple-100 text-purple-700" },
  { value: "asset",               label: "أصل صناعي",          color: "bg-blue-100 text-blue-700" },
  { value: "service_fee",         label: "رسوم خدمة",          color: "bg-orange-100 text-orange-700" },
];

const ASSET_RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
  reserved:               { label: "محجوز",       color: "bg-amber-100 text-amber-700" },
  dispatched:             { label: "خرج للموقع",  color: "bg-blue-100 text-blue-700" },
  returned_ok:            { label: "عاد سليم",    color: "bg-green-100 text-green-700" },
  returned_damaged:       { label: "عاد تالف",    color: "bg-red-100 text-red-700" },
  returned_missing:       { label: "مفقود",       color: "bg-red-100 text-red-700" },
  maintenance_required:   { label: "يحتاج صيانة", color: "bg-orange-100 text-orange-700" },
};

const MATERIAL_STATUS: Record<string, { label: string; color: string }> = {
  reserved:  { label: "محجوز",   color: "bg-amber-100 text-amber-700" },
  consumed:  { label: "مستهلك",  color: "bg-gray-100 text-gray-600" },
  released:  { label: "محرر",    color: "bg-blue-100 text-blue-600" },
};

// ── Order kind config ──────────────────────────────────────────────────────────
type OrderKind = "sale" | "booking" | "project";

const ORDER_KIND_CONFIG: Record<OrderKind, {
  label: string; color: string; icon: React.ComponentType<{ className?: string }>;
  tabs: Array<"summary" | "items" | "assets" | "flowers" | "team" | "inspect">;
}> = {
  sale:    { label: "مبيعات",          color: "bg-gray-100 text-gray-600",      icon: ShoppingBag,   tabs: ["summary", "items"] },
  booking: { label: "حجز",             color: "bg-sky-100 text-sky-700",        icon: BookOpen,      tabs: ["summary", "items", "team"] },
  project: { label: "مشروع تنفيذي",   color: "bg-violet-100 text-violet-700",  icon: FolderKanban,  tabs: ["summary", "items", "assets", "flowers", "team", "inspect"] },
};

// ── Order Detail Modal ─────────────────────────────────────────────────────────
function OrderDetailModal({
  order, onClose, onStatusChange, onRefresh,
}: {
  order: any;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  onRefresh: () => void;
}) {
  const kind: OrderKind = (order.order_kind as OrderKind) ?? "project";
  const kindCfg = ORDER_KIND_CONFIG[kind];

  const [tab, setTab] = useState<"summary" | "items" | "assets" | "flowers" | "team" | "inspect">("summary");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showApplyPackage, setShowApplyPackage] = useState(false);
  const [showInspectForm, setShowInspectForm] = useState(false);
  const [currentOrderStatus, setCurrentOrderStatus] = useState(order.status);

  const { data: res, loading, refetch: refetchDetail } = useApi(
    () => serviceOrdersApi.get(order.id), [order.id]
  );
  const detail = res?.data;
  const sc = STATUS_CONFIG[currentOrderStatus] ?? STATUS_CONFIG.draft;

  const { mutate: deleteItem } = useMutation(
    (itemId: string) => serviceOrdersApi.deleteItem(order.id, itemId)
  );

  const handleDeleteItem = async (item: any) => {
    const ok = await confirmDialog({ title: `حذف "${item.description}"؟`, danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    await deleteItem(item.id);
    toast.success("تم حذف البند");
    refetchDetail();
  };

  const handleStatusChange = (id: string, status: string) => {
    onStatusChange(id, status);
    setCurrentOrderStatus(status);
    onRefresh();
  };

  const itemsCost = (detail?.items ?? []).reduce((s: number, i: any) => s + Number(i.subtotal ?? 0), 0);
  const totalAmount = Number(detail?.total_amount ?? 0);
  const depositAmount = Number(detail?.deposit_amount ?? 0);
  const remaining = totalAmount - depositAmount;

  const ALL_TABS = [
    { id: "summary",  label: "الملخص",   icon: FileText },
    { id: "items",    label: "البنود",    icon: LayoutGrid },
    { id: "assets",   label: "الأصول",   icon: Archive },
    { id: "flowers",  label: "الورد",     icon: Flower2 },
    { id: "team",     label: "الفريق",   icon: Users },
    { id: "inspect",  label: "الفحص",    icon: ClipboardCheck },
  ];
  const TABS = ALL_TABS.filter(t => kindCfg.tabs.includes(t.id as any));

  return (
    <>
    <Modal open onClose={onClose} title={`${ORDER_TYPES.find(t => t.value === order.type)?.icon ?? ""} ${order.order_number}`} size="lg">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* Order kind badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx("flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full", kindCfg.color)}>
              <kindCfg.icon className="w-3.5 h-3.5" />
              {kindCfg.label}
            </span>
          </div>

          {/* Status strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx("text-sm font-semibold px-3 py-1 rounded-full", sc.color)}>{sc.label}</span>
            {sc.next.map(next => (
              <button key={next} onClick={() => handleStatusChange(order.id, next)}
                className={clsx("text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                  next === "cancelled" ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                )}>
                {STATUS_LABELS_AR[next] ?? next}
              </button>
            ))}
            {currentOrderStatus === "returned" && !detail?.inspection && (
              <button onClick={() => setShowInspectForm(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
                تسجيل الفحص
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-100 pb-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={clsx("flex items-center gap-1.5 text-xs font-medium px-3 py-2 border-b-2 transition-colors -mb-px",
                  tab === t.id ? "border-brand-500 text-brand-600" : "border-transparent text-gray-400 hover:text-gray-600"
                )}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Summary ── */}
          {tab === "summary" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "العميل",   value: detail?.customer_name },
                  { label: "الجوال",   value: detail?.customer_phone ?? "—" },
                  ...(detail?.service_name ? [{ label: "الخدمة", value: detail.service_name }] : []),
                  { label: "النوع",    value: ORDER_TYPES.find(t => t.value === detail?.type)?.label },
                  { label: "الفريق",   value: detail?.team_size ? `${detail.team_size} أفراد` : "—" },
                  { label: "التاريخ",  value: detail?.event_date ? new Date(detail.event_date).toLocaleDateString("ar-SA") : "—" },
                  { label: "الوقت",    value: detail?.event_time ?? "—" },
                  { label: "الموقع",   value: detail?.event_location ?? "—", full: true },
                ].map((f: any) => (
                  <div key={f.label} className={clsx("bg-gray-50 rounded-xl p-3", f.full && "col-span-2")}>
                    <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                    <p className="font-medium text-gray-800">{f.value ?? "—"}</p>
                  </div>
                ))}
              </div>

              {/* Financial summary */}
              <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-brand-700 mb-3 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> الملخص المالي
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">الإجمالي</p>
                    <p className="text-lg font-bold text-brand-700">{totalAmount.toLocaleString("ar-SA")}</p>
                    <p className="text-xs text-gray-400">ر.س</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">العربون</p>
                    <p className="text-lg font-bold text-green-600">{depositAmount.toLocaleString("ar-SA")}</p>
                    <p className="text-xs text-gray-400">ر.س</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">المتبقي</p>
                    <p className={clsx("text-lg font-bold", remaining > 0 ? "text-red-500" : "text-green-600")}>
                      {remaining.toLocaleString("ar-SA")}
                    </p>
                    <p className="text-xs text-gray-400">ر.س</p>
                  </div>
                </div>
                {itemsCost > 0 && (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    تكلفة البنود المسجلة: <span className="font-semibold text-gray-700">{itemsCost.toLocaleString("ar-SA")} ر.س</span>
                  </p>
                )}
              </div>

              {detail?.description && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">الوصف / ملاحظات</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{detail.description}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Items ── */}
          {tab === "items" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  البنود ({detail?.items?.length ?? 0})
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowApplyPackage(true)}
                    className="text-xs bg-violet-50 text-violet-600 hover:bg-violet-100 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" /> تطبيق خطة تجهيز
                  </button>
                  <button onClick={() => setShowAddItem(true)}
                    className="text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> إضافة بند
                  </button>
                </div>
              </div>

              {!detail?.items?.length ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  لا توجد بنود — أضف يدوياً أو طبّق خطة تجهيز
                </div>
              ) : (
                <>
                  {/* Group by type */}
                  {ITEM_TYPES.map(type => {
                    const items = (detail.items ?? []).filter((i: any) => i.item_type === type.value);
                    if (!items.length) return null;
                    return (
                      <div key={type.value}>
                        <p className={clsx("text-xs font-semibold px-2 py-1 rounded-lg inline-block mb-2", type.color)}>
                          {type.label}
                        </p>
                        <div className="space-y-1">
                          {items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800">{item.description}</p>
                                {(item.display_name_ar || item.asset_name) && (
                                  <p className="text-xs text-gray-400">{item.display_name_ar ?? item.asset_name}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm text-gray-700">{item.quantity} {item.unit}</p>
                                {Number(item.subtotal) > 0 && (
                                  <p className="text-xs text-brand-600 font-medium">
                                    {Number(item.subtotal).toLocaleString("ar-SA")} ر.س
                                  </p>
                                )}
                              </div>
                              <button onClick={() => handleDeleteItem(item)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Cost total */}
                  {itemsCost > 0 && (
                    <div className="bg-brand-50 rounded-xl p-3 text-sm text-right">
                      <span className="text-gray-500">إجمالي تكلفة البنود: </span>
                      <span className="font-bold text-brand-700">{itemsCost.toLocaleString("ar-SA")} ر.س</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Tab: Assets ── */}
          {tab === "assets" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                الأصول الصناعية المحجوزة ({detail?.assets?.length ?? 0})
              </p>
              {!detail?.assets?.length ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  <Archive className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  لا توجد أصول محجوزة — أضف بنداً من نوع "أصل صناعي"
                </div>
              ) : (
                <div className="space-y-2">
                  {detail.assets.map((a: any) => {
                    const rs = ASSET_RESERVATION_STATUS[a.status] ?? { label: a.status, color: "bg-gray-100 text-gray-600" };
                    return (
                      <div key={a.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800">{a.asset_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{a.category ?? "—"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={clsx("text-xs font-medium px-2 py-1 rounded-full", rs.color)}>
                            {rs.label}
                          </span>
                          {a.current_status && a.current_status !== a.status?.replace("returned_", "").replace("dispatched", "in_use") && (
                            <p className="text-xs text-gray-400 mt-0.5">الحالة الحالية: {a.current_status}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Flowers ── */}
          {tab === "flowers" && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                حجوزات الورد الطبيعي ({detail?.materials?.length ?? 0})
              </p>
              {!detail?.materials?.length ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  <Flower2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  لا توجد مواد محجوزة من المخزون
                </div>
              ) : (
                <div className="space-y-2">
                  {detail.materials.map((m: any) => {
                    const ms = MATERIAL_STATUS[m.status] ?? { label: m.status, color: "bg-gray-100 text-gray-600" };
                    return (
                      <div key={m.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800">
                            {m.display_name_ar ?? `${m.flower_type} — ${m.color}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {m.quantity_stems} سيقان
                          </p>
                        </div>
                        <span className={clsx("text-xs font-medium px-2 py-1 rounded-full shrink-0", ms.color)}>
                          {ms.label}
                        </span>
                      </div>
                    );
                  })}

                  {/* Consumed summary */}
                  {detail.materials.some((m: any) => m.status === "consumed") && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                      الورد المستهلك سيُخصم من المخزون عند الإرسال للموقع
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Team ── */}
          {tab === "team" && (
            <TeamTab
              orderId={order.id}
              teamSize={detail?.team_size ?? 1}
              assignedStaff={detail?.staff ?? []}
              orderStatus={currentOrderStatus}
              onRefresh={refetchDetail}
            />
          )}

          {/* ── Tab: Inspect ── */}
          {tab === "inspect" && (
            <div className="space-y-3">
              {detail?.inspection ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> تم الفحص
                    </p>
                    {detail.inspection.notes && (
                      <p className="text-sm text-gray-700">{detail.inspection.notes}</p>
                    )}
                  </div>
                  {detail.inspection.assets_inspection && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">حالة الأصول بعد العودة:</p>
                      <div className="space-y-1">
                        {Object.entries(detail.inspection.assets_inspection as Record<string, any>).map(([assetId, info]: [string, any]) => (
                          <div key={assetId} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl p-2.5">
                            <span className="text-gray-700">{info.asset_name ?? assetId}</span>
                            <span className={clsx("text-xs px-2 py-0.5 rounded-full",
                              info.condition === "ok" ? "bg-green-100 text-green-700" :
                              info.condition === "damaged" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700")}>
                              {info.condition === "ok" ? "سليم" : info.condition === "damaged" ? "تالف" : info.condition}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-3">
                    {currentOrderStatus === "returned"
                      ? "الطلب عاد — يمكنك الآن تسجيل الفحص"
                      : "الفحص يُسجَّل بعد عودة الأصول من الموقع"}
                  </p>
                  {currentOrderStatus === "returned" && (
                    <button onClick={() => setShowInspectForm(true)}
                      className="text-sm bg-purple-50 text-purple-600 hover:bg-purple-100 font-medium px-4 py-2 rounded-lg transition-colors">
                      بدء الفحص
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </Modal>

    {/* Sub-modals */}
    {showAddItem && (
      <AddItemModal
        orderId={order.id}
        onClose={() => setShowAddItem(false)}
        onAdded={() => { setShowAddItem(false); refetchDetail(); }}
      />
    )}
    {showApplyPackage && (
      <ApplyPackageModal
        orderId={order.id}
        onClose={() => setShowApplyPackage(false)}
        onApplied={() => { setShowApplyPackage(false); refetchDetail(); }}
      />
    )}
    {showInspectForm && (
      <InspectFormModal
        orderId={order.id}
        assets={detail?.assets ?? []}
        onClose={() => setShowInspectForm(false)}
        onSaved={() => { setShowInspectForm(false); refetchDetail(); }}
      />
    )}
    </>
  );
}

// ── TeamTab ────────────────────────────────────────────────────────────────────
function TeamTab({ orderId, teamSize, assignedStaff, orderStatus, onRefresh }: {
  orderId: string; teamSize: number; assignedStaff: any[];
  orderStatus: string; onRefresh: () => void;
}) {
  const [showAssign, setShowAssign] = useState(false);
  const [search, setSearch] = useState("");

  const { data: allStaffRes } = useApi(() => staffApi.list(), []);
  const allStaff: any[] = allStaffRes?.data ?? [];

  const { mutate: removeStaff } = useMutation(
    (staffId: string) => serviceOrdersApi.removeStaff(orderId, staffId)
  );

  const canEdit = !["closed", "cancelled"].includes(orderStatus);
  const assignedIds = new Set(assignedStaff.map((s: any) => s.employee_id));

  const available = allStaff.filter((e: any) =>
    !assignedIds.has(e.id) &&
    (search === "" || e.full_name?.includes(search) || e.job_title?.includes(search))
  );

  const handleRemove = async (s: any) => {
    const ok = await confirmDialog({ title: `إلغاء تكليف "${s.full_name}"؟`, danger: true, confirmLabel: "إلغاء" });
    if (!ok) return;
    await removeStaff(s.id);
    toast.success("تم إلغاء التكليف");
    onRefresh();
  };

  const handleAssign = async (emp: any) => {
    await serviceOrdersApi.assignStaff(orderId, { employee_id: emp.id, role: "field_worker" });
    toast.success(`تم تكليف ${emp.full_name}`);
    onRefresh();
    setShowAssign(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">الفريق المكلّف</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            {assignedStaff.length}/{teamSize} أفراد
          </span>
          {canEdit && (
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setShowAssign(v => !v)}>
              تكليف
            </Button>
          )}
        </div>
      </div>

      {/* Search + pick panel */}
      {showAssign && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
          <Input
            name="staff_search"
            placeholder="ابحث عن موظف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {available.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">لا يوجد موظفون متاحون</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {available.map((emp: any) => (
                <button
                  key={emp.id}
                  onClick={() => handleAssign(emp)}
                  className="w-full text-right bg-white rounded-lg px-3 py-2 flex items-center justify-between hover:bg-blue-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800">{emp.full_name}</span>
                  <span className="text-xs text-gray-400">{emp.job_title ?? "موظف"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assigned list */}
      {assignedStaff.length > 0 ? (
        <div className="space-y-2">
          {assignedStaff.map((s: any) => (
            <div key={s.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{s.full_name}</p>
                <p className="text-xs text-gray-400">{s.job_title ?? "موظف"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">مكلّف</span>
                {canEdit && (
                  <button onClick={() => handleRemove(s)} className="text-red-400 hover:text-red-600 p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-9 h-9 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-1">لم يُعيَّن فريق بعد</p>
          <p className="text-xs text-gray-300">الطلب يتطلب {teamSize} أفراد</p>
        </div>
      )}
    </div>
  );
}

// ── AddItemModal ───────────────────────────────────────────────────────────────
function AddItemModal({ orderId, onClose, onAdded }: {
  orderId: string; onClose: () => void; onAdded: () => void;
}) {
  const [form, setForm] = useState({
    item_type: "consumable_natural", description: "",
    quantity: "1", unit: "سيقان", unit_cost: "0",
    variant_id: "", asset_id: "",
  });

  const { data: variantsRes } = useApi(
    () => flowerMasterApi.variants({ limit: "200" }), []
  );
  const { data: assetsRes } = useApi(
    () => decorAssetsApi.list({ status: "available" }), []
  );
  const { mutate: addItem, loading } = useMutation(
    (d: any) => serviceOrdersApi.addItem(orderId, d)
  );

  const variants: any[] = variantsRes?.data ?? [];
  const assets: any[] = assetsRes?.data ?? [];

  const UNITS: Record<string, string> = {
    consumable_natural: "سيقان", consumable_product: "قطعة",
    asset: "قطعة", service_fee: "ريال",
  };

  const handleSubmit = async () => {
    if (!form.description.trim()) { toast.error("الوصف مطلوب"); return; }
    await addItem({
      item_type:   form.item_type,
      description: form.description.trim(),
      quantity:    Number(form.quantity) || 1,
      unit:        form.unit,
      unit_cost:   Number(form.unit_cost) || 0,
      variant_id:  form.variant_id || undefined,
      asset_id:    form.asset_id || undefined,
    });
    toast.success("تم إضافة البند");
    onAdded();
  };

  return (
    <Modal open onClose={onClose} title="إضافة بند" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} loading={loading}>إضافة</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">نوع البند</label>
          <div className="grid grid-cols-2 gap-2">
            {ITEM_TYPES.map(t => (
              <button key={t.value} onClick={() => setForm(f => ({
                ...f, item_type: t.value,
                unit: UNITS[t.value] ?? "قطعة",
                variant_id: "", asset_id: "",
              }))}
                className={clsx("text-xs font-medium p-2 rounded-xl border-2 transition-all text-right",
                  form.item_type === t.value ? "border-brand-400 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                )}>
                <span className={clsx("inline-block px-1.5 py-0.5 rounded text-[10px] mb-1", t.color)}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {form.item_type === "consumable_natural" && variants.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع الورد</label>
            <select value={form.variant_id}
              onChange={e => {
                const v = variants.find((x: any) => x.id === e.target.value);
                setForm(f => ({
                  ...f, variant_id: e.target.value,
                  description: v ? (v.display_name_ar ?? `${v.flower_type} ${v.color}`) : f.description,
                }));
              }}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-400">
              <option value="">اختر نوع الورد...</option>
              {variants.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.display_name_ar ?? `${v.flower_type} — ${v.color}`}
                  {v.current_stock != null ? ` (${v.current_stock} سيقان)` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.item_type === "asset" && assets.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">الأصل الصناعي</label>
            <select value={form.asset_id}
              onChange={e => {
                const a = assets.find((x: any) => x.id === e.target.value);
                setForm(f => ({
                  ...f, asset_id: e.target.value,
                  description: a ? a.name : f.description,
                }));
              }}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-400">
              <option value="">اختر أصل متاح...</option>
              {assets.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name} — {a.location ?? "المستودع"}</option>
              ))}
            </select>
          </div>
        )}

        <Input name="description" label="الوصف" required value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="مثال: ورد الجوري الأحمر، ستاند فضي..." />

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1">
            <Input name="quantity" label="الكمية" type="number" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div className="col-span-1">
            <Input name="unit" label="الوحدة" value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
          <div className="col-span-1">
            <Input name="unit_cost" label="سعر الوحدة" type="number" value={form.unit_cost}
              onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── ApplyPackageModal ──────────────────────────────────────────────────────────
function ApplyPackageModal({ orderId, onClose, onApplied }: {
  orderId: string; onClose: () => void; onApplied: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const { data: pkgRes } = useApi(() => eventPackagesApi.list(), []);
  const { mutate: apply, loading } = useMutation(
    (templateId: string) => serviceOrdersApi.applyPackage(orderId, templateId)
  );

  const packages: any[] = pkgRes?.data ?? [];

  const handleApply = async () => {
    if (!selectedId) { toast.error("اختر خطة تجهيز"); return; }
    const result = await apply(selectedId) as any;
    const warnings = result?.data?.warnings ?? [];
    if (warnings.length) {
      toast.error(`تنبيه: ${warnings[0]}`);
    } else {
      toast.success("تم تطبيق خطة التجهيز");
    }
    onApplied();
  };

  return (
    <Modal open onClose={onClose} title="تطبيق خطة تجهيز" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleApply} loading={loading} disabled={!selectedId}>تطبيق</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-500">اختر خطة تجهيز لإضافة بنودها تلقائياً لهذا المشروع:</p>
        {packages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لا توجد خطط تجهيز — أنشئ خطة من "خطط التجهيز" أولاً</p>
        ) : (
          packages.map(pkg => (
            <button key={pkg.id} onClick={() => setSelectedId(pkg.id)}
              className={clsx("w-full text-right p-3 rounded-xl border-2 transition-all",
                selectedId === pkg.id ? "border-brand-400 bg-brand-50" : "border-gray-100 hover:border-gray-200"
              )}>
              <p className="font-medium text-sm text-gray-800">{pkg.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {pkg.items_count ?? 0} بنود — {pkg.worker_count ?? 1} أفراد
                {pkg.estimated_cost > 0 && ` — ${Number(pkg.estimated_cost).toLocaleString("ar-SA")} ر.س`}
              </p>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

// ── InspectFormModal ───────────────────────────────────────────────────────────
function InspectFormModal({ orderId, assets, onClose, onSaved }: {
  orderId: string; assets: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState<Record<string, string>>(() =>
    Object.fromEntries(assets.map((a: any) => [a.asset_id, "ok"]))
  );
  const { mutate: inspect, loading } = useMutation(
    (d: any) => serviceOrdersApi.inspect(orderId, d)
  );

  const handleSave = async () => {
    const assetsInspection = Object.fromEntries(
      assets.map((a: any) => [a.asset_id, {
        asset_name: a.asset_name,
        condition: conditions[a.asset_id] ?? "ok",
      }])
    );
    await inspect({ notes: notes || undefined, assets_inspection: assetsInspection });
    toast.success("تم تسجيل الفحص");
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="تسجيل الفحص" size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} loading={loading}>حفظ الفحص</Button>
        </>
      }
    >
      <div className="space-y-4">
        {assets.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">حالة الأصول بعد العودة:</p>
            <div className="space-y-2">
              {assets.map((a: any) => (
                <div key={a.asset_id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 flex-1">{a.asset_name}</span>
                  <select value={conditions[a.asset_id] ?? "ok"}
                    onChange={e => setConditions(c => ({ ...c, [a.asset_id]: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-400">
                    <option value="ok">سليم</option>
                    <option value="damaged">تالف</option>
                    <option value="missing">مفقود</option>
                    <option value="maintenance_required">يحتاج صيانة</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات الفحص</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="ملاحظات عامة عن حالة الأصول والمواد..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-400 resize-none" />
        </div>
      </div>
    </Modal>
  );
}
