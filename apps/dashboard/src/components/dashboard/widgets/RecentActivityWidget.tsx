import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { auditLogApi } from "@/lib/api";
import { clsx } from "clsx";
import {
  CalendarCheck, FileText, CreditCard, Users, Package,
  Settings, AlertCircle, Activity, LogIn, CheckCircle2, XCircle, Pencil, Eye,
} from "lucide-react";

// ── Arabic labels ──────────────────────────────────────────────
const ACTION_AR: Record<string, string> = {
  created:          "إنشاء",
  create:           "إنشاء",
  updated:          "تعديل",
  update:           "تعديل",
  deleted:          "حذف",
  delete:           "حذف",
  removed:          "حذف",
  login:            "تسجيل دخول",
  logout:           "تسجيل خروج",
  completed:        "اكتمل",
  cancelled:        "إلغاء",
  cancel:           "إلغاء",
  approved:         "موافقة",
  rejected:         "رفض",
  payment_recorded: "دفعة مُسجَّلة",
  sent:             "إرسال",
  view:             "عرض",
  restored:         "استرداد",
  refunded:         "استرداد مبلغ",
};

const RESOURCE_AR: Record<string, string> = {
  booking:               "حجز",
  bookings:              "حجز",
  invoice:               "فاتورة",
  invoices:              "فاتورة",
  invoice_payment:       "دفعة فاتورة",
  payment:               "دفعة",
  payments:              "دفعة",
  customer:              "عميل",
  customers:             "عميل",
  service:               "خدمة",
  services:              "خدمة",
  catalog:               "خدمة",
  expense:               "مصروف",
  expenses:              "مصروف",
  user:                  "مستخدم",
  users:                 "مستخدم",
  branch:                "فرع",
  branches:              "فرع",
  settings:              "الإعدادات",
  subscription:          "الاشتراك",
  subscription_order:    "طلب اشتراك",
  payment_gateway:       "بوابة دفع",
  payment_gateway_credentials: "بيانات بوابة دفع",
  product:               "منتج",
  order:                 "طلب",
  stock:                 "مخزون",
  contract:              "عقد",
  staff:                 "موظف",
  shift:                 "وردية",
  room:                  "غرفة",
  vehicle:               "مركبة",
};

function arabicLabel(action: string, resource: string): string {
  const a = ACTION_AR[action]   || action;
  const r = RESOURCE_AR[resource] || resource;
  if (action === "login" || action === "logout") return a;
  return `${a} ${r}`;
}

// ── icon + color per resource/action ──────────────────────────
function getEntryStyle(entry: any): { icon: React.ElementType; color: string; bg: string } {
  const resource = entry.resource || "";
  const action   = entry.action   || "";

  if (action === "login" || action === "logout")
    return { icon: LogIn,        color: "text-indigo-600",  bg: "bg-indigo-50" };
  if (action === "deleted" || action === "delete" || action === "removed")
    return { icon: XCircle,      color: "text-red-500",     bg: "bg-red-50" };
  if (action === "completed")
    return { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" };
  if (action === "updated" || action === "update")
    return { icon: Pencil,       color: "text-amber-600",   bg: "bg-amber-50" };
  if (action === "view")
    return { icon: Eye,          color: "text-gray-500",    bg: "bg-gray-100" };

  if (resource === "booking" || resource === "bookings")
    return { icon: CalendarCheck, color: "text-blue-600",    bg: "bg-blue-50" };
  if (resource.startsWith("invoice") || resource === "payment" || resource === "payments")
    return { icon: CreditCard,    color: "text-emerald-600", bg: "bg-emerald-50" };
  if (resource === "customer" || resource === "customers")
    return { icon: Users,         color: "text-violet-600",  bg: "bg-violet-50" };
  if (resource === "service" || resource === "catalog" || resource === "product")
    return { icon: Package,       color: "text-teal-600",    bg: "bg-teal-50" };
  if (resource === "settings" || resource.startsWith("payment_gateway"))
    return { icon: Settings,      color: "text-gray-500",    bg: "bg-gray-100" };
  if (resource === "expense")
    return { icon: FileText,      color: "text-orange-500",  bg: "bg-orange-50" };
  return { icon: Activity,        color: "text-brand-500",   bg: "bg-brand-50" };
}

function timeLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

function dateLabel(dateStr: string): string {
  const d     = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "اليوم";
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "numeric", day: "numeric" });
}

// ── widget ──────────────────────────────────────────────────────
export function RecentActivityWidget() {
  const { data, loading } = useApi(
    () => auditLogApi.list({ limit: "10" }),
    []
  );
  const entries: any[] = data?.data ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-400" />
          الأنشطة الأخيرة
        </h3>
        <Link
          to="/dashboard/settings/audit-log"
          className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors"
        >
          عرض الكل ←
        </Link>
      </div>

      {/* List */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3 animate-pulse">
              <div className="w-7 h-7 rounded-xl bg-gray-100 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">لا توجد أنشطة بعد</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {entries.map((entry: any) => {
            const { icon: Icon, color, bg } = getEntryStyle(entry);
            const label    = arabicLabel(entry.action || "", entry.resource || "");
            const userName = entry.userName || null;
            const date     = dateLabel(entry.createdAt);
            const time     = timeLabel(entry.createdAt);
            return (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
                <div className={clsx("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5", bg)}>
                  <Icon className={clsx("w-3.5 h-3.5", color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 leading-snug">{label}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400 flex-wrap">
                    <span className={clsx(date === "اليوم" ? "text-brand-500 font-medium" : "")}>{date}</span>
                    <span className="text-gray-200">·</span>
                    <span className="tabular-nums">{time}</span>
                    {userName && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span className="text-gray-600 font-medium truncate max-w-[100px]">{userName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
