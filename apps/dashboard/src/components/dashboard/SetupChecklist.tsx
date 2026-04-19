import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket, X, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { useApi } from "@/hooks/useApi";
import { settingsApi } from "@/lib/api";
import { useBusiness } from "@/hooks/useBusiness";

const DISMISS_KEY = "nasaq_setup_checklist_dismissed_v2";

interface Step {
  id: string;
  label: string;
  desc: string;
  href: string | null;
  check: (s: any) => boolean;
}

const FOOD_TYPES = ["restaurant", "cafe", "bakery", "catering", "restaurant_delivery"];

export function SetupChecklist() {
  const navigate = useNavigate();
  const biz = useBusiness();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  const { data: res, loading } = useApi(() => settingsApi.setupStatus(), []);
  const status = res?.data;

  const FOOD_STEPS: Step[] = [
    {
      id: "menu",
      label: biz.terminology.onboardingAddItems,
      desc: "أضف مشروباتك وأطباقك لتظهر في الطلبات والمنيو",
      href: "/dashboard/menu",
      check: s => s.hasMenuItems,
    },
    {
      id: "branch",
      label: biz.terminology.onboardingAddData,
      desc: biz.terminology.onboardingAddDataDesc,
      href: "/dashboard/settings",
      check: s => s.hasBranch,
    },
    {
      id: "team",
      label: biz.terminology.onboardingAddStaff,
      desc: biz.terminology.onboardingAddStaffDesc,
      href: "/dashboard/team",
      check: s => s.hasTeam,
    },
    {
      id: "order",
      label: biz.terminology.onboardingFirstBooking,
      desc: biz.terminology.onboardingFirstBookingDesc,
      href: "/dashboard/orders",
      check: s => s.hasOrders,
    },
  ];

  const DEFAULT_STEPS: Step[] = [
    {
      id: "service",
      label: biz.terminology.onboardingAddItems,
      desc: "تظهر خدماتك في صفحة الحجز للعملاء",
      href: "/dashboard/catalog",
      check: s => s.hasServices,
    },
    {
      id: "branch",
      label: biz.terminology.onboardingAddData,
      desc: biz.terminology.onboardingAddDataDesc,
      href: "/dashboard/settings",
      check: s => s.hasBranch,
    },
    {
      id: "team",
      label: biz.terminology.onboardingAddStaff,
      desc: biz.terminology.onboardingAddStaffDesc,
      href: "/dashboard/team",
      check: s => s.hasTeam,
    },
    {
      id: "booking",
      label: biz.terminology.onboardingFirstBooking,
      desc: biz.terminology.onboardingFirstBookingDesc,
      href: "/dashboard/bookings",
      check: s => s.hasBookings,
    },
  ];

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (dismissed || loading || !status) return null;

  const isFood = FOOD_TYPES.includes(status.businessType ?? "");
  const STEPS = isFood ? FOOD_STEPS : DEFAULT_STEPS;

  const doneCount = STEPS.filter(s => s.check(status)).length;
  if (doneCount === STEPS.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-[6px] border-b border-gray-50">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center gap-2.5 flex-1 text-right"
        >
          <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4 text-brand-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">دليل الإعداد السريع</p>
            <p className="text-xs text-gray-400">{doneCount} / {STEPS.length} خطوات مكتملة</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 ml-4">
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-brand-600 tabular-nums">
              {Math.round((doneCount / STEPS.length) * 100)}%
            </span>
          </div>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
            : <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          }
        </button>
        <button
          onClick={handleDismiss}
          title="إخفاء الدليل"
          className="mr-2 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {STEPS.map(step => {
            const done = step.check(status);
            return (
              <div
                key={step.id}
                className={clsx(
                  "flex items-center gap-3.5 px-5 py-[6px]",
                  !done && step.href && "cursor-pointer hover:bg-[#f8fafc] transition-colors"
                )}
                onClick={() => !done && step.href && navigate(step.href)}
              >
                {done
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  : <Circle className="w-5 h-5 text-gray-200 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    "text-sm font-medium",
                    done ? "text-gray-400 line-through" : "text-gray-800"
                  )}>
                    {step.label}
                  </p>
                  {!done && <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>}
                </div>
                {!done && step.href && <ExternalLink className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
