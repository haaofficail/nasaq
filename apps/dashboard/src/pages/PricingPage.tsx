import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, ChevronDown } from "lucide-react";
import { PublicLayout } from "../components/public/PublicLayout";

const plans = [
  {
    id: "basic",
    name: "الأساسي",
    monthly: 79,
    yearly: 63,
    desc: "للأنشطة الصغيرة والمتوسطة التي تبدأ رحلتها",
    features: [
      "30 يوم مجاناً بدون بطاقة",
      "حجوزات غير محدودة",
      "10 موظفين",
      "فرع واحد",
      "جميع وحدات النظام",
      "دعم مباشر عبر الواتساب",
    ],
    cta: "ابدأ تجربتك المجانية",
    href: "/register",
    highlight: false,
  },
  {
    id: "advanced",
    name: "المتقدم",
    monthly: 299,
    yearly: 239,
    desc: "للأنشطة النامية التي تحتاج استمرارية وتقارير",
    features: [
      "30 يوم مجاناً بدون بطاقة",
      "حجوزات غير محدودة",
      "30 موظف",
      "3 فروع",
      "جميع وحدات النظام",
      "تقارير متقدمة + تسويق",
    ],
    cta: "ابدأ تجربتك المجانية",
    href: "/register",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "المؤسسي",
    monthly: 399,
    yearly: 319,
    desc: "للشركات والفروع المتعددة مع دعم مخصص",
    features: [
      "30 يوم مجاناً بدون بطاقة",
      "حجوزات غير محدودة",
      "100 موظف",
      "10 فروع",
      "جميع وحدات النظام",
      "مدير حساب مخصص",
    ],
    cta: "ابدأ تجربتك المجانية",
    href: "/register",
    highlight: false,
  },
];

const comparison = [
  { feature: "الحجوزات",           basic: "غير محدود", advanced: "غير محدود", enterprise: "غير محدود" },
  { feature: "أعضاء الفريق",       basic: "10",         advanced: "30",          enterprise: "100"        },
  { feature: "الفروع",             basic: "1",          advanced: "3",           enterprise: "10"         },
  { feature: "جميع وحدات النظام",  basic: true,         advanced: true,          enterprise: true         },
  { feature: "التقارير المتقدمة",   basic: false,        advanced: true,          enterprise: true         },
  { feature: "التسويق والحملات",    basic: false,        advanced: true,          enterprise: true         },
  { feature: "إخفاء علامة ترميز OS",    basic: false,        advanced: true,          enterprise: true         },
  { feature: "مدير حساب مخصص",     basic: false,        advanced: false,         enterprise: true         },
];

const faqs = [
  { q: "هل يمكنني تغيير خطتي لاحقاً؟", a: "نعم، يمكنك الترقية أو التخفيض في أي وقت." },
  { q: "ما طرق الدفع المتاحة؟", a: "نقبل بطاقات مدى، فيزا، ماستركارد، وتحويل بنكي." },
  { q: "هل هناك عروض للدفع السنوي؟", a: "نعم، توفر خصم 20% على جميع الخطط عند الدفع سنوياً." },
  { q: "ماذا يحدث بعد استنفاد الحجوزات المجانية؟", a: "ستتلقى إشعاراً تدريجياً عند الاقتراب من الحد ثم عند بلوغه. لمواصلة استقبال الحجوزات، اختر إحدى الخطط المدفوعة." },
];

export function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <PublicLayout>
      <div className="pt-24 pb-16">
        {/* Header */}
        <div className="max-w-4xl mx-auto px-6 text-center mb-16">
          <h1 className="text-5xl font-black text-gray-900 mb-4">أسعار شفافة وبسيطة</h1>
          <p className="text-xl text-gray-500 mb-8">اختر الخطة المناسبة لحجم عملك</p>
          {/* Toggle */}
          <div className="inline-flex items-center gap-4 bg-gray-100 rounded-xl p-1.5">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${!yearly ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              شهري
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${yearly ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              سنوي
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">وفّر 20%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-8 flex flex-col ${
                  plan.highlight
                    ? "bg-brand-500 text-white shadow-2xl scale-105"
                    : "bg-white border border-gray-200"
                }`}
              >
                {plan.highlight && (
                  <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 self-start">
                    الأكثر شيوعاً
                  </span>
                )}
                <h3 className={`text-xl font-black mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${plan.highlight ? "text-blue-200" : "text-gray-500"}`}>{plan.desc}</p>
                <div className="mb-8">
                  {plan.monthly ? (
                    <>
                      <span className={`text-5xl font-black ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                        {yearly ? plan.yearly : plan.monthly}
                      </span>
                      <span className={`text-sm mr-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>
                        ر.س / شهرياً
                      </span>
                      {yearly && (
                        <p className={`text-xs mt-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>
                          يُدفع {(plan.yearly! * 12).toLocaleString()} ر.س سنوياً
                        </p>
                      )}
                    </>
                  ) : (
                    <span className={`text-3xl font-black ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                      حسب الطلب
                    </span>
                  )}
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-blue-100" : "text-gray-600"}`}>
                      <Check className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-white" : "text-brand-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className={`text-center py-3.5 rounded-xl font-bold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-white text-brand-500 hover:bg-gray-100"
                      : "bg-brand-500 text-white hover:bg-blue-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="mb-20">
            <h2 className="text-3xl font-black text-gray-900 text-center mb-10">مقارنة الخطط</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-4 pr-4 text-sm font-semibold text-gray-500 w-1/2">الميزة</th>
                    <th className="text-center py-4 text-sm font-semibold text-gray-700">الأساسي</th>
                    <th className="text-center py-4 text-sm font-bold text-brand-500">المتقدم</th>
                    <th className="text-center py-4 text-sm font-semibold text-gray-700">المؤسسي</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, i) => {
                    const cell = (v: string | boolean, highlight?: boolean) => {
                      if (typeof v === "boolean") {
                        return v
                          ? <Check className={`w-4 h-4 mx-auto ${highlight ? "text-brand-500 font-semibold" : "text-gray-400"}`} />
                          : <X className="w-4 h-4 mx-auto text-gray-200" />;
                      }
                      return <span className={highlight ? "font-semibold text-brand-500" : ""}>{v}</span>;
                    };
                    return (
                      <tr key={row.feature} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="py-3.5 pr-4 text-sm text-gray-700">{row.feature}</td>
                        <td className="py-3.5 text-center text-sm text-gray-500">{cell(row.basic)}</td>
                        <td className="py-3.5 text-center text-sm">{cell(row.advanced, true)}</td>
                        <td className="py-3.5 text-center text-sm text-gray-500">{cell(row.enterprise)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-black text-gray-900 text-center mb-10">أسئلة شائعة</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <details key={faq.q} className="bg-white rounded-xl border border-gray-200 group">
                  <summary className="px-6 py-4 cursor-pointer font-semibold text-gray-900 flex items-center justify-between list-none">
                    {faq.q}
                    <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
                  </summary>
                  <p className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
