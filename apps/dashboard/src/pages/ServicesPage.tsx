import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Search, List, LayoutGrid, Eye, EyeOff, Copy, Trash2, Pencil,
  Star, Package, Globe, Loader2, AlertCircle, X, Download, ChevronDown,
  ChevronUp, Calendar, Wrench, MapPin, Home, Truck, UtensilsCrossed,
  Gift, ClipboardList, MoreHorizontal, Clock, ShoppingCart,
  ArrowUpDown, CheckSquare, Square,
} from "lucide-react";
import { clsx } from "clsx";
import { servicesApi, categoriesApi, templatesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal } from "@/components/ui";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useBusiness } from "@/hooks/useBusiness";
import { useOrgContext } from "@/hooks/useOrgContext";
import { toast } from "@/hooks/useToast";

// ============================================================
// CONSTANTS
// ============================================================

const SERVICE_TYPES: Array<{ value: string; label: string; desc: string; icon: LucideIcon }> = [
  { value: "appointment",      label: "حجز موعد",       desc: "العميل يحجز وقتاً محدداً مع موظف",          icon: Calendar },
  { value: "execution",        label: "تنفيذ وصيانة",   desc: "تنفيذ عمل أو صيانة في موعد محدد",           icon: Wrench },
  { value: "field_service",    label: "خدمة ميدانية",   desc: "الموظف يزور العميل في موقعه",               icon: MapPin },
  { value: "rental",           label: "تأجير",           desc: "العميل يستأجر أصلاً لفترة محددة",           icon: Home },
  { value: "event_rental",     label: "تأجير فعالية",    desc: "تأجير قاعة أو مكان لحدث بعينه",            icon: Star },
  { value: "product",          label: "منتج",            desc: "منتج يُباع مباشرة عبر الكاشير أو الموقع",  icon: Package },
  { value: "product_shipping", label: "منتج بشحن",      desc: "منتج يُشحن للعميل عبر المتجر الإلكتروني",  icon: Truck },
  { value: "food_order",       label: "طعام ومشروبات",  desc: "وجبة أو منتج غذائي يظهر في قائمة الطعام",  icon: UtensilsCrossed },
  { value: "package",          label: "باقة",            desc: "مجموعة خدمات مجمّعة بسعر موحد",             icon: Gift },
  { value: "add_on",           label: "خيار إضافي",     desc: "خيار يختاره العميل مع خدمة أخرى",           icon: Plus },
  { value: "project",          label: "مشروع",           desc: "عمل طويل المدى يُنفَّذ على مراحل",          icon: ClipboardList },
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

const TYPE_LABEL: Record<string, string> = {
  appointment:      "موعد",
  execution:        "تنفيذ",
  field_service:    "ميداني",
  rental:           "تأجير",
  event_rental:     "فعالية",
  product:          "منتج",
  product_shipping: "شحن",
  food_order:       "طعام",
  package:          "باقة",
  add_on:           "إضافة",
  project:          "مشروع",
};

const TYPE_COLOR: Record<string, string> = {
  appointment:      "bg-blue-50 text-blue-600 border-blue-100",
  execution:        "bg-violet-50 text-violet-600 border-violet-100",
  field_service:    "bg-orange-50 text-orange-600 border-orange-100",
  rental:           "bg-emerald-50 text-emerald-600 border-emerald-100",
  event_rental:     "bg-teal-50 text-teal-600 border-teal-100",
  product:          "bg-gray-100 text-gray-600 border-[#eef2f6]",
  product_shipping: "bg-amber-50 text-amber-600 border-amber-100",
  food_order:       "bg-red-50 text-red-600 border-red-100",
  package:          "bg-indigo-50 text-indigo-600 border-indigo-100",
  add_on:           "bg-pink-50 text-pink-600 border-pink-100",
  project:          "bg-cyan-50 text-cyan-600 border-cyan-100",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:   { label: "منشور",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  draft:    { label: "مسودة",   cls: "bg-gray-50 text-gray-500 border-[#eef2f6]" },
  paused:   { label: "معلقة",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  archived: { label: "مؤرشفة",  cls: "bg-red-50 text-red-600 border-red-200" },
};

const INITIAL_COLORS = [
  { bg: "bg-brand-100",  text: "text-brand-600"  },
  { bg: "bg-violet-100", text: "text-violet-600" },
  { bg: "bg-emerald-100",text: "text-emerald-600"},
  { bg: "bg-amber-100",  text: "text-amber-600"  },
  { bg: "bg-rose-100",   text: "text-rose-600"   },
  { bg: "bg-teal-100",   text: "text-teal-600"   },
  { bg: "bg-indigo-100", text: "text-indigo-600" },
  { bg: "bg-cyan-100",   text: "text-cyan-600"   },
];

// ============================================================
// HELPERS
// ============================================================

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) return `${minutes} د`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}س ${m}د` : `${h} ساعة`;
}

function fmtPrice(val: number | string): string {
  const n = Number(val || 0);
  return n.toLocaleString("ar-SA", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
}

function getViewFromStorage(): "list" | "cards" {
  try {
    const saved = localStorage.getItem("nasaq_svc_view");
    if (saved === "list" || saved === "cards") return saved;
  } catch {}
  return "list";
}

// ============================================================
// UI ATOMS
// ============================================================

function ServiceInitial({ name, className }: { name: string; className?: string }) {
  const code = [...(name || " ")].reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const { bg, text } = INITIAL_COLORS[code % INITIAL_COLORS.length];
  return (
    <div className={clsx("flex items-center justify-center font-bold select-none", bg, text, className)}>
      {name?.charAt(0) || "خ"}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const label = TYPE_LABEL[type];
  if (!label) return null;
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border", TYPE_COLOR[type] ?? "bg-gray-100 text-gray-500 border-[#eef2f6]")}>
      {label}
    </span>
  );
}

function VisibilityIcons({ service, size = "sm" }: { service: any; size?: "sm" | "md" }) {
  const iconCls = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-1.5">
      {service.isVisibleOnline
        ? <Globe className={clsx(iconCls, "text-brand-400")} />
        : <EyeOff className={clsx(iconCls, "text-gray-300")} />
      }
      {service.isVisibleInPOS
        ? <ShoppingCart className={clsx(iconCls, "text-emerald-500")} />
        : <ShoppingCart className={clsx(iconCls, "text-gray-200")} />
      }
    </div>
  );
}

// ============================================================
// ROW ACTIONS DROPDOWN
// ============================================================

function ServiceRowActions({
  service, onEdit, onDuplicate, onToggleStatus, onToggleOnline, onDelete,
}: {
  service: any;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
  onToggleOnline: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const act = (fn: () => void) => { fn(); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#eef2f6] rounded-xl shadow-lg py-1 w-44 text-sm overflow-hidden">
          <button onClick={() => act(onEdit)} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-right text-gray-700 hover:bg-[#f8fafc]">
            <Pencil className="w-3.5 h-3.5 text-gray-400" /> تعديل
          </button>
          <button onClick={() => act(onDuplicate)} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-right text-gray-700 hover:bg-[#f8fafc]">
            <Copy className="w-3.5 h-3.5 text-gray-400" /> تكرار الخدمة
          </button>
          <div className="h-px bg-gray-100 my-0.5" />
          <button onClick={() => act(onToggleStatus)} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-right text-gray-700 hover:bg-[#f8fafc]">
            {service.status === "active"
              ? <><EyeOff className="w-3.5 h-3.5 text-amber-400" /> تحويل لمسودة</>
              : <><Eye className="w-3.5 h-3.5 text-emerald-500" /> نشر الخدمة</>
            }
          </button>
          <button onClick={() => act(onToggleOnline)} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-right text-gray-700 hover:bg-[#f8fafc]">
            {service.isVisibleOnline
              ? <><Globe className="w-3.5 h-3.5 text-gray-400" /> إخفاء من الموقع</>
              : <><Globe className="w-3.5 h-3.5 text-brand-400" /> إظهار في الموقع</>
            }
          </button>
          <div className="h-px bg-gray-100 my-0.5" />
          <button onClick={() => act(onDelete)} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-right text-red-500 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> حذف
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SERVICE CARD — Cards View
// ============================================================

function ServiceCard({
  service, isSelected, onSelect, onEdit, onDuplicate, onToggleStatus, onToggleOnline, onDelete,
}: {
  service: any; isSelected: boolean;
  onSelect: () => void; onEdit: () => void; onDuplicate: () => void;
  onToggleStatus: () => void; onToggleOnline: () => void; onDelete: () => void;
}) {
  const dur = formatDuration(service.durationMinutes);
  const deposit = Number(service.depositPercent || 0);

  return (
    <div className={clsx(
      "relative bg-white rounded-2xl border overflow-hidden transition-all flex flex-col group",
      "hover:shadow-md hover:-translate-y-0.5",
      isSelected ? "border-brand-300 ring-2 ring-brand-100" : "border-[#eef2f6] hover:border-[#eef2f6]",
    )}>
      {/* Selection checkbox — top left */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <button
          onClick={e => { e.stopPropagation(); onSelect(); }}
          className={clsx(
            "w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-sm",
            isSelected ? "bg-brand-500 text-white" : "bg-white/80 text-gray-400 backdrop-blur-sm opacity-0 group-hover:opacity-100",
          )}
        >
          {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Status badge — top right */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <StatusPill status={service.status} />
      </div>

      {/* Image area */}
      <div
        className="relative aspect-[4/3] overflow-hidden bg-[#f8fafc] cursor-pointer shrink-0"
        onClick={onEdit}
      >
        {service.coverImage ? (
          <img
            src={service.coverImage}
            alt={service.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ServiceInitial name={service.name} className="w-full h-full text-3xl rounded-none" />
        )}
        {/* Edit overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-end justify-end p-2.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="bg-white text-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg hover:bg-brand-50 hover:text-brand-600 transition-colors flex items-center gap-1.5"
          >
            <Pencil className="w-3 h-3" /> تعديل
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col cursor-pointer" onClick={onEdit}>
        {/* Name */}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-brand-600 transition-colors mb-1">
          {service.name}
        </h3>
        {/* Description */}
        <p className="text-[12px] text-gray-400 line-clamp-2 mb-3 flex-1" style={{ minHeight: "2rem" }}>
          {service.description || service.categoryName || "بدون وصف"}
        </p>

        {/* Type + Duration */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <TypeBadge type={service.serviceType} />
          {dur && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Clock className="w-3 h-3" /> {dur}
            </span>
          )}
          {deposit > 0 && (
            <span className="text-[11px] text-gray-400">عربون {deposit}%</span>
          )}
        </div>

        {/* Price + visibility */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-gray-900 tabular-nums">{fmtPrice(service.basePrice)}</span>
            <span className="text-xs text-gray-400 mr-1">ر.س</span>
          </div>
          <VisibilityIcons service={service} />
        </div>
      </div>

      {/* Action strip */}
      <div className="border-t border-gray-50 px-3 py-2 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={onToggleOnline}
          className={clsx(
            "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1",
            service.isVisibleOnline
              ? "text-brand-500 hover:bg-brand-50"
              : "text-gray-400 hover:bg-gray-100",
          )}
          title={service.isVisibleOnline ? "إخفاء من الموقع" : "إظهار في الموقع"}
        >
          <Globe className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleStatus}
          className={clsx(
            "p-1.5 rounded-lg transition-colors",
            service.status === "active"
              ? "text-emerald-500 hover:bg-emerald-50"
              : "text-gray-400 hover:bg-gray-100",
          )}
          title={service.status === "active" ? "تحويل لمسودة" : "نشر الخدمة"}
        >
          {service.status === "active" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <ServiceRowActions
          service={service}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onToggleStatus={onToggleStatus}
          onToggleOnline={onToggleOnline}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

// ============================================================
// SERVICE LIST ROW — List View (desktop table)
// ============================================================

function ServiceListRow({
  service, isSelected, onSelect, onEdit, onDuplicate, onToggleStatus, onToggleOnline, onDelete,
}: {
  service: any; isSelected: boolean;
  onSelect: () => void; onEdit: () => void; onDuplicate: () => void;
  onToggleStatus: () => void; onToggleOnline: () => void; onDelete: () => void;
}) {
  const dur = formatDuration(service.durationMinutes);
  const deposit = Number(service.depositPercent || 0);

  return (
    <div className={clsx(
      "grid items-center px-5 py-3 border-b border-gray-50 last:border-0 transition-colors group",
      "grid-cols-[28px_1fr_auto_80px] lg:grid-cols-[28px_1fr_150px_120px_160px_80px]",
      "gap-3 lg:gap-4",
      isSelected ? "bg-brand-50/50" : "hover:bg-[#f8fafc]/70",
    )}>
      {/* Checkbox */}
      <div onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
        />
      </div>

      {/* Service info */}
      <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0">
          {service.coverImage
            ? <img src={service.coverImage} alt={service.name} loading="lazy" className="w-full h-full object-cover" />
            : <ServiceInitial name={service.name} className="w-11 h-11 text-base rounded-xl" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
              {service.name}
            </h4>
            <TypeBadge type={service.serviceType} />
          </div>
          <p className="text-[12px] text-gray-400 truncate">
            {service.description || service.categoryName || "—"}
          </p>
        </div>
      </div>

      {/* Duration + deposit — hidden on md, visible on lg */}
      <div className="hidden lg:flex flex-col gap-0.5 text-[12px] text-gray-500">
        {dur && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" /> {dur}
          </span>
        )}
        {deposit > 0 && (
          <span className="text-gray-400">عربون {deposit}%</span>
        )}
        {!dur && !deposit && <span className="text-gray-300">—</span>}
      </div>

      {/* Price — hidden on md, visible on lg */}
      <div className="hidden lg:block text-right">
        <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtPrice(service.basePrice)}</span>
        <span className="text-[11px] text-gray-400 mr-0.5">ر.س</span>
      </div>

      {/* Status + visibility — hidden on md, visible on lg */}
      <div className="hidden lg:flex items-center gap-2 flex-wrap">
        <StatusPill status={service.status} />
        <VisibilityIcons service={service} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
        {/* On md (without detail columns), show price and status inline */}
        <div className="lg:hidden flex items-center gap-2 mr-2">
          <span className="text-xs font-bold text-gray-800 tabular-nums">{fmtPrice(service.basePrice)}</span>
          <StatusPill status={service.status} />
        </div>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title="تعديل"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <ServiceRowActions
          service={service}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onToggleStatus={onToggleStatus}
          onToggleOnline={onToggleOnline}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

// ============================================================
// TYPE PICKER OVERLAY
// ============================================================

function TypePickerOverlay({ onSelect, onClose, businessType }: {
  onSelect: (type: string) => void;
  onClose: () => void;
  businessType?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const allowedKeys = !showAll && businessType && BUSINESS_TYPE_GROUPS[businessType]
    ? BUSINESS_TYPE_GROUPS[businessType] : null;
  const visibleTypes = allowedKeys
    ? SERVICE_TYPES.filter(t => allowedKeys.includes(t.value))
    : SERVICE_TYPES;
  const isFiltered = !showAll && !!allowedKeys;
  const showAddOnNote = visibleTypes.some(t => t.value === "add_on");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-[#eef2f6] w-full sm:max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#eef2f6]">
          <div>
            <h2 className="text-base font-bold text-gray-900">نوع الخدمة الجديدة</h2>
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
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-[#eef2f6] bg-white text-right hover:border-brand-300 hover:bg-brand-50 transition-all group active:scale-[0.98]"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                    <TIcon className="w-5 h-5 text-gray-500 group-hover:text-brand-600 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">{t.label}</div>
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

// ============================================================
// IMPORT TEMPLATE MODAL
// ============================================================

function ImportTemplateModal({ businessType, onClose, onImported }: {
  businessType: string; onClose: () => void; onImported: () => void;
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
      const r = await templatesApi.import(businessType, { categories: selectedCategories, overwrite, status: "active" });
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-[#eef2f6] w-full sm:max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#eef2f6]">
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
                  <div key={cat.categoryName} className={clsx("rounded-xl border transition-all", isSelected ? "border-brand-200 bg-brand-50" : "border-[#eef2f6]")}>
                    <div className="flex items-center gap-3 p-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleCat(cat.categoryName)} className="w-4 h-4 accent-brand-500 cursor-pointer" />
                      <span className="flex-1 text-sm font-medium text-gray-900">{cat.categoryName}</span>
                      <span className="text-xs text-gray-400">{cat.items.length} خدمات</span>
                      <button onClick={() => toggleExpand(cat.categoryName)} className="text-gray-400 hover:text-gray-600">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-[#eef2f6] px-3 pb-3 pt-1.5 space-y-1">
                        {cat.items.map((item: any) => (
                          <div key={item.name} className="flex items-center justify-between text-xs text-gray-600 bg-white rounded-lg px-3 py-1.5 border border-[#eef2f6]">
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

        {!loading && template && (
          <div className="flex gap-3 p-5 border-t border-[#eef2f6]">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#eef2f6] text-gray-500 text-sm font-medium hover:bg-[#f8fafc]">
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

// ============================================================
// MAIN PAGE
// ============================================================

export function ServicesPage({ embedded, defaultServiceType }: { embedded?: boolean; defaultServiceType?: string } = {}) {
  const navigate = useNavigate();
  const biz = useBusiness();
  const { context } = useOrgContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── View mode (persisted) ─────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "cards">(getViewFromStorage);
  const changeView = (v: "list" | "cards") => {
    setViewMode(v);
    try { localStorage.setItem("nasaq_svc_view", v); } catch {}
  };

  // ── Filters ───────────────────────────────────────────────
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter]       = useState(defaultServiceType ?? "all");
  const [sortBy, setSortBy]               = useState("order");
  const [showSortMenu, setShowSortMenu]   = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // ── Modals ────────────────────────────────────────────────
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // ── Selection ─────────────────────────────────────────────
  const [selected, setSelected]                   = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget]           = useState<{ id: string; name: string } | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm]   = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);

  // Auto-open type picker if ?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowTypePicker(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return;
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSortMenu]);

  // ── Data ──────────────────────────────────────────────────
  const { data: servicesRes, loading, error, refetch } = useApi(() => servicesApi.list(), []);
  const { data: categoriesRes } = useApi(() => categoriesApi.list(true), []);
  const { mutate: deleteService }    = useMutation((id: string) => servicesApi.delete(id));
  const { mutate: duplicateService } = useMutation((id: string) => servicesApi.duplicate(id));
  const { mutate: updateService }    = useMutation(({ id, data }: { id: string; data: any }) => servicesApi.update(id, data));

  const services: any[] = servicesRes?.data || [];
  const categories: string[] = ["all", ...(categoriesRes?.data?.map((c: any) => c.name) || [])];
  const presentTypes: string[] = ["all", ...Array.from(new Set(services.map((s: any) => s.serviceType).filter(Boolean) as string[]))];

  // ── Derived stats ─────────────────────────────────────────
  const stats = useMemo(() => ({
    total:  services.length,
    active: services.filter((s: any) => s.status === "active").length,
    draft:  services.filter((s: any) => s.status === "draft").length,
    paused: services.filter((s: any) => s.status === "paused").length,
  }), [services]);

  // ── Filtering + sorting ───────────────────────────────────
  const filtered = useMemo(() => {
    let list = services.filter((s: any) => {
      const q = search.toLowerCase();
      if (q && !s.name?.toLowerCase().includes(q) && !s.description?.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (categoryFilter !== "all" && s.categoryName !== categoryFilter) return false;
      if (typeFilter !== "all" && s.serviceType !== typeFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":   return (a.name || "").localeCompare(b.name || "", "ar");
        case "name_desc":  return (b.name || "").localeCompare(a.name || "", "ar");
        case "price_asc":  return Number(a.basePrice || 0) - Number(b.basePrice || 0);
        case "price_desc": return Number(b.basePrice || 0) - Number(a.basePrice || 0);
        case "dur_asc":    return (a.durationMinutes || 0) - (b.durationMinutes || 0);
        case "newest":     return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:           return (a.sortOrder || 0) - (b.sortOrder || 0);
      }
    });

    return list;
  }, [services, search, statusFilter, categoryFilter, typeFilter, sortBy]);

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

  // ── Selection helpers ─────────────────────────────────────
  const allFilteredIds = filtered.map((s: any) => s.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id: string) => selected.has(id));
  const toggleOne = useCallback((id: string) => setSelected(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }), []);
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allFilteredIds));

  // ── Actions ───────────────────────────────────────────────
  const handleDelete        = (id: string, name: string) => setDeleteTarget({ id, name });
  const doDelete = async () => { if (!deleteTarget) return; await deleteService(deleteTarget.id); setDeleteTarget(null); refetch(); };
  const handleDuplicate     = async (id: string) => { await duplicateService(id); toast.success("تم نسخ الخدمة"); refetch(); };
  const handleToggleStatus  = async (service: any) => {
    const newStatus = service.status === "active" ? "draft" : "active";
    await updateService({ id: service.id, data: { status: newStatus } });
    refetch();
  };
  const handleToggleOnline  = async (service: any) => {
    await updateService({ id: service.id, data: { isVisibleOnline: !service.isVisibleOnline } });
    refetch();
  };
  const doBulkDelete = async () => {
    setShowBulkDeleteConfirm(false);
    const count = selected.size;
    for (const id of selected) await deleteService(id);
    setSelected(new Set());
    refetch();
    toast.success(`تم حذف ${count} خدمة`);
  };
  const doBulkArchive = async () => {
    setShowBulkArchiveConfirm(false);
    const count = selected.size;
    for (const id of selected) await updateService({ id, data: { status: "archived" } });
    setSelected(new Set());
    refetch();
    toast.success(`تم أرشفة ${count} خدمة`);
  };

  const clearAllFilters = () => { setStatusFilter("all"); setCategoryFilter("all"); setTypeFilter("all"); setSearch(""); };

  const SORT_OPTIONS: { key: string; label: string }[] = [
    { key: "order",      label: "الترتيب الافتراضي" },
    { key: "newest",     label: "الأحدث أولاً" },
    { key: "name_asc",   label: "الاسم (أ → ي)" },
    { key: "name_desc",  label: "الاسم (ي → أ)" },
    { key: "price_asc",  label: "السعر (الأقل)" },
    { key: "price_desc", label: "السعر (الأعلى)" },
    { key: "dur_asc",    label: "المدة (الأقصر)" },
  ];
  const sortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label ?? "ترتيب";

  if (loading) return <PageSkeleton />;

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-red-300" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Page header ───────────────────────────────────────── */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">الخدمات</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {stats.total > 0
                ? `${stats.total} خدمة · ${stats.active} منشورة · ${stats.draft} مسودة`
                : "أضف أول خدمة لنشاطك"
              }
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#eef2f6] text-sm text-gray-600 font-medium hover:bg-[#f8fafc] transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">استيراد قالب</span>
            </button>
            <Button icon={Plus} onClick={() => setShowTypePicker(true)}>{biz.terminology.newItem}</Button>
          </div>
        </div>
      )}

      {/* ── Toolbar: search + status tabs + view toggle + sort ── */}
      <div className="space-y-3">
        {/* Row 1: search + actions */}
        <div className="flex gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الوصف..."
              className="w-full bg-white border border-[#eef2f6] rounded-xl pr-10 pl-9 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all placeholder-gray-300"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div ref={sortRef} className="relative hidden sm:block">
            <button
              onClick={() => setShowSortMenu(o => !o)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                sortBy !== "order" ? "border-brand-200 bg-brand-50 text-brand-600" : "border-[#eef2f6] bg-white text-gray-600 hover:bg-[#f8fafc]",
              )}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{sortLabel}</span>
            </button>
            {showSortMenu && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[#eef2f6] rounded-xl shadow-lg py-1.5 w-48 text-sm">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                    className={clsx(
                      "w-full text-right px-3.5 py-2 hover:bg-[#f8fafc] transition-colors",
                      sortBy === opt.key ? "text-brand-600 font-semibold" : "text-gray-700",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More filters (advanced) */}
          <button
            onClick={() => setShowFiltersPanel(p => !p)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors relative",
              activeFiltersCount > 0 ? "border-brand-200 bg-brand-50 text-brand-600" : "border-[#eef2f6] bg-white text-gray-600 hover:bg-[#f8fafc]",
            )}
          >
            <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform", showFiltersPanel && "rotate-180")} />
            <span className="hidden sm:inline">تصفية</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div className="hidden sm:flex items-center bg-gray-100 p-0.5 rounded-xl">
            <button
              onClick={() => changeView("list")}
              className={clsx(
                "p-2 rounded-lg transition-all",
                viewMode === "list" ? "bg-white text-gray-700 shadow-sm" : "text-gray-400 hover:text-gray-600",
              )}
              title="عرض قائمة"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => changeView("cards")}
              className={clsx(
                "p-2 rounded-lg transition-all",
                viewMode === "cards" ? "bg-white text-gray-700 shadow-sm" : "text-gray-400 hover:text-gray-600",
              )}
              title="عرض كروت"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Add button — embedded mode */}
          {embedded && (
            <Button icon={Plus} onClick={() => setShowTypePicker(true)}>{biz.terminology.newItem}</Button>
          )}
        </div>

        {/* Row 2: Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {([
            { key: "all",    label: `الكل (${stats.total})` },
            { key: "active", label: `منشور (${stats.active})` },
            { key: "draft",  label: `مسودة (${stats.draft})` },
            { key: "paused", label: `معلقة (${stats.paused})` },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0",
                statusFilter === tab.key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white border border-[#eef2f6] text-gray-500 hover:border-[#eef2f6]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Advanced filters panel ────────────────────────────── */}
      {showFiltersPanel && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-4 space-y-4">
          {/* Category */}
          {categories.length > 2 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">التصنيف</p>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
                      categoryFilter === cat
                        ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                        : "bg-white border-[#eef2f6] text-gray-600 hover:border-[#eef2f6]",
                    )}
                  >
                    {cat === "all" ? "الكل" : cat}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Type */}
          {presentTypes.length > 2 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">نوع الخدمة</p>
              <div className="flex gap-1.5 flex-wrap">
                {presentTypes.map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
                      typeFilter === t
                        ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                        : "bg-white border-[#eef2f6] text-gray-600 hover:border-[#eef2f6]",
                    )}
                  >
                    {t === "all" ? "الكل" : (TYPE_LABEL[t] || t)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeFiltersCount > 0 && (
            <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
              <X className="w-3 h-3" /> مسح جميع الفلاتر
            </button>
          )}
        </div>
      )}

      {/* ── Bulk action bar ───────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-semibold text-brand-700">تم تحديد {selected.size}</span>
          <div className="flex-1" />
          <button onClick={() => setShowBulkArchiveConfirm(true)} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium">
            أرشفة
          </button>
          <button onClick={() => setShowBulkDeleteConfirm(true)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-medium">
            حذف
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-[#eef2f6] text-gray-500 hover:bg-[#f8fafc] transition-colors">
            إلغاء
          </button>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] p-14 text-center">
          <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            {search || activeFiltersCount > 0 ? "لا توجد نتائج" : biz.terminology.itemEmpty}
          </h3>
          <p className="text-sm text-gray-400 mb-5">
            {search ? `لا توجد خدمات تطابق "${search}"` : activeFiltersCount > 0 ? "جرّب تغيير الفلاتر" : biz.terminology.catalogEmpty}
          </p>
          {search || activeFiltersCount > 0 ? (
            <button onClick={clearAllFilters} className="text-sm text-brand-500 hover:underline">
              مسح البحث والفلاتر
            </button>
          ) : (
            <button
              onClick={() => setShowTypePicker(true)}
              className="bg-brand-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {biz.terminology.addItem}
            </button>
          )}
        </div>
      )}

      {/* ── MOBILE: Always Cards ──────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="sm:hidden grid grid-cols-1 gap-3">
          {filtered.map((service: any) => (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={selected.has(service.id)}
              onSelect={() => toggleOne(service.id)}
              onEdit={() => navigate(`/dashboard/services/${service.id}/edit`)}
              onDuplicate={() => handleDuplicate(service.id)}
              onToggleStatus={() => handleToggleStatus(service)}
              onToggleOnline={() => handleToggleOnline(service)}
              onDelete={() => handleDelete(service.id, service.name)}
            />
          ))}
        </div>
      )}

      {/* ── DESKTOP: Cards View ───────────────────────────────── */}
      {filtered.length > 0 && viewMode === "cards" && (
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((service: any) => (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={selected.has(service.id)}
              onSelect={() => toggleOne(service.id)}
              onEdit={() => navigate(`/dashboard/services/${service.id}/edit`)}
              onDuplicate={() => handleDuplicate(service.id)}
              onToggleStatus={() => handleToggleStatus(service)}
              onToggleOnline={() => handleToggleOnline(service)}
              onDelete={() => handleDelete(service.id, service.name)}
            />
          ))}
        </div>
      )}

      {/* ── DESKTOP: List View ────────────────────────────────── */}
      {filtered.length > 0 && viewMode === "list" && (
        <div className="hidden sm:block bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
          {/* Table header */}
          <div className={clsx(
            "grid items-center px-5 py-2.5 border-b border-[#eef2f6] bg-gray-50/60",
            "grid-cols-[28px_1fr_auto_80px] lg:grid-cols-[28px_1fr_150px_120px_160px_80px]",
            "gap-3 lg:gap-4",
          )}>
            {/* Select all */}
            <button onClick={toggleAll} className="flex items-center">
              {allSelected
                ? <CheckSquare className="w-4 h-4 text-brand-500" />
                : <Square className="w-4 h-4 text-gray-300 hover:text-gray-500 transition-colors" />
              }
            </button>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">الخدمة</span>
            <span className="hidden lg:block text-xs font-semibold text-gray-400 uppercase tracking-wide">المدة</span>
            <span className="hidden lg:block text-xs font-semibold text-gray-400 uppercase tracking-wide">السعر</span>
            <span className="hidden lg:block text-xs font-semibold text-gray-400 uppercase tracking-wide">الحالة</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">إجراءات</span>
          </div>

          {/* Rows */}
          <div>
            {filtered.map((service: any) => (
              <ServiceListRow
                key={service.id}
                service={service}
                isSelected={selected.has(service.id)}
                onSelect={() => toggleOne(service.id)}
                onEdit={() => navigate(`/dashboard/services/${service.id}/edit`)}
                onDuplicate={() => handleDuplicate(service.id)}
                onToggleStatus={() => handleToggleStatus(service)}
                onToggleOnline={() => handleToggleOnline(service)}
                onDelete={() => handleDelete(service.id, service.name)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 bg-gray-50/30">
            <span className="text-xs text-gray-400">
              {filtered.length === services.length
                ? `${services.length} خدمة`
                : `${filtered.length} من ${services.length} خدمة`
              }
            </span>
            {selected.size > 0 && (
              <span className="text-xs text-brand-600 font-medium">تم تحديد {selected.size}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────── */}

      {showTypePicker && (
        <TypePickerOverlay
          businessType={context?.businessType}
          onSelect={type => { setShowTypePicker(false); navigate(`/dashboard/services/wizard?type=${type}`); }}
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

      {/* Delete single */}
      {deleteTarget && (
        <Modal open={true} onClose={() => setDeleteTarget(null)} title="حذف الخدمة" size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>تراجع</Button>
              <Button variant="danger" onClick={doDelete}>نعم، احذف</Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            سيتم حذف <strong className="text-gray-900">{deleteTarget.name}</strong> نهائياً ولا يمكن التراجع.
          </p>
        </Modal>
      )}

      {/* Bulk delete */}
      <Modal open={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="حذف الخدمات المحددة" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkDeleteConfirm(false)}>تراجع</Button>
            <Button variant="danger" onClick={doBulkDelete}>نعم، احذف {selected.size} خدمة</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">سيتم حذف {selected.size} خدمة نهائياً ولا يمكن التراجع عن ذلك.</p>
      </Modal>

      {/* Bulk archive */}
      <Modal open={showBulkArchiveConfirm} onClose={() => setShowBulkArchiveConfirm(false)} title="أرشفة الخدمات المحددة" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkArchiveConfirm(false)}>تراجع</Button>
            <Button onClick={doBulkArchive}>نعم، أرشف {selected.size} خدمة</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">سيتم أرشفة {selected.size} خدمة. يمكنك إعادة تفعيلها لاحقاً.</p>
      </Modal>

    </div>
  );
}
