import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { useSearchParams } from "react-router-dom";
import {
  Globe, Palette, Eye, Settings2, Check, ChevronUp, ChevronDown,
  Loader2, CheckCircle, ExternalLink, Monitor, Smartphone, Zap,
  Layers, Users, Image, Star, MapPin, Phone, Info, ShoppingBag,
  Rss, AlertCircle, Plus, Pencil, Trash2, EyeOff, Layout, Type,
  Code, FileText, MessageSquare, Copy, Link2, Save,
} from "lucide-react";
import { websiteApi, settingsApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { Button, Modal, PageHeader, RichTextEditor } from "@/components/ui";
import { MediaPickerModal } from "@/components/media/MediaPickerModal";
import { fmtDate } from "@/lib/utils";

// ══ Constants ════════════════════════════════════════════════════

const TEMPLATES = [
  { id: "classic",   name: "كلاسيكي",  desc: "نظيف واحترافي",              grad: "linear-gradient(135deg,#5b9bd5 0%,#4a8bc5 100%)",  defaultColor: "#5b9bd5" },
  { id: "modern",    name: "عصري",     desc: "خطوط جريئة وزوايا حادة",    grad: "linear-gradient(135deg,#1a1a2e 0%,#2d3561 100%)",  defaultColor: "#4f46e5" },
  { id: "luxury",    name: "فاخر",     desc: "للصالونات والسبا الراقية",   grad: "linear-gradient(135deg,#9c304b 0%,#c8a951 100%)",  defaultColor: "#c8a951" },
  { id: "minimal",   name: "بسيط",     desc: "للمستقلين والمنشآت الصغيرة", grad: "linear-gradient(135deg,#94a3b8 0%,#cbd5e1 100%)", defaultColor: "#64748b" },
  { id: "cafe",      name: "كافيه",    desc: "للمطاعم والكافيهات",          grad: "linear-gradient(135deg,#d97706 0%,#92400e 100%)", defaultColor: "#d97706" },
  { id: "boutique",  name: "بوتيك",    desc: "لمحلات الورود والهدايا",      grad: "linear-gradient(135deg,#be185d 0%,#9d174d 100%)", defaultColor: "#be185d" },
  { id: "bold",      name: "جريء",     desc: "للصالونات الرجالية",          grad: "linear-gradient(135deg,#111827 0%,#374151 100%)", defaultColor: "#111827" },
  { id: "corporate", name: "مؤسسي",    desc: "للشركات وتأجير المعدات",      grad: "linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%)", defaultColor: "#1e40af" },
  { id: "festive",   name: "احتفالي",  desc: "للفعاليات والمناسبات",        grad: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)", defaultColor: "#7c3aed" },
  { id: "starter",     name: "بداية",         desc: "صفحة واحدة — ابدأ بسرعة",         grad: "linear-gradient(135deg,#059669 0%,#047857 100%)",  defaultColor: "#059669" },
  { id: "clinic",      name: "عيادة",          desc: "للعيادات والمراكز الطبية",          grad: "linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%)",  defaultColor: "#0ea5e9" },
  { id: "gym",         name: "صالة رياضية",    desc: "للأندية وصالات اللياقة",            grad: "linear-gradient(135deg,#f97316 0%,#c2410c 100%)",  defaultColor: "#f97316" },
  { id: "hotel",       name: "فندق",           desc: "للفنادق وأماكن الإقامة",            grad: "linear-gradient(135deg,#78716c 0%,#44403c 100%)",  defaultColor: "#78716c" },
  { id: "carrental",   name: "تأجير سيارات",   desc: "لشركات تأجير السيارات",             grad: "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)",  defaultColor: "#1d4ed8" },
  { id: "photography", name: "تصوير",          desc: "لاستوديوهات التصوير",               grad: "linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)",  defaultColor: "#7c3aed" },
  { id: "academy",     name: "أكاديمية",       desc: "للمدارس ومراكز التدريب",            grad: "linear-gradient(135deg,#0d9488 0%,#0f766e 100%)",  defaultColor: "#0d9488" },
  { id: "realestate",  name: "عقارات",         desc: "للمكاتب العقارية",                  grad: "linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%)",  defaultColor: "#1e40af" },
  { id: "laundry",     name: "مغسلة",          desc: "لمغاسل الملابس",                    grad: "linear-gradient(135deg,#06b6d4 0%,#0891b2 100%)",  defaultColor: "#06b6d4" },
  { id: "retail",      name: "متجر أزياء",     desc: "لمحلات الملابس والبوتيك",           grad: "linear-gradient(135deg,#ec4899 0%,#db2777 100%)",  defaultColor: "#ec4899" },
  { id: "maintenance", name: "صيانة",          desc: "لمراكز الصيانة والتقنية",           grad: "linear-gradient(135deg,#475569 0%,#334155 100%)",  defaultColor: "#475569" },
];

const FONTS = ["IBM Plex Sans Arabic", "Tajawal", "Cairo", "Almarai", "Noto Sans Arabic"];

// ── Full template presets — complete starter content per business type ──
const TEMPLATE_PRESETS: Record<string, Partial<BuilderState>> = {
  classic: {
    heroTitle: "مرحباً بكم في منشأتنا",
    heroSubtitle: "خدمات احترافية بأيدي خبراء متميزين — نلتزم بأعلى معايير الجودة",
    aboutText: "منشأتنا تأسست بهدف تقديم أفضل الخدمات لعملائنا الكرام. نعتمد على فريق من المختصين ذوي الخبرة العالية لضمان رضاكم في كل زيارة. نحن هنا لنجعل تجربتك استثنائية.",
    sectionsOrder: ["hero","services","about","reviews","gallery","location","contact"],
    hiddenSections: [],
    announcement: "أهلاً بك في منشأتنا — احجز موعدك الآن ووفّر 15% على أول زيارة",
    statsItems: [{ value: "+1200", label: "عميل راضٍ" }, { value: "10", label: "سنوات خبرة" }, { value: "4.9", label: "تقييم العملاء" }],
    faqItems: [
      { q: "كيف أحجز موعداً؟", a: "يمكنك الحجز عبر زر «احجز الآن» في الصفحة الرئيسية أو عبر واتساب مباشرة." },
      { q: "هل يمكن إلغاء الحجز؟", a: "نعم، يمكن إلغاء أو تغيير الموعد قبل 24 ساعة مجاناً." },
      { q: "ما هي طرق الدفع المتاحة؟", a: "نقبل الدفع نقداً، بطاقة، أو عبر تحويل بنكي." },
    ],
    heroSettings: { buttonText: "احجز الآن", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "من أعمالنا", images: ["https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "احجز موعدك اليوم", subtitle: "تجربة استثنائية تنتظرك — لا تتأخر", buttonText: "احجز الآن", bgColor: "" } },
    ],
  },
  luxury: {
    heroTitle: "تجربة الرفاهية الحقيقية",
    heroSubtitle: "استرخِ، تجدّد، وأشرقي بجمالك الطبيعي",
    aboutText: "في عالمنا، كل تفصيلة تُعنى بها بحب واتقان. نقدم لك تجربة تجميل راقية تجمع بين أحدث تقنيات العناية وأجواء الهدوء الفاخر. فريقنا من أبرع المختصين مستعد لإبراز جمالك الحقيقي.",
    sectionsOrder: ["hero","services","about","gallery","reviews","location","contact"],
    hiddenSections: [],
    announcement: "عروض VIP حصرية هذا الشهر — احجزي الآن واحصلي على هدية ترحيب فاخرة",
    statsItems: [{ value: "+500", label: "عميلة سعيدة" }, { value: "8", label: "سنوات من الفخامة" }, { value: "5★", label: "تقييمنا الدائم" }],
    faqItems: [
      { q: "هل تستخدمون منتجات طبيعية؟", a: "نعم، جميع منتجاتنا مستوردة ومعتمدة ومناسبة لجميع أنواع البشرة." },
      { q: "كم تستغرق الجلسة؟", a: "تتراوح جلساتنا بين 45 دقيقة وساعتين حسب الخدمة المختارة." },
      { q: "هل يتوفر باقات شهرية؟", a: "نعم، لدينا باقات اشتراك شهرية بأسعار مميزة لعميلاتنا الدائمات." },
    ],
    heroSettings: { buttonText: "احجزي موعدك", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "لمسة فارقة في كل تفصيلة", images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "ابدئي رحلتك نحو الجمال", subtitle: "احجزي جلستك الأولى واكتشفي الفرق", buttonText: "احجزي الآن", bgColor: "" } },
    ],
  },
  bold: {
    heroTitle: "ستايل يعبّر عنك",
    heroSubtitle: "قصة شعر تفرق — بأيدي أمهر الحلاقين في المدينة",
    aboutText: "صالون رجالي متخصص في أحدث صيحات الموضة. نقدم خدمات الحلاقة والعناية الرجالية بأعلى مستوى من الاحترافية. أجواء عصرية، خدمة مميزة، ونتيجة تتحدث عن نفسها.",
    sectionsOrder: ["hero","services","team","about","gallery","reviews","contact"],
    hiddenSections: [],
    announcement: "الثلاثاء خصم 20% على جميع الخدمات — احجز مقعدك الآن",
    statsItems: [{ value: "+3000", label: "قصة منجزة" }, { value: "15", label: "حلاق محترف" }, { value: "4.9", label: "تقييم قوقل" }],
    faqItems: [
      { q: "هل تقبلون زيارات بدون حجز؟", a: "ننصح بالحجز المسبق لضمان وقتك، لكننا نستقبل حسب توفر المواعيد." },
      { q: "ما أبرز خدماتكم؟", a: "قصات الشعر الحديثة، تشكيل اللحية، الحجامة، العناية بالبشرة، وخدمة VIP الشاملة." },
      { q: "هل تتوفر خدمة المنازل؟", a: "نعم، نوفر خدمة التنقل لكبار العملاء بحجز مسبق." },
    ],
    heroSettings: { buttonText: "احجز موعدك", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "أعمالنا تتحدث", images: ["https://images.unsplash.com/photo-1521498542256-5aeb47ba2b36?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "جهّز لوكيلك", subtitle: "موعد واحد يكفي عشان تحس بالفرق", buttonText: "احجز الآن", bgColor: "" } },
    ],
  },
  cafe: {
    heroTitle: "حيث تبدأ أفضل اللحظات",
    heroSubtitle: "مشروبات محضّرة بعناية — أجواء تخلّيك تنسى الوقت",
    aboutText: "كافيهنا مكان لأحلى اللقاءات والذكريات. نقدم أجود أنواع القهوة المختارة بعناية من أفضل المزارع العالمية، بجانب أشهى الوجبات الخفيفة التي تُكمل تجربتك.",
    sectionsOrder: ["hero","services","about","gallery","reviews","location","contact"],
    hiddenSections: [],
    announcement: "كل يوم ثلاثاء: اشتري قهوتين واحصل على الثالثة مجاناً",
    statsItems: [{ value: "+50", label: "نوع مشروب" }, { value: "7AM", label: "نفتح كل يوم" }, { value: "4.8", label: "تقييم عملائنا" }],
    faqItems: [
      { q: "هل لديكم خيارات نباتية؟", a: "نعم، لدينا بدائل نباتية لجميع مشروباتنا بما فيها حليب الشوفان والمكسرات." },
      { q: "هل يمكن حجز المكان للمجموعات؟", a: "بالتأكيد! تواصل معنا لحجز ركن خاص أو المكان كاملاً لمناسبتك." },
      { q: "هل توفرون توصيل؟", a: "نعم، نوفر التوصيل خلال نطاق المدينة عبر التواصل المباشر." },
    ],
    heroSettings: { buttonText: "اطلب الآن", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "من مطبخنا إلى طاولتك", images: ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "احجز طاولتك الآن", subtitle: "لا تفوّت أجواءنا المميزة — اطلب مكانك مسبقاً", buttonText: "احجز طاولة", bgColor: "" } },
    ],
  },
  boutique: {
    heroTitle: "حيث تُولد أجمل الذكريات",
    heroSubtitle: "باقات زهور مصممة بحب — لكل مناسبة قصة",
    aboutText: "متجرنا متخصص في تصميم باقات الزهور الفاخرة للمناسبات الخاصة والهدايا العاطفية. كل باقة نصممها تحمل رسالة مميزة، بأيدي فنانين متخصصين يبدعون بالألوان والتفاصيل.",
    sectionsOrder: ["hero","services","about","gallery","reviews","location","contact"],
    hiddenSections: [],
    announcement: "شحن مجاني لجميع الطلبات فوق 200 ريال — اطلب الآن",
    statsItems: [{ value: "+2000", label: "طلب منجز" }, { value: "24h", label: "توصيل سريع" }, { value: "100%", label: "زهور طازجة" }],
    faqItems: [
      { q: "كم يستغرق تصميم الباقة المخصصة؟", a: "يستغرق التصميم المخصص من ساعة حتى 24 ساعة حسب التعقيد والطلب." },
      { q: "هل تتوفر خدمة التوصيل؟", a: "نعم، نوفر التوصيل السريع لجميع مناطق المدينة بتغليف آمن يحافظ على الزهور." },
      { q: "ما المناسبات التي تخدمونها؟", a: "الأعراس، عيد الميلاد، التخرج، الخطوبة، والمناسبات الخاصة." },
    ],
    heroSettings: { buttonText: "اطلبي باقتك", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1490750967868-88df5691cc6b?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "أعمال أحدثت فرقاً", images: ["https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1457090592866-95001e6dd69b?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1544017578-cebbcc2eaeaf?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "فاجئ من تحب", subtitle: "باقة زهور مصممة خصيصاً لمناسبتك", buttonText: "اطلبي الآن", bgColor: "" } },
    ],
  },
  corporate: {
    heroTitle: "حلول متكاملة لأعمالكم",
    heroSubtitle: "خدمات احترافية تواكب طموحاتكم وترسّخ تفوقكم",
    aboutText: "شركتنا رائدة في مجالها منذ سنوات، نقدم باقة متكاملة من الخدمات المؤسسية والحلول العملية. نعمل مع شركات كبرى وصغيرة على حد سواء بنفس الاحترافية والتفاني.",
    sectionsOrder: ["hero","services","about","team","reviews","location","contact"],
    hiddenSections: ["gallery"],
    announcement: "عروض خاصة للشركات — تواصل معنا للحصول على عرض سعر مخصص",
    statsItems: [{ value: "+200", label: "عميل مؤسسي" }, { value: "15", label: "سنة في السوق" }, { value: "98%", label: "رضا العملاء" }],
    faqItems: [
      { q: "هل تقدمون خدمات للأفراد؟", a: "نركز أساساً على الشركات، لكننا نخدم أيضاً عملاء الأفراد في بعض الخدمات." },
      { q: "هل يوجد عقود سنوية؟", a: "نعم، لدينا باقات سنوية وعقود موقوتة تناسب احتياجات شركتكم." },
      { q: "كيف يتم التسعير؟", a: "التسعير يعتمد على حجم المشروع ومدته. تواصل معنا للحصول على عرض سعر مفصّل." },
    ],
    heroSettings: { buttonText: "تواصل معنا", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "text", content: { title: "لماذا تختارنا؟", content: "خبرة واسعة، فريق متخصص، وحلول مصممة خصيصاً لاحتياجاتكم. نلتزم بالجودة في كل خطوة ونضع رضاكم في صدارة أولوياتنا.", align: "right" } },
      { id: "cb2", type: "booking_cta", content: { title: "ابدأوا معنا اليوم", subtitle: "دعونا نناقش كيف نستطيع مساعدة شركتكم", buttonText: "احجز استشارة", bgColor: "" } },
    ],
  },
  festive: {
    heroTitle: "اجعل مناسبتك لا تُنسى",
    heroSubtitle: "تنظيم فعاليات احترافي — من الفكرة إلى آخر تفصيلة",
    aboutText: "متخصصون في تنظيم الفعاليات والمناسبات الخاصة بأعلى مستوى من الإبداع. من حفلات الأعراس والخطوبة إلى المؤتمرات والحفلات، نجعل كل فعالية تجربة تبقى في الذاكرة.",
    sectionsOrder: ["hero","services","about","gallery","reviews","contact"],
    hiddenSections: ["team","location"],
    announcement: "حجوزات موسم الأعراس مفتوحة — تواصل معنا لضمان تاريخك",
    statsItems: [{ value: "+300", label: "فعالية ناجحة" }, { value: "5★", label: "تقييم العروسين" }, { value: "100%", label: "التزام بالموعد" }],
    faqItems: [
      { q: "كم مدة التجهيز قبل الفعالية؟", a: "نبدأ التنسيق والتجهيز عادةً قبل 3-6 أشهر لضمان أفضل النتائج." },
      { q: "هل تشملون التصوير والتوثيق؟", a: "نعم، لدينا شركاء متخصصون في التصوير الاحترافي ضمن الباقة." },
      { q: "ما هي الباقات المتاحة؟", a: "لدينا باقات متنوعة تبدأ من الأساسية حتى VIP الشاملة. تواصل معنا للتفاصيل." },
    ],
    heroSettings: { buttonText: "احجز استشارة", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "لحظات خلّدناها بحب", images: ["https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "خلّي يومك الكبير مميزاً", subtitle: "تواصل معنا وابدأ التخطيط لمناسبتك الآن", buttonText: "تواصل معنا", bgColor: "" } },
    ],
  },
  modern: {
    heroTitle: "نصنع الفارق — بكل تفصيلة",
    heroSubtitle: "خدمات عصرية تواكب طموحك وتتجاوز توقعاتك",
    aboutText: "نؤمن أن التميز ليس خياراً، بل منهج حياة. فريقنا من المبدعين والمحترفين يعمل دائماً على تقديم تجربة استثنائية. نجمع بين الحداثة والجودة في كل خدمة نقدمها.",
    sectionsOrder: ["hero","services","about","gallery","reviews","contact"],
    hiddenSections: [],
    announcement: "انضم إلى أكثر من 5000 عميل راضٍ — احجز الآن",
    statsItems: [{ value: "+5000", label: "عميل موثوق" }, { value: "12", label: "جائزة تميز" }, { value: "99%", label: "رضا العملاء" }],
    faqItems: [
      { q: "ما الذي يميزكم؟", a: "نجمع بين الخبرة الواسعة والتقنيات الحديثة لنقدم نتائج تفوق المعايير المعتادة." },
      { q: "هل تقدمون ضمانات على الخدمة؟", a: "نعم، نضمن رضاك الكامل أو نُعيد الخدمة مجاناً." },
    ],
    heroSettings: { buttonText: "ابدأ الآن", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1200&auto=format&fit=crop", layout: "split" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "أحدث أعمالنا", images: ["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "الخطوة الأولى نحو التميز", subtitle: "احجز موعدك الآن وابدأ رحلة النجاح معنا", buttonText: "ابدأ معنا", bgColor: "" } },
    ],
  },
  minimal: {
    heroTitle: "بسيط، احترافي، فعّال",
    heroSubtitle: "أقدم لك ما تحتاجه بدقة واتقان — بلا تعقيد",
    aboutText: "أنا متخصص مستقل في مجالي، أقدم خدمات عالية الجودة بأسلوب يتميز بالوضوح والاحترافية. أؤمن بأن العمل الجيد يتحدث عن نفسه، وأسعى دائماً لتجاوز توقعات عملائي.",
    sectionsOrder: ["hero","services","about","reviews","contact"],
    hiddenSections: ["team","gallery","location"],
    announcement: "",
    statsItems: [{ value: "150+", label: "مشروع مكتمل" }, { value: "5", label: "سنوات خبرة" }, { value: "100%", label: "التزام بالمواعيد" }],
    faqItems: [
      { q: "ما طريقة التواصل المفضلة؟", a: "يمكنك التواصل عبر نموذج الموقع أو واتساب مباشرة لأسرع رد." },
      { q: "كيف تتم عملية التسليم؟", a: "أشاركك الملفات والتحديثات بشكل منتظم حتى تصل للنتيجة المثالية." },
    ],
    heroSettings: { buttonText: "تواصل معي", buttonLink: "", bgColor: "", imageUrl: "", layout: "minimal" },
    customBlocks: [
      { id: "cb1", type: "booking_cta", content: { title: "مستعد لمشروعك القادم", subtitle: "تواصل معي وسنبدأ بسرعة", buttonText: "تواصل معي", bgColor: "" } },
    ],
  },
  starter: {
    heroTitle: "مرحباً — يسعدنا خدمتك",
    heroSubtitle: "كل ما تحتاجه في مكان واحد — احجز بسهولة",
    aboutText: "منشأة نقدم فيها خدمات متميزة بأسلوب احترافي. نحرص على تقديم أفضل تجربة ممكنة لكل عميل في كل زيارة.",
    sectionsOrder: ["hero","services","about","contact"],
    hiddenSections: ["team","gallery","location","reviews"],
    announcement: "مرحباً بك — يسعدنا خدمتك دائماً",
    statsItems: [],
    faqItems: [{ q: "كيف أتواصل معكم؟", a: "عبر نموذج التواصل أدناه أو واتساب مباشرة." }],
    heroSettings: { buttonText: "احجز الآن", buttonLink: "", bgColor: "", imageUrl: "", layout: "minimal" },
    customBlocks: [
      { id: "cb1", type: "booking_cta", content: { title: "احجز موعدك", subtitle: "سريع وسهل", buttonText: "احجز", bgColor: "" } },
    ],
  },

  // ── عيادة ──────────────────────────────────────────────────────
  clinic: {
    heroTitle: "صحتك أمانة — نرعاها بخبرة واهتمام",
    heroSubtitle: "كوادر طبية متخصصة وأحدث الأجهزة لراحتك وطمأنينتك",
    aboutText: "عيادتنا تأسست لتقديم أعلى مستويات الرعاية الصحية في بيئة آمنة ومريحة. نضم نخبة من الأطباء المتخصصين والكوادر التمريضية المدربة، مع التزام تام بأعلى معايير الجودة والنظافة.",
    sectionsOrder: ["hero","services","about","team","reviews","location","contact"],
    hiddenSections: ["gallery"],
    announcement: "احجز موعدك الآن — لا انتظار، خدمة سريعة واحترافية",
    statsItems: [{ value: "+5000", label: "مريض تعافى" }, { value: "12", label: "طبيب متخصص" }, { value: "98%", label: "رضا المرضى" }],
    faqItems: [
      { q: "هل تقبلون التأمين الطبي؟", a: "نعم، نتعامل مع معظم شركات التأمين الطبي. تواصل معنا للتأكيد على شركتك." },
      { q: "ما أوقات الدوام؟", a: "نعمل من الأحد إلى الخميس 8 صباحاً حتى 10 مساءً، والسبت 9 صباحاً حتى 6 مساءً." },
      { q: "هل يمكن الحصول على تقرير طبي؟", a: "نعم، يمكن استخراج التقارير الطبية خلال 24 ساعة من طلب الحجز." },
      { q: "هل تقدمون خدمة الزيارات المنزلية؟", a: "نعم، نوفر زيارات منزلية في حالات معينة بحجز مسبق." },
    ],
    heroSettings: { buttonText: "احجز موعدك", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "text", content: { title: "لماذا نختلف؟", content: "نؤمن أن الرعاية الصحية تبدأ من الاستماع. طاقمنا الطبي يخصص الوقت الكافي لكل مريض، يشرح التشخيص بوضوح، ويضع خطة علاج مفصّلة. صحتك ليست مجرد ملف — هي أمانة نحملها بكل جدية.", align: "right" } },
      { id: "cb2", type: "gallery", content: { title: "مرافق عيادتنا", images: ["https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb3", type: "booking_cta", content: { title: "لا تؤجّل صحتك", subtitle: "احجز موعدك الآن ونحن نتكفل بالباقي", buttonText: "احجز موعداً", bgColor: "" } },
    ],
  },

  // ── صالة رياضية ───────────────────────────────────────────────
  gym: {
    heroTitle: "ابدأ تحولك اليوم",
    heroSubtitle: "أجهزة متطورة، مدربون محترفون، وبيئة تحفّزك على التفوق",
    aboutText: "صالتنا الرياضية مجهّزة بأحدث الأجهزة العالمية وتضم فريقاً من المدربين المعتمدين دولياً. نقدم برامج تدريبية مخصصة لكل مستوى — سواء كنت مبتدئاً أو رياضياً محترفاً. هدفنا الواحد: نتائج حقيقية تراها وتحسّها.",
    sectionsOrder: ["hero","services","team","about","gallery","reviews","contact"],
    hiddenSections: ["location"],
    announcement: "عضوية الشهر الأول بـ 50% — انضم الآن واستفد من العرض",
    statsItems: [{ value: "+800", label: "عضو نشط" }, { value: "20", label: "مدرب معتمد" }, { value: "5000m²", label: "مساحة التدريب" }],
    faqItems: [
      { q: "هل يوجد برنامج للمبتدئين؟", a: "نعم، لدينا برنامج مخصص للمبتدئين يشمل تقييم لياقة مجاني وجلسات توجيهية مع مدرب." },
      { q: "ما أوقات الدوام؟", a: "نعمل 7 أيام من الأسبوع من 5 صباحاً حتى 12 منتصف الليل." },
      { q: "هل تتوفر صالة للنساء؟", a: "نعم، لدينا قسم مخصص للنساء بمدربات متخصصات وأوقات دوام مستقلة." },
      { q: "هل يمكن تجميد العضوية؟", a: "نعم، يمكن تجميد العضوية لمدة شهر واحد مجاناً في السنة." },
    ],
    heroSettings: { buttonText: "انضم الآن", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "بيئة التدريب المثالية", images: ["https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "جلسة تجريبية مجانية", subtitle: "جرّب الصالة واعرف الفرق بنفسك — بدون أي التزام", buttonText: "احجز جلستك المجانية", bgColor: "" } },
    ],
  },

  // ── فندق ──────────────────────────────────────────────────────
  hotel: {
    heroTitle: "مكانك الثاني — حيث الراحة الحقيقية",
    heroSubtitle: "غرف فاخرة، خدمة لا تُنسى، وتجربة إقامة استثنائية",
    aboutText: "فندقنا يجمع بين الفخامة والدفء في قلب المدينة. نقدم لضيوفنا تجربة إقامة متكاملة تشمل غرفاً مريحة بأحدث المرافق، مطعماً راقياً، وخدمات استقبال على مدار الساعة. رضاؤك هو قياسنا الوحيد للنجاح.",
    sectionsOrder: ["hero","services","about","gallery","reviews","location","contact"],
    hiddenSections: ["team"],
    announcement: "حجز مباشر = أفضل سعر مضمون — احجز الآن ووفّر 20%",
    statsItems: [{ value: "120", label: "غرفة فاخرة" }, { value: "24/7", label: "خدمة الاستقبال" }, { value: "4.8★", label: "تقييم الضيوف" }],
    faqItems: [
      { q: "ما وقت تسجيل الوصول والمغادرة؟", a: "تسجيل الوصول من الساعة 3 عصراً، والمغادرة حتى 12 ظهراً. يمكن الطلب المبكر أو المتأخر برسوم رمزية." },
      { q: "هل تقدمون خدمة النقل من المطار؟", a: "نعم، نوفر خدمة النقل من وإلى المطار بحجز مسبق." },
      { q: "هل يوجد ردهة أو مطعم؟", a: "نعم، لدينا مطعم يقدم المأكولات العالمية والمحلية، وردهة قهوة مفتوحة طوال اليوم." },
      { q: "هل يسمح بإحضار الحيوانات الأليفة؟", a: "للأسف لا يسمح بإحضار الحيوانات الأليفة داخل الفندق." },
    ],
    heroSettings: { buttonText: "احجز غرفتك", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "لمحة من فندقنا", images: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1455587734955-081b22074882?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "احجز إقامتك المثالية", subtitle: "الأسعار الأفضل دائماً عبر موقعنا المباشر", buttonText: "احجز الآن", bgColor: "" } },
    ],
  },

  // ── تأجير سيارات ──────────────────────────────────────────────
  carrental: {
    heroTitle: "انطلق بحرية — سيارتك تنتظرك",
    heroSubtitle: "أسطول متنوع، أسعار تنافسية، وخدمة توصيل للموقع",
    aboutText: "شركتنا متخصصة في تأجير السيارات بأعلى معايير السلامة والجودة. أسطولنا يضم أحدث الموديلات من مختلف الفئات لتناسب جميع احتياجاتك. نقدم خدمات مرنة بعقود يومية وأسبوعية وشهرية مع خيار التوصيل.",
    sectionsOrder: ["hero","services","about","gallery","reviews","location","contact"],
    hiddenSections: ["team"],
    announcement: "تأجير لأكثر من 3 أيام — خصم 15% تلقائي",
    statsItems: [{ value: "+200", label: "سيارة في الأسطول" }, { value: "5", label: "مناطق التسليم" }, { value: "24/7", label: "خدمة الطوارئ" }],
    faqItems: [
      { q: "ما الوثائق المطلوبة للتأجير؟", a: "الهوية الوطنية أو الإقامة، ورخصة القيادة السارية، وبطاقة ائتمان باسمك." },
      { q: "هل يمكن إلغاء الحجز؟", a: "يمكن الإلغاء مجاناً قبل 24 ساعة من موعد الاستلام." },
      { q: "هل السيارات مؤمّنة؟", a: "نعم، جميع سياراتنا مشمولة بتأمين شامل. كما نوفر خيار التأمين الإضافي." },
      { q: "هل تقدمون خدمة سائق؟", a: "نعم، نوفر خدمة سيارة مع سائق عند الطلب بتكلفة إضافية." },
    ],
    heroSettings: { buttonText: "احجز سيارتك", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "من أسطولنا", images: ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "ابدأ رحلتك الآن", subtitle: "احجز سيارتك في دقيقتين ونوصّلها لك", buttonText: "احجز سيارة", bgColor: "" } },
    ],
  },

  // ── استوديو تصوير ─────────────────────────────────────────────
  photography: {
    heroTitle: "نُجمّد اللحظات الجميلة",
    heroSubtitle: "تصوير احترافي يروي قصتك بأجمل تفاصيلها",
    aboutText: "استوديو تصوير متخصص في التصوير الاحترافي للأفراد والعائلات والشركات. نجمع بين التقنية الحديثة والحس الفني لنمنحك صوراً تحملها في قلبك قبل يدك. كل جلسة تصوير هي تجربة فريدة نصممها خصيصاً لك.",
    sectionsOrder: ["hero","services","about","gallery","reviews","contact"],
    hiddenSections: ["team","location"],
    announcement: "باقة تصوير عائلية بسعر خاص هذا الشهر — احجز الآن",
    statsItems: [{ value: "+3000", label: "جلسة تصوير" }, { value: "8", label: "مصور محترف" }, { value: "100%", label: "رضا العملاء" }],
    faqItems: [
      { q: "كم تستغرق جلسة التصوير؟", a: "تتراوح الجلسات من ساعة حتى 4 ساعات حسب الباقة والعدد." },
      { q: "متى تستلم الصور؟", a: "يتم تسليم الصور المعدّلة خلال 5-7 أيام عمل بعد جلسة التصوير." },
      { q: "هل التصوير خارج الاستوديو متاح؟", a: "نعم، نوفر التصوير في الهواء الطلق وفي المواقع المختلفة بتكلفة إضافية." },
      { q: "هل يمكن طباعة الصور؟", a: "نعم، نوفر خدمة الطباعة الاحترافية بمقاسات مختلفة وتأطير فاخر." },
    ],
    heroSettings: { buttonText: "احجز جلستك", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "من أعمالنا", images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1604537529428-15bcbeecfe4d?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "احجز جلستك الآن", subtitle: "لحظاتك تستحق أن تُخلَّد باحترافية", buttonText: "احجز الآن", bgColor: "" } },
    ],
  },

  // ── أكاديمية / مركز تدريب ────────────────────────────────────
  academy: {
    heroTitle: "استثمر في نفسك — تعلّم من الأفضل",
    heroSubtitle: "دورات تدريبية معتمدة تفتح لك آفاقاً جديدة",
    aboutText: "أكاديميتنا تقدم برامج تدريبية وتعليمية متخصصة بأعلى معايير الجودة. نؤمن بأن التعلم المستمر هو مفتاح النجاح، لذلك صممنا مناهجنا بعناية لتتوافق مع متطلبات سوق العمل الحديث ومساعدة كل متدرب على تحقيق أهدافه.",
    sectionsOrder: ["hero","services","team","about","reviews","location","contact"],
    hiddenSections: ["gallery"],
    announcement: "سجّل في دوراتنا الآن واحصل على خصم 25% على التسجيل المبكر",
    statsItems: [{ value: "+2000", label: "خريج ناجح" }, { value: "30", label: "دورة تدريبية" }, { value: "15", label: "مدرب متخصص" }],
    faqItems: [
      { q: "هل الدورات حضورية أم عن بُعد؟", a: "نقدم الدورات بكلا الأسلوبين — حضورياً في مركزنا أو أونلاين عبر منصتنا التعليمية." },
      { q: "هل تُمنح شهادات معتمدة؟", a: "نعم، جميع شهاداتنا معتمدة ومعترف بها من الجهات المختصة." },
      { q: "هل يمكن التقسيط؟", a: "نعم، نوفر نظام تقسيط مريح على 3-6 أشهر بدون فوائد." },
      { q: "كم عدد المتدربين في كل مجموعة؟", a: "نحرص على صغر حجم المجموعات (6-12 متدرب) لضمان اهتمام فردي لكل مشارك." },
    ],
    heroSettings: { buttonText: "سجّل الآن", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "text", content: { title: "منهجيتنا التعليمية", content: "نعتمد على أسلوب التعلم التفاعلي الذي يجمع بين النظرية والتطبيق العملي. كل دورة مصممة بعناية لتبني مهارات حقيقية قابلة للتطبيق الفوري في مجال عملك.", align: "right" } },
      { id: "cb2", type: "booking_cta", content: { title: "ابدأ مسيرتك التعليمية", subtitle: "سجّل الآن وانضم لآلاف الناجحين", buttonText: "سجّل في دورة", bgColor: "" } },
    ],
  },

  // ── عقارات ────────────────────────────────────────────────────
  realestate: {
    heroTitle: "نجد لك البيت الذي تحلم به",
    heroSubtitle: "خبرة عقارية واسعة — نرشدك في كل خطوة حتى تستلم مفتاحك",
    aboutText: "مكتبنا العقاري متخصص في البيع والشراء والإيجار للعقارات السكنية والتجارية. فريقنا من الخبراء العقاريين المرخّصين يعمل بشفافية وأمانة لضمان حصولك على أفضل صفقة بأقل جهد منك.",
    sectionsOrder: ["hero","services","team","about","reviews","location","contact"],
    hiddenSections: ["gallery"],
    announcement: "تصفّح أحدث العروض العقارية — إضافات يومية",
    statsItems: [{ value: "+500", label: "صفقة ناجحة" }, { value: "10", label: "سنوات خبرة" }, { value: "200+", label: "عقار متاح" }],
    faqItems: [
      { q: "كم تأخذ العمولة؟", a: "عمولتنا معيارية ومتوافقة مع السوق. سنوضح كل التكاليف بشفافية قبل أي التزام." },
      { q: "هل تساعدون في تمويل العقار؟", a: "نعم، لدينا شراكات مع بنوك ومؤسسات تمويل معتمدة لتسهيل التمويل العقاري." },
      { q: "كم يستغرق إتمام البيع أو الشراء؟", a: "يختلف حسب نوع العقار والتمويل، لكن عادةً من أسبوعين حتى شهر." },
      { q: "هل تديرون العقارات للمُلّاك؟", a: "نعم، نقدم خدمة إدارة العقارات الإيجارية شاملة الصيانة وتحصيل الإيجار." },
    ],
    heroSettings: { buttonText: "تصفّح العقارات", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "أبرز عروضنا", images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "احجز استشارة عقارية مجانية", subtitle: "خبراؤنا مستعدون للإجابة على جميع استفساراتك", buttonText: "تواصل معنا", bgColor: "" } },
    ],
  },

  // ── مغسلة ─────────────────────────────────────────────────────
  laundry: {
    heroTitle: "ملابسك نظيفة — وفّر وقتك",
    heroSubtitle: "خدمة غسيل احترافية مع التوصيل والاستلام من بابك",
    aboutText: "مغسلتنا تستخدم أحدث المعدات وأفضل المواد لضمان نظاقة ملابسك وحفاظها على جودتها. نقدم خدمات الغسيل، الكي، التنظيف الجاف، وخدمة التوصيل السريع لراحتك التامة.",
    sectionsOrder: ["hero","services","about","reviews","location","contact"],
    hiddenSections: ["team","gallery"],
    announcement: "توصيل مجاني للطلبات فوق 50 ريال — اطلب الآن",
    statsItems: [{ value: "+10000", label: "طلب منجز" }, { value: "24h", label: "خدمة سريعة" }, { value: "100%", label: "رضا العملاء" }],
    faqItems: [
      { q: "كم يستغرق الغسيل العادي؟", a: "الغسيل العادي يُسلَّم خلال 24-48 ساعة. خدمة السرعة متاحة خلال 6-12 ساعة." },
      { q: "هل تتوفر خدمة التوصيل؟", a: "نعم، نوفر الاستلام والتوصيل من وإلى منزلك مجاناً للطلبات فوق 50 ريال." },
      { q: "كيف أتأكد من سلامة ملابسي؟", a: "نقوم بفرز الملابس دقيقاً حسب النوع واللون ودرجة الحرارة المناسبة لكل قطعة." },
      { q: "هل تغسلون الستائر والمفروشات؟", a: "نعم، نقدم خدمة تنظيف الستائر والمفروشات والسجاد بتقنيات متخصصة." },
    ],
    heroSettings: { buttonText: "اطلب الآن", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1545173168-9f1947eb7c5d?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "text", content: { title: "لماذا تختار مغسلتنا؟", content: "نستخدم منظفات عالية الجودة صديقة للبيئة، وأجهزة ألمانية متطورة تضمن نظافة عميقة دون إلحاق أي ضرر بالأقمشة. كل قطعة تحصل على عناية فردية.", align: "right" } },
      { id: "cb2", type: "booking_cta", content: { title: "اطلب خدمة التوصيل الآن", subtitle: "نستلم من بابك ونُعيد في الموعد", buttonText: "اطلب الاستلام", bgColor: "" } },
    ],
  },

  // ── متجر أزياء / بوتيك ───────────────────────────────────────
  retail: {
    heroTitle: "موضتك تبدأ من هنا",
    heroSubtitle: "أحدث التصاميم العالمية بأسعار تناسبك — كوني الأجمل دائماً",
    aboutText: "بوتيك متخصص في تقديم أحدث صيحات الموضة النسائية من أرقى الماركات العالمية والمحلية. نختار بعناية كل قطعة لتناسب ذوق المرأة العصرية وتُبرز أناقتها الطبيعية في كل مناسبة.",
    sectionsOrder: ["hero","services","about","gallery","reviews","location","contact"],
    hiddenSections: ["team"],
    announcement: "تصفية الموسم — خصومات تصل إلى 40% على تشكيلة مختارة",
    statsItems: [{ value: "+500", label: "موديل جديد" }, { value: "50+", label: "ماركة عالمية" }, { value: "4.9★", label: "تقييم العميلات" }],
    faqItems: [
      { q: "هل يمكن الاستبدال أو الإرجاع؟", a: "نعم، نقبل الاستبدال خلال 7 أيام من الشراء مع الاحتفاظ بالبطاقة والغلاف الأصلي." },
      { q: "هل تتوفر مقاسات كبيرة؟", a: "نعم، لدينا تشكيلة واسعة تشمل المقاسات الكبيرة Plus Size لجميع أشكال الجسم." },
      { q: "هل تقدمون خدمة التخصيص؟", a: "نعم، نوفر خدمة التعديل والخياطة المخصصة لضمان المقاس المثالي لك." },
      { q: "هل التسوق أونلاين متاح؟", a: "نعم، يمكنك تصفح جميع المنتجات والشراء عبر موقعنا مع توصيل لجميع المناطق." },
    ],
    heroSettings: { buttonText: "تسوّقي الآن", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "gallery", content: { title: "أحدث التشكيلات", images: ["https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format&fit=crop"], columns: 3 } },
      { id: "cb2", type: "booking_cta", content: { title: "أحدث الوصولات الآن في المتجر", subtitle: "تفضّلي بزيارتنا أو تسوّقي أونلاين بكل سهولة", buttonText: "تسوّقي الآن", bgColor: "" } },
    ],
  },

  // ── مركز صيانة ────────────────────────────────────────────────
  maintenance: {
    heroTitle: "إصلاح سريع — ضمان موثوق",
    heroSubtitle: "فنيون معتمدون وقطع غيار أصلية لكل أجهزتك",
    aboutText: "مركزنا متخصص في صيانة الأجهزة الإلكترونية والكهربائية بكافة أنواعها. نعتمد على فنيين معتمدين وقطع غيار أصلية مع ضمان مكتوب على جميع الإصلاحات. هدفنا إعادة جهازك يعمل بكفاءة 100% بأسرع وقت ممكن.",
    sectionsOrder: ["hero","services","about","reviews","location","contact"],
    hiddenSections: ["team","gallery"],
    announcement: "فحص مجاني لأول 50 عميل هذا الشهر — احجز موعدك الآن",
    statsItems: [{ value: "+8000", label: "جهاز تم إصلاحه" }, { value: "1 يوم", label: "متوسط وقت الإصلاح" }, { value: "90 يوم", label: "ضمان الإصلاح" }],
    faqItems: [
      { q: "هل يوجد ضمان على الإصلاح؟", a: "نعم، نقدم ضمان 90 يوماً على جميع الإصلاحات وقطع الغيار المستبدلة." },
      { q: "كم يستغرق الإصلاح عادةً؟", a: "معظم الإصلاحات تتم خلال 24-48 ساعة. حالات الاستعجال في نفس اليوم." },
      { q: "هل تقدمون خدمة الاستلام من المنزل؟", a: "نعم، نوفر خدمة الاستلام والتسليم للمنازل والشركات بمبلغ رمزي." },
      { q: "ماذا لو لم يكن الإصلاح ممكناً؟", a: "نخبرك بالتقييم مجاناً. إذا قررت عدم الإصلاح لا تدفع شيئاً." },
    ],
    heroSettings: { buttonText: "احجز موعد صيانة", buttonLink: "", bgColor: "", imageUrl: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=1200&auto=format&fit=crop", layout: "" },
    customBlocks: [
      { id: "cb1", type: "text", content: { title: "ما الذي نُصلحه؟", content: "هواتف ذكية وأجهزة لوحية — لاب توب وكمبيوتر — شاشات وتلفزيونات — أجهزة منزلية — طابعات وملحقات مكتبية — وجميع الأجهزة الإلكترونية الأخرى.", align: "right" } },
      { id: "cb2", type: "booking_cta", content: { title: "أحضر جهازك اليوم", subtitle: "فحص مجاني وتقييم فوري بدون أي التزام", buttonText: "احجز موعد", bgColor: "" } },
    ],
  },
};

const ALL_SECTIONS = [
  { id: "hero",     name: "البانر الرئيسي", icon: Layers,      canHide: false, src: "العنوان + رسالة ترحيب + زر حجز" },
  { id: "services", name: "الخدمات",        icon: Layers,      canHide: true,  src: "يُسحب تلقائي من الخدمات المضافة" },
  { id: "team",     name: "الفريق",          icon: Users,       canHide: true,  src: "مقدمو الخدمة — يتحدث تلقائي" },
  { id: "gallery",  name: "معرض الأعمال",   icon: Image,       canHide: true,  src: "من مكتبة الوسائط" },
  { id: "reviews",  name: "التقييمات",       icon: Star,        canHide: true,  src: "تقييمات 4 نجوم وأعلى — تلقائي" },
  { id: "about",    name: "عن المنشأة",      icon: Info,        canHide: true,  src: "نص تكتبه أنت" },
  { id: "products", name: "المنتجات",        icon: ShoppingBag, canHide: true,  src: "المنتجات المفعّلة أونلاين" },
  { id: "location", name: "الموقع",          icon: MapPin,      canHide: true,  src: "من بيانات المنشأة — تلقائي" },
  { id: "contact",  name: "تواصل معنا",      icon: Phone,       canHide: true,  src: "الجوال والبريد من إعدادات المنشأة" },
] as const;

const DEFAULT_SECTIONS_ORDER = ["hero","services","team","gallery","reviews","about","location","contact"];

const BLOCK_TYPES = [
  { type: "hero",         label: "Hero / Banner",  icon: Layout,       desc: "صورة رئيسية + عنوان + زر" },
  { type: "services",     label: "قائمة الخدمات",  icon: Star,         desc: "عرض الخدمات تلقائياً" },
  { type: "text",         label: "نص حر",          icon: Type,         desc: "فقرة نصية" },
  { type: "image",        label: "صورة",           icon: Image,        desc: "صورة مفردة" },
  { type: "gallery",      label: "معرض صور",       icon: Image,        desc: "شبكة صور" },
  { type: "testimonials", label: "التقييمات",      icon: Star,         desc: "آراء العملاء" },
  { type: "booking_cta",  label: "زر الحجز",       icon: Plus,         desc: "قسم دعوة للحجز" },
  { type: "contact",      label: "تواصل معنا",     icon: Phone,        desc: "نموذج التواصل" },
  { type: "html",         label: "كود HTML",       icon: Code,         desc: "كود مخصص" },
];

const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  hero:         { title: "مرحباً بكم", subtitle: "نقدم أفضل الخدمات", buttonText: "احجز الآن", buttonLink: "/book", imageUrl: "", bgColor: "" },
  services:     { title: "خدماتنا", subtitle: "اختر من بين خدماتنا المتميزة", columns: 3, categoryFilter: "" },
  text:         { title: "", content: "أضف نصك هنا...", align: "right" },
  image:        { url: "", alt: "", caption: "", fullWidth: false },
  gallery:      { title: "", images: [], columns: 3 },
  testimonials: { title: "آراء عملائنا", showRating: true },
  booking_cta:  { title: "احجز موعدك الآن", subtitle: "خطوة واحدة تفصلك عن تجربة مميزة", buttonText: "احجز الآن", bgColor: "" },
  contact:      { title: "تواصل معنا", showPhone: true, showEmail: true, showMap: false },
  html:         { code: "<p>كود HTML مخصص</p>" },
};

const TABS = [
  { id: "overview",  label: "نظرة عامة", icon: Globe },
  { id: "template",  label: "القالب",    icon: Layout },
  { id: "design",    label: "التصميم",   icon: Palette },
  { id: "sections",  label: "الأقسام",  icon: Layers },
  { id: "content",   label: "المحتوى",  icon: Type },
  { id: "pages",     label: "الصفحات",  icon: FileText },
  { id: "blog",      label: "المدونة",  icon: Rss },
  { id: "contacts",  label: "الرسائل",  icon: MessageSquare },
  { id: "settings",  label: "الإعدادات",icon: Settings2 },
];

// ══ Types ═════════════════════════════════════════════════════════

interface StatItem { label: string; value: string }
interface FaqItem { q: string; a: string }

interface HeroSettings {
  buttonText: string; buttonLink: string;
  bgColor: string; imageUrl: string;
  layout: string; // overrides template default
}
interface ServicesSettings {
  title: string; subtitle: string;
  layout: string; // overrides template serviceStyle
}
interface AboutSettings {
  title: string; imageUrl: string;
  features: string; // comma-separated
}
interface ReviewsSettings { title: string; showRating: boolean }
interface ContactSettings { title: string; showForm: boolean; showMap: boolean }

interface BuilderState {
  heroTitle: string;
  heroSubtitle: string;
  aboutText: string;
  sectionsOrder: string[];
  hiddenSections: string[];
  showBookingButton: boolean;
  showWhatsappButton: boolean;
  whatsappMessage: string;
  showPrices: boolean;
  showTeamPhotos: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  heroLayout: string;
  cardStyle: string;
  announcement: string;
  statsItems: StatItem[];
  faqItems: FaqItem[];
  customBlocks: BlockItem[];
  // Per-section detailed settings
  heroSettings: HeroSettings;
  servicesSettings: ServicesSettings;
  aboutSettings: AboutSettings;
  reviewsSettings: ReviewsSettings;
  contactSettings: ContactSettings;
}

interface DesignState {
  templateId: string;
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  cardBgColor: string;
  textColor: string;
  borderColor: string;
  // Typography
  fontFamily: string;
  headingSize: "sm" | "md" | "lg" | "xl";
  fontWeight: "normal" | "semibold" | "bold" | "extrabold";
  letterSpacing: "tight" | "normal" | "wide";
  // Buttons
  buttonStyle: "filled" | "outlined" | "soft" | "ghost";
  buttonRadius: "none" | "sm" | "md" | "lg" | "full";
  // Cards
  cardStyle: "flat" | "bordered" | "shadow" | "elevated";
  cardRadius: "none" | "sm" | "md" | "lg" | "xl";
  // Spacing & shadows
  sectionSpacing: "tight" | "normal" | "relaxed" | "wide";
  shadowScale: "none" | "subtle" | "medium" | "strong";
  // Gradient hero
  gradientFrom: string;
  gradientTo: string;
  // Custom CSS
  customCss: string;
  logoUrl: string;
  headerConfig: { showLogo: boolean; showPhone: boolean; showBookButton: boolean };
}

interface SettingsState {
  customDomain: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  googleAnalyticsId: string;
  gtmContainerId: string;
  facebookPixelId: string;
  snapchatPixelId: string;
  tiktokPixelId: string;
  customHeadCode: string;
  customBodyCode: string;
}

interface PageForm { title: string; type: string; isPublished: boolean }
interface PostForm { title: string; excerpt: string; content: string; status: string; tags: string[]; category: string }
interface BlockItem { id: string; type: string; content: Record<string, unknown> }

// ══ Block Editor ══════════════════════════════════════════════════

function BlockEditor({ block, onChange, onPickImage }: {
  block: BlockItem;
  onChange: (c: Record<string, unknown>) => void;
  onPickImage?: (field: string) => void;
}) {
  const f = (key: string, val: unknown) => onChange({ ...block.content, [key]: val });
  const inp = (key: string, label: string, type = "text") => (
    <div key={key}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={String(block.content?.[key] ?? "")} onChange={e => f(key, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
    </div>
  );
  const imgField = (key: string, label: string, hint?: string) => (
    <div key={key}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        {!!block.content?.[key] && <img src={String(block.content[key])} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" alt="" />}
        <button type="button" onClick={() => onPickImage?.(key)} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
          {block.content?.[key] ? "تغيير الصورة" : "اختر صورة"}
        </button>
        {!!block.content?.[key] && <button type="button" onClick={() => f(key, "")} className="px-2.5 py-2 rounded-lg border border-red-100 text-xs text-red-400 hover:bg-red-50 transition-colors">×</button>}
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3 shrink-0" />{hint}</p>}
    </div>
  );
  const tog = (key: string, label: string) => (
    <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-sm text-gray-700">{label}</span>
      <Toggle checked={!!block.content?.[key]} onChange={v => f(key, v)} />
    </div>
  );

  switch (block.type) {
    case "hero": {
      const usePrimary = !block.content?.bgColor;
      return (
        <div className="space-y-3">
          {inp("title","العنوان")}
          {inp("subtitle","العنوان الفرعي")}
          {inp("buttonText","نص الزر")}
          {inp("buttonLink","رابط الزر")}
          {imgField("imageUrl","صورة الخلفية","المقاس الأنسب: 1200×600 بكسل أو أكبر — JPG أو WebP")}
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-700">استخدم اللون الرئيسي للموقع</span>
            <Toggle checked={usePrimary} onChange={v => f("bgColor", v ? "" : "#5b9bd5")} />
          </div>
          {!usePrimary && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">لون الخلفية</label>
              <input type="color" value={String(block.content?.bgColor ?? "#5b9bd5")} onChange={e => f("bgColor", e.target.value)}
                className="w-full h-9 border border-gray-200 rounded-lg px-1 py-1 cursor-pointer" />
            </div>
          )}
        </div>
      );
    }
    case "services":    return <div className="space-y-3">{inp("title","عنوان القسم")}{inp("subtitle","عنوان فرعي (اختياري)")}{inp("categoryFilter","فلتر التصنيف (اسم التصنيف — اتركه فارغاً للكل)")}</div>;
    case "text":        return <div className="space-y-3">{inp("title","العنوان (اختياري)")}<RichTextEditor label="المحتوى" value={String(block.content?.content ?? "")} onChange={v => f("content", v)} minHeight={140} /></div>;
    case "image":       return <div className="space-y-3">{imgField("url","الصورة","المقاس الأنسب: 800×500 بكسل أو أعرض — JPG أو WebP")}{inp("alt","وصف الصورة")}{inp("caption","تعليق")}</div>;
    case "booking_cta": {
      const usePrimaryBg = !block.content?.bgColor;
      return (
        <div className="space-y-3">
          {inp("title","العنوان")}
          {inp("subtitle","العنوان الفرعي")}
          {inp("buttonText","نص الزر")}
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-700">استخدم اللون الرئيسي للموقع</span>
            <Toggle checked={usePrimaryBg} onChange={v => f("bgColor", v ? "" : "#5b9bd5")} />
          </div>
          {!usePrimaryBg && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">لون الخلفية</label>
              <input type="color" value={String(block.content?.bgColor ?? "#5b9bd5")} onChange={e => f("bgColor", e.target.value)}
                className="w-full h-9 border border-gray-200 rounded-lg px-1 py-1 cursor-pointer" />
            </div>
          )}
        </div>
      );
    }
    case "contact":     return <div className="space-y-1">{tog("showPhone","عرض الهاتف")}{tog("showEmail","عرض الإيميل")}{tog("showMap","عرض الخريطة")}</div>;
    case "html":        return <div><label className="block text-xs text-gray-500 mb-1">كود HTML</label><textarea value={String(block.content?.code ?? "")} onChange={e => f("code", e.target.value)} rows={5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-brand-400" /></div>;
    case "testimonials": return <div className="space-y-2">{inp("title","عنوان القسم")}{tog("showRating","عرض النجوم")}</div>;
    case "gallery": {
      const imgs = Array.isArray(block.content?.images) ? (block.content.images as string[]) : [];
      return (
        <div className="space-y-3">
          {inp("title","عنوان المعرض (اختياري)")}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">الصور ({imgs.length})</label>
              <button type="button" onClick={() => onPickImage?.("gallery_add")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-brand-300 text-xs text-brand-600 hover:bg-brand-50 transition-colors">
                <Plus className="w-3 h-3" /> إضافة صورة
              </button>
            </div>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-2"><Info className="w-3 h-3 shrink-0" />المقاس الأنسب لصور المعرض: 600×400 بكسل — يُفضل نسبة 3:2</p>
            {imgs.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5">
                {imgs.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={String(url)} className="w-full h-16 object-cover rounded-lg border border-gray-100" alt="" />
                    <button type="button" onClick={() => f("images", imgs.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 py-5 flex flex-col items-center gap-1">
                <Image className="w-5 h-5 text-gray-300" />
                <p className="text-xs text-gray-400">لم تُضف صور بعد</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">عدد الأعمدة</label>
            <div className="flex gap-2">
              {[2, 3, 4].map(n => (
                <button key={n} type="button" onClick={() => f("columns", n)}
                  className={clsx("flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                    Number(block.content?.columns ?? 3) === n
                      ? "border-brand-400 bg-brand-50 text-brand-600"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    default:            return <p className="text-sm text-gray-400 py-2">لا توجد إعدادات لهذا القسم</p>;
  }
}

// ══ Main Component ════════════════════════════════════════════════

export function WebsitePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabId = searchParams.get("tab") || "overview";

  // ── Remote data ────────────────────────────────────────────────
  const { data: configRes, loading: configLoading, refetch: refetchConfig } = useApi(() => websiteApi.config(), []);
  const { data: profileRes } = useApi(() => settingsApi.profile(), []);
  const { data: pagesRes, refetch: refetchPages } = useApi(() => websiteApi.pages(), []);
  const { data: blogRes, refetch: refetchBlog } = useApi(() => websiteApi.blog(), []);
  const { data: contactsRes, refetch: refetchContacts } = useApi(() => websiteApi.contacts(), []);

  const remoteConfig: Record<string, unknown> = (configRes?.data as Record<string, unknown>) ?? {};
  const profile: Record<string, unknown> = (profileRes?.data as Record<string, unknown>) ?? {};
  const pages: Record<string, unknown>[] = (pagesRes?.data as Record<string, unknown>[]) ?? [];
  const posts: Record<string, unknown>[] = (blogRes?.data as Record<string, unknown>[]) ?? [];
  const contacts: Record<string, unknown>[] = (contactsRes?.data as Record<string, unknown>[]) ?? [];

  const orgSlug = String(profile?.slug || profile?.id || "");
  const siteUrl = orgSlug ? `${window.location.origin}/s/${orgSlug}` : null;

  // ── Template tab ───────────────────────────────────────────────
  const [templateId, setTemplateId] = useState("classic");
  const [templateSaving, setTemplateSaving] = useState(false);

  // ── Design state ───────────────────────────────────────────────
  const [design, setDesign] = useState<DesignState | null>(null);
  const [designSaving, setDesignSaving] = useState(false);
  const [logoPicker, setLogoPicker] = useState(false);
  const [previewSize, setPreviewSize] = useState<"desktop" | "mobile">("desktop");
  const d = (k: keyof DesignState, v: DesignState[typeof k]) =>
    setDesign(p => p ? { ...p, [k]: v } : p);

  // ── Sections + content state ──────────────────────────────────
  const [builder, setBuilder] = useState<BuilderState>({
    heroTitle: "", heroSubtitle: "", aboutText: "",
    sectionsOrder: DEFAULT_SECTIONS_ORDER, hiddenSections: [],
    showBookingButton: true, showWhatsappButton: true,
    whatsappMessage: "مرحبا، أبي أحجز موعد",
    showPrices: true, showTeamPhotos: true,
    isPublished: false, publishedAt: null,
    heroLayout: "image-bg", cardStyle: "bordered",
    announcement: "", statsItems: [], faqItems: [], customBlocks: [],
    heroSettings: { buttonText: "احجز الآن", buttonLink: "", bgColor: "", imageUrl: "", layout: "" },
    servicesSettings: { title: "خدماتنا", subtitle: "", layout: "" },
    aboutSettings: { title: "عن المنشأة", imageUrl: "", features: "" },
    reviewsSettings: { title: "آراء عملائنا", showRating: true },
    contactSettings: { title: "تواصل معنا", showForm: true, showMap: true },
  });
  const [addMainBlockOpen, setAddMainBlockOpen] = useState(false);
  const [mainImagePicker, setMainImagePicker] = useState<{ blockId: string; field: string } | null>(null);
  const [sectionPicker, setSectionPicker] = useState<"hero" | "about" | null>(null);
  const [contentSaving, setContentSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sectionsSaving, setSectionsSaving] = useState(false);
  const setB = (key: keyof BuilderState, val: BuilderState[typeof key]) =>
    setBuilder(b => ({ ...b, [key]: val }));

  // ── Pages state ────────────────────────────────────────────────
  const [pageModal, setPageModal] = useState<{ open: boolean; item?: Record<string, unknown> } | null>(null);
  const [pageForm, setPageForm] = useState<PageForm>({ title: "", type: "custom", isPublished: false });
  const [pageSaving, setPageSaving] = useState(false);
  const [builderPage, setBuilderPage] = useState<Record<string, unknown> | null>(null);
  const [builderBlocks, setBuilderBlocks] = useState<BlockItem[]>([]);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [imagePicker, setImagePicker] = useState<{ blockId: string; field: string } | null>(null);

  // ── Blog state ─────────────────────────────────────────────────
  const [postModal, setPostModal] = useState<{ open: boolean; item?: Record<string, unknown> } | null>(null);
  const [postForm, setPostForm] = useState<PostForm>({ title: "", excerpt: "", content: "", status: "draft", tags: [], category: "" });
  const [postSaving, setPostSaving] = useState(false);

  // ── Settings state ─────────────────────────────────────────────
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const s = (k: keyof SettingsState, v: string) =>
    setSettings(p => p ? { ...p, [k]: v } : p);

  // ── Template preset state ──────────────────────────────────────
  const [presetModal, setPresetModal] = useState<string | null>(null);
  const [presetApplying, setPresetApplying] = useState(false);

  // ── Publish state ──────────────────────────────────────────────
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Sync server → local ────────────────────────────────────────
  useEffect(() => {
    if (!configRes) return;
    const cfg = remoteConfig;
    setTemplateId(String(cfg.templateId || "classic"));

    if (!design) {
      setDesign({
        templateId:    String(cfg.templateId || "classic"),
        primaryColor:  String(cfg.primaryColor || "#5b9bd5"),
        secondaryColor:String(cfg.secondaryColor || ""),
        accentColor:   String(cfg.accentColor || ""),
        bgColor:       String(cfg.bgColor || ""),
        cardBgColor:   String(cfg.cardBgColor || ""),
        textColor:     String(cfg.textColor || ""),
        borderColor:   String(cfg.borderColor || ""),
        fontFamily:    String(cfg.fontFamily || "IBM Plex Sans Arabic"),
        headingSize:   (cfg.headingSize as DesignState["headingSize"]) || "lg",
        fontWeight:    (cfg.fontWeight as DesignState["fontWeight"]) || "bold",
        letterSpacing: (cfg.letterSpacing as DesignState["letterSpacing"]) || "normal",
        buttonStyle:   (cfg.buttonStyle as DesignState["buttonStyle"]) || "filled",
        buttonRadius:  (cfg.buttonRadius as DesignState["buttonRadius"]) || "lg",
        cardStyle:     (cfg.cardStyle as DesignState["cardStyle"]) || "bordered",
        cardRadius:    (cfg.cardRadius as DesignState["cardRadius"]) || "lg",
        sectionSpacing:(cfg.sectionSpacing as DesignState["sectionSpacing"]) || "normal",
        shadowScale:   (cfg.shadowScale as DesignState["shadowScale"]) || "subtle",
        gradientFrom:  String(cfg.gradientFrom || ""),
        gradientTo:    String(cfg.gradientTo || ""),
        customCss:     String(cfg.customCss || ""),
        logoUrl:       String(cfg.logoUrl || ""),
        headerConfig:  (cfg.headerConfig as DesignState["headerConfig"]) || { showLogo: true, showPhone: true, showBookButton: true },
      });
    }

    if (!settings) {
      setSettings({
        customDomain:           String(cfg.customDomain || ""),
        defaultMetaTitle:       String(cfg.defaultMetaTitle || ""),
        defaultMetaDescription: String(cfg.defaultMetaDescription || ""),
        googleAnalyticsId:      String(cfg.googleAnalyticsId || ""),
        gtmContainerId:         String(cfg.gtmContainerId || ""),
        facebookPixelId:        String(cfg.facebookPixelId || ""),
        snapchatPixelId:        String(cfg.snapchatPixelId || ""),
        tiktokPixelId:          String(cfg.tiktokPixelId || ""),
        customHeadCode:         String(cfg.customHeadCode || ""),
        customBodyCode:         String(cfg.customBodyCode || ""),
      });
    }

    const bc = (cfg.builderConfig as Partial<BuilderState>) || {};
    setBuilder({
      heroTitle:          String(bc.heroTitle || ""),
      heroSubtitle:       String(bc.heroSubtitle || ""),
      aboutText:          String(bc.aboutText || ""),
      sectionsOrder:      bc.sectionsOrder || DEFAULT_SECTIONS_ORDER,
      hiddenSections:     bc.hiddenSections || [],
      showBookingButton:  bc.showBookingButton !== false,
      showWhatsappButton: bc.showWhatsappButton !== false,
      whatsappMessage:    String(bc.whatsappMessage || "مرحبا، أبي أحجز موعد"),
      showPrices:         bc.showPrices !== false,
      showTeamPhotos:     bc.showTeamPhotos !== false,
      isPublished:        !!(bc.isPublished || cfg.isPublished),
      publishedAt:        bc.publishedAt as string | null || null,
      heroLayout:         String(bc.heroLayout || "image-bg"),
      cardStyle:          String(bc.cardStyle || "bordered"),
      announcement:       String(bc.announcement || ""),
      statsItems:         (bc.statsItems as StatItem[]) || [],
      faqItems:           (bc.faqItems as FaqItem[]) || [],
      customBlocks:       (bc.customBlocks as BlockItem[]) || [],
      heroSettings:       (bc.heroSettings as HeroSettings) || { buttonText: "احجز الآن", buttonLink: "", bgColor: "", imageUrl: "", layout: "" },
      servicesSettings:   (bc.servicesSettings as ServicesSettings) || { title: "خدماتنا", subtitle: "", layout: "" },
      aboutSettings:      (bc.aboutSettings as AboutSettings) || { title: "عن المنشأة", imageUrl: "", features: "" },
      reviewsSettings:    (bc.reviewsSettings as ReviewsSettings) || { title: "آراء عملائنا", showRating: true },
      contactSettings:    (bc.contactSettings as ContactSettings) || { title: "تواصل معنا", showForm: true, showMap: true },
    });
  }, [configRes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────
  const saveContent = async () => {
    setContentSaving(true);
    try {
      await websiteApi.updateConfig({ builderConfig: builder });
      refetchConfig();
      toast.success("تم حفظ المحتوى");
    } catch { toast.error("فشل الحفظ"); }
    setContentSaving(false);
  };

  const addMainBlock = (type: string) => {
    setB("customBlocks", [...builder.customBlocks, { id: `mb${Date.now()}`, type, content: { ...(BLOCK_DEFAULTS[type] || {}) } }]);
    setAddMainBlockOpen(false);
  };

  const updateMainBlock = (id: string, content: Record<string, unknown>) =>
    setB("customBlocks", builder.customBlocks.map(b => b.id === id ? { ...b, content } : b));

  const removeMainBlock = (id: string) =>
    setB("customBlocks", builder.customBlocks.filter(b => b.id !== id));

  const moveMainBlock = (id: string, dir: -1 | 1) => {
    const blocks = [...builder.customBlocks];
    const idx = blocks.findIndex(b => b.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= blocks.length) return;
    [blocks[idx], blocks[to]] = [blocks[to], blocks[idx]];
    setB("customBlocks", blocks);
  };

  const duplicateMainBlock = (id: string) => {
    const blocks = [...builder.customBlocks];
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const orig = blocks[idx];
    const clone = { ...orig, id: `mb${Date.now()}`, content: { ...orig.content } };
    blocks.splice(idx + 1, 0, clone);
    setB("customBlocks", blocks);
  };

  const saveTemplate = async () => {
    setTemplateSaving(true);
    try {
      await websiteApi.updateConfig({ templateId });
      refetchConfig();
      toast.success("تم حفظ القالب");
    } catch { toast.error("فشل الحفظ"); }
    setTemplateSaving(false);
  };

  const applyPreset = async () => {
    if (!presetModal) return;
    const preset = TEMPLATE_PRESETS[presetModal];
    if (!preset) return;
    setPresetApplying(true);
    try {
      const tplDef = TEMPLATES.find(t => t.id === presetModal);
      const newBuilder: BuilderState = { ...builder, ...preset };
      setBuilder(newBuilder);
      setTemplateId(presetModal);
      if (tplDef) setDesign(p => p ? { ...p, templateId: presetModal, primaryColor: tplDef.defaultColor } : p);
      await websiteApi.updateConfig({
        templateId: presetModal,
        ...(tplDef ? { primaryColor: tplDef.defaultColor } : {}),
        builderConfig: newBuilder,
      });
      refetchConfig();
      toast.success("تم تطبيق القالب مع المحتوى الكامل");
      setPresetModal(null);
    } catch { toast.error("فشل التطبيق"); }
    setPresetApplying(false);
  };

  const saveDesign = async () => {
    if (!design) return;
    setDesignSaving(true);
    try {
      await websiteApi.updateConfig(design as unknown as Record<string, unknown>);
      refetchConfig();
      toast.success("تم حفظ التصميم");
    } catch { toast.error("فشل الحفظ"); }
    setDesignSaving(false);
  };

  const saveSections = async () => {
    setSectionsSaving(true);
    try {
      await websiteApi.updateConfig({ builderConfig: builder });
      refetchConfig();
      toast.success("تم حفظ الأقسام");
    } catch { toast.error("فشل الحفظ"); }
    setSectionsSaving(false);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSettingsSaving(true);
    try {
      await websiteApi.updateConfig(settings as unknown as Record<string, unknown>);
      refetchConfig();
      toast.success("تم حفظ الإعدادات");
    } catch { toast.error("فشل الحفظ"); }
    setSettingsSaving(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await websiteApi.publish();
      setB("isPublished", true);
      setB("publishedAt", new Date().toISOString());
      refetchConfig();
      toast.success("تم نشر الموقع");
    } catch { toast.error("فشل النشر"); }
    setPublishing(false);
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    try {
      await websiteApi.unpublish();
      setB("isPublished", false);
      refetchConfig();
      toast.success("تم إيقاف النشر");
    } catch { toast.error("فشل الإيقاف"); }
    setPublishing(false);
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const order = [...builder.sectionsOrder];
    const idx = order.indexOf(id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= order.length) return;
    [order[idx], order[to]] = [order[to], order[idx]];
    setB("sectionsOrder", order);
  };

  const toggleSection = (id: string) => {
    const hidden = builder.hiddenSections.includes(id)
      ? builder.hiddenSections.filter(s => s !== id)
      : [...builder.hiddenSections, id];
    setB("hiddenSections", hidden);
  };

  const openBuilder = (page: Record<string, unknown>) => {
    setBuilderPage(page);
    const rawBlocks = (page.blocks as Record<string, unknown>[]) || [];
    setBuilderBlocks(rawBlocks.map((b, i) => ({ id: `b${i}`, type: String(b.type), content: (b.content as Record<string, unknown>) || {} })));
  };

  const addBlock = (type: string) => {
    setBuilderBlocks(prev => [...prev, { id: `b${Date.now()}`, type, content: { ...(BLOCK_DEFAULTS[type] || {}) } }]);
    setAddBlockOpen(false);
  };

  const saveBuilderPage = async () => {
    if (!builderPage) return;
    setBuilderSaving(true);
    try {
      const blocks = builderBlocks.map(({ id: _id, ...rest }) => rest);
      await websiteApi.updatePage(String(builderPage.id), { blocks });
      refetchPages();
      toast.success("تم حفظ الصفحة");
      setBuilderPage(null);
    } catch { toast.error("فشل الحفظ"); }
    setBuilderSaving(false);
  };

  const savePage = async () => {
    setPageSaving(true);
    try {
      if (pageModal?.item) {
        await websiteApi.updatePage(String(pageModal.item.id), pageForm);
      } else {
        await websiteApi.createPage({ ...pageForm, blocks: [] });
      }
      setPageModal(null);
      refetchPages();
      toast.success(pageModal?.item ? "تم التحديث" : "تم إنشاء الصفحة");
    } catch { toast.error("فشل الحفظ"); }
    setPageSaving(false);
  };

  const deletePage = async (id: string) => {
    if (!confirm("حذف هذه الصفحة؟")) return;
    await websiteApi.deletePage(id);
    refetchPages();
    toast.success("تم الحذف");
  };

  const togglePagePublish = async (page: Record<string, unknown>) => {
    await websiteApi.updatePage(String(page.id), { isPublished: !page.isPublished });
    refetchPages();
    toast.success(page.isPublished ? "أُخفيت الصفحة" : "نُشرت الصفحة");
  };

  const savePost = async () => {
    setPostSaving(true);
    try {
      if (postModal?.item) {
        await websiteApi.updatePost(String(postModal.item.id), postForm);
      } else {
        await websiteApi.createPost(postForm);
      }
      setPostModal(null);
      refetchBlog();
      toast.success("تم الحفظ");
    } catch { toast.error("فشل الحفظ"); }
    setPostSaving(false);
  };

  const deletePost = async (id: string) => {
    if (!confirm("حذف هذا المقال؟")) return;
    await websiteApi.deletePost(id);
    refetchBlog();
    toast.success("تم الحذف");
  };

  const markContactRead = async (id: string) => {
    await websiteApi.markContactRead(id);
    refetchContacts();
  };

  const copySiteUrl = () => {
    if (!siteUrl) return;
    navigator.clipboard.writeText(siteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Derived ────────────────────────────────────────────────────
  const orderedSections = [
    ...builder.sectionsOrder.map(id => ALL_SECTIONS.find(s => s.id === id)).filter(Boolean),
    ...ALL_SECTIONS.filter(s => !builder.sectionsOrder.includes(s.id)),
  ] as typeof ALL_SECTIONS[number][];

  const unreadCount = contacts.filter(c => !c.isRead).length;

  // ── Loading ────────────────────────────────────────────────────
  if (configLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand-400" />
    </div>
  );

  // ── Block Builder full view ────────────────────────────────────
  if (builderPage) return (
    <div className="flex flex-col gap-4" dir="rtl">
      <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3">
        <button onClick={() => setBuilderPage(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 border-0 bg-transparent cursor-pointer">
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-sm">{String(builderPage.title)}</h2>
          <p className="text-xs text-gray-400 font-mono">/{String(builderPage.slug || "")}</p>
        </div>
        <Button variant="secondary" icon={Plus} size="sm" onClick={() => setAddBlockOpen(true)}>إضافة قسم</Button>
        <Button icon={Save} loading={builderSaving} onClick={saveBuilderPage}>حفظ الصفحة</Button>
      </div>

      {builderBlocks.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <Layout className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">لا توجد أقسام بعد</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">ابدأ ببناء صفحتك بإضافة أقسام</p>
          <Button icon={Plus} size="sm" onClick={() => setAddBlockOpen(true)}>إضافة أول قسم</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {builderBlocks.map((block, idx) => {
            const bt = BLOCK_TYPES.find(b => b.type === block.type);
            return (
              <div key={block.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => { if (idx === 0) return; const b = [...builderBlocks]; [b[idx-1], b[idx]] = [b[idx], b[idx-1]]; setBuilderBlocks(b); }} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 bg-transparent border-0 cursor-pointer"><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={() => { if (idx === builderBlocks.length - 1) return; const b = [...builderBlocks]; [b[idx+1], b[idx]] = [b[idx], b[idx+1]]; setBuilderBlocks(b); }} disabled={idx === builderBlocks.length - 1} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 bg-transparent border-0 cursor-pointer"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                  <span className="text-sm font-medium text-gray-700 flex-1">{bt?.label || block.type}</span>
                  <button title="تكرار" onClick={() => setBuilderBlocks(prev => { const i = prev.findIndex(b => b.id === block.id); if (i < 0) return prev; const clone = { ...prev[i], id: `bb${Date.now()}`, content: { ...prev[i].content } }; const next = [...prev]; next.splice(i + 1, 0, clone); return next; })} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 bg-transparent border-0 cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setBuilderBlocks(prev => prev.filter(b => b.id !== block.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="p-4">
                  <BlockEditor
                    block={block}
                    onChange={(content) => setBuilderBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content } : b))}
                    onPickImage={(field) => setImagePicker({ blockId: block.id, field })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addBlockOpen && (
        <Modal open title="اختر نوع القسم" onClose={() => setAddBlockOpen(false)}>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} onClick={() => addBlock(bt.type)}
                className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 text-right transition-colors cursor-pointer bg-transparent">
                <bt.icon className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{bt.label}</p>
                  <p className="text-xs text-gray-400">{bt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {imagePicker && (
        <MediaPickerModal
          title="اختر صورة"
          onSelect={(asset) => {
            setBuilderBlocks(prev => prev.map(b => {
              if (b.id !== imagePicker.blockId) return b;
              if (imagePicker.field === "gallery_add") {
                const existing = Array.isArray(b.content?.images) ? (b.content.images as string[]) : [];
                return { ...b, content: { ...b.content, images: [...existing, asset.fileUrl] } };
              }
              return { ...b, content: { ...b.content, [imagePicker.field]: asset.fileUrl } };
            }));
            setImagePicker(null);
          }}
          onClose={() => setImagePicker(null)}
        />
      )}
    </div>
  );

  // ══ Main Page ══════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-5" dir="rtl">
      <PageHeader
        title="موقعي"
        description="أنشئ موقع احترافي لمنشأتك — البيانات تتحدث تلقائياً"
        tabs={TABS.map(t => ({ ...t, badge: t.id === "contacts" && unreadCount > 0 ? unreadCount : undefined }))}
        activeTab={tabId}
        onTabChange={(id) => setSearchParams({ tab: id })}
        actions={
          <div className="flex items-center gap-2">
            {builder.isPublished ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> منشور
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">مسودة</span>
            )}
            {siteUrl && (
              <a href={siteUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors no-underline">
                <ExternalLink size={12} /> معاينة
              </a>
            )}
            {builder.isPublished ? (
              <button onClick={handleUnpublish} disabled={publishing}
                className={clsx("flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-0 bg-red-50 text-red-600 text-xs font-semibold cursor-pointer transition-opacity", publishing && "opacity-60 cursor-not-allowed")}>
                {publishing ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />} إيقاف النشر
              </button>
            ) : (
              <button onClick={handlePublish} disabled={publishing}
                className={clsx("flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-0 bg-brand-400 text-white text-xs font-semibold cursor-pointer transition-opacity", publishing && "opacity-60 cursor-not-allowed")}>
                {publishing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} نشر الموقع
              </button>
            )}
          </div>
        }
      />

      {/* ── Overview ────────────────────────────────────────── */}
      {tabId === "overview" && (
        <div className="flex flex-col gap-4">
          {/* URL card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">رابط موقعك</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {builder.isPublished
                    ? `منشور منذ ${builder.publishedAt ? fmtDate(builder.publishedAt) : "—"}`
                    : "مسودة — لم يُنشر بعد"}
                </p>
              </div>
              <span className={clsx("text-xs px-2.5 py-1 rounded-full font-medium",
                settings?.customDomain ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-600")}>
                {settings?.customDomain ? "دومين مخصص" : "رابط نسق"}
              </span>
            </div>
            {siteUrl ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 min-w-0">
                  <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600 font-mono truncate">{siteUrl}</span>
                </div>
                <button onClick={copySiteUrl} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition-colors cursor-pointer bg-transparent shrink-0">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "تم النسخ" : "نسخ"}
                </button>
                <a href={siteUrl} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-400">أكمل إعداد حسابك للحصول على رابط موقعك</p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "الصفحات المنشورة", value: pages.filter(p => p.isPublished).length, sub: `من ${pages.length}`, icon: FileText, bg: "bg-blue-50", color: "text-blue-500" },
              { label: "مقالات المدونة", value: posts.filter(p => p.status === "published").length, sub: `من ${posts.length}`, icon: Rss, bg: "bg-indigo-50", color: "text-indigo-500" },
              { label: "رسائل التواصل", value: contacts.length, sub: unreadCount > 0 ? `${unreadCount} غير مقروءة` : "الكل مقروءة", icon: MessageSquare, bg: "bg-violet-50", color: "text-violet-500" },
              { label: "القالب الحالي", value: TEMPLATES.find(t => t.id === templateId)?.name || "كلاسيكي", sub: design?.fontFamily?.split(" ")[0] || "", icon: Palette, bg: "bg-brand-50", color: "text-brand-500" },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                  <stat.icon className={clsx("w-4 h-4", stat.color)} />
                </div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                {stat.sub && <p className="text-[10px] text-gray-300 mt-0.5">{stat.sub}</p>}
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">إجراءات سريعة</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "إضافة صفحة جديدة", icon: Plus, action: () => { setSearchParams({ tab: "pages" }); setPageModal({ open: true }); } },
                { label: "تعديل التصميم", icon: Palette, action: () => setSearchParams({ tab: "design" }) },
                { label: "كتابة مقال", icon: Rss, action: () => { setSearchParams({ tab: "blog" }); setPostModal({ open: true }); } },
                { label: "إعدادات الدومين", icon: Link2, action: () => setSearchParams({ tab: "settings" }) },
              ].map(action => (
                <button key={action.label} onClick={action.action}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50/30 text-right transition-colors cursor-pointer bg-transparent group">
                  <action.icon className="w-4 h-4 text-gray-400 group-hover:text-brand-500 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-brand-700">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent contacts preview */}
          {contacts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <p className="text-sm font-semibold text-gray-900">آخر الرسائل</p>
                <button onClick={() => setSearchParams({ tab: "contacts" })} className="text-xs text-brand-500 hover:text-brand-600 font-medium cursor-pointer bg-transparent border-0">
                  عرض الكل
                </button>
              </div>
              {contacts.slice(0, 3).map((c) => (
                <div key={String(c.id)} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className={clsx("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5", c.isRead ? "bg-gray-100" : "bg-violet-50")}>
                    <MessageSquare className={clsx("w-3.5 h-3.5", c.isRead ? "text-gray-400" : "text-violet-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{String(c.name || "—")}</p>
                    <p className="text-[11px] text-gray-400 truncate">{String(c.message || "")}</p>
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0">{c.createdAt ? fmtDate(String(c.createdAt)) : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Template ─────────────────────────────────────────── */}
      {tabId === "template" && (
        <div className="flex flex-col gap-4">
          <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3">
            <p className="text-[13px] font-semibold text-brand-700">قوالب جاهزة بمحتوى كامل</p>
            <p className="text-xs text-brand-500 mt-0.5">اختر قالباً وانقر «ابدأ بمحتوى جاهز» لتحصل على موقع كامل فوراً — نصوص، صور، أقسام، وأسئلة شائعة. تعدّل كل شيء بعد ذلك.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {TEMPLATES.map(t => (
              <div key={t.id} className="flex flex-col gap-1.5">
                <div onClick={() => { setTemplateId(t.id); if (design && !design.primaryColor) d("primaryColor", t.defaultColor); }}
                  className={clsx("bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all",
                    templateId === t.id ? "border-brand-400 ring-[3px] ring-brand-400/20 shadow-sm" : "border-gray-100 shadow-sm hover:border-gray-200")}>
                  {/* grad is user-driven data, keep inline */}
                  <div className="h-[100px] relative flex items-center justify-center" style={{ background: t.grad }}>
                    {templateId === t.id && (
                      <div className="absolute top-2 left-2 w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center">
                        <Check size={13} className="text-brand-400 stroke-[2.5]" />
                      </div>
                    )}
                    {TEMPLATE_PRESETS[t.id] && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-white/90 text-[9px] font-bold text-gray-700">محتوى جاهز</div>
                    )}
                    <div className="text-center">
                      <div className="w-10 h-1 bg-white/40 rounded mx-auto mb-1.5" />
                      <div className="w-[55px] h-1 bg-white/25 rounded mx-auto mb-1" />
                      <div className="w-[45px] h-1 bg-white/20 rounded mx-auto" />
                    </div>
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[13px] font-bold text-gray-900">{t.name}</p>
                      <div className="w-3 h-3 rounded-full border border-white/50 shrink-0" style={{ background: t.defaultColor }} title="اللون الافتراضي — يمكن تغييره من تبويب التصميم" />
                    </div>
                    <p className="text-[11px] text-gray-400">{t.desc}</p>
                  </div>
                </div>
                {TEMPLATE_PRESETS[t.id] && (
                  <button
                    onClick={() => setPresetModal(t.id)}
                    className="w-full py-2 text-[11px] font-semibold rounded-xl border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors cursor-pointer">
                    ابدأ بمحتوى جاهز
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button icon={Save} loading={templateSaving} onClick={saveTemplate}>حفظ القالب (تصميم فقط)</Button>
          </div>
        </div>
      )}

      {/* ── Design ───────────────────────────────────────────── */}
      {tabId === "design" && design && (
        <div className="grid grid-cols-[380px_1fr] gap-4 items-start">
          {/* Options panel */}
          <div className="flex flex-col gap-3 max-h-[calc(100vh-160px)] overflow-y-auto pb-2 pr-0.5">

            <Card title="الألوان الأساسية">
              <div className="flex flex-col gap-3">
                <ColorField label="اللون الرئيسي" value={design.primaryColor} onChange={v => d("primaryColor", v)} />
                <ColorField label="اللون الثانوي" value={design.secondaryColor} onChange={v => d("secondaryColor", v)} placeholder="اختياري" />
                <ColorField label="لون التمييز (Accent)" value={design.accentColor} onChange={v => d("accentColor", v)} placeholder="اختياري — للأزرار الثانوية" />
              </div>
            </Card>

            <Card title="الخلفيات والنصوص">
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-400 -mt-1">اتركها فارغة لاستخدام ألوان القالب المحددة تلقائياً</p>
                <ColorField label="خلفية الصفحة" value={design.bgColor} onChange={v => d("bgColor", v)} placeholder="افتراضي القالب" />
                <ColorField label="خلفية البطاقات" value={design.cardBgColor} onChange={v => d("cardBgColor", v)} placeholder="افتراضي القالب" />
                <ColorField label="لون النص الرئيسي" value={design.textColor} onChange={v => d("textColor", v)} placeholder="افتراضي القالب" />
                <ColorField label="لون الحدود" value={design.borderColor} onChange={v => d("borderColor", v)} placeholder="افتراضي القالب" />
              </div>
            </Card>

            <Card title="الطباعة والخط">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1.5">نوع الخط</label>
                  <select value={design.fontFamily} onChange={e => d("fontFamily", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none text-gray-900">
                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5" style={{ fontFamily: design.fontFamily }}>معاينة: نص عربي احترافي — أفضل خدمة</p>
                </div>
                <OptionsRow label="حجم العناوين" value={design.headingSize}
                  onChange={v => d("headingSize", v as DesignState["headingSize"])}
                  options={[{ id: "sm", label: "صغير" }, { id: "md", label: "متوسط" }, { id: "lg", label: "كبير" }, { id: "xl", label: "ضخم" }]} />
                <OptionsRow label="وزن الخط" value={design.fontWeight}
                  onChange={v => d("fontWeight", v as DesignState["fontWeight"])}
                  options={[{ id: "normal", label: "عادي" }, { id: "semibold", label: "نصف سميك" }, { id: "bold", label: "سميك" }, { id: "extrabold", label: "أسمك" }]} />
                <OptionsRow label="التباعد الحرفي" value={design.letterSpacing}
                  onChange={v => d("letterSpacing", v as DesignState["letterSpacing"])}
                  options={[{ id: "tight", label: "ضيق" }, { id: "normal", label: "طبيعي" }, { id: "wide", label: "واسع" }]} />
              </div>
            </Card>

            <Card title="الأزرار">
              <div className="flex flex-col gap-3">
                <OptionsRow label="نمط الزر" value={design.buttonStyle}
                  onChange={v => d("buttonStyle", v as DesignState["buttonStyle"])}
                  options={[{ id: "filled", label: "ممتلئ" }, { id: "outlined", label: "إطار" }, { id: "soft", label: "ناعم" }, { id: "ghost", label: "شفاف" }]} />
                <OptionsRow label="استدارة الزوايا" value={design.buttonRadius}
                  onChange={v => d("buttonRadius", v as DesignState["buttonRadius"])}
                  options={[{ id: "none", label: "حاد" }, { id: "sm", label: "خفيف" }, { id: "md", label: "متوسط" }, { id: "lg", label: "مدوّر" }, { id: "full", label: "دائري" }]} />
              </div>
            </Card>

            <Card title="البطاقات">
              <div className="flex flex-col gap-3">
                <OptionsRow label="نمط البطاقة" value={design.cardStyle}
                  onChange={v => d("cardStyle", v as DesignState["cardStyle"])}
                  options={[{ id: "flat", label: "مسطح" }, { id: "bordered", label: "حدود" }, { id: "shadow", label: "ظل خفيف" }, { id: "elevated", label: "مرتفع" }]} />
                <OptionsRow label="استدارة زوايا البطاقة" value={design.cardRadius}
                  onChange={v => d("cardRadius", v as DesignState["cardRadius"])}
                  options={[{ id: "none", label: "حادة" }, { id: "sm", label: "خفيفة" }, { id: "md", label: "متوسطة" }, { id: "lg", label: "مدوّرة" }, { id: "xl", label: "كاملة" }]} />
              </div>
            </Card>

            <Card title="التباعد والظلال">
              <div className="flex flex-col gap-3">
                <OptionsRow label="تباعد الأقسام" value={design.sectionSpacing}
                  onChange={v => d("sectionSpacing", v as DesignState["sectionSpacing"])}
                  options={[{ id: "tight", label: "ضيق" }, { id: "normal", label: "طبيعي" }, { id: "relaxed", label: "مريح" }, { id: "wide", label: "واسع" }]} />
                <OptionsRow label="شدة الظلال" value={design.shadowScale}
                  onChange={v => d("shadowScale", v as DesignState["shadowScale"])}
                  options={[{ id: "none", label: "بلا" }, { id: "subtle", label: "خفيف" }, { id: "medium", label: "متوسط" }, { id: "strong", label: "قوي" }]} />
              </div>
            </Card>

            <Card title="تدرج البانر الرئيسي">
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-400 -mt-1">يُطبّق على البانر بدلاً من اللون الرئيسي المنفرد</p>
                <ColorField label="لون البداية" value={design.gradientFrom} onChange={v => d("gradientFrom", v)} placeholder="اختياري" />
                <ColorField label="لون النهاية" value={design.gradientTo} onChange={v => d("gradientTo", v)} placeholder="اختياري" />
                {design.gradientFrom && design.gradientTo && (
                  <div className="h-9 rounded-xl" style={{ background: `linear-gradient(135deg, ${design.gradientFrom}, ${design.gradientTo})` }} />
                )}
              </div>
            </Card>

            <Card title="الشعار والهيدر">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1.5">شعار الموقع</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                      {design.logoUrl
                        ? <img src={design.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                        : <Image className="w-5 h-5 text-gray-300" />}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setLogoPicker(true)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer bg-transparent">
                        اختر من المكتبة
                      </button>
                      {design.logoUrl && (
                        <button onClick={() => d("logoUrl", "")} className="px-3 py-2 rounded-xl border border-red-100 text-xs text-red-500 hover:bg-red-50 transition-colors cursor-pointer bg-transparent">
                          إزالة
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {([ { key: "showLogo", label: "عرض الشعار" }, { key: "showPhone", label: "عرض رقم الهاتف" }, { key: "showBookButton", label: "عرض زر الحجز" } ] as const).map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-[13px] text-gray-900">{item.label}</span>
                    <Toggle checked={!!design.headerConfig?.[item.key]}
                      onChange={v => d("headerConfig", { ...design.headerConfig, [item.key]: v })} />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="CSS مخصص">
              <p className="text-xs text-gray-400 mb-2">أنماط CSS تُطبّق مباشرة على موقعك — للمستخدمين المتقدمين</p>
              <textarea value={design.customCss} onChange={e => d("customCss", e.target.value)} rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono outline-none resize-y box-border"
                placeholder={`.hero-section { padding: 120px 0; }\nh1 { letter-spacing: -0.04em; }`} dir="ltr" />
            </Card>

            <Button icon={Save} loading={designSaving} onClick={saveDesign}>حفظ التصميم</Button>
          </div>

          {/* Live preview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3.5 items-center sticky top-4">
            <div className="flex gap-2">
              {(["desktop","mobile"] as const).map(sz => (
                <button key={sz} onClick={() => setPreviewSize(sz)} className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors bg-transparent", previewSize === sz ? "border-brand-400 bg-brand-50 text-brand-600" : "border-gray-200 text-gray-400")}>
                  {sz === "desktop" ? <Monitor size={13} /> : <Smartphone size={13} />}
                  {sz === "desktop" ? "كمبيوتر" : "جوال"}
                </button>
              ))}
            </div>
            {(() => {
              const btnRadiusMap: Record<string, string> = { none: "0", sm: "6px", md: "10px", lg: "14px", full: "9999px" };
              const cardRadiusMap: Record<string, string> = { none: "0", sm: "8px", md: "12px", lg: "16px", xl: "24px" };
              const headingSizeMap: Record<string, number> = { sm: 20, md: 26, lg: 32, xl: 40 };
              const fontWeightMap: Record<string, number> = { normal: 400, semibold: 600, bold: 700, extrabold: 800 };
              const letterSpacingMap: Record<string, string> = { tight: "-0.03em", normal: "0", wide: "0.05em" };
              const heroBg = design.gradientFrom && design.gradientTo
                ? `linear-gradient(135deg, ${design.gradientFrom}, ${design.gradientTo})`
                : design.primaryColor || "#5b9bd5";
              const btnR = btnRadiusMap[design.buttonRadius] || "14px";
              const c = design.primaryColor || "#5b9bd5";
              const btnStyles: Record<string, React.CSSProperties> = {
                filled:   { background: "white", color: c, borderRadius: btnR, border: "none" },
                outlined: { background: "transparent", color: "white", borderRadius: btnR, border: "2px solid white" },
                soft:     { background: "rgba(255,255,255,0.18)", color: "white", borderRadius: btnR, border: "none" },
                ghost:    { background: "transparent", color: "white", borderRadius: btnR, border: "none", textDecoration: "underline" },
              };
              const cardR = cardRadiusMap[design.cardRadius] || "16px";
              const cardBg = design.cardBgColor || "white";
              const cardBdr = design.borderColor || "#e5e7eb";
              const cardShadows: Record<string, string> = {
                flat: "none", bordered: "none",
                shadow: "0 2px 8px rgba(0,0,0,0.09)", elevated: "0 8px 24px rgba(0,0,0,0.13)",
              };
              const cardBorders: Record<string, string> = {
                flat: "none", bordered: `1px solid ${cardBdr}`, shadow: "none", elevated: "none",
              };
              return (
                <div className={clsx("border border-gray-200 overflow-hidden shadow-lg w-full", previewSize === "mobile" ? "max-w-[375px] rounded-[24px]" : "max-w-[680px] rounded-xl")}>
                  {/* Hero */}
                  <div className="text-center" style={{ background: heroBg, padding: previewSize === "mobile" ? "28px 20px" : "44px 36px" }}>
                    <p className="text-white mb-2" style={{
                      fontSize: previewSize === "mobile" ? 20 : (headingSizeMap[design.headingSize] || 32),
                      fontFamily: design.fontFamily,
                      fontWeight: fontWeightMap[design.fontWeight] || 700,
                      letterSpacing: letterSpacingMap[design.letterSpacing] || "0",
                    }}>اسم منشأتك</p>
                    <p className="text-white/75 mb-5" style={{ fontSize: 13, fontFamily: design.fontFamily }}>عبارة ترحيبية مميزة تصف خدماتك</p>
                    <div className="inline-block px-5 py-2.5 text-[13px] font-semibold cursor-pointer"
                      style={btnStyles[design.buttonStyle] || btnStyles.filled}>
                      احجز الآن
                    </div>
                  </div>
                  {/* Services section */}
                  <div style={{ background: design.bgColor || "#f8f9fb", padding: previewSize === "mobile" ? "18px 14px" : "24px 20px" }}>
                    <p className="text-[13px] font-semibold mb-3" style={{ fontFamily: design.fontFamily, color: design.textColor || "#111827" }}>خدماتنا</p>
                    <div className={clsx("grid gap-2.5", previewSize === "mobile" ? "grid-cols-2" : "grid-cols-3")}>
                      {[1,2,3].map(i => (
                        <div key={i} className="h-14 flex items-end p-2.5" style={{
                          background: cardBg,
                          border: cardBorders[design.cardStyle] || `1px solid ${cardBdr}`,
                          borderRadius: cardR,
                          boxShadow: cardShadows[design.cardStyle] || "none",
                        }}>
                          <div className="h-2 rounded-full w-3/4" style={{ background: design.primaryColor || "#5b9bd5", opacity: 0.25 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Sections ─────────────────────────────────────────── */}
      {tabId === "sections" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-400">رتّب الأقسام وأظهر أو أخفِ ما تريد — البيانات تُسحب تلقائياً</p>
            <Button icon={Save} loading={sectionsSaving} onClick={saveSections} size="sm">حفظ الترتيب</Button>
          </div>

          {/* Hero */}
          <SectionRow
            section={ALL_SECTIONS[0]} isFirst isLast={false} isHidden={false}
            expanded={expandedSection === "hero"}
            onToggle={() => {}} onMoveUp={() => {}} onMoveDown={() => {}}
            onExpand={() => setExpandedSection(expandedSection === "hero" ? null : "hero")}
          >
            {expandedSection === "hero" && (
              <div className="flex flex-col gap-3 py-3">
                <FieldInput label="العنوان الرئيسي" value={builder.heroTitle} onChange={v => setB("heroTitle", v)} placeholder="مرحبًا بكم في منشأتنا" />
                <FieldInput label="العبارة الفرعية" value={builder.heroSubtitle} onChange={v => setB("heroSubtitle", v)} placeholder="تجربة فريدة تنتظركم" />
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput label="نص زر الحجز" value={builder.heroSettings.buttonText} onChange={v => setB("heroSettings", { ...builder.heroSettings, buttonText: v })} placeholder="احجز الآن" />
                  <FieldInput label="رابط الزر (اختياري)" value={builder.heroSettings.buttonLink} onChange={v => setB("heroSettings", { ...builder.heroSettings, buttonLink: v })} placeholder="/book/..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">صورة خلفية البانر</label>
                  <div className="flex items-center gap-2">
                    {builder.heroSettings.imageUrl && <img src={builder.heroSettings.imageUrl} className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0" alt="" />}
                    <button type="button" onClick={() => setSectionPicker("hero")} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                      {builder.heroSettings.imageUrl ? "تغيير الصورة" : "اختر صورة"}
                    </button>
                    {builder.heroSettings.imageUrl && <button type="button" onClick={() => setB("heroSettings", { ...builder.heroSettings, imageUrl: "" })} className="px-2.5 py-2 rounded-lg border border-red-100 text-xs text-red-400 hover:bg-red-50 transition-colors">إزالة</button>}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3 shrink-0" />المقاس الأنسب: 1200×600 بكسل — JPG أو WebP</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">لون خلفية البانر (عند عدم وجود صورة)</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={builder.heroSettings.bgColor || design?.primaryColor || "#5b9bd5"}
                      onChange={e => setB("heroSettings", { ...builder.heroSettings, bgColor: e.target.value })}
                      className="w-10 h-9 rounded-lg border border-gray-200 p-0.5 cursor-pointer" />
                    {builder.heroSettings.bgColor && (
                      <button type="button" onClick={() => setB("heroSettings", { ...builder.heroSettings, bgColor: "" })}
                        className="text-xs text-gray-400 hover:text-red-500 border-0 bg-transparent cursor-pointer">إزالة (يستخدم اللون الرئيسي)</button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1">إذا لم تحدد لوناً، سيُستخدم اللون الرئيسي للموقع</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">تخطيط البانر</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "", label: "افتراضي القالب" },
                      { id: "fullscreen", label: "صورة كاملة" },
                      { id: "split", label: "نصف ونصف" },
                      { id: "centered", label: "مركزي" },
                      { id: "gradient", label: "تدرج لوني" },
                      { id: "minimal", label: "بسيط" },
                    ].map(o => (
                      <button key={o.id} type="button"
                        onClick={() => setB("heroSettings", { ...builder.heroSettings, layout: o.id })}
                        className={`py-2 rounded-xl border text-xs font-medium transition-colors ${builder.heroSettings.layout === o.id ? "border-brand-400 bg-brand-50 text-brand-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SectionRow>

          {orderedSections.filter(s => s.id !== "hero").map((section, idx, arr) => (
            <SectionRow
              key={section.id} section={section}
              isFirst={idx === 0} isLast={idx === arr.length - 1}
              isHidden={builder.hiddenSections.includes(section.id)}
              expanded={expandedSection === section.id}
              onToggle={() => toggleSection(section.id)}
              onMoveUp={() => moveSection(section.id, -1)}
              onMoveDown={() => moveSection(section.id, 1)}
              onExpand={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              {/* ─ Services ─ */}
              {expandedSection === "services" && section.id === "services" && (
                <div className="flex flex-col gap-3 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="عنوان القسم" value={builder.servicesSettings.title} onChange={v => setB("servicesSettings", { ...builder.servicesSettings, title: v })} />
                    <FieldInput label="وصف فرعي" value={builder.servicesSettings.subtitle} onChange={v => setB("servicesSettings", { ...builder.servicesSettings, subtitle: v })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">طريقة عرض الخدمات</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "", label: "افتراضي القالب" },
                        { id: "grid", label: "شبكة بطاقات" },
                        { id: "list", label: "قائمة أفقية" },
                        { id: "menu", label: "قائمة طعام" },
                        { id: "magazine", label: "مجلة" },
                        { id: "showcase", label: "عرض كبير" },
                      ].map(o => (
                        <button key={o.id} type="button"
                          onClick={() => setB("servicesSettings", { ...builder.servicesSettings, layout: o.id })}
                          className={`py-2 rounded-xl border text-xs font-medium transition-colors ${builder.servicesSettings.layout === o.id ? "border-brand-400 bg-brand-50 text-brand-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-700">إظهار الأسعار</span>
                    <Toggle checked={builder.showPrices} onChange={v => setB("showPrices", v)} />
                  </div>
                </div>
              )}

              {/* ─ About ─ */}
              {expandedSection === "about" && section.id === "about" && (
                <div className="flex flex-col gap-3 py-3">
                  <FieldInput label="عنوان القسم" value={builder.aboutSettings.title} onChange={v => setB("aboutSettings", { ...builder.aboutSettings, title: v })} />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">نبذة عن المنشأة</label>
                    <textarea value={builder.aboutText} onChange={e => setB("aboutText", e.target.value)} rows={4}
                      placeholder="اكتب نبذة مختصرة عن منشأتك..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] resize-y outline-none box-border" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">صورة القسم (اختياري)</label>
                    <div className="flex items-center gap-2">
                      {builder.aboutSettings.imageUrl && <img src={builder.aboutSettings.imageUrl} className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0" alt="" />}
                      <button type="button" onClick={() => setSectionPicker("about")} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                        {builder.aboutSettings.imageUrl ? "تغيير الصورة" : "اختر صورة"}
                      </button>
                      {builder.aboutSettings.imageUrl && <button type="button" onClick={() => setB("aboutSettings", { ...builder.aboutSettings, imageUrl: "" })} className="px-2.5 py-2 rounded-lg border border-red-100 text-xs text-red-400 hover:bg-red-50 transition-colors">إزالة</button>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1"><Info className="w-3 h-3 shrink-0" />المقاس الأنسب: 600×400 بكسل</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">نقاط مميزة (افصل بينها بفاصلة)</label>
                    <input type="text" value={builder.aboutSettings.features}
                      onChange={e => setB("aboutSettings", { ...builder.aboutSettings, features: e.target.value })}
                      placeholder="جودة عالية، خدمة سريعة، دعم متواصل"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none" />
                  </div>
                </div>
              )}

              {/* ─ Reviews ─ */}
              {expandedSection === "reviews" && section.id === "reviews" && (
                <div className="flex flex-col gap-2.5 py-3">
                  <FieldInput label="عنوان القسم" value={builder.reviewsSettings.title} onChange={v => setB("reviewsSettings", { ...builder.reviewsSettings, title: v })} />
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-700">إظهار النجوم</span>
                    <Toggle checked={builder.reviewsSettings.showRating} onChange={v => setB("reviewsSettings", { ...builder.reviewsSettings, showRating: v })} />
                  </div>
                </div>
              )}

              {/* ─ Contact ─ */}
              {expandedSection === "contact" && section.id === "contact" && (
                <div className="flex flex-col gap-2.5 py-3">
                  <FieldInput label="عنوان القسم" value={builder.contactSettings.title} onChange={v => setB("contactSettings", { ...builder.contactSettings, title: v })} />
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-700">إظهار نموذج التواصل</span>
                    <Toggle checked={builder.contactSettings.showForm} onChange={v => setB("contactSettings", { ...builder.contactSettings, showForm: v })} />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-700">إظهار خريطة الموقع</span>
                    <Toggle checked={builder.contactSettings.showMap} onChange={v => setB("contactSettings", { ...builder.contactSettings, showMap: v })} />
                  </div>
                </div>
              )}
            </SectionRow>
          ))}
        </div>
      )}

      {/* ── Pages ────────────────────────────────────────────── */}
      {tabId === "pages" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-700 font-medium">صفحات موقعك الإضافية</p>
              <p className="text-xs text-gray-400 mt-0.5">
                كل صفحة تظهر على موقعك العام في رابط مثل:{" "}
                {siteUrl ? <span className="font-mono bg-gray-100 px-1 rounded text-gray-500">{siteUrl}/p/about</span> : <span className="font-mono text-gray-400">موقعك.نسق.sa/p/الرابط</span>}
                {" "}— بعد النشر يظهر الرابط في قائمة الموقع
              </p>
            </div>
            <Button icon={Plus} size="sm" onClick={() => { setPageForm({ title: "", type: "custom", isPublished: false }); setPageModal({ open: true }); }}>
              صفحة جديدة
            </Button>
          </div>

          {pages.length === 0 ? (
            <EmptyState icon={FileText} title="لا توجد صفحات بعد" desc="أنشئ صفحات مثل «من نحن» أو «تواصل معنا»"
              action={<Button icon={Plus} size="sm" onClick={() => { setPageForm({ title: "", type: "custom", isPublished: false }); setPageModal({ open: true }); }}>إنشاء أول صفحة</Button>} />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الصفحة</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الرابط</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الأقسام</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الحالة</th>
                    <th className="py-3 px-4 w-36" />
                  </tr>
                </thead>
                <tbody>
                  {pages.map(page => (
                    <tr key={String(page.id)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-900">{String(page.title)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-gray-400">/p/{String(page.slug || "")}</span>
                          {siteUrl && !!page.slug && (
                            <button type="button" title="نسخ الرابط"
                              onClick={() => { navigator.clipboard.writeText(`${siteUrl}/p/${String(page.slug)}`); toast.success("تم نسخ الرابط"); }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 border-0 bg-transparent cursor-pointer transition-colors">
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{((page.blocks as unknown[]) || []).length} قسم</td>
                      <td className="py-3 px-4">
                        <StatusBadge published={!!page.isPublished} labels={["منشورة", "مسودة"]} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end">
                          <IconBtn title="تعديل المحتوى" onClick={() => openBuilder(page)} className="hover:bg-brand-50 text-brand-500"><Layout className="w-3.5 h-3.5" /></IconBtn>
                          <IconBtn title="تعديل المعلومات" onClick={() => { setPageForm({ title: String(page.title), type: String(page.type || "custom"), isPublished: !!page.isPublished }); setPageModal({ open: true, item: page }); }}><Pencil className="w-3.5 h-3.5 text-gray-400" /></IconBtn>
                          <IconBtn title={page.isPublished ? "إخفاء" : "نشر"} onClick={() => togglePagePublish(page)}>{page.isPublished ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}</IconBtn>
                          {!!page.isPublished && siteUrl && !!page.slug && (
                            <a href={`${siteUrl}/p/${String(page.slug)}`} target="_blank" rel="noreferrer" title="فتح الصفحة" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 border-0 bg-transparent cursor-pointer inline-flex items-center"><ExternalLink className="w-3.5 h-3.5" /></a>
                          )}
                          <IconBtn title="حذف" onClick={() => deletePage(String(page.id))} className="hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Blog ─────────────────────────────────────────────── */}
      {tabId === "blog" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">مقالات المدونة تُحسّن ظهورك في محركات البحث</p>
            <Button icon={Plus} size="sm" onClick={() => { setPostForm({ title: "", excerpt: "", content: "", status: "draft", tags: [], category: "" }); setPostModal({ open: true }); }}>
              مقال جديد
            </Button>
          </div>

          {posts.length === 0 ? (
            <EmptyState icon={Rss} title="لا توجد مقالات بعد" desc="ابدأ بكتابة أول مقال — المدونة تُحسّن ظهورك في Google"
              action={<Button icon={Plus} size="sm" onClick={() => { setPostForm({ title: "", excerpt: "", content: "", status: "draft", tags: [], category: "" }); setPostModal({ open: true }); }}>كتابة أول مقال</Button>} />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">العنوان</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">الحالة</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">المشاهدات</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400">التاريخ</th>
                    <th className="py-3 px-4 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {posts.map(post => (
                    <tr key={String(post.id)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{String(post.title)}</p>
                        {!!post.category && <p className="text-xs text-gray-400 mt-0.5">{String(post.category)}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-semibold",
                          post.status === "published" ? "bg-emerald-50 text-emerald-600" : post.status === "scheduled" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500")}>
                          {post.status === "published" ? "منشور" : post.status === "scheduled" ? "مجدول" : "مسودة"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{Number(post.views || 0)}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{post.publishedAt ? fmtDate(String(post.publishedAt)) : "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end">
                          <IconBtn onClick={() => { setPostForm({ title: String(post.title), excerpt: String(post.excerpt || ""), content: String(post.content || ""), status: String(post.status), tags: (post.tags as string[]) || [], category: String(post.category || "") }); setPostModal({ open: true, item: post }); }}><Pencil className="w-3.5 h-3.5 text-gray-400" /></IconBtn>
                          <IconBtn onClick={() => deletePost(String(post.id))} className="hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Contacts ─────────────────────────────────────────── */}
      {tabId === "contacts" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">رسائل زوار الموقع من نموذج التواصل</p>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-500">{unreadCount} غير مقروءة</span>
            )}
          </div>

          {contacts.length === 0 ? (
            <EmptyState icon={MessageSquare} title="لا توجد رسائل بعد" desc="ستظهر هنا رسائل الزوار التي تأتي من نموذج التواصل في موقعك" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {contacts.map(c => (
                <div key={String(c.id)} className={clsx("flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 transition-colors", !c.isRead && "bg-violet-50/30")}>
                  <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", c.isRead ? "bg-gray-100" : "bg-violet-100")}>
                    <MessageSquare className={clsx("w-4 h-4", c.isRead ? "text-gray-400" : "text-violet-600")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">{String(c.name || "—")}</p>
                      {!c.isRead && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">جديدة</span>}
                    </div>
                    <p className="text-xs text-gray-500">{String(c.email || "")}</p>
                    <p className="text-[13px] text-gray-700 mt-1.5 leading-relaxed">{String(c.message || "")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[10px] text-gray-300">{c.createdAt ? fmtDate(String(c.createdAt)) : ""}</span>
                    {!c.isRead && (
                      <button onClick={() => markContactRead(String(c.id))} className="text-[11px] text-violet-500 hover:text-violet-700 font-medium cursor-pointer bg-transparent border-0">
                        تحديد كمقروءة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────── */}
      {tabId === "content" && (
        <div className="flex flex-col gap-5">
          {/* Announcement bar */}
          <Card title="شريط الإعلانات">
            <p className="text-xs text-gray-400 mb-3">نص يتحرك أعلى الموقع — استخدمه للعروض والأخبار والبيانات التعريفية</p>
            <FieldInput label="نص الإعلان" value={builder.announcement} onChange={v => setB("announcement", v)} placeholder="عروض الصيف — احجز الآن وادفع عند التنفيذ — 0535000000" />
            <p className="text-[11px] text-gray-300 mt-1.5">اترك فارغاً لإخفاء شريط الإعلانات</p>
          </Card>

          {/* Custom Blocks (main page sections) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-bold text-gray-900">أقسام المحتوى المخصص</p>
                <p className="text-xs text-gray-400 mt-0.5">أضف بانرات، نصوص، صور، معارض، وأزرار حجز في الصفحة الرئيسية</p>
              </div>
              <Button icon={Plus} size="sm" onClick={() => setAddMainBlockOpen(true)}>إضافة قسم</Button>
            </div>

            {builder.customBlocks.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
                <Layout className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">لا توجد أقسام مخصصة بعد</p>
                <p className="text-xs text-gray-300 mt-1 mb-4">أضف بانرات دعائية، صور، نصوص، وغيرها</p>
                <Button icon={Plus} size="sm" onClick={() => setAddMainBlockOpen(true)}>أضف أول قسم</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {builder.customBlocks.map((block, idx) => {
                  const bt = BLOCK_TYPES.find(b => b.type === block.type);
                  return (
                    <div key={block.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button onClick={() => moveMainBlock(block.id, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 bg-transparent border-0 cursor-pointer"><ChevronUp className="w-3 h-3" /></button>
                          <button onClick={() => moveMainBlock(block.id, 1)} disabled={idx === builder.customBlocks.length - 1} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 bg-transparent border-0 cursor-pointer"><ChevronDown className="w-3 h-3" /></button>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                          {bt && <bt.icon className="w-3.5 h-3.5 text-brand-500" />}
                        </div>
                        <span className="flex-1 text-sm font-medium text-gray-800">{bt?.label || block.type}</span>
                        <button title="تكرار القسم" onClick={() => duplicateMainBlock(block.id)} className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-400 bg-transparent border-0 cursor-pointer"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeMainBlock(block.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-white">
                        <BlockEditor
                          block={block}
                          onChange={(content) => updateMainBlock(block.id, content)}
                          onPickImage={(field) => setMainImagePicker({ blockId: block.id, field })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-bold text-gray-900">إحصائيات الإنجاز</p>
                <p className="text-xs text-gray-400 mt-0.5">أرقام تظهر في شريط ملون أسفل البانر الرئيسي</p>
              </div>
              <Button icon={Plus} size="sm" onClick={() => setB("statsItems", [...builder.statsItems, { label: "", value: "" }])}>إضافة رقم</Button>
            </div>
            {builder.statsItems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">لا توجد أرقام — يُعرض افتراضياً إحصائيات الحجوزات والتقييمات</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {builder.statsItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <FieldInput label="" value={item.value} onChange={v => setB("statsItems", builder.statsItems.map((s, j) => j === i ? { ...s, value: v } : s))} placeholder="مثال: +500" />
                    <FieldInput label="" value={item.label} onChange={v => setB("statsItems", builder.statsItems.map((s, j) => j === i ? { ...s, label: v } : s))} placeholder="مثال: عميل راضٍ" />
                    <button onClick={() => setB("statsItems", builder.statsItems.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-bold text-gray-900">الأسئلة الشائعة (FAQ)</p>
                <p className="text-xs text-gray-400 mt-0.5">تُحسّن ظهورك في Google وتجيب على أسئلة العملاء</p>
              </div>
              <Button icon={Plus} size="sm" onClick={() => setB("faqItems", [...builder.faqItems, { q: "", a: "" }])}>إضافة سؤال</Button>
            </div>
            {builder.faqItems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">لا توجد أسئلة بعد</p>
            ) : (
              <div className="flex flex-col gap-3">
                {builder.faqItems.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] text-gray-400 font-medium pt-1">س {i + 1}</span>
                      <button onClick={() => setB("faqItems", builder.faqItems.filter((_, j) => j !== i))} className="p-1 rounded-lg hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer shrink-0"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <input value={item.q} onChange={e => setB("faqItems", builder.faqItems.map((f, j) => j === i ? { ...f, q: e.target.value } : f))}
                      placeholder="السؤال..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none mb-2 box-border" />
                    <textarea value={item.a} onChange={e => setB("faqItems", builder.faqItems.map((f, j) => j === i ? { ...f, a: e.target.value } : f))}
                      placeholder="الجواب..."
                      rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none resize-none box-border" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General toggles */}
          <Card title="خيارات الموقع">
            <div className="flex flex-col gap-1">
              {([
                { key: "showBookingButton",  label: "إظهار قسم الحجز / زر الحجز" },
                { key: "showWhatsappButton", label: "إظهار زر واتساب العائم" },
                { key: "showPrices",         label: "إظهار الأسعار في صفحة الخدمات" },
                { key: "showTeamPhotos",     label: "إظهار صور أعضاء الفريق" },
              ] as const).map(opt => (
                <div key={opt.key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-[13px] text-gray-900">{opt.label}</span>
                  <Toggle checked={builder[opt.key] as boolean} onChange={v => setB(opt.key, v)} />
                </div>
              ))}
              {builder.showWhatsappButton && (
                <div className="pt-2">
                  <FieldInput label="رسالة واتساب الافتراضية" value={builder.whatsappMessage} onChange={v => setB("whatsappMessage", v)} placeholder="مرحبا، أريد الاستفسار" />
                </div>
              )}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button icon={Save} loading={contentSaving} onClick={saveContent}>حفظ المحتوى</Button>
          </div>

          {/* Add block modal */}
          {addMainBlockOpen && (
            <Modal open title="اختر نوع القسم" onClose={() => setAddMainBlockOpen(false)}>
              <div className="grid grid-cols-2 gap-2">
                {BLOCK_TYPES.map(bt => (
                  <button key={bt.type} onClick={() => addMainBlock(bt.type)}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 text-right transition-colors cursor-pointer bg-transparent">
                    <bt.icon className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bt.label}</p>
                      <p className="text-xs text-gray-400">{bt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Modal>
          )}

          {mainImagePicker && (
            <MediaPickerModal
              title="اختر صورة"
              onSelect={(asset) => {
                const blk = builder.customBlocks.find(b => b.id === mainImagePicker.blockId);
                if (!blk) { setMainImagePicker(null); return; }
                if (mainImagePicker.field === "gallery_add") {
                  const existing = Array.isArray(blk.content?.images) ? (blk.content.images as string[]) : [];
                  updateMainBlock(mainImagePicker.blockId, { ...blk.content, images: [...existing, asset.fileUrl] });
                } else {
                  updateMainBlock(mainImagePicker.blockId, { ...blk.content, [mainImagePicker.field]: asset.fileUrl });
                }
                setMainImagePicker(null);
              }}
              onClose={() => setMainImagePicker(null)}
            />
          )}
        </div>
      )}

      {/* ── Settings ─────────────────────────────────────────── */}
      {tabId === "settings" && settings && (
        <div className="grid grid-cols-2 gap-4">
          {/* Domain */}
          <Card title="الدومين">
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 rounded-xl px-3.5 py-2.5">
                <p className="text-xs text-gray-400 mb-0.5">نطاق نسق المجاني</p>
                <p className="text-[13px] font-semibold text-brand-400 font-mono">nasaq.sa/{orgSlug || "—"}</p>
              </div>
              <FieldInput label="نطاق مخصص (اختياري)" value={settings.customDomain} onChange={v => s("customDomain", v)} placeholder="www.yoursite.com" dir="ltr" />
              <div className="bg-amber-50 rounded-xl px-3.5 py-2.5 text-xs text-amber-700">
                وجّه DNS Record من نوع CNAME إلى: <span className="font-mono font-bold">sites.nasaq.sa</span>
              </div>
            </div>
          </Card>

          {/* SEO */}
          <Card title="تحسين محركات البحث (SEO)">
            <div className="flex flex-col gap-3">
              <FieldInput label="عنوان الصفحة الافتراضي" value={settings.defaultMetaTitle} onChange={v => s("defaultMetaTitle", v)} placeholder="اسم المنشأة — وصف قصير" />
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1.5">وصف الصفحة</label>
                <textarea value={settings.defaultMetaDescription} onChange={e => s("defaultMetaDescription", e.target.value)} rows={3}
                  placeholder="وصف مختصر يظهر في نتائج البحث..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] resize-none outline-none box-border" />
                <p className="text-[10px] text-gray-300 mt-1">{settings.defaultMetaDescription.length} / 160 حرف</p>
              </div>
            </div>
          </Card>

          {/* Analytics */}
          <Card title="التتبع والتحليلات">
            <div className="flex flex-col gap-3">
              {([
                { key: "googleAnalyticsId", label: "Google Analytics",  placeholder: "G-XXXXXXXXXX" },
                { key: "gtmContainerId",    label: "Google Tag Manager", placeholder: "GTM-XXXXXXX" },
                { key: "facebookPixelId",   label: "Facebook Pixel",     placeholder: "123456789012345" },
                { key: "snapchatPixelId",   label: "Snapchat Pixel",     placeholder: "xxxxxxxx-xxxx" },
                { key: "tiktokPixelId",     label: "TikTok Pixel",       placeholder: "CXXXXXXXXX" },
              ] as const).map(f => (
                <FieldInput key={f.key} label={f.label} value={settings[f.key]} onChange={v => s(f.key, v)} placeholder={f.placeholder} dir="ltr" />
              ))}
            </div>
          </Card>

          {/* Custom code */}
          <Card title="كود مخصص">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1.5">قبل نهاية &lt;head&gt;</label>
                <textarea value={settings.customHeadCode} onChange={e => s("customHeadCode", e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono resize-none outline-none box-border" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1.5">قبل نهاية &lt;body&gt;</label>
                <textarea value={settings.customBodyCode} onChange={e => s("customBodyCode", e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono resize-none outline-none box-border" />
              </div>
            </div>
          </Card>

          <div className="col-span-2 flex justify-end">
            <Button icon={Save} loading={settingsSaving} onClick={saveSettings}>حفظ الإعدادات</Button>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────── */}
      {pageModal && (
        <Modal open title={pageModal.item ? "تعديل بيانات الصفحة" : "صفحة جديدة"} onClose={() => setPageModal(null)}
          footer={<><Button variant="secondary" onClick={() => setPageModal(null)}>إلغاء</Button><Button onClick={savePage} loading={pageSaving}>حفظ</Button></>}>
          <div className="space-y-4">
            <FieldInput label="عنوان الصفحة" value={pageForm.title} onChange={v => setPageForm(p => ({ ...p, title: v }))} placeholder="من نحن، تواصل معنا..." />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">نوع الصفحة</label>
              <select value={pageForm.type} onChange={e => setPageForm(p => ({ ...p, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="home">الرئيسية</option>
                <option value="services">الخدمات</option>
                <option value="about">من نحن</option>
                <option value="contact">تواصل معنا</option>
                <option value="custom">مخصصة</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">نشر الصفحة فوراً</span>
              <Toggle checked={pageForm.isPublished} onChange={v => setPageForm(p => ({ ...p, isPublished: v }))} />
            </div>
          </div>
        </Modal>
      )}

      {postModal && (
        <Modal open title={postModal.item ? "تعديل المقال" : "مقال جديد"} onClose={() => setPostModal(null)}
          footer={<><Button variant="secondary" onClick={() => setPostModal(null)}>إلغاء</Button><Button onClick={savePost} loading={postSaving}>حفظ</Button></>}>
          <div className="space-y-4">
            <FieldInput label="العنوان" value={postForm.title} onChange={v => setPostForm(p => ({ ...p, title: v }))} />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">الملخص</label>
              <textarea value={postForm.excerpt} onChange={e => setPostForm(p => ({ ...p, excerpt: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none box-border" />
            </div>
            <RichTextEditor
              label="المحتوى"
              value={postForm.content}
              onChange={v => setPostForm(p => ({ ...p, content: v }))}
              minHeight={200}
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="التصنيف" value={postForm.category} onChange={v => setPostForm(p => ({ ...p, category: v }))} placeholder="نصائح، أخبار..." />
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">الحالة</label>
                <select value={postForm.status} onChange={e => setPostForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="draft">مسودة</option>
                  <option value="published">منشور</option>
                </select>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {logoPicker && (
        <MediaPickerModal
          title="اختر شعار الموقع"
          onSelect={(asset) => { if (design) d("logoUrl", asset.fileUrl); setLogoPicker(false); }}
          onClose={() => setLogoPicker(false)}
        />
      )}

      {sectionPicker === "hero" && (
        <MediaPickerModal
          title="اختر صورة خلفية البانر"
          onSelect={(asset) => { setB("heroSettings", { ...builder.heroSettings, imageUrl: asset.fileUrl }); setSectionPicker(null); }}
          onClose={() => setSectionPicker(null)}
        />
      )}

      {sectionPicker === "about" && (
        <MediaPickerModal
          title="اختر صورة قسم (عن المنشأة)"
          onSelect={(asset) => { setB("aboutSettings", { ...builder.aboutSettings, imageUrl: asset.fileUrl }); setSectionPicker(null); }}
          onClose={() => setSectionPicker(null)}
        />
      )}

      {/* ── Preset apply confirmation modal ── */}
      {presetModal && (
        <Modal open
          title={`تطبيق قالب "${TEMPLATES.find(t => t.id === presetModal)?.name}" مع محتوى كامل`}
          onClose={() => !presetApplying && setPresetModal(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPresetModal(null)} disabled={presetApplying}>إلغاء</Button>
              <Button loading={presetApplying} onClick={applyPreset}>تطبيق القالب كاملاً</Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">سيُطبَّق القالب مع محتوى احترافي جاهز يشمل:</p>
            <ul className="space-y-2">
              {[
                "نصوص عربية جاهزة للبانر، عن المنشأة، والأقسام",
                "معرض صور تعبيرية احترافية",
                "أسئلة شائعة مناسبة لنشاطك",
                "إحصائيات وأرقام إنجاز",
                "ترتيب أقسام محسّن لهذا النشاط",
                "قسم حجز CTA جاهز",
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
              تنبيه: سيتم استبدال المحتوى الحالي في موقعك بالمحتوى التجريبي. يمكنك تعديل كل شيء بعد التطبيق من تبويب المحتوى والأقسام.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══ Helper Components ═════════════════════════════════════════════

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-[13px] font-bold text-gray-900 mb-3.5">{title}</p>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={clsx("w-9 h-5 rounded-full relative border-0 cursor-pointer transition-colors shrink-0", checked ? "bg-brand-400" : "bg-gray-200")}>
      <span className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all", checked ? "right-0.5" : "left-0.5")} />
    </button>
  );
}

function ColorField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-900 mb-1.5">{label}</label>
      <div className="flex items-center gap-2.5">
        <input type="color" value={value || "#5b9bd5"} onChange={e => onChange(e.target.value)}
          className="w-9 h-9 border border-gray-200 rounded-lg cursor-pointer p-0.5 shrink-0" />
        <input value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-[13px] outline-none text-gray-900"
          dir="ltr" placeholder={placeholder || "#5b9bd5"} />
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, dir }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; dir?: "ltr" | "rtl" }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-900 mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        dir={dir}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none text-gray-900 box-border" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
      <Icon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">{title}</p>
      <p className="text-sm text-gray-400 mt-1 mb-4">{desc}</p>
      {action}
    </div>
  );
}

function IconBtn({ onClick, title, className, children }: { onClick: () => void; title?: string; className?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className={clsx("p-1.5 rounded-lg hover:bg-gray-100 bg-transparent border-0 cursor-pointer transition-colors", className)}>
      {children}
    </button>
  );
}

function StatusBadge({ published, labels }: { published: boolean; labels: [string, string] }) {
  return (
    <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-semibold",
      published ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500")}>
      {published ? labels[0] : labels[1]}
    </span>
  );
}

function OptionsRow({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-900 mb-1.5">{label}</label>
      <div className="flex rounded-xl border border-gray-200 overflow-hidden">
        {options.map(o => (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            className={clsx("flex-1 py-2 text-[11px] font-medium transition-colors border-0 cursor-pointer leading-tight",
              value === o.id ? "bg-brand-400 text-white" : "bg-white text-gray-500 hover:bg-gray-50")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionRow({ section, isFirst, isLast, isHidden, expanded, onToggle, onExpand, onMoveUp, onMoveDown, children }: {
  section: { id: string; name: string; icon: React.ComponentType<{ size?: number; className?: string }>; canHide: boolean; src: string };
  isFirst: boolean; isLast: boolean; isHidden: boolean; expanded: boolean;
  onToggle: () => void; onExpand: () => void; onMoveUp: () => void; onMoveDown: () => void;
  children?: React.ReactNode;
}) {
  const Icon = section.icon;
  return (
    <div className={clsx("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", isHidden && "opacity-55")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900">{section.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{section.src}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {section.canHide && (
            <span className={clsx("text-[11px] px-2 py-0.5 rounded-full", isHidden ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700")}>
              {isHidden ? "مخفي" : "مفعّل"}
            </span>
          )}
          {!section.canHide && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">دائم</span>}
          {section.canHide && <Toggle checked={!isHidden} onChange={() => onToggle()} />}
          <button onClick={onMoveUp} disabled={isFirst} className={clsx("p-1 border-0 bg-transparent rounded-md", isFirst ? "cursor-not-allowed text-gray-200" : "cursor-pointer text-gray-400 hover:text-gray-600")}>
            <ChevronUp size={15} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className={clsx("p-1 border-0 bg-transparent rounded-md", isLast ? "cursor-not-allowed text-gray-200" : "cursor-pointer text-gray-400 hover:text-gray-600")}>
            <ChevronDown size={15} />
          </button>
          {["hero", "services", "about", "reviews", "contact"].includes(section.id) && (
            <button onClick={onExpand} className={clsx("px-2 py-1 rounded-lg border text-[11px] cursor-pointer transition-colors bg-transparent", expanded ? "border-brand-400 bg-brand-50 text-brand-600" : "border-gray-200 text-gray-400")}>
              تعديل
            </button>
          )}
        </div>
      </div>
      {children && <div className="border-t border-gray-100 px-4 pb-4">{children}</div>}
    </div>
  );
}
