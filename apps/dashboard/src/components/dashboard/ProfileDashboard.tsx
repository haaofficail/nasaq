import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { Plus, Settings2, Clock, Copy, Check, ExternalLink, ChevronLeft } from "lucide-react";
import type { DashboardProfile, Role, WidgetConfig, QuickActionModal } from "@/lib/dashboardProfiles";
import { useDashboardPrefs } from "@/hooks/useDashboardPrefs";
import { passesContextGate } from "@/lib/widgetRegistry";
import type { OrgContext } from "@/hooks/useOrgContext";
import { useApi } from "@/hooks/useApi";
import { orgSubscriptionApi, settingsApi } from "@/lib/api";
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
    <div className="space-y-4">

      {/* ── Smart header: welcome + subscription + booking link in one card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Main row */}
        <div className="flex items-center justify-between px-5 py-3.5 gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              مرحباً{user.name ? ` ${user.name}` : ""}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {new Date().toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Subscription pill */}
            {(planName || orgCode || daysLeft !== null) && (
              <Link
                to="/dashboard/subscription"
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 hover:bg-brand-50 rounded-xl border border-gray-100 hover:border-brand-200 transition-colors group text-xs"
              >
                {planName && <span className="font-medium text-gray-600 group-hover:text-brand-700">{planName}</span>}
                {planName && (orgCode || daysLeft !== null) && <span className="w-px h-3 bg-gray-200" />}
                {orgCode && <span className="text-gray-400 font-mono tracking-wide" dir="ltr">{orgCode}</span>}
                {orgCode && daysLeft !== null && <span className="w-px h-3 bg-gray-200" />}
                {daysLeft !== null && (
                  <span className={clsx("font-semibold flex items-center gap-0.5",
                    daysLeft <= 7 ? "text-red-500" : daysLeft <= 30 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    <Clock className="w-3 h-3" />
                    {daysLeft} يوم
                  </span>
                )}
                <ChevronLeft className="w-3 h-3 text-gray-300 group-hover:text-brand-400 transition-colors" />
              </Link>
            )}
            <button
              onClick={() => setShowCustomize((v) => !v)}
              title="تخصيص"
              className={clsx(
                "p-2 rounded-xl transition-colors",
                showCustomize ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(profile.primaryAction.href)}
              className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-3.5 py-2 text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{profile.primaryAction.label}</span>
              <span className="sm:hidden">جديد</span>
            </button>
          </div>
        </div>

        {/* Booking link — subtle footer row */}
        {bookingLink && (
          <div className="flex items-center gap-2 px-5 py-2 border-t border-gray-50 bg-gray-50/50">
            <a href={bookingLink} target="_blank" rel="noopener noreferrer" title="فتح الرابط">
              <ExternalLink className="w-3.5 h-3.5 text-brand-400 hover:text-brand-600 transition-colors" />
            </a>
            <span className="text-[11px] text-gray-400 shrink-0">رابط الحجز:</span>
            <a href={bookingLink} target="_blank" rel="noopener noreferrer" className="flex-1 text-[11px] text-brand-500 font-mono truncate hover:underline" dir="ltr">{bookingLink}</a>
            <button
              onClick={handleCopyLink}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-brand-50 text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-200 rounded-lg text-[11px] font-medium transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? "تم" : "نسخ"}
            </button>
          </div>
        )}
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

      {/* KPI cards — compact horizontal layout */}
      {visibleKpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleKpis.map((kpi) => (
            <KPICard key={kpi.id} config={kpi} />
          ))}
        </div>
      )}

      {/* Quick actions — compact pill strip */}
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
