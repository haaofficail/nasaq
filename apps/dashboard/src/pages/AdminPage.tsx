import React, { Suspense, useState, lazy, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users2, Briefcase, CreditCard, Package,
  Bell, Headphones, FileText, Megaphone, ClipboardList, Server, ShieldAlert, ShieldCheck, LogOut,
  Wrench, Images, ToggleLeft, BarChart3, Bot, Settings2,
} from "lucide-react";
import { clsx } from "clsx";

// ════════════════════════════════════════════════════════════
// Lazy-loaded tab components
// ════════════════════════════════════════════════════════════

const OverviewTab          = lazy(() => import("./admin/OverviewTab"));
const OrgsTab              = lazy(() => import("./admin/OrgsTab"));
const TeamTab              = lazy(() => import("./admin/TeamTab"));
const ClientsTab           = lazy(() => import("./admin/ClientsTab"));
const PlansTab             = lazy(() => import("./admin/PlansTab"));
const SubscriptionOrdersTab = lazy(() => import("./admin/SubscriptionOrdersTab"));
const CommercialTab        = lazy(() => import("./admin/CommercialTab"));
const RemindersAdminTab    = lazy(() => import("./admin/RemindersAdminTab"));
const SupportTab           = lazy(() => import("./admin/SupportTab"));
const DocumentsTab         = lazy(() => import("./admin/DocumentsTab"));
const AnnouncementsTab     = lazy(() => import("./admin/AnnouncementsTab"));
const AuditTab             = lazy(() => import("./admin/AuditTab"));
const SystemTab            = lazy(() => import("./admin/SystemTab"));
const WorkOrdersAdminTab   = lazy(() => import("./admin/WorkOrdersAdminTab"));
const AccessLogsAdminTab   = lazy(() => import("./admin/AccessLogsAdminTab"));
const GalleriesAdminTab    = lazy(() => import("./admin/GalleriesAdminTab"));
const KillSwitchesTab        = lazy(() => import("./admin/KillSwitchesTab"));
const QuotaUsageTab          = lazy(() => import("./admin/QuotaUsageTab"));
const GuardianTab            = lazy(() => import("./admin/GuardianTab"));
const PlatformSettingsTab    = lazy(() => import("./admin/PlatformSettingsTab"));

// ════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════

const SECTIONS = [
  { id: "overview",   icon: LayoutDashboard, label: "نظرة عامة",        roles: [] },
  { id: "orgs",       icon: Building2,       label: "المنشآت",          roles: [] },
  { id: "team",       icon: Users2,          label: "فريق ترميز OS",         roles: ["super_admin"] },
  { id: "clients",    icon: Briefcase,       label: "إدارة الحسابات",   roles: ["super_admin", "account_manager"] },
  { id: "plans",      icon: CreditCard,      label: "الباقات والأسعار", roles: ["super_admin"] },
  { id: "orders",     icon: CreditCard,      label: "طلبات الشراء",     roles: ["super_admin"] },
  { id: "commercial", icon: Package,         label: "المحرك التجاري",   roles: ["super_admin"] },
  { id: "reminders",  icon: Bell,            label: "التذكيرات",        roles: ["super_admin", "account_manager"] },
  { id: "support",    icon: Headphones,      label: "الدعم الفني",      roles: ["super_admin", "account_manager", "support_agent"] },
  { id: "docs",       icon: FileText,        label: "الوثائق",          roles: ["super_admin", "account_manager", "support_agent"] },
  { id: "announce",   icon: Megaphone,       label: "الإعلانات",        roles: ["super_admin", "content_manager"] },
  { id: "audit",        icon: ClipboardList, label: "سجل المراجعة",        roles: ["super_admin"] },
  { id: "work-orders",  icon: Wrench,        label: "أوامر العمل",          roles: ["super_admin"] },
  { id: "access-logs",  icon: ShieldCheck,   label: "التحكم في الدخول",    roles: ["super_admin"] },
  { id: "galleries",      icon: Images,       label: "معارض الصور",        roles: ["super_admin"] },
  { id: "kill-switches",  icon: ToggleLeft,  label: "مفاتيح الإيقاف",     roles: ["super_admin"] },
  { id: "quota-usage",    icon: BarChart3,   label: "استخدام الحصص",      roles: ["super_admin"] },
  { id: "guardian",          icon: Bot,        label: "الحارس الذكي",       roles: ["super_admin"] },
  { id: "platform-settings", icon: Settings2, label: "إعدادات المنصة",     roles: ["super_admin"] },
  { id: "system",            icon: Server,    label: "النظام",              roles: ["super_admin"] },
];

const ALLOWED_NASAQ_ROLES = ["account_manager", "support_agent", "content_manager", "viewer"];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "سوبر أدمن",
  account_manager: "مدير حساب",
  support_agent: "دعم فني",
  content_manager: "مدير محتوى",
  viewer: "مشاهد",
};

// ════════════════════════════════════════════════════════════
// Tab fallback spinner
// ════════════════════════════════════════════════════════════

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// AdminPage
// ════════════════════════════════════════════════════════════

function useCurrentAdmin() {
  try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
}

// CSS vars injected by applyOrgTheme — must be cleared so admin always shows platform colors
const BRAND_VARS = [
  "--brand-primary", "--brand-primary-hover", "--brand-primary-dark",
  "--brand-primary-soft", "--brand-primary-light", "--brand-primary-200",
  "--brand-primary-300", "--brand-primary-400", "--brand-primary-700",
  "--brand-primary-focus", "--brand-secondary", "--brand-secondary-hover",
  "--brand-secondary-soft", "--nasaq-primary", "--sys-brand",
  "--sys-brand-dark", "--sys-brand-light", "--sys-brand-focus",
  "--accent-business", "--accent-business-soft", "--nasaq-font-family",
];

export function AdminPage() {
  const [section, setSection] = useState("overview");
  const user = useCurrentAdmin();
  const navigate = useNavigate();

  // مسح ثيم أي منشأة قد يكون مُطبَّقاً — الأدمن يرى ألوان المنصة دائماً
  useLayoutEffect(() => {
    const r = document.documentElement;
    BRAND_VARS.forEach(v => r.style.removeProperty(v));
    try { localStorage.removeItem("nasaq_theme_cache"); } catch { /* */ }
  }, []);

  const adminRole: string = user?.isSuperAdmin ? "super_admin" : (user?.nasaqRole || "");

  const handleLogout = () => {
    localStorage.removeItem("nasaq_token");
    localStorage.removeItem("nasaq_user");
    localStorage.removeItem("nasaq_user_id");
    localStorage.removeItem("nasaq_org_id");
    navigate("/admin-login", { replace: true });
  };

  if (!user?.isSuperAdmin && !ALLOWED_NASAQ_ROLES.includes(user?.nasaqRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <ShieldAlert className="w-14 h-14 text-gray-200" />
        <p className="text-gray-400 text-sm font-medium">هذه الصفحة مخصصة لفريق ترميز OS فقط</p>
      </div>
    );
  }

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
    audit:        <AuditTab />,
    "work-orders": <WorkOrdersAdminTab />,
    "access-logs":   <AccessLogsAdminTab />,
    galleries:       <GalleriesAdminTab />,
    "kill-switches": <KillSwitchesTab />,
    "quota-usage":   <QuotaUsageTab />,
    guardian:            <GuardianTab />,
    "platform-settings": <PlatformSettingsTab />,
    system:              <SystemTab />,
  };

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-950 flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center shadow shadow-brand-500/30">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Tarmiz Admin</p>
              <p className="text-[10px] text-gray-500">لوحة التحكم</p>
            </div>
          </div>
        </div>

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

        <div className="p-3 border-t border-white/5 space-y-1">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs shrink-0">
              {user?.name?.[0] || "م"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.name || "المسؤول"}</p>
              <p className="text-[10px] text-gray-500">{ROLE_LABELS[adminRole] || adminRole}</p>
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
          <Suspense fallback={<TabFallback />}>
            {sectionEl[section] || sectionEl["overview"]}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
