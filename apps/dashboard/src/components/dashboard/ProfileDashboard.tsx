import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Plus, Settings2, CreditCard, Hash, Clock, Users, TrendingUp, CalendarCheck, Copy, Check, ExternalLink, BookOpen, Receipt, UserPlus } from "lucide-react";
import type { DashboardProfile, Role, WidgetConfig, QuickActionModal } from "@/lib/dashboardProfiles";
import { useDashboardPrefs } from "@/hooks/useDashboardPrefs";
import { passesContextGate } from "@/lib/widgetRegistry";
import type { OrgContext } from "@/hooks/useOrgContext";
import { useApi } from "@/hooks/useApi";
import { orgSubscriptionApi, orgStatsApi, settingsApi } from "@/lib/api";
import { PLAN_MAP } from "@/lib/constants";
import { KPICard } from "./KPICard";
import { QuickActionsGrid } from "./QuickActionsGrid";
import { CustomizePanel } from "./CustomizePanel";
import { CreateBookingForm } from "@/components/bookings/CreateBookingForm";
import { CreateCustomerForm } from "@/components/customers/CreateCustomerForm";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";

const sizeClass: Record<WidgetConfig["size"], string> = {
  full:       "col-span-1 lg:col-span-6",
  "two-thirds": "col-span-1 lg:col-span-4",
  half:       "col-span-1 lg:col-span-3",
  third:      "col-span-1 lg:col-span-2",
};

interface ProfileDashboardProps {
  profile: DashboardProfile;
  user: { name?: string; role?: string; orgId?: string };
  context?: OrgContext;
}

export function ProfileDashboard({ profile, user, context }: ProfileDashboardProps) {
  const navigate = useNavigate();
  const currentRole = (user.role || "") as Role;
  const orgId = user.orgId || "default";
  const [showCustomize, setShowCustomize] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  const { data: subRes } = useApi(() => orgSubscriptionApi.get(), []);
  const sub = subRes?.data;

  const { data: statsRes } = useApi(() => orgStatsApi.summary(), []);
  const stats = statsRes?.data;

  const { data: profileRes } = useApi(() => settingsApi.profile(), []);
  const orgSlug: string | null = (profileRes?.data as any)?.slug ?? null;

  const { prefs, toggleWidget, toggleKpi, reorderWidgets, pinAction, resetPrefs } = useDashboardPrefs(orgId);

  const bookingLink = orgSlug ? `${window.location.origin}/book/${orgSlug}` : null;

  const handleCopyLink = () => {
    if (!bookingLink) return;
    navigator.clipboard.writeText(bookingLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Role-filtered KPIs
  const visibleKpis = profile.kpis.filter(
    (k) => k.allowedRoles.length === 0 || k.allowedRoles.includes(currentRole)
  ).filter((k) => !prefs.hiddenKpis.includes(k.id));

  // Role-filtered widgets, then context-gated, then apply prefs order + hide
  const roleFilteredWidgets = profile.widgets
    .filter((w) => w.allowedRoles.length === 0 || w.allowedRoles.includes(currentRole))
    .filter((w) =>
      !context ||
      passesContextGate(w.id, {
        businessType: context.businessType,
        operatingProfile: context.operatingProfile,
        capabilities: context.capabilities,
      })
    );

  const orderedWidgets = (() => {
    if (prefs.widgetOrder.length === 0) return roleFilteredWidgets;
    const byId = Object.fromEntries(roleFilteredWidgets.map((w) => [w.id, w]));
    const ordered = prefs.widgetOrder.map((id) => byId[id]).filter(Boolean) as WidgetConfig[];
    const unordered = roleFilteredWidgets.filter((w) => !prefs.widgetOrder.includes(w.id));
    return [...ordered, ...unordered];
  })();

  const renderedWidgets = orderedWidgets.filter((w) => !prefs.hiddenWidgets.includes(w.id));

  const daysLeft = sub?.daysRemaining ?? null;
  const planName = PLAN_MAP[sub?.plan ?? ""]?.name ?? sub?.plan ?? null;
  const orgCode  = context?.orgCode ?? null;

  return (
    <div className="space-y-5">

      {/* ── Subscription info strip ── */}
      {(planName || orgCode || daysLeft !== null) && (
        <Link
          to="/dashboard/subscription"
          className="flex items-center gap-4 px-4 py-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-200 hover:bg-brand-50/40 transition-colors group"
        >
          {/* Plan */}
          {planName && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 group-hover:text-brand-700">
              <CreditCard className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              {planName}
            </span>
          )}

          {/* Divider */}
          {planName && (orgCode || daysLeft !== null) && (
            <span className="h-3.5 w-px bg-gray-200 shrink-0" />
          )}

          {/* Org code */}
          {orgCode && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 group-hover:text-brand-600 font-mono tracking-wider" dir="ltr">
              <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {orgCode}
            </span>
          )}

          {/* Divider */}
          {orgCode && daysLeft !== null && (
            <span className="h-3.5 w-px bg-gray-200 shrink-0" />
          )}

          {/* Days remaining */}
          {daysLeft !== null && (
            <span className={clsx(
              "flex items-center gap-1.5 text-xs font-medium",
              daysLeft <= 7  ? "text-red-500"    :
              daysLeft <= 30 ? "text-amber-600"  : "text-emerald-600"
            )}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {daysLeft} يوم متبقي
            </span>
          )}

          <span className="mr-auto text-xs text-gray-300 group-hover:text-brand-400 transition-colors">←</span>
        </Link>
      )}

      {/* Welcome row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            مرحباً{user.name ? ` ${user.name}` : ""} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomize((v) => !v)}
            className={clsx(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              showCustomize
                ? "bg-brand-50 text-brand-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Settings2 className="w-4 h-4" />
            تخصيص
          </button>
          <button
            onClick={() => navigate(profile.primaryAction.href)}
            className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            {profile.primaryAction.label}
          </button>
        </div>
      </div>

      {/* Customize panel */}
      {showCustomize && (
        <CustomizePanel
          profile={profile}
          currentRole={currentRole}
          prefs={prefs}
          toggleKpi={toggleKpi}
          toggleWidget={toggleWidget}
          resetPrefs={resetPrefs}
          onClose={() => setShowCustomize(false)}
        />
      )}

      {/* ── Monthly stats bar ── */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "عملاء الشهر",   value: stats.newCustomersThisMonth, icon: Users,         color: "text-violet-600", bg: "bg-violet-50" },
            { label: "مبيعات الشهر",  value: `${Number(stats.salesThisMonth).toLocaleString("en-US")} ر.س`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "حجوزات الشهر",  value: stats.bookingsThisMonth,    icon: CalendarCheck, color: "text-brand-600",   bg: "bg-brand-50" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
              <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={clsx("w-4 h-4", s.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 truncate">{s.label}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Booking link ── */}
      {bookingLink && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5 flex items-center gap-3">
          <a href={bookingLink} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1.5 rounded-lg hover:bg-brand-50 transition-colors" title="فتح الرابط">
            <ExternalLink className="w-4 h-4 text-brand-400" />
          </a>
          <span className="text-xs text-gray-500">رابط الحجز:</span>
          <a href={bookingLink} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-brand-600 font-mono truncate hover:underline" dir="ltr">{bookingLink}</a>
          <button
            onClick={handleCopyLink}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-brand-50 hover:text-brand-600 text-gray-500 border border-gray-200 hover:border-brand-200 rounded-xl text-xs font-medium transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
        </div>
      )}

      {/* KPI cards */}
      {visibleKpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleKpis.map((kpi) => (
            <KPICard key={kpi.id} config={kpi} />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <QuickActionsGrid
        actions={profile.quickActions}
        currentRole={currentRole}
        onModalOpen={(modal: QuickActionModal) => {
          if (modal === "booking")  setShowNewBooking(true);
          if (modal === "customer") setShowNewCustomer(true);
          if (modal === "invoice")  setShowNewInvoice(true);
          if (modal === "service")  navigate("/dashboard/catalog?tab=services&new=1");
        }}
      />

      {/* Widgets */}
      {renderedWidgets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {renderedWidgets.map((widget) => {
            const Widget = widget.component;
            return (
              <div key={widget.id} className={sizeClass[widget.size]}>
                <Widget />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick-start (shown if < 5 bookings this month) ── */}
      {stats && stats.bookingsThisMonth < 5 && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-gray-800">ابدأ مع نسق</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-100">
            {([
              { onClick: () => setShowNewBooking(true),   icon: CalendarCheck, label: "أضف أول حجز",  desc: "سجّل حجزاً جديداً الآن",    color: "text-brand-600",   bg: "bg-brand-50"   },
              { onClick: () => setShowNewCustomer(true),  icon: UserPlus,      label: "أضف عميل",      desc: "ابنِ قاعدة عملائك",          color: "text-violet-600", bg: "bg-violet-50"  },
              { onClick: () => setShowNewInvoice(true), icon: Receipt, label: "أنشئ فاتورة", desc: "فاتورة احترافية في ثوانٍ", color: "text-emerald-600", bg: "bg-emerald-50" },
            ] as { onClick: () => void; icon: React.ElementType; label: string; desc: string; color: string; bg: string }[]).map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="bg-white px-5 py-4 flex items-center gap-3 hover:bg-gray-50/60 transition-colors group text-right"
              >
                <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                  <item.icon className={clsx("w-4 h-4", item.color)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-600 transition-colors">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateBookingForm
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        onSuccess={() => { setShowNewBooking(false); }}
      />
      <CreateCustomerForm
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        onSuccess={() => { setShowNewCustomer(false); }}
      />
      <CreateInvoiceModal
        open={showNewInvoice}
        onClose={() => setShowNewInvoice(false)}
        onSuccess={() => { setShowNewInvoice(false); }}
      />
    </div>
  );
}
