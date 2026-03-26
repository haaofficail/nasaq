/**
 * GuidePage — دليل استخدام نسق الشامل
 * Route: /dashboard/guide
 */
import { useState } from "react";
import { clsx } from "clsx";
import {
  BookOpen, Search, CalendarCheck, Users, Banknote, Package, BarChart2,
  UserCheck, Settings, MessageSquare, Star, Boxes, ShoppingCart, CreditCard,
  ChevronDown, ChevronLeft, CheckCircle2, Flower2, Building2, Car, Scissors, Camera, Utensils, ShoppingBag,
} from "lucide-react";

// ─── Business type guide sections ────────────────────────────────────────────

const BUSINESS_GUIDES: Record<string, {
  label: string; icon: React.ElementType; color: string;
  setup: { step: string; title: string; desc: string }[];
  tips: string[];
}> = {
  general: {
    label: "جميع المنشآت",
    icon: Building2,
    color: "text-brand-600",
    setup: [
      { step: "1", title: "أكمل إعداد المنشأة", desc: "في الإعدادات: أدخل اسم المنشأة، الشعار، رقم الجوال، والعنوان. هذه المعلومات تظهر في الفواتير والرسائل للعملاء." },
      { step: "2", title: "أضف الخدمات أو المنتجات", desc: "من «الخدمات والمنتجات» أضف كل خدمة بسعرها ومدتها. الخدمة بدون سعر أو مدة لن تُقبل في الحجوزات." },
      { step: "3", title: "أضف فريق العمل", desc: "من «الفريق» أضف كل موظف بمسماه ودوره. الدور يحدد ما يستطيع الموظف رؤيته وتعديله في النظام." },
      { step: "4", title: "اربط طرق الدفع", desc: "من الإعدادات اربط حساب مدى أو محفظة STC Pay. بدون ذلك لن تتلقى مدفوعات إلكترونية." },
      { step: "5", title: "شارك رابط الحجز", desc: "كل منشأة لها رابط حجز عام. شارك الرابط مع عملائك أو أضفه في بيو انستقرام." },
    ],
    tips: [
      "فعّل الإشعارات من الإعدادات حتى تصلك تنبيهات الحجوزات فور وردودها.",
      "أضف صورة احترافية للخدمة — تزيد معدل التحويل بشكل ملحوظ.",
      "استخدم «التقارير» كل أسبوع لمراجعة أداء منشأتك.",
    ],
  },
  salon: {
    label: "صالونات وسبا",
    icon: Scissors,
    color: "text-pink-500",
    setup: [
      { step: "1", title: "حدد نوع الصالون", desc: "في الإعدادات اختر «صالون» كنوع منشأة. سيظهر لك الداشبورد المخصص بمؤشرات الصالون." },
      { step: "2", title: "أضف الموظفين مع تخصصاتهم", desc: "لكل موظف أضفه في الفريق، حدد الخدمات التي يتقنها. العميل يستطيع اختيار المختص عند الحجز." },
      { step: "3", title: "فعّل نظام الحضور", desc: "من «الفريق > الجداول والحضور» سجّل حضور وانصراف الفريق يومياً لحساب الرواتب والعمولات بدقة." },
      { step: "4", title: "أضف المستلزمات (Recipes)", desc: "لكل خدمة يمكنك تحديد المواد المستهلكة (مثل صبغة، كريم). يساعدك في حساب التكلفة الحقيقية." },
      { step: "5", title: "فعّل التقييمات", desc: "بعد كل حجز مكتمل يُرسل للعميل رسالة تقييم تلقائياً. راجع التقييمات من «التقييمات» لتحسين الخدمة." },
    ],
    tips: [
      "استخدم «الشرائح» لإرسال عروض خاصة لعملاء الصالون المميزين.",
      "فعّل التأكيد التلقائي للمواعيد بحيث يصل العميل تذكيراً قبل موعده بـ 24 ساعة.",
      "نسبة العمولة للموظف تُحسب تلقائياً على الحجوزات المكتملة.",
    ],
  },
  flower_shop: {
    label: "محلات زهور وتنسيق",
    icon: Flower2,
    color: "text-rose-500",
    setup: [
      { step: "1", title: "أضف منتجاتك كـ«خدمات»", desc: "كل تنسيق أو باقة زهور هي خدمة. أضفها من الخدمات مع صورة واضحة وسعر وأي خيارات إضافية (ألوان، مقاسات)." },
      { step: "2", title: "سجّل المخزون", desc: "من «المخزون > المواد» سجّل كل نوع ورد بكميته. النظام يعطيك تنبيهاً عند انخفاض المخزون." },
      { step: "3", title: "حدد مناطق التوصيل", desc: "من الإعدادات أضف مناطق التوصيل وتكاليفها. يمكنك ربطها كـ«إضافة» اختيارية على الطلبات." },
      { step: "4", title: "أنشئ باقات مناسبات", desc: "للمناسبات (أعياد ميلاد، زفاف) أنشئ باقات جاهزة. الباقة تجمع عدة خدمات بسعر موحد." },
    ],
    tips: [
      "أضف حقل «رسالة هدية» كسؤال مخصص على خدمات التنسيق.",
      "صوّر منتجاتك بجودة عالية — هي العامل الأهم في قرار الشراء.",
      "استخدم «السلات المتروكة» لمتابعة من أضاف طلباً ولم يكمله.",
    ],
  },
  car_rental: {
    label: "تأجير سيارات",
    icon: Car,
    color: "text-blue-500",
    setup: [
      { step: "1", title: "أضف كل سيارة كأصل", desc: "من «المخزون > الأصول» أضف كل سيارة بلوحة أرقامها وموديلها. النظام يتتبع حالتها (متاحة/مؤجرة/صيانة)." },
      { step: "2", title: "أنشئ خدمة لكل فئة", desc: "مثال: «سيدان اقتصادية»، «SUV فاخرة». كل فئة لها سعر يومي وحدها الأقصى من الكيلومترات." },
      { step: "3", title: "أضف شروط الاستخدام كأسئلة", desc: "أضف أسئلة مخصصة: رقم الرخصة، تاريخ الانتهاء، عمر السائق. هذه تُملأ من العميل عند الحجز." },
      { step: "4", title: "حدد التأمين كإضافة", desc: "أنشئ إضافة «تأمين شامل» بسعر يومي إضافي. يمكن للعميل إضافتها أو حذفها عند الحجز." },
    ],
    tips: [
      "راجع «الحجوزات» يومياً لمتابعة تسليم واستلام السيارات.",
      "ربط الأصل (السيارة) بالحجز يجعل النظام يمنع تأجيرها مرتين في نفس الوقت.",
    ],
  },
  photography: {
    label: "تصوير وإنتاج",
    icon: Camera,
    color: "text-violet-500",
    setup: [
      { step: "1", title: "صنّف جلساتك", desc: "أضف تصنيفات: «تصوير أفراد»، «تصوير منتجات»، «تصوير أفراح». ثم أضف كل جلسة تحت تصنيفها المناسب." },
      { step: "2", title: "حدد المدة بدقة", desc: "الجلسة ساعتين = 120 دقيقة. دقة المدة تمنع تداخل المواعيد في التقويم." },
      { step: "3", title: "أضف الخيارات كإضافات", desc: "مثال: «إضافة ساعة»، «طباعة 10 صور»، «تعديل متقدم». كل إضافة لها سعر منفصل." },
      { step: "4", title: "اجمع تفاصيل الجلسة", desc: "أضف أسئلة مخصصة: نوع الأزياء، الموقع المفضل، الأسلوب المطلوب. توثيق متطلبات العميل قبل الجلسة." },
    ],
    tips: [
      "استخدم «المتطلبات» لتحديد الكاميرا أو المعدات اللازمة لكل نوع جلسة.",
      "الدفع المسبق (30-50%) يضمن جدية العميل قبل تأكيد الموعد.",
    ],
  },
  restaurant: {
    label: "مطاعم وكافيهات",
    icon: Utensils,
    color: "text-orange-500",
    setup: [
      { step: "1", title: "أضف طاولاتك كأصول", desc: "كل طاولة هي أصل بسعتها. النظام يمنع حجز نفس الطاولة مرتين في نفس الوقت." },
      { step: "2", title: "أنشئ خدمات الحجز", desc: "مثال: «حجز طاولة 2 أشخاص»، «حجز خاص 10 أشخاص». حدد السعة لكل منها." },
      { step: "3", title: "أضف منيو كإضافات (اختياري)", desc: "يمكن للعميل اختيار باقة طعام مسبقة عند الحجز كإضافة. مناسب للحفلات والمناسبات." },
      { step: "4", title: "فعّل نظام الطلبات الإلكترونية", desc: "من الإعدادات فعّل QR Code للطاولات. العميل يطلب من هاتفه مباشرة." },
    ],
    tips: [
      "اربط حجوزات المناسبات بسؤال «مناسبة خاصة» لتجهيز مفاجآت.",
      "استخدم «التقارير» لمعرفة أكثر الأوقات طلباً وتعديل العروض وفقاً لها.",
    ],
  },
  retail: {
    label: "متاجر ومبيعات",
    icon: ShoppingBag,
    color: "text-emerald-600",
    setup: [
      { step: "1", title: "أضف منتجاتك كخدمات", desc: "كل منتج هو خدمة بنوع «منتج». أضف الاسم والسعر والصورة. الكمية في المخزون تُدار منفصلاً." },
      { step: "2", title: "أدر المخزون من «المواد»", desc: "سجّل كل منتج في المخزون بكميته وحد التنبيه. ستصلك إشعارات عند اقتراب النفاد." },
      { step: "3", title: "فعّل POS للبيع المباشر", desc: "من «نقطة البيع» تستطيع بيع المنتجات مباشرة لعميل حاضر وإنشاء فاتورة فورية." },
      { step: "4", title: "أنشئ عروضاً وباقات", desc: "اجمع منتجات في «باقة» بسعر خاص. يمكنك تحديد مدة صلاحية العرض." },
    ],
    tips: [
      "استخدم «الشرائح» لإرسال عروض خاصة للعملاء المتكررين.",
      "فعّل «السلات المتروكة» لاسترجاع العملاء الذين لم يكملوا طلباتهم.",
    ],
  },
};

// ─── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "bookings",
    icon: CalendarCheck,
    label: "الحجوزات",
    color: "bg-brand-50 text-brand-600",
    href: "/dashboard/bookings",
    questions: [
      { q: "ما الفرق بين «معلّق» و«مؤكد»؟", a: "«معلّق» يعني الحجز وصل لكن لم تراجعه. «مؤكد» يعني راجعته وأبلغت العميل. الحجوزات الإلكترونية تظهر معلقة حتى تؤكدها." },
      { q: "هل يصل العميل إشعار تلقائي؟", a: "نعم عند تأكيد الحجز يُرسل إشعار واتساب/رسالة نصية إذا كانت خدمة الرسائل مفعّلة." },
      { q: "ما «حالة الدفع»؟", a: "مستقلة عن حالة الحجز. «مدفوع» يعني تم استلام المبلغ كاملاً. «جزئي» يعني دفع عربون فقط." },
      { q: "كيف أُلغي حجزاً؟", a: "افتح الحجز وغيّر حالته إلى «ملغي». النظام لا يحذف الحجوزات لضمان سجل كامل." },
    ],
  },
  {
    id: "catalog",
    icon: Package,
    label: "الخدمات والمنتجات",
    color: "bg-violet-50 text-violet-600",
    href: "/dashboard/catalog",
    questions: [
      { q: "من أين أبدأ في إضافة خدماتي؟", a: "أنشئ التصنيفات أولاً (اختياري)، ثم أضف كل خدمة تحت تصنيفها مع السعر والمدة." },
      { q: "ما «مدة الخدمة» وكيف تؤثر؟", a: "الوقت الذي تستغرقه الخدمة فعلياً. يستخدمه التقويم لمنع تداخل المواعيد. أدخلها بدقة." },
      { q: "ما الفرق بين الخدمة والإضافة؟", a: "الخدمة يحجزها العميل كمنتج أساسي. الإضافة خيار يُرفق مع الخدمة مقابل رسوم إضافية." },
      { q: "كيف أوقف خدمة مؤقتاً؟", a: "افتح الخدمة وغيّر الحالة إلى «موقوفة» أو «مسودة». لن تظهر للعملاء الجدد." },
    ],
  },
  {
    id: "customers",
    icon: Users,
    label: "العملاء",
    color: "bg-emerald-50 text-emerald-600",
    href: "/dashboard/customers",
    questions: [
      { q: "هل يُضاف العميل تلقائياً؟", a: "نعم. عند أي حجز إلكتروني أو حجز جديد تُدخل فيه رقم جوال العميل، يُنشأ له ملف تلقائياً." },
      { q: "ما «الشريحة» وكيف تستخدمها؟", a: "الشريحة مجموعة عملاء بخصائص مشتركة (مثل: حجزوا أكثر من 3 مرات). تستخدمها لإرسال عروض مخصصة." },
      { q: "كيف أرى تاريخ العميل؟", a: "افتح ملف العميل. ستجد كل حجوزاته، مدفوعاته، وتقييماته في مكان واحد." },
    ],
  },
  {
    id: "finance",
    icon: Banknote,
    label: "المالية",
    color: "bg-amber-50 text-amber-600",
    href: "/dashboard/finance",
    questions: [
      { q: "ما الفرق بين الفاتورة والمصروف؟", a: "الفاتورة إيراد من العميل. المصروف تكلفة تدفعها أنت (إيجار، رواتب، مشتريات)." },
      { q: "كيف يُحسب «صافي الربح»؟", a: "إجمالي الإيرادات ناقص إجمالي المصروفات في نفس الفترة." },
      { q: "متى تظهر الفاتورة كـ«مدفوعة»؟", a: "عند تسجيل دفعة كاملة لها. يمكنك تسجيل دفعات جزئية تتراكم حتى يكتمل المبلغ." },
      { q: "ما «قيود اليومية»؟", a: "سجل محاسبي تفصيلي لكل حركة مالية. تُنشأ تلقائياً مع كل فاتورة ومصروف لو كان المحاسب يحتاجها." },
    ],
  },
  {
    id: "team",
    icon: UserCheck,
    label: "الفريق",
    color: "bg-blue-50 text-blue-600",
    href: "/dashboard/team",
    questions: [
      { q: "ما الخطوة الأولى لإضافة موظف؟", a: "اذهب لـ«الأدوار والمسميات» وأنشئ مسمى وظيفي أولاً، ثم أضف الموظف وحدد مسماه." },
      { q: "كيف أمنع موظفاً من رؤية الإيرادات؟", a: "حدد دوره كـ«staff» عند إنشاء المسمى. موظفو staff لا يرون أرقام المالية." },
      { q: "لماذا لا يستطيع الموظف الدخول؟", a: "تحقق: (1) حالته «نشط»، (2) فعّل حسابه عبر رابط التفعيل، (3) يستخدم رقم الجوال الصحيح." },
      { q: "ما «العمولة» وكيف تُحسب؟", a: "نسبة مئوية تُحسب على إجمالي مبيعات الموظف المكتملة. تُضبط في إعدادات الموظف." },
    ],
  },
  {
    id: "reports",
    icon: BarChart2,
    label: "التقارير",
    color: "bg-indigo-50 text-indigo-600",
    href: "/dashboard/reports",
    questions: [
      { q: "ما أهم التقارير لمتابعة أداء المنشأة؟", a: "تقرير المبيعات (الإيرادات)، تقرير مبيعات الحجوزات (الأداء التشغيلي)، وتقرير التحصيل (الفواتير المتأخرة)." },
      { q: "هل يمكنني تصدير التقارير؟", a: "نعم، كل تقرير يحتوي على زر «تصدير CSV» تستطيع فتحه في Excel أو Google Sheets." },
      { q: "ما «معدل التحصيل»؟", a: "نسبة الفواتير المدفوعة من إجمالي الفواتير الصادرة. 100% يعني كل فواتيرك تم تحصيلها." },
    ],
  },
  {
    id: "inventory",
    icon: Boxes,
    label: "المخزون",
    color: "bg-teal-50 text-teal-600",
    href: "/dashboard/inventory",
    questions: [
      { q: "ما الفرق بين الأصول والمواد؟", a: "الأصول معدات ثابتة ذات قيمة (كاميرا، سيارة). المواد مستهلكات تُعاد تعبئتها (ورق، بودر، زيت)." },
      { q: "متى أتلقى تنبيه «مخزون منخفض»؟", a: "عندما تصل الكمية دون الحد الأدنى الذي حددته لكل مادة." },
      { q: "كيف أربط أصلاً بحجز؟", a: "عند إنشاء الحجز يمكنك تحديد الأصل المطلوب. سيصبح «محجوزاً» طوال مدة الحجز تلقائياً." },
    ],
  },
  {
    id: "reviews",
    icon: Star,
    label: "التقييمات",
    color: "bg-yellow-50 text-yellow-600",
    href: "/dashboard/reviews",
    questions: [
      { q: "كيف يصل العميل رابط التقييم؟", a: "تلقائياً بعد إكمال الحجز. يُرسل رسالة واتساب/SMS برابط التقييم." },
      { q: "هل يمكنني الرد على التقييمات؟", a: "نعم، من صفحة التقييمات تستطيع الرد على كل تقييم. الردود تُحسّن ثقة العملاء الجدد." },
    ],
  },
  {
    id: "marketing",
    icon: MessageSquare,
    label: "التسويق",
    color: "bg-pink-50 text-pink-600",
    href: "/dashboard/segments",
    questions: [
      { q: "ما «الشريحة المستهدفة»؟", a: "مجموعة عملاء تشاركوا خاصية معينة (مثل: لم يحجزوا منذ شهر). تستخدمها لإرسال عروض مخصصة لهم." },
      { q: "ما «السلة المتروكة»؟", a: "عميل بدأ عملية حجز ولم يكملها. تتابعه ببرسالة تذكير أو عرض خاص." },
    ],
  },
  {
    id: "subscriptions",
    icon: CreditCard,
    label: "الاشتراكات",
    color: "bg-purple-50 text-purple-600",
    href: "/dashboard/customer-subscriptions",
    questions: [
      { q: "كيف أبيع باقة اشتراك لعميل؟", a: "من «الباقات» أنشئ الباقة بالخدمات والعدد والسعر. ثم بعها للعميل من ملفه مباشرة." },
      { q: "ما «الاستخدام» في الاشتراك؟", a: "عدد الجلسات التي استفاد منها العميل مقارنة بالحد الأقصى في الباقة." },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function GuidePage() {
  const [search, setSearch]             = useState("");
  const [openFeature, setOpenFeature]   = useState<string | null>(null);
  const [activeType, setActiveType]     = useState("general");

  const lowerSearch = search.toLowerCase();
  const filteredFeatures = FEATURES.filter(f =>
    !lowerSearch ||
    f.label.includes(search) ||
    f.questions.some(q => q.q.includes(search) || q.a.includes(search))
  );

  const guide = BUSINESS_GUIDES[activeType] || BUSINESS_GUIDES.general;
  const GuideIcon = guide.icon;

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">دليل نسق الشامل</h1>
            <p className="text-sm text-gray-400 mt-0.5">كل ما تحتاجه لتشغيل منشأتك بشكل صحيح</p>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            placeholder="ابحث في الدليل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400 bg-gray-50"
          />
        </div>
      </div>

      {/* Business type selector */}
      {!search && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">دليل حسب نوع منشأتك</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BUSINESS_GUIDES).map(([key, g]) => {
              const Icon = g.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveType(key)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
                    activeType === key
                      ? "bg-brand-50 border-brand-200 text-brand-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <Icon className={clsx("w-4 h-4", activeType === key ? "text-brand-500" : "text-gray-400")} />
                  {g.label}
                </button>
              );
            })}
          </div>

          {/* Setup steps */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <GuideIcon className={clsx("w-4 h-4", guide.color)} />
              <h3 className="text-sm font-semibold text-gray-900">خطوات الإعداد الصحيح — {guide.label}</h3>
            </div>
            <ol className="space-y-3">
              {guide.setup.map(s => (
                <li key={s.step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            {guide.tips.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 mb-2">نصائح ذهبية</p>
                <ul className="space-y-1.5">
                  {guide.tips.map((tip, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-amber-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />{tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature Q&A */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 px-1">الأسئلة الشائعة حسب الميزة</h2>
        {filteredFeatures.map(feature => {
          const Icon = feature.icon;
          const isOpen = openFeature === feature.id;
          return (
            <div key={feature.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpenFeature(isOpen ? null : feature.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", feature.color.split(" ")[0])}>
                  <Icon className={clsx("w-4 h-4", feature.color.split(" ")[1])} />
                </div>
                <span className="flex-1 text-sm font-semibold text-gray-900 text-right">{feature.label}</span>
                <span className="text-xs text-gray-400">{feature.questions.length} سؤال</span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronLeft className="w-4 h-4 text-gray-400" />}
              </button>

              {isOpen && (
                <div className="border-t border-gray-50 divide-y divide-gray-50">
                  {feature.questions.map(faq => (
                    <details key={faq.q} className="group">
                      <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-gray-50/50 text-sm font-medium text-gray-700 list-none">
                        {faq.q}
                        <ChevronDown className="w-3.5 h-3.5 text-gray-300 group-open:rotate-180 transition-transform shrink-0 mr-2" />
                      </summary>
                      <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                    </details>
                  ))}
                  <div className="px-5 py-3 bg-gray-50/50">
                    <a href={feature.href} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                      فتح {feature.label} <ChevronLeft className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">لم تجد إجابتك؟</h3>
        <p className="text-sm text-gray-500">تواصل مع فريق الدعم عبر الواتساب أو البريد الإلكتروني. نسعد بمساعدتك في أي وقت.</p>
      </div>
    </div>
  );
}
