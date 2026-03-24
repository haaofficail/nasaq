import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard, CheckCircle2, Clock, Package, ChevronLeft, Loader2, MessageSquare,
} from "lucide-react";
import { clsx } from "clsx";
import { orgSubscriptionApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { PLANS, ADDONS, PLAN_MAP } from "@/lib/constants";
import { toast } from "@/hooks/useToast";

// ── helpers ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:    { label: "نشط",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    trialing:  { label: "تجربة",       cls: "bg-brand-50 text-brand-700 border-brand-200" },
    past_due:  { label: "متأخر",       cls: "bg-amber-50 text-amber-700 border-amber-200" },
    cancelled: { label: "ملغي",        cls: "bg-gray-50 text-gray-600 border-gray-200" },
    suspended: { label: "موقوف",       cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const m = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold", m.cls)}>
      {m.label}
    </span>
  );
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const cls = days <= 7
    ? "bg-red-50 text-red-600 border-red-100"
    : days <= 30
    ? "bg-amber-50 text-amber-600 border-amber-100"
    : "bg-emerald-50 text-emerald-600 border-emerald-100";
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium", cls)}>
      <Clock className="w-3 h-3" />
      {days} يوم متبقي
    </span>
  );
}

// ── main page ──────────────────────────────────────────────

export function SubscriptionPage() {
  const [requestingAddon, setRequestingAddon] = useState<string | null>(null);
  const { data: subRes, loading } = useApi(() => orgSubscriptionApi.get(), []);
  const { mutate: requestAddon } = useMutation((key: string) => orgSubscriptionApi.requestAddon(key));

  const sub = subRes?.data;

  const handleRequest = async (addonKey: string) => {
    setRequestingAddon(addonKey);
    await requestAddon(addonKey);
    setRequestingAddon(null);
    toast({ title: "تم إرسال الطلب", description: "سيتواصل معك فريق نسق في أقرب وقت" });
  };

  const activeAddonKeys = new Set((sub?.addons ?? []).map((a: any) => a.addonKey));

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 bg-gray-100 rounded-xl w-48" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-brand-500" /> إدارة الباقة
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">تفاصيل اشتراكك وإضافاتك المفعّلة</p>
      </div>

      {/* Current plan card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">الباقة الحالية</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-bold text-brand-600">
                {PLAN_MAP[sub?.plan ?? "basic"]?.name ?? sub?.plan}
              </span>
              {sub?.status && <StatusBadge status={sub.status} />}
              <DaysBadge days={sub?.daysRemaining ?? null} />
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-gray-900">
              {PLAN_MAP[sub?.plan ?? "basic"]?.price
                ? `${PLAN_MAP[sub?.plan ?? "basic"]?.price?.toLocaleString()} ر.س`
                : "حسب الطلب"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">شهرياً</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">تاريخ الانتهاء</p>
            <p className="text-sm font-medium text-gray-700">
              {sub?.endDate
                ? new Date(sub.endDate).toLocaleDateString("ar-SA")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">الإضافات المفعّلة</p>
            <p className="text-sm font-medium text-gray-700">{(sub?.addons ?? []).length} إضافة</p>
          </div>
        </div>

        {/* Active addons list */}
        {(sub?.addons ?? []).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs font-medium text-gray-500 mb-2">الإضافات النشطة</p>
            <div className="flex flex-wrap gap-2">
              {(sub?.addons ?? []).map((a: any) => (
                <span key={a.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-medium border border-brand-100">
                  <CheckCircle2 className="w-3 h-3" /> {a.addonName}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">لتغيير الباقة أو التجديد تواصل مع الدعم</p>
          <a
            href="https://wa.me/966500000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> تواصل مع الدعم
          </a>
        </div>
      </div>

      {/* Available add-ons */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" /> الإضافات المتاحة
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
          {ADDONS.map((addon) => {
            const active = activeAddonKeys.has(addon.key);
            return (
              <div key={addon.key} className="bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800">{addon.name}</p>
                      {active && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-semibold border border-emerald-100">
                          <CheckCircle2 className="w-2.5 h-2.5" /> مفعّل
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{addon.description}</p>
                    <p className="text-xs font-medium text-gray-600 mt-2">
                      {addon.price === 0 ? "مجاناً" : `${addon.price.toLocaleString()} ر.س / شهر`}
                    </p>
                  </div>
                  {!active && (
                    <button
                      onClick={() => handleRequest(addon.key)}
                      disabled={requestingAddon === addon.key}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-brand-50 hover:text-brand-600 text-gray-600 border border-gray-200 hover:border-brand-200 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {requestingAddon === addon.key ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                      تواصل
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade plans */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-base font-semibold text-gray-800">الباقات المتاحة</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === sub?.plan;
            return (
              <div key={plan.key} className={clsx("bg-white p-5", isCurrent && "bg-brand-50/40")}>
                <p className="text-sm font-semibold text-gray-800 mb-1">{plan.name}</p>
                <p className="text-xl font-bold text-gray-900">
                  {plan.price === 0 ? "حسب الطلب" : `${plan.price.toLocaleString()}`}
                </p>
                {plan.price > 0 && <p className="text-xs text-gray-400">ر.س / شهر</p>}
                {isCurrent && (
                  <span className="mt-2 inline-block px-2 py-0.5 bg-brand-100 text-brand-700 rounded-md text-[10px] font-semibold">
                    باقتك الحالية
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center pb-2">
        للترقية أو تغيير الباقة، تواصل مع فريق نسق عبر البريد أو واتساب.
      </p>
    </div>
  );
}
