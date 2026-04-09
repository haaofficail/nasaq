import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  bookingUsed: number;
  bookingLimit: number;
  freeState: "active" | "near_limit" | "last_warning" | "reached";
}

export function FreePlanBanner({ bookingUsed, bookingLimit, freeState }: Props) {
  const navigate = useNavigate();
  const remaining = bookingLimit - bookingUsed;

  const config = {
    active: {
      bg: "bg-brand-50 border-brand-100",
      text: "text-brand-700",
      bar: "bg-brand-400",
      msg: `استخدمت ${bookingUsed} من ${bookingLimit} حجز مجاني`,
      show: false, // لا يظهر إلا بعد الحد الأول
    },
    near_limit: {
      bg: "bg-amber-50 border-amber-100",
      text: "text-amber-700",
      bar: "bg-amber-400",
      msg: `لديك ${remaining} حجوزات مجانية متبقية — ترقّ متى شئت`,
      show: true,
    },
    last_warning: {
      bg: "bg-orange-50 border-orange-100",
      text: "text-orange-700",
      bar: "bg-orange-400",
      msg: `باقي ${remaining} ${remaining === 1 ? "حجز" : "حجوزات"} فقط — ترقّ الآن لتجنب توقف الخدمة`,
      show: true,
    },
    reached: {
      bg: "bg-red-50 border-red-100",
      text: "text-red-700",
      bar: "bg-red-400",
      msg: "اكتملت الحجوزات المجانية — اختر باقة مناسبة للاستمرار",
      show: true,
    },
  }[freeState];

  if (!config.show) return null;

  const progress = Math.min(100, (bookingUsed / bookingLimit) * 100);

  return (
    <div className={clsx("border-b px-4 py-2 flex items-center justify-between gap-3 shrink-0", config.bg)}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Zap className={clsx("w-3.5 h-3.5 shrink-0", config.text)} />
        <span className={clsx("text-xs font-medium truncate", config.text)}>
          {config.msg}
        </span>
        {/* Progress bar */}
        <div className="hidden sm:flex flex-1 max-w-32 h-1.5 bg-white/60 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all", config.bar)}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={clsx("text-[11px] hidden sm:block shrink-0", config.text)}>
          {bookingUsed}/{bookingLimit}
        </span>
      </div>
      <button
        onClick={() => navigate("/dashboard/subscription")}
        className={clsx(
          "flex items-center gap-1 text-xs font-semibold shrink-0 hover:underline",
          config.text
        )}
      >
        عرض الباقات
        <ArrowLeft className="w-3 h-3 rotate-180" />
      </button>
    </div>
  );
}
