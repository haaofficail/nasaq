import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, FileText, Ticket, Megaphone,
  ClipboardList, Server, Star, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, LogIn, Search, ChevronRight, Loader2, Plus, Trash2,
  CheckCheck, ShieldAlert, Edit3, Save, X, ShieldCheck, ToggleLeft,
  ToggleRight, Package, Briefcase, Headphones, DollarSign, Activity,
  Crown, Users2, Bell, Filter, Download, ArrowUpRight, Globe,
  UserCheck, Lock, MoreVertical, Calendar, Phone, Mail, MapPin,
  Hash, CreditCard, Building, Clock, ChevronDown,
  Layers, Tag, Gift, BookOpen, LogOut, BarChart2, Zap, Stethoscope, KeyRound,
} from "lucide-react";
import { clsx } from "clsx";
import { adminApi, commercialApi } from "@/lib/api";
import { SAUDI_CITIES, ADDONS, PLANS, ADDON_MAP, BUSINESS_TYPE_MAP, PLAN_MAP } from "@/lib/constants";
import { useApi, useMutation } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { fmtDate } from "@/lib/utils";

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const BUSINESS_TYPES = BUSINESS_TYPE_MAP;
const PLAN_LABELS: Record<string, string> = Object.fromEntries(PLANS.map(p => [p.key, p.name]));
const PLAN_COLORS: Record<string, string> = {
  basic: "bg-slate-100 text-slate-600",
  advanced: "bg-blue-50 text-blue-700",
  pro: "bg-purple-50 text-purple-700",
  enterprise: "bg-amber-50 text-amber-700",
};
const STATUS_LABELS: Record<string, string> = {
  trialing: "تجربة", active: "نشط", past_due: "متأخر", cancelled: "ملغي", suspended: "موقوف",
};
const STATUS_COLORS: Record<string, string> = {
  trialing: "bg-sky-50 text-sky-700",
  active: "bg-emerald-50 text-emerald-700",
  past_due: "bg-orange-50 text-orange-700",
  cancelled: "bg-gray-100 text-gray-500",
  suspended: "bg-red-50 text-red-600",
};
const NASAQ_ROLES: { value: string; label: string; color: string }[] = [
  { value: "super_admin",      label: "سوبر أدمن",     color: "bg-brand-50 text-brand-700" },
  { value: "account_manager",  label: "مدير حساب",     color: "bg-emerald-50 text-emerald-700" },
  { value: "support_agent",    label: "دعم فني",        color: "bg-blue-50 text-blue-700" },
  { value: "content_manager",  label: "مدير محتوى",    color: "bg-purple-50 text-purple-700" },
  { value: "viewer",           label: "مشاهد فقط",     color: "bg-gray-100 text-gray-600" },
];
const ALL_CAPABILITIES = [
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

const SECTIONS = [
  { id: "overview",   icon: LayoutDashboard, label: "نظرة عامة",        roles: [] }, // all roles
  { id: "orgs",       icon: Building2,       label: "المنشآت",          roles: [] },
  { id: "team",       icon: Users2,          label: "فريق نسق",         roles: ["super_admin"] },
  { id: "clients",    icon: Briefcase,       label: "إدارة الحسابات",   roles: ["super_admin", "account_manager"] },
  { id: "plans",      icon: CreditCard,      label: "الباقات والأسعار", roles: ["super_admin"] },
  { id: "orders",     icon: CreditCard,      label: "طلبات الشراء",     roles: ["super_admin"] },
  { id: "commercial", icon: Package,         label: "المحرك التجاري",   roles: ["super_admin"] },
  { id: "reminders",  icon: Bell,            label: "التذكيرات",        roles: ["super_admin", "account_manager"] },
  { id: "support",    icon: Headphones,      label: "الدعم الفني",      roles: ["super_admin", "account_manager", "support_agent"] },
  { id: "docs",       icon: FileText,        label: "الوثائق",          roles: ["super_admin", "account_manager", "support_agent"] },
  { id: "announce",   icon: Megaphone,       label: "الإعلانات",        roles: ["super_admin", "content_manager"] },
  { id: "audit",      icon: ClipboardList,   label: "سجل المراجعة",     roles: ["super_admin"] },
  { id: "system",     icon: Server,          label: "النظام",           roles: ["super_admin"] },
];

// الأدوار المسموح لها بالدخول للوحة الأدمن
const ALLOWED_NASAQ_ROLES = ["account_manager", "support_agent", "content_manager", "viewer"];

// ════════════════════════════════════════════════════════════
// MICRO-COMPONENTS
// ════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", STATUS_COLORS[status] || "bg-gray-100 text-gray-500")}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={clsx("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold", PLAN_COLORS[plan] || "bg-gray-100 text-gray-600")}>
      {PLAN_LABELS[plan] || plan}
    </span>
  );
}
function RoleBadge({ role }: { role: string }) {
  const r = NASAQ_ROLES.find((x) => x.value === role);
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", r?.color || "bg-gray-100 text-gray-600")}>
      {role === "super_admin" && <Crown className="w-2.5 h-2.5" />}
      {r?.label || role}
    </span>
  );
}
function Spinner() {
  return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>;
}
function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Icon className="w-10 h-10 text-gray-200 mb-3" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
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
function Modal({ open, onClose, title, children, width = "max-w-lg" }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full overflow-hidden", width)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value ?? "—"}</span>
    </div>
  );
}
function TabPill({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
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

// ════════════════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════════════════

function OverviewTab({ onNav }: { onNav: (section: string) => void }) {
  const { data, loading, refetch } = useApi(() => adminApi.stats(), []);
  const stats = data?.data;

  const kpis = [
    { label: "إجمالي المنشآت", value: stats?.totalOrgs ?? 0, icon: Building2, bg: "bg-blue-50", color: "text-blue-500" },
    { label: "منشآت نشطة", value: stats?.activeOrgs ?? 0, icon: CheckCircle, bg: "bg-emerald-50", color: "text-emerald-600" },
    { label: "في التجربة", value: stats?.trialOrgs ?? 0, icon: RefreshCw, bg: "bg-purple-50", color: "text-purple-600" },
    { label: "موقوفة", value: stats?.suspendedOrgs ?? 0, icon: ShieldAlert, bg: "bg-red-50", color: "text-red-500" },
    { label: "إجمالي المستخدمين", value: stats?.totalUsers ?? 0, icon: Users, bg: "bg-orange-50", color: "text-orange-500" },
    { label: "تذاكر دعم مفتوحة", value: stats?.openTickets ?? 0, icon: Ticket, bg: "bg-amber-50", color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="نظرة عامة" sub="ملخص المنصة في الوقت الفعلي"
        action={
          <button onClick={refetch} className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", k.bg)}>
              <k.icon className={clsx("w-5 h-5", k.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{loading ? "—" : k.value.toLocaleString("ar")}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      {!loading && (stats?.planDistribution?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">توزيع الباقات</h3>
          <div className="space-y-4">
            {stats!.planDistribution.map((p: any) => {
              const pct = Math.round((p.count / (stats!.totalOrgs || 1)) * 100);
              const barColors: Record<string, string> = { enterprise: "#b45309", pro: "#7c3aed", advanced: "#2563eb", basic: "#94a3b8" };
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <PlanBadge plan={p.plan} />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColors[p.plan] || "#94a3b8" }} />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-6 text-left tabular-nums">{p.count}</span>
                  <span className="text-xs text-gray-400 w-9 text-left">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إضافة منشأة", icon: Plus, section: "orgs", cls: "bg-brand-500 text-white hover:bg-brand-600" },
          { label: "إعلان جديد", icon: Megaphone, section: "announce", cls: "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50" },
          { label: "تذاكر الدعم", icon: Headphones, section: "support", cls: "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50" },
          { label: "صحة النظام", icon: Activity, section: "system", cls: "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50" },
        ].map((a) => (
          <button key={a.label} onClick={() => onNav(a.section)}
            className={clsx("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors", a.cls)}>
            <a.icon className="w-4 h-4 shrink-0" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ORG DETAIL — tabbed
// ════════════════════════════════════════════════════════════

function OrgDetail({ org, onBack }: { org: any; onBack: () => void }) {
  const [tab, setTab] = useState("summary");
  const { data: detailData, refetch: refetchDetail } = useApi(() => adminApi.getOrg(org.id), [org.id]);
  const { data: capData, refetch: refetchCap } = useApi(() => adminApi.getOrgCapabilities(org.id), [org.id]);
  const { data: usersData } = useApi(() => adminApi.getOrgUsers(org.id), [org.id]);
  const { data: staffData } = useApi(() => adminApi.staff(), []);
  const detail = detailData?.data;
  const cap = capData?.data;
  const orgUsers: any[] = usersData?.data || [];
  const staffList: any[] = (staffData?.data || []).filter((s: any) => s.nasaqRole === "account_manager" || s.isSuperAdmin);

  const [activeCaps, setActiveCaps] = useState<string[] | null>(null);
  const [planForm, setPlanForm] = useState({ plan: "", subscriptionStatus: "", trialEndsAt: "", subscriptionEndsAt: "" });
  const [showPlanEdit, setShowPlanEdit] = useState(false);
  const [capEditing, setCapEditing] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [notesVal, setNotesVal] = useState("");
  const [notesEditing, setNotesEditing] = useState(false);

  const { mutate: changePlan, loading: changingPlan } = useMutation((d: any) => adminApi.changePlan(org.id, d));
  const { mutate: setCaps, loading: settingCaps } = useMutation((cs: string[]) => adminApi.setOrgCapabilities(org.id, cs));
  const { mutate: verify } = useMutation(() => adminApi.verifyOrg(org.id));
  const { mutate: suspend } = useMutation((r: string) => adminApi.suspendOrg(org.id, r));
  const { mutate: unsuspend } = useMutation(() => adminApi.unsuspendOrg(org.id));
  const { mutate: impersonate } = useMutation(() => adminApi.impersonate(org.id));
  const { mutate: saveNotes } = useMutation((n: string) => adminApi.updateOrg(org.id, { adminNotes: n }));
  const { mutate: setManager } = useMutation((mid: string | null) => adminApi.setOrgManager(org.id, mid));

  const currentCaps: string[] = activeCaps ?? (cap?.enabledCapabilities ?? []);

  const handleImpersonate = async () => {
    const res: any = await impersonate(org.id);
    if (!res?.data) return;
    localStorage.setItem("nasaq_impersonate_original_token", localStorage.getItem("nasaq_token") || "");
    localStorage.setItem("nasaq_token", res.data.token);
    localStorage.setItem("nasaq_org_id", res.data.org.id);
    localStorage.setItem("nasaq_user_id", res.data.user.id);
    localStorage.setItem("nasaq_user", JSON.stringify({ ...res.data.user, isSuperAdmin: false, isImpersonating: true, impersonateOrgName: res.data.org.name }));
    window.location.href = "/dashboard";
  };

  const capGroups = ALL_CAPABILITIES.reduce<Record<string, typeof ALL_CAPABILITIES>>((acc, c) => {
    (acc[c.group] = acc[c.group] || []).push(c); return acc;
  }, {});

  const tabs = [
    { id: "summary", label: "الملخص" },
    { id: "plan", label: "الباقة" },
    { id: "capabilities", label: "الصلاحيات" },
    { id: "users", label: `الفريق (${orgUsers.length})` },
    { id: "manager", label: "مدير الحساب" },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium">
        <ChevronRight className="w-4 h-4" /> العودة لقائمة المنشآت
      </button>

      {!detail ? <Spinner /> : (
        <>
          {/* Org header card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xl shrink-0">
                  {detail.name?.[0] || "م"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">{detail.name}</h2>
                    {detail.isVerified && <CheckCheck className="w-4 h-4 text-emerald-500" aria-label="موثقة" />}
                    {detail.suspendedAt && <AlertTriangle className="w-4 h-4 text-red-500" aria-label="موقوفة" />}
                    <StatusBadge status={detail.subscriptionStatus} />
                    <PlanBadge plan={detail.plan} />
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{detail.slug} · {BUSINESS_TYPES[detail.businessType] || detail.businessType}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!detail.isVerified && (
                  <button onClick={async () => { await verify(undefined); refetchDetail(); }}
                    className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> توثيق
                  </button>
                )}
                <button onClick={handleImpersonate}
                  className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-xl hover:bg-brand-600 flex items-center gap-1.5 font-medium">
                  <LogIn className="w-3.5 h-3.5" /> دخول كمالك
                </button>
                {!detail.suspendedAt ? (
                  <button onClick={() => setSuspendModal(true)}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 font-medium">
                    إيقاف
                  </button>
                ) : (
                  <button onClick={async () => { await unsuspend(undefined); refetchDetail(); }}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium">
                    رفع الإيقاف
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { label: "المستخدمون", value: detail.userCount ?? "—", icon: Users },
                { label: "المدينة", value: detail.city || "—", icon: MapPin },
                { label: "الهاتف", value: detail.phone || "—", icon: Phone },
                { label: "البريد", value: detail.email || "—", icon: Mail },
              ].map((i) => (
                <div key={i.label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                  <i.icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400">{i.label}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{i.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabbed content */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <TabPill tabs={tabs} active={tab} onChange={setTab} />

            {/* Summary */}
            {tab === "summary" && (
              <div>
                <InfoRow label="نوع النشاط" value={BUSINESS_TYPES[detail.businessType] || detail.businessType} />
                <InfoRow label="الـ Slug" value={<span className="font-mono text-xs">{detail.slug}</span>} />
                <InfoRow label="تاريخ الإنشاء" value={detail.createdAt ? new Date(detail.createdAt).toLocaleDateString("ar") : "—"} />
                <InfoRow label="نهاية التجربة" value={detail.trialEndsAt ? new Date(detail.trialEndsAt).toLocaleDateString("ar") : "—"} />
                <InfoRow label="نهاية الاشتراك" value={detail.subscriptionEndsAt ? new Date(detail.subscriptionEndsAt).toLocaleDateString("ar") : "—"} />
                <InfoRow label="موثقة" value={detail.isVerified ? <span className="text-emerald-600">نعم</span> : "لا"} />
                {detail.suspendedAt && <InfoRow label="سبب الإيقاف" value={<span className="text-red-600">{detail.suspendReason || "لم يذكر"}</span>} />}
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-500 font-medium">ملاحظات الإدارة</p>
                    <button onClick={() => { setNotesEditing(!notesEditing); setNotesVal(detail.adminNotes || ""); }}
                      className="text-xs text-brand-500 hover:text-brand-600">
                      {notesEditing ? "إلغاء" : "تعديل"}
                    </button>
                  </div>
                  {notesEditing ? (
                    <div className="space-y-2">
                      <textarea value={notesVal} onChange={(e) => setNotesVal(e.target.value)}
                        rows={3} className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none" />
                      <button onClick={async () => { await saveNotes(notesVal); setNotesEditing(false); refetchDetail(); }}
                        className="px-4 py-1.5 bg-brand-500 text-white text-xs rounded-xl hover:bg-brand-600 font-medium">
                        حفظ
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{detail.adminNotes || "لا توجد ملاحظات"}</p>
                  )}
                </div>
              </div>
            )}

            {/* Plan & Subscription */}
            {tab === "plan" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">الباقة الحالية</p>
                    <PlanBadge plan={detail.plan} />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">حالة الاشتراك</p>
                    <StatusBadge status={detail.subscriptionStatus} />
                  </div>
                </div>
                {!showPlanEdit ? (
                  <button onClick={() => { setShowPlanEdit(true); setPlanForm({ plan: detail.plan, subscriptionStatus: detail.subscriptionStatus, trialEndsAt: "", subscriptionEndsAt: "" }); }}
                    className="w-full py-2.5 border border-brand-200 text-brand-600 rounded-xl text-sm hover:bg-brand-50 font-medium transition-colors">
                    تعديل الباقة والاشتراك
                  </button>
                ) : (
                  <div className="space-y-3 border border-gray-100 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">الباقة</label>
                        <select value={planForm.plan} onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none">
                          <option value="basic">الأساسي</option>
                          <option value="advanced">المتقدم</option>
                          <option value="pro">الاحترافي</option>
                          <option value="enterprise">المؤسسي</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">حالة الاشتراك</label>
                        <select value={planForm.subscriptionStatus} onChange={(e) => setPlanForm({ ...planForm, subscriptionStatus: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none">
                          <option value="trialing">تجربة</option>
                          <option value="active">نشط</option>
                          <option value="past_due">متأخر</option>
                          <option value="cancelled">ملغي</option>
                          <option value="suspended">موقوف</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">نهاية التجربة</label>
                        <input type="date" value={planForm.trialEndsAt} onChange={(e) => setPlanForm({ ...planForm, trialEndsAt: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">نهاية الاشتراك</label>
                        <input type="date" value={planForm.subscriptionEndsAt} onChange={(e) => setPlanForm({ ...planForm, subscriptionEndsAt: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowPlanEdit(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">إلغاء</button>
                      <button disabled={changingPlan} onClick={async () => {
                        const p: any = {};
                        if (planForm.plan) p.plan = planForm.plan;
                        if (planForm.subscriptionStatus) p.subscriptionStatus = planForm.subscriptionStatus;
                        if (planForm.trialEndsAt) p.trialEndsAt = planForm.trialEndsAt;
                        if (planForm.subscriptionEndsAt) p.subscriptionEndsAt = planForm.subscriptionEndsAt;
                        await changePlan(p); setShowPlanEdit(false); refetchDetail();
                      }} className="flex-1 py-2 bg-brand-500 text-white rounded-xl text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium">
                        {changingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} حفظ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Capabilities */}
            {tab === "capabilities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">الوحدات المفعّلة: <strong className="text-gray-800">{currentCaps.length}</strong> / {ALL_CAPABILITIES.length}</p>
                  <div className="flex gap-2">
                    {capEditing && (
                      <button onClick={async () => { await setCaps(currentCaps); setCapEditing(false); refetchCap(); setActiveCaps(null); }}
                        disabled={settingCaps} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded-xl hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1 font-medium">
                        {settingCaps ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} حفظ
                      </button>
                    )}
                    <button onClick={() => { setCapEditing(!capEditing); setActiveCaps(null); }}
                      className="px-3 py-1.5 text-xs text-brand-500 border border-brand-200 rounded-xl hover:bg-brand-50">
                      {capEditing ? "إلغاء" : "تعديل"}
                    </button>
                  </div>
                </div>
                {Object.entries(
                  ALL_CAPABILITIES.reduce<Record<string, typeof ALL_CAPABILITIES>>((acc, c) => { (acc[c.group] = acc[c.group] || []).push(c); return acc; }, {})
                ).map(([group, caps]) => (
                  <div key={group}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {caps.map((c) => {
                        const enabled = currentCaps.includes(c.key);
                        return (
                          <button key={c.key} onClick={() => {
                            if (!capEditing) return;
                            const base = activeCaps ?? (cap?.enabledCapabilities ?? []);
                            setActiveCaps(enabled ? base.filter((k: string) => k !== c.key) : [...base, c.key]);
                          }}
                            className={clsx("flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-right transition-all",
                              enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-100 bg-gray-50 text-gray-400",
                              capEditing ? "cursor-pointer hover:opacity-80" : "cursor-default"
                            )}>
                            {enabled ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <ToggleLeft className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Users */}
            {tab === "users" && (
              <div className="space-y-2">
                {orgUsers.length === 0 ? <Empty icon={Users} text="لا يوجد مستخدمون" /> : orgUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                      {u.name?.[0] || "م"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.phone || u.email || "—"}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{u.type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Account Manager */}
            {tab === "manager" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">اختر مدير حساب من فريق نسق لمتابعة هذه المنشأة.</p>
                {detail.accountManagerId ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">
                        {staffList.find((s: any) => s.id === detail.accountManagerId)?.name || "مدير الحساب"}
                      </p>
                      <p className="text-xs text-gray-400">مدير الحساب الحالي</p>
                    </div>
                    <button onClick={async () => { await setManager(null); refetchDetail(); }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium">إلغاء التعيين</button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 text-center">
                    لم يتم تعيين مدير حساب لهذه المنشأة
                  </div>
                )}
                {staffList.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 font-medium">فريق نسق المتاح</p>
                    {staffList.map((s: any) => (
                      <div key={s.id} className={clsx("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        detail.accountManagerId === s.id ? "border-brand-200 bg-brand-50" : "border-gray-100 hover:bg-gray-50"
                      )} onClick={async () => { await setManager(s.id); refetchDetail(); }}>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm">{s.name?.[0]}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.phone || s.email || "—"}</p>
                        </div>
                        <RoleBadge role={s.isSuperAdmin ? "super_admin" : s.nasaqRole} />
                        <span className="text-xs text-gray-400">{s.assignedOrgs || 0} منشأة</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Suspend Modal */}
      <Modal open={suspendModal} onClose={() => setSuspendModal(false)} title={`إيقاف: ${org.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">سيتم تقييد وصول المنشأة فوراً. أدخل سبب الإيقاف.</p>
          <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="سبب الإيقاف..." rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none" />
          <div className="flex gap-3">
            <button onClick={() => setSuspendModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">إلغاء</button>
            <button onClick={async () => { await suspend(suspendReason); setSuspendModal(false); onBack(); }}
              className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 font-medium">
              تأكيد الإيقاف
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ORGS TAB
// ════════════════════════════════════════════════════════════

function OrgsTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", nameEn: "", businessType: "general", plan: "basic",
    phone: "", email: "", city: "", ownerName: "", ownerPhone: "", ownerEmail: "", ownerPassword: "",
  });
  const [resetPwModal, setResetPwModal] = useState<{ orgId: string; orgName: string } | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [credentialsModal, setCredentialsModal] = useState<{ phone: string | null; email: string | null; password: string } | null>(null);
  const [planModal, setPlanModal] = useState<{ orgId: string; orgName: string; currentPlan: string; currentStatus: string } | null>(null);
  const [planForm, setPlanForm] = useState({ plan: "", subscriptionStatus: "", subscriptionEndsAt: "" });
  const [renewModal, setRenewModal] = useState<{ orgId: string; orgName: string; plan: string; subscriptionEndsAt: string | null } | null>(null);
  const [addonsModal, setAddonsModal] = useState<{ orgId: string; orgName: string } | null>(null);
  const { mutate: changePlan, loading: changingPlan } = useMutation((d: any) => adminApi.changePlan(d.orgId, d.data));
  const { mutate: renewSub, loading: renewing } = useMutation((d: any) => adminApi.changePlan(d.orgId, d.data));
  const { data: addonsData, refetch: refetchAddons } = useApi(
    () => addonsModal ? adminApi.getOrgAddons(addonsModal.orgId) : Promise.resolve(null),
    [addonsModal?.orgId]
  );
  const { mutate: addAddon, loading: addingAddon } = useMutation((d: any) => adminApi.addOrgAddon(d.orgId, d.data));
  const { mutate: removeAddon } = useMutation((d: any) => adminApi.removeOrgAddon(d.orgId, d.addonId));
  const [newAddonKey, setNewAddonKey] = useState("");

  const { data, loading, refetch } = useApi(
    () => adminApi.orgs({
      q: search || undefined,
      status: statusFilter || undefined,
      plan: planFilter || undefined,
      businessType: typeFilter || undefined,
      page,
    }),
    [search, statusFilter, planFilter, typeFilter, page]
  );
  const { mutate: createOrg, loading: creating } = useMutation((d: any) => adminApi.createOrg(d));

  const orgs: any[] = data?.data || [];
  const pagination = data?.pagination;

  if (selectedOrg) return <OrgDetail org={selectedOrg} onBack={() => { setSelectedOrg(null); refetch(); }} />;

  return (
    <div className="space-y-5">
      <SectionHeader title="إدارة المنشآت" sub={`${data?.pagination?.total ?? 0} منشأة مسجلة`}
        action={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-4 h-4" /> منشأة جديدة
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="بحث بالاسم أو الـ slug..."
            className="flex-1 text-sm outline-none bg-transparent" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="trialing">تجربة</option>
          <option value="past_due">متأخر</option>
          <option value="suspended">موقوف</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الباقات</option>
          <option value="basic">الأساسي</option>
          <option value="advanced">المتقدم</option>
          <option value="pro">الاحترافي</option>
          <option value="enterprise">المؤسسي</option>
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل الأنواع</option>
          {Object.entries(BUSINESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? <Spinner /> : orgs.length === 0 ? <Empty icon={Building2} text="لا توجد منشآت" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">النوع</th>
                <th className="text-right px-4 py-3 font-semibold">الباقة</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">ينتهي في</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">تاريخ الإنشاء</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org: any) => (
                <tr key={org.id} onClick={() => setSelectedOrg(org)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                        {org.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{org.name}</span>
                          {org.isVerified && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                          {org.suspendedAt && <AlertTriangle className="w-3 h-3 text-red-500" />}
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">{org.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                    {BUSINESS_TYPES[org.businessType] || org.businessType}
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={org.plan} /></td>
                  <td className="px-4 py-3"><StatusBadge status={org.subscriptionStatus} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                    {org.subscriptionEndsAt
                      ? (() => {
                          const d = Math.ceil((new Date(org.subscriptionEndsAt).getTime() - Date.now()) / 86400000);
                          return (
                            <span className={d <= 7 ? "text-red-500 font-medium" : d <= 30 ? "text-amber-500 font-medium" : "text-gray-500"}>
                              {d > 0 ? `${d} يوم` : "منتهي"}
                            </span>
                          );
                        })()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {org.createdAt ? new Date(org.createdAt).toLocaleDateString("ar") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setAddonsModal({ orgId: org.id, orgName: org.name }); }}
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                        title="إدارة الإضافات"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRenewModal({ orgId: org.id, orgName: org.name, plan: org.plan, subscriptionEndsAt: org.subscriptionEndsAt || null })}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                        title="تجديد الاشتراك"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setPlanModal({ orgId: org.id, orgName: org.name, currentPlan: org.plan, currentStatus: org.subscriptionStatus });
                          setPlanForm({ plan: org.plan, subscriptionStatus: org.subscriptionStatus, subscriptionEndsAt: org.subscriptionEndsAt ? new Date(org.subscriptionEndsAt).toISOString().split("T")[0] : "" });
                        }}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
                        title="تغيير الباقة"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setResetPwModal({ orgId: org.id, orgName: org.name }); setResetPw(""); }}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                        title="إعادة تعيين كلمة المرور"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">{pagination.total} منشأة · صفحة {page} من {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
              السابق
            </button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwModal && (
        <Modal open onClose={() => setResetPwModal(null)} title={`إعادة تعيين كلمة المرور — ${resetPwModal.orgName}`} width="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">كلمة المرور الجديدة</label>
              <input
                type="text"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="أدخل كلمة المرور"
                dir="ltr"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                setResetPw(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
              }}
              className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              توليد كلمة مرور عشوائية
            </button>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setResetPwModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button
                disabled={!resetPw || resetPw.length < 6}
                onClick={async () => {
                  try {
                    await adminApi.resetOrgPassword(resetPwModal.orgId, { password: resetPw });
                    setResetPwModal(null);
                    setResetPw("");
                  } catch {
                    alert("فشل إعادة تعيين كلمة المرور");
                  }
                }}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
              >
                حفظ
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Renew Modal */}
      {renewModal && (
        <Modal open onClose={() => setRenewModal(null)} title={`تجديد اشتراك — ${renewModal.orgName}`} width="max-w-sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">الباقة</span>
                <span className="font-semibold text-gray-800"><PlanBadge plan={renewModal.plan} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">السعر</span>
                <span className="font-semibold text-gray-800">
                  {PLAN_MAP[renewModal.plan]?.price ? `${PLAN_MAP[renewModal.plan].price} ر.س / سنة` : "حسب الطلب"}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-500">تمديد حتى</span>
                <span className="font-semibold text-emerald-700 font-mono">
                  {new Date((renewModal.subscriptionEndsAt ? Math.max(new Date(renewModal.subscriptionEndsAt).getTime(), Date.now()) : Date.now()) + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("ar")}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setRenewModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button
                disabled={renewing}
                onClick={async () => {
                  const base = renewModal.subscriptionEndsAt ? Math.max(new Date(renewModal.subscriptionEndsAt).getTime(), Date.now()) : Date.now();
                  const newEnd = new Date(base + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                  await renewSub({ orgId: renewModal.orgId, data: { subscriptionStatus: "active", subscriptionEndsAt: newEnd } });
                  setRenewModal(null);
                  refetch();
                }}
                className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                تجديد سنة
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Owner Credentials Modal */}
      {credentialsModal && (
        <Modal open onClose={() => setCredentialsModal(null)} title="تم إنشاء المنشأة — بيانات دخول المالك" width="max-w-sm">
          <div className="space-y-3">
            <p className="text-xs text-gray-500">احتفظ بهذه البيانات — لن تظهر مجدداً</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 font-mono text-sm">
              {credentialsModal.email && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-sans text-xs">الإيميل</span>
                  <span className="text-gray-900 select-all">{credentialsModal.email}</span>
                </div>
              )}
              {credentialsModal.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-sans text-xs">الجوال</span>
                  <span className="text-gray-900 select-all" dir="ltr">{credentialsModal.phone}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-400 font-sans text-xs">كلمة المرور</span>
                <span className="text-brand-600 font-bold select-all" dir="ltr">{credentialsModal.password}</span>
              </div>
            </div>
            <button onClick={() => setCredentialsModal(null)}
              className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
              فهمت — إغلاق
            </button>
          </div>
        </Modal>
      )}

      {/* Plan Change Modal */}
      {planModal && (
        <Modal open onClose={() => setPlanModal(null)} title={`تغيير الباقة — ${planModal.orgName}`} width="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">الباقة</label>
              <select value={planForm.plan} onChange={e => setPlanForm(p => ({ ...p, plan: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 bg-white">
                {PLANS.map(p => <option key={p.key} value={p.key}>{p.name} — {p.price > 0 ? `${p.price} ر.س` : "حسب الطلب"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">الحالة</label>
              <select value={planForm.subscriptionStatus} onChange={e => setPlanForm(p => ({ ...p, subscriptionStatus: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 bg-white">
                <option value="trialing">تجربة</option>
                <option value="active">نشط</option>
                <option value="past_due">متأخر</option>
                <option value="cancelled">ملغي</option>
                <option value="suspended">موقوف</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">تاريخ الانتهاء</label>
              <input type="date" value={planForm.subscriptionEndsAt}
                onChange={e => setPlanForm(p => ({ ...p, subscriptionEndsAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setPlanModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button
                disabled={changingPlan}
                onClick={async () => {
                  await changePlan({ orgId: planModal.orgId, data: {
                    plan: planForm.plan || undefined,
                    subscriptionStatus: planForm.subscriptionStatus || undefined,
                    subscriptionEndsAt: planForm.subscriptionEndsAt || undefined,
                  }});
                  setPlanModal(null);
                  refetch();
                }}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingPlan && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Addons Modal */}
      {addonsModal && (
        <Modal open onClose={() => setAddonsModal(null)} title={`إدارة الإضافات — ${addonsModal.orgName}`} width="max-w-md">
          <div className="space-y-4">
            {/* Current addons */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">الإضافات المفعّلة</p>
              {(addonsData?.data ?? []).filter((a: any) => a.isActive).length === 0 ? (
                <p className="text-xs text-gray-400 py-2">لا توجد إضافات مفعّلة</p>
              ) : (
                <div className="space-y-1.5">
                  {(addonsData?.data ?? []).filter((a: any) => a.isActive).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                      <span className="text-sm text-gray-700">{a.addonName}</span>
                      <button
                        onClick={async () => {
                          await removeAddon({ orgId: addonsModal.orgId, addonId: a.id });
                          refetchAddons();
                        }}
                        className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new addon */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">إضافة جديدة</p>
              <div className="flex gap-2">
                <select value={newAddonKey} onChange={e => setNewAddonKey(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 bg-white">
                  <option value="">اختر الإضافة</option>
                  {ADDONS.map(a => <option key={a.key} value={a.key}>{a.name}</option>)}
                </select>
                <button
                  disabled={!newAddonKey || addingAddon}
                  onClick={async () => {
                    if (!newAddonKey) return;
                    const addon = ADDON_MAP[newAddonKey];
                    await addAddon({ orgId: addonsModal.orgId, data: { addonKey: newAddonKey, addonName: addon?.name ?? newAddonKey, price: addon?.price ?? 0 }});
                    setNewAddonKey("");
                    refetchAddons();
                  }}
                  className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {addingAddon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إضافة
                </button>
              </div>
            </div>

            <button onClick={() => setAddonsModal(null)}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              إغلاق
            </button>
          </div>
        </Modal>
      )}

      {/* Create Org Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="منشأة جديدة" width="max-w-xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">اسم المنشأة *</label>
              <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="مثال: صالون نور" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">الاسم بالإنجليزي (slug)</label>
              <input value={createForm.nameEn} onChange={(e) => setCreateForm({ ...createForm, nameEn: e.target.value })}
                placeholder="salon-noor" dir="ltr" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">المدينة</label>
              <select value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400 bg-white">
                <option value="">— اختر المدينة —</option>
                {SAUDI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">نوع النشاط</label>
              <select value={createForm.businessType} onChange={(e) => setCreateForm({ ...createForm, businessType: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400">
                {Object.entries(BUSINESS_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">الباقة</label>
              <select value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400">
                <option value="basic">الأساسي — 199 ر.س</option>
                <option value="advanced">المتقدم — 499 ر.س</option>
                <option value="pro">الاحترافي — 999 ر.س</option>
                <option value="enterprise">المؤسسي — حسب الطلب</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">الجوال</label>
              <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="05XXXXXXXX" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">البريد الإلكتروني</label>
              <input value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="info@company.com" dir="ltr" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">بيانات المالك (اختياري — لتفعيل الدخول فوراً)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">اسم المالك</label>
                <input value={createForm.ownerName} onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                  placeholder="أحمد محمد" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">جوال المالك</label>
                <input value={createForm.ownerPhone} onChange={(e) => setCreateForm({ ...createForm, ownerPhone: e.target.value })}
                  placeholder="05XXXXXXXX" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">إيميل المالك <span className="text-brand-500 font-medium">(للدخول)</span></label>
                <input type="email" value={createForm.ownerEmail} onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                  placeholder="owner@company.com" dir="ltr"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">كلمة المرور</label>
                <input type="password" value={createForm.ownerPassword} onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                  placeholder="سيتم إنشاء كلمة مرور تلقائية إذا تُرك فارغاً" dir="ltr"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
            <button disabled={creating || !createForm.name} onClick={async () => {
              const res: any = await createOrg(createForm);
              setShowCreate(false);
              setCreateForm({ name: "", nameEn: "", businessType: "general", plan: "basic", phone: "", email: "", city: "", ownerName: "", ownerPhone: "", ownerEmail: "", ownerPassword: "" });
              refetch();
              if (res?.ownerCredentials) setCredentialsModal(res.ownerCredentials);
            }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إنشاء المنشأة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TEAM TAB — فريق نسق
// ════════════════════════════════════════════════════════════

const ROLES_CONFIG = [
  { value: "account_manager", label: "مدير حساب",   desc: "متابعة ودعم عملاء محددين" },
  { value: "support_agent",   label: "دعم فني",      desc: "معالجة تذاكر الدعم" },
  { value: "content_manager", label: "مدير محتوى",  desc: "إدارة الإعلانات والمحتوى" },
  { value: "viewer",          label: "مشاهد فقط",   desc: "صلاحية قراءة بدون تعديل" },
];

function TeamTab() {
  const { data, loading, refetch } = useApi(() => adminApi.staff(), []);
  const [search, setSearch] = useState("");
  const [editRole, setEditRole] = useState<{ userId: string; current: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", email: "", phone: "", password: "", role: "account_manager" });
  const [formErr, setFormErr] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { mutate: setRole, loading: settingRole } = useMutation(({ userId, role }: any) => adminApi.setStaffRole(userId, role));
  const { mutate: createStaff, loading: creating } = useMutation((d: any) => adminApi.createStaff(d));
  const { mutate: removeStaff, loading: removing } = useMutation((id: string) => adminApi.removeStaff(id));

  const all: any[] = data?.data || [];
  const filtered = search ? all.filter((u: any) => u.name?.includes(search) || u.phone?.includes(search) || u.email?.includes(search)) : all;

  const handleCreate = async () => {
    setFormErr("");
    if (!newForm.name.trim()) { setFormErr("الاسم مطلوب"); return; }
    if (!newForm.email && !newForm.phone) { setFormErr("البريد الإلكتروني أو الجوال مطلوب"); return; }
    if (newForm.password.length < 8) { setFormErr("كلمة المرور 8 أحرف على الأقل"); return; }
    try {
      await createStaff(newForm);
      setAddOpen(false);
      setNewForm({ name: "", email: "", phone: "", password: "", role: "account_manager" });
      refetch();
    } catch (e: any) { setFormErr(e.message || "حدث خطأ"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="فريق نسق" sub="موظفو المنصة وصلاحياتهم" />
        <button onClick={() => { setAddOpen(true); setFormErr(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
          <Plus className="w-4 h-4" /> إضافة عضو
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..."
          className="flex-1 text-sm outline-none" />
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon={Users2} text="لا يوجد فريق نسق" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">العضو</th>
                <th className="text-right px-4 py-3 font-semibold">الدور</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">العملاء المعيّنون</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">آخر دخول</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => {
                const currentRole = u.isSuperAdmin ? "super_admin" : (u.nasaqRole || "");
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                          {u.name?.[0] || "م"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{u.phone || u.email || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={currentRole || "viewer"} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.assignedOrgs || 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("ar") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {!u.isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditRole({ userId: u.id, current: currentRole })}
                            className="text-xs text-brand-500 border border-brand-200 px-2.5 py-1 rounded-lg hover:bg-brand-50">
                            تعديل الدور
                          </button>
                          <button onClick={() => setDeleteId(u.id)}
                            className="text-xs text-red-400 border border-red-100 px-2.5 py-1 rounded-lg hover:bg-red-50">
                            حذف
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add member modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة عضو جديد لفريق نسق">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">الاسم *</label>
            <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" placeholder="اسم العضو" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">البريد الإلكتروني</label>
            <input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" placeholder="email@example.com" dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">الجوال</label>
            <input value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" placeholder="+966xxxxxxxxx" dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">كلمة المرور *</label>
            <input type="password" value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" placeholder="8 أحرف على الأقل" dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">الدور *</label>
            <div className="space-y-2">
              {ROLES_CONFIG.map((r) => (
                <div key={r.value} onClick={() => setNewForm({ ...newForm, role: r.value })}
                  className={clsx("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    newForm.role === r.value ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                  <div className={clsx("w-4 h-4 rounded-full border-2 shrink-0", newForm.role === r.value ? "border-brand-500 bg-brand-500" : "border-gray-300")} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-400">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {formErr && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formErr}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setAddOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
            <button onClick={handleCreate} disabled={creating}
              className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إضافة العضو"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Role edit modal */}
      <Modal open={!!editRole} onClose={() => setEditRole(null)} title="تعديل دور الموظف">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">اختر الدور المناسب لهذا الموظف في فريق نسق.</p>
          <div className="space-y-2">
            {ROLES_CONFIG.map((r) => (
              <div key={r.value} onClick={() => setEditRole((prev) => prev ? { ...prev, current: r.value } : null)}
                className={clsx("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  editRole?.current === r.value ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                <div className={clsx("w-4 h-4 rounded-full border-2 shrink-0", editRole?.current === r.value ? "border-brand-500 bg-brand-500" : "border-gray-300")} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.label}</p>
                  <p className="text-xs text-gray-400">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditRole(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
            <button disabled={settingRole} onClick={async () => {
              if (!editRole) return;
              await setRole({ userId: editRole.userId, role: editRole.current });
              setEditRole(null); refetch();
            }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              {settingRole ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "حفظ الدور"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">سيتم إيقاف الحساب وإزالة صلاحياته. هل أنت متأكد؟</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
            <button disabled={removing} onClick={async () => {
              if (!deleteId) return;
              await removeStaff(deleteId);
              setDeleteId(null); refetch();
            }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تأكيد الحذف"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CLIENTS TAB — portfolio view
// ════════════════════════════════════════════════════════════

function ClientsTab() {
  const { data: staffData } = useApi(() => adminApi.staff(), []);
  const { data: clientsData, loading } = useApi(() => adminApi.clients(), []);
  const [managerFilter, setManagerFilter] = useState("");

  const staffList: any[] = (staffData?.data || []).filter((s: any) => s.nasaqRole === "account_manager" || s.isSuperAdmin);
  const allClients: any[] = clientsData?.data || [];
  const filtered = managerFilter ? allClients.filter((o: any) => o.accountManagerId === managerFilter) : allClients;

  // Renewals soon (next 30 days)
  const soon = allClients.filter((o: any) => {
    const d = o.trialEndsAt || o.subscriptionEndsAt;
    if (!d) return false;
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  return (
    <div className="space-y-5">
      <SectionHeader title="إدارة الحسابات" sub="عملاء معيّن لهم مدراء حسابات" />

      {soon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">{soon.length} منشأة على وشك انتهاء اشتراكها خلال 30 يوماً</p>
          </div>
          <div className="space-y-1.5">
            {soon.map((o: any) => (
              <div key={o.id} className="flex items-center gap-2 text-xs text-amber-700">
                <span className="font-medium">{o.name}</span>
                <span>·</span>
                <span>{new Date(o.trialEndsAt || o.subscriptionEndsAt).toLocaleDateString("ar")}</span>
                <StatusBadge status={o.subscriptionStatus} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <select value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          <option value="">كل مدراء الحسابات</option>
          {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon={Briefcase} text="لا توجد منشآت معيّنة" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">المنشأة</th>
                <th className="text-right px-4 py-3 font-semibold">مدير الحساب</th>
                <th className="text-right px-4 py-3 font-semibold">الباقة</th>
                <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">انتهاء الاشتراك</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o: any) => {
                const mgr = staffList.find((s: any) => s.id === o.accountManagerId);
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xs shrink-0">{o.name[0]}</div>
                        <div>
                          <p className="font-medium text-gray-900">{o.name}</p>
                          <p className="text-[10px] text-gray-400">{BUSINESS_TYPES[o.businessType] || o.businessType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{mgr?.name || "—"}</td>
                    <td className="px-4 py-3"><PlanBadge plan={o.plan} /></td>
                    <td className="px-4 py-3"><StatusBadge status={o.subscriptionStatus} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {o.subscriptionEndsAt ? new Date(o.subscriptionEndsAt).toLocaleDateString("ar") : o.trialEndsAt ? new Date(o.trialEndsAt).toLocaleDateString("ar") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PLANS TAB
// ════════════════════════════════════════════════════════════

function PlansTab() {
  const { data, loading, refetch } = useApi(() => adminApi.plans(), []);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const { mutate: savePlan, loading: saving } = useMutation(({ id, ...d }: any) => adminApi.updatePlan(id, d));

  const plans: any[] = data?.data || [];

  const startEdit = (p: any) => {
    setEditId(p.id);
    setEditForm({
      nameAr: p.nameAr, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly,
      trialDays: p.trialDays, maxUsers: p.maxUsers, maxLocations: p.maxLocations,
      features: Array.isArray(p.features) ? p.features.join("\n") : "",
    });
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <SectionHeader title="الباقات والأسعار" sub="تحكم كامل في التسعير والمميزات" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">{plan.nameAr}</h3>
                  <PlanBadge plan={plan.id} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{plan.orgCount ?? 0} منشأة مشتركة</p>
              </div>
              <button onClick={() => editId === plan.id ? setEditId(null) : startEdit(plan)}
                className="text-xs text-brand-500 border border-brand-200 px-3 py-1 rounded-xl hover:bg-brand-50">
                {editId === plan.id ? "إلغاء" : <><Edit3 className="w-3 h-3 inline ml-1" />تعديل</>}
              </button>
            </div>

            {editId === plan.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">الاسم العربي</label>
                    <input value={editForm.nameAr} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">أيام التجربة</label>
                    <input type="number" value={editForm.trialDays} onChange={(e) => setEditForm({ ...editForm, trialDays: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">السعر الشهري (ر.س)</label>
                    <input type="number" value={editForm.priceMonthly} onChange={(e) => setEditForm({ ...editForm, priceMonthly: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">السعر السنوي (ر.س)</label>
                    <input type="number" value={editForm.priceYearly} onChange={(e) => setEditForm({ ...editForm, priceYearly: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">أقصى مستخدمين</label>
                    <input type="number" value={editForm.maxUsers} onChange={(e) => setEditForm({ ...editForm, maxUsers: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">أقصى فروع</label>
                    <input type="number" value={editForm.maxLocations} onChange={(e) => setEditForm({ ...editForm, maxLocations: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">المميزات (كل ميزة في سطر)</label>
                  <textarea value={editForm.features} onChange={(e) => setEditForm({ ...editForm, features: e.target.value })}
                    rows={4} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none resize-none" />
                </div>
                <button disabled={saving} onClick={async () => {
                  await savePlan({ id: plan.id, nameAr: editForm.nameAr, priceMonthly: parseFloat(editForm.priceMonthly), priceYearly: parseFloat(editForm.priceYearly), trialDays: parseInt(editForm.trialDays), maxUsers: parseInt(editForm.maxUsers), maxLocations: parseInt(editForm.maxLocations), features: editForm.features.split("\n").filter(Boolean) });
                  setEditId(null); refetch();
                }} className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ التغييرات
                </button>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                  {[
                    { label: "شهري", val: `${plan.priceMonthly} ر.س` },
                    { label: "سنوي", val: `${plan.priceYearly} ر.س` },
                    { label: "مستخدمون", val: plan.maxUsers >= 999 ? "غير محدود" : `حتى ${plan.maxUsers}` },
                    { label: "التجربة", val: `${plan.trialDays} يوم` },
                  ].map((i) => (
                    <div key={i.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 mb-1">{i.label}</p>
                      <p className="font-bold text-gray-800 text-sm">{i.val}</p>
                    </div>
                  ))}
                </div>
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {plan.features.map((f: string) => (
                      <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SUPPORT TAB
// ════════════════════════════════════════════════════════════

function SupportTab() {
  const [statusFilter, setStatusFilter] = useState("open");
  const { data, loading, refetch } = useApi(() => adminApi.tickets({ status: statusFilter || undefined }), [statusFilter]);
  const { mutate: update } = useMutation(({ id, status }: any) => adminApi.updateTicket(id, { status }));

  const tickets: any[] = data?.data || [];
  const PRIORITY_COLORS: Record<string, string> = {
    low: "bg-gray-100 text-gray-500", normal: "bg-blue-50 text-blue-600",
    high: "bg-orange-50 text-orange-700", urgent: "bg-red-50 text-red-600",
  };
  const PRIORITY_LABELS: Record<string, string> = { low: "منخفض", normal: "عادي", high: "مرتفع", urgent: "عاجل" };

  return (
    <div className="space-y-5">
      <SectionHeader title="الدعم الفني" sub="تذاكر الدعم من العملاء" />
      <div className="flex gap-2">
        {[["open", "مفتوحة"], ["in_progress", "قيد المعالجة"], ["resolved", "محلولة"], ["", "الكل"]].map(([s, l]) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
              statusFilter === s ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
            {l}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : tickets.length === 0 ? <Empty icon={Headphones} text="لا توجد تذاكر" /> : (
        <div className="space-y-2">
          {tickets.map((t: any) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{t.subject}</p>
                  <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium", PRIORITY_COLORS[t.priority])}>
                    {PRIORITY_LABELS[t.priority] || t.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{t.body}</p>
                <p className="text-[10px] text-gray-300 mt-1">{t.createdAt ? new Date(t.createdAt).toLocaleString("ar") : ""}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {t.status === "open" && (
                  <button onClick={async () => { await update({ id: t.id, status: "in_progress" }); refetch(); }}
                    className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg hover:bg-blue-100 font-medium">معالجة</button>
                )}
                {(t.status === "open" || t.status === "in_progress") && (
                  <button onClick={async () => { await update({ id: t.id, status: "resolved" }); refetch(); }}
                    className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg hover:bg-emerald-100 font-medium">حل</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ════════════════════════════════════════════════════════════

function DocumentsTab() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data, loading, refetch } = useApi(() => adminApi.documents({ status: statusFilter || undefined }), [statusFilter]);
  const { mutate: updateDoc } = useMutation(({ id, status }: any) => adminApi.updateDocument(id, { status }));
  const docs: any[] = data?.data || [];

  return (
    <div className="space-y-5">
      <SectionHeader title="الوثائق" sub="مراجعة وتوثيق المنشآت" />
      <div className="flex gap-2">
        {[["pending", "انتظار"], ["approved", "موافق"], ["rejected", "مرفوض"], ["", "الكل"]].map(([s, l]) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium transition-colors",
              statusFilter === s ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
            {l}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : docs.length === 0 ? <Empty icon={FileText} text="لا توجد وثائق" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {docs.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <FileText className="w-5 h-5 text-gray-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{doc.label || doc.type}</p>
                <p className="text-xs text-gray-400">{doc.type}</p>
              </div>
              {doc.status === "pending" ? (
                <div className="flex gap-2 shrink-0">
                  <button onClick={async () => { await updateDoc({ id: doc.id, status: "approved" }); refetch(); }}
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={async () => { await updateDoc({ id: doc.id, status: "rejected" }); refetch(); }}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><XCircle className="w-4 h-4" /></button>
                </div>
              ) : (
                <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium",
                  doc.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
                  {doc.status === "approved" ? "موافق" : "مرفوض"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ANNOUNCEMENTS TAB
// ════════════════════════════════════════════════════════════

function AnnouncementsTab() {
  const { data, loading, refetch } = useApi(() => adminApi.announcements(), []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "info" });
  const { mutate: create, loading: creating } = useMutation((d: any) => adminApi.createAnnouncement(d));
  const { mutate: del } = useMutation((id: string) => adminApi.deleteAnnouncement(id));
  const rows: any[] = data?.data || [];

  const TYPE_COLORS: Record<string, string> = {
    info: "bg-blue-50 text-blue-600", warning: "bg-amber-50 text-amber-700",
    maintenance: "bg-orange-50 text-orange-700", feature: "bg-emerald-50 text-emerald-700",
  };
  const TYPE_LABELS: Record<string, string> = { info: "معلومات", warning: "تحذير", maintenance: "صيانة", feature: "ميزة جديدة" };

  return (
    <div className="space-y-5">
      <SectionHeader title="الإعلانات" sub="إشعارات وتحديثات المنصة"
        action={
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600">
            <Plus className="w-4 h-4" /> إعلان جديد
          </button>
        }
      />
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="عنوان الإعلان" className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-brand-400" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="نص الإعلان..." rows={3}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none focus:border-brand-400" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none">
              <option value="info">معلومات</option>
              <option value="warning">تحذير</option>
              <option value="maintenance">صيانة</option>
              <option value="feature">ميزة جديدة</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">إلغاء</button>
            <button disabled={creating || !form.title} onClick={async () => {
              await create(form); setForm({ title: "", body: "", type: "info" }); setShowForm(false); refetch();
            }} className="flex-1 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "نشر الإعلان"}
            </button>
          </div>
        </div>
      )}
      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={Megaphone} text="لا توجد إعلانات" /> : (
        <div className="space-y-2">
          {rows.map((a: any) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4">
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5", TYPE_COLORS[a.type])}>
                {TYPE_LABELS[a.type] || a.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{a.body}</p>
                <p className="text-[10px] text-gray-300 mt-1">{a.createdAt ? new Date(a.createdAt).toLocaleDateString("ar") : ""}</p>
              </div>
              <button onClick={async () => { if (!confirm("حذف هذا الإعلان؟")) return; await del(a.id); refetch(); }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// SUBSCRIPTION ORDERS TAB — إدارة طلبات الشراء
// ════════════════════════════════════════════════════════════

function SubscriptionOrdersTab() {
  const [statusFilter, setStatusFilter] = useState("pending_payment");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [paymentRef, setPaymentRef]     = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState<any>(null);

  const { data: ordersRes, loading, refetch } = useApi(
    () => adminApi.subscriptionOrders(statusFilter),
    [statusFilter]
  );
  const orders: any[] = ordersRes?.data ?? [];

  const ORDER_STATUS_TABS = [
    { key: "pending_payment", label: "بانتظار الدفع" },
    { key: "paid",            label: "مدفوعة" },
    { key: "cancelled",       label: "ملغاة" },
    { key: "all",             label: "الكل" },
  ];

  const TYPE_LABELS: Record<string, string> = {
    upgrade: "ترقية باقة",
    renewal: "تجديد",
    addon:   "إضافة",
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
      paid:            "bg-emerald-50 text-emerald-700 border-emerald-200",
      cancelled:       "bg-gray-100 text-gray-500 border-gray-200",
      expired:         "bg-gray-100 text-gray-500 border-gray-200",
    };
    const labels: Record<string, string> = {
      pending_payment: "بانتظار الدفع",
      paid: "مدفوع", cancelled: "ملغي", expired: "منتهي",
    };
    return (
      <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-lg border text-[11px] font-semibold", m[s] ?? m.cancelled)}>
        {labels[s] ?? s}
      </span>
    );
  };

  const handleConfirm = async () => {
    if (!showConfirmModal) return;
    setConfirmingId(showConfirmModal.id);
    try {
      await adminApi.confirmSubscriptionOrder(showConfirmModal.id, paymentRef || undefined);
      toast.success("تم تأكيد الدفع وتفعيل الاشتراك");
      setShowConfirmModal(null);
      setPaymentRef("");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "فشل التأكيد");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("إلغاء هذا الطلب؟")) return;
    try {
      await adminApi.cancelSubscriptionOrder(orderId);
      toast.success("تم إلغاء الطلب");
      refetch();
    } catch { toast.error("فشل الإلغاء"); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">طلبات الشراء</h2>
        <p className="text-sm text-gray-400">تأكيد الدفع اليدوي للطلبات المعلّقة</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {ORDER_STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
              statusFilter === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">جارٍ التحميل...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">لا توجد طلبات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-right text-xs text-gray-500 font-medium border-b border-gray-100">
                  <th className="px-5 py-3">المنشأة</th>
                  <th className="px-5 py-3">نوع العملية</th>
                  <th className="px-5 py-3">التفاصيل</th>
                  <th className="px-5 py-3">المبلغ</th>
                  <th className="px-5 py-3">الحالة</th>
                  <th className="px-5 py-3">التاريخ</th>
                  <th className="px-5 py-3 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800 text-sm">{o.orgName}</p>
                      {o.orgCode && <p className="text-[11px] font-mono text-gray-400">{o.orgCode}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{TYPE_LABELS[o.orderType] ?? o.orderType}</td>
                    <td className="px-5 py-3 text-gray-600">{o.itemName}</td>
                    <td className="px-5 py-3 text-gray-700 font-medium tabular-nums">
                      {o.price ? `${Number(o.price).toLocaleString("en-US")} ر.س` : "—"}
                    </td>
                    <td className="px-5 py-3">{statusBadge(o.status)}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {fmtDate(o.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      {o.status === "pending_payment" && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setShowConfirmModal(o); setPaymentRef(""); }}
                            disabled={confirmingId === o.id}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-50"
                          >
                            تأكيد الدفع
                          </button>
                          <button
                            onClick={() => handleCancel(o.id)}
                            className="px-2.5 py-1 text-gray-400 text-[11px] rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors border border-gray-200"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm payment modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">تأكيد الدفع</h3>
            <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">المنشأة</span>
                <span className="font-medium">{showConfirmModal.orgName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">العملية</span>
                <span className="font-medium">{showConfirmModal.itemName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">المبلغ</span>
                <span className="font-bold text-emerald-600">
                  {showConfirmModal.price ? `${Number(showConfirmModal.price).toLocaleString("en-US")} ر.س` : "—"}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">رقم مرجع الدفع (اختياري)</label>
              <input
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="رقم الحوالة أو مرجع بوابة الدفع"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowConfirmModal(null); setPaymentRef(""); }}
                className="flex-1 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                disabled={!!confirmingId}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {confirmingId ? "جارٍ التأكيد..." : "تأكيد الدفع"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// AUDIT TAB
// ════════════════════════════════════════════════════════════

function AuditTab() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const { data, loading } = useApi(
    () => adminApi.auditLog({
      page,
      action: filterAction || undefined,
      targetType: filterType || undefined,
      fromDate: filterFrom || undefined,
      toDate: filterTo || undefined,
    }),
    [page, filterAction, filterType, filterFrom, filterTo]
  );

  const rows: any[] = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  const ACTION_TYPE_OPTIONS = [
    { value: "", label: "كل الأنواع" },
    { value: "org", label: "منشأة" },
    { value: "user", label: "مستخدم" },
    { value: "ticket", label: "تذكرة" },
    { value: "announcement", label: "إعلان" },
    { value: "plan", label: "باقة" },
  ];

  const handleReset = () => {
    setFilterAction(""); setFilterType(""); setFilterFrom(""); setFilterTo(""); setPage(1);
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="سجل المراجعة" sub={`${pagination?.total ?? 0} إجراء موثّق`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          placeholder="بحث بالإجراء..." dir="ltr"
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none flex-1 min-w-40" />
        <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700">
          {ACTION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
        <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
        {(filterAction || filterType || filterFrom || filterTo) && (
          <button onClick={handleReset} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? <Empty icon={ClipboardList} text="لا يوجد سجل بعد" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">الإجراء</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">النوع</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">الـ ID</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">الـ IP</th>
                <th className="text-right px-4 py-3 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.action}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{r.targetType}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-300 hidden lg:table-cell truncate max-w-24">{r.targetId || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 hidden md:table-cell">{r.ip || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{r.createdAt ? new Date(r.createdAt).toLocaleString("ar") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
            السابق
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SYSTEM TAB
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// OTP DEBUG PANEL — مؤقت حتى تفعيل SMS
// ════════════════════════════════════════════════════════════
function OtpDebugPanel() {
  const [phone, setPhone] = useState("");
  const [otps, setOtps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smsEnabled, setSmsEnabled] = useState<boolean | null>(null);

  const fetchOtps = async (q?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await adminApi.debugOtp(q || undefined) as any;
      setOtps(res.data || []);
      setSmsEnabled(res.smsEnabled);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { fetchOtps(); }, []);

  if (smsEnabled === true) return null;

  return (
    <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-100 bg-amber-50/40">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-amber-800">رموز التحقق (OTP)</h3>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
            SMS غير مفعّل — مؤقت
          </span>
        </div>
        <p className="text-xs text-amber-600">يختفي هذا القسم فور تفعيل SMS_ENABLED=true</p>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text" value={phone} placeholder="ابحث برقم الجوال..."
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchOtps(phone)}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" dir="ltr"
          />
          <button onClick={() => fetchOtps(phone)} disabled={loading}
            className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
          <button onClick={() => { setPhone(""); fetchOtps(); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
            الكل
          </button>
        </div>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        {otps.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">لا توجد رموز نشطة حالياً</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">الجوال</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">الرمز</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">الغرض</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">ينتهي</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">محاولات</th>
                  <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {otps.map((otp: any) => {
                  const expired = new Date(otp.expiresAt) < new Date();
                  const used = !!otp.usedAt;
                  return (
                    <tr key={otp.id} className="border-b border-gray-50 hover:bg-gray-50/40">
                      <td className="py-2 px-3 font-mono text-xs text-gray-700">{otp.phone}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-1 bg-brand-50 text-brand-700 rounded-lg text-sm font-mono font-bold tracking-widest">
                          {otp.code}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">{otp.purpose === "login" ? "تسجيل دخول" : "تسجيل"}</td>
                      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(otp.expiresAt).toLocaleTimeString("ar-SA")}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        <span className={otp.attempts >= 3 ? "text-red-600 font-semibold" : "text-gray-500"}>
                          {otp.attempts ?? 0}/5
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {used ? (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">مستخدم</span>
                        ) : expired ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs">منتهي</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">نشط</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  database:    { label: "قاعدة البيانات",  icon: Server,        color: "text-blue-600",   bg: "bg-blue-50" },
  integrity:   { label: "سلامة البيانات",  icon: ShieldCheck,   color: "text-purple-600", bg: "bg-purple-50" },
  business:    { label: "منطق الأعمال",    icon: Briefcase,     color: "text-amber-600",  bg: "bg-amber-50" },
  performance: { label: "الأداء",          icon: Activity,      color: "text-emerald-600",bg: "bg-emerald-50" },
  security:    { label: "الأمان",          icon: Lock,          color: "text-red-600",    bg: "bg-red-50" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ok:    { label: "سليم",    color: "text-emerald-700", bg: "bg-emerald-50",  dot: "bg-emerald-400" },
  warn:  { label: "تحذير",   color: "text-amber-700",   bg: "bg-amber-50",    dot: "bg-amber-400" },
  error: { label: "خطأ",     color: "text-red-700",     bg: "bg-red-50",      dot: "bg-red-500" },
  info:  { label: "معلومة",  color: "text-blue-700",    bg: "bg-blue-50",     dot: "bg-blue-400" },
};

function SystemTab() {
  const { data, loading, refetch } = useApi(() => adminApi.system(), []);
  const { data: errData, loading: errLoading, refetch: refetchErrors } = useApi(() => adminApi.systemErrors(50), []);
  const [diagResult, setDiagResult] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["security", "integrity"]));
  const sys = data?.data;
  const errors: any[] = errData?.data || [];

  const runDiag = async () => {
    setDiagLoading(true);
    setDiagError(null);
    try {
      const res = await adminApi.diagnostics() as any;
      setDiagResult(res.data);
      // Auto-expand categories with issues
      const cats = new Set<string>();
      for (const c of res.data?.checks ?? []) {
        if (c.status === "error" || c.status === "warn") cats.add(c.category);
      }
      if (cats.size > 0) setExpandedCategories(cats);
    } catch (e: any) {
      setDiagError(e.message);
    } finally {
      setDiagLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Group checks by category
  const groupedChecks = diagResult?.checks
    ? (Object.keys(CATEGORY_META) as string[]).map(cat => ({
        cat,
        checks: (diagResult.checks as any[]).filter((c: any) => c.category === cat),
      }))
    : [];

  return (
    <div className="space-y-5">
      <SectionHeader title="صحة النظام" sub="فحص شامل للبنية التحتية والبيانات والأمان"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => { refetch(); refetchErrors(); }} className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50">
              <RefreshCw className="w-3.5 h-3.5" /> تحديث
            </button>
            <button onClick={runDiag} disabled={diagLoading}
              className="flex items-center gap-1.5 text-sm text-white bg-brand-500 px-4 py-1.5 rounded-xl hover:bg-brand-600 disabled:opacity-50 font-semibold">
              {diagLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5" />}
              {diagLoading ? "جاري الفحص..." : "فحص شامل"}
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "زمن استجابة DB", value: `${sys?.dbLatencyMs ?? "—"} ms`, icon: Activity, bg: sys?.dbLatencyMs < 100 ? "bg-emerald-50" : "bg-orange-50", color: sys?.dbLatencyMs < 100 ? "text-emerald-600" : "text-orange-600" },
            { label: "جلسات نشطة", value: sys?.activeSessions ?? 0, icon: Users, bg: "bg-blue-50", color: "text-blue-600" },
            { label: "سجلات الصحة", value: sys?.history?.length ?? 0, icon: ClipboardList, bg: "bg-purple-50", color: "text-purple-600" },
            { label: "أخطاء الخادم (500)", value: errors.length, icon: AlertTriangle, bg: errors.length > 0 ? "bg-red-50" : "bg-gray-50", color: errors.length > 0 ? "text-red-600" : "text-gray-400" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
              <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", k.bg)}>
                <k.icon className={clsx("w-5 h-5", k.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{k.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diagnostics Panel */}
      {(diagResult || diagLoading || diagError) && (
        <div className="space-y-3">
          {/* Summary Bar */}
          {diagResult && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-5 h-5 text-brand-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">نتائج الفحص الشامل</p>
                    <p className="text-xs text-gray-400">
                      {new Date(diagResult.runAt).toLocaleString("en-US")} — استغرق {diagResult.durationMs}ms
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { key: "error", label: "أخطاء", color: "text-red-600",     bg: "bg-red-50" },
                    { key: "warn",  label: "تحذيرات",color: "text-amber-600",  bg: "bg-amber-50" },
                    { key: "ok",    label: "سليم",   color: "text-emerald-700", bg: "bg-emerald-50" },
                    { key: "info",  label: "معلومات",color: "text-blue-700",   bg: "bg-blue-50" },
                  ].map(s => (
                    <div key={s.key} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold", s.bg, s.color)}>
                      <span className="text-lg font-bold tabular-nums">{(diagResult.summary as any)[s.key]}</span>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall health bar */}
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                {diagResult.summary.error > 0 && (
                  <div className="bg-red-500 h-full transition-all" style={{ width: `${(diagResult.summary.error / diagResult.summary.total) * 100}%` }} />
                )}
                {diagResult.summary.warn > 0 && (
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${(diagResult.summary.warn / diagResult.summary.total) * 100}%` }} />
                )}
                {diagResult.summary.ok > 0 && (
                  <div className="bg-emerald-400 h-full transition-all" style={{ width: `${(diagResult.summary.ok / diagResult.summary.total) * 100}%` }} />
                )}
                {diagResult.summary.info > 0 && (
                  <div className="bg-blue-300 h-full transition-all" style={{ width: `${(diagResult.summary.info / diagResult.summary.total) * 100}%` }} />
                )}
              </div>
            </div>
          )}

          {diagError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{diagError}</div>
          )}

          {/* Checks by Category */}
          {groupedChecks.map(({ cat, checks }) => {
            const meta = CATEGORY_META[cat];
            const hasIssue = checks.some((c: any) => c.status === "error" || c.status === "warn");
            const isOpen = expandedCategories.has(cat);
            const worstStatus = checks.some((c: any) => c.status === "error") ? "error"
              : checks.some((c: any) => c.status === "warn") ? "warn" : "ok";

            return (
              <div key={cat} className={clsx("bg-white rounded-2xl border overflow-hidden", hasIssue ? "border-amber-200" : "border-gray-100")}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
                      <meta.icon className={clsx("w-4 h-4", meta.color)} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{meta.label}</span>
                    <span className="text-xs text-gray-400">({checks.length} فحص)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {checks.filter((c: any) => c.status === "error").length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                        {checks.filter((c: any) => c.status === "error").length} خطأ
                      </span>
                    )}
                    {checks.filter((c: any) => c.status === "warn").length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                        {checks.filter((c: any) => c.status === "warn").length} تحذير
                      </span>
                    )}
                    <span className={clsx("w-2 h-2 rounded-full", STATUS_META[worstStatus].dot)} />
                    <ChevronDown className={clsx("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
                  </div>
                </button>

                {/* Checks List */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {checks.map((check: any) => {
                      const sm = STATUS_META[check.status];
                      return (
                        <div key={check.id} className={clsx("flex items-start gap-3 px-5 py-3", check.status === "error" ? "bg-red-50/30" : check.status === "warn" ? "bg-amber-50/20" : "")}>
                          <span className={clsx("mt-1 w-2 h-2 rounded-full shrink-0", sm.dot)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-gray-700">{check.name}</p>
                              <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-mono font-bold", sm.bg, sm.color)}>
                                {sm.label}
                              </span>
                              {check.threshold && (
                                <span className="text-[10px] text-gray-400 font-mono">الحد: {check.threshold}</span>
                              )}
                              {check.value != null && (
                                <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{check.value}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{check.message}</p>
                            {check.details && check.status !== "info" && (
                              <details className="mt-1">
                                <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">تفاصيل</summary>
                                <pre className="text-[10px] text-gray-500 font-mono bg-gray-50 rounded p-2 mt-1 overflow-auto max-h-24 whitespace-pre-wrap">
                                  {JSON.stringify(check.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* OTP Debug Panel — shown only when SMS is not configured */}
      <OtpDebugPanel />

      {/* Error Log */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-700">سجل أخطاء الخادم</h3>
            {errors.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-semibold">{errors.length}</span>
            )}
          </div>
          <p className="text-xs text-gray-400">كل خطأ 500 يُسجَّل هنا مع الكود ومعرّف الطلب</p>
        </div>
        {errLoading ? <Spinner /> : errors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <p className="text-sm">لا توجد أخطاء خادم — النظام يعمل بشكل طبيعي</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الكود</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المسار</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الرسالة</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">Request ID</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-red-50/20">
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-mono font-bold">
                        {(e.details as any)?.code ?? "SRV_INTERNAL"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-mono text-gray-600">
                        {(e.details as any)?.method ?? ""} {(e.details as any)?.path ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 max-w-xs">
                      <p className="text-xs text-gray-500 truncate" title={(e.details as any)?.message}>
                        {(e.details as any)?.message ?? "—"}
                      </p>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-mono text-gray-400">{e.targetId ?? "—"}</span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                      {e.createdAt ? new Date(e.createdAt).toLocaleString("en-US") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Health Snapshots (written every 5 min by server) */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-gray-700">سجل الفحص الدوري</h3>
            <span className="text-xs text-gray-400">كل 5 دقائق</span>
          </div>
        </div>
        {!sys?.history?.length ? (
          <p className="text-xs text-gray-400 text-center py-6">لا توجد snapshots بعد — يبدأ الفحص خلال 5 دقائق</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100">
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الوقت</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">DB (ms)</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">جلسات</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">منشآت</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">أخطاء</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {sys.history.map((h: any, i: number) => {
                  const warn = h.dbLatencyMs > 500 || Number(h.errorRate) > 5;
                  return (
                    <tr key={i} className={clsx("border-b border-gray-50", warn ? "bg-amber-50/40" : "hover:bg-gray-50/40")}>
                      <td className="py-2 px-4 text-xs text-gray-500 font-mono whitespace-nowrap">
                        {h.recordedAt ? new Date(h.recordedAt).toLocaleString("en-US") : "—"}
                      </td>
                      <td className="py-2 px-4 text-xs font-semibold">
                        <span className={h.dbLatencyMs > 500 ? "text-red-600" : h.dbLatencyMs > 200 ? "text-amber-600" : "text-emerald-600"}>
                          {h.dbLatencyMs ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-600">{h.activeSessions ?? "—"}</td>
                      <td className="py-2 px-4 text-xs text-gray-600">{h.activeOrgs ?? "—"}</td>
                      <td className="py-2 px-4 text-xs">
                        <span className={Number(h.errorRate) > 0 ? "text-red-600 font-semibold" : "text-gray-400"}>
                          {h.errorRate ?? "0"}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-500 max-w-xs truncate">{h.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REMINDERS ADMIN TAB
// ════════════════════════════════════════════════════════════

function RemindersAdminTab() {
  const [subTab, setSubTab] = useState("all");
  const [showTplModal, setShowTplModal] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", description: "", defaultDaysOffset: "30", defaultPriority: "medium", categoryId: "" });
  const { data: allRes,  loading: aLoading, refetch: refetchAll }     = useApi(() => adminApi.allReminders(), []);
  const { data: catRes                                               } = useApi(() => adminApi.reminderCategories(), []);
  const { data: tplRes,  loading: tLoading, refetch: refetchTpl    } = useApi(() => adminApi.reminderTemplates(), []);
  const { mutate: createTpl, loading: crTpl } = useMutation((d: any) => adminApi.createReminderTpl(d));
  const { mutate: deleteTpl                 } = useMutation((id: string) => adminApi.deleteReminderTpl(id));

  const all: any[]  = allRes?.data  || [];
  const cats: any[] = catRes?.data  || [];
  const tpls: any[] = tplRes?.data  || [];

  const overdueCount  = all.filter(r => r.status === "active" && new Date(r.dueDate) < new Date()).length;
  const activeCount   = all.filter(r => r.status === "active").length;

  const handleCreateTpl = async () => {
    await createTpl({ ...tplForm, defaultDaysOffset: Number(tplForm.defaultDaysOffset) });
    setShowTplModal(false);
    setTplForm({ name: "", description: "", defaultDaysOffset: "30", defaultPriority: "medium", categoryId: "" });
    refetchTpl();
  };

  const PRIORITY_COLORS: Record<string, string> = {
    low: "bg-gray-100 text-gray-600", medium: "bg-blue-50 text-blue-700",
    high: "bg-amber-50 text-amber-700", urgent: "bg-red-50 text-red-600",
  };
  const PRIORITY_LABELS: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية", urgent: "عاجلة" };

  return (
    <div className="space-y-6">
      <SectionHeader title="التذكيرات" sub="إدارة تذكيرات جميع المنشآت والقوالب والتصنيفات" />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "إجمالي التذكيرات", value: all.length,  color: "text-brand-600",   bg: "bg-brand-50",   icon: Bell },
          { label: "نشطة",            value: activeCount,  color: "text-blue-700",    bg: "bg-blue-50",    icon: Activity },
          { label: "متأخرة",          value: overdueCount, color: "text-red-600",     bg: "bg-red-50",     icon: AlertTriangle },
          { label: "قوالب النظام",    value: tpls.length,  color: "text-purple-700",  bg: "bg-purple-50",  icon: BookOpen },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.bg)}>
              <s.icon className={clsx("w-4 h-4", s.color)} />
            </div>
            <p className={clsx("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <TabPill
        tabs={[{ id: "all", label: "كل التذكيرات" }, { id: "templates", label: "القوالب" }, { id: "categories", label: "التصنيفات" }]}
        active={subTab} onChange={setSubTab}
      />

      {/* All reminders */}
      {subTab === "all" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {aLoading ? <Spinner /> : all.length === 0 ? <Empty icon={Bell} text="لا توجد تذكيرات" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">العنوان</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المنشأة</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الأولوية</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الموعد</th>
                  <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {all.map((r: any) => {
                  const overdue = r.status === "active" && new Date(r.dueDate) < new Date();
                  return (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-medium text-gray-900">{r.title}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{r.orgName}</td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold", PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium)}>
                          {PRIORITY_LABELS[r.priority] || r.priority}
                        </span>
                      </td>
                      <td className={clsx("py-3 px-4 text-xs tabular-nums", overdue ? "text-red-600 font-semibold" : "text-gray-400")}>
                        {r.dueDate ? fmtDate(r.dueDate) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          r.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                          overdue ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
                        )}>
                          {r.status === "completed" ? "مكتملة" : overdue ? "متأخرة" : "نشطة"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Templates */}
      {subTab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowTplModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> قالب جديد
            </button>
          </div>
          {tLoading ? <Spinner /> : tpls.length === 0 ? <Empty icon={BookOpen} text="لا توجد قوالب" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tpls.map((t: any) => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    {t.isSystem && <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 font-medium shrink-0">نظام</span>}
                  </div>
                  {t.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{t.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{t.defaultDaysOffset} يوم قبل</span>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold", PRIORITY_COLORS[t.defaultPriority] || PRIORITY_COLORS.medium)}>
                      {PRIORITY_LABELS[t.defaultPriority] || t.defaultPriority}
                    </span>
                  </div>
                  {!t.isSystem && (
                    <button onClick={() => deleteTpl(t.id).then(() => refetchTpl())} className="mt-3 text-xs text-red-500 hover:underline">حذف</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      {subTab === "categories" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cats.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${c.color || "#5b9bd5"}20` }}>
                {c.icon || "📋"}
              </div>
              <p className="text-sm font-medium text-gray-800">{c.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create template modal */}
      <Modal open={showTplModal} onClose={() => setShowTplModal(false)} title="قالب تذكير جديد">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">اسم القالب *</label>
            <input value={tplForm.name} onChange={e => setTplForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="مثال: تجديد السجل التجاري" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">الوصف</label>
            <textarea value={tplForm.description} onChange={e => setTplForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none" placeholder="وصف مختصر..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">عدد الأيام قبل</label>
              <input type="number" value={tplForm.defaultDaysOffset} onChange={e => setTplForm(p => ({ ...p, defaultDaysOffset: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الأولوية</label>
              <select value={tplForm.defaultPriority} onChange={e => setTplForm(p => ({ ...p, defaultPriority: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">التصنيف</label>
            <select value={tplForm.categoryId} onChange={e => setTplForm(p => ({ ...p, categoryId: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
              <option value="">— بدون تصنيف —</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowTplModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button onClick={handleCreateTpl} disabled={!tplForm.name.trim() || crTpl} className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crTpl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              إضافة القالب
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMMERCIAL ENGINE TAB
// ════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
// Package Builder — plan × features checkbox matrix
// ────────────────────────────────────────────────────────────
function PackageBuilder({ plans, features, groups }: { plans: any[]; features: any[]; groups: any[] }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planFeats, setPlanFeats] = useState<Record<string, boolean>>({});
  const [planQuotaVals, setPlanQuotaVals] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data: quotasRes } = useApi(() => commercialApi.quotas(), []);
  const quotas: any[] = quotasRes?.data || [];

  React.useEffect(() => {
    if (!selectedPlan) return;
    commercialApi.planFeatures(selectedPlan).then((r: any) => {
      const m: Record<string, boolean> = {};
      for (const f of (r?.data || [])) m[f.id] = f.enabled !== false;
      setPlanFeats(m);
    });
    commercialApi.planQuotas(selectedPlan).then((r: any) => {
      const m: Record<string, number> = {};
      for (const q of (r?.data || [])) m[q.quotaId] = q.value;
      setPlanQuotaVals(m);
    });
  }, [selectedPlan]);

  const handleSave = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    setSaveError(null);
    try {
      await commercialApi.setPlanFeatures(selectedPlan, { features: Object.entries(planFeats).map(([featureId, enabled]) => ({ featureId, enabled })) });
      await commercialApi.setPlanQuotas(selectedPlan, { quotas: Object.entries(planQuotaVals).map(([quotaId, value]) => ({ quotaId, value })) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setSaveError(err?.message || "فشل الحفظ، حاول مرة أخرى");
    } finally { setSaving(false); }
  };

  const grouped = groups.length > 0
    ? groups.map(g => ({ group: g, items: features.filter((f: any) => f.groupId === g.id) })).filter(g => g.items.length > 0)
    : [{ group: { id: "all", nameAr: "الميزات" }, items: features }];
  const ungrouped = features.filter((f: any) => !f.groupId && groups.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[{ id: "basic", nameAr: "الأساسي" }, { id: "advanced", nameAr: "المتقدم" }, { id: "pro", nameAr: "الاحترافي" }, { id: "enterprise", nameAr: "المؤسسي" }, ...plans.filter(p => !["basic","advanced","pro","enterprise"].includes(p.id))].map((pl: any) => (
          <button key={pl.id} onClick={() => setSelectedPlan(pl.id)}
            className={clsx("px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
              selectedPlan === pl.id ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600")}>
            {pl.nameAr || pl.name || pl.id}
          </button>
        ))}
      </div>

      {!selectedPlan && (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">اختر باقة أعلاه لعرض وتعديل ميزاتها وحصصها</p>
        </div>
      )}

      {selectedPlan && (
        <div className="space-y-5">
          {/* Features */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">الميزات</p>
              <div className="flex gap-2 text-xs text-gray-400">
                <button onClick={() => { const m: any = {}; features.forEach((f: any) => { m[f.id] = true; }); setPlanFeats(m); }} className="hover:text-brand-600">تفعيل الكل</button>
                <span>·</span>
                <button onClick={() => setPlanFeats({})} className="hover:text-red-500">إلغاء الكل</button>
              </div>
            </div>
            {features.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">لا توجد ميزات في الكتالوج بعد</div>
            ) : (
              <div className="p-4 space-y-4">
                {grouped.map(({ group, items }) => (
                  <div key={group.id}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{group.nameAr}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {items.map((f: any) => (
                        <label key={f.id} className={clsx("flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                          planFeats[f.id] ? "border-brand-200 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                          <input type="checkbox" checked={!!planFeats[f.id]} onChange={e => setPlanFeats(p => ({ ...p, [f.id]: e.target.checked }))}
                            className="w-4 h-4 rounded accent-brand-500" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{f.nameAr}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{f.id}</p>
                          </div>
                          {f.isPremium && <span className="mr-auto text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold shrink-0">PRO</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {ungrouped.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">أخرى</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ungrouped.map((f: any) => (
                        <label key={f.id} className={clsx("flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                          planFeats[f.id] ? "border-brand-200 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                          <input type="checkbox" checked={!!planFeats[f.id]} onChange={e => setPlanFeats(p => ({ ...p, [f.id]: e.target.checked }))}
                            className="w-4 h-4 rounded accent-brand-500" />
                          <p className="text-xs font-medium text-gray-800 truncate">{f.nameAr}</p>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quotas */}
          {quotas.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">الحصص والحدود</p>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {quotas.map((q: any) => (
                  <div key={q.id} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">{q.nameAr}</p>
                    <div className="flex items-center gap-2">
                      <input type="number" value={planQuotaVals[q.id] ?? q.defaultValue ?? 0}
                        onChange={e => setPlanQuotaVals(p => ({ ...p, [q.id]: Number(e.target.value) }))}
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-brand-400" dir="ltr" />
                      <span className="text-xs text-gray-400">{q.unitAr || ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-4">
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "تم الحفظ!" : "حفظ الباقة"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Tenant Override Center
// ────────────────────────────────────────────────────────────
function TenantOverrideCenter({ orgs, features, quotas, addons }: { orgs: any[]; features: any[]; quotas: any[]; addons: any[] }) {
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [orgSearch, setOrgSearch] = useState("");
  const [overrideTab, setOverrideTab] = useState("entitlements");

  const { data: entRes, loading: entLoading, refetch: refetchEnt } = useApi(
    () => selectedOrg ? commercialApi.orgEntitlements(selectedOrg.id) : Promise.resolve(null), [selectedOrg?.id]);
  const { data: grantsRes, refetch: refetchGrants } = useApi(
    () => selectedOrg ? commercialApi.orgGrants(selectedOrg.id) : Promise.resolve(null), [selectedOrg?.id]);
  const { data: billingRes, refetch: refetchBilling } = useApi(
    () => selectedOrg ? commercialApi.billingOverride(selectedOrg.id) : Promise.resolve(null), [selectedOrg?.id]);
  const { data: orgAddonsRes, refetch: refetchOrgAddons } = useApi(
    () => selectedOrg ? commercialApi.orgAddons(selectedOrg.id) : Promise.resolve(null), [selectedOrg?.id]);

  const [grantForm, setGrantForm] = useState({ type: "feature", targetId: "", nameAr: "", reason: "", isPermanent: true, endsAt: "" });
  const [billingForm, setBillingForm] = useState({ billingMode: "standard", customPriceMonthly: "", reason: "", isBillingPaused: false });
  const [addonGrantForm, setAddonGrantForm] = useState({ addOnId: "", quantity: "1", isFree: true, notes: "" });
  const [quotaOverrideForm, setQuotaOverrideForm] = useState({ quotaId: "", value: "", reason: "", isPermanent: true });
  const [grantOpen, setGrantOpen] = useState(false);
  const [addonGrantOpen, setAddonGrantOpen] = useState(false);
  const [quotaOverrideOpen, setQuotaOverrideOpen] = useState(false);

  const { mutate: addGrant,       loading: addingGrant      } = useMutation((d: any) => commercialApi.addOrgGrant(selectedOrg!.id, d));
  const { mutate: deleteGrant                               } = useMutation((id: string) => commercialApi.deleteOrgGrant(selectedOrg!.id, id));
  const { mutate: saveBilling,    loading: savingBilling    } = useMutation((d: any) => commercialApi.setBillingOverride(selectedOrg!.id, d));
  const { mutate: toggleFeature                             } = useMutation(({ fId, enabled }: any) => commercialApi.orgFeatureOverride(selectedOrg!.id, fId, { enabled }));
  const { mutate: grantAddon,     loading: grantingAddon    } = useMutation((d: any) => commercialApi.grantOrgAddon(selectedOrg!.id, d));
  const { mutate: setQuotaOvr,    loading: settingQuotaOvr  } = useMutation((d: any) => commercialApi.setOrgQuotaOverride(selectedOrg!.id, d.quotaId, { value: d.value, reason: d.reason, isPermanent: d.isPermanent, endsAt: d.endsAt || null }));

  const filteredOrgs = orgSearch ? orgs.filter(o => o.name?.includes(orgSearch) || o.slug?.includes(orgSearch)) : orgs;
  const entitlements = entRes?.data || null;
  const grants: any[] = grantsRes?.data || [];
  const billing = billingRes?.data || null;
  const orgAddons: any[] = orgAddonsRes?.data || [];

  return (
    <div className="space-y-5">
      {/* Org selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">اختر منشأة للتحكم في صلاحياتها التجارية</p>
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 mb-3">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={orgSearch} onChange={e => setOrgSearch(e.target.value)} placeholder="بحث بالاسم..." className="flex-1 text-sm outline-none" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
          {filteredOrgs.map((org: any) => (
            <button key={org.id} onClick={() => { setSelectedOrg(org); setOverrideTab("entitlements"); }}
              className={clsx("flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all",
                selectedOrg?.id === org.id ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                {org.name?.[0] || "م"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{org.name}</p>
                <p className="text-[10px] text-gray-400">{org.plan || "—"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedOrg && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold">{selectedOrg.name?.[0]}</div>
            <div>
              <p className="font-semibold text-gray-900">{selectedOrg.name}</p>
              <p className="text-xs text-gray-400">{selectedOrg.businessType} · {selectedOrg.plan} · {selectedOrg.subscriptionStatus}</p>
            </div>
            <button onClick={() => setSelectedOrg(null)} className="mr-auto p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
          </div>

          <TabPill tabs={[
            { id: "entitlements", label: "الصلاحيات الفعلية" },
            { id: "features",     label: "تجاوزات الميزات" },
            { id: "quotas",       label: "تجاوزات الحصص" },
            { id: "grants",       label: "المنح المجانية" },
            { id: "addons",       label: "الإضافات" },
            { id: "billing",      label: "الفوترة" },
          ]} active={overrideTab} onChange={setOverrideTab} />

          {/* Entitlements view */}
          {overrideTab === "entitlements" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              {entLoading ? <Spinner /> : !entitlements ? <Empty icon={Lock} text="لا توجد بيانات صلاحيات" /> : (
                <div className="space-y-5">
                  {/* Access state badge */}
                  <div className="flex items-center gap-3">
                    <span className={clsx("px-3 py-1 rounded-full text-xs font-bold",
                      entitlements.accessState === "active" ? "bg-emerald-100 text-emerald-700"
                      : entitlements.accessState === "trial" ? "bg-blue-100 text-blue-700"
                      : entitlements.accessState === "free_tier" ? "bg-purple-100 text-purple-700"
                      : "bg-red-100 text-red-700")}>
                      {entitlements.accessState}
                    </span>
                    <span className="text-xs text-gray-400">الباقة: <strong>{entitlements.plan}</strong></span>
                    {entitlements.billingOverride && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">تجاوز فوترة نشط</span>
                    )}
                  </div>

                  {/* Enabled features */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      الميزات المفعّلة ({(entitlements.enabledFeatures || []).length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(entitlements.enabledFeatures || []).map((f: any) => (
                        <span key={f.featureId} className={clsx("px-2 py-0.5 rounded-lg text-[11px] font-mono",
                          f.source === "override" ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : f.source === "grant"   ? "bg-purple-50 text-purple-700"
                          : f.source === "addon"   ? "bg-sky-50 text-sky-700"
                          : "bg-brand-50 text-brand-700")}>
                          {f.featureId}
                          <span className="mr-1 opacity-60 text-[9px]">({f.source})</span>
                        </span>
                      ))}
                      {(entitlements.enabledFeatures || []).length === 0 && <span className="text-xs text-gray-400">لا توجد ميزات مفعّلة</span>}
                    </div>
                  </div>

                  {/* Effective quotas */}
                  {(entitlements.effectiveQuotas || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">الحصص الفعلية</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(entitlements.effectiveQuotas || []).map((q: any) => (
                          <div key={q.quotaId} className={clsx("rounded-xl p-3 border",
                            q.source === "override" ? "bg-amber-50 border-amber-200"
                            : q.source === "addon"  ? "bg-sky-50 border-sky-200"
                            : "bg-gray-50 border-gray-100")}>
                            <p className="text-[10px] text-gray-400 font-mono mb-0.5">{q.quotaId}</p>
                            <p className="text-lg font-bold text-gray-800 tabular-nums">{q.unlimited ? "∞" : q.value}</p>
                            <p className="text-[9px] text-gray-400">{q.source}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active addons */}
                  {(entitlements.activeAddOns || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">الإضافات النشطة</p>
                      <div className="flex flex-wrap gap-2">
                        {(entitlements.activeAddOns || []).map((a: any) => (
                          <span key={a.key} className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium">
                            {a.nameAr} ×{a.quantity} {a.isFree && "(مجاني)"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feature overrides */}
          {overrideTab === "features" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs text-gray-400 mb-4">تجاوز ميزات الباقة لهذه المنشأة فقط — الأصفر = تجاوز يدوي نشط</p>
              {features.length === 0 ? <Empty icon={Layers} text="لا توجد ميزات في الكتالوج" /> : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {features.map((f: any) => {
                    const enabledEntry = entitlements?.enabledFeatures?.find((ef: any) => ef.featureId === f.id);
                    const effective = !!enabledEntry;
                    const isOverride = enabledEntry?.source === "override";
                    const isDisabledOverride = entitlements?.disabledFeatures?.includes(f.id);
                    const hasManualOverride = isOverride || isDisabledOverride;
                    return (
                      <div key={f.id} className={clsx("flex items-center justify-between p-3 rounded-xl border transition-all",
                        hasManualOverride ? "border-amber-200 bg-amber-50" : "border-gray-100")}>
                        <div className="min-w-0 mr-2">
                          <p className="text-xs font-medium text-gray-800 truncate">{f.nameAr}</p>
                          <p className="text-[9px] font-mono text-gray-400">{f.id}</p>
                          {hasManualOverride && <p className="text-[10px] text-amber-600 font-medium">تجاوز يدوي</p>}
                        </div>
                        <button onClick={async () => {
                          await toggleFeature({ fId: f.id, enabled: !effective });
                          refetchEnt();
                        }} className={clsx("shrink-0 w-9 h-5 rounded-full transition-colors relative",
                          effective ? "bg-brand-500" : "bg-gray-200")}>
                          <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                            effective ? "right-0.5" : "left-0.5")} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quota overrides */}
          {overrideTab === "quotas" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setQuotaOverrideOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
                  <Plus className="w-4 h-4" /> تجاوز حصة
                </button>
              </div>
              {/* Current quota overrides from entitlements */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                {!(entitlements?.effectiveQuotas || []).length
                  ? <Empty icon={BarChart2} text="لا توجد تجاوزات حصص نشطة" />
                  : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(entitlements?.effectiveQuotas || []).map((q: any) => {
                      const catalogQ = quotas.find((cq: any) => cq.id === q.quotaId);
                      return (
                        <div key={q.quotaId} className={clsx("rounded-xl p-3 border",
                          q.source === "override" ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100")}>
                          <p className="text-xs text-gray-500 font-medium mb-0.5">{catalogQ?.nameAr || q.quotaId}</p>
                          <p className="text-2xl font-bold text-gray-800 tabular-nums">{q.unlimited ? "∞" : q.value}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{catalogQ?.unitAr || ""} · {q.source}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <Modal open={quotaOverrideOpen} onClose={() => setQuotaOverrideOpen(false)} title="تجاوز حصة للمنشأة">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">الحصة *</label>
                    <select value={quotaOverrideForm.quotaId} onChange={e => setQuotaOverrideForm(p => ({ ...p, quotaId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                      <option value="">— اختر حصة —</option>
                      {quotas.map((q: any) => {
                        const current = entitlements?.effectiveQuotas?.find((eq: any) => eq.quotaId === q.id);
                        return (
                          <option key={q.id} value={q.id}>
                            {q.nameAr} — الحالي: {current ? (current.unlimited ? "∞" : current.value) : (q.defaultValue ?? 0)} {q.unitAr || ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">القيمة الجديدة * (-1 = لانهاية)</label>
                      <input type="number" min="-1" value={quotaOverrideForm.value} onChange={e => setQuotaOverrideForm(p => ({ ...p, value: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" dir="ltr" />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={quotaOverrideForm.isPermanent} onChange={e => setQuotaOverrideForm(p => ({ ...p, isPermanent: e.target.checked }))} className="accent-brand-500" />
                        <span className="text-sm text-gray-700">دائم</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">السبب *</label>
                    <input value={quotaOverrideForm.reason} onChange={e => setQuotaOverrideForm(p => ({ ...p, reason: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="سبب تعديل الحصة" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setQuotaOverrideOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
                    <button disabled={!quotaOverrideForm.quotaId || quotaOverrideForm.value === "" || !quotaOverrideForm.reason || settingQuotaOvr}
                      onClick={async () => {
                        await setQuotaOvr({ quotaId: quotaOverrideForm.quotaId, value: Number(quotaOverrideForm.value), reason: quotaOverrideForm.reason, isPermanent: quotaOverrideForm.isPermanent });
                        setQuotaOverrideOpen(false); setQuotaOverrideForm({ quotaId: "", value: "", reason: "", isPermanent: true }); refetchEnt();
                      }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                      {settingQuotaOvr ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "حفظ التجاوز"}
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          )}

          {/* Grants */}
          {overrideTab === "grants" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setGrantOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
                  <Plus className="w-4 h-4" /> منحة جديدة
                </button>
              </div>
              {grants.length === 0 ? <Empty icon={Gift} text="لا توجد منح مجانية" /> : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
                      <th className="text-right px-4 py-3">الاسم</th>
                      <th className="text-right px-4 py-3">النوع</th>
                      <th className="text-right px-4 py-3">السبب</th>
                      <th className="text-right px-4 py-3">الانتهاء</th>
                      <th className="px-4 py-3"></th>
                    </tr></thead>
                    <tbody>
                      {grants.map((g: any) => (
                        <tr key={g.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900 text-xs">{g.nameAr}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-medium">{g.type}</span></td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{g.reason || "—"}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{g.isPermanent ? "دائم" : g.endsAt ? new Date(g.endsAt).toLocaleDateString("ar") : "—"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteGrant(g.id).then(() => refetchGrants())} className="text-xs text-red-400 hover:text-red-600">حذف</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Modal open={grantOpen} onClose={() => setGrantOpen(false)} title="منحة مجانية جديدة">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">نوع المنحة</label>
                      <select value={grantForm.type} onChange={e => setGrantForm(p => ({ ...p, type: e.target.value, targetId: "" }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                        <option value="feature">ميزة</option>
                        <option value="quota">حصة</option>
                        <option value="addon">إضافة</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        {grantForm.type === "feature" ? "الميزة" : grantForm.type === "quota" ? "الحصة" : "الإضافة"} *
                      </label>
                      <select value={grantForm.targetId} onChange={e => {
                        const val = e.target.value;
                        const label = grantForm.type === "feature"
                          ? features.find(f => f.id === val)?.nameAr
                          : grantForm.type === "quota"
                          ? quotas.find(q => q.id === val)?.nameAr
                          : addons.find(a => a.id === val)?.nameAr;
                        setGrantForm(p => ({ ...p, targetId: val, nameAr: label || p.nameAr }));
                      }} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                        <option value="">— اختر —</option>
                        {grantForm.type === "feature" && features.map((f: any) => (
                          <option key={f.id} value={f.id}>{f.nameAr} ({f.id})</option>
                        ))}
                        {grantForm.type === "quota" && quotas.map((q: any) => (
                          <option key={q.id} value={q.id}>{q.nameAr} ({q.id})</option>
                        ))}
                        {grantForm.type === "addon" && addons.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.nameAr} ({a.key})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">وصف المنحة *</label>
                    <input value={grantForm.nameAr} onChange={e => setGrantForm(p => ({ ...p, nameAr: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="مثال: تقارير مجانية لمؤسس" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">السبب *</label>
                    <input value={grantForm.reason} onChange={e => setGrantForm(p => ({ ...p, reason: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="سبب المنحة" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={grantForm.isPermanent} onChange={e => setGrantForm(p => ({ ...p, isPermanent: e.target.checked }))} className="accent-brand-500" />
                      <span className="text-sm text-gray-700">دائم</span>
                    </label>
                    {!grantForm.isPermanent && (
                      <input type="date" value={grantForm.endsAt} onChange={e => setGrantForm(p => ({ ...p, endsAt: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" dir="ltr" />
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setGrantOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
                    <button disabled={addingGrant || !grantForm.nameAr || !grantForm.reason || !grantForm.targetId} onClick={async () => {
                      await addGrant({ ...grantForm, endsAt: grantForm.isPermanent ? null : grantForm.endsAt || null });
                      setGrantOpen(false); setGrantForm({ type: "feature", targetId: "", nameAr: "", reason: "", isPermanent: true, endsAt: "" }); refetchGrants(); refetchEnt();
                    }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                      {addingGrant ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إضافة المنحة"}
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          )}

          {/* Org addons */}
          {overrideTab === "addons" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setAddonGrantOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
                  <Plus className="w-4 h-4" /> منح إضافة
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                {orgAddons.length === 0 ? <Empty icon={Package} text="لا توجد إضافات مفعّلة لهذه المنشأة" /> : (
                  <div className="space-y-2">
                    {orgAddons.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.addOn?.nameAr || a.addOnId}</p>
                          <p className="text-xs text-gray-400 font-mono">{a.addOn?.key} · x{a.quantity} · {a.isFree ? "مجاني" : `${Number(a.addOn?.priceMonthly || 0).toLocaleString()} ر.س/شهر`}</p>
                        </div>
                        <button onClick={() => commercialApi.revokeOrgAddon(selectedOrg!.id, a.id).then(() => { refetchOrgAddons(); refetchEnt(); })}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors">إلغاء</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Modal open={addonGrantOpen} onClose={() => setAddonGrantOpen(false)} title="منح إضافة للمنشأة">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">الإضافة *</label>
                    <select value={addonGrantForm.addOnId} onChange={e => setAddonGrantForm(p => ({ ...p, addOnId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                      <option value="">— اختر إضافة من الكتالوج —</option>
                      {addons.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.nameAr} — {a.key} ({a.isFree ? "مجاني" : `${Number(a.priceMonthly || 0).toLocaleString()} ر.س/شهر`})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">الكمية</label>
                      <input type="number" min="1" value={addonGrantForm.quantity} onChange={e => setAddonGrantForm(p => ({ ...p, quantity: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" dir="ltr" />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={addonGrantForm.isFree} onChange={e => setAddonGrantForm(p => ({ ...p, isFree: e.target.checked }))} className="accent-brand-500" />
                        <span className="text-sm text-gray-700">مجاناً (بدون فوترة)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">ملاحظات</label>
                    <input value={addonGrantForm.notes} onChange={e => setAddonGrantForm(p => ({ ...p, notes: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="سبب المنح أو ملاحظات" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setAddonGrantOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
                    <button disabled={!addonGrantForm.addOnId || grantingAddon} onClick={async () => {
                      await grantAddon({ addOnId: addonGrantForm.addOnId, quantity: Number(addonGrantForm.quantity) || 1, isFree: addonGrantForm.isFree, notes: addonGrantForm.notes || null, isPermanent: true });
                      setAddonGrantOpen(false); setAddonGrantForm({ addOnId: "", quantity: "1", isFree: true, notes: "" }); refetchOrgAddons(); refetchEnt();
                    }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                      {grantingAddon ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "منح الإضافة"}
                    </button>
                  </div>
                </div>
              </Modal>
            </div>
          )}

          {/* Billing override */}
          {overrideTab === "billing" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              {billing && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  تجاوز فوترة نشط · {billing.billingMode} · {billing.customPriceMonthly ? `${billing.customPriceMonthly} ر.س/شهر` : ""}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">نمط الفوترة</label>
                  <select value={billingForm.billingMode} onChange={e => setBillingForm(p => ({ ...p, billingMode: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                    <option value="standard">قياسي</option><option value="custom">مخصص</option>
                    <option value="enterprise">مؤسسي</option><option value="manual">يدوي</option>
                    <option value="free">مجاني</option><option value="paused">موقوف</option>
                  </select>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">سعر مخصص (ر.س/شهر)</label>
                  <input type="number" value={billingForm.customPriceMonthly} onChange={e => setBillingForm(p => ({ ...p, customPriceMonthly: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" dir="ltr" />
                </div>
              </div>
              <div><label className="text-xs text-gray-500 block mb-1">السبب (إلزامي) *</label>
                <input value={billingForm.reason} onChange={e => setBillingForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" placeholder="سبب تعديل الفوترة" />
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={billingForm.isBillingPaused} onChange={e => setBillingForm(p => ({ ...p, isBillingPaused: e.target.checked }))} className="accent-brand-500" />
                  <span className="text-sm text-gray-700">إيقاف الفوترة مؤقتاً</span>
                </label>
              </div>
              <button disabled={savingBilling || !billingForm.reason} onClick={async () => {
                await saveBilling({ billingMode: billingForm.billingMode, customPriceMonthly: billingForm.customPriceMonthly || null, isBillingPaused: billingForm.isBillingPaused, reason: billingForm.reason });
                refetchBilling();
              }} className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {savingBilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ إعدادات الفوترة
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMMERCIAL TAB
// ════════════════════════════════════════════════════════════
function CommercialTab() {
  const [subTab, setSubTab] = useState("packages");

  // Modal visibility
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showQuotaModal,   setShowQuotaModal]   = useState(false);
  const [showAddonModal,   setShowAddonModal]   = useState(false);
  const [showDiscModal,    setShowDiscModal]     = useState(false);
  const [showPromoModal,   setShowPromoModal]    = useState(false);
  const [showRuleModal,    setShowRuleModal]     = useState(false);

  // Form states — fields match modal field names
  const [featureForm, setFeatureForm] = useState({ id: "", nameAr: "", nameEn: "", groupId: "", isCore: false, isPremium: false, isEnterprise: false });
  const [quotaForm,   setQuotaForm]   = useState({ id: "", nameAr: "", unitAr: "", defaultValue: "0", overagePolicy: "block" });
  const [addonForm,   setAddonForm]   = useState({ key: "", nameAr: "", type: "feature", priceMonthly: "", billingCycle: "monthly" });
  const [discForm,    setDiscForm]    = useState({ name: "", type: "percentage", value: "", reason: "", endsAt: "" });
  const [promoForm,   setPromoForm]   = useState({ name: "", type: "percentage", value: "", couponCode: "", endsAt: "" });
  const [ruleForm,    setRuleForm]    = useState({ name: "", trigger: "", scope: "global", isActive: true });

  // Data fetches
  const { data: featRes,   loading: fLoading,  refetch: refetchFeat  } = useApi(() => commercialApi.features(), []);
  const { data: groupsRes                                              } = useApi(() => commercialApi.featureGroups(), []);
  const { data: quotasRes, loading: qLoading,  refetch: refetchQuota } = useApi(() => commercialApi.quotas(), []);
  const { data: addRes,    loading: aLoading,  refetch: refetchAddons } = useApi(() => commercialApi.addons(), []);
  const { data: discRes,   loading: dLoading,  refetch: refetchDisc  } = useApi(() => commercialApi.discounts(), []);
  const { data: promoRes,  loading: pLoading,  refetch: refetchPromo } = useApi(() => commercialApi.promotions(), []);
  const { data: rulesRes,  loading: rLoading,  refetch: refetchRules } = useApi(() => commercialApi.rules(), []);
  const { data: plansRes                                               } = useApi(() => adminApi.plans(), []);
  const { data: orgsRes                                                } = useApi(() => adminApi.orgs({ page: 1, limit: 200 }), []);

  // Mutations
  const { mutate: createFeature, loading: crFeat  } = useMutation((d: any) => commercialApi.createFeature(d));
  const { mutate: createQuota,   loading: crQuota } = useMutation((d: any) => commercialApi.createQuota(d));
  const { mutate: createAddon,   loading: crAddon } = useMutation((d: any) => commercialApi.createAddon(d));
  const { mutate: createDisc,    loading: crDisc  } = useMutation((d: any) => commercialApi.createDiscount(d));
  const { mutate: createPromo,   loading: crPromo } = useMutation((d: any) => commercialApi.createPromotion(d));
  const { mutate: createRule,    loading: crRule  } = useMutation((d: any) => commercialApi.createRule(d));
  const { mutate: deleteDisc                       } = useMutation((id: string) => commercialApi.deleteDiscount(id));

  const features: any[] = featRes?.data   || [];
  const groups:   any[] = groupsRes?.data || [];
  const quotas:   any[] = quotasRes?.data || [];
  const addons:   any[] = addRes?.data    || [];
  const discounts:any[] = discRes?.data   || [];
  const promos:   any[] = promoRes?.data  || [];
  const rules:    any[] = rulesRes?.data  || [];
  const plans:    any[] = plansRes?.data  || [];
  const orgs:     any[] = orgsRes?.data   || [];

  const BILLING_LABELS: Record<string, string> = { monthly: "شهري", yearly: "سنوي", once: "مرة واحدة" };
  const DISC_TYPE_LABELS: Record<string, string> = { percentage: "نسبة مئوية %", fixed: "مبلغ ثابت ر.س" };

  return (
    <div className="space-y-6">
      <SectionHeader title="المحرك التجاري" sub="إدارة الباقات والميزات والحصص والإضافات والخصومات والعروض والمستأجرين والقواعد" />

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: "الميزات",  value: features.length,  color: "text-brand-600",   bg: "bg-brand-50",   icon: Layers  },
          { label: "الحصص",    value: quotas.length,    color: "text-sky-700",     bg: "bg-sky-50",     icon: BarChart2 },
          { label: "الإضافات", value: addons.length,    color: "text-purple-700",  bg: "bg-purple-50",  icon: Package },
          { label: "الخصومات", value: discounts.length, color: "text-amber-700",   bg: "bg-amber-50",   icon: Tag     },
          { label: "العروض",   value: promos.length,    color: "text-emerald-700", bg: "bg-emerald-50", icon: Gift    },
          { label: "القواعد",  value: rules.length,     color: "text-rose-700",    bg: "bg-rose-50",    icon: Zap     },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3">
            <div className={clsx("w-7 h-7 rounded-xl flex items-center justify-center mb-1.5", s.bg)}>
              <s.icon className={clsx("w-3.5 h-3.5", s.color)} />
            </div>
            <p className={clsx("text-xl font-bold tabular-nums", s.color)}>{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <TabPill
        tabs={[
          { id: "packages",  label: "الباقات" },
          { id: "features",  label: "الميزات" },
          { id: "quotas",    label: "الحصص" },
          { id: "addons",    label: "الإضافات" },
          { id: "discounts", label: "الخصومات" },
          { id: "promos",    label: "العروض" },
          { id: "tenants",   label: "المستأجرون" },
          { id: "rules",     label: "القواعد" },
        ]}
        active={subTab} onChange={setSubTab}
      />

      {/* Packages — Plan × Features builder */}
      {subTab === "packages" && (
        <PackageBuilder plans={plans} features={features} groups={groups} />
      )}

      {/* Features catalog */}
      {subTab === "features" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowFeatureModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> ميزة جديدة
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {fLoading ? <Spinner /> : features.length === 0 ? <Empty icon={Layers} text="لا توجد ميزات مسجلة — أضف ميزتك الأولى" /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">المفتاح</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الاسم</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المجموعة</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الباقة</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f: any) => (
                    <tr key={f.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-mono text-xs text-gray-600">{f.id}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{f.nameAr || f.name}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{groups.find((g: any) => g.id === f.groupId)?.nameAr || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {f.isCore      && <span className="px-1.5 py-0.5 bg-blue-50   text-blue-700   rounded text-[9px] font-bold">أساسي</span>}
                          {f.isPremium   && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-bold">PRO</span>}
                          {f.isEnterprise && <span className="px-1.5 py-0.5 bg-amber-50  text-amber-700  rounded text-[9px] font-bold">ENT</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold", f.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                          {f.isActive !== false ? "مفعّلة" : "معطّلة"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Quotas catalog */}
      {subTab === "quotas" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowQuotaModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> حصة جديدة
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {qLoading ? <Spinner /> : quotas.length === 0 ? <Empty icon={BarChart2} text="لا توجد حصص مسجلة — أضف حصتك الأولى" /> : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">المفتاح</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الاسم</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الوحدة</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الافتراضي</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">سياسة التجاوز</th>
                  </tr>
                </thead>
                <tbody>
                  {quotas.map((q: any) => (
                    <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-mono text-xs text-gray-600">{q.id}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{q.nameAr || q.name}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{q.unitAr || "—"}</td>
                      <td className="py-3 px-4 font-bold text-gray-700 tabular-nums">{q.defaultValue ?? "—"}</td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          q.overagePolicy === "block" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
                          {q.overagePolicy === "block" ? "حظر" : "تحذير"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Addons manager */}
      {subTab === "addons" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddonModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> إضافة جديدة
            </button>
          </div>
          {aLoading ? <Spinner /> : addons.length === 0 ? <Empty icon={Package} text="لا توجد إضافات" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {addons.map((a: any) => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold text-gray-900">{a.nameAr}</p>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">{a.key}</span>
                  </div>
                  {a.descriptionAr && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{a.descriptionAr}</p>}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-base font-bold text-brand-600 tabular-nums">{Number(a.priceMonthly || 0).toLocaleString()} ر.س</span>
                    <span className="text-xs text-gray-400">{BILLING_LABELS[a.billingCycle] || a.billingCycle || "شهري"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discounts manager */}
      {subTab === "discounts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowDiscModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> خصم جديد
            </button>
          </div>
          {dLoading ? <Spinner /> : discounts.length === 0 ? <Empty icon={Tag} text="لا توجد خصومات" /> : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">الاسم</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">النوع</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">القيمة</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">النطاق</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الانتهاء</th>
                    <th className="py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((d: any) => (
                    <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-medium text-gray-900">{d.name}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{DISC_TYPE_LABELS[d.type] || d.type}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{d.value}{d.type === "percentage" ? "%" : " ر.س"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{d.targetScope || "global"}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{d.endsAt ? fmtDate(d.endsAt) : "بلا انتهاء"}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => deleteDisc(d.id).then(() => refetchDisc())} className="text-xs text-red-500 hover:underline">حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Promotions manager */}
      {subTab === "promos" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowPromoModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> عرض جديد
            </button>
          </div>
          {pLoading ? <Spinner /> : promos.length === 0 ? <Empty icon={Gift} text="لا توجد عروض ترويجية" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {promos.map((p: any) => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <p className="text-sm font-bold text-gray-900 mb-1">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-700">{p.value}{p.type === "percentage" ? "%" : " ر.س"} خصم</span>
                    {p.endsAt && <span className="text-xs text-gray-400">{fmtDate(p.endsAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tenant Override Center */}
      {subTab === "tenants" && (
        <TenantOverrideCenter orgs={orgs} features={features} quotas={quotas} addons={addons} />
      )}

      {/* Rules engine */}
      {subTab === "rules" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowRuleModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
              <Plus className="w-4 h-4" /> قاعدة جديدة
            </button>
          </div>
          {rLoading ? <Spinner /> : rules.length === 0 ? <Empty icon={Zap} text="لا توجد قواعد مسجلة" /> : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-right py-2.5 px-5 text-xs text-gray-400 font-semibold">الاسم</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">المحفّز</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">النطاق</th>
                    <th className="text-right py-2.5 px-4 text-xs text-gray-400 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-medium text-gray-900">{r.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500">{r.trigger}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{r.scope}</td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-semibold",
                          r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                          {r.isActive ? "نشطة" : "موقوفة"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────── */}

      {/* Create Feature modal */}
      <Modal open={showFeatureModal} onClose={() => setShowFeatureModal(false)} title="ميزة جديدة">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">المعرّف (ID) *</label>
              <input value={featureForm.id} onChange={e => setFeatureForm(p => ({ ...p, id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="feature_bookings" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">المجموعة</label>
              <select value={featureForm.groupId} onChange={e => setFeatureForm(p => ({ ...p, groupId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="">— بدون مجموعة —</option>
                {groups.map((g: any) => <option key={g.id} value={g.id}>{g.nameAr}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الاسم (عربي) *</label>
              <input value={featureForm.nameAr} onChange={e => setFeatureForm(p => ({ ...p, nameAr: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الاسم (إنجليزي)</label>
              <input value={featureForm.nameEn} onChange={e => setFeatureForm(p => ({ ...p, nameEn: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
          </div>
          <div className="flex items-center gap-6 pt-1">
            {[["isCore","أساسي"],["isPremium","PRO"],["isEnterprise","مؤسسي"]].map(([k, lbl]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(featureForm as any)[k]} onChange={e => setFeatureForm(p => ({ ...p, [k]: e.target.checked }))} className="accent-brand-500" />
                <span className="text-sm text-gray-700">{lbl}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowFeatureModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!featureForm.id.trim() || !featureForm.nameAr.trim() || crFeat}
              onClick={() => createFeature({ id: featureForm.id, nameAr: featureForm.nameAr, nameEn: featureForm.nameEn || null, groupId: featureForm.groupId || null, isCore: featureForm.isCore, isPremium: featureForm.isPremium, isEnterprise: featureForm.isEnterprise })
                .then(() => { setShowFeatureModal(false); setFeatureForm({ id: "", nameAr: "", nameEn: "", groupId: "", isCore: false, isPremium: false, isEnterprise: false }); refetchFeat(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crFeat && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إضافة الميزة
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Quota modal */}
      <Modal open={showQuotaModal} onClose={() => setShowQuotaModal(false)} title="حصة جديدة">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">المعرّف (ID) *</label>
              <input value={quotaForm.id} onChange={e => setQuotaForm(p => ({ ...p, id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="quota_users" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الاسم (عربي) *</label>
              <input value={quotaForm.nameAr} onChange={e => setQuotaForm(p => ({ ...p, nameAr: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الوحدة</label>
              <input value={quotaForm.unitAr} onChange={e => setQuotaForm(p => ({ ...p, unitAr: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="مثال: موظف" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">الافتراضي</label>
              <input type="number" value={quotaForm.defaultValue} onChange={e => setQuotaForm(p => ({ ...p, defaultValue: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">التجاوز</label>
              <select value={quotaForm.overagePolicy} onChange={e => setQuotaForm(p => ({ ...p, overagePolicy: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="block">حظر</option>
                <option value="warn">تحذير</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowQuotaModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!quotaForm.id.trim() || !quotaForm.nameAr.trim() || crQuota}
              onClick={() => createQuota({ id: quotaForm.id, nameAr: quotaForm.nameAr, unitAr: quotaForm.unitAr || null, defaultValue: Number(quotaForm.defaultValue) || 0, overagePolicy: quotaForm.overagePolicy })
                .then(() => { setShowQuotaModal(false); setQuotaForm({ id: "", nameAr: "", unitAr: "", defaultValue: "0", overagePolicy: "block" }); refetchQuota(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crQuota && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إضافة الحصة
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Addon modal */}
      <Modal open={showAddonModal} onClose={() => setShowAddonModal(false)} title="إضافة جديدة">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">المفتاح (key) *</label>
              <input value={addonForm.key} onChange={e => setAddonForm(p => ({ ...p, key: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="addon_extra_users" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">النوع *</label>
              <select value={addonForm.type} onChange={e => setAddonForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="feature">ميزة</option>
                <option value="quota">حصة</option>
                <option value="bundle">حزمة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">الاسم (عربي) *</label>
            <input value={addonForm.nameAr} onChange={e => setAddonForm(p => ({ ...p, nameAr: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="مثال: موظفون إضافيون" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">السعر الشهري (ر.س)</label>
              <input type="number" value={addonForm.priceMonthly} onChange={e => setAddonForm(p => ({ ...p, priceMonthly: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">دورة الفوترة</label>
              <select value={addonForm.billingCycle} onChange={e => setAddonForm(p => ({ ...p, billingCycle: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="monthly">شهري</option><option value="yearly">سنوي</option><option value="once">مرة واحدة</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddonModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!addonForm.key.trim() || !addonForm.nameAr.trim() || crAddon}
              onClick={() => createAddon({ key: addonForm.key, nameAr: addonForm.nameAr, type: addonForm.type, priceMonthly: addonForm.priceMonthly || null, billingCycle: addonForm.billingCycle })
                .then(() => { setShowAddonModal(false); setAddonForm({ key: "", nameAr: "", type: "feature", priceMonthly: "", billingCycle: "monthly" }); refetchAddons(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crAddon && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إضافة
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Discount modal */}
      <Modal open={showDiscModal} onClose={() => setShowDiscModal(false)} title="خصم جديد">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">اسم الخصم *</label>
              <input value={discForm.name} onChange={e => setDiscForm(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="خصم الصيف" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">النوع</label>
              <select value={discForm.type} onChange={e => setDiscForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="percentage">نسبة %</option><option value="fixed">ثابت ر.س</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">القيمة *</label>
              <input type="number" value={discForm.value} onChange={e => setDiscForm(p => ({ ...p, value: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">تاريخ الانتهاء</label>
              <input type="date" value={discForm.endsAt} onChange={e => setDiscForm(p => ({ ...p, endsAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">السبب *</label>
            <input value={discForm.reason} onChange={e => setDiscForm(p => ({ ...p, reason: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" placeholder="سبب إنشاء الخصم" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowDiscModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!discForm.name.trim() || !discForm.value || !discForm.reason.trim() || crDisc}
              onClick={() => createDisc({ name: discForm.name, type: discForm.type, value: Number(discForm.value), reason: discForm.reason, endsAt: discForm.endsAt || null, targetScope: "global" })
                .then(() => { setShowDiscModal(false); setDiscForm({ name: "", type: "percentage", value: "", reason: "", endsAt: "" }); refetchDisc(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crDisc && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إنشاء الخصم
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Promotion modal */}
      <Modal open={showPromoModal} onClose={() => setShowPromoModal(false)} title="عرض ترويجي جديد">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">اسم العرض *</label>
            <input value={promoForm.name} onChange={e => setPromoForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">النوع *</label>
              <select value={promoForm.type} onChange={e => setPromoForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="percentage">نسبة %</option>
                <option value="fixed">ثابت ر.س</option>
                <option value="free_period">فترة مجانية</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">القيمة</label>
              <input type="number" value={promoForm.value} onChange={e => setPromoForm(p => ({ ...p, value: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">ينتهي في</label>
              <input type="date" value={promoForm.endsAt} onChange={e => setPromoForm(p => ({ ...p, endsAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">كود الكوبون</label>
            <input value={promoForm.couponCode} onChange={e => setPromoForm(p => ({ ...p, couponCode: e.target.value.toUpperCase() }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="PROMO2026 (اختياري)" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowPromoModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!promoForm.name.trim() || crPromo}
              onClick={() => createPromo({ name: promoForm.name, type: promoForm.type, value: promoForm.value ? Number(promoForm.value) : undefined, couponCode: promoForm.couponCode || null, endsAt: promoForm.endsAt || null })
                .then(() => { setShowPromoModal(false); setPromoForm({ name: "", type: "percentage", value: "", couponCode: "", endsAt: "" }); refetchPromo(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crPromo && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إنشاء العرض
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Rule modal */}
      <Modal open={showRuleModal} onClose={() => setShowRuleModal(false)} title="قاعدة جديدة">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">اسم القاعدة *</label>
            <input value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">المحفّز (trigger) *</label>
            <input value={ruleForm.trigger} onChange={e => setRuleForm(p => ({ ...p, trigger: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-200" dir="ltr" placeholder="e.g. on_subscription_renewed" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">النطاق</label>
              <select value={ruleForm.scope} onChange={e => setRuleForm(p => ({ ...p, scope: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200">
                <option value="global">عام</option>
                <option value="plan">باقة</option>
                <option value="org">منشأة</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ruleForm.isActive} onChange={e => setRuleForm(p => ({ ...p, isActive: e.target.checked }))} className="accent-brand-500" />
                <span className="text-sm text-gray-700">نشطة فوراً</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowRuleModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">إلغاء</button>
            <button disabled={!ruleForm.name.trim() || !ruleForm.trigger.trim() || crRule}
              onClick={() => createRule({ name: ruleForm.name, trigger: ruleForm.trigger, scope: ruleForm.scope, isActive: ruleForm.isActive })
                .then(() => { setShowRuleModal(false); setRuleForm({ name: "", trigger: "", scope: "global", isActive: true }); refetchRules(); })}
              className="px-4 py-2 text-sm bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-2">
              {crRule && <Loader2 className="w-3.5 h-3.5 animate-spin" />} إنشاء القاعدة
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN — AdminPage with internal sidebar layout
// ════════════════════════════════════════════════════════════

function useCurrentAdmin() {
  try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
}

export function AdminPage() {
  const [section, setSection] = useState("overview");
  const user = useCurrentAdmin();
  const navigate = useNavigate();

  // تحديد الدور الفعلي
  const adminRole: string = user?.isSuperAdmin ? "super_admin" : (user?.nasaqRole || "");

  const handleLogout = () => {
    localStorage.removeItem("nasaq_token");
    localStorage.removeItem("nasaq_user");
    localStorage.removeItem("nasaq_user_id");
    localStorage.removeItem("nasaq_org_id");
    navigate("/admin-login", { replace: true });
  };

  // منع الوصول لغير فريق نسق
  if (!user?.isSuperAdmin && !ALLOWED_NASAQ_ROLES.includes(user?.nasaqRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <ShieldAlert className="w-14 h-14 text-gray-200" />
        <p className="text-gray-400 text-sm font-medium">هذه الصفحة مخصصة لفريق نسق فقط</p>
      </div>
    );
  }

  // فلترة الأقسام حسب الدور
  const visibleSections = SECTIONS.filter(
    (s) => s.roles.length === 0 || s.roles.includes(adminRole)
  );

  const sectionEl: Record<string, React.ReactElement> = {
    overview:   <OverviewTab onNav={setSection} />,
    orgs:       <OrgsTab />,
    team:       <TeamTab />,
    clients:    <ClientsTab />,
    plans:      <PlansTab />,
    orders:     <SubscriptionOrdersTab />,
    commercial: <CommercialTab />,
    reminders:  <RemindersAdminTab />,
    support:    <SupportTab />,
    docs:       <DocumentsTab />,
    announce:   <AnnouncementsTab />,
    audit:      <AuditTab />,
    system:     <SystemTab />,
  };

  const roleLabel: Record<string, string> = {
    super_admin: "سوبر أدمن",
    account_manager: "مدير حساب",
    support_agent: "دعم فني",
    content_manager: "مدير محتوى",
    viewer: "مشاهد",
  };

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-950 flex flex-col shrink-0 overflow-y-auto">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow shadow-brand-500/30">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">نسق Admin</p>
              <p className="text-[10px] text-gray-500">لوحة التحكم</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {visibleSections.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={clsx(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-right",
                section === s.id
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}>
              <s.icon className={clsx("w-4 h-4 shrink-0", section === s.id ? "text-brand-400" : "text-gray-500")} />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Admin user footer */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs shrink-0">
              {user?.name?.[0] || "م"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.name || "المسؤول"}</p>
              <p className="text-[10px] text-gray-500">{roleLabel[adminRole] || adminRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="flex-1 overflow-y-auto p-6">
          {sectionEl[section] || sectionEl["overview"]}
        </div>
      </div>
    </div>
  );
}
