/**
 * CatalogPage — Unified Catalog with tabs
 * Routes: /dashboard/catalog?tab=services|categories|addons
 */
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui";
import { ServicesPage } from "./ServicesPage";
import { CategoriesPage } from "./CategoriesPage";
import { AddonsPage } from "./AddonsPage";
import { useBusiness } from "@/hooks/useBusiness";

export function CatalogPage() {
  const biz = useBusiness();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "services";

  const TABS = [
    { id: "services",   label: biz.terminology.items },
    { id: "categories", label: biz.terminology.categories },
    { id: "addons",     label: "الاضافات" },
  ];

  return (
    <div dir="rtl">
      <PageHeader
        title={biz.terminology.catalog}
        description={`أدر ${biz.terminology.items} وتصنيفاتك والاضافات من مكان واحد`}
        tabs={TABS}
        activeTab={tab}
        onTabChange={(id) => setSearchParams({ tab: id })}
      />
      {tab === "services"   && <ServicesPage embedded />}
      {tab === "categories" && <CategoriesPage />}
      {tab === "addons"     && <AddonsPage />}

      {/* Guide */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">دليل الخدمات والمنتجات — الطريقة الصحيحة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            {
              title: "الخدمات",
              badge: "الأساس",
              badgeColor: "bg-brand-50 text-brand-600",
              desc: "كل شيء يحجزه عميلك مباشرة. أضف كل خدمة تقدمها بسعرها ومدتها وتصنيفها. هذه البنود تظهر في صفحة الحجز الإلكتروني.",
              steps: ["أنشئ التصنيفات أولاً", "ثم أضف الخدمات وارتبطها بالتصنيف", "حدد مدة الخدمة لتجنب تعارض المواعيد"],
            },
            {
              title: "التصنيفات",
              badge: "التنظيم",
              badgeColor: "bg-violet-50 text-violet-600",
              desc: "مجموعات تنظّم خدماتك أمام العميل. مثال: «علاجات الشعر»، «العناية بالبشرة». لا تظهر التصنيفات بمفردها بل عبر الخدمات المرتبطة بها.",
              steps: ["أضف تصنيفاً لكل فئة خدمات", "لا حاجة لتصنيف إذا كانت خدماتك قليلة", "التصنيف الجيد يسهّل بحث العميل"],
            },
            {
              title: "الإضافات",
              badge: "رفع القيمة",
              badgeColor: "bg-emerald-50 text-emerald-600",
              desc: "خيارات اختيارية يضيفها العميل على حجزه. كل إضافة لها سعر منفصل وتُضاف لفاتورة الحجز تلقائياً.",
              steps: ["أنشئ إضافة لكل خيار مدفوع", "ربطها بالخدمات المناسبة", "تظهر للعميل عند الحجز الإلكتروني"],
            },
          ].map(s => (
            <div key={s.title} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.badgeColor}`}>{s.badge}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{s.desc}</p>
              <ul className="space-y-1">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-gray-400">
                    <span className="text-brand-400 shrink-0">•</span>{step}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h3 className="font-semibold text-gray-900 mb-4 text-sm">الأسئلة الشائعة</h3>
        <div className="space-y-3">
          {[
            { q: "من أين أبدأ إذا كانت هذه أول مرة؟", a: "ابدأ بالتصنيفات (اختياري إن كانت خدماتك قليلة)، ثم أضف الخدمات وحدد لكل منها السعر والمدة. الإضافات تأتي لاحقاً." },
            { q: "ما الفرق بين «الخدمة» و«الباقة» و«الإضافة»؟", a: "الخدمة هي المنتج الأساسي الذي يحجزه العميل. الباقة مجموعة خدمات بسعر موحّد. الإضافة خيار إضافي يختاره العميل مع الخدمة مثل «التغليف الفاخر»." },
            { q: "كيف يؤثر «إيقاف» الخدمة على الحجوزات الحالية؟", a: "إيقاف الخدمة يمنع العملاء الجدد من حجزها فقط، لا يؤثر على الحجوزات المؤكدة مسبقاً." },
            { q: "ما معنى «مدة الخدمة»؟", a: "الوقت الذي تستغرقه الخدمة فعلياً. يستخدمه النظام لحساب التقويم ومنع التعارض في المواعيد. أدخل دائماً مدة واقعية." },
            { q: "هل الإضافات مربوطة بخدمات محددة؟", a: "نعم، عند إنشاء الإضافة تختار الخدمات التي تظهر معها. يمكنك ربطها بكل الخدمات أو بخدمات محددة فقط." },
          ].map(faq => (
            <details key={faq.q} className="border border-gray-100 rounded-xl">
              <summary className="px-4 py-3 text-sm text-gray-700 cursor-pointer font-medium hover:bg-gray-50 rounded-xl">{faq.q}</summary>
              <p className="px-4 pb-3 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
