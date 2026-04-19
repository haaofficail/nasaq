import React, { useEffect } from "react";
import { Crown, Loader2, X } from "lucide-react";
import { clsx } from "clsx";
import { BUSINESS_TYPE_MAP, PLANS } from "@/lib/constants";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-lock";

// ── Shared constants ───────────────────────────────────────
export const BUSINESS_TYPES = BUSINESS_TYPE_MAP;

export const PLAN_LABELS: Record<string, string> = Object.fromEntries(PLANS.map(p => [p.key, p.name]));
export const PLAN_COLORS: Record<string, string> = {
  basic: "bg-slate-100 text-slate-600",
  advanced: "bg-blue-50 text-blue-700",
  pro: "bg-purple-50 text-purple-700",
  enterprise: "bg-amber-50 text-amber-700",
};
export const STATUS_LABELS: Record<string, string> = {
  trialing: "تجربة", active: "نشط", past_due: "متأخر", cancelled: "ملغي", suspended: "موقوف",
};
export const STATUS_COLORS: Record<string, string> = {
  trialing: "bg-sky-50 text-sky-700",
  active: "bg-emerald-50 text-emerald-700",
  past_due: "bg-orange-50 text-orange-700",
  cancelled: "bg-gray-100 text-gray-500",
  suspended: "bg-red-50 text-red-600",
};
export const NASAQ_ROLES: { value: string; label: string; color: string }[] = [
  { value: "super_admin",      label: "سوبر أدمن",     color: "bg-brand-50 text-brand-700" },
  { value: "account_manager",  label: "مدير حساب",     color: "bg-emerald-50 text-emerald-700" },
  { value: "support_agent",    label: "دعم فني",        color: "bg-blue-50 text-blue-700" },
  { value: "content_manager",  label: "مدير محتوى",    color: "bg-purple-50 text-purple-700" },
  { value: "viewer",           label: "مشاهد فقط",     color: "bg-gray-100 text-gray-600" },
];
export const ALL_CAPABILITIES = [
  { key: "bookings",      label: "الحجوزات",             group: "الأساسيات" },
  { key: "customers",     label: "العملاء",               group: "الأساسيات" },
  { key: "catalog",       label: "كتالوج الخدمات",       group: "الأساسيات" },
  { key: "media",         label: "مكتبة الوسائط",        group: "الأساسيات" },
  { key: "pos",           label: "نقطة البيع",            group: "التجارة" },
  { key: "inventory",     label: "المخزون",               group: "التجارة" },
  { key: "online_orders", label: "الطلبات الإلكترونية",  group: "التجارة" },
  { key: "accounting",    label: "المحاسبة",              group: "المالية" },
  { key: "delivery",      label: "التوصيل",               group: "العمليات" },
  { key: "attendance",    label: "الحضور والانصراف",      group: "العمليات" },
  { key: "marketing",     label: "التسويق",               group: "القنوات" },
  { key: "website",       label: "الموقع الإلكتروني",    group: "القنوات" },
  { key: "hotel",         label: "الفندقة",               group: "تخصصي" },
  { key: "car_rental",    label: "تأجير السيارات",        group: "تخصصي" },
  { key: "floral",        label: "محلات الورود",          group: "تخصصي" },
  { key: "contracts",     label: "العقود والإيجارات",     group: "تخصصي" },
  { key: "assets",        label: "الأصول والمعدات",       group: "تخصصي" },
];

// ── Shared micro-components ────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", STATUS_COLORS[status] || "bg-gray-100 text-gray-500")}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
export function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={clsx("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", PLAN_COLORS[plan] || "bg-gray-100 text-gray-600")}>
      {PLAN_LABELS[plan] || plan}
    </span>
  );
}
export function RoleBadge({ role }: { role: string }) {
  const r = NASAQ_ROLES.find((x) => x.value === role);
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", r?.color || "bg-gray-100 text-gray-600")}>
      {role === "super_admin" && <Crown className="w-2.5 h-2.5" />}
      {r?.label || role}
    </span>
  );
}
export function Spinner() {
  return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>;
}
export function Empty({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icon className="w-10 h-10 text-gray-200 mb-3" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {sub && <p className="text-sm text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function Modal({ open, onClose, title, children, width = "max-w-lg" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string }) {
  // Body scroll lock — ref-counted
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => { unlockBodyScroll(); };
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full overflow-hidden", width)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eef2f6]">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value ?? "—"}</span>
    </div>
  );
}
export function TabPill({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 mb-5">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={clsx("flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
            active === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >{t.label}</button>
      ))}
    </div>
  );
}

const PW_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*_+-=";
export function generateSecurePassword(length = 12): string {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  const max = Math.floor(0xFFFFFFFF / PW_CHARS.length) * PW_CHARS.length;
  return Array.from(arr, (v) => {
    while (v >= max) { const buf = new Uint32Array(1); crypto.getRandomValues(buf); v = buf[0]; }
    return PW_CHARS[v % PW_CHARS.length];
  }).join("");
}
