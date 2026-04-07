/**
 * PropertyGuidePage — دليل نظام العقارات الشامل
 * Route: /property/guide
 */
import { useState } from "react";
import { clsx } from "clsx";
import {
  Building2, Home, Users, FileText, CreditCard, Wrench,
  ClipboardList, FolderOpen, BarChart3, ShieldCheck,
  HardHat, ChevronDown, ChevronLeft, CheckCircle2,
  TrendingUp, MapPin, Megaphone, Search, DollarSign,
  AlertTriangle, BookOpen, Zap, ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step { step: string; title: string; desc: string; link?: string }
interface Section {
  id: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
  tagline: string;
  steps: Step[];
  tips: string[];
}

// ─── Sections Data ─────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "setup",
    icon: Building2,
    color: "text-brand-600",
    bg: "bg-brand-50",
    label: "الإعداد الأولي",
    tagline: "الخطوات الأساسية لبدء استخدام النظام",
    steps: [
      {
        step: "1",
        title: "أضف عقاراتك",
        desc: "من «العقارات» أضف كل عقار بالبيانات الكاملة: النوع، الموقع، المساحة، سعر الشراء. هذه هي الوحدة الأساسية في النظام.",
        link: "/property/properties",
      },
      {
        step: "2",
        title: "أضف الوحدات",
        desc: "لكل عقار أضف وحداته (شققه / مكاتبه / محلاته). حدد رقم الوحدة، الطابق، المساحة، الإيجار الشهري والسنوي، وعداد الكهرباء والماء.",
        link: "/property/units",
      },
      {
        step: "3",
        title: "سجّل المستأجرين",
        desc: "من «المستأجرون» أنشئ ملف لكل مستأجر: الهوية الوطنية / الإقامة، الجوال، بيانات الطوارئ. المستأجر الموجود مسبقاً كعميل يُربط تلقائياً.",
        link: "/property/tenants",
      },
      {
        step: "4",
        title: "أنشئ العقد الأول",
        desc: "من «العقود» اختر الوحدة والمستأجر، حدد المدة وقيمة الإيجار ودورية السداد. بعد الحفظ تُضاف الوحدة كـ «مشغولة» تلقائياً.",
        link: "/property/contracts",
      },
      {
        step: "5",
        title: "وثّق في منصة إيجار",
        desc: "بعد إنشاء العقد، اذهب إلى ejar.sa ووثّق العقد. عد إلى ترميز OS وأدخل رقم عقد إيجار في بطاقة العقد. هذا إلزامي قانونياً.",
        link: "/property/contracts",
      },
    ],
    tips: [
      "ابدأ بعقار واحد كامل قبل إضافة البقية — ستتعلم النظام بسرعة.",
      "صوّر كل وحدة قبل التسكين وارفع الصور في «الفحوصات» — تحميك عند المغادرة.",
      "سعر الإيجار السنوي = الشهري × 12 — يُحسب تلقائياً.",
    ],
  },
  {
    id: "contracts",
    icon: FileText,
    color: "text-violet-600",
    bg: "bg-violet-50",
    label: "العقود والتعاقد",
    tagline: "من إنشاء العقد حتى التجديد والإنهاء",
    steps: [
      {
        step: "1",
        title: "إنشاء العقد",
        desc: "اختر: العقار > الوحدة > المستأجر > نوع العقد (سكني/تجاري) > مدة التعاقد > قيمة الإيجار > دورية السداد. للتجاري: VAT 15% تُضاف تلقائياً.",
        link: "/property/contracts",
      },
      {
        step: "2",
        title: "التوثيق في إيجار",
        desc: "وثّق العقد على ejar.sa ثم أدخل رقم عقد إيجار في ترميز OS. بادج إيجار يتحول من أحمر إلى أخضر. العقد الموثق = سند تنفيذي قانوني.",
        link: "/property/contracts",
      },
      {
        step: "3",
        title: "إصدار الفواتير",
        desc: "من «الفواتير» اضغط «أصدر فواتير الشهر» — ينشئ فواتير كل العقود النشطة بضغطة واحدة. للتجاري: QR ZATCA يُنشأ تلقائياً.",
        link: "/property/invoices",
      },
      {
        step: "4",
        title: "التجديد",
        desc: "قبل انتهاء العقد بـ 60 يوم يصلك تنبيه. من بطاقة العقد اضغط «تجديد». تنبيه: إذا العقار في الرياض داخل النطاق العمراني — الزيادة في الإيجار ممنوعة لـ 5 سنوات.",
        link: "/property/contracts",
      },
      {
        step: "5",
        title: "الإنهاء",
        desc: "من بطاقة العقد اضغط «إنهاء» وحدد السبب والتاريخ. النظام يحسب الودية المستردة والمتأخرات ويغير حالة الوحدة لـ «شاغرة» تلقائياً.",
        link: "/property/contracts",
      },
    ],
    tips: [
      "تنبيه تثبيت الرياض: لا تزيد الإيجار للعقارات السكنية في الرياض قبل 5 سنوات من تاريخ العقد الأول.",
      "العقد الموثق في إيجار = سند تنفيذي — إذا المستأجر أخّر الدفع أكثر من 30 يوم تستطيع التنفيذ عبر ناجز.sa",
      "حدد «تجديد تلقائي» على العقود طويلة الأمد لتجنب الانقطاع.",
    ],
  },
  {
    id: "payments",
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    label: "الفواتير والمدفوعات",
    tagline: "تحصيل الإيجارات وتسجيل المدفوعات",
    steps: [
      {
        step: "1",
        title: "إصدار الفواتير الشهرية",
        desc: "من «الفواتير» اضغط «أصدر فواتير الشهر» لإنشاء كل الفواتير المستحقة مرة واحدة. أو أنشئ فاتورة يدوياً لعقد معين.",
        link: "/property/invoices",
      },
      {
        step: "2",
        title: "إرسال التذكير",
        desc: "من «الفواتير» اختر الفواتير المستحقة واضغط «أرسل تذكيرات» — ترسل رسائل واتساب للمستأجرين تلقائياً. أو تذكير فردي من بطاقة العقد.",
        link: "/property/invoices",
      },
      {
        step: "3",
        title: "تسجيل الدفعة السريعة",
        desc: "من «دفعة سريعة»: اختر المستأجر أو العقد، أدخل المبلغ وطريقة الدفع، اضغط «سجّل». ينشئ سند قبض + يحدث حالة الفاتورة + يسجّل قيد محاسبي تلقائياً.",
        link: "/property/quick-payment",
      },
      {
        step: "4",
        title: "الفواتير المتأخرة",
        desc: "من «الشاشة الذكية» تظهر الفواتير المتأخرة مباشرة. من «التقارير > المدفوعات المتأخرة» تحصل على تقرير كامل بالمتأخرين وأعمار الديون.",
        link: "/property/smart-home",
      },
    ],
    tips: [
      "دفعة سريعة = أسرع طريقة — 3 ثوانٍ فقط لتسجيل أي دفعة.",
      "الفواتير التجارية تُصدر مع QR ZATCA تلقائياً — متوافق مع الفوترة الإلكترونية.",
      "إذا الدفع عبر إيجار سداد — سجّله كطريقة «إيجار سداد» لمطابقة الحسابات.",
    ],
  },
  {
    id: "maintenance",
    icon: Wrench,
    color: "text-orange-600",
    bg: "bg-orange-50",
    label: "الصيانة والمصروفات",
    tagline: "متابعة أعمال الصيانة وإدارة مصروفات العقار",
    steps: [
      {
        step: "1",
        title: "استقبال طلب الصيانة",
        desc: "المستأجر يرفع الطلب عبر بوابته، أو أنت من «الصيانة > طلب جديد». حدد الفئة (سباكة/كهرباء/تكييف...) والأولوية (عادي/عاجل).",
        link: "/property/maintenance",
      },
      {
        step: "2",
        title: "التعيين والاعتماد",
        desc: "اضغط «تعيين» واختر المقاول/الفني. إذا التكلفة تتجاوز الحد — يحتاج اعتماد من المالك. بعد الاعتماد اضغط «ابدأ» ثم «مكتمل» بعد الانتهاء.",
        link: "/property/maintenance",
      },
      {
        step: "3",
        title: "تسجيل المصروفات",
        desc: "من «المصروفات» سجّل كل مصروف: فئته (صيانة/تأمين/رسوم حكومية/عمولة مكتب...)، المبلغ، الجهة المدفوع لها، هل يُحمّل على المالك أو المستأجر.",
        link: "/property/expenses",
      },
      {
        step: "4",
        title: "ملخص المصروفات",
        desc: "من «المصروفات» اضغط «ملخص» لترى توزيع المصروفات على الفئات. مقارنة الإيرادات بالمصروفات تظهر في «التقارير > الربح والخسارة».",
        link: "/property/expenses",
      },
    ],
    tips: [
      "استخدم Kanban board في الصيانة (عمود: مُبلَّغ / مُراجَع / مُعتمد / قيد التنفيذ / مكتمل).",
      "سجّل التكلفة الفعلية بعد الانتهاء — يؤثر مباشرة في تقرير الربح والخسارة.",
      "رسوم الأراضي البيضاء تُدرج كمصروف تحت فئة «white_land_fee» — تُربط بالعقار تلقائياً.",
    ],
  },
  {
    id: "inspections",
    icon: ClipboardList,
    color: "text-teal-600",
    bg: "bg-teal-50",
    label: "الفحوصات والوثائق",
    tagline: "محاضر التسليم والاستلام والأرشفة الرقمية",
    steps: [
      {
        step: "1",
        title: "فحص التسليم (Move-in)",
        desc: "عند دخول المستأجر: من «الفحوصات» أنشئ محضر تسليم. وثّق حالة كل بند (مطبخ، حمامات، غرف، أبواب، شبابيك، كهرباء، سباكة...) بالصور.",
        link: "/property/inspections",
      },
      {
        step: "2",
        title: "فحص التسلّم (Move-out)",
        desc: "عند المغادرة: أنشئ محضر استلام من نفس النوع. النظام يقارن تلقائياً بين محضر التسليم والاستلام ويقترح قيم خصومات من الوديعة.",
        link: "/property/inspections",
      },
      {
        step: "3",
        title: "التوقيع الرقمي",
        desc: "اطلب توقيع المستأجر والمدير مباشرة على الشاشة. المحضر الموقع يُحفظ كـ PDF قابل للتنزيل والطباعة.",
        link: "/property/inspections",
      },
      {
        step: "4",
        title: "أرشفة الوثائق",
        desc: "من «الوثائق» ارفع كل وثائق العقار: الصك، رخصة البناء، التأمين، رخصة الدفاع المدني. النظام ينبهك قبل انتهاء أي وثيقة بـ 30 يوم.",
        link: "/property/documents",
      },
    ],
    tips: [
      "محضر التسليم الموقع = حمايتك القانونية — لا تتنازل عنه.",
      "الفحص الدوري كل 6 أشهر يكشف المشاكل مبكراً قبل تفاقمها.",
      "وثيقة التأمين المنتهية = مخاطرة كبيرة — تأكد من التجديد قبل 30 يوم.",
    ],
  },
  {
    id: "compliance",
    icon: ShieldCheck,
    color: "text-red-600",
    bg: "bg-red-50",
    label: "الامتثال التنظيمي",
    tagline: "متطلبات هيئة العقار، إيجار، بلدي، ZATCA",
    steps: [
      {
        step: "1",
        title: "توثيق العقود في إيجار",
        desc: "كل عقد إيجار يجب توثيقه في ejar.sa. الغرامة على عدم التوثيق قانونية. في ترميز OS: اضغط على بادج إيجار الأحمر في العقد لتسجيل رقم التوثيق.",
        link: "/property/compliance",
      },
      {
        step: "2",
        title: "السجل العيني (rer.sa)",
        desc: "كل عقار يجب تسجيله في منصة السجل العقاري rer.sa. سجّل رقم التسجيل في بيانات العقار. يوفر حماية قانونية كاملة للملكية.",
        link: "/property/properties",
      },
      {
        step: "3",
        title: "رخص البناء والإشغال",
        desc: "تأكد من وجود: رخصة بناء سارية (بلدي.gov.sa) + شهادة إشغال + رخصة دفاع مدني. سجّل هذه البيانات في تفاصيل العقار.",
        link: "/property/compliance",
      },
      {
        step: "4",
        title: "رسوم الأراضي البيضاء",
        desc: "إذا العقار أرض بيضاء داخل النطاق العمراني — تطبّق رسوم 2.5%-10% سنوياً حسب المنطقة. سجّل في بيانات العقار هل تنطبق عليه الرسوم وتاريخ السداد.",
        link: "/property/compliance",
      },
      {
        step: "5",
        title: "رخصة فال (للوسطاء)",
        desc: "إذا مكتب وساطة عقارية — يجب الحصول على رخصة فال من rega.gov.sa. سجّل رقم الرخصة في إعدادات المنشأة. يظهر على عقود الوساطة.",
        link: "/property/compliance",
      },
    ],
    tips: [
      "لوحة الامتثال تعطيك نسبة (%) لكل عقار — اهدف لـ 100% في كل عقار.",
      "عقد موثق في إيجار + متأخر > 30 يوم = يحق لك تقديم طلب تنفيذ عبر ناجز.sa مباشرة.",
      "الفواتير التجارية (VAT 15%) يجب أن تحتوي QR ZATCA — يُنشأ تلقائياً في ترميز OS.",
    ],
  },
  {
    id: "reports",
    icon: BarChart3,
    color: "text-blue-600",
    bg: "bg-blue-50",
    label: "التقارير والتحليل",
    tagline: "قرارات مبنية على بيانات دقيقة",
    steps: [
      {
        step: "1",
        title: "تقرير الإشغال",
        desc: "يظهر نسبة إشغال كل عقار والوحدات الشاغرة. استخدمه لاتخاذ قرار التسعير: إشغال منخفض = راجع سعر الإيجار.",
        link: "/property/reports",
      },
      {
        step: "2",
        title: "تقرير الربح والخسارة",
        desc: "يجمع الإيرادات (الإيجارات) مقابل المصروفات (صيانة، تأمين، رسوم). يعطيك صافي الدخل لكل عقار.",
        link: "/property/reports",
      },
      {
        step: "3",
        title: "تقرير ROI",
        desc: "عائد الاستثمار = صافي الدخل السنوي ÷ سعر الشراء × 100. مقارنة بين العقارات تظهر أيها الأفضل استثمارياً.",
        link: "/property/investment",
      },
      {
        step: "4",
        title: "تقرير المدفوعات المتأخرة",
        desc: "قائمة بكل المستأجرين المتأخرين مع عدد أيام التأخير ومبلغ الدين. الأساس في متابعة التحصيل الأسبوعية.",
        link: "/property/reports",
      },
    ],
    tips: [
      "راجع تقرير الإشغال شهرياً — الشغور المطوّل = خسارة مباشرة.",
      "اطبع تقرير المالك الشهري (صاحب المكتب) من «تقرير المالك» وأرسله للمالك.",
      "تقرير ROI يساعدك في قرار البيع أو الاحتفاظ — العائد أقل من 4% = وقت التقييم.",
    ],
  },
  {
    id: "construction",
    icon: HardHat,
    color: "text-amber-600",
    bg: "bg-amber-50",
    label: "إدارة البناء",
    tagline: "متابعة مشاريع الإنشاء والتطوير",
    steps: [
      {
        step: "1",
        title: "إنشاء مشروع",
        desc: "من «إدارة البناء» أضف المشروع: اسمه، نوعه (بناء جديد/تجديد/إضافة)، بيانات المقاول والمهندس، رخصة البناء، الميزانية الإجمالية.",
        link: "/property/construction",
      },
      {
        step: "2",
        title: "المراحل والتقدم",
        desc: "قسّم المشروع لمراحل (تصميم، تشريد، أساسات، هيكل، تشطيب، تسليم). لكل مرحلة: تاريخ بداية ونهاية، ميزانية، نسبة إنجاز.",
        link: "/property/construction",
      },
      {
        step: "3",
        title: "السجل اليومي",
        desc: "سجّل يومياً: عدد العمال، الأعمال المنجزة، المواد الواردة، المشاكل، الصور. يبني أرشيفاً وثائقياً كاملاً للمشروع.",
        link: "/property/construction",
      },
      {
        step: "4",
        title: "المستخلصات",
        desc: "أنشئ مستخلص دوري للمقاول: نسبة الإنجاز × قيمة العقد - الاستقطاع (10%) = الصافي المستحق. الاعتماد الرقمي داخل النظام.",
        link: "/property/construction",
      },
    ],
    tips: [
      "الاستقطاع 10% محجوز حتى انتهاء فترة الضمان — تتبعه تلقائياً.",
      "أوامر التغيير كلها موثقة مع تأثيرها على الميزانية والوقت.",
      "تقرير المشروع الشامل (تقدم + ميزانية + مخاطر) يُرسل للمالك من تبويب «التقارير».",
    ],
  },
  {
    id: "marketing",
    icon: Megaphone,
    color: "text-pink-600",
    bg: "bg-pink-50",
    label: "التسويق والبيع",
    tagline: "إعلانات الشاغر ومتابعة المهتمين وعمليات البيع",
    steps: [
      {
        step: "1",
        title: "إنشاء إعلان",
        desc: "عند شغور وحدة: من «الإعلانات» أنشئ إعلاناً بالصور والوصف والسعر. يظهر في صفحة عامة للمنشأة يمكن مشاركتها مع المهتمين.",
        link: "/property/listings",
      },
      {
        step: "2",
        title: "متابعة الاستفسارات",
        desc: "كل استفسار يدخل في «الاستفسارات» مع حالته (جديد / تم التواصل / جدولة معاينة / تفاوض). تتابع بشكل منظم حتى التأجير.",
        link: "/property/inquiries",
      },
      {
        step: "3",
        title: "عملية البيع",
        desc: "من «عمليات البيع» سجّل: بيانات المشتري، طريقة البيع (كاش / تمويل بنكي / تقسيط)، سعر البيع، نسبة العمولة، تاريخ نقل الصك.",
        link: "/property/sales",
      },
    ],
    tips: [
      "الصفحة العامة /available/[slug] تعرض الوحدات المتاحة — شاركها في وسائل التواصل.",
      "العمولة 2.5% للوسيط — تُحسب تلقائياً عند تسجيل البيع.",
      "استخدم «الاستفسارات» كـ CRM مصغّر لمتابعة كل عميل محتمل.",
    ],
  },
  {
    id: "portfolio",
    icon: TrendingUp,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    label: "المحفظة والاستثمار",
    tagline: "نظرة شاملة على قيمة وأداء محفظتك العقارية",
    steps: [
      {
        step: "1",
        title: "المحفظة العقارية",
        desc: "من «المحفظة» ترى إجمالي قيمة محفظتك، توزيعها (مستثمرة/أراضي/تحت الإنشاء/للبيع) والإيرادات الشهرية. بطاقات ملونة لكل عقار.",
        link: "/property/portfolio",
      },
      {
        step: "2",
        title: "تحليل الاستثمار",
        desc: "من «تحليل الاستثمار»: العائد السنوي، سنوات الاسترداد، مقارنة بين العقارات، توصية النظام (احتفظ/بيع/ارفع الإيجار).",
        link: "/property/investment",
      },
      {
        step: "3",
        title: "تقييمات السوق",
        desc: "من «التقييمات» سجّل تقييمات السوق الدورية. يبني chart لتطور قيمة كل عقار عبر الزمن — مهم للتفاوض والحصول على تمويل.",
        link: "/property/valuations",
      },
    ],
    tips: [
      "العائد المثالي للعقارات السكنية السعودية: 5%-8% سنوياً.",
      "العقار بعائد < 4% = راجع سعر الإيجار أو فكر في البيع.",
      "سجّل التقييم مرة في السنة على الأقل — يحميك من المبالغة أو التقليل عند البيع.",
    ],
  },
  {
    id: "office",
    icon: Users,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    label: "مكاتب إدارة الأملاك",
    tagline: "للمكاتب التي تدير عقارات لصالح ملاك آخرين",
    steps: [
      {
        step: "1",
        title: "تسجيل الملاك",
        desc: "من «الملاك» سجّل كل مالك: اسمه، هويته، IBAN حسابه، نسبة عمولة الإدارة (5%-10%). كل عقار يُربط بمالكه.",
        link: "/property/owners",
      },
      {
        step: "2",
        title: "فصل الحسابات",
        desc: "المصروفات لها خيار «يُحمّل على المالك» — يظهر في تقرير المالك. الإيرادات - المصروفات - عمولة المكتب = صافي يتحول للمالك.",
        link: "/property/owners",
      },
      {
        step: "3",
        title: "عقود الوساطة",
        desc: "للوساطة العقارية: من «عقود الوساطة» أنشئ عقداً: نوع العميل (بائع/مشتري/مستأجر)، نسبة العمولة، خدمات الحصرية. يُطبع بتوقيع فال.",
        link: "/property/brokerage",
      },
      {
        step: "4",
        title: "تقرير المالك الشهري",
        desc: "من «التقارير > تقرير المالك» اختر المالك والشهر — ينشئ كشف حساب: الإيرادات والمصروفات والعمولة والصافي. أرسله مباشرة للمالك.",
        link: "/property/reports",
      },
    ],
    tips: [
      "رخصة فال إلزامية لمكاتب الوساطة — سجّلها في الإعدادات وتظهر على كل العقود.",
      "عمولة الإدارة تُحسب تلقائياً من الإيجارات المحصّلة — لا يد عمل يدوية.",
      "بوابة المستأجر تتيح للمستأجر رؤية فواتيره ودفعها دون تدخلك.",
    ],
  },
  {
    id: "portal",
    icon: Home,
    color: "text-green-600",
    bg: "bg-green-50",
    label: "بوابة المستأجر",
    tagline: "تجربة متكاملة للمستأجر بدون تدخل",
    steps: [
      {
        step: "1",
        title: "وصول المستأجر",
        desc: "المستأجر يدخل على بوابته برقم العقد أو رقم جواله. لا يحتاج حساب أو كلمة مرور — بسيطة ومباشرة.",
        link: "/property/portal",
      },
      {
        step: "2",
        title: "ما يراه المستأجر",
        desc: "فواتيره الحالية والمتأخرة، كشف حسابه الكامل، محاضر الفحص، بيانات عقده. كل شيء في مكان واحد.",
        link: "/property/portal",
      },
      {
        step: "3",
        title: "الدفع الإلكتروني",
        desc: "المستأجر يدفع مباشرة عبر البوابة (مدى / بطاقة / محفظة). المبلغ يُسجّل تلقائياً في حسابه في ترميز OS.",
        link: "/property/portal",
      },
      {
        step: "4",
        title: "رفع طلب صيانة",
        desc: "من البوابة يرفع المستأجر طلب صيانة بالصور والوصف. يصلك الطلب مباشرة في «الصيانة» وتتابع معه.",
        link: "/property/portal",
      },
    ],
    tips: [
      "شارك رابط البوابة مع كل مستأجر جديد — يقلل المكالمات اليدوية بشكل كبير.",
      "المستأجر المنتهي عقده لا يستطيع الدخول — حماية تلقائية.",
      "كل إجراء في البوابة يُسجّل في سجل الأحداث.",
    ],
  },
];

// ─── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "أضف عقاراً", href: "/property/properties", icon: Building2, bg: "bg-brand-500" },
  { label: "عقد جديد", href: "/property/contracts/new", icon: FileText, bg: "bg-violet-500" },
  { label: "دفعة سريعة", href: "/property/quick-payment", icon: CreditCard, bg: "bg-emerald-500" },
  { label: "طلب صيانة", href: "/property/maintenance", icon: Wrench, bg: "bg-orange-500" },
  { label: "لوحة الامتثال", href: "/property/compliance", icon: ShieldCheck, bg: "bg-red-500" },
  { label: "الشاشة الذكية", href: "/property/smart-home", icon: Zap, bg: "bg-amber-500" },
];

// ─── Regulations ──────────────────────────────────────────────────────────────

const REGULATIONS = [
  {
    title: "منصة إيجار (ejar.sa)",
    desc: "توثيق عقود الإيجار — إلزامي قانونياً. العقد الموثق = سند تنفيذي.",
    color: "border-brand-200 bg-brand-50",
    icon: FileText,
    iconColor: "text-brand-600",
  },
  {
    title: "السجل العيني (rer.sa)",
    desc: "تسجيل الملكية العقارية — يحمي حقوقك ويمنع النزاعات.",
    color: "border-emerald-200 bg-emerald-50",
    icon: MapPin,
    iconColor: "text-emerald-600",
  },
  {
    title: "تثبيت إيجارات الرياض",
    desc: "ممنوع رفع الإيجار السكني في الرياض لـ 5 سنوات من تاريخ أول عقد.",
    color: "border-orange-200 bg-orange-50",
    icon: AlertTriangle,
    iconColor: "text-orange-600",
  },
  {
    title: "رسوم الأراضي البيضاء",
    desc: "تطبّق على الأراضي داخل النطاق: 2.5% إلى 10% سنوياً حسب المنطقة.",
    color: "border-red-200 bg-red-50",
    icon: DollarSign,
    iconColor: "text-red-600",
  },
  {
    title: "ZATCA — الفوترة الإلكترونية",
    desc: "العقارات التجارية: فاتورة بـ QR إلزامية + VAT 15%. يُنشأ تلقائياً في ترميز OS.",
    color: "border-violet-200 bg-violet-50",
    icon: CheckCircle2,
    iconColor: "text-violet-600",
  },
  {
    title: "رخصة فال (rega.gov.sa)",
    desc: "مكاتب الوساطة العقارية: رخصة فال إلزامية. سجّلها في الإعدادات.",
    color: "border-teal-200 bg-teal-50",
    icon: ShieldCheck,
    iconColor: "text-teal-600",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function AccordionSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const Icon = section.icon;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-right"
        onClick={() => setOpen(!open)}
      >
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", section.bg)}>
          <Icon className={clsx("w-5 h-5", section.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{section.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{section.tagline}</p>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronLeft className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-50">
          {/* Steps */}
          <div className="space-y-3 pt-4">
            {section.steps.map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className={clsx(
                  "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5",
                  section.bg, section.color
                )}>
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                    {s.link && (
                      <button
                        onClick={() => navigate(s.link!)}
                        className="text-xs text-brand-600 border border-brand-200 bg-brand-50 rounded-lg px-2 py-0.5 hover:bg-brand-100 transition-colors shrink-0"
                      >
                        افتح
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 mb-2">نصائح مهمة</p>
            {section.tips.map((tip, i) => (
              <div key={i} className="flex gap-2 text-xs text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PropertyGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8 max-w-3xl mx-auto" dir="rtl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate("/property/smart-home")}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            الشاشة الذكية
          </button>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">دليل نظام العقارات</h1>
            <p className="text-sm text-gray-500 mt-1">
              إدارة الإيجارات، المحفظة العقارية، البناء، التسويق، والامتثال التنظيمي السعودي — كل شيء في مكان واحد.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">روابط سريعة</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.href}
                onClick={() => navigate(a.href)}
                className="flex flex-col items-center gap-1.5 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all text-center"
              >
                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", a.bg)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-gray-600 font-medium">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Intro Banner */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-brand-800 text-sm">القاعدة الذهبية</p>
            <p className="text-xs text-brand-700 mt-1 leading-relaxed">
              أي إجراء في ترميز OS لا يتجاوز 3 ضغطات. بعد كل خطوة — النظام يقترح الخطوة التالية تلقائياً.
              ابدأ من «الشاشة الذكية» كل يوم للاطلاع على المطلوب منك.
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">الدليل التفصيلي — اختر القسم</p>
        <div className="space-y-3">
          {SECTIONS.map((s) => (
            <AccordionSection key={s.id} section={s} />
          ))}
        </div>
      </div>

      {/* Regulations */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">البيئة التنظيمية السعودية (2026)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REGULATIONS.map((reg) => {
            const Icon = reg.icon;
            return (
              <div key={reg.title} className={clsx("border rounded-xl p-4 flex gap-3", reg.color)}>
                <Icon className={clsx("w-4 h-4 shrink-0 mt-0.5", reg.iconColor)} />
                <div>
                  <p className="font-semibold text-gray-800 text-xs">{reg.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{reg.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflow Summary */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-4">المسار المثالي لعقد جديد</h2>
        <div className="flex flex-wrap gap-2 items-center">
          {[
            "أضف العقار", "أضف الوحدة", "أضف المستأجر",
            "أنشئ العقد", "وثّق في إيجار", "أصدر الفاتورة",
            "أرسل التذكير", "سجّل الدفع", "سند قبض PDF",
          ].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-1.5 font-medium">
                {step}
              </span>
              {i < arr.length - 1 && (
                <ChevronLeft className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center pb-4">
        ترميز OS — نظام إدارة العقارات الذكي — يخدم المالك المباشر ومكاتب إدارة الأملاك
      </p>
    </div>
  );
}
