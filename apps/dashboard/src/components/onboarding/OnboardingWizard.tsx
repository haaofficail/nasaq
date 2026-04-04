import { useState } from "react";
import {
  Building2, Wrench, Database, Users, Rocket,
  Check, Loader2, X, ArrowRight, ArrowLeft, Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { settingsApi, servicesApi } from "@/lib/api";
import { type OnboardingStatus, dismissOnboarding } from "@/hooks/useOnboarding";
import { SAUDI_CITIES, BUSINESS_TYPE_MAP } from "@/lib/constants";

// ── قوالب الخدمات لكل نوع بيزنس ─────────────────────────────
interface ServiceTemplate { name: string; price: number; }

const SERVICE_TEMPLATES: Record<string, ServiceTemplate[]> = {
  salon:        [{ name: "قص شعر", price: 60 }, { name: "صبغة شعر", price: 180 }, { name: "استشوار", price: 80 }, { name: "بروتين", price: 350 }, { name: "مكياج", price: 200 }],
  barber:       [{ name: "قصة شعر", price: 40 }, { name: "حلاقة ذقن", price: 30 }, { name: "قصة شعر + ذقن", price: 60 }, { name: "تلوين", price: 120 }],
  spa:          [{ name: "مساج كامل", price: 250 }, { name: "مساج ظهر", price: 150 }, { name: "جلسة سبا", price: 350 }, { name: "تقشير", price: 200 }],
  fitness:      [{ name: "اشتراك شهري", price: 200 }, { name: "اشتراك ربع سنوي", price: 500 }, { name: "جلسة تدريب شخصي", price: 150 }],
  cafe:         [{ name: "إسبريسو", price: 12 }, { name: "لاتيه", price: 18 }, { name: "كابتشينو", price: 18 }, { name: "V60", price: 22 }, { name: "موكا", price: 20 }],
  restaurant:   [{ name: "برقر", price: 35 }, { name: "بيتزا", price: 45 }, { name: "سلطة", price: 20 }, { name: "وجبة دجاج", price: 40 }, { name: "عصير طازج", price: 15 }],
  bakery:       [{ name: "خبز عيش", price: 5 }, { name: "كيكة تورتة", price: 120 }, { name: "كرواسون", price: 10 }, { name: "مافن", price: 8 }],
  catering:     [{ name: "بوفيه إفطار (للشخص)", price: 45 }, { name: "بوفيه غداء (للشخص)", price: 65 }, { name: "طقم مشاوي", price: 250 }],
  flower_shop:  [{ name: "باقة ورد أحمر", price: 80 }, { name: "باقة مختلطة", price: 100 }, { name: "تنسيق طاولة", price: 200 }, { name: "باقة هدية", price: 150 }],
  rental:       [{ name: "خيمة صغيرة (يوم)", price: 300 }, { name: "خيمة كبيرة (يوم)", price: 600 }, { name: "كوشة ثابتة", price: 800 }, { name: "طاولة + 4 كراسي", price: 80 }],
  photography:  [{ name: "جلسة تصوير ساعة", price: 300 }, { name: "جلسة منزلية", price: 500 }, { name: "تصوير مناسبة", price: 1200 }, { name: "تصوير منتجات", price: 400 }],
  hotel:        [{ name: "غرفة مفردة (ليلة)", price: 250 }, { name: "غرفة مزدوجة (ليلة)", price: 350 }, { name: "جناح (ليلة)", price: 600 }],
  car_rental:   [{ name: "سيارة صغيرة (يوم)", price: 150 }, { name: "سيارة متوسطة (يوم)", price: 200 }, { name: "SUV (يوم)", price: 300 }],
  maintenance:  [{ name: "صيانة منزلية", price: 150 }, { name: "تركيب مكيف", price: 350 }, { name: "إصلاح سباكة", price: 200 }, { name: "كهرباء", price: 180 }],
  workshop:     [{ name: "تغيير زيت", price: 80 }, { name: "فحص شامل", price: 150 }, { name: "تغيير إطارات", price: 200 }, { name: "غسيل سيارة", price: 40 }],
  retail:       [{ name: "منتج رئيسي", price: 50 }, { name: "باقة", price: 120 }, { name: "بطاقة هدية", price: 100 }],
  real_estate:  [{ name: "شقة مكتبية", price: 5000 }, { name: "محل تجاري", price: 8000 }, { name: "شقة سكنية", price: 3500 }],
};

// ============================================================
// ONBOARDING WIZARD — مرشد الإعداد الأولي
// يظهر داخل لوحة التحكم للمنشآت الجديدة التي لم تكمل الإعداد
// ============================================================


interface Step {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

const STEPS: Step[] = [
  { id: "welcome",  icon: Rocket,    title: "مرحباً بك في نسق",        subtitle: "دعنا نعدّ حسابك في دقيقتين" },
  { id: "branch",   icon: Building2, title: "أضف أول فرع",              subtitle: "حدّد موقع عملك الرئيسي" },
  { id: "service",  icon: Wrench,    title: "أضف أول خدمة",             subtitle: "ما الذي تقدمه لعملائك؟" },
  { id: "demo",     icon: Database,  title: "بيانات تجريبية",            subtitle: "هل تريد أمثلة جاهزة لاستكشاف النظام؟" },
  { id: "team",     icon: Users,     title: "دعوة فريقك",               subtitle: "أضف أعضاء فريقك (اختياري)" },
  { id: "done",     icon: Check,     title: "حسابك جاهز!",              subtitle: "ابدأ باستقبال حجوزاتك الأولى" },
];

interface Props {
  status: OnboardingStatus;
  onComplete: () => void;
}

export function OnboardingWizard({ status, onComplete }: Props) {
  const [stepIdx, setStepIdx]       = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("الرياض");
  const [existingMainBranchId, setExistingMainBranchId] = useState<string | null>(null);
  const [svcName, setSvcName]             = useState("");
  const [svcPrice, setSvcPrice]           = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set());
  const [demoChoice, setDemoChoice] = useState<"yes" | "no" | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Load existing main branch on mount to avoid duplicate creation
  useState(() => {
    settingsApi.branches().then(res => {
      const branches: any[] = (res as any)?.data ?? [];
      const main = branches.find((b: any) => b.isMainBranch) ?? branches[0];
      if (main) {
        setExistingMainBranchId(main.id);
        setBranchName(main.name || "");
        setBranchCity(main.city || "الرياض");
      }
    }).catch(() => {});
  });

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  async function advance() {
    setError("");
    setLoading(true);

    try {
      if (step.id === "branch" && branchName.trim()) {
        if (existingMainBranchId) {
          // Update existing main branch instead of creating a duplicate
          await settingsApi.updateBranch(existingMainBranchId, { name: branchName.trim(), city: branchCity, isMainBranch: true });
        } else {
          await settingsApi.createBranch({ name: branchName.trim(), city: branchCity, isMainBranch: true });
        }
        markDone("branch");
      }

      if (step.id === "service") {
        const templates = SERVICE_TEMPLATES[status.businessType] ?? [];
        const creates: Promise<any>[] = [];
        selectedTemplates.forEach(idx => {
          const t = templates[idx];
          if (t) creates.push(servicesApi.create({ name: t.name, basePrice: t.price, status: "active" }));
        });
        if (svcName.trim() && parseFloat(svcPrice) > 0) {
          creates.push(servicesApi.create({ name: svcName.trim(), basePrice: parseFloat(svcPrice), status: "active" }));
        }
        if (creates.length > 0) {
          await Promise.all(creates);
          markDone("service");
        }
      }

      if (step.id === "demo") {
        if (demoChoice === "yes") {
          await settingsApi.seedDemo();
          markDone("demo");
        } else {
          markDone("demo");
        }
      }

      if (isLast || step.id === "team") {
        await settingsApi.updateOnboardingStep("done");
        onComplete();
        return;
      }

      await settingsApi.updateOnboardingStep(step.id);
      setStepIdx(i => i + 1);
    } catch (err: any) {
      setError(err.message ?? "حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  function markDone(id: string) {
    setCompletedSteps(prev => new Set(prev).add(id));
  }

  function skip() {
    setStepIdx(i => i + 1);
  }

  function dismiss() {
    dismissOnboarding();
    onComplete();
  }

  const canAdvance = (() => {
    if (step.id === "branch")  return branchName.trim().length > 0;
    if (step.id === "service") return true; // templates + manual both optional
    if (step.id === "demo")    return demoChoice !== null;
    return true;
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-brand-500 text-white px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-brand-100 mb-0.5">الإعداد الأولي</p>
            <h2 className="text-lg font-bold">{step.title}</h2>
            <p className="text-sm text-brand-100 mt-0.5">{step.subtitle}</p>
          </div>
          <button onClick={dismiss} className="text-brand-200 hover:text-white transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-6 pt-4">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={clsx(
                "flex-1 h-1.5 rounded-full transition-colors",
                i < stepIdx  ? "bg-brand-500" :
                i === stepIdx ? "bg-brand-400" : "bg-gray-100"
              )}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[220px]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          {/* Step: welcome */}
          {step.id === "welcome" && (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
                <Rocket className="w-8 h-8 text-brand-500" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-base">{status.orgName}</p>
                <p className="text-gray-500 text-sm mt-1">
                  نوع النشاط: <span className="font-medium text-gray-800">{BUSINESS_TYPE_MAP[status.businessType] ?? status.businessType}</span>
                </p>
              </div>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                سنساعدك في إعداد الحساب خطوة بخطوة — يستغرق الأمر دقيقتين فقط.
              </p>
            </div>
          )}

          {/* Step: branch */}
          {step.id === "branch" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  اسم الفرع <span className="text-red-400">*</span>
                </label>
                <input
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  placeholder="مثال: الفرع الرئيسي - الرياض"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">المدينة</label>
                <select
                  value={branchCity}
                  onChange={e => setBranchCity(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
                >
                  {SAUDI_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step: service — template picker */}
          {step.id === "service" && (() => {
            const templates = SERVICE_TEMPLATES[status.businessType] ?? [];
            const toggleTemplate = (idx: number) => {
              setSelectedTemplates(prev => {
                const next = new Set(prev);
                next.has(idx) ? next.delete(idx) : next.add(idx);
                return next;
              });
            };
            return (
              <div className="space-y-4">
                {templates.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      اختر من القوالب الجاهزة لـ {BUSINESS_TYPE_MAP[status.businessType] ?? status.businessType}:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {templates.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleTemplate(idx)}
                          className={clsx(
                            "flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm text-right transition-all",
                            selectedTemplates.has(idx)
                              ? "border-brand-500 bg-brand-50 text-brand-800"
                              : "border-gray-200 hover:border-gray-300 text-gray-700"
                          )}
                        >
                          <div className={clsx(
                            "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center",
                            selectedTemplates.has(idx) ? "border-brand-500 bg-brand-500" : "border-gray-300"
                          )}>
                            {selectedTemplates.has(idx) && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <div className="min-w-0 text-right">
                            <p className="font-medium truncate">{t.name}</p>
                            <p className="text-xs text-gray-400">{t.price} ر.س</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 mb-2">أو أضف خدمة يدوياً:</p>
                  <div className="flex gap-2">
                    <input
                      value={svcName}
                      onChange={e => setSvcName(e.target.value)}
                      placeholder="اسم الخدمة"
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    />
                    <input
                      type="number"
                      min="0"
                      value={svcPrice}
                      onChange={e => setSvcPrice(e.target.value)}
                      placeholder="السعر"
                      className="w-24 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Step: demo */}
          {step.id === "demo" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                أضف خدمات وعملاء تجريبيين حسب نوع نشاطك لاستكشاف النظام قبل إدخال بياناتك الحقيقية.
              </p>
              <button
                onClick={() => setDemoChoice("yes")}
                className={clsx(
                  "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-right",
                  demoChoice === "yes" ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={clsx("w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                  demoChoice === "yes" ? "border-brand-500 bg-brand-500" : "border-gray-300"
                )}>
                  {demoChoice === "yes" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">نعم، أضف أمثلة جاهزة</p>
                  <p className="text-xs text-gray-500 mt-0.5">خدمتان وعميلان تجريبيان — يمكن حذفهما لاحقاً</p>
                </div>
              </button>
              <button
                onClick={() => setDemoChoice("no")}
                className={clsx(
                  "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-right",
                  demoChoice === "no" ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={clsx("w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                  demoChoice === "no" ? "border-brand-500 bg-brand-500" : "border-gray-300"
                )}>
                  {demoChoice === "no" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">لا، سأدخل بياناتي مباشرة</p>
                  <p className="text-xs text-gray-500 mt-0.5">ابدأ بقاعدة بيانات نظيفة</p>
                </div>
              </button>
            </div>
          )}

          {/* Step: team */}
          {step.id === "team" && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-800 mb-2">يمكنك دعوة الفريق من إدارة الفريق</p>
                <ul className="space-y-1.5">
                  {["اذهب إلى الفريق في القائمة الجانبية", "أضف أعضاء الفريق بأرقام جوالاتهم", "حدد الدور والصلاحيات لكل عضو"].map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="/dashboard/team"
                className="block text-center text-sm text-brand-600 font-medium py-2 rounded-xl border border-brand-200 hover:bg-brand-50 transition-colors"
              >
                الذهاب إلى إدارة الفريق الآن
              </a>
            </div>
          )}

          {/* Step: done */}
          {step.id === "done" && (
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-base">حسابك جاهز تماماً!</p>
                <p className="text-sm text-gray-500 mt-1">الخطوة التالية: أضف خدماتك ثم شارك رابط الحجز مع عملائك</p>
              </div>
              <div className="bg-brand-50 rounded-xl p-3 text-right">
                <p className="text-xs font-semibold text-brand-700 mb-2">ابدأ من هنا</p>
                <div className="space-y-1.5">
                  {[
                    { label: "أضف خدماتك ومنتجاتك",   href: "/dashboard/catalog",   num: "1" },
                    { label: "أضف موظفي الفريق",       href: "/dashboard/team",      num: "2" },
                    { label: "شارك رابط الحجز",         href: "/dashboard/website",   num: "3" },
                  ].map(link => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white text-gray-700 hover:bg-brand-100 hover:text-brand-800 transition-colors text-sm font-medium"
                    >
                      <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {link.num}
                      </span>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {stepIdx > 0 && stepIdx < STEPS.length - 1 && (
            <button
              onClick={() => setStepIdx(i => i - 1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              السابق
            </button>
          )}

          <div className="flex-1" />

          {/* Skip — optional steps */}
          {(step.id === "branch" || step.id === "service" || step.id === "team") && (
            <button
              onClick={skip}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              تخطي
            </button>
          )}

          <button
            onClick={isLast ? onComplete : advance}
            disabled={loading || (!canAdvance && step.id !== "welcome" && step.id !== "team" && step.id !== "done")}
            className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLast ? "إغلاق" : step.id === "welcome" ? "ابدأ الإعداد" : "التالي"}
            {!isLast && !loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
