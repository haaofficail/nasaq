import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  Gift, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, Flower2,
  X, ShoppingBag, TrendingUp, Package, CreditCard, Truck, ClipboardList,
  Check, Clock, Phone, User, Settings, ExternalLink, RefreshCw, Eye,
  MapPin, ChevronDown, ChevronRight, DollarSign, AlertCircle,
  Palette, Globe, Sliders, MessageSquare, Save, Sparkles,
} from "lucide-react";
import { arrangementsApi, flowerBuilderApi, settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Button, Input, Toggle, Toast } from "@/components/ui";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_TAGS = [
  { value: "",           label: "الكل",          color: "bg-gray-100 text-gray-600" },
  { value: "love",       label: "💕 حب ورومانسية", color: "bg-pink-50 text-pink-700" },
  { value: "congrats",   label: "🎉 تهاني",       color: "bg-amber-50 text-amber-700" },
  { value: "condolence", label: "🕊️ تعازي",       color: "bg-gray-100 text-gray-600" },
  { value: "occasions",  label: "🎊 مناسبات",     color: "bg-violet-50 text-violet-700" },
  { value: "general",    label: "🌸 عام",         color: "bg-emerald-50 text-emerald-700" },
];
const TAG_LABELS: Record<string, string> = {
  love: "💕 حب ورومانسية", congrats: "🎉 تهاني",
  condolence: "🕊️ تعازي", occasions: "🎊 مناسبات", general: "🌸 عام",
};

const CATALOG_TYPES = [
  { value: "packaging", label: "تغليف",   icon: Package,    color: "text-violet-600 bg-violet-50", hint: "كيس، علبة، صندوق فاخر..." },
  { value: "gift",      label: "هدايا",   icon: Gift,       color: "text-pink-600 bg-pink-50",    hint: "شوكولاتة، دبدوب، بالون..." },
  { value: "card",      label: "كروت",    icon: CreditCard, color: "text-blue-600 bg-blue-50",    hint: "كرت مطبوع، ورقي، رقمي..." },
  { value: "delivery",  label: "توصيل",   icon: Truck,      color: "text-amber-600 bg-amber-50",  hint: "توصيل داخل المدينة، خارجي..." },
];

const ORDER_STATUSES = [
  { value: "",           label: "الكل",      color: "bg-gray-100 text-gray-600" },
  { value: "pending",    label: "⏳ انتظار", color: "bg-amber-50 text-amber-700" },
  { value: "confirmed",  label: "✅ مؤكد",   color: "bg-blue-50 text-blue-700" },
  { value: "preparing",  label: "🌸 تحضير", color: "bg-violet-50 text-violet-700" },
  { value: "ready",      label: "📦 جاهز",  color: "bg-teal-50 text-teal-700" },
  { value: "delivered",  label: "🚚 سُلِّم", color: "bg-emerald-50 text-emerald-700" },
  { value: "cancelled",  label: "❌ ملغي",  color: "bg-red-50 text-red-700" },
];
const STATUS_NEXT: Record<string, string> = {
  pending: "confirmed", confirmed: "preparing", preparing: "ready",
  ready: "delivered",
};

// ─── Shared Mini Components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUSES.find(x => x.value === status);
  return (
    <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-semibold border border-transparent",
      s?.color || "bg-gray-100 text-gray-600")}>
      {s?.label || status}
    </span>
  );
}

// ─── Package Modal ─────────────────────────────────────────────────────────────

function PackageModal({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: item?.name || "", description: item?.description || "",
    categoryTag: item?.categoryTag || "general", basePrice: item?.basePrice || "",
    isActive: item?.isActive ?? true, components: (item?.components as string[]) || [],
  });
  const [ci, setCi] = useState("");
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const addComp = () => { if (ci.trim()) { f("components", [...form.components, ci.trim()]); setCi(""); } };

  return (
    <Modal open title={item ? "تعديل الباقة" : "باقة جديدة"} onClose={onClose}>
      <div className="space-y-4">
        <Input label="اسم الباقة *" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="مثال: باقة الورد الأحمر الملكية" required />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">الفئة</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_TAGS.filter(t => t.value).map(t => (
              <button key={t.value} onClick={() => f("categoryTag", t.value)}
                className={clsx("px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                  form.categoryTag === t.value ? "bg-brand-500 border-brand-500 text-white" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Input label="السعر (ر.س) *" name="basePrice" type="number" value={form.basePrice}
          onChange={e => f("basePrice", e.target.value)} placeholder="0.00" dir="ltr" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">وصف الباقة</label>
          <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={3}
            placeholder="صف محتوى الباقة..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 resize-none leading-relaxed" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">المكونات</label>
          <div className="flex gap-2 mb-2">
            <input value={ci} onChange={e => setCi(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addComp(); } }}
              placeholder="مثال: 12 وردة حمراء"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300" />
            <button onClick={addComp} className="px-3 py-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.components.map((c: string, i: number) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs">
                {c}<button onClick={() => f("components", form.components.filter((_: any, j: number) => j !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={form.isActive} onChange={v => f("isActive", v)} />
          <span className="text-sm text-gray-700">متاح للبيع</span>
        </div>
        <div className="flex gap-3 pt-1">
          <Button className="flex-1" onClick={() => { if (form.name.trim() && form.basePrice) onSave(form); }}>حفظ</Button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Catalog Item Modal ────────────────────────────────────────────────────────

function CatalogItemModal({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    type: item?.type || "packaging", name: item?.name || "", nameEn: item?.nameEn || "",
    description: item?.description || "", price: item?.price || "", icon: item?.icon || "",
    isDefault: item?.isDefault ?? false, isActive: item?.isActive ?? true, maxQuantity: item?.maxQuantity || 1,
  });
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const curType = CATALOG_TYPES.find(t => t.value === form.type);

  return (
    <Modal open title={item ? "تعديل العنصر" : "عنصر جديد"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">النوع</p>
          <div className="grid grid-cols-2 gap-2">
            {CATALOG_TYPES.map(t => (
              <button key={t.value} onClick={() => f("type", t.value)}
                className={clsx("flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  form.type === t.value ? "bg-brand-500 border-brand-500 text-white" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
          {curType && <p className="text-xs text-gray-400 mt-1.5">{curType.hint}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="الاسم *" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="اسم العنصر" required />
          <Input label="الاسم بالإنجليزية" name="nameEn" value={form.nameEn} onChange={e => f("nameEn", e.target.value)} dir="ltr" placeholder="English name" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="السعر (ر.س)" name="price" type="number" value={form.price}
              onChange={e => f("price", e.target.value)} placeholder="0" dir="ltr" />
          </div>
          <Input label="الأيقونة" name="icon" value={form.icon} onChange={e => f("icon", e.target.value)} placeholder="🎁" />
        </div>
        {form.type === "gift" && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">أقصى كمية:</label>
            <input type="number" min={1} max={10} value={form.maxQuantity}
              onChange={e => f("maxQuantity", parseInt(e.target.value) || 1)}
              className="w-16 border border-gray-200 rounded-xl px-2 py-1.5 text-sm text-center outline-none focus:border-brand-300" dir="ltr" />
          </div>
        )}
        <Input label="وصف مختصر" name="description" value={form.description} onChange={e => f("description", e.target.value)} placeholder="اختياري" />
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={form.isDefault} onChange={v => f("isDefault", v)} />
            <span className="text-sm text-gray-700">افتراضي</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={form.isActive} onChange={v => f("isActive", v)} />
            <span className="text-sm text-gray-700">مفعّل</span>
          </label>
        </div>
        <div className="flex gap-3 pt-1">
          <Button className="flex-1" onClick={() => { if (form.name.trim()) onSave(form); }}>حفظ</Button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Order Detail Modal ────────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose, onStatusChange }: { order: any; onClose: () => void; onStatusChange: (id: string, status: string) => void }) {
  const nextStatus = STATUS_NEXT[order.status];
  return (
    <Modal open title={`طلب #${order.orderNumber}`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge status={order.status} />
          {nextStatus && (
            <button onClick={() => { onStatusChange(order.id, nextStatus); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors">
              <Check className="w-3.5 h-3.5" />
              {ORDER_STATUSES.find(s => s.value === nextStatus)?.label || nextStatus}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> العميل</p>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-gray-500 text-xs">{order.customerPhone}</p>
          </div>
          {(order.recipientName || order.recipientPhone) && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Gift className="w-3 h-3" /> المُهدَى إليه</p>
              <p className="font-medium">{order.recipientName || "—"}</p>
              <p className="text-gray-500 text-xs">{order.recipientPhone || ""}</p>
            </div>
          )}
        </div>

        {/* Flowers */}
        {order.items?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">الورود</p>
            <div className="space-y-1.5">
              {order.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-pink-50 rounded-lg">
                  <span className="text-gray-800">{item.flowerName} × {item.quantity}</span>
                  <span className="text-pink-700 font-semibold text-xs">{Number(item.lineTotal).toFixed(2)} ر.س</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Addons */}
        {order.addons?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">الإضافات</p>
            <div className="space-y-1.5">
              {order.addons.map((a: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-violet-50 rounded-lg">
                  <span className="text-gray-800">{a.label}</span>
                  <span className="text-violet-700 font-semibold text-xs">{Number(a.price).toFixed(2)} ر.س</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Packaging + Gift Message */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 bg-gray-50 rounded-xl">
            <p className="text-gray-400">التغليف</p>
            <p className="font-medium mt-0.5">{order.packaging} — {Number(order.packagingPrice).toFixed(0)} ر.س</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-xl">
            <p className="text-gray-400">التوصيل</p>
            <p className="font-medium mt-0.5">{order.deliveryType === "instant" ? "فوري" : "مجدول"} — {Number(order.deliveryPrice).toFixed(0)} ر.س</p>
          </div>
        </div>
        {order.giftMessage && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs text-amber-600 mb-1">رسالة التهنئة 💌</p>
            <p className="text-gray-800 leading-relaxed">{order.giftMessage}</p>
          </div>
        )}
        {order.deliveryAddress && (
          <div className="p-3 bg-gray-50 rounded-xl flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <div className="text-xs text-gray-600">
              {[order.deliveryAddress.district, order.deliveryAddress.street, order.deliveryAddress.building].filter(Boolean).join(" — ")}
              {order.deliveryAddress.city && ` — ${order.deliveryAddress.city}`}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-100 pt-3 space-y-1 text-xs">
          {[
            ["المجموع الفرعي", order.subtotal],
            ["الضريبة (15%)", order.vatAmount],
            ["التوصيل", order.deliveryPrice],
            ["التغليف", order.packagingPrice],
          ].map(([l, v]) => (
            <div key={l as string} className="flex justify-between text-gray-500">
              <span>{l}</span><span>{Number(v).toFixed(2)} ر.س</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-base text-gray-900 pt-1 border-t border-gray-100">
            <span>الإجمالي</span><span>{Number(order.total).toFixed(2)} ر.س</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tab: Orders ───────────────────────────────────────────────────────────────

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: res, loading, refetch } = useApi(
    () => flowerBuilderApi.orders({ status: statusFilter || undefined, limit: "100" }),
    [statusFilter]
  );
  const { data: statsRes, refetch: refetchStats } = useApi(() => flowerBuilderApi.orderStats(), []);
  const { mutate: changeStatus } = useMutation((d: any) => flowerBuilderApi.updateOrderStatus(d.id, d.status));

  const orders: any[] = res?.data || [];
  const stats = statsRes?.data;

  const handleStatusChange = async (id: string, status: string) => {
    await changeStatus({ id, status });
    refetch();
    refetchStats();
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "إجمالي",    value: stats?.total || 0,      color: "text-gray-700" },
          { label: "⏳ انتظار", value: stats?.pending || 0,    color: "text-amber-700" },
          { label: "✅ مؤكد",   value: stats?.confirmed || 0,  color: "text-blue-700" },
          { label: "🚚 سُلِّم", value: stats?.delivered || 0,  color: "text-emerald-700" },
          { label: "💰 إيرادات", value: `${Number(stats?.revenue || 0).toFixed(0)} ر.س`, color: "text-brand-700" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className={clsx("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-1.5">
        {ORDER_STATUSES.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={clsx("px-3 py-2 rounded-xl border text-sm font-medium transition-all",
              statusFilter === s.value
                ? "bg-brand-500 border-brand-500 text-white shadow-sm"
                : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white")}>
            {s.label}
          </button>
        ))}
        <button onClick={() => { refetch(); refetchStats(); }}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors ml-auto">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <Flower2 className="w-8 h-8 mx-auto mb-2 text-gray-200 animate-pulse" />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">رقم الطلب</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">العميل</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">الورود</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">الإجمالي</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">الحالة</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium text-xs">التاريخ</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const next = STATUS_NEXT[o.status];
                const flowerSummary = (o.items as any[]).map((i: any) => `${i.flowerName}×${i.quantity}`).join("، ");
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-brand-600">{o.orderNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{o.customerName}</p>
                      <p className="text-xs text-gray-400">{o.customerPhone}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 max-w-[140px] truncate">{flowerSummary || "—"}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{Number(o.total).toFixed(2)} <span className="text-xs text-gray-400">ر.س</span></td>
                    <td className="py-3 px-4"><StatusBadge status={o.status} /></td>
                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString("ar-SA")}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedOrder(o)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {next && (
                          <button onClick={() => handleStatusChange(o.id, next)}
                            title={ORDER_STATUSES.find(s => s.value === next)?.label}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}

// ─── Tab: Packages (Pre-made) ──────────────────────────────────────────────────

function PackagesTab() {
  const { data: res, loading, refetch } = useApi(() => arrangementsApi.list(), []);
  const { data: statsRes }              = useApi(() => arrangementsApi.stats(), []);
  const { mutate: create }              = useMutation((d: any) => arrangementsApi.create(d));
  const { mutate: update }              = useMutation((d: any) => arrangementsApi.update(d.id, d));
  const { mutate: toggle }              = useMutation((id: string) => arrangementsApi.toggle(id));
  const { mutate: remove }              = useMutation((id: string) => arrangementsApi.delete(id));

  const [search, setSearch]   = useState("");
  const [tag, setTag]         = useState("");
  const [modal, setModal]     = useState<{ open: boolean; item?: any }>({ open: false });
  const [toast, setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const all: any[]  = res?.data || [];
  const stats       = statsRes?.data;
  const filtered    = all.filter(a =>
    (!tag || a.categoryTag === tag) &&
    (!search || a.name.includes(search) || a.description?.includes(search))
  );

  const handleSave = async (form: any) => {
    try {
      modal.item ? await update({ ...form, id: modal.item.id }) : await create(form);
      setToast({ msg: "تم الحفظ", type: "success" });
      setModal({ open: false });
      refetch();
    } catch { setToast({ msg: "فشل الحفظ", type: "error" }); }
  };

  const handleToggle = async (item: any) => {
    try { await toggle(item.id); refetch(); } catch { setToast({ msg: "فشل التحديث", type: "error" }); }
  };
  const handleDelete = async (item: any) => {
    if (!confirm(`حذف "${item.name}"؟`)) return;
    try { await remove(item.id); setToast({ msg: "تم الحذف", type: "success" }); refetch(); }
    catch { setToast({ msg: "فشل الحذف", type: "error" }); }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "الباقات",       value: stats?.total ?? all.length,                         icon: Flower2,    color: "text-brand-500 bg-brand-50" },
          { label: "نشط",          value: stats?.active ?? all.filter(a => a.isActive).length, icon: ToggleRight, color: "text-emerald-600 bg-emerald-50" },
          { label: "متوسط السعر",  value: stats?.avgPrice ? `${stats.avgPrice} ر.س` : "—",    icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
          { label: "إجمالي الطلبات", value: stats?.totalOrders ?? 0,                           icon: ShoppingBag, color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الباقات..."
            className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORY_TAGS.map(t => (
            <button key={t.value} onClick={() => setTag(t.value)}
              className={clsx("px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                tag === t.value ? "bg-brand-500 border-brand-500 text-white shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white")}>
              {t.label}
            </button>
          ))}
        </div>
        <Button icon={Plus} onClick={() => setModal({ open: true })}>باقة جديدة</Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-44" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-gray-100">
          <Flower2 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">لا توجد باقات — أضف أول باقة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item: any) => (
            <div key={item.id} className={clsx("bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all",
              item.isActive ? "border-gray-100" : "border-gray-100 opacity-60")}>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium",
                  CATEGORY_TAGS.find(t => t.value === item.categoryTag)?.color || "bg-gray-100 text-gray-600")}>
                  {TAG_LABELS[item.categoryTag] || item.categoryTag}
                </span>
                <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium",
                  item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                  {item.isActive ? "نشط" : "مخفي"}
                </span>
              </div>
              <div className="px-4 pb-4">
                <h3 className="font-bold text-gray-900 text-sm mb-1">{item.name}</h3>
                {item.description && <p className="text-xs text-gray-400 line-clamp-2 mb-3">{item.description}</p>}
                {item.components?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(item.components as string[]).slice(0, 4).map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-600 text-xs">{c}</span>
                    ))}
                    {item.components.length > 4 && <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs">+{item.components.length - 4}</span>}
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-brand-600">{Number(item.basePrice).toFixed(0)} ر.س</span>
                  {item.totalOrders > 0 && <span className="text-xs text-gray-400 flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{item.totalOrders}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(item)}
                    className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                      item.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100")}>
                    {item.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    {item.isActive ? "إخفاء" : "تفعيل"}
                  </button>
                  <button onClick={() => setModal({ open: true, item })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
                    <Pencil className="w-3 h-3" /> تعديل
                  </button>
                  <button onClick={() => handleDelete(item)}
                    className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors mr-auto">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && <PackageModal item={modal.item} onClose={() => setModal({ open: false })} onSave={handleSave} />}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Tab: Builder Config ───────────────────────────────────────────────────────

function BuilderConfigTab() {
  const { data: res, loading, refetch } = useApi(() => flowerBuilderApi.catalog(), []);
  const { data: invRes }                = useApi(() => flowerBuilderApi.inventory(), []);
  const { mutate: createItem }          = useMutation((d: any) => flowerBuilderApi.createItem(d));
  const { mutate: updateItem }          = useMutation((d: any) => flowerBuilderApi.updateItem(d.id, d));
  const { mutate: deleteItem }          = useMutation((id: string) => flowerBuilderApi.deleteItem(id));

  const [modal, setModal]   = useState<{ open: boolean; item?: any }>({ open: false });
  const [toast, setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [activeType, setActiveType] = useState("packaging");

  const catalog = res?.data || { packaging: [], gift: [], card: [], delivery: [] };
  const inventory: any[] = invRes?.data || [];
  const curItems: any[] = (catalog as any)[activeType] || [];

  const handleSave = async (form: any) => {
    try {
      modal.item ? await updateItem({ ...form, id: modal.item.id }) : await createItem(form);
      setToast({ msg: "تم الحفظ", type: "success" });
      setModal({ open: false });
      refetch();
    } catch { setToast({ msg: "فشل الحفظ", type: "error" }); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذا العنصر؟")) return;
    try { await deleteItem(id); setToast({ msg: "تم الحذف", type: "success" }); refetch(); }
    catch { setToast({ msg: "فشل الحذف", type: "error" }); }
  };

  const curType = CATALOG_TYPES.find(t => t.value === activeType)!;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-brand-50 border border-brand-100 rounded-xl text-sm text-brand-700">
        <Settings className="w-4 h-4 mt-0.5 shrink-0" />
        <p>هذه الخيارات تظهر للعملاء في صفحة بناء الباقة. أضف خيارات التغليف والهدايا والكروت والتوصيل التي تريد تقديمها.</p>
      </div>

      {/* Type tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATALOG_TYPES.map(t => {
          const count = ((catalog as any)[t.value] || []).length;
          return (
            <button key={t.value} onClick={() => setActiveType(t.value)}
              className={clsx("flex items-center gap-3 p-4 rounded-2xl border text-right transition-all",
                activeType === t.value ? "bg-brand-500 border-brand-500 text-white shadow-sm" : "bg-white border-gray-100 hover:border-gray-200 text-gray-700")}>
              <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                activeType === t.value ? "bg-white/20" : t.color)}>
                <t.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">{t.label}</p>
                <p className={clsx("text-xs mt-0.5", activeType === t.value ? "text-white/70" : "text-gray-400")}>{count} خيار</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Items list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <curType.icon className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">خيارات {curType.label}</h3>
            <span className="text-xs text-gray-400">({curItems.length})</span>
          </div>
          <button onClick={() => setModal({ open: true, item: undefined })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-3.5 h-3.5" /> إضافة
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center animate-pulse text-gray-300">...</div>
        ) : curItems.length === 0 ? (
          <div className="py-12 text-center">
            <curType.icon className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">لا توجد خيارات — أضف أول عنصر</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {curItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/40 transition-colors">
                <span className="text-2xl w-8 text-center">{item.icon || "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                    {item.nameEn && <span className="text-xs text-gray-400" dir="ltr">{item.nameEn}</span>}
                    {item.isDefault && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-xs">افتراضي</span>}
                    {!item.isActive && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">معطل</span>}
                  </div>
                  {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                </div>
                <div className="text-sm font-bold text-brand-600 shrink-0">
                  {Number(item.price) === 0 ? <span className="text-emerald-600 font-medium text-xs">مجاني</span> : `${Number(item.price).toFixed(0)} ر.س`}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModal({ open: true, item })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inventory status */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Flower2 className="w-4 h-4 text-pink-500" /> مخزون الورود المتاح للبيع
          </h3>
          <span className="text-xs text-gray-400">{inventory.filter(f => f.stock > 0).length} نوع متاح</span>
        </div>
        {inventory.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">لا توجد ورود في المخزون — أضف من صفحة مخزون الورود</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {inventory.map((f: any) => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{f.name} {f.color && <span className="text-gray-400">— {f.color}</span>}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.type}</p>
                </div>
                <div className="text-sm font-bold text-brand-600">{Number(f.sellPrice).toFixed(2)} ر.س</div>
                <div className={clsx("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold",
                  f.stock <= 10 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>
                  {f.stock <= 10 && <AlertCircle className="w-3 h-3" />}
                  {f.stock} متبقي
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.open && (
        <CatalogItemModal
          item={modal.item ? { ...modal.item, type: modal.item.type || activeType } : { type: activeType }}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Tab: Page Settings ────────────────────────────────────────────────────────

const ACCENT_PRESETS = [
  "#e11d48","#db2777","#9333ea","#7c3aed","#2563eb","#0891b2",
  "#059669","#d97706","#ea580c","#dc2626","#374151","#1e293b",
];

function PageSettingsTab({ orgSlug }: { orgSlug: string }) {
  const { data: res, loading } = useApi(() => flowerBuilderApi.pageConfig(), []);
  const { mutate: save }       = useMutation((d: any) => flowerBuilderApi.updatePageConfig(d));

  const [cfg, setCfg]   = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; type: "success"|"error" }|null>(null);
  const [newTemplate, setNewTemplate] = useState("");

  useEffect(() => {
    if (res?.data) { setCfg(res.data); setDirty(false); }
  }, [res]);

  if (loading || !cfg) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
      ))}
    </div>
  );

  const set = (k: string, v: any) => { setCfg((p: any) => ({ ...p, [k]: v })); setDirty(true); };
  const setFeature = (k: string, v: boolean) => {
    setCfg((p: any) => ({ ...p, features: { ...p.features, [k]: v } }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(cfg);
      setToast({ msg: "تم حفظ إعدادات الصفحة", type: "success" });
      setDirty(false);
    } catch { setToast({ msg: "فشل الحفظ", type: "error" }); }
    finally { setSaving(false); }
  };

  const addTemplate = () => {
    if (!newTemplate.trim()) return;
    set("cardTemplates", [...(cfg.cardTemplates || []), newTemplate.trim()]);
    setNewTemplate("");
  };
  const removeTemplate = (i: number) => {
    set("cardTemplates", cfg.cardTemplates.filter((_: any, idx: number) => idx !== i));
  };

  const publicUrl = `/flowers/${orgSlug}`;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-500" /> إعدادات صفحة العملاء
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">تحكم في مظهر وخيارات صفحة بناء الباقة</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            <Eye className="w-3.5 h-3.5" /> معاينة
          </a>
          <Button icon={Save} onClick={handleSave} loading={saving} disabled={!dirty}>
            حفظ
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>لديك تغييرات غير محفوظة</span>
        </div>
      )}

      {/* Hero section */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-gray-900 text-sm">قسم الترحيب</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">العنوان الرئيسي</label>
            <input value={cfg.heroTitle} onChange={e => set("heroTitle", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">العنوان الفرعي</label>
            <input value={cfg.heroSubtitle} onChange={e => set("heroSubtitle", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">رسالة الشكر (بعد تأكيد الطلب)</label>
            <textarea value={cfg.thankYouMessage} onChange={e => set("thankYouMessage", e.target.value)}
              rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 resize-none" />
          </div>
        </div>
      </div>

      {/* Color */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Palette className="w-4 h-4 text-violet-500" />
          <h3 className="font-semibold text-gray-900 text-sm">اللون الرئيسي</h3>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-3">
            {ACCENT_PRESETS.map(color => (
              <button key={color} onClick={() => set("accentColor", color)}
                className={clsx("w-8 h-8 rounded-full border-2 transition-all",
                  cfg.accentColor === color ? "border-gray-800 scale-110 shadow" : "border-transparent hover:scale-105")}
                style={{ background: color }} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input type="color" value={cfg.accentColor} onChange={e => set("accentColor", e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200" />
            <input value={cfg.accentColor} onChange={e => set("accentColor", e.target.value)}
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 font-mono" dir="ltr" />
            <div className="flex-1 h-10 rounded-xl shadow-sm"
              style={{ background: `linear-gradient(135deg, ${cfg.accentColor}, ${cfg.accentColor}99)` }} />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-gray-900 text-sm">الميزات المفعّلة</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { key: "showPackages",    label: "عرض الباقات الجاهزة",    desc: "يظهر قسم الباقات المسبقة في أعلى الصفحة" },
            { key: "showGifts",       label: "إضافة الهدايا",           desc: "يسمح للعميل باختيار هدايا مرافقة للورود" },
            { key: "showCard",        label: "بطاقة التهنئة",           desc: "يسمح للعميل بإضافة كرت ورسالة مخصصة" },
            { key: "deliveryEnabled", label: "خدمة التوصيل",            desc: "يعرض خيار توصيل الطلب للمنزل" },
            { key: "pickupEnabled",   label: "الاستلام من المتجر",       desc: "يعرض خيار الاستلام الذاتي" },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{f.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
              </div>
              <Toggle checked={cfg.features?.[f.key] ?? true} onChange={v => setFeature(f.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Flower limits */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Flower2 className="w-4 h-4 text-pink-500" />
          <h3 className="font-semibold text-gray-900 text-sm">قيود الورود</h3>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">الحد الأدنى للورود</label>
            <input type="number" min={1} max={50} value={cfg.minFlowers}
              onChange={e => set("minFlowers", parseInt(e.target.value) || 1)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 text-center tabular-nums" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">الحد الأقصى للورود</label>
            <input type="number" min={5} max={200} value={cfg.maxFlowers}
              onChange={e => set("maxFlowers", parseInt(e.target.value) || 50)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 text-center tabular-nums" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">عتبة اقتراح الباقة (عدد الورود)</label>
            <input type="number" min={1} max={20} value={cfg.upsellThreshold}
              onChange={e => set("upsellThreshold", parseInt(e.target.value) || 5)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 text-center tabular-nums" dir="ltr" />
            <p className="text-xs text-gray-400 mt-1">عند تجاوزه يُقترح للعميل الترقية لباقة جاهزة</p>
          </div>
          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-gray-900">شارة "آخر قطع"</p>
              <p className="text-xs text-gray-400">تظهر عند المخزون المنخفض</p>
            </div>
            <Toggle checked={cfg.showUrgencyBadge ?? true} onChange={v => set("showUrgencyBadge", v)} />
          </div>
        </div>
      </div>

      {/* Card templates */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-sky-500" />
          <h3 className="font-semibold text-gray-900 text-sm">قوالب رسائل الكرت</h3>
          <span className="text-xs text-gray-400">(يختار منها العميل)</span>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(cfg.cardTemplates || []).map((t: string, i: number) => (
              <div key={i} className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 rounded-xl px-3 py-1.5 text-sm text-sky-800">
                <span>{t}</span>
                <button onClick={() => removeTemplate(i)} className="text-sky-400 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newTemplate} onChange={e => setNewTemplate(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTemplate()}
              placeholder="أضف قالب رسالة جديد..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-sky-300" />
            <button onClick={addTemplate}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delivery note */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-gray-900 text-sm">ملاحظة التوصيل</h3>
        </div>
        <div className="p-5">
          <textarea value={cfg.deliveryNote} onChange={e => set("deliveryNote", e.target.value)}
            rows={3} placeholder="مثال: التوصيل داخل المدينة خلال 3-5 ساعات. يُرجى التواصل للتنسيق مع الفريق..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-300 resize-none" />
        </div>
      </div>

      {/* Live preview hint */}
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
        <Globe className="w-4 h-4 shrink-0" />
        <span>رابط صفحة العملاء: <a href={publicUrl} target="_blank" rel="noopener noreferrer"
          className="font-mono underline underline-offset-2">{window.location.origin}{publicUrl}</a></span>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "orders",   label: "الطلبات",   icon: ClipboardList },
  { id: "packages", label: "الباقات",   icon: Flower2 },
  { id: "builder",  label: "المُخصِّص", icon: Settings },
  { id: "page",     label: "الصفحة",    icon: Globe },
];

export function ArrangementsPage() {
  const [tab, setTab] = useState("orders");
  const [orgSlug, setOrgSlug] = useState<string>("demo");

  useEffect(() => {
    settingsApi.profile().then((res: any) => {
      if (res?.data?.org?.slug) setOrgSlug(res.data.org.slug);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Flower2 className="w-5 h-5 text-pink-500" /> استوديو الورود
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة الطلبات، الباقات، والمُخصِّص المرئي للعملاء</p>
        </div>
        <a href={`/flowers/${orgSlug}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
          <ExternalLink className="w-4 h-4" /> عرض صفحة العميل
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "orders"   && <OrdersTab />}
      {tab === "packages" && <PackagesTab />}
      {tab === "builder"  && <BuilderConfigTab />}
      {tab === "page"     && <PageSettingsTab orgSlug={orgSlug} />}
    </div>
  );
}
