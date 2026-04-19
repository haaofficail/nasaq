import { CreditCard, Check, X, Package, Zap } from "lucide-react";
import { clsx } from "clsx";
import { billingPricingApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

// ── helpers ────────────────────────────────────────────────

function fmtPrice(n: number | string | null) {
  const v = Number(n ?? 0);
  if (v === 0) return "مجاني";
  return `${v.toLocaleString("en-US")} ر.س`;
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const danger = pct >= 90;
  const warn = pct >= 70;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={clsx("text-xs font-medium", danger ? "text-red-600" : warn ? "text-amber-600" : "text-gray-700")}>
          {used} / {max >= 999999 ? "غير محدود" : max}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all", danger ? "bg-red-400" : warn ? "bg-amber-400" : "bg-brand-400")}
          style={{ width: max >= 999999 ? "4%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlanBadge({ code }: { code: string }) {
  const map: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    basic: "bg-brand-50 text-brand-700",
    advanced: "bg-purple-50 text-purple-700",
    enterprise: "bg-amber-50 text-amber-700",
    custom: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border border-transparent", map[code] ?? "bg-gray-100 text-gray-600")}>
      {code}
    </span>
  );
}

const FEATURE_LABELS: Record<string, string> = {
  bookings:         "الحجوزات",
  whatsapp:         "WhatsApp",
  api:              "API",
  storefront_qr:    "صفحة العرض + QR",
  zatca_invoices:   "فواتير زاتكا",
  pos:              "نقطة البيع",
  crm:              "CRM",
  contracts:        "العقود",
  inventory:        "المخزون",
  reports_basic:    "التقارير الأساسية",
  custom_domain:    "نطاق مخصص",
  hr_payroll:       "HR والرواتب",
  accounting:       "المحاسبة الكاملة",
  reports_advanced: "تقارير متقدمة",
  hide_branding:    "إخفاء علامة ترميز OS",
  account_manager:  "مدير حساب مخصص",
  priority_support: "دعم أولوية",
  sla:              "SLA مضمون",
};

// ── main page ──────────────────────────────────────────────

export function BillingPage() {
  const { data: plansRes, loading: plansLoading, error: plansError } = useApi(() => billingPricingApi.plans(), []);
  const { data: addonsRes, loading: addonsLoading } = useApi(() => billingPricingApi.planAddons(), []);
  const { data: myPlanRes, loading: myPlanLoading } = useApi(() => billingPricingApi.myPlan(), []);
  const { data: usageRes } = useApi(() => billingPricingApi.usage(), []);

  const loading = plansLoading || myPlanLoading || addonsLoading;

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse" dir="rtl">
        <div className="h-8 bg-[#f1f5f9] rounded-xl w-48" />
        <div className="h-32 bg-[#f1f5f9] rounded-2xl" />
        <div className="h-64 bg-[#f1f5f9] rounded-2xl" />
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3" dir="rtl">
        <X className="w-10 h-10 text-red-300" />
        <p className="text-gray-500 text-sm">تعذر تحميل بيانات الباقات</p>
      </div>
    );
  }

  const plans: any[] = plansRes?.data ?? [];
  const planAddons: any[] = addonsRes?.data ?? [];
  const myPlan = myPlanRes?.data ?? null;
  const usage = usageRes?.data ?? { branches: 0, employees: 0 };

  const currentPlanCode = myPlan?.plan?.code ?? "free";
  const currentPlan = myPlan?.plan ?? null;
  const activeAddonCodes = new Set((myPlan?.addons ?? []).map((a: any) => a.addonCode));
  const activeFeatures: string[] = myPlan?.features ?? [];

  const trialEndsAt = myPlan?.trialEndsAt ? new Date(myPlan.trialEndsAt) : null;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="space-y-6 max-w-5xl" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-brand-500" />
          الفوترة والخطة
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">باقتك الحالية، الاستخدام، والإضافات المتاحة</p>
      </div>

      {/* Current plan card */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">الباقة الحالية</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {currentPlan?.nameAr ?? "مجاني"}
              </span>
              <PlanBadge code={currentPlanCode} />
              {myPlan?.isTrial && trialDaysLeft !== null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-100">
                  <Zap className="w-3 h-3" />
                  تجربة — {trialDaysLeft} يوم متبقي
                </span>
              )}
            </div>
            {currentPlan && Number(currentPlan.priceMonthly) > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {fmtPrice(currentPlan.priceMonthly)} / شهرياً
                <span className="text-gray-400 mr-2 text-xs">
                  ({fmtPrice(currentPlan.priceYearly)} سنوياً)
                </span>
              </p>
            )}
          </div>

          <div className="text-left space-y-2 min-w-[160px]">
            {currentPlan && (
              <div className="text-xs text-gray-400">
                <span className="font-medium text-gray-600">{currentPlan.maxBranches >= 999999 ? "غير محدود" : currentPlan.maxBranches}</span> فرع ·{" "}
                <span className="font-medium text-gray-600">{currentPlan.maxEmployees >= 999999 ? "غير محدود" : currentPlan.maxEmployees}</span> موظف
              </div>
            )}
          </div>
        </div>

        {/* Usage bars */}
        {currentPlan && (
          <div className="mt-5 pt-4 border-t border-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UsageBar
              label="الفروع"
              used={usage.branches}
              max={currentPlan.maxBranches}
            />
            <UsageBar
              label="الموظفون"
              used={usage.employees}
              max={currentPlan.maxEmployees}
            />
          </div>
        )}

        {/* Active features */}
        {activeFeatures.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs font-medium text-gray-400 mb-2">الميزات المتاحة في باقتك</p>
            <div className="flex flex-wrap gap-2">
              {activeFeatures.map(f => (
                <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs border border-emerald-100">
                  <Check className="w-3 h-3" />
                  {FEATURE_LABELS[f] ?? f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Active plan addons */}
        {(myPlan?.addons ?? []).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs font-medium text-gray-400 mb-2">الإضافات المفعّلة</p>
            <div className="flex flex-wrap gap-2">
              {(myPlan.addons as any[]).map((a: any) => (
                <span key={a.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium border border-brand-100">
                  <Package className="w-3 h-3" />
                  {a.addonCode}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plans comparison */}
      {plans.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-base font-semibold text-gray-800">مقارنة الباقات</h2>
            <p className="text-xs text-gray-400 mt-0.5">اختر الباقة المناسبة لنشاطك</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-right text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3 w-40">الباقة</th>
                  <th className="px-[10px] py-[6px]">السعر الشهري</th>
                  <th className="px-[10px] py-[6px]">السعر السنوي</th>
                  <th className="px-[10px] py-[6px]">الفروع</th>
                  <th className="px-[10px] py-[6px]">الموظفون</th>
                  <th className="px-[10px] py-[6px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map((plan: any) => {
                  const isCurrent = plan.code === currentPlanCode;
                  const hasOrgPrice = Number(plan.originalPriceMonthly) > 0;
                  return (
                    <tr key={plan.code} className={clsx("hover:bg-[#f8fafc]/50 transition-colors", isCurrent && "bg-brand-50/20")}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{plan.nameAr}</span>
                          {isCurrent && (
                            <span className="inline-block px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded text-[10px] font-semibold">
                              باقتك
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-[10px] py-[6px] text-gray-700">
                        {Number(plan.priceMonthly) === 0 ? (
                          <span className="text-gray-400">مجاني</span>
                        ) : (
                          <div>
                            <span className="font-semibold text-gray-900">{fmtPrice(plan.priceMonthly)}</span>
                            {hasOrgPrice && (
                              <span className="block text-xs text-gray-400 line-through">{fmtPrice(plan.originalPriceMonthly)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-[10px] py-[6px] text-gray-700">
                        {Number(plan.priceYearly) === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div>
                            <span className="font-semibold text-emerald-700">{fmtPrice(plan.priceYearly)}</span>
                            {Number(plan.originalPriceYearly) > 0 && (
                              <span className="block text-xs text-gray-400 line-through">{fmtPrice(plan.originalPriceYearly)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-[10px] py-[6px] text-gray-600 tabular-nums">
                        {plan.maxBranches >= 999999 ? "غير محدود" : plan.maxBranches}
                      </td>
                      <td className="px-[10px] py-[6px] text-gray-600 tabular-nums">
                        {plan.maxEmployees >= 999999 ? "غير محدود" : plan.maxEmployees}
                      </td>
                      <td className="px-[10px] py-[6px] text-left">
                        {!isCurrent && plan.code !== "custom" && Number(plan.priceMonthly) > 0 && (
                          <a
                            href="/dashboard/subscription"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-medium transition-colors"
                          >
                            ترقية
                          </a>
                        )}
                        {plan.code === "custom" && (
                          <a
                            href="mailto:info@tarmizos.com"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
                          >
                            تواصل معنا
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan addons */}
      {planAddons.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              إضافات قطاعية
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">وحدات متخصصة لتوسيع قدرات منشأتك</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
            {planAddons.map((addon: any) => {
              const active = activeAddonCodes.has(addon.code);
              return (
                <div key={addon.code} className={clsx("bg-white p-5", active && "bg-emerald-50/30")}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-gray-800">{addon.nameAr}</p>
                    {active && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold border border-emerald-100">
                        <Check className="w-2.5 h-2.5" /> مفعّل
                      </span>
                    )}
                  </div>
                  {addon.descriptionAr && (
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">{addon.descriptionAr}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">
                      {fmtPrice(addon.priceYearly)} / سنوياً
                    </span>
                    {!active && (
                      <a
                        href="/dashboard/subscription"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f8fafc] hover:bg-brand-50 hover:text-brand-600 text-gray-600 border border-[#eef2f6] hover:border-brand-200 rounded-xl text-xs font-medium transition-all"
                      >
                        تفعيل
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {planAddons.length === 0 && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-[#eef2f6]">
          <CreditCard className="w-10 h-10 text-gray-200" />
          <p className="text-gray-400 text-sm">لا توجد بيانات للعرض</p>
        </div>
      )}
    </div>
  );
}
