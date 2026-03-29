import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle2, ArrowLeft } from "lucide-react";

const SOFT_MODAL_KEY = "nasaq_free_soft_modal_shown";

interface Props {
  orgId: string;
  freeState: "active" | "near_limit" | "last_warning" | "reached";
  bookingUsed: number;
  bookingLimit: number;
}

const PAID_PLANS = [
  { key: "basic",    name: "الأساسي",   price: "199", perks: ["حجوزات غير محدودة", "10 موظفين", "فرع واحد"] },
  { key: "advanced", name: "المتقدم",   price: "499", perks: ["حجوزات غير محدودة", "25 موظف",   "3 فروع"] },
  { key: "pro",      name: "الاحترافي", price: "999", perks: ["حجوزات غير محدودة", "50 موظف",   "5 فروع"] },
];

export function FreeLimitModal({ orgId, freeState, bookingUsed, bookingLimit }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const storageKey = `${SOFT_MODAL_KEY}_${orgId}`;

  useEffect(() => {
    // Soft modal: يظهر مرة واحدة عند بلوغ 10 حجوزات
    if (freeState === "near_limit" || freeState === "last_warning") {
      const shown = localStorage.getItem(storageKey);
      if (!shown) {
        setOpen(true);
        localStorage.setItem(storageKey, "1");
      }
    }
    // Hard stop: يظهر دائماً عند بلوغ الحد
    if (freeState === "reached") {
      setOpen(true);
    }
  }, [freeState, storageKey]);

  if (!open) return null;

  const isHardStop = freeState === "reached";
  const remaining = bookingLimit - bookingUsed;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              {isHardStop ? (
                <>
                  <p className="text-sm font-semibold text-emerald-600 mb-1">استخدمت {bookingUsed} حجزاً بنجاح</p>
                  <h2 className="text-xl font-bold text-gray-900">انتهت الحجوزات المجانية</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    للمتابعة في استقبال الحجوزات، اختر باقة مناسبة
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-amber-600 mb-1">باقي {remaining} حجوزات فقط</p>
                  <h2 className="text-xl font-bold text-gray-900">اقتربت من نهاية التجربة</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    استخدمت {bookingUsed} من {bookingLimit} حجوزات مجانية — جهّز حسابك قبل الوصول للحد
                  </p>
                </>
              )}
            </div>
            {!isHardStop && (
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 mt-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 pb-4 space-y-2">
          {PAID_PLANS.map((plan) => (
            <div key={plan.key} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between hover:border-brand-200 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-800">{plan.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                  {plan.perks.map((p) => (
                    <span key={p} className="flex items-center gap-1 text-[11px] text-gray-500">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 mr-2">
                <p className="text-sm font-bold text-gray-900">{plan.price}</p>
                <p className="text-[10px] text-gray-400">ر.س / شهر</p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={() => { setOpen(false); navigate("/dashboard/subscription"); }}
            className="w-full bg-brand-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
          >
            ابدأ الآن
            <ArrowLeft className="w-4 h-4" />
          </button>
          {!isHardStop && (
            <button
              onClick={() => setOpen(false)}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-1.5"
            >
              لاحقاً
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
