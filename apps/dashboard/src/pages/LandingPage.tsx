import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import {
  Scissors, Flower2, Utensils, Car, Camera,
  Building2, ShoppingBag, Star, Check, Menu, X,
  GraduationCap, ArrowLeft, Calendar, Package,
  BarChart3, Users, Globe, CreditCard, ChevronDown,
  Zap, Shield, Bell, MessageCircle, TrendingUp,
  Clock, Layers, RefreshCw, Lock, Smartphone,
  FileText, DollarSign, PieChart, Settings,
  CheckCircle, ChevronRight, Minus, Plus, Tag,
  Store, ChefHat, Home, Truck, Megaphone, Gift, GraduationCap as School,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  priceMonthly: string;
  priceYearly: string;
  originalPriceMonthly: string | null;
  originalPriceYearly: string | null;
  maxBranches: number;
  maxEmployees: number;
  trialDays: number;
  isLaunchOffer: boolean;
}

interface PlanAddon {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  priceYearly: string;
}

// ── Hooks: fetch real billing data ─────────────────────────────────────────────
function useLandingPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<PlanAddon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/billing/plans").then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/v1/billing/plan-addons").then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([plansRes, addonsRes]) => {
      setPlans(plansRes.data ?? []);
      setAddons(addonsRes.data ?? []);
      setLoading(false);
    });
  }, []);

  return { plans, addons, loading };
}

// ── Plan display config (features shown on landing page) ───────────────────────
const PLAN_DISPLAY: Record<string, { highlight: boolean; cta: string; features: string[]; missing?: string[] }> = {
  basic: {
    highlight: false,
    cta: "ابدأ مجاناً ٣٠ يوم",
    features: [
      "فرع واحد",
      "حتى ١٠ موظفين",
      "حجوزات غير محدودة",
      "لوحة تحكم كاملة",
      "تقارير أساسية",
      "إدارة المخزون",
      "نقطة بيع",
      "دعم عبر الدردشة",
    ],
    missing: ["متعدد الفروع", "تقارير متقدمة", "API مفتوح"],
  },
  advanced: {
    highlight: true,
    cta: "جرّب ٣٠ يوم مجاناً",
    features: [
      "حتى ٣ فروع",
      "حتى ٣٠ موظفاً",
      "جميع وحدات الأساسي",
      "تقارير متقدمة وتصدير",
      "إشعارات واتساب تلقائية",
      "إدارة الحضور والرواتب",
      "كشوف الرواتب والعمولات",
      "دعم مباشر ٢٤/٧",
    ],
    missing: [],
  },
  enterprise: {
    highlight: false,
    cta: "تواصل مع الفريق",
    features: [
      "حتى ١٠ فروع",
      "حتى ١٠٠ موظف",
      "جميع وحدات المتقدم",
      "API مفتوح للتكامل",
      "مدير حساب مخصص",
      "تقارير BI مخصصة",
      "SLA مضمون ٩٩.٩٪",
      "دعم أولوية قصوى",
    ],
    missing: [],
  },
};

// ── Addon icon map ─────────────────────────────────────────────────────────────
const ADDON_ICONS: Record<string, React.ElementType> = {
  website:      Globe,
  restaurant:   ChefHat,
  real_estate:  Home,
  construction: Building2,
  flower_shop:  Flower2,
  school:       GraduationCap,
  delivery:     Truck,
  marketing:    Megaphone,
  loyalty:      Gift,
};

// ── Animations ─────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes float-a {
  0%,100%{ transform: translateY(0px) rotate(-3deg); }
  50%    { transform: translateY(-10px) rotate(-1deg); }
}
@keyframes float-b {
  0%,100%{ transform: translateY(0px) rotate(2deg); }
  50%    { transform: translateY(-7px) rotate(4deg); }
}
@keyframes float-c {
  0%,100%{ transform: translateY(0px) rotate(-1deg); }
  50%    { transform: translateY(-13px) rotate(1deg); }
}
@keyframes float-d {
  0%,100%{ transform: translateY(0px) rotate(3deg); }
  50%    { transform: translateY(-6px) rotate(1deg); }
}
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(91,155,213,0.4); }
  70%  { box-shadow: 0 0 0 10px rgba(91,155,213,0); }
  100% { box-shadow: 0 0 0 0 rgba(91,155,213,0); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes tagFlow {
  from { opacity: 0; transform: translateY(12px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes encode-pulse {
  0%,100%{ box-shadow: 0 0 0 0 rgba(91,155,213,0); }
  50%    { box-shadow: 0 0 0 8px rgba(91,155,213,0.12); }
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
@keyframes travel-dot {
  0%   { right: 100%; opacity: 0; }
  5%   { opacity: 1; }
  95%  { opacity: 1; }
  100% { right: 0%;  opacity: 0; }
}
@keyframes orbit {
  0%   { transform: rotate(0deg) translateX(60px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
}
@keyframes ticker {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes floatUp {
  0%,100%{ transform: translateY(0px); }
  50%    { transform: translateY(-6px); }
}
@keyframes glow-brand {
  0%,100%{ box-shadow: 0 0 0 0 rgba(91,155,213,0); }
  50%    { box-shadow: 0 0 32px 8px rgba(91,155,213,0.18); }
}
@keyframes reveal-line {
  from { width: 0; }
  to   { width: 100%; }
}
@keyframes counter-in {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}
.hover-lift {
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}
.hover-lift:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 48px rgba(0,0,0,0.1);
}
.hover-brand:hover {
  border-color: rgba(91,155,213,0.4) !important;
  box-shadow: 0 12px 40px rgba(91,155,213,0.15) !important;
}
`;

// ── Data ───────────────────────────────────────────────────────────────────────
const BUSINESS_TYPES = [
  { key: "salon",      label: "صالون وسبا",       icon: Scissors,    color: "#9b8fc4", bg: "#f5f3ff",
    ops: ["حجوزات ذكية", "إدارة موظفون", "نقاط بيع", "منتجات"] },
  { key: "flower",     label: "محل ورد",           icon: Flower2,     color: "#d4917e", bg: "#fff5f2",
    ops: ["مخزون الزهور", "طلبات التوصيل", "دفعات", "باقات"] },
  { key: "restaurant", label: "مطعم وكافيه",       icon: Utensils,    color: "#d4b06a", bg: "#fdfaf3",
    ops: ["قائمة رقمية", "طلبات الطاولات", "توصيل", "مطبخ"] },
  { key: "hotel",      label: "فندق وشقق",         icon: Building2,   color: "#7eb5d4", bg: "#f0f8ff",
    ops: ["الغرف", "الحجوزات", "تسجيل دخول", "الخدمات"] },
  { key: "car_rental", label: "تأجير سيارات",     icon: Car,         color: "#7fb09b", bg: "#f0faf6",
    ops: ["الأسطول", "العقود", "التسليم", "الصيانة"] },
  { key: "retail",     label: "متجر تجزئة",       icon: ShoppingBag, color: "#d4b06a", bg: "#fdfaf3",
    ops: ["المخزون", "نقطة بيع", "عملاء", "مرتجعات"] },
  { key: "photography",label: "استوديو تصوير",    icon: Camera,      color: "#d4917e", bg: "#fff5f2",
    ops: ["جلسات", "عقود", "ألبومات", "معارض"] },
  { key: "events",     label: "تنظيم فعاليات",    icon: Calendar,    color: "#9b8fc4", bg: "#f5f3ff",
    ops: ["المواعيد", "المتطلبات", "الفريق", "التكاليف"] },
];

const RAW_CARDS = [
  { label: "طلب جديد", detail: "الرياض — لم يُؤكَّد",    color: "#fee2e2", border: "#fca5a5", icon: "📋", anim: "float-a 5s ease-in-out infinite" },
  { label: "دفعة معلقة", detail: "١٢٠٠ ر.س — غير مسجّلة", color: "#fef9c3", border: "#fde047", icon: "💳", anim: "float-b 6s ease-in-out infinite 0.5s" },
  { label: "موعد فاته",   detail: "العميل انتظر ولم يُنبَّه", color: "#fce7f3", border: "#f9a8d4", icon: "📅", anim: "float-c 7s ease-in-out infinite 1s" },
  { label: "مخزون ناقص", detail: "وردة حمراء — صفر متبقي",  color: "#dcfce7", border: "#86efac", icon: "📦", anim: "float-d 5.5s ease-in-out infinite 0.3s" },
];

const OPERATION_TAGS = [
  "طلب جديد", "دفعة غير محاسبة", "موعد فاته", "مخزون ناقص",
  "رسالة عميل بلا رد", "غياب موظف", "تقرير غير جاهز", "حجز غير مؤكد",
  "منتج نفد", "إشعار متأخر", "فاتورة ناقصة", "موعد مكرر",
  "طلب توصيل معلق", "عميل جديد بلا متابعة", "خصم لم يُطبَّق",
];

const TESTIMONIALS = [
  { name: "أحمد الشمري", biz: "صالون رجالي، الرياض", role: "صاحب منشأة",
    text: "قبل ترميز كنت أتابع الحجوزات عبر واتساب. الآن كل شيء منظم وعندي تقارير أسبوعية تلقائية. وفّرت ٣ ساعات يومياً.",
    stars: 5, metric: "+٣٨٪ حجوزات", metricColor: "#7fb09b" },
  { name: "سارة القحطاني", biz: "محل ورد، جدة", role: "صاحبة منشأة",
    text: "ما توقعت أن نظاماً يفهم احتياجات محل الورود بهذا الشكل — المخزون، الدفعات، الطلبات كلها في مكان واحد. ممتاز.",
    stars: 5, metric: "٤٠٪ تقليل في الهدر", metricColor: "#d4917e" },
  { name: "فهد العنزي",   biz: "مطعم، الدمام", role: "مدير عمليات",
    text: "نشرنا موقع الحجز في أقل من ساعة. عملاؤنا يحجزون مباشرة والفريق يرى الطلبات لحظة بلحظة. الفوضى اختفت.",
    stars: 5, metric: "٢× سرعة التسليم", metricColor: "#d4b06a" },
];

const DIFFERENTIATORS = [
  { icon: Zap,         title: "تهيئة تلقائية حسب قطاعك",  desc: "النظام يتعرف على نوع أعمالك ويُهيّئ الوحدات والتقارير والعمليات تلقائياً — ليس إعداداً عاماً." },
  { icon: Globe,       title: "موقع إلكتروني فوري",         desc: "صفحة حجز باسم منشأتك جاهزة فور التسجيل — قابلة للتخصيص الكامل بدون مطوّر." },
  { icon: MessageCircle, title: "تنبيهات واتساب تلقائية",  desc: "تأكيد الحجز، تذكير الموعد، إشعار الدفعة — كلها تُرسل لعملائك وفريقك تلقائياً." },
  { icon: Shield,      title: "أمان متعدد المستأجرين",      desc: "بياناتك معزولة تماماً — كل منشأة في بيئة مستقلة، والوصول محكوم بالصلاحيات الدقيقة." },
  { icon: BarChart3,   title: "تقارير في لحظتها",           desc: "إيرادات، حجوزات، أداء الموظفين، تقرير المخزون — كلها حية، دون انتظار تصدير يدوي." },
  { icon: Layers,      title: "وحدات تتكامل معاً",           desc: "المخزون يُحدَّث عند كل بيع، الحسابات تُسجَّل تلقائياً، والتقارير تعكس الواقع في لحظته." },
  { icon: Smartphone,  title: "تصميم متجاوب بالكامل",       desc: "سواء من جوالك أو جهاز اللوحة أو الكمبيوتر — كل الوحدات تعمل بسلاسة في كل مكان." },
  { icon: RefreshCw,   title: "تحديثات مستمرة بلا توقف",    desc: "ميزات جديدة تُضاف أسبوعياً بناءً على احتياجات السوق السعودي — دون أي تكلفة إضافية." },
];

const PAIN_COMPARISON = [
  { pain: "الحجوزات عبر واتساب وورق",    fix: "نظام حجز آلي مع تأكيد فوري" },
  { pain: "تتبع الدفعات يدوياً",          fix: "محاسبة تلقائية وتقارير مالية" },
  { pain: "المخزون يُحسب بالخبرة",        fix: "تتبع مخزون دقيق مع تنبيهات" },
  { pain: "الموظفون بلا نظام حضور",       fix: "سجل حضور وأداء وصلاحيات" },
  { pain: "لا تعرف أي خدمة تُربحك",      fix: "تقارير ربحية لكل خدمة ومنتج" },
  { pain: "العميل ينتظر ولا أحد يرد",    fix: "إشعارات تلقائية ومتابعة منظّمة" },
];

const FAQ_ITEMS = [
  { q: "هل يناسب ترميز OS منشأتي الصغيرة؟",
    a: "نعم تماماً. صُمّم ترميز خصيصاً للمنشآت الصغيرة والمتوسطة في السعودية. الخطة المجانية تكفي لبدء العمل فوراً، وتنمو الخطة معك." },
  { q: "كم يستغرق الإعداد؟",
    a: "أقل من ١٥ دقيقة للخطوات الأساسية — اسم المنشأة، القطاع، الخدمات، الموظفون. موقع الحجز يكون جاهزاً فور إتمام التسجيل." },
  { q: "هل بياناتي آمنة؟",
    a: "كل منشأة في بيئة معزولة تماماً. نستخدم تشفير SSL وبنية تحتية سحابية على مستوى المؤسسات. لا يمكن لأي منشأة الاطلاع على بيانات منشأة أخرى." },
  { q: "هل يعمل مع نظام نقاط البيع؟",
    a: "نعم، وحدة نقطة البيع مدمجة وتتزامن مع المخزون والمحاسبة تلقائياً — لا حاجة لربط أنظمة خارجية." },
  { q: "ماذا يحدث عند انتهاء التجربة المجانية؟",
    a: "تحتفظ ببياناتك كاملةً. إما تختار خطة مدفوعة أو تستمر على الخطة المجانية بالحدود المحددة. لا يُحذف أي شيء تلقائياً." },
  { q: "هل يوجد تدريب أو دعم؟",
    a: "نعم — وصول فوري لمكتبة الفيديوهات التعريفية، ودعم دردشة مباشرة في أوقات العمل، ودعم واتساب لخطط الأعمال." },
];

// ── Hooks ──────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    const step = target / (duration / 16);
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCount(Math.floor(cur));
      if (cur >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [start, target, duration]);
  return count;
}

// ── Mini UI Previews ───────────────────────────────────────────────────────────
function DashboardPreview() {
  return (
    <div style={{ display: "flex", height: "100%", gap: 6 }}>
      <div style={{ width: 28, display: "flex", flexDirection: "column", gap: 4 }}>
        {["#5b9bd5","#e2e8f0","#e2e8f0","#e2e8f0","#e2e8f0"].map((bg, i) => (
          <div key={i} style={{ height: 22, borderRadius: 5, background: bg }} />
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
          {["#EBF3FB","#f0faf6","#fdfaf3","#f5f3ff"].map((bg, i) => (
            <div key={i} style={{ background: bg, borderRadius: 7, padding: "6px 8px" }}>
              <div style={{ height: 5, width: "50%", borderRadius: 3, background: "#cbd5e1", marginBottom: 4 }} />
              <div style={{ height: 9, width: "70%", borderRadius: 3, background: "#94a3b8" }} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1, background: "#f8fafc", borderRadius: 7, display: "flex", alignItems: "flex-end", gap: 3, padding: "6px 6px 0" }}>
          {[55,75,45,90,65,80,70].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "3px 3px 0 0",
              background: i === 5 ? "#5b9bd5" : `rgba(91,155,213,${0.18 + i * 0.07})` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      <div style={{ height: 32, borderRadius: 7, background: "linear-gradient(135deg,#7fb09b,#5b9bd5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ height: 6, width: 60, borderRadius: 3, background: "rgba(255,255,255,0.7)" }} />
      </div>
      {["#f0faf6","#f8fafc","#f8fafc"].map((bg, i) => (
        <div key={i} style={{ height: 26, borderRadius: 7, background: bg, display: "flex", alignItems: "center", padding: "0 8px", gap: 6 }}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: "#7fb09b", opacity: 0.4 }} />
          <div style={{ height: 5, flex: 1, borderRadius: 3, background: "#e2e8f0" }} />
        </div>
      ))}
      <div style={{ height: 28, borderRadius: 7, background: "#7fb09b", marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ height: 6, width: 50, borderRadius: 3, background: "rgba(255,255,255,0.8)" }} />
      </div>
    </div>
  );
}

function ReportsPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      <div style={{ display: "flex", gap: 5 }}>
        {[80, 60, 90].map((v, i) => (
          <div key={i} style={{ flex: 1, background: "#f5f3ff", borderRadius: 7, padding: "6px 8px" }}>
            <div style={{ height: 4, width: "60%", borderRadius: 3, background: "#c4b5fd", marginBottom: 4 }} />
            <div style={{ height: 10, width: "80%", borderRadius: 3, background: "#9b8fc4" }} />
          </div>
        ))}
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <svg viewBox="0 0 100 50" style={{ width: "100%", height: "100%" }}>
          <polyline points="0,40 15,30 30,35 45,15 60,25 75,10 90,20 100,5"
            fill="none" stroke="#9b8fc4" strokeWidth="2" strokeLinecap="round" />
          <polyline points="0,40 15,30 30,35 45,15 60,25 75,10 90,20 100,5 100,50 0,50"
            fill="url(#purpleGrad)" stroke="none" opacity="0.15" />
          <defs>
            <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9b8fc4" />
              <stop offset="100%" stopColor="white" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function TeamPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, height: "100%" }}>
      {[
        { name: "أحمد", role: "مدير", color: "#d4b06a" },
        { name: "سارة", role: "موظف", color: "#7fb09b" },
        { name: "خالد", role: "موظف", color: "#9b8fc4" },
      ].map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 8px",
          background: "#fdfaf3", borderRadius: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: m.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {m.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 5, width: 36, borderRadius: 3, background: "#94a3b8", marginBottom: 3 }} />
            <div style={{ height: 4, width: 24, borderRadius: 3, background: "#e2e8f0" }} />
          </div>
          <div style={{ height: 14, width: 38, borderRadius: 10,
            background: m.role === "مدير" ? "#fef9c3" : "#f0faf6",
            border: `1px solid ${m.role === "مدير" ? "#fde047" : "#86efac"}` }} />
        </div>
      ))}
    </div>
  );
}

// ── Hero Transformation Visual ─────────────────────────────────────────────────
function TransformVisual() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 480 }}>
      {/* Raw cards — chaos state */}
      <div style={{ position: "relative", height: 230, marginBottom: 16 }}>
        {RAW_CARDS.map((card, i) => (
          <div key={i} style={{
            position: "absolute",
            top: [0, 24, 60, 15][i],
            right: [0, 190, 95, 285][i],
            background: "white",
            border: `1px solid ${card.border}`,
            borderRadius: 14,
            padding: "10px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            animation: card.anim,
            minWidth: 155,
            zIndex: [3, 2, 4, 1][i],
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{card.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{card.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.4 }}>{card.detail}</div>
            <div style={{ marginTop: 6, height: 4, width: "70%", borderRadius: 3, background: card.border, opacity: 0.6 }} />
          </div>
        ))}
      </div>

      {/* Encoding line */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingRight: 8 }}>
        <div style={{ flex: 1, height: 1.5, background: "linear-gradient(90deg, transparent, #5b9bd5)" }} />
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#5b9bd5", color: "white",
          padding: "6px 18px", borderRadius: 100,
          fontSize: 12, fontWeight: 700,
          animation: "encode-pulse 2.5s ease-in-out infinite",
          boxShadow: "0 4px 20px rgba(91,155,213,0.45)",
        }}>
          <span style={{ fontSize: 10, opacity: 0.8 }}>✦</span>
          <span>ترميز</span>
          <span style={{ fontSize: 10, opacity: 0.8 }}>✦</span>
        </div>
        <div style={{ flex: 1, height: 1.5, background: "linear-gradient(90deg, #5b9bd5, transparent)" }} />
      </div>

      {/* Dashboard — system state */}
      <div style={{
        background: "white",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 40px 80px rgba(91,155,213,0.25), 0 12px 32px rgba(0,0,0,0.1)",
        transform: "perspective(900px) rotateX(8deg) rotateY(-5deg)",
        transformOrigin: "center bottom",
        border: "1px solid rgba(91,155,213,0.15)",
        height: 185,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
          {["#ff5f57","#febc2e","#28c840"].map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
          ))}
          <div style={{ flex: 1, height: 16, borderRadius: 6, background: "#f1f5f9", marginRight: 8 }} />
        </div>
        <DashboardPreview />
      </div>
    </div>
  );
}

// ── Stat Item ──────────────────────────────────────────────────────────────────
function StatItem({ target, suffix, label, sub, start }: { target: number; suffix: string; label: string; sub?: string; start: boolean }) {
  const count = useCounter(target, 1800, start);
  return (
    <div style={{ textAlign: "center", padding: "24px 20px" }}>
      <div style={{ fontSize: 52, fontWeight: 800, color: "#0f172a", lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-2px" }}>
        {count.toLocaleString("ar-SA")}{suffix}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── FAQ Item ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 14, border: "1px solid #e2e8f0",
      background: "white", overflow: "hidden",
      transition: "box-shadow 0.2s",
      boxShadow: open ? "0 8px 32px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", background: "none", border: "none", cursor: "pointer",
          textAlign: "right",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", textAlign: "right", flex: 1 }}>{q}</span>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginRight: 12,
          background: open ? "#5b9bd5" : "#f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s",
        }}>
          {open ? <Minus size={14} color="white" /> : <Plus size={14} color="#64748b" />}
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 24px 20px", fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
          {a}
        </div>
      )}
    </div>
  );
}

// ── Public Header ──────────────────────────────────────────────────────────────
function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const platform = usePlatformConfig();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Hero is white — always dark text
  const textColor = "#0f172a";
  const navColor  = "#475569";
  const navHover  = "#5b9bd5";

  const navLinks = [
    { href: "#features",    label: "المميزات" },
    { href: "#sectors",     label: "القطاعات" },
    { href: "#transform",   label: "كيف يعمل" },
    { href: "#pricing",     label: "الأسعار" },
    { href: "#faq",         label: "الأسئلة الشائعة" },
  ];

  return (
    <header style={{
      position: "fixed", top: 0, insetInline: 0, zIndex: 50,
      transition: "all 0.35s ease",
      background: scrolled ? "rgba(255,255,255,0.96)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(0,0,0,0.07)" : "1px solid transparent",
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: platform.logoUrl ? "transparent" : "#5b9bd5",
            border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: platform.logoUrl ? "none" : "0 4px 14px rgba(91,155,213,0.25)",
            overflow: "hidden",
          }}>
            {platform.logoUrl
              ? <img src={platform.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              : <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>ت</span>
            }
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: textColor, transition: "color 0.35s ease" }}>
            {platform.platformName}
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 26 }} className="hidden md:flex">
          {navLinks.map(n => (
            <a key={n.href} href={n.href} style={{
              fontSize: 14, fontWeight: 500, color: navColor,
              textDecoration: "none", transition: "color 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = navHover)}
            onMouseLeave={e => (e.currentTarget.style.color = navColor)}>
              {n.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="hidden md:flex">
          <Link to="/school" style={{
            fontSize: 13, fontWeight: 500,
            color: "#7fb09b",
            padding: "7px 14px", borderRadius: 10,
            border: "1px solid #86efac",
            textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
            transition: "all 0.3s",
          }}>
            <GraduationCap size={14} />
            للمدارس
          </Link>
          <Link to="/login" style={{
            fontSize: 14, fontWeight: 500,
            color: "#64748b",
            padding: "8px 16px", borderRadius: 10, textDecoration: "none",
            transition: "all 0.3s",
          }}>
            الدخول
          </Link>
          <Link to="/register" style={{
            fontSize: 14, fontWeight: 600, color: "white",
            padding: "9px 22px", borderRadius: 10, textDecoration: "none",
            background: "#5b9bd5",
            boxShadow: "0 4px 14px rgba(91,155,213,0.3)",
            transition: "all 0.3s",
          }}>
            ابدأ مجاناً
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#0f172a", padding: 4 }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          background: "white", borderTop: "1px solid #f1f5f9",
          padding: "16px 24px 20px",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {navLinks.map(n => (
            <a key={n.href} href={n.href}
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: 15, fontWeight: 500, color: "#475569", padding: "10px 0",
                textDecoration: "none", borderBottom: "1px solid #f1f5f9" }}>
              {n.label}
            </a>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Link to="/login" onClick={() => setMobileOpen(false)} style={{
              flex: 1, textAlign: "center", padding: "10px", borderRadius: 10,
              border: "1px solid #e2e8f0", fontSize: 14, fontWeight: 500,
              color: "#64748b", textDecoration: "none",
            }}>الدخول</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} style={{
              flex: 1, textAlign: "center", padding: "10px", borderRadius: 10,
              background: "#5b9bd5", fontSize: 14, fontWeight: 600,
              color: "white", textDecoration: "none",
            }}>ابدأ مجاناً</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Mouse cursor glow effect ───────────────────────────────────────────────────
function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = e.clientX + "px";
        glowRef.current.style.top  = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return (
    <div ref={glowRef} style={{
      position: "fixed", pointerEvents: "none", zIndex: 0,
      width: 400, height: 400, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(91,155,213,0.06) 0%, transparent 70%)",
      transform: "translate(-50%,-50%)",
      transition: "left 0.1s ease, top 0.1s ease",
    }} />
  );
}

// ── Tilt card component ────────────────────────────────────────────────────────
function TiltCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateZ(8px)`;
  };
  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0px)";
  };
  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ transition: "transform 0.15s ease", ...style }}>
      {children}
    </div>
  );
}

// ── System Showcase (interactive 3D dashboard demos per business type) ─────────
const SHOWCASE_TABS = [
  { key: "salon",    label: "صالون وسبا",    icon: Scissors,  color: "#9b8fc4" },
  { key: "flower",   label: "محل ورد",       icon: Flower2,   color: "#d4917e" },
  { key: "retail",   label: "مخزون وتجزئة",  icon: ShoppingBag, color: "#d4b06a" },
  { key: "hr",       label: "الموارد البشرية", icon: Users,    color: "#5b9bd5" },
  { key: "docs",     label: "تذكيرات وثائق",  icon: FileText, color: "#7fb09b" },
  { key: "restaurant", label: "مطعم وكافيه", icon: Utensils, color: "#e08058" },
];

function ShowcaseSalon() {
  const appts = [
    { time: "٩:٠٠", name: "محمد العتيبي", svc: "قص + تشكيل", staff: "عمر", status: "مكتمل", color: "#7fb09b" },
    { time: "١٠:٣٠", name: "خالد الشمري", svc: "حلاقة كاملة", staff: "سعد", status: "قيد التنفيذ", color: "#5b9bd5" },
    { time: "١١:٠٠", name: "فارس القحطاني", svc: "صبغ وعناية", staff: "علي", status: "قادم", color: "#d4b06a" },
    { time: "١٢:٣٠", name: "عبدالله الدوسري", svc: "قص شعر", staff: "عمر", status: "قادم", color: "#d4b06a" },
  ];
  return (
    <div style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "حجوزات اليوم", val: "١٢", sub: "+٣ غداً", color: "#5b9bd5" },
          { label: "إيراد الأسبوع", val: "٤٨٠٠ ر.س", sub: "+١٨٪", color: "#7fb09b" },
          { label: "نسبة الحضور", val: "٩٤٪", sub: "٣/٣ موظفين", color: "#9b8fc4" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#f8fafc", borderRadius: 10, padding: "8px 10px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{k.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 9, color: "#94a3b8" }}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>مواعيد اليوم</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {appts.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc",
            borderRadius: 8, padding: "6px 10px", border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#5b9bd5", minWidth: 36 }}>{a.time}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>{a.name}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{a.svc} · {a.staff}</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, color: a.color,
              background: a.color + "18", padding: "2px 7px", borderRadius: 20 }}>{a.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseFlower() {
  const stock = [
    { name: "وردة حمراء", qty: 240, unit: "ساق", warn: false, expiry: "٥ أيام" },
    { name: "ليلي أبيض", qty: 18, unit: "ساق", warn: true, expiry: "٢ أيام" },
    { name: "أوركيد", qty: 95, unit: "ساق", warn: false, expiry: "١٢ يوم" },
    { name: "زنبق أصفر", qty: 7, unit: "ساق", warn: true, expiry: "١ يوم" },
  ];
  const orders = [
    { id: "#٢١٤٣", desc: "باقة عيد ميلاد", total: "٢٨٠ ر.س", status: "جاهز للتسليم" },
    { id: "#٢١٤٤", desc: "تنسيق زفاف", total: "١٨٠٠ ر.س", status: "قيد التحضير" },
  ];
  return (
    <div style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>مخزون الزهور</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
        {stock.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, fontSize: 11, color: s.warn ? "#ef4444" : "#0f172a", fontWeight: s.warn ? 700 : 400 }}>
              {s.warn && "⚠ "}{s.name}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.qty} {s.unit}</div>
            <div style={{ fontSize: 9, background: s.warn ? "#fee2e2" : "#f0faf6",
              color: s.warn ? "#ef4444" : "#7fb09b", padding: "1px 6px", borderRadius: 10 }}>
              ينتهي {s.expiry}
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: "#e2e8f0", marginBottom: 10 }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>طلبات نشطة</div>
      {orders.map((o, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fdfaf3",
          borderRadius: 8, padding: "7px 10px", marginBottom: 4, border: "1px solid #fef3c7" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#d4b06a" }}>{o.id}</div>
          <div style={{ flex: 1, fontSize: 10, color: "#0f172a" }}>{o.desc}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>{o.total}</div>
          <div style={{ fontSize: 9, color: "#7fb09b", background: "#f0faf6", padding: "2px 6px", borderRadius: 10 }}>{o.status}</div>
        </div>
      ))}
    </div>
  );
}

function ShowcaseRetail() {
  const items = [
    { name: "قهوة مختصة ٢٥٠ج", sku: "COF-001", qty: 142, reorder: 50, status: "كافٍ" },
    { name: "كبسولات نسبريسو", sku: "CAP-022", qty: 23, reorder: 30, status: "منخفض" },
    { name: "مطحنة يدوية", sku: "GRD-007", qty: 8, reorder: 10, status: "منخفض" },
    { name: "فلتر ورقي V60", sku: "FLT-003", qty: 340, reorder: 100, status: "كافٍ" },
  ];
  return (
    <div style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "إجمالي المنتجات", val: "٢٨٤", color: "#5b9bd5" },
          { label: "منتجات منخفضة", val: "١١", color: "#ef4444" },
          { label: "مبيعات اليوم", val: "٣٢٠٠ ر.س", color: "#7fb09b" },
          { label: "طلبات شراء", val: "٣ معلقة", color: "#d4b06a" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "7px 10px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 9, color: "#64748b" }}>{k.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>المخزون</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
            background: item.status === "منخفض" ? "#fff7ed" : "#f8fafc",
            borderRadius: 7, border: `1px solid ${item.status === "منخفض" ? "#fed7aa" : "#f1f5f9"}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#0f172a" }}>{item.name}</div>
              <div style={{ fontSize: 9, color: "#94a3b8" }}>{item.sku}</div>
            </div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{item.qty} وحدة</div>
            <div style={{ fontSize: 9, fontWeight: 600,
              color: item.status === "منخفض" ? "#ef4444" : "#7fb09b",
              background: item.status === "منخفض" ? "#fee2e2" : "#f0faf6",
              padding: "1px 6px", borderRadius: 10 }}>{item.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseHR() {
  const employees = [
    { name: "سعد العمري", role: "مدير فرع", attend: "حاضر", since: "٨:٠٢" },
    { name: "نورة الفيصل", role: "موظفة استقبال", attend: "حاضر", since: "٨:١٥" },
    { name: "عمر المطيري", role: "فني", attend: "غائب", since: "—" },
    { name: "ريم الحربي", role: "محاسبة", attend: "إجازة", since: "—" },
  ];
  return (
    <div style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "إجمالي الموظفين", val: "١٨", color: "#5b9bd5" },
          { label: "حاضرون اليوم", val: "١٤", color: "#7fb09b" },
          { label: "طلبات إجازة", val: "٣", color: "#d4b06a" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "7px 10px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 9, color: "#64748b" }}>{k.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>الحضور اليوم</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {employees.map((e, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
            background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EBF3FB",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#5b9bd5", flexShrink: 0 }}>
              {e.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#0f172a" }}>{e.name}</div>
              <div style={{ fontSize: 9, color: "#94a3b8" }}>{e.role}</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 9, fontWeight: 600,
                color: e.attend === "حاضر" ? "#7fb09b" : e.attend === "غائب" ? "#ef4444" : "#d4b06a",
                background: e.attend === "حاضر" ? "#f0faf6" : e.attend === "غائب" ? "#fee2e2" : "#fef9c3",
                padding: "2px 7px", borderRadius: 10 }}>{e.attend}</div>
              {e.since !== "—" && <div style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 1 }}>{e.since}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseDocs() {
  const docs = [
    { name: "Ahmed Mostafa",  type: "إقامة",           expiry: "٢٠٢٥/٠٤/١٢", days: 6,   urgent: true },
    { name: "عمر المطيري",   type: "رخصة قيادة",      expiry: "٢٠٢٥/٠٥/٣٠", days: 54,  urgent: false },
    { name: "Maria Santos",   type: "تأشيرة عمل",      expiry: "٢٠٢٥/٠٤/٢٠", days: 14,  urgent: true },
    { name: "ريم الحربي",    type: "عقد عمل",         expiry: "٢٠٢٥/٠٦/٠١", days: 56,  urgent: false },
    { name: "Raj Patel",      type: "شهادة صحية",      expiry: "٢٠٢٥/٠٤/٠٨", days: 2,   urgent: true },
  ];
  return (
    <div style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { label: "تنتهي هذا الأسبوع", val: "٣", color: "#ef4444", bg: "#fee2e2" },
          { label: "تنتهي هذا الشهر", val: "٧", color: "#d4b06a", bg: "#fef9c3" },
          { label: "وثائق سارية", val: "٤٢", color: "#7fb09b", bg: "#f0faf6" },
        ].map((k, i) => (
          <div key={i} style={{ flex: 1, background: k.bg, borderRadius: 8, padding: "7px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.3 }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>وثائق تحتاج تجديد</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {docs.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
            background: d.urgent ? "#fff7ed" : "#f8fafc",
            borderRadius: 8, border: `1px solid ${d.urgent ? "#fed7aa" : "#f1f5f9"}` }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: d.urgent ? "#fee2e2" : "#EBF3FB",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: d.urgent ? "#ef4444" : "#5b9bd5", flexShrink: 0 }}>
              {d.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#0f172a" }}>{d.name}</div>
              <div style={{ fontSize: 9, color: "#94a3b8" }}>{d.type}</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 9, color: d.days <= 7 ? "#ef4444" : d.days <= 30 ? "#d4b06a" : "#7fb09b",
                fontWeight: 700 }}>
                {d.days <= 7 ? `${d.days} أيام` : `${d.days} يوم`}
              </div>
              <div style={{ fontSize: 8, color: "#94a3b8" }}>{d.expiry}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowcaseRestaurant() {
  const orders = [
    { table: "طاولة ٣", items: "شاورما + عصير", total: "٤٥ ر.س", status: "يُحضَّر", min: "١٢" },
    { table: "طاولة ٧", items: "برجر + بطاطس × ٢", total: "٦٠ ر.س", status: "جاهز", min: "٢٤" },
    { table: "توصيل", items: "فراخ مشوية + رز", total: "٨٥ ر.س", status: "في الطريق", min: "٣٥" },
    { table: "طاولة ١", items: "ستيك + مشروب", total: "١٢٠ ر.س", status: "جديد", min: "٢" },
  ];
  return (
    <div style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "طلبات اليوم", val: "٤٨", color: "#5b9bd5" },
          { label: "إيراد اليوم", val: "٣٦٠٠ ر.س", color: "#7fb09b" },
          { label: "طاولات مشغولة", val: "٨/١٢", color: "#e08058" },
        ].map((k, i) => (
          <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "7px 10px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 9, color: "#64748b" }}>{k.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 6, letterSpacing: 1 }}>الطلبات النشطة</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {orders.map((o, i) => {
          const sc = o.status === "جاهز" ? { c: "#7fb09b", bg: "#f0faf6" }
            : o.status === "يُحضَّر" ? { c: "#5b9bd5", bg: "#EBF3FB" }
            : o.status === "في الطريق" ? { c: "#d4b06a", bg: "#fef9c3" }
            : { c: "#e08058", bg: "#fff5f0" };
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
              background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#5b9bd5", minWidth: 42 }}>{o.table}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#0f172a" }}>{o.items}</div>
                <div style={{ fontSize: 9, color: "#94a3b8" }}>{o.total}</div>
              </div>
              <div style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}>{o.min} د</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: sc.c, background: sc.bg,
                padding: "2px 7px", borderRadius: 10 }}>{o.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SystemShowcase() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const demos = [ShowcaseSalon, ShowcaseFlower, ShowcaseRetail, ShowcaseHR, ShowcaseDocs, ShowcaseRestaurant];
  const DemoComponent = demos[active];
  const tab = SHOWCASE_TABS[active];

  return (
    <section ref={ref} style={{ padding: "96px 24px", background: "linear-gradient(180deg, #ffffff 0%, #f0f7ff 50%, #ffffff 100%)", position: "relative" }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 20% 50%, rgba(91,155,213,0.04) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(127,176,155,0.03) 0%, transparent 50%)",
      }} />
      <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 52,
          opacity: inView ? 1 : 0, animation: inView ? "fadeInUp 0.6s ease both" : "none" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#5b9bd5", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
            أمثلة حية من النظام
          </p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#0f172a", marginBottom: 16, lineHeight: 1.2 }}>
            لوحة تحكم مخصصة<br />
            <span style={{ color: "#5b9bd5" }}>لكل قطاع تجاري</span>
          </h2>
          <p style={{ fontSize: 16, color: "#64748b", maxWidth: 500, margin: "0 auto" }}>
            شاهد كيف يتكيّف النظام تلقائياً مع طبيعة عملك — بيانات حقيقية، وعمليات دقيقة
          </p>
        </div>

        {/* Tabs + hint */}
        <div style={{ opacity: inView ? 1 : 0, animation: inView ? "fadeInUp 0.6s 0.15s ease both" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 }}>
            <ChevronRight size={13} color="#5b9bd5" style={{ transform: "rotate(180deg)" }} />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>اضغط على القطاع لتشاهد لوحة تحكمه</span>
            <ChevronRight size={13} color="#5b9bd5" />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
          {SHOWCASE_TABS.map((t, i) => (
            <button key={t.key} onClick={() => setActive(i)} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", borderRadius: 100, border: "none", cursor: "pointer",
              fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif",
              fontSize: 13, fontWeight: active === i ? 700 : 500,
              background: active === i ? t.color : "#f1f5f9",
              color: active === i ? "white" : "#64748b",
              boxShadow: active === i ? `0 6px 20px ${t.color}40` : "none",
              transition: "all 0.2s ease",
              transform: active === i ? "translateY(-2px)" : "none",
            }}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
          </div>
        </div>

        {/* 3D Dashboard */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 48, alignItems: "center",
          opacity: inView ? 1 : 0, animation: inView ? "fadeInUp 0.6s 0.25s ease both" : "none" }}>

          {/* Left: description */}
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24,
              background: tab.color + "15", padding: "8px 16px", borderRadius: 100,
              border: `1px solid ${tab.color}30`,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: tab.color,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <tab.icon size={16} color="white" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: tab.color }}>{tab.label}</span>
            </div>

            {active === 0 && <>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 14, lineHeight: 1.3 }}>إدارة صالون احترافية</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, marginBottom: 20 }}>
                مواعيد موظفين، حجوزات، نقطة بيع، تقارير أداء — كل ما تحتاجه الصالون في شاشة واحدة منظّمة.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["تتبع مواعيد الموظفين لحظة بلحظة", "تذكير تلقائي للعملاء قبل ٢٤ ساعة", "تقارير أداء أسبوعية لكل موظف", "نقطة بيع متكاملة مع المخزون"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                    <CheckCircle size={15} color="#9b8fc4" />
                    {f}
                  </div>
                ))}
              </div>
            </>}
            {active === 1 && <>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 14, lineHeight: 1.3 }}>نظام ورد ذكي</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, marginBottom: 20 }}>
                تتبع مخزون الزهور مع تحذير انتهاء الصلاحية، إدارة الطلبات والتنسيقات، ومتابعة التوصيل.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["تحذير انتهاء صلاحية الزهور مبكراً", "إدارة باقات العرس والمناسبات", "تتبع طلبات التوصيل في الوقت الفعلي", "تقليل الهدر بنسبة تصل إلى ٤٠٪"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                    <CheckCircle size={15} color="#d4917e" />
                    {f}
                  </div>
                ))}
              </div>
            </>}
            {active === 2 && <>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 14, lineHeight: 1.3 }}>مخزون ونقطة بيع</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, marginBottom: 20 }}>
                إدارة المخزون بدقة عالية، تنبيهات إعادة الطلب، ونقطة بيع سريعة تتزامن مع المخزون تلقائياً.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["تحديث المخزون عند كل عملية بيع تلقائياً", "تنبيهات إعادة الطلب عند انخفاض الكمية", "تقارير ربحية لكل منتج وفئة", "دعم الباركود وQR Code"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                    <CheckCircle size={15} color="#d4b06a" />
                    {f}
                  </div>
                ))}
              </div>
            </>}
            {active === 3 && <>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 14, lineHeight: 1.3 }}>إدارة الموارد البشرية</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, marginBottom: 20 }}>
                حضور وانصراف، إجازات، رواتب، أداء — كل شيء في نظام موارد بشرية متكامل مع صلاحيات دقيقة.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["تتبع الحضور والانصراف بالوقت الفعلي", "إدارة طلبات الإجازة إلكترونياً", "تقييم أداء دوري للموظفين", "صلاحيات مخصصة لكل وظيفة"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                    <CheckCircle size={15} color="#5b9bd5" />
                    {f}
                  </div>
                ))}
              </div>
            </>}
            {active === 4 && <>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 14, lineHeight: 1.3 }}>تذكيرات الوثائق والتجديدات</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, marginBottom: 20 }}>
                لا تفوتك وثيقة تنتهي — إقامات، رخص، عقود، تأشيرات. النظام يُنبّهك قبل موعد الانتهاء بأسابيع.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["تتبع إقامات وتأشيرات الموظفين", "تذكير تلقائي قبل ٣٠ و٧ أيام من الانتهاء", "تجديد الرخص التجارية والشهادات", "تقرير شامل بجميع الوثائق القادمة"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                    <CheckCircle size={15} color="#7fb09b" />
                    {f}
                  </div>
                ))}
              </div>
            </>}
            {active === 5 && <>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 14, lineHeight: 1.3 }}>إدارة المطعم والكافيه</h3>
              <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.85, marginBottom: 20 }}>
                طلبات الطاولات، التوصيل، المطبخ، القائمة الرقمية — كلها تعمل معاً في نظام واحد متكامل.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["قائمة رقمية QR للعملاء", "إدارة الطلبات من المطبخ مباشرة", "تكامل مع تطبيقات التوصيل", "تقارير الأطباق الأكثر مبيعاً"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                    <CheckCircle size={15} color="#e08058" />
                    {f}
                  </div>
                ))}
              </div>
            </>}
          </div>

          {/* Right: 3D Dashboard mockup */}
          <div style={{ perspective: 1200, perspectiveOrigin: "50% 40%" }}>
            <div style={{
              transform: "rotateX(8deg) rotateY(-6deg)",
              transformStyle: "preserve-3d",
              transition: "transform 0.4s ease",
            }}>
              {/* Browser chrome */}
              <div style={{
                background: "white", borderRadius: 16,
                boxShadow: `0 40px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)`,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
              }}>
                {/* Title bar */}
                <div style={{ background: "#f8fafc", padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 8,
                  borderBottom: "1px solid #e2e8f0" }}>
                  {["#ff5f57","#febc2e","#28c840"].map((c, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                  ))}
                  <div style={{ flex: 1, height: 18, background: "#e2e8f0", borderRadius: 8, marginRight: 8 }} />
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#e2e8f0" }} />
                </div>

                {/* Dashboard layout */}
                <div style={{ display: "flex", height: 340 }}>
                  {/* Sidebar */}
                  <div style={{ width: 52, background: "#f8fafc", borderLeft: "1px solid #f1f5f9",
                    padding: "12px 8px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#5b9bd5",
                      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                      <span style={{ color: "white", fontWeight: 800, fontSize: 12 }}>ت</span>
                    </div>
                    {[tab.color, "#94a3b8", "#94a3b8", "#94a3b8", "#94a3b8"].map((c, i) => (
                      <div key={i} style={{ width: 36, height: 28, borderRadius: 8,
                        background: i === 0 ? tab.color + "20" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, background: c, opacity: i === 0 ? 1 : 0.3 }} />
                      </div>
                    ))}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}>
                    {/* Top bar */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>لوحة التحكم — {tab.label}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: "#f1f5f9" }} />
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: tab.color, opacity: 0.7 }} />
                      </div>
                    </div>
                    {/* Demo content */}
                    <DemoComponent />
                  </div>
                </div>
              </div>

              {/* Reflection */}
              <div style={{
                height: 40, background: `linear-gradient(180deg, rgba(0,0,0,0.06) 0%, transparent 100%)`,
                borderRadius: "0 0 16px 16px", filter: "blur(8px)", transform: "scaleY(-0.3) translateY(-20px)",
                opacity: 0.4, pointerEvents: "none",
              }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main Landing Page ──────────────────────────────────────────────────────────
export function LandingPage() {
  const stats  = useInView(0.3);
  const tags   = useInView(0.2);
  const mods   = useInView(0.15);
  const secs   = useInView(0.15);
  const test   = useInView(0.15);
  const price  = useInView(0.15);
  const diff   = useInView(0.12);
  const comp   = useInView(0.15);
  const faq    = useInView(0.15);
  const addons = useInView(0.15);
  const steps  = useInView(0.2);

  const { plans: livePlans, addons: liveAddons, loading: plansLoading } = useLandingPlans();
  const platform = usePlatformConfig();

  const F: React.CSSProperties = { fontFamily: "'IBM Plex Sans Arabic', 'Tajawal', sans-serif" };

  return (
    <div dir="rtl" style={{ ...F, background: "#ffffff", color: "#0f172a", overflowX: "hidden" }}>
      <style>{STYLES}</style>
      <CursorGlow />
      <PublicHeader />

      {/* ══ 1. HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "100dvh", display: "flex", alignItems: "center",
        padding: "100px 24px 80px",
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,155,213,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(127,176,155,0.05) 0%, transparent 60%), #ffffff",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(91,155,213,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(91,155,213,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />
        {/* Glow spots */}
        <div style={{
          position: "absolute", width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(91,155,213,0.07) 0%, transparent 70%)",
          top: "-10%", right: "-5%", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(127,176,155,0.05) 0%, transparent 70%)",
          bottom: "0%", left: "-5%", pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", position: "relative",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}
          className="grid-cols-1 md:grid-cols-2">

          {/* Text */}
          <div style={{ animation: "fadeInLeft 0.8s ease both" }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#EBF3FB", color: "#5b9bd5",
              padding: "7px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
              marginBottom: 28, border: "1px solid rgba(91,155,213,0.2)",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5b9bd5",
                animation: "pulse-ring 2s ease-in-out infinite" }} />
              نظام إدارة الأعمال العربي الأول
            </div>

            <h1 style={{
              fontSize: "clamp(38px, 5.5vw, 64px)", fontWeight: 800, lineHeight: 1.12,
              color: "#0f172a", marginBottom: 22, letterSpacing: "-0.5px",
            }}>
              من الفوضى<br />
              <span style={{ color: "#5b9bd5" }}>إلى النظام</span><br />
              <span style={{ fontSize: "0.65em", fontWeight: 600, color: "#94a3b8", letterSpacing: "0px" }}>في أقل من ١٥ دقيقة</span>
            </h1>

            <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.8, marginBottom: 36, maxWidth: 440 }}>
              ترميز OS يُحوّل طلباتك وحجوزاتك ودفعاتك ومخزونك إلى
              نظام متكامل يعمل وحده — وأنت تركّز على النمو.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/register" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#5b9bd5", color: "white",
                padding: "14px 30px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 8px 32px rgba(91,155,213,0.3)",
                transition: "all 0.2s",
              }}>
                ابدأ مجاناً — ٣٠ يوم
                <ArrowLeft size={16} />
              </Link>
              <a href="#transform" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                color: "#475569", padding: "14px 24px", borderRadius: 12,
                fontSize: 15, fontWeight: 500, textDecoration: "none",
                border: "1px solid #e2e8f0", transition: "all 0.2s",
              }}>
                <ChevronDown size={16} />
                شاهد كيف يعمل
              </a>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 40, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex" }}>
                  {["#7fb09b","#9b8fc4","#d4b06a","#7eb5d4"].map((c, i) => (
                    <div key={i} style={{
                      width: 34, height: 34, borderRadius: "50%", background: c,
                      border: "2px solid white", marginLeft: i > 0 ? -10 : 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "white",
                    }}>
                      {["ص","ف","أ","م"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display: "flex", gap: 2, marginBottom: 3 }}>
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#fbbf24" color="#fbbf24" />)}
                  </div>
                  <span style={{ fontSize: 12, color: "#64748b" }}>+٥٠٠ منشأة نشطة</span>
                </div>
              </div>
              {[
                { icon: Shield, text: "بيانات آمنة ١٠٠٪" },
                { icon: Zap,    text: "إعداد في ١٥ دقيقة" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6,
                  color: "#64748b", fontSize: 12, fontWeight: 500 }}>
                  <b.icon size={13} color="#5b9bd5" />
                  {b.text}
                </div>
              ))}
            </div>
          </div>

          {/* Transform Visual */}
          <div style={{ display: "flex", justifyContent: "center", animation: "scaleIn 0.9s ease 0.2s both" }}>
            <TransformVisual />
          </div>
        </div>
      </section>

      {/* ══ TRUST STRIP ═════════════════════════════════════════════════════════ */}
      <div style={{
        padding: "20px 24px",
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        overflow: "hidden",
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, whiteSpace: "nowrap" }}>
              موثوق به من منشآت في:
            </span>
            {["الرياض","جدة","الدمام","مكة المكرمة","المدينة","أبها","القصيم","تبوك"].map((city, i) => (
              <div key={i} style={{
                fontSize: 12, fontWeight: 600, color: "#475569",
                padding: "5px 12px", borderRadius: 100,
                background: "white", border: "1px solid #e2e8f0",
              }}>
                {city}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ 2. THE PROBLEM ═══════════════════════════════════════════════════════ */}
      <section id="transform" style={{ padding: "96px 24px", background: "#ffffff" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
          <div ref={tags.ref}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: 3, marginBottom: 14, textTransform: "uppercase" }}>
              الواقع بدون نظام
            </p>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#0f172a",
              marginBottom: 14, lineHeight: 1.2,
            }}>
              أعمالك تولّد بيانات كل ثانية...
            </h2>
            <p style={{ fontSize: 17, color: "#64748b", marginBottom: 52, lineHeight: 1.7 }}>
              طلبات بلا متابعة، دفعات بلا تسجيل، مواعيد مبعثرة — هذا ما يحدث بدون ترميز
            </p>

            {/* Tags flood */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {OPERATION_TAGS.map((tag, i) => (
                <div key={i} style={{
                  background: "white", border: "1px solid #e2e8f0",
                  borderRadius: 100, padding: "9px 18px", fontSize: 13, fontWeight: 500,
                  color: "#475569",
                  opacity: tags.inView ? 1 : 0,
                  animation: tags.inView ? `tagFlow 0.5s ease forwards ${i * 55}ms` : "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  {tag}
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div style={{ margin: "52px auto", display: "flex", justifyContent: "center" }}>
              <div style={{ width: 2, height: 64, borderRight: "2px dashed #cbd5e1", position: "relative" }}>
                <div style={{
                  position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)",
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#5b9bd5", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "pulse-ring 2s ease-in-out infinite",
                  boxShadow: "0 4px 16px rgba(91,155,213,0.4)",
                  fontSize: 11, fontWeight: 800,
                }}>✦</div>
              </div>
            </div>

            <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
              <span style={{ color: "#5b9bd5" }}>ترميز</span> يُنظّم كل هذا — تلقائياً
            </div>
          </div>
        </div>
      </section>

      {/* ══ 3. BEFORE / AFTER ════════════════════════════════════════════════════ */}
      <section style={{ padding: "88px 24px", background: "#f8fafc", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(91,155,213,0.05) 0%, transparent 70%)" }} />
        <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative" }}>
          <div ref={comp.ref}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 56,
              opacity: comp.inView ? 1 : 0, animation: comp.inView ? "fadeInUp 0.6s ease both" : "none" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#5b9bd5", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
                التحوّل الحقيقي
              </p>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, color: "#0f172a", marginBottom: 14, lineHeight: 1.2 }}>
                ما الفرق الذي تلمسه يومياً؟
              </h2>
              <p style={{ fontSize: 16, color: "#64748b", maxWidth: 440, margin: "0 auto" }}>
                منشآت انتقلت لترميز رأت التحوّل من الأسبوع الأول — في كل جانب من عملياتهم
              </p>
            </div>

            {/* Comparison rows */}
            <div style={{
              background: "white", borderRadius: 24, overflow: "hidden",
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
              opacity: comp.inView ? 1 : 0, animation: comp.inView ? "fadeInUp 0.6s 0.1s ease both" : "none",
            }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr" }}>
                <div style={{ background: "#fff5f5", padding: "16px 28px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fee2e2",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <X size={16} color="#ef4444" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#ef4444" }}>قبل ترميز</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>الواقع الذي تعيشه الآن</div>
                  </div>
                </div>
                <div style={{ background: "#f8fafc", width: 52, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRight: "1px solid #f1f5f9", borderLeft: "1px solid #f1f5f9" }}>
                  <ArrowLeft size={18} color="#94a3b8" />
                </div>
                <div style={{ background: "#f0fdf4", padding: "16px 28px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "#dcfce7",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={16} color="#16a34a" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#16a34a" }}>مع ترميز</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>ما سيصبح عليه عملك</div>
                  </div>
                </div>
              </div>

              {/* Rows */}
              {[
                { pain: "الحجوزات عبر واتساب وورقة",     fix: "نظام حجز آلي مع تأكيد فوري للعميل",      icon: Calendar },
                { pain: "تتبع الدفعات يدوياً في دفاتر",   fix: "محاسبة تلقائية وتقارير مالية حية",        icon: DollarSign },
                { pain: "المخزون يُحسب بالخبرة والتقدير", fix: "تتبع مخزون دقيق مع تنبيهات انخفاض فوري", icon: Package },
                { pain: "الموظفون بلا نظام حضور أو أداء", fix: "سجل حضور وأداء وصلاحيات مفصّلة",         icon: Users },
                { pain: "لا تعرف أي خدمة تُربحك فعلاً",  fix: "تقارير ربحية لكل خدمة ومنتج وفرع",       icon: BarChart3 },
                { pain: "العميل ينتظر ولا أحد يرد",       fix: "إشعارات واتساب تلقائية في كل خطوة",      icon: MessageCircle },
                { pain: "لا موقع لك ويضيع عليك عملاء",   fix: "موقع حجز احترافي جاهز في دقائق",          icon: Globe },
                { pain: "لا تعرف أداء فروعك أو موظفيك",  fix: "لوحة تحكم موحّدة لكل الفروع والفريق",     icon: Layers },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr auto 1fr",
                  borderTop: "1px solid #f1f5f9",
                  opacity: comp.inView ? 1 : 0,
                  transform: comp.inView ? "translateX(0)" : "translateX(16px)",
                  transition: `opacity 0.4s ease ${0.15 + i * 0.07}s, transform 0.4s ease ${0.15 + i * 0.07}s`,
                }}>
                  <div style={{ padding: "14px 28px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fff5f5", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <item.icon size={13} color="#f87171" />
                    </div>
                    <span style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{item.pain}</span>
                  </div>
                  <div style={{ width: 52, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center",
                    borderRight: "1px solid #f1f5f9", borderLeft: "1px solid #f1f5f9" }}>
                    <ArrowLeft size={14} color="#cbd5e1" />
                  </div>
                  <div style={{ padding: "14px 28px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f0fdf4", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <item.icon size={13} color="#4ade80" />
                    </div>
                    <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 600, lineHeight: 1.5 }}>{item.fix}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom metrics */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 20,
              opacity: comp.inView ? 1 : 0, animation: comp.inView ? "fadeInUp 0.6s 0.5s ease both" : "none",
            }}>
              {[
                { val: "+٣٨٪",   label: "متوسط زيادة الحجوزات",    color: "#5b9bd5" },
                { val: "٣ ساعات", label: "توفير يومي لصاحب المنشأة", color: "#7fb09b" },
                { val: "٩٤٪",   label: "رضا العملاء بعد التفعيل",   color: "#9b8fc4" },
                { val: "أسبوع", label: "للتحوّل الكامل من البداية",  color: "#d4b06a" },
              ].map((m, i) => (
                <div key={i} style={{ background: "white", borderRadius: 14, padding: "16px 18px",
                  border: "1px solid #e2e8f0", textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: m.color, marginBottom: 4 }}>{m.val}</div>
                  <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 4. OUTPUT MODULES ════════════════════════════════════════════════════ */}
      <section id="modules" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div ref={mods.ref} style={{ textAlign: "center", marginBottom: 60 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#5b9bd5", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
              المخرجات
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>
              ما ستحصل عليه فور تفعيل ترميز
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 500, margin: "0 auto" }}>
              أربع وحدات متكاملة تعمل معاً من اليوم الأول — لا إعداد تقني، لا خبرة برمجية
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
            {[
              { title: "لوحة التحكم",     desc: "كل مؤشراتك الحية في مكان واحد — إيرادات، حجوزات، أداء الفريق، تنبيهات فورية.",
                color: "#5b9bd5", bg: "#EBF3FB", preview: <DashboardPreview />,
                bullets: ["KPIs حية في الوقت الفعلي","تنبيهات ذكية","نظرة إجمالية للعمليات"] },
              { title: "صفحة الحجز",      desc: "موقعك الإلكتروني جاهز فوراً باسمك وألوانك — يقبل حجوزات على مدار الساعة.",
                color: "#7fb09b", bg: "#f0faf6", preview: <BookingPreview />,
                bullets: ["نطاق خاص بمنشأتك","تخصيص كامل للهوية","دفع إلكتروني مدمج"] },
              { title: "التقارير",         desc: "تقارير مالية وتشغيلية تُنتج تلقائياً — يومية وأسبوعية وشهرية بصيغ جاهزة.",
                color: "#9b8fc4", bg: "#f5f3ff", preview: <ReportsPreview />,
                bullets: ["تصدير PDF/Excel","مقارنة الفترات","توقعات بالذكاء الاصطناعي"] },
              { title: "إدارة الفريق",    desc: "الموظفون والحضور والصلاحيات والعمولات — كل شيء منضبط بدون ورق.",
                color: "#d4b06a", bg: "#fdfaf3", preview: <TeamPreview />,
                bullets: ["صلاحيات دقيقة لكل دور","سجل حضور وانصراف","كشوف الرواتب والعمولات"] },
            ].map((mod, i) => (
              <div key={i} style={{
                background: "white",
                borderRadius: 22,
                padding: "0 0 24px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
                opacity: mods.inView ? 1 : 0,
                animation: mods.inView ? `fadeInUp 0.6s ease forwards ${i * 100}ms` : "none",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
                cursor: "default", overflow: "hidden",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.05)";
              }}>
                {/* Mini preview */}
                <div style={{ height: 140, background: mod.bg, padding: 14, marginBottom: 20 }}>
                  {mod.preview}
                </div>
                <div style={{ padding: "0 22px" }}>
                  <div style={{
                    display: "inline-block", background: mod.bg,
                    color: mod.color, padding: "4px 12px", borderRadius: 8,
                    fontSize: 11, fontWeight: 700, marginBottom: 10,
                  }}>
                    {mod.title}
                  </div>
                  <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 14px" }}>
                    {mod.desc}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {mod.bullets.map((b, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircle size={13} color={mod.color} />
                        <span style={{ fontSize: 12, color: "#64748b" }}>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 5. BUSINESS SECTORS ══════════════════════════════════════════════════ */}
      <section id="sectors" style={{ padding: "96px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div ref={secs.ref}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
                القطاعات
              </p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                يتكيّف مع قطاعك تماماً
              </h2>
              <p style={{ fontSize: 16, color: "#64748b", maxWidth: 480, margin: "0 auto" }}>
                ليس نظاماً عاماً — كل قطاع له وحداته وعملياته وتقاريره الخاصة
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
              {BUSINESS_TYPES.map((bt, i) => (
                <div key={bt.key} style={{
                  background: "white", borderRadius: 20, padding: "22px 20px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  opacity: secs.inView ? 1 : 0,
                  animation: secs.inView ? `fadeInUp 0.55s ease forwards ${i * 70}ms` : "none",
                  transition: "all 0.22s ease",
                  cursor: "default",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = bt.color + "50";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px ${bt.color}25`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#f1f5f9";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)";
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: bt.bg, display: "flex", alignItems: "center",
                    justifyContent: "center", marginBottom: 14,
                  }}>
                    <bt.icon size={22} color={bt.color} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
                    {bt.label}
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {bt.ops.map(op => (
                      <span key={op} style={{
                        fontSize: 11, fontWeight: 500, color: bt.color,
                        background: bt.bg, padding: "4px 9px", borderRadius: 6,
                      }}>{op}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 6. DIFFERENTIATORS ═══════════════════════════════════════════════════ */}
      <section id="features" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div ref={diff.ref}>
            <div style={{ textAlign: "center", marginBottom: 60 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#5b9bd5", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
                لماذا ترميز OS؟
              </p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>
                مميزات لا تجدها في أي نظام آخر
              </h2>
              <p style={{ fontSize: 16, color: "#64748b", maxWidth: 500, margin: "0 auto" }}>
                بُني ترميز خصيصاً لبيئة الأعمال السعودية — من اللغة إلى المتطلبات التشغيلية
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 20 }}>
              {DIFFERENTIATORS.map((d, i) => (
                <div key={i} style={{
                  padding: "28px 24px",
                  borderRadius: 20, border: "1px solid #f1f5f9",
                  background: "white",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  opacity: diff.inView ? 1 : 0,
                  animation: diff.inView ? `fadeInUp 0.55s ease forwards ${i * 60}ms` : "none",
                  transition: "all 0.22s ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(91,155,213,0.3)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(91,155,213,0.12)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#f1f5f9";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)";
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: "#EBF3FB",
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                  }}>
                    <d.icon size={22} color="#5b9bd5" />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 8, lineHeight: 1.4 }}>
                    {d.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
                    {d.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 7. INTERACTIVE SYSTEM DEMOS ══════════════════════════════════════════ */}
      <SystemShowcase />

      {/* ══ 7b. HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section style={{ padding: "96px 24px", background: "#ffffff", position: "relative", overflow: "hidden" }}>
        {/* Background decoration */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(91,155,213,0.05) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", width: 800, height: 800, borderRadius: "50%", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", border: "1px solid rgba(91,155,213,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", border: "1px solid rgba(91,155,213,0.08)", pointerEvents: "none" }} />

        <div ref={steps.ref} style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative" }}>
          {/* Header */}
          <div style={{
            opacity: steps.inView ? 1 : 0,
            animation: steps.inView ? "fadeInUp 0.7s ease both" : "none",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#EBF3FB", color: "#5b9bd5",
              padding: "7px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600,
              marginBottom: 20, border: "1px solid rgba(91,155,213,0.2)",
            }}>
              <Zap size={13} />
              بدون تثبيت — بدون تقنيين
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, color: "#0f172a", marginBottom: 16, lineHeight: 1.2 }}>
              ثلاث خطوات للتشغيل الكامل
            </h2>
            <p style={{ fontSize: 17, color: "#64748b", maxWidth: 480, margin: "0 auto 72px", lineHeight: 1.7 }}>
              بدون تثبيت، بدون تقنيين، بدون تدريب مطوّل — تبدأ من اليوم الأول
            </p>
          </div>

          {/* Steps */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, position: "relative" }}>
            {/* Animated connecting line — dashed with traveling dot */}
            <div style={{
              position: "absolute", top: 44, right: "16.67%", left: "16.67%",
              height: 4, borderRadius: 2, zIndex: 0, overflow: "visible",
            }}>
              {/* Background track */}
              <div style={{ position: "absolute", inset: 0, borderRadius: 2,
                background: "repeating-linear-gradient(90deg, #e2e8f0 0px, #e2e8f0 8px, transparent 8px, transparent 16px)",
              }} />
              {/* Fill bar */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: 2,
                background: "linear-gradient(90deg, #5b9bd5 0%, #7fb09b 50%, #9b8fc4 100%)",
                transformOrigin: "right center",
                transform: steps.inView ? "scaleX(1)" : "scaleX(0)",
                transition: "transform 1.4s cubic-bezier(0.4,0,0.2,1) 0.4s",
              }} />
              {/* Traveling glow dot */}
              {steps.inView && (
                <div style={{
                  position: "absolute", top: "50%", width: 12, height: 12, borderRadius: "50%",
                  background: "white", border: "3px solid #7fb09b",
                  transform: "translateY(-50%)",
                  boxShadow: "0 0 0 4px rgba(127,176,155,0.25), 0 0 12px rgba(127,176,155,0.4)",
                  animation: "travel-dot 1.6s ease-in-out 1.8s forwards",
                  right: "0%",
                }} />
              )}
            </div>

            {[
              {
                n: "١", title: "سجّل منشأتك", time: "٥ دقائق", color: "#5b9bd5", bg: "#EBF3FB",
                desc: "أدخل اسم منشأتك وقطاعها — النظام يُهيّئ الوحدات والقوالب والتقارير وفقاً لك تلقائياً.",
                icon: Users, checks: ["اختر قطاعك", "أدخل اسم منشأتك", "النظام يتهيأ فوراً"],
              },
              {
                n: "٢", title: "خصّص وأعدّ", time: "١٠ دقائق", color: "#7fb09b", bg: "#f0faf6",
                desc: "أضف خدماتك وموظفيك وألوان موقعك وطرق الدفع — كلها من لوحة تحكم واحدة بدون خبرة تقنية.",
                icon: Settings, checks: ["أضف خدماتك وأسعارها", "أدخل بيانات الموظفين", "فعّل طرق الدفع"],
              },
              {
                n: "٣", title: "انطلق واكسب", time: "من اليوم الأول", color: "#9b8fc4", bg: "#f5f3ff",
                desc: "حجوزات تلقائية، تقارير حية، إشعارات واتساب، وعملاء راضون — من الدقيقة الأولى.",
                icon: TrendingUp, checks: ["شارك رابط الحجز", "استقبل أول عميل", "شاهد التقارير مباشرة"],
              },
            ].map((step, i) => (
              <div key={i} style={{
                position: "relative", padding: "0 20px", textAlign: "center", zIndex: 1,
                opacity: steps.inView ? 1 : 0,
                transform: steps.inView ? "translateY(0)" : "translateY(40px)",
                transition: `opacity 0.7s ease ${0.2 + i * 0.18}s, transform 0.7s ease ${0.2 + i * 0.18}s`,
              }}>
                {/* Step circle with rings */}
                <div style={{ position: "relative", display: "inline-block", marginBottom: 28 }}>
                  {/* Pulsing rings */}
                  {steps.inView && (
                    <>
                      <div style={{
                        position: "absolute", inset: -12, borderRadius: "50%",
                        border: `2px solid ${step.color}30`,
                        animation: `pulse-ring 2.5s ease-in-out infinite ${i * 0.4}s`,
                      }} />
                      <div style={{
                        position: "absolute", inset: -6, borderRadius: "50%",
                        border: `2px solid ${step.color}20`,
                        animation: `pulse-ring 2.5s ease-in-out infinite ${i * 0.4 + 0.3}s`,
                      }} />
                    </>
                  )}
                  <div style={{
                    width: 88, height: 88, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}bb 100%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 16px 48px ${step.color}45, 0 4px 16px ${step.color}30`,
                    border: "5px solid white",
                    position: "relative", zIndex: 1,
                    transform: steps.inView ? "scale(1)" : "scale(0.5)",
                    transition: `transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.18}s`,
                  }}>
                    <span style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{step.n}</span>
                  </div>
                </div>

                {/* Card */}
                <div style={{
                  background: "white", borderRadius: 20, padding: "24px 20px",
                  border: `1px solid ${step.color}25`,
                  boxShadow: `0 8px 32px ${step.color}12, 0 2px 8px rgba(0,0,0,0.04)`,
                  textAlign: "right",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 48px ${step.color}25, 0 4px 16px rgba(0,0,0,0.06)`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${step.color}12, 0 2px 8px rgba(0,0,0,0.04)`;
                  }}>
                  {/* Time badge */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: step.bg, color: step.color,
                    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 100,
                    marginBottom: 12, border: `1px solid ${step.color}25`,
                  }}>
                    <Clock size={10} />
                    {step.time}
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", marginBottom: 10, lineHeight: 1.3 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.8, marginBottom: 16 }}>
                    {step.desc}
                  </p>
                  {/* Checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {step.checks.map((c, j) => (
                      <div key={j} style={{
                        display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#475569",
                        opacity: steps.inView ? 1 : 0,
                        transform: steps.inView ? "translateX(0)" : "translateX(10px)",
                        transition: `opacity 0.4s ease ${0.5 + i * 0.18 + j * 0.1}s, transform 0.4s ease ${0.5 + i * 0.18 + j * 0.1}s`,
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", background: step.bg, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Check size={10} color={step.color} strokeWidth={3} />
                        </div>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            marginTop: 64,
            opacity: steps.inView ? 1 : 0,
            transform: steps.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.9s, transform 0.6s ease 0.9s",
          }}>
            <Link to="/register" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "#5b9bd5", color: "white",
              padding: "15px 36px", borderRadius: 14, fontSize: 16, fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 12px 36px rgba(91,155,213,0.4)",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 18px 48px rgba(91,155,213,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 36px rgba(91,155,213,0.4)"; }}>
              جرّب الآن مجاناً — ٣٠ يوم
              <ArrowLeft size={18} />
            </Link>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
              بدون بطاقة ائتمان · إلغاء في أي وقت · إعداد فوري
            </p>
          </div>
        </div>
      </section>

      {/* ══ 8. WHATSAPP MESSAGES SHOWCASE ═══════════════════════════════════════ */}
      <section style={{ padding: "96px 24px", background: "#ffffff", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#dcfce7", color: "#16a34a",
              padding: "7px 18px", borderRadius: 100, fontSize: 13, fontWeight: 700,
              marginBottom: 20, border: "1px solid #bbf7d0",
            }}>
              <MessageCircle size={14} />
              واتساب تلقائي مدمج
            </div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
              عملاؤك يتلقون الرسائل تلقائياً
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 480, margin: "0 auto" }}>
              بدون أي إجراء يدوي — ترميز يُرسل الرسالة المناسبة في اللحظة المناسبة
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {[
              {
                type: "تأكيد الحجز",
                time: "٩:٠٠ ص — تلقائي فور الحجز",
                color: "#16a34a", bg: "#dcfce7",
                lines: [
                  { from: "sys", text: "مرحباً أحمد، تم تأكيد حجزك بنجاح ✓" },
                  { from: "sys", text: "الخدمة: قصة شعر + لحية\nالموعد: الأحد ١٤ أبريل، ٣:٠٠ م\nالموظف: محمد الشهري\n📍 صالون النخبة، الرياض" },
                  { from: "sys", text: "للإلغاء أو التعديل اضغط هنا 👇\nnasaq.app/booking/a7k2m" },
                ],
              },
              {
                type: "تذكير الموعد",
                time: "٩:٠٠ ص — يوم الموعد",
                color: "#5b9bd5", bg: "#EBF3FB",
                lines: [
                  { from: "sys", text: "صباح الخير سارة 🌟" },
                  { from: "sys", text: "تذكير بموعدك اليوم:\n🕐 الساعة ٤:٣٠ م\n✂️ صبغة شعر + تسريح\n📍 صالون لمسة جدة" },
                  { from: "cus", text: "شكراً، سأكون هناك" },
                ],
              },
              {
                type: "تأكيد الدفع",
                time: "فور إتمام الدفع",
                color: "#9b8fc4", bg: "#f5f3ff",
                lines: [
                  { from: "sys", text: "تم استلام دفعتك بنجاح ✅" },
                  { from: "sys", text: "المبلغ: ٢٨٠ ر.س\nطريقة الدفع: مدى\nرقم الفاتورة: INV-٢٤٥٨\n\nشكراً لثقتك بنا 🙏" },
                ],
              },
              {
                type: "طلب تقييم",
                time: "بعد ساعة من الخدمة",
                color: "#d4b06a", bg: "#fdfaf3",
                lines: [
                  { from: "sys", text: "شكراً لزيارتك فهد 😊" },
                  { from: "sys", text: "كيف كانت تجربتك معنا اليوم؟\nقيّمنا بنجمة واحدة وسنتطور أكثر ⭐\nnasaq.app/review/f8j3p" },
                  { from: "cus", text: "⭐⭐⭐⭐⭐ ممتاز جداً!" },
                ],
              },
              {
                type: "جاهزية الطلب",
                time: "عند اكتمال تحضير الطلب",
                color: "#7fb09b", bg: "#f0faf6",
                lines: [
                  { from: "sys", text: "طلبك جاهز للاستلام 🌹" },
                  { from: "sys", text: "طلب: باقة ورد عيد الأم (١٥ وردة حمراء)\nالمبلغ: ١٨٠ ر.س — تم الدفع مسبقاً\n📍 محل الورود، حي النزهة" },
                  { from: "cus", text: "في الطريق الآن، شكراً!" },
                ],
              },
              {
                type: "إشعار الغياب",
                time: "بعد الموعد بـ ٣٠ دقيقة",
                color: "#ef4444", bg: "#fee2e2",
                lines: [
                  { from: "sys", text: "لاحظنا غيابك عن موعدك اليوم 🙁" },
                  { from: "sys", text: "الموعد: ٢:٠٠ م — خدمة مساج\nهل تريد إعادة جدولة الموعد؟\nnasaq.app/reschedule/x9p2" },
                ],
              },
            ].map((msg, i) => (
              <div key={i} className="hover-lift" style={{
                background: "white", borderRadius: 20,
                border: `1px solid ${msg.bg}`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}>
                {/* Header */}
                <div style={{ background: msg.bg, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: msg.color,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MessageCircle size={16} color="white" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{msg.type}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{msg.time}</div>
                    </div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
                    boxShadow: "0 0 0 2px rgba(34,197,94,0.2)" }} />
                </div>
                {/* Chat */}
                <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8, background: "#f8fafc" }}>
                  {msg.lines.map((line, j) => (
                    <div key={j} style={{ display: "flex", justifyContent: line.from === "cus" ? "flex-start" : "flex-end" }}>
                      <div style={{
                        maxWidth: "88%", padding: "8px 12px", borderRadius: line.from === "cus" ? "14px 14px 14px 4px" : "14px 4px 14px 14px",
                        background: line.from === "cus" ? "white" : "#e8f4fd",
                        border: line.from === "cus" ? "1px solid #e2e8f0" : "1px solid #c8dff5",
                        fontSize: 12, color: "#0f172a", lineHeight: 1.6, whiteSpace: "pre-line",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      }}>
                        {line.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Payment methods */}
          <div style={{ marginTop: 60, textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: 2, marginBottom: 24, textTransform: "uppercase" }}>
              وسائل دفع مدعومة
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", alignItems: "center" }}>
              {[
                { name: "مدى",      color: "#1a5276", bg: "#eaf0f9", icon: CreditCard },
                { name: "Apple Pay",color: "#0f172a", bg: "#f1f5f9", icon: Smartphone },
                { name: "Visa",     color: "#1a1f71", bg: "#f0f4ff", icon: CreditCard },
                { name: "Mastercard",color:"#eb001b", bg: "#fff0f0", icon: CreditCard },
                { name: "STC Pay",  color: "#6b0080", bg: "#fdf4ff", icon: Smartphone },
                { name: "تحويل بنكي",color:"#0f172a",bg: "#f8fafc",  icon: DollarSign },
                { name: "نقداً",    color: "#16a34a", bg: "#f0fdf4", icon: DollarSign },
                { name: "آجل (فاتورة)",color:"#d4b06a",bg:"#fdfaf3",icon: FileText },
              ].map((pm, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: pm.bg, border: `1px solid ${pm.color}20`,
                  padding: "8px 16px", borderRadius: 12,
                  fontSize: 13, fontWeight: 600, color: pm.color,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <pm.icon size={14} color={pm.color} />
                  {pm.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 8b. STATS ═════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: "80px 24px",
        background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(91,155,213,0.06) 0%, transparent 70%), #f8fafc",
      }}>
        <div ref={stats.ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
              أرقام تتحدث عن نفسها
            </h2>
            <p style={{ fontSize: 15, color: "#64748b" }}>من مجتمع ترميز OS في المملكة</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 0 }}>
            {[
              { target: 500,  suffix: "+",  label: "منشأة نشطة",        sub: "عبر ١٥+ مدينة سعودية" },
              { target: 50000,suffix: "+",  label: "حجز شهرياً",         sub: "يُدار عبر ترميز OS" },
              { target: 99,   suffix: "٪",  label: "وقت التشغيل",        sub: "SLA مضمون بالعقد" },
              { target: 15,   suffix: "+",  label: "قطاع تجاري",         sub: "كل قطاع بوحداته الخاصة" },
            ].map((s, i) => (
              <div key={i} style={{
                borderRight: i < 3 ? "1px solid #e2e8f0" : "none",
              }}>
                <StatItem key={i} {...s} start={stats.inView} />
                <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", paddingBottom: 24 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 9. TESTIMONIALS ══════════════════════════════════════════════════════ */}
      <section id="testimonials" style={{ padding: "96px 24px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div ref={test.ref} style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
              شهادات العملاء
            </p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
              ماذا يقول أصحاب المنشآت
            </h2>
            <p style={{ fontSize: 16, color: "#64748b" }}>من حوّلوا فوضى أعمالهم إلى نظام يعمل وحده</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                background: "white", borderRadius: 22, padding: "28px 26px",
                border: "1px solid #f1f5f9",
                boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
                opacity: test.inView ? 1 : 0,
                animation: test.inView ? `scaleIn 0.55s ease forwards ${i * 100}ms` : "none",
              }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                  {[...Array(t.stars)].map((_, j) => <Star key={j} size={14} fill="#fbbf24" color="#fbbf24" />)}
                </div>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.85, marginBottom: 20 }}>
                  "{t.text}"
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: `linear-gradient(135deg, #5b9bd5, ${t.metricColor})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 700, fontSize: 15,
                    }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{t.biz}</div>
                    </div>
                  </div>
                  <div style={{
                    background: t.metricColor + "20", color: t.metricColor,
                    padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
                  }}>
                    {t.metric}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 10. VERTICAL ADDONS ══════════════════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div ref={addons.ref}>
            <div style={{ textAlign: "center", marginBottom: 52,
              opacity: addons.inView ? 1 : 0,
              animation: addons.inView ? "fadeInUp 0.6s ease both" : "none" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#5b9bd5", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
                وحدات عمودية متخصصة
              </p>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                خصّص نظامك بوحدات قطاعية
              </h2>
              <p style={{ fontSize: 16, color: "#64748b", maxWidth: 520, margin: "0 auto" }}>
                أضف الوحدات التي تحتاجها فعلاً — كل وحدة مبنية خصيصاً لقطاعها
                <strong style={{ color: "#5b9bd5" }}> · ٧٩٠ ر.س سنوياً فقط للوحدة</strong>
              </p>
            </div>

            {(() => {
              const STATIC_ADDONS = [
                { code: "website",      nameAr: "الموقع والمتجر الإلكتروني", descriptionAr: "موقع احترافي + متجر + رابط حجز + QR + مدونة + نطاق مخصص", priceYearly: "790" },
                { code: "restaurant",   nameAr: "نظام المطعم",               descriptionAr: "KDS + طلبات + قائمة QR + طاولات + توصيل", priceYearly: "790" },
                { code: "real_estate",  nameAr: "نظام العقارات",             descriptionAr: "عقود + تحصيل إيجارات + صيانة + إدارة وحدات", priceYearly: "790" },
                { code: "construction", nameAr: "نظام المقاولات",            descriptionAr: "مشاريع + مستخلصات + مواد + مقاولين فرعيين", priceYearly: "790" },
                { code: "flower_shop",  nameAr: "نظام الورود والزهور",       descriptionAr: "مخزون زهور + طلبات + تحذيرات انتهاء صلاحية", priceYearly: "790" },
                { code: "school",       nameAr: "نظام المدارس والمراكز",     descriptionAr: "طلاب + رسوم + جداول + مدرسون + شهادات", priceYearly: "790" },
                { code: "delivery",     nameAr: "نظام التوصيل",              descriptionAr: "مناديب + مناطق + تتبع لحظي + تقارير", priceYearly: "790" },
                { code: "marketing",    nameAr: "التسويق والولاء",           descriptionAr: "حملات SMS + نقاط ولاء + كوبونات + تحليلات", priceYearly: "790" },
                { code: "loyalty",      nameAr: "برنامج نقاط الولاء",        descriptionAr: "نقاط + مكافآت + بطاقات رقمية + تقارير عملاء", priceYearly: "790" },
              ];
              const displayAddons = liveAddons.length > 0
                ? liveAddons.map(a => ({
                    code: a.code, nameAr: a.nameAr,
                    descriptionAr: a.descriptionAr ?? STATIC_ADDONS.find(s => s.code === a.code)?.descriptionAr ?? "",
                    priceYearly: a.priceYearly,
                  }))
                : STATIC_ADDONS;

              const ADDON_COLORS: Record<string, { bg: string; icon: string }> = {
                website:      { bg: "#EBF3FB", icon: "#5b9bd5" },
                restaurant:   { bg: "#fff7ed", icon: "#e08058" },
                real_estate:  { bg: "#f0faf6", icon: "#7fb09b" },
                construction: { bg: "#fdfaf3", icon: "#d4b06a" },
                flower_shop:  { bg: "#fff5f2", icon: "#d4917e" },
                school:       { bg: "#f5f3ff", icon: "#9b8fc4" },
                delivery:     { bg: "#f0fdf4", icon: "#22c55e" },
                marketing:    { bg: "#fdf4ff", icon: "#a855f7" },
                loyalty:      { bg: "#fef9c3", icon: "#ca8a04" },
              };

              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                  {displayAddons.map((addon, i) => {
                    const Icon = ADDON_ICONS[addon.code] ?? Package;
                    const clr = ADDON_COLORS[addon.code] ?? { bg: "#EBF3FB", icon: "#5b9bd5" };
                    return (
                      <TiltCard key={addon.code} style={{
                        background: "white", borderRadius: 18,
                        padding: "22px 20px", border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                        cursor: "default",
                        opacity: addons.inView ? 1 : 0,
                        transition: `opacity 0.4s ease ${i * 50}ms, transform 0.15s ease`,
                      }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: 13, background: clr.bg,
                          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                        }}>
                          <Icon size={21} color={clr.icon} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6, lineHeight: 1.4 }}>
                          {addon.nameAr}
                        </div>
                        {addon.descriptionAr && (
                          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, marginBottom: 14 }}>
                            {addon.descriptionAr}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: "auto" }}>
                          <Tag size={12} color="#7fb09b" />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#7fb09b" }}>
                            {Number(addon.priceYearly).toLocaleString("ar-SA")} ر.س / سنة
                          </span>
                        </div>
                      </TiltCard>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ══ 11. PRICING ═══════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ padding: "96px 24px", background: "#ffffff" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div ref={price.ref} style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#5b9bd5", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
              الأسعار
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
              ابدأ بـ ٧٩ ر.س فقط — عرض افتتاحي محدود
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", maxWidth: 500, margin: "0 auto" }}>
              {livePlans.some(p => p.isLaunchOffer)
                ? "عرض افتتاحي حصري — الأسعار مخفّضة حتى نفاد العرض. بدون عمولة، بدون عقود، إلغاء في أي وقت."
                : "بدون عمولة، بدون عقود، بدون مفاجآت — وكل خطة قابلة للإلغاء في أي وقت"}
            </p>
          </div>

          {/* Launch offer banner */}
          {livePlans.some(p => p.isLaunchOffer) && (
            <div style={{
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              borderRadius: 16, padding: "14px 24px", marginBottom: 32,
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(251,191,36,0.25)",
            }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                عرض افتتاحي — خصم يصل إلى ٦٨٪ على جميع الخطط
              </span>
              <span style={{ fontSize: 13, color: "#78350f", fontWeight: 500 }}>
                تجربة مجانية ٣٠ يوم لجميع الخطط
              </span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22, alignItems: "start" }}>
            {plansLoading
              ? [0,1,2].map(i => (
                <div key={i} style={{
                  borderRadius: 22, height: 480, background: "#f1f5f9",
                  animation: "shimmer 1.5s infinite linear",
                  backgroundImage: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
                  backgroundSize: "800px 100%",
                }} />
              ))
              : livePlans.map((plan, i) => {
                const display = PLAN_DISPLAY[plan.code] ?? PLAN_DISPLAY.basic;
                const discount = plan.originalPriceMonthly
                  ? Math.round((1 - parseFloat(plan.priceMonthly) / parseFloat(plan.originalPriceMonthly)) * 100)
                  : 0;
                return (
                  <TiltCard key={plan.id} style={{
                    background: display.highlight ? "#5b9bd5" : "white",
                    borderRadius: 22,
                    padding: "32px 26px",
                    border: display.highlight ? "2px solid #5b9bd5" : "1px solid #e2e8f0",
                    boxShadow: display.highlight
                      ? "0 24px 64px rgba(91,155,213,0.4)"
                      : "0 4px 24px rgba(0,0,0,0.05)",
                    opacity: price.inView ? 1 : 0,
                    animation: price.inView ? `fadeInUp 0.55s ease forwards ${i * 100}ms` : "none",
                    transform: display.highlight ? "scale(1.03)" : "scale(1)",
                    position: "relative",
                  }}>
                    {display.highlight && (
                      <div style={{
                        position: "absolute", top: -13, right: "50%", transform: "translateX(50%)",
                        background: "#fbbf24", color: "#0f172a",
                        padding: "4px 18px", borderRadius: 100, fontSize: 12, fontWeight: 700,
                        whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(251,191,36,0.4)",
                      }}>
                        الأكثر شيوعاً
                      </div>
                    )}

                    {/* Plan name + discount badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700,
                        color: display.highlight ? "rgba(255,255,255,0.6)" : "#94a3b8",
                        letterSpacing: 2, textTransform: "uppercase" }}>
                        {plan.nameEn}
                      </div>
                      {discount > 0 && (
                        <div style={{
                          background: display.highlight ? "rgba(255,255,255,0.2)" : "#dcfce7",
                          color: display.highlight ? "white" : "#16a34a",
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
                        }}>
                          -{discount}٪
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: display.highlight ? "white" : "#0f172a", marginBottom: 20 }}>
                      {plan.nameAr}
                    </div>

                    {/* Price */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ fontSize: 48, fontWeight: 800, color: display.highlight ? "white" : "#0f172a", letterSpacing: "-2px", lineHeight: 1 }}>
                          {Math.round(parseFloat(plan.priceMonthly)).toLocaleString("ar-SA")}
                        </span>
                        <span style={{ fontSize: 13, color: display.highlight ? "rgba(255,255,255,0.65)" : "#94a3b8" }}>
                          ر.س/شهر
                        </span>
                      </div>
                      {plan.originalPriceMonthly && parseFloat(plan.originalPriceMonthly) > parseFloat(plan.priceMonthly) && (
                        <div style={{ fontSize: 13, color: display.highlight ? "rgba(255,255,255,0.5)" : "#94a3b8", marginTop: 4 }}>
                          <span style={{ textDecoration: "line-through" }}>
                            {Math.round(parseFloat(plan.originalPriceMonthly)).toLocaleString("ar-SA")} ر.س
                          </span>
                          {" "}السعر الأصلي
                        </div>
                      )}
                    </div>

                    {/* Limits */}
                    <div style={{
                      background: display.highlight ? "rgba(255,255,255,0.12)" : "#f8fafc",
                      borderRadius: 10, padding: "10px 14px", marginBottom: 20,
                      display: "flex", gap: 16,
                    }}>
                      {[
                        { label: "فروع", val: plan.maxBranches },
                        { label: "موظف", val: plan.maxEmployees },
                        { label: "يوم تجربة", val: plan.trialDays },
                      ].map(lim => (
                        <div key={lim.label} style={{ textAlign: "center", flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: display.highlight ? "white" : "#0f172a" }}>
                            {lim.val}
                          </div>
                          <div style={{ fontSize: 11, color: display.highlight ? "rgba(255,255,255,0.6)" : "#64748b" }}>
                            {lim.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                      {display.features.map(f => (
                        <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13,
                          color: display.highlight ? "rgba(255,255,255,0.9)" : "#374151" }}>
                          <CheckCircle size={14} color={display.highlight ? "rgba(255,255,255,0.8)" : "#7fb09b"} />
                          {f}
                        </div>
                      ))}
                      {(display.missing ?? []).map(f => (
                        <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#94a3b8" }}>
                          <Minus size={14} color="#d1d5db" />
                          {f}
                        </div>
                      ))}
                    </div>

                    <Link to="/register" style={{
                      display: "block", textAlign: "center",
                      padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                      background: display.highlight ? "white" : "#5b9bd5",
                      color: display.highlight ? "#5b9bd5" : "white",
                      textDecoration: "none",
                      boxShadow: display.highlight ? "none" : "0 4px 16px rgba(91,155,213,0.28)",
                      transition: "all 0.2s",
                    }}>
                      {display.cta}
                    </Link>
                  </TiltCard>
                );
              })
            }
          </div>

          {/* Pricing guarantee */}
          <div style={{ marginTop: 44, textAlign: "center", display: "flex", justifyContent: "center", gap: 36, flexWrap: "wrap" }}>
            {[
              { icon: Shield,    text: "ضمان استرداد ٣٠ يوم" },
              { icon: Lock,      text: "بيانات آمنة ومشفّرة" },
              { icon: RefreshCw, text: "إلغاء في أي وقت" },
              { icon: Tag,       text: "بدون عمولة على المبيعات" },
            ].map((g, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                <g.icon size={15} color="#5b9bd5" />
                {g.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 11. FAQ ═══════════════════════════════════════════════════════════════ */}
      <section id="faq" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div ref={faq.ref}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
                الأسئلة الشائعة
              </p>
              <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>
                كل ما تريد معرفته
              </h2>
              <p style={{ fontSize: 15, color: "#64748b" }}>
                لم تجد إجابتك؟ تواصل معنا مباشرة
              </p>
            </div>

            <div style={{
              display: "flex", flexDirection: "column", gap: 12,
              opacity: faq.inView ? 1 : 0,
              animation: faq.inView ? "fadeInUp 0.6s ease both" : "none",
            }}>
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 12. COMPLIANCE TRUST STRIP ════════════════════════════════════════════ */}
      <section style={{ padding: "32px 24px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", fontWeight: 600 }}>
            <Shield size={15} color="#5b9bd5" style={{ flexShrink: 0 }} />
            متوافق مع الأنظمة السعودية
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "PDPL م/19", color: "#5b9bd5" },
              { label: "التجارة الإلكترونية م/69", color: "#16a34a" },
              { label: "ZATCA", color: "#d97706" },
              { label: "الجرائم المعلوماتية م/17", color: "#7c3aed" },
            ].map(b => (
              <span key={b.label} style={{
                background: `${b.color}18`, color: b.color,
                border: `1px solid ${b.color}30`,
                borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700,
              }}>{b.label}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "الامتثال", to: "/legal/compliance" },
              { label: "الخصوصية", to: "/legal/privacy" },
              { label: "الشروط", to: "/legal/terms" },
            ].map(l => (
              <Link key={l.label} to={l.to} style={{
                fontSize: 12, color: "#64748b", textDecoration: "none",
                padding: "4px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                background: "#ffffff", transition: "color 0.2s",
              }}>{l.label}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 13. CTA ═══════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: "110px 24px",
        background: "radial-gradient(ellipse 90% 70% at 50% 50%, rgba(91,155,213,0.1) 0%, rgba(91,155,213,0.04) 50%, #ffffff 100%)",
        textAlign: "center", position: "relative", overflow: "hidden",
        borderTop: "1px solid rgba(91,155,213,0.1)",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(91,155,213,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(91,155,213,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(91,155,213,0.07) 0%, transparent 70%)",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#EBF3FB", color: "#5b9bd5",
            padding: "7px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600,
            marginBottom: 28, border: "1px solid rgba(91,155,213,0.2)",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5b9bd5",
              animation: "pulse-ring 2s ease-in-out infinite" }} />
            ابدأ الآن — الإعداد أقل من ١٥ دقيقة
          </div>
          <h2 style={{ fontSize: "clamp(30px, 5.5vw, 54px)", fontWeight: 800, color: "#0f172a", marginBottom: 18, lineHeight: 1.2 }}>
            ابدأ ترميز أعمالك اليوم
          </h2>
          <p style={{ fontSize: 17, color: "#64748b", marginBottom: 40, lineHeight: 1.8 }}>
            ٣٠ يوماً مجاناً — بدون بطاقة ائتمان — بدون التزامات<br />
            <span style={{ color: "#5b9bd5", fontWeight: 600 }}>انضم لأكثر من ٥٠٠ منشأة تثق بـ {platform.platformName || "ترميز OS"}</span>
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "#5b9bd5", color: "white",
              padding: "16px 36px", borderRadius: 14, fontSize: 16, fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 12px 40px rgba(91,155,213,0.4)",
              transition: "all 0.2s",
            }}>
              ابدأ مجاناً الآن
              <ArrowLeft size={18} />
            </Link>
            <Link to="/login" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              color: "#475569", padding: "16px 28px", borderRadius: 14,
              fontSize: 15, fontWeight: 600, textDecoration: "none",
              border: "1px solid #e2e8f0",
              background: "white",
            }}>
              لديك حساب؟ الدخول
            </Link>
          </div>
          {/* Trust signals */}
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
            {[
              { icon: Shield, text: "بياناتك آمنة ومشفرة" },
              { icon: RefreshCw, text: "إلغاء في أي وقت" },
              { icon: Zap, text: "إعداد في ١٥ دقيقة" },
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
                <t.icon size={14} color="#5b9bd5" />
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════════ */}
      <footer style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "64px 24px 32px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr", gap: 40, marginBottom: 52 }}
            className="grid-cols-1 md:grid-cols-4">

            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10,
                  background: platform.logoUrl ? "transparent" : "#5b9bd5",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  overflow: "hidden" }}>
                  {platform.logoUrl
                    ? <img src={platform.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>ن</span>
                  }
                </div>
                <span style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{platform.platformName || "ترميز OS"}</span>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.85, maxWidth: 270, marginBottom: 22 }}>
                نظام إدارة أعمال متكامل يحوّل عملياتك اليومية إلى نظام دقيق وذكي يعمل دون توقف.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { text: "info@nasaqpro.tech", icon: Globe },
                  { text: "0522064321", icon: Smartphone },
                ].map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: "#475569" }}>
                    <c.icon size={13} color="#5b9bd5" />
                    {c.text}
                  </div>
                ))}
              </div>
            </div>

            {([
              {
                title: "المنتج",
                links: [
                  { label: "لوحة التحكم",        to: "/dashboard" },
                  { label: "الحجوزات",            to: "/dashboard/bookings" },
                  { label: "التقارير",            to: "/dashboard/reports" },
                  { label: "الموقع الإلكتروني",  to: "/dashboard/website" },
                  { label: "إدارة الفريق",        to: "/dashboard/team" },
                  { label: "المخزون",             to: "/dashboard/inventory" },
                ],
              },
              {
                title: "القطاعات",
                links: [
                  { label: "صالون وسبا",         to: "/#sectors" },
                  { label: "محل ورد",             to: "/#sectors" },
                  { label: "مطعم وكافيه",         to: "/#sectors" },
                  { label: "فندق وشقق",           to: "/#sectors" },
                  { label: "تأجير سيارات",        to: "/#sectors" },
                  { label: "استوديو تصوير",       to: "/#sectors" },
                ],
              },
              {
                title: "الشركة",
                links: [
                  { label: `عن ${platform.platformName || "المنصة"}`, to: "/about" },
                  { label: "تواصل معنا",          to: "/contact" },
                  { label: "سياسة الخصوصية",     to: "/legal/privacy" },
                  { label: "شروط الخدمة",         to: "/legal/terms" },
                  { label: "الامتثال القانوني",   to: "/legal/compliance" },
                  { label: "للمدارس",             to: "/school" },
                  { label: "الأسعار",             to: "/pricing" },
                ],
              },
            ] as { title: string; links: { label: string; to: string }[] }[]).map((col, i) => (
              <div key={i}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 18, letterSpacing: 1, textTransform: "uppercase" }}>
                  {col.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {col.links.map(l => (
                    <Link key={l.label} to={l.to} style={{ fontSize: 13, color: "#64748b", textDecoration: "none",
                      transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#5b9bd5")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 28,
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              © {new Date().getFullYear()} {platform.platformName || "ترميز OS"}. جميع الحقوق محفوظة.
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "شروط الخدمة",       to: "/legal/terms" },
                { label: "سياسة الخصوصية",   to: "/legal/privacy" },
                { label: "الامتثال القانوني", to: "/legal/compliance" },
              ].map(({ label, to }) => (
                <Link key={label} to={to} style={{ fontSize: 12, color: "#94a3b8", textDecoration: "none",
                  transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#5b9bd5")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
