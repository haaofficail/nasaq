import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi, useMutation } from "@/hooks/useApi";
import { flowerBuilderApi, teamApi } from "@/lib/api";
import {
  Truck, Phone, MapPin, Clock, MessageSquare, CheckCircle2,
  AlertTriangle, Package, Loader2, X, User, ChevronDown, ChevronUp,
  RefreshCw, Gift, Search, ArrowLeft,
} from "lucide-react";
import { clsx } from "clsx";
import { fmtDate } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import { confirmDialog } from "@/components/ui";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface FlowerOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  recipient_name?: string;
  recipient_phone?: string;
  is_surprise?: boolean;
  items: any;
  subtotal: string | number;
  total: string | number;
  status: string;
  version?: number;
  delivery_type?: string;
  delivery_address?: any;
  delivery_date?: string;
  pickup_time?: string;
  gift_message?: string;
  packaging?: string;
  created_at: string;
  driver_name?: string;
  driver_phone?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: "",                label: "الكل" },
  { value: "pending",         label: "جديد" },
  { value: "preparing",       label: "تجهيز" },
  { value: "ready",           label: "جاهز" },
  { value: "out_for_delivery", label: "في الطريق" },
  { value: "delivered",       label: "تم التوصيل" },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  pending:          { label: "جديد",        bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",  dot: "bg-blue-400" },
  confirmed:        { label: "مؤكد",        bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-200",   dot: "bg-sky-400" },
  preparing:        { label: "تجهيز",       bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", dot: "bg-amber-400" },
  ready:            { label: "جاهز",        bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200",dot: "bg-purple-400" },
  out_for_delivery: { label: "في الطريق",   bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200",dot: "bg-orange-400" },
  delivered:        { label: "تم التوصيل", bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200", dot: "bg-green-400" },
  cancelled:        { label: "ملغي",        bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200",   dot: "bg-red-400" },
};

const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-500";

// ─── Helpers ────────────────────────────────────────────────────────────────────
function parseItems(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function parseAddress(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") {
    try {
      const obj = JSON.parse(raw);
      return [obj.street, obj.district, obj.city].filter(Boolean).join("، ");
    } catch { return raw; }
  }
  return [raw.street, raw.district, raw.city].filter(Boolean).join("، ");
}

function fmtTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ─── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" };
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border", cfg.bg, cfg.text, cfg.border)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="h-4 bg-gray-100 rounded w-20" />
          <div className="h-5 bg-gray-100 rounded-lg w-14" />
        </div>
        <div className="h-6 bg-gray-100 rounded-lg w-20" />
      </div>
      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-100 rounded-full shrink-0" />
          <div className="h-4 bg-gray-100 rounded w-32" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-100 rounded-full shrink-0" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-100 rounded-full shrink-0" />
          <div className="h-3 bg-gray-100 rounded w-3/4" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-100 rounded-full shrink-0" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
        <div className="h-5 bg-gray-100 rounded w-20" />
        <div className="flex items-center gap-2">
          <div className="h-9 bg-gray-100 rounded-xl w-24" />
          <div className="h-9 bg-gray-100 rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
}

function SkeletonKpiCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-gray-100 mb-3" />
      <div className="h-7 bg-gray-100 rounded w-10 mb-1.5" />
      <div className="h-3 bg-gray-100 rounded w-16" />
    </div>
  );
}

// ─── Staff Modal (generic: driver or florist) ────────────────────────────────────
interface StaffModalProps {
  title: string;
  filterKeyword?: string;   // filter job titles (e.g. "مندوب")
  orderId: string;
  onClose: () => void;
  onConfirm: (staffId: string, staffName: string, staffPhone: string, notes: string) => Promise<void>;
  loading: boolean;
}

// Legacy alias kept for DriverModal callers
interface DriverModalProps {
  orderId: string;
  onClose: () => void;
  onConfirm: (driverName: string, driverPhone: string, notes: string) => Promise<void>;
  loading: boolean;
}

function StaffSelectModal({ title, filterKeyword, onClose, onConfirm, loading }: StaffModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: staffRes, loading: staffLoading } = useApi(() => teamApi.members(), []);
  const allStaff: { id: string; name: string; phone?: string; jobTitle?: string }[] =
    (staffRes?.data ?? []).filter((s: any) => s?.id);

  // Preferred = matching filter keyword, rest = everyone else
  const preferred = filterKeyword
    ? allStaff.filter(s => s.jobTitle?.includes(filterKeyword))
    : allStaff;
  const others = filterKeyword
    ? allStaff.filter(s => !s.jobTitle?.includes(filterKeyword))
    : [];

  const handleConfirm = () => {
    const selected = allStaff.find(s => s.id === selectedId);
    if (!selected) return;
    onConfirm(selected.id, selected.name, selected.phone ?? "", notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">اختر الموظف *</label>
            {staffLoading ? (
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ) : allStaff.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">لا يوجد موظفون مسجلون</p>
            ) : (
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={inputCls}>
                <option value="">— اختر الموظف —</option>
                {preferred.length > 0 && (
                  <optgroup label={filterKeyword ? `— ${filterKeyword} —` : "الموظفون"}>
                    {preferred.map(s => (
                      <option key={s.id} value={s.id}>{s.name}{s.jobTitle ? ` (${s.jobTitle})` : ""}</option>
                    ))}
                  </optgroup>
                )}
                {others.length > 0 && (
                  <optgroup label="— موظفون آخرون —">
                    {others.map(s => (
                      <option key={s.id} value={s.id}>{s.name}{s.jobTitle ? ` (${s.jobTitle})` : ""}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="أي توجيهات خاصة..."
              className={inputCls}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !selectedId}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تأكيد التعيين"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverModal({ orderId, onClose, onConfirm, loading }: DriverModalProps) {
  return (
    <StaffSelectModal
      title="تعيين مندوب توصيل"
      filterKeyword="مندوب"
      orderId={orderId}
      onClose={onClose}
      onConfirm={(_id, name, phone, notes) => onConfirm(name, phone, notes)}
      loading={loading}
    />
  );
}

// ─── Gift Message (expandable) ──────────────────────────────────────────────────
function GiftMessageCell({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  const short = message.length > 80;
  return (
    <div className="flex items-start gap-2 text-xs text-gray-600">
      <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
      <span>
        <span className="font-medium text-gray-500 ml-1">نص البطاقة:</span>
        {expanded || !short ? message : `${message.slice(0, 80)}...`}
        {short && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-brand-500 hover:underline mr-1 inline-flex items-center gap-0.5"
          >
            {expanded ? (<><ChevronUp className="w-3 h-3" />أقل</>) : (<><ChevronDown className="w-3 h-3" />المزيد</>)}
          </button>
        )}
      </span>
    </div>
  );
}

// ─── Delivery Type Badge ────────────────────────────────────────────────────────
function DeliveryTypeBadge({ type }: { type: string }) {
  const isPickup = type === "pickup" || type === "store";
  return (
    <span className={clsx(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold",
      isPickup ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-orange-50 text-orange-700 border border-orange-100"
    )}>
      {isPickup ? <Package className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
      {isPickup ? "استلام من المحل" : "توصيل"}
    </span>
  );
}

// ─── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({ order, onRefresh }: { order: FlowerOrder; onRefresh: () => void }) {
  const [showDriver, setShowDriver] = useState(false);
  const [showFlorist, setShowFlorist] = useState(false);

  const isPickup = order.delivery_type === "pickup" || order.delivery_type === "store";

  const orderVersion = order.version ?? 1;
  const updateMut = useMutation((payload: { status: string; driver_name?: string; driver_phone?: string; notes?: string }) =>
    flowerBuilderApi.updateOrderStatus(order.id, payload.status, orderVersion)
  );
  const assignStaffMut = useMutation((data: { staffId: string; staffName: string }) =>
    flowerBuilderApi.assignStaff(order.id, { ...data, version: orderVersion })
  );

  const items = parseItems(order.items);
  const total = Number(order.total ?? order.subtotal ?? 0);
  const address = parseAddress(order.delivery_address);
  const isGift = !!(order.recipient_name || order.recipient_phone);

  const handleAdvance = async (nextStatus: string) => {
    const label = STATUS_CONFIG[nextStatus]?.label ?? nextStatus;
    const ok = await confirmDialog({
      title: `تغيير حالة الطلب إلى "${label}"؟`,
      message: `سيتم تحديث حالة الطلب ${order.order_number}`,
      confirmLabel: label,
    });
    if (!ok) return;
    const res = await updateMut.mutate({ status: nextStatus });
    if (res) {
      toast.success(`تم تحديث الحالة: ${label}`);
      onRefresh();
    }
  };

  const handleAssignDriver = async (driverName: string, driverPhone: string, _notes: string) => {
    try {
      const res = await flowerBuilderApi.assignDriver(order.id, { driverName, driverPhone, version: orderVersion });
      if (res) {
        toast.success("تم تعيين المندوب وتحديث الحالة إلى: في الطريق");
        setShowDriver(false);
        onRefresh();
      }
    } catch {
      toast.error("فشل تعيين المندوب");
    }
  };

  const handleAssignFlorist = async (staffId: string, staffName: string, _phone: string, _notes: string) => {
    const res = await assignStaffMut.mutate({ staffId, staffName });
    if (res) {
      toast.success(`تم تعيين ${staffName} للتجهيز`);
      setShowFlorist(false);
      onRefresh();
    }
  };

  const actionButtons: React.ReactNode[] = [];

  if (order.status === "pending") {
    actionButtons.push(
      <button key="assign-florist" onClick={() => setShowFlorist(true)}
        className="flex-1 px-3 py-3 rounded-xl border border-amber-400 text-amber-600 hover:bg-amber-50 text-xs font-semibold transition-colors">
        تعيين منسق ورد
      </button>
    );
    actionButtons.push(
      <button key="start" onClick={() => handleAdvance("preparing")} disabled={updateMut.loading}
        className="flex-1 px-3 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
        {updateMut.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "ابدأ التجهيز"}
      </button>
    );
  } else if (order.status === "preparing") {
    actionButtons.push(
      <button key="ready" onClick={() => handleAdvance("ready")} disabled={updateMut.loading}
        className="flex-1 px-3 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
        {updateMut.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "جاهز للتسليم"}
      </button>
    );
  } else if (order.status === "ready") {
    if (isPickup) {
      // Pickup: customer comes to store — no driver needed
      actionButtons.push(
        <button key="pickup-done" onClick={() => handleAdvance("delivered")} disabled={updateMut.loading}
          className="flex-1 px-3 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
          {updateMut.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "تم الاستلام من المحل"}
        </button>
      );
    } else {
      // Delivery: assign driver first
      actionButtons.push(
        <button key="assign" onClick={() => setShowDriver(true)}
          className="flex-1 px-3 py-3 rounded-xl border border-brand-500 text-brand-500 hover:bg-blue-50 text-xs font-semibold transition-colors">
          تعيين مندوب
        </button>
      );
      actionButtons.push(
        <button key="dispatch" onClick={() => handleAdvance("out_for_delivery")} disabled={updateMut.loading}
          className="flex-1 px-3 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
          {updateMut.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "تسليم للمندوب"}
        </button>
      );
    }
  } else if (order.status === "out_for_delivery") {
    actionButtons.push(
      <button key="deliver" onClick={() => handleAdvance("delivered")} disabled={updateMut.loading}
        className="flex-1 px-3 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
        {updateMut.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "تأكيد التوصيل"}
      </button>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-800">{order.order_number}</span>
            <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{fmtTime(order.created_at)}</span>
            {order.delivery_type && <DeliveryTypeBadge type={order.delivery_type} />}
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Card Body */}
        <div className="px-4 py-3 space-y-2.5">
          {/* Customer */}
          <div className="flex items-start gap-2">
            <User className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-800">{order.customer_name}</span>
              <a
                href={`tel:${order.customer_phone}`}
                className="flex items-center gap-1 text-xs text-brand-500 hover:underline mt-0.5 w-fit"
              >
                <Phone className="w-3 h-3" />
                {order.customer_phone}
              </a>
            </div>
          </div>

          {/* Recipient (gift) */}
          {isGift && (
            <div className="flex items-start gap-2 bg-pink-50 border border-pink-100 rounded-xl px-3 py-2">
              <Gift className="w-3.5 h-3.5 mt-0.5 text-pink-400 shrink-0" />
              <div className="text-xs">
                {order.is_surprise ? (
                  <span className="font-medium text-pink-700">مفاجأة — لا تتصل</span>
                ) : (
                  <>
                    <span className="text-gray-500">هدية لـ: </span>
                    <span className="font-medium text-gray-800">{order.recipient_name ?? "—"}</span>
                    {order.recipient_phone && (
                      <a href={`tel:${order.recipient_phone}`} className="text-brand-500 hover:underline mr-2">
                        {order.recipient_phone}
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          {address && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
              <span>{address}</span>
            </div>
          )}

          {/* Pickup / delivery time */}
          {(order.delivery_date || order.pickup_time) && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>
                {order.delivery_date ? `وقت الاستلام: ${fmtDate(order.delivery_date)} — ${fmtTime(order.delivery_date)}` : `وقت الاستلام: ${order.pickup_time}`}
              </span>
            </div>
          )}

          {/* Gift message */}
          {order.gift_message && <GiftMessageCell message={order.gift_message} />}

          {/* Items */}
          {items.length > 0 && (
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Package className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
              <span>
                {items.map((item: any, i: number) => {
                  const name = item.name ?? item.nameAr ?? `عنصر ${i + 1}`;
                  const qty = item.qty ?? item.quantity ?? 1;
                  return `${name} × ${qty}`;
                }).join(" + ")}
              </span>
            </div>
          )}

          {/* Assigned florist (if set) */}
          {(order as any).assigned_staff_name && (
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <span className="text-gray-500">المنسق: </span>
                <span className="font-medium">{(order as any).assigned_staff_name}</span>
              </span>
            </div>
          )}

          {/* Driver info (if assigned) */}
          {order.driver_name && (
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
              <Truck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>
                <span className="text-gray-500">المندوب: </span>
                <span className="font-medium">{order.driver_name}</span>
                {order.driver_phone && (
                  <a href={`tel:${order.driver_phone}`} className="text-brand-500 hover:underline mr-1">— {order.driver_phone}</a>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {total.toLocaleString("en-US")} <span className="text-xs font-normal text-gray-400">ر.س</span>
          </span>

          {order.status === "delivered" ? (
            <div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {isPickup ? "تم الاستلام" : "تم التوصيل"}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {actionButtons}
            </div>
          )}
        </div>
      </div>

      {/* Florist Assignment Modal */}
      {showFlorist && (
        <StaffSelectModal
          title="تعيين منسق ورد للطلب"
          filterKeyword="منسق"
          orderId={order.id}
          onClose={() => setShowFlorist(false)}
          onConfirm={handleAssignFlorist}
          loading={assignStaffMut.loading}
        />
      )}

      {/* Driver Modal */}
      {showDriver && (
        <DriverModal
          orderId={order.id}
          onClose={() => setShowDriver(false)}
          onConfirm={handleAssignDriver}
          loading={updateMut.loading}
        />
      )}
    </>
  );
}

type DeliveryTypeFilter = "" | "pickup" | "delivery";

const TYPE_TABS: { value: DeliveryTypeFilter; label: string }[] = [
  { value: "",         label: "الكل" },
  { value: "pickup",   label: "استلام من المحل" },
  { value: "delivery", label: "توصيل" },
];

// ─── Main Page ───────────────────────────────────────────────────────────────────
export function FlowerDeliveryPage() {
  const [activeStatus, setActiveStatus]         = useState("");
  const [activeType,   setActiveType]           = useState<DeliveryTypeFilter>("");
  const [searchQuery, setSearchQuery]           = useState("");

  const { data: statsRes, loading: statsLoading } = useApi(
    () => flowerBuilderApi.orderStats(),
    []
  );
  // Server-side status filter (API supports it) + client-side search/type for instant UX
  const { data: ordersRes, loading: ordersLoading, error, refetch } = useApi(
    () => flowerBuilderApi.orders(activeStatus ? { status: activeStatus } : undefined),
    [activeStatus]
  );

  const stats = statsRes?.data ?? {};
  const allOrders: FlowerOrder[] = ordersRes?.data ?? [];

  // Client-side filter: delivery type + search (status already filtered server-side)
  const orders = useMemo(() => {
    return allOrders.filter(o => {
      // Delivery type filter (client-side since API doesn't support it)
      if (activeType === "pickup" && o.delivery_type !== "pickup" && o.delivery_type !== "store") return false;
      if (activeType === "delivery" && (o.delivery_type === "pickup" || o.delivery_type === "store")) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (o.customer_name ?? "").toLowerCase().includes(q) ||
               (o.customer_phone ?? "").toLowerCase().includes(q) ||
               (o.order_number ?? "").toLowerCase().includes(q) ||
               (o.driver_name ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [allOrders, activeType, searchQuery]);

  const todayOrders = allOrders.filter(o => {
    const d = new Date(o.created_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });

  const pickupCount   = allOrders.filter(o => o.delivery_type === "pickup" || o.delivery_type === "store").length;
  const deliveryCount = allOrders.filter(o => o.delivery_type !== "pickup" && o.delivery_type !== "store" && o.delivery_type).length;

  const countByStatus = (s: string) => {
    const n = Number(stats[s] ?? 0);
    return n > 0 ? n : allOrders.filter(o => o.status === s).length;
  };

  // Pending = not yet out for delivery (pending + preparing + ready)
  const pendingDeliveries = countByStatus("pending") + countByStatus("preparing") + countByStatus("ready");

  const todayDateStr = new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-5 p-5" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">متابعة التوصيل</h1>
          <p className="text-sm text-gray-400 mt-0.5">{todayDateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          {!statsLoading && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-500 text-sm font-semibold">
              <Truck className="w-4 h-4" />
              {todayOrders.length} طلب اليوم
            </span>
          )}
          <button
            onClick={refetch}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-100 hover:bg-gray-50 text-gray-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delivery Summary KPIs */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonKpiCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
              <Package className="w-4 h-4 text-brand-500" />
            </div>
            <p className="text-2xl font-bold text-brand-500 tabular-nums">{todayOrders.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">اجمالي طلبات اليوم</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600 tabular-nums">{pendingDeliveries}</p>
            <p className="text-xs text-gray-400 mt-0.5">بانتظار التوصيل</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <Truck className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{countByStatus("out_for_delivery")}</p>
            <p className="text-xs text-gray-400 mt-0.5">في الطريق</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600 tabular-nums">{countByStatus("delivered")}</p>
            <p className="text-xs text-gray-400 mt-0.5">تم التوصيل</p>
          </div>
        </div>
      )}

      {/* Delivery Type Segment */}
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-3">
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setActiveType(t.value)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                activeType === t.value
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {t.label}
              {t.value === "pickup"   && pickupCount   > 0 && ` (${pickupCount})`}
              {t.value === "delivery" && deliveryCount > 0 && ` (${deliveryCount})`}
              {t.value === "" && ` (${allOrders.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="بحث باسم العميل، رقم الجوال، رقم الطلب، أو اسم المندوب..."
          className="w-full bg-white border border-gray-100 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-500"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={clsx(
                "px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                activeStatus === tab.value
                  ? "border-brand-500 text-brand-500 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="p-4">
          {ordersLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <AlertTriangle className="w-9 h-9 text-red-400" />
              <p className="text-sm text-red-500">حدث خطأ في تحميل بيانات التوصيل</p>
              <button onClick={refetch} className="text-sm text-brand-500 hover:underline">
                إعادة المحاولة
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Truck className="w-7 h-7 text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600">لا توجد طلبات توصيل</p>
                <p className="text-xs text-gray-400 mt-1">
                  {activeStatus
                    ? `لا توجد طلبات بحالة "${STATUS_CONFIG[activeStatus]?.label ?? activeStatus}" لهذا اليوم`
                    : "لم يتم استلام أي طلبات توصيل بعد لهذا اليوم"}
                </p>
              </div>
              <button onClick={refetch} className="text-sm text-brand-500 hover:underline">
                تحديث
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} onRefresh={refetch} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* الخطوة التالية */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">الخطوة التالية</p>
          <p className="text-xs text-brand-500 mt-0.5">بعد التسليم — راجع مستوى المخزون</p>
        </div>
        <Link to="/dashboard/flower-inventory" className="flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-600 transition-colors">
          المخزون <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default FlowerDeliveryPage;
