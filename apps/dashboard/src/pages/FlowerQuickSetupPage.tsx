/**
 * FlowerQuickSetupPage — الإعداد السريع لمحل الورد
 * يقرأ القوالب من DB ويتيح اختيار الـ profile قبل التهيئة
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Loader2, MapPin, Package, Puzzle, Truck,
  Zap, AlertCircle, ArrowLeft, ChevronLeft,
} from "lucide-react";
import { clsx } from "clsx";
import { onboardingApi } from "@/lib/api";

type SetupStatus = "loading" | "idle" | "running" | "done" | "already_done" | "error";

interface Profile {
  id: string;
  profile_key: string;
  name: string;
  description: string;
  version: number;
}

const STAT_CARDS = [
  { label: "خدمة ميدانية", count: 7, desc: "استقبال مولود، مدخل ترحيبي، ركن تصوير...", color: "text-brand-600", bg: "bg-brand-50", border: "border-brand-100", icon: MapPin },
  { label: "خطة تجهيز", count: 7, desc: "لكل خدمة خطة بالأصول والكميات والعمالة", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", icon: Package },
  { label: "تنسيق وباقة", count: 6, desc: "عيد ميلاد، تخرج، مولود، رومانسية...", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", icon: Puzzle },
  { label: "مورد جاهز", count: 7, desc: "ورد، تغليف، شموع، ستاندات، نباتات...", color: "text-green-600", bg: "bg-green-50", border: "border-green-100", icon: Truck },
];

export function FlowerQuickSetupPage() {
  const navigate = useNavigate();
  const [status, setStatus]               = useState<SetupStatus>("loading");
  const [profiles, setProfiles]           = useState<Profile[]>([]);
  const [selectedProfile, setSelected]    = useState<string>("flower_events");
  const [result, setResult]               = useState<any>(null);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      onboardingApi.getStatus(),
      onboardingApi.getProfiles(),
    ])
      .then(([statusRes, profilesRes]) => {
        if (statusRes.data?.hasSetup) {
          setStatus("already_done");
        } else {
          setProfiles(profilesRes.data ?? []);
          if (profilesRes.data?.length) setSelected(profilesRes.data[0].profile_key);
          setStatus("idle");
        }
      })
      .catch(() => setStatus("idle"));
  }, []);

  const runSetup = async () => {
    setStatus("running");
    setError(null);
    try {
      const r = await onboardingApi.flowerSetup(selectedProfile);
      setResult(r.data);
      setStatus("done");
    } catch (e: any) {
      if (e?.status === 409) {
        setStatus("already_done");
      } else {
        setError("حدث خطأ أثناء الإعداد — يرجى المحاولة مرة أخرى");
        setStatus("error");
      }
    }
  };

  // ── Loading ───────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────
  if (status === "done") {
    const c = result?.created ?? {};
    return (
      <div dir="rtl" className="max-w-xl mx-auto py-12 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">متجرك جاهز</h1>
          <p className="text-sm text-gray-400">{result?.profile}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-right">
          <p className="text-xs font-semibold text-gray-500 mb-3">ما تم إنشاؤه:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["تصنيفات", c.categories],
              ["منتجات", c.products],
              ["خدمات", c.regularServices],
              ["خدمات ميدانية", c.fieldServices],
              ["خطط تجهيز", c.setupPlans],
              ["تنسيقات", c.arrangements],
              ["موردين", c.suppliers],
              ["إضافات", c.addons],
            ].map(([label, val]) => val > 0 && (
              <div key={label as string} className="flex items-center gap-1.5 text-gray-700">
                <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span>{val} {label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-right space-y-3">
          <p className="text-sm font-semibold text-gray-700 mb-3">الخطوات التالية:</p>
          {[
            { text: "عدّل أسماء الخدمات وأسعارها", href: "/dashboard/flower-catalog" },
            { text: "راجع خطط التجهيز وأضف بنوداً حسب حاجتك", href: "/dashboard/event-packages" },
            { text: "حدّث بيانات الموردين بأرقام التواصل الحقيقية", href: "/dashboard/suppliers" },
            { text: "ابدأ باستقبال مشاريعك الميدانية", href: "/dashboard/service-orders" },
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => navigate(s.href)}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 w-full text-right"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              {s.text}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full bg-brand-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-600 transition-colors"
        >
          دخول لوحة التحكم
        </button>
      </div>
    );
  }

  // ── Already Done ─────────────────────────────────────────
  if (status === "already_done") {
    return (
      <div dir="rtl" className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto">
          <Check className="w-7 h-7 text-brand-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">تم إعداد المتجر مسبقاً</h1>
        <p className="text-sm text-gray-500">بياناتك جاهزة — يمكنك تعديلها في أي وقت</p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => navigate("/dashboard/flower-catalog")}
            className="flex items-center gap-2 bg-brand-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            الكاتالوج والخدمات
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-100 text-gray-700 rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            لوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / Error ─────────────────────────────────────────
  return (
    <div dir="rtl" className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">الإعداد السريع لمحل الورد</h1>
        <p className="text-sm text-gray-400 mt-1">أنشئ كل بيانات متجرك في ثوانٍ — عدّل لاحقاً حسب حاجتك</p>
      </div>

      {/* Profile selection */}
      {profiles.length > 1 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">اختر نوع الإعداد:</p>
          <div className="grid gap-2">
            {profiles.map((p) => (
              <button
                key={p.profile_key}
                onClick={() => setSelected(p.profile_key)}
                className={clsx(
                  "flex items-start gap-3 text-right rounded-2xl border p-4 transition-colors",
                  selectedProfile === p.profile_key
                    ? "border-brand-400 bg-brand-50"
                    : "border-gray-100 bg-white hover:border-gray-200"
                )}
              >
                <div className={clsx(
                  "w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors",
                  selectedProfile === p.profile_key ? "border-brand-500 bg-brand-500" : "border-gray-300"
                )} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {STAT_CARDS.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={clsx("rounded-2xl border p-4 bg-white", item.border)}>
              <div className="flex items-center gap-2 mb-2">
                <span className={clsx("text-2xl font-black", item.color)}>{item.count}</span>
                <Icon className={clsx("w-4 h-4", item.color)} />
              </div>
              <p className="text-xs font-semibold text-gray-700">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* What will be created */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">ما الذي سيُنشأ تلقائياً:</h2>
        <div className="space-y-2 text-sm text-gray-600">
          {[
            "7 تصنيفات (باقات الورد، صناديق، تنسيقات، نباتات، إضافات، خدمات، مناسبات)",
            "14 منتج جاهز (وردة مفردة، صناديق، تنسيقات، نباتات...)",
            "7 خدمات ميدانية (استقبال مولود، مدخل، ركن تصوير...)",
            "7 خطط تجهيز — لكل خدمة خطة بالأصول والكميات والعمالة",
            "6 تنسيقات وباقات (عيد ميلاد، تخرج، مولود، رومانسية...)",
            "5 إضافات (توصيل سريع، تغليف فاخر، بطاقة إهداء...)",
            "5 مسميات وظيفية (مترميز OS ورد، مشرف تجهيز، سائق توصيل...)",
            "7 موردين جاهزين (ورد، تغليف، شموع، ستاندات، نباتات...)",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">تذكر:</p>
        <p>كل البيانات قابلة للتعديل بالكامل — الأسعار والأسماء والعناصر. هذه قوالب استرشادية تساعدك على البدء السريع فقط.</p>
      </div>

      {/* Error */}
      {status === "error" && error && (
        <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={runSetup}
        disabled={status === "running"}
        className="w-full bg-brand-500 text-white rounded-2xl py-4 text-base font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {status === "running" ? (
          <><Loader2 className="w-5 h-5 animate-spin" />جارٍ إعداد المتجر...</>
        ) : (
          <><Zap className="w-5 h-5" />إعداد المتجر تلقائياً</>
        )}
      </button>
    </div>
  );
}
