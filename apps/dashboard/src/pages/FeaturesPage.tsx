import { Link } from "react-router-dom";
import { PublicLayout } from "../components/public/PublicLayout";

const features = [
  {
    icon: "📅",
    title: "إدارة الحجوزات",
    desc: "نظام حجز متكامل مصمم لتلبية احتياجات شركات الفعاليات.",
    points: [
      "تقويم تفاعلي بعرض يومي وأسبوعي وشهري",
      "إشعارات تلقائية للعملاء عبر الواتساب والبريد الإلكتروني",
      "إدارة حالة الحجز: جديد، مؤكد، مكتمل، ملغي",
      "دعم الحجوزات المتكررة والموسمية",
      "تتبع المدفوعات والدفعات الجزئية",
    ],
  },
  {
    icon: "👥",
    title: "إدارة العملاء (CRM)",
    desc: "قاعدة بيانات عملاء شاملة لبناء علاقات طويلة الأمد.",
    points: [
      "ملف عميل شامل مع سجل الحجوزات والمدفوعات",
      "تصنيف العملاء حسب النشاط والقيمة",
      "سجل التفاعلات والملاحظات",
      "إرسال رسائل ومتابعة مخصصة",
      "تصدير بيانات العملاء بصيغة Excel",
    ],
  },
  {
    icon: "💰",
    title: "المحاسبة والفواتير",
    desc: "إدارة مالية احترافية من الفاتورة حتى التقرير السنوي.",
    points: [
      "إنشاء فواتير احترافية بضغطة واحدة",
      "تتبع المدفوعات والمبالغ المعلقة",
      "تقارير الأرباح والخسائر الشهرية",
      "دعم ضريبة القيمة المضافة",
      "تحليل التدفق النقدي",
    ],
  },
  {
    icon: "📦",
    title: "إدارة المخزون والأصول",
    desc: "تتبع كامل لأصولك ومعداتك الخاصة بالفعاليات.",
    points: [
      "تسجيل جميع الأصول مع تفاصيلها",
      "جدولة استخدام المعدات لتجنب التعارض",
      "تنبيهات الصيانة الدورية",
      "تتبع الأصول في المخازن المختلفة",
      "تقارير إتاحة المعدات",
    ],
  },
  {
    icon: "👷",
    title: "إدارة الفريق",
    desc: "أدوات متكاملة لإدارة موظفيك ومزودي الخدمة.",
    points: [
      "جدولة وردیات الموظفين",
      "توزيع المهام وتتبع الإنجاز",
      "إدارة أدوار الصلاحيات",
      "سجل حضور وانصراف",
      "تقييم أداء الفريق",
    ],
  },
  {
    icon: "📊",
    title: "التقارير والتحليلات",
    desc: "بيانات دقيقة لاتخاذ قرارات أفضل.",
    points: [
      "لوحة تحكم تفاعلية مع مؤشرات الأداء",
      "تقارير الإيرادات والمصاريف",
      "تحليل الخدمات الأكثر طلباً",
      "معدلات رضا العملاء",
      "تصدير التقارير بصيغ متعددة",
    ],
  },
];

export function FeaturesPage() {
  return (
    <PublicLayout>
      <div className="pt-24">
        {/* Header */}
        <div className="max-w-4xl mx-auto px-6 text-center py-20">
          <h1 className="text-5xl font-black text-gray-900 mb-4">ميزات مصممة لنجاحك</h1>
          <p className="text-xl text-gray-500">
            كل أداة تحتاجها لإدارة عملك بكفاءة عالية واحترافية تامة
          </p>
        </div>

        {/* Feature sections */}
        {features.map((f, i) => (
          <section key={f.title} className={`py-20 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
            <div className="max-w-5xl mx-auto px-6">
              <div className={`flex flex-col md:flex-row items-center gap-12 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                <div className="flex-1">
                  <div className="text-6xl mb-6">{f.icon}</div>
                  <h2 className="text-3xl font-black text-gray-900 mb-4">{f.title}</h2>
                  <p className="text-lg text-gray-500 mb-8 leading-relaxed">{f.desc}</p>
                  <ul className="space-y-3">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-[#1A56DB] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">✓</span>
                        <span className="text-sm">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 h-64 flex items-center justify-center">
                    <span className="text-8xl opacity-50">{f.icon}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="py-24 bg-[#1A56DB] text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-4xl font-black text-white mb-4">جاهز لتجربة كل هذه الميزات؟</h2>
            <p className="text-blue-200 text-lg mb-8">ابدأ مجاناً لمدة 14 يوماً. لا حاجة لبطاقة ائتمانية.</p>
            <Link
              to="/register"
              className="inline-block bg-white text-[#1A56DB] px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              ابدأ مجاناً الآن
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
