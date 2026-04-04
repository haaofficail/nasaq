import { useEffect, useRef, useState } from "react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { Link } from "react-router-dom";
import {
  Calendar, Monitor, Package, Globe, BarChart3, Truck,
  CheckCircle2, ArrowLeft, Twitter, Linkedin, Instagram,
  Star, Scissors, Coffee, Flower2, Utensils, Car, Camera,
  Home, Building2, ShoppingBag, Users, Zap, Bell, Megaphone,
  ChefHat, Smartphone, Layers, CreditCard, ClipboardList,
  Wrench, FileText, Warehouse, Receipt, Briefcase, GraduationCap,
  ChevronDown, Key, PartyPopper, Wallet, BarChart2, Plug,
  ScanBarcode, Box, UsersRound, Send, MessageCircle,
  Dumbbell, Sparkles, Activity, Download,
} from "lucide-react";

// ─── Products Mega Menu Data ───────────────────────────────────────────────────
const SPECIALIZATIONS = [
  {
    key: "salon",
    label: "صالون وسبا",
    icon: Scissors,
    color: "text-pink-600",
    bg: "bg-pink-50",
    modules: ["الحجوزات", "الجدول الزمني", "العمولات", "الاستدعاء", "مستلزمات الصالون"],
  },
  {
    key: "restaurant",
    label: "مطعم وكافيه",
    icon: Utensils,
    color: "text-orange-600",
    bg: "bg-orange-50",
    modules: ["قائمة الطعام", "إدارة المطبخ", "خريطة الطاولات", "الطلبات الإلكترونية"],
  },
  {
    key: "flower",
    label: "محل ورد",
    icon: Flower2,
    color: "text-rose-600",
    bg: "bg-rose-50",
    modules: ["مخزون الورد", "بيانات الورد", "التنسيقات", "الطلبات"],
  },
  {
    key: "hotel",
    label: "فندق",
    icon: Building2,
    color: "text-blue-600",
    bg: "bg-blue-50",
    modules: ["إدارة الغرف", "الحجوزات", "تسجيل الدخول", "طلبات التنظيف"],
  },
  {
    key: "car_rental",
    label: "تأجير سيارات",
    icon: Car,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    modules: ["إدارة الأسطول", "عقود التأجير", "تسليم واستلام", "التقارير"],
  },
  {
    key: "rental",
    label: "تأجير وعقارات",
    icon: Key,
    color: "text-teal-600",
    bg: "bg-teal-50",
    modules: ["الأصول", "العقود", "المستودع", "الصيانة", "التفتيش"],
  },
  {
    key: "fitness",
    label: "لياقة بدنية",
    icon: Dumbbell,
    color: "text-red-600",
    bg: "bg-red-50",
    modules: ["اشتراكات الأعضاء", "الحصص والجداول", "المدربون", "قياسات الجسم"],
  },
  {
    key: "catering",
    label: "ضيافة وتموين",
    icon: ChefHat,
    color: "text-amber-600",
    bg: "bg-amber-50",
    modules: ["باقات الطعام", "طلبات المناسبات", "جداول التسليم", "فواتير التموين"],
  },
  {
    key: "events",
    label: "فعاليات",
    icon: PartyPopper,
    color: "text-purple-600",
    bg: "bg-purple-50",
    modules: ["إدارة الفعاليات", "الباقات", "الحجوزات", "العقود"],
  },
  {
    key: "photography",
    label: "استوديو تصوير",
    icon: Camera,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    modules: ["الحجوزات", "مكتبة الوسائط", "العملاء", "العقود"],
  },
  {
    key: "decoration",
    label: "ديكور وزخرفة",
    icon: Sparkles,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    modules: ["مشاريع التصميم", "عروض الأسعار", "جدولة التركيب", "متابعة العميل"],
  },
  {
    key: "school",
    label: "مدرسة",
    icon: GraduationCap,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    modules: ["الطلاب والفصول", "الجداول الدراسية", "رصد التأخر", "الحالات والمتابعة"],
  },
];

const CORE_MODULES = [
  { icon: ShoppingBag,   label: "نقطة البيع",     color: "text-blue-600" },
  { icon: Box,           label: "المخزون",         color: "text-amber-600" },
  { icon: Users,         label: "العملاء",         color: "text-violet-600" },
  { icon: UsersRound,    label: "الفريق",          color: "text-teal-600" },
  { icon: Wallet,        label: "المالية",         color: "text-emerald-600" },
  { icon: BarChart2,     label: "التقارير",        color: "text-orange-600" },
  { icon: Globe,         label: "الموقع والمتجر",  color: "text-sky-600" },
  { icon: Send,          label: "التسويق",         color: "text-pink-600" },
  { icon: MessageCircle, label: "واتساب",          color: "text-green-600" },
  { icon: ScanBarcode,   label: "بطاقات الباركود", color: "text-gray-600" },
  { icon: Plug,          label: "التكاملات",       color: "text-indigo-600" },
  { icon: CreditCard,    label: "الاشتراكات",      color: "text-rose-600" },
];

// ─── Products Dropdown ─────────────────────────────────────────────────────────
function ProductsDropdown({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-[#5b9bd5] ${
          scrolled ? "text-gray-600" : "text-white/80"
        }`}
      >
        المنتجات
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-3 right-0 w-[680px] bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-50"
          dir="rtl"
        >
          {/* Core modules */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">وحدات أساسية — لكل الأعمال</p>
            <div className="grid grid-cols-4 gap-1.5">
              {CORE_MODULES.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-default"
                >
                  <m.icon className={`w-3.5 h-3.5 flex-shrink-0 ${m.color}`} />
                  <span className="text-xs text-gray-700">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">التخصصات</p>
            <div className="grid grid-cols-3 gap-2">
              {SPECIALIZATIONS.map((s) => {
                const isSchool = s.key === "school";
                const inner = (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                        <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{s.label}</span>
                      {isSchool && <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-semibold mr-auto">صفحة خاصة</span>}
                    </div>
                    <div className="space-y-0.5 pr-9">
                      {s.modules.map((mod) => (
                        <p key={mod} className="text-xs text-gray-500">{mod}</p>
                      ))}
                    </div>
                    {isSchool && <p className="text-xs text-emerald-600 font-semibold mt-2 pr-9 flex items-center gap-1">اكتشف نسق للمدارس <ArrowLeft className="w-3 h-3" /></p>}
                  </>
                );
                return isSchool ? (
                  <Link
                    key={s.key}
                    to="/school"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 hover:border-emerald-400 hover:bg-emerald-50 transition-all block"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={s.key} className="rounded-xl border border-gray-100 p-3 hover:border-[#5b9bd5]/30 hover:bg-[#5b9bd5]/5 transition-all cursor-default">
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 mt-4 pt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">15+ قطاع — 80+ قالب جاهز — 40+ وحدة</p>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-[#5b9bd5] hover:text-[#4a8ac4] flex items-center gap-1"
            >
              ابدأ مجاناً
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Counter Hook ─────────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let frame: number;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, start]);
  return count;
}

// ─── Intersection Observer Hook ───────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Stat Counter ─────────────────────────────────────────────────────────────
function StatItem({ target, suffix, label, start }: { target: number; suffix: string; label: string; start: boolean }) {
  const count = useCounter(target, 1800, start);
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-black text-gray-900 leading-none mb-2">
        {count.toLocaleString("en-US")}{suffix}
      </p>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  );
}

// ─── PublicHeader ─────────────────────────────────────────────────────────────
function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const platform = usePlatformConfig();
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow overflow-hidden shrink-0"
            style={{ backgroundColor: platform.primaryColor }}>
            {platform.logoUrl
              ? <img src={platform.logoUrl} alt={platform.platformName} className="w-full h-full object-contain" />
              : <span className="text-white font-black text-sm">{platform.platformName[0]}</span>
            }
          </div>
          <span className={`text-lg font-bold transition-colors ${scrolled ? "text-gray-900" : "text-white"}`}>{platform.platformName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <ProductsDropdown scrolled={scrolled} />
          {[
            { to: "#specializations", label: "التخصصات" },
            { to: "#features", label: "الإمكانيات" },
            { to: "#pricing", label: "الأسعار" },
            { to: "#testimonials", label: "آراء العملاء" },
          ].map((item) => (
            <a
              key={item.to}
              href={item.to}
              className={`text-sm font-medium transition-colors hover:text-[#5b9bd5] ${scrolled ? "text-gray-600" : "text-white/80"}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/school"
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-all ${scrolled ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "border-emerald-400/40 text-emerald-300 hover:border-emerald-300 hover:text-emerald-200"}`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            للمدارس
          </Link>
          <Link to="/login" className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${scrolled ? "text-gray-600 hover:bg-gray-100" : "text-white/80 hover:text-white"}`}>
            تسجيل الدخول
          </Link>
          <Link to="/register" className="bg-[#5b9bd5] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#4a8ac4] transition-colors shadow-sm hover:shadow-md">
            ابدأ مجاناً
          </Link>
        </div>

        <button className="md:hidden p-2 rounded-lg" onClick={() => setMobileOpen(!mobileOpen)}>
          <div className={`w-5 h-0.5 mb-1 transition-colors ${scrolled ? "bg-gray-700" : "bg-white"}`} />
          <div className={`w-5 h-0.5 mb-1 transition-colors ${scrolled ? "bg-gray-700" : "bg-white"}`} />
          <div className={`w-5 h-0.5 transition-colors ${scrolled ? "bg-gray-700" : "bg-white"}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
          <div className="py-2">
            <p className="text-xs font-semibold text-gray-400 mb-2">التخصصات</p>
            <div className="grid grid-cols-3 gap-1.5">
              {SPECIALIZATIONS.map((s) => (
                <div key={s.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${s.bg}`}>
                  <s.icon className={`w-3 h-3 flex-shrink-0 ${s.color}`} />
                  <span className="text-xs text-gray-700 truncate">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <a href="#specializations" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>التخصصات</a>
          <a href="#features" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>الإمكانيات</a>
          <a href="#pricing" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>الأسعار</a>
          <a href="#testimonials" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>آراء العملاء</a>
          <Link to="/school" className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 py-2.5 px-3 rounded-xl" onClick={() => setMobileOpen(false)}>
            <GraduationCap className="w-4 h-4" />
            نسق للمدارس
          </Link>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Link to="/login" className="flex-1 text-center border border-gray-200 text-sm font-medium text-gray-700 py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>تسجيل الدخول</Link>
            <Link to="/register" className="flex-1 text-center bg-[#5b9bd5] text-white text-sm font-semibold py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>ابدأ مجاناً</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function FooterLogo() {
  const platform = usePlatformConfig();
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
        style={{ backgroundColor: platform.primaryColor }}>
        {platform.logoUrl
          ? <img src={platform.logoUrl} alt={platform.platformName} className="w-full h-full object-contain" />
          : <span className="text-white font-black text-sm">{platform.platformName[0]}</span>
        }
      </div>
      <span className="text-lg font-bold text-white">{platform.platformName}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LandingPage() {
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const platform = usePlatformConfig();

  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans overflow-x-hidden">
      <PublicHeader />

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #5b9bd5 100%)" }}>

        <div className="absolute inset-0 dot-pattern pointer-events-none" />

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg className="absolute -top-32 -right-32 w-[600px] h-[600px] opacity-10" viewBox="0 0 600 600">
            <circle cx="300" cy="300" r="250" fill="#5b9bd5" />
          </svg>
          <svg className="absolute -bottom-48 -left-48 w-[700px] h-[700px] opacity-[0.06]" viewBox="0 0 700 700">
            <circle cx="350" cy="350" r="300" fill="#5b9bd5" />
          </svg>
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,80 C360,120 720,40 1080,80 C1260,100 1380,60 1440,80 L1440,120 L0,120 Z" fill="white" fillOpacity="1" />
          </svg>
          <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-[#5b9bd5]/40 animate-float" style={{ animationDelay: "0s" }} />
          <div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-[#f59e0b]/30 animate-float" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-white/20 animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute top-2/3 right-1/4 w-1.5 h-1.5 rounded-full bg-[#5b9bd5]/30 animate-float" style={{ animationDelay: "3s" }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-32">
          <div className="animate-fade-in-up flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#5b9bd5] shadow-2xl flex items-center justify-center">
              <span className="text-white font-black text-2xl">ن</span>
            </div>
          </div>

          <div className="animate-fade-in-up-delay-1 inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#10b981] pulse-dot" />
            15+ قطاع — 80+ قالب جاهز — نظام واحد متكامل
          </div>

          <h1 className="animate-fade-in-up-delay-2 text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
            نظام تشغيل واحد
            <br />
            <span className="gradient-text">لكل نشاطك التجاري</span>
          </h1>

          <p className="animate-fade-in-up-delay-3 text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            صالون، ورد، فندق، مطعم، لياقة، ضيافة، تأجير سيارات، تجزئة، تصوير وأكثر — كل نشاط له نظامه المتخصص وداشبورده الخاص
          </p>

          <div className="animate-fade-in-delay-4 flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/register"
              className="bg-white text-[#1a1a2e] px-8 py-3.5 rounded-xl font-bold text-base hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
            >
              ابدأ مجاناً
            </Link>
            <a
              href="#specializations"
              className="border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-white/10 transition-all backdrop-blur-sm flex items-center gap-2"
            >
              استكشف التخصصات
              <ArrowLeft size={16} />
            </a>
          </div>

          <p className="animate-fade-in-delay-4 mt-5 text-sm text-white/40 font-light">
            لا بطاقة ائتمانية مطلوبة — 15 حجز مجاناً — ابدأ الآن
          </p>
        </div>
      </section>

      {/* ── Section 2: Stats ─────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-b border-gray-100" ref={statsRef}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatItem target={15}  suffix="+" label="قطاع تشغيلي" start={statsInView} />
            <StatItem target={80}  suffix="+" label="قالب خدمة جاهز" start={statsInView} />
            <StatItem target={50000} suffix="+" label="حجز مكتمل" start={statsInView} />
            <StatItem target={99}  suffix="%" label="استمرارية الخدمة" start={statsInView} />
          </div>
        </div>
      </section>

      {/* ── Section 3: Specializations ────────────────────────────────────── */}
      <section id="specializations" className="py-24 md:py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">التخصصات</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">كل نشاط له نظامه وداشبورده</h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
              نسق لا يقدم نظاماً عاماً — كل تخصص يحمل وحدات حصرية وداشبورد مخصص مصمم لطبيعة ذلك النشاط تحديداً
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Scissors size={20} />,
                color: "bg-pink-50 text-pink-600 border-pink-100",
                badge: "bg-pink-100 text-pink-700",
                name: "الصالون",
                tagline: "صالونات الحلاقة والتجميل",
                modules: ["تقويم الموظفين الذكي", "خدمات منزلية وتنقل", "سجل عناية العميل", "إدارة الطاقم والحضور"],
              },
              {
                icon: <Flower2 size={20} />,
                color: "bg-emerald-50 text-emerald-600 border-emerald-100",
                badge: "bg-emerald-100 text-emerald-700",
                name: "محل الورد",
                tagline: "ورد، هدايا، وكوشات",
                modules: ["محرر التنسيقات البصري", "إدارة الكوشة والمناسبات", "تتبع انتهاء الصلاحية", "باقات جاهزة وتسعير ذكي"],
              },
              {
                icon: <Utensils size={20} />,
                color: "bg-orange-50 text-orange-600 border-orange-100",
                badge: "bg-orange-100 text-orange-700",
                name: "المطعم",
                tagline: "مطاعم، كافيهات، وسحب سحاب",
                modules: ["منيو رقمي تفاعلي", "نظام المطبخ KDS", "طلبات إلكترونية", "توصيل وتتبع سائقين"],
              },
              {
                icon: <Building2 size={20} />,
                color: "bg-blue-50 text-blue-600 border-blue-100",
                badge: "bg-blue-100 text-blue-700",
                name: "الفندق",
                tagline: "فنادق، شقق، وإيجار قصير",
                modules: ["إدارة الغرف والإتاحة", "تسجيل دخول وخروج", "خدمات الغرف", "تقارير الإشغال"],
              },
              {
                icon: <Car size={20} />,
                color: "bg-indigo-50 text-indigo-600 border-indigo-100",
                badge: "bg-indigo-100 text-indigo-700",
                name: "تأجير السيارات",
                tagline: "أساطيل، تأجير يومي وعقود",
                modules: ["إدارة الأسطول", "عقود التأجير الذكية", "جدولة الصيانة", "تسليم واستلام موثق"],
              },
              {
                icon: <ShoppingBag size={20} />,
                color: "bg-violet-50 text-violet-600 border-violet-100",
                badge: "bg-violet-100 text-violet-700",
                name: "التجزئة",
                tagline: "محلات، سوبرماركت، وبيع بالجملة",
                modules: ["نقطة بيع كاملة + باركود", "مخزون متعدد المستودعات", "عروض وخصومات", "تقارير مبيعات تفصيلية"],
              },
              {
                icon: <Layers size={20} />,
                color: "bg-teal-50 text-teal-600 border-teal-100",
                badge: "bg-teal-100 text-teal-700",
                name: "التأجير",
                tagline: "تأجير معدات، شقق، وأصول",
                modules: ["عقود تأجير متكاملة", "إدارة الأصول والجاهزية", "جدولة التوافر", "فواتير وتحصيل تلقائي"],
              },
              {
                icon: <Camera size={20} />,
                color: "bg-purple-50 text-purple-600 border-purple-100",
                badge: "bg-purple-100 text-purple-700",
                name: "التصوير",
                tagline: "استوديوهات ومصورون",
                modules: ["جلسات تصوير مجدولة", "مشاريع ومراحل التسليم", "عقود وعروض أسعار", "معرض أعمال للعميل"],
              },
              {
                icon: <Dumbbell size={20} />,
                color: "bg-red-50 text-red-600 border-red-100",
                badge: "bg-red-100 text-red-700",
                name: "اللياقة البدنية",
                tagline: "جيم، استوديو يوغا، ولياقة",
                modules: ["اشتراكات الأعضاء", "الحصص والجداول", "المدربون الشخصيون", "قياسات جسم وتتبع"],
              },
              {
                icon: <ChefHat size={20} />,
                color: "bg-amber-50 text-amber-600 border-amber-100",
                badge: "bg-amber-100 text-amber-700",
                name: "الضيافة والتموين",
                tagline: "مطابخ، تموين مناسبات",
                modules: ["باقات الطعام الجاهزة", "طلبات المناسبات", "جداول التسليم", "فواتير التموين التلقائية"],
              },
              {
                icon: <Sparkles size={20} />,
                color: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
                badge: "bg-fuchsia-100 text-fuchsia-700",
                name: "الديكور والزخرفة",
                tagline: "شركات ديكور وتصميم داخلي",
                modules: ["مشاريع التصميم", "عروض الأسعار التفصيلية", "جدولة التركيب", "متابعة مراحل التسليم"],
              },
              {
                icon: <GraduationCap size={20} />,
                color: "bg-emerald-50 text-emerald-700 border-emerald-200",
                badge: "bg-emerald-100 text-emerald-700",
                name: "المدرسة",
                tagline: "وكيل طلابي وإدارة مدرسية",
                modules: ["مراقب اليوم والحصص", "جداول شتوية وصيفية", "رصد تأخر المعلمين", "حالات الطلاب ومتابعتها"],
                link: "/school",
              },
            ].map((spec) => {
              const card = (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${spec.color.split(" ").slice(0, 2).join(" ")}`}>
                      {spec.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{spec.name}</p>
                        {"link" in spec && <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-semibold">نظام مستقل</span>}
                      </div>
                      <p className="text-[11px] text-gray-400">{spec.tagline}</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {spec.modules.map((m) => (
                      <li key={m} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 size={11} className="text-[#10b981] shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                  {"link" in spec && (
                    <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                      اكتشف نسق للمدارس
                      <ArrowLeft size={11} />
                    </div>
                  )}
                </>
              );
              return "link" in spec ? (
                <Link
                  key={spec.name}
                  to={spec.link!}
                  className={`bg-white rounded-2xl border ${spec.color.split(" ")[2]} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 block`}
                >
                  {card}
                </Link>
              ) : (
                <div key={spec.name} className={`bg-white rounded-2xl border ${spec.color.split(" ")[2]} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}>
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── School Banner ────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-emerald-950 via-emerald-900 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50 flex-shrink-0">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">تخصص المدارس</span>
                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold rounded-full px-2 py-0.5">نظام مستقل</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white">نسق للمدارس — نظام تشغيل يومي</h3>
              <p className="text-gray-400 text-sm mt-1">مراقب الحصص، جداول المعلمين، الطلاب، الحالات — كل شيء في بوابة مستقلة</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <div className="flex flex-col gap-2 text-right hidden md:flex">
              {["مراقب اليوم اللحظي", "جداول شتوية وصيفية", "رصد التأخر والحالات"].map((f) => (
                <span key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  {f}
                </span>
              ))}
            </div>
            <Link
              to="/school"
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all shadow-md hover:shadow-lg whitespace-nowrap self-center"
            >
              اكتشف نسق للمدارس
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section: Service Templates ───────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">القوالب الجاهزة</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">ابدأ بـ 80+ خدمة جاهزة من أول يوم</h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
              عند إنشاء نشاطك، يعرض النظام خدمات مصممة مسبقاً لقطاعك — استوردها بنقرة واحدة وخصّصها كيف تشاء
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: Scissors,    name: "صالون وسبا",        count: 20, color: "bg-pink-50 text-pink-600" },
              { icon: Dumbbell,    name: "لياقة بدنية",       count: 14, color: "bg-red-50 text-red-600" },
              { icon: Utensils,    name: "مطعم وكافيه",       count: 16, color: "bg-orange-50 text-orange-600" },
              { icon: ChefHat,     name: "ضيافة وتموين",      count: 12, color: "bg-amber-50 text-amber-600" },
              { icon: Flower2,     name: "محل ورد",           count: 10, color: "bg-rose-50 text-rose-600" },
              { icon: Building2,   name: "فندق وشقق",         count: 8,  color: "bg-blue-50 text-blue-600" },
              { icon: Car,         name: "تأجير سيارات",      count: 7,  color: "bg-indigo-50 text-indigo-600" },
              { icon: Camera,      name: "استوديو تصوير",     count: 10, color: "bg-purple-50 text-purple-600" },
              { icon: ShoppingBag, name: "تجزئة ومحلات",      count: 8,  color: "bg-violet-50 text-violet-600" },
              { icon: Sparkles,    name: "ديكور وزخرفة",      count: 9,  color: "bg-fuchsia-50 text-fuchsia-600" },
              { icon: PartyPopper, name: "فعاليات ومناسبات",  count: 11, color: "bg-purple-50 text-purple-600" },
              { icon: Layers,      name: "تأجير وعقود",       count: 7,  color: "bg-teal-50 text-teal-600" },
            ].map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all text-center">
                <div className={`w-10 h-10 rounded-xl ${t.color} flex items-center justify-center mx-auto mb-3`}>
                  <t.icon size={20} />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1">{t.name}</p>
                <p className="text-xs text-[#5b9bd5] font-semibold">{t.count}+ خدمة جاهزة</p>
              </div>
            ))}
          </div>

          <div className="bg-[#5b9bd5]/5 border border-[#5b9bd5]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#5b9bd5] flex items-center justify-center shrink-0">
                <Download size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">استيراد ذكي بنقرة واحدة</h3>
                <p className="text-sm text-gray-500 max-w-lg">
                  عند تسجيل نشاطك يعرض النظام قوالب قطاعك — اختر التصنيفات التي تريدها وأضفها لقائمة خدماتك فوراً. يمكنك الاستيراد في أي وقت من قسم الخدمات أيضاً.
                </p>
              </div>
            </div>
            <Link to="/register" className="shrink-0 bg-[#5b9bd5] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#4a8ac4] transition-colors whitespace-nowrap shadow-sm">
              ابدأ مجاناً وجرّب القوالب
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 4: Core Platform ──────────────────────────────────────── */}
      <section id="features" className="py-24 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">النواة المشتركة</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">40+ وحدة تشغيلية — مدمجة لكل المنشآت</h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
              كل منشأة تحصل على هذه الوحدات مدمجة — لا إضافات مدفوعة، لا تكاملات معقدة
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Calendar size={20} />,       title: "الحجوزات الذكية",       desc: "تقويم تفاعلي، تأكيد تلقائي، وإدارة كاملة لكل موعد من البداية للإغلاق",        color: "bg-blue-50 text-[#5b9bd5]" },
              { icon: <Users size={20} />,           title: "إدارة العملاء CRM",      desc: "ملفات عملاء كاملة، تاريخ التعامل، تصنيفات، وتواصل مباشر من النظام",          color: "bg-sky-50 text-sky-600" },
              { icon: <Monitor size={20} />,         title: "نقطة البيع POS",         desc: "كاشير متكامل، طباعة فواتير، خصومات، ووسائل دفع متعددة",                        color: "bg-indigo-50 text-indigo-600" },
              { icon: <Warehouse size={20} />,       title: "إدارة المخزون",          desc: "تتبع كميات، تنبيهات نفاد، طلبات شراء تلقائية، وسجل حركة كامل",              color: "bg-amber-50 text-amber-600" },
              { icon: <ClipboardList size={20} />,   title: "الموظفون والحضور",       desc: "سجل الدوام، الإجازات، المهام اليومية، وملفات الفريق",                          color: "bg-teal-50 text-teal-600" },
              { icon: <Receipt size={20} />,         title: "المحاسبة والمالية",      desc: "قيود محاسبية تلقائية، ميزانية، حسابات ختامية، وتقارير ربحية",                color: "bg-emerald-50 text-emerald-600" },
              { icon: <Globe size={20} />,           title: "الموقع والحجز الإلكتروني","desc": "موقع احترافي جاهز مع رابط حجز مباشر وصفحة نشاطك المخصصة",               color: "bg-cyan-50 text-cyan-600" },
              { icon: <BarChart3 size={20} />,       title: "التقارير والتحليلات",    desc: "داشبورد تنفيذي، تقارير إيرادات، أداء موظفين، واتجاهات النشاط",              color: "bg-purple-50 text-purple-600" },
              { icon: <Megaphone size={20} />,       title: "التسويق والحملات",       desc: "رسائل SMS وبريد، حملات موسمية، متابعة العروض، وولاء العملاء",               color: "bg-rose-50 text-rose-600" },
              { icon: <Zap size={20} />,             title: "الأتمتة والقواعد",       desc: "قواعد تلقائية لإرسال التذكيرات، إغلاق الحجوزات، وتحريك المخزون",           color: "bg-yellow-50 text-yellow-600" },
              { icon: <Truck size={20} />,           title: "الموردون والمشتريات",    desc: "قائمة موردين، طلبات شراء، استلام وفحص بضاعة، وسجل تكاليف",                 color: "bg-orange-50 text-orange-600" },
              { icon: <Bell size={20} />,            title: "الإشعارات الفورية",      desc: "إشعارات تلقائية للعميل والموظف عند كل حدث — حجز، إلغاء، تأكيد",           color: "bg-fuchsia-50 text-fuchsia-600" },
              { icon: <Briefcase size={20} />,       title: "العقود والموافقات",      desc: "إدارة عقود الخدمة، موافقات متعددة المستويات، وتوقيع رقمي",                  color: "bg-slate-50 text-slate-600" },
              { icon: <CreditCard size={20} />,      title: "الفواتير والتحصيل",      desc: "إصدار فواتير احترافية، متابعة المديونيات، ورسائل تحصيل تلقائية",           color: "bg-green-50 text-green-600" },
              { icon: <Wrench size={20} />,          title: "الصيانة الدورية",        desc: "جدولة صيانة الأصول والمعدات، تنبيهات استحقاق، وسجل أعمال",                color: "bg-stone-50 text-stone-600" },
              { icon: <FileText size={20} />,        title: "سجل التدقيق",            desc: "تتبع كامل لكل عملية داخل النظام — من فعلها، متى، وماذا غيّر",               color: "bg-gray-50 text-gray-600" },
              { icon: <Activity size={20} />,        title: "داشبورد مخصص لكل قطاع",  desc: "كل نشاط يحصل على داشبورد تنفيذي مخصص — KPIs وإجراءات وودجت مناسبة لقطاعه",  color: "bg-[#5b9bd5]/10 text-[#5b9bd5]" },
              { icon: <Download size={20} />,        title: "قوالب الخدمات الجاهزة",  desc: "80+ خدمة جاهزة لكل قطاع — استوردها بنقرة عند الإعداد أو في أي وقت",          color: "bg-teal-50 text-teal-600" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Deep Specialty Showcase ────────────────────────────── */}
      <section className="py-24 md:py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">التخصص العميق</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">وحدات حصرية لكل قطاع</h2>
            <p className="text-gray-500 max-w-xl mx-auto">كل قطاع له منطقه التشغيلي الخاص — وحدات لا تجدها في أي نظام عام</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                title: "نظام المطعم والكافيه", sub: "من المطبخ إلى الطاولة إلى التوصيل",
                iconEl: <Utensils size={18} className="text-orange-600" />, bg: "bg-orange-50", textColor: "text-orange-600",
                items: [
                  { icon: <ChefHat size={15} />, label: "نظام المطبخ KDS", sub: "طباعة أوامر وأولويات فورية" },
                  { icon: <Smartphone size={15} />, label: "الطلبات الإلكترونية", sub: "QR menu وأوردر إلكتروني" },
                  { icon: <Truck size={15} />, label: "إدارة التوصيل", sub: "سائقون، مسارات، وتتبع" },
                  { icon: <Globe size={15} />, label: "منيو رقمي", sub: "تحديث فوري لصفحة النشاط" },
                ],
              },
              {
                title: "نظام الورد والتنسيقات", sub: "من الزهرة إلى الكوشة إلى التوصيل",
                iconEl: <Flower2 size={18} className="text-rose-600" />, bg: "bg-rose-50", textColor: "text-rose-600",
                items: [
                  { icon: <Flower2 size={15} />, label: "محرر التنسيقات", sub: "بناء باقات بصرية وتسعير" },
                  { icon: <Calendar size={15} />, label: "حجوزات الكوشة", sub: "مناسبات وأعراس" },
                  { icon: <Bell size={15} />, label: "انتهاء الصلاحية", sub: "تنبيهات قبل 3 أيام" },
                  { icon: <Package size={15} />, label: "إدارة الأسهم", sub: "تتبع السيقان والأصناف" },
                ],
              },
              {
                title: "نظام الصالون والسبا", sub: "حجوزات، طاقم، وعناية بالعميل",
                iconEl: <Scissors size={18} className="text-pink-600" />, bg: "bg-pink-50", textColor: "text-pink-600",
                items: [
                  { icon: <Calendar size={15} />, label: "تقويم الموظفين الذكي", sub: "تعيين تلقائي بحسب الخبرة" },
                  { icon: <Users size={15} />, label: "سجل عناية العميل", sub: "تاريخ الخدمات والتفضيلات" },
                  { icon: <Home size={15} />, label: "خدمات منزلية", sub: "جدولة التنقل والعناوين" },
                  { icon: <ClipboardList size={15} />, label: "الحضور والعمولات", sub: "دوام يومي وتوزيع العمولة" },
                ],
              },
              {
                title: "نظام الفندق والشقق", sub: "إدارة الإشغال والخدمات بدقة",
                iconEl: <Building2 size={18} className="text-blue-600" />, bg: "bg-blue-50", textColor: "text-blue-600",
                items: [
                  { icon: <Building2 size={15} />, label: "خريطة الغرف", sub: "إتاحة فورية وتصنيف" },
                  { icon: <ClipboardList size={15} />, label: "Check-in/out", sub: "استقبال رقمي سريع" },
                  { icon: <Bell size={15} />, label: "خدمات الغرف", sub: "طلبات وتتبع التسليم" },
                  { icon: <BarChart3 size={15} />, label: "تقارير الإشغال", sub: "RevPAR وإيرادات الغرفة" },
                ],
              },
              {
                title: "نظام تأجير السيارات", sub: "من العقد إلى التسليم إلى الصيانة",
                iconEl: <Car size={18} className="text-indigo-600" />, bg: "bg-indigo-50", textColor: "text-indigo-600",
                items: [
                  { icon: <Car size={15} />, label: "إدارة الأسطول", sub: "سيارات، جاهزية، وحالة" },
                  { icon: <FileText size={15} />, label: "عقود التأجير", sub: "إنشاء ورقمنة العقود" },
                  { icon: <Wrench size={15} />, label: "جدولة الصيانة", sub: "تنبيه قبل الاستحقاق" },
                  { icon: <ClipboardList size={15} />, label: "التسليم والاستلام", sub: "تقارير حالة موثقة" },
                ],
              },
              {
                title: "نظام اللياقة البدنية", sub: "اشتراكات، حصص، ومدربون",
                iconEl: <Dumbbell size={18} className="text-red-600" />, bg: "bg-red-50", textColor: "text-red-600",
                items: [
                  { icon: <Users size={15} />, label: "اشتراكات الأعضاء", sub: "باقات، تجديد، وتذكير" },
                  { icon: <Calendar size={15} />, label: "الحصص والجداول", sub: "حصص جماعية ومتاحة" },
                  { icon: <ClipboardList size={15} />, label: "المدربون الشخصيون", sub: "تعيين وتتبع الجلسات" },
                  { icon: <BarChart3 size={15} />, label: "قياسات وتتبع", sub: "تقدم العضو مع الوقت" },
                ],
              },
              {
                title: "نظام الفعاليات والمناسبات", sub: "تخطيط، تنفيذ، وعقود",
                iconEl: <PartyPopper size={18} className="text-purple-600" />, bg: "bg-purple-50", textColor: "text-purple-600",
                items: [
                  { icon: <ClipboardList size={15} />, label: "ملف الفعالية", sub: "التفاصيل، الموقع، والعقد" },
                  { icon: <Package size={15} />, label: "باقات الفعالية", sub: "تسعير متعدد المستويات" },
                  { icon: <Users size={15} />, label: "إدارة الضيوف", sub: "قوائم، تأكيدات، وDietry" },
                  { icon: <Receipt size={15} />, label: "عروض الأسعار", sub: "PDF احترافي وتتبع الموافقات" },
                ],
              },
              {
                title: "نظام التجزئة ونقاط البيع", sub: "كاشير، مخزون، وتقارير مبيعات",
                iconEl: <ShoppingBag size={18} className="text-violet-600" />, bg: "bg-violet-50", textColor: "text-violet-600",
                items: [
                  { icon: <Monitor size={15} />, label: "نقطة البيع POS", sub: "كاشير + باركود + طباعة فاتورة" },
                  { icon: <Warehouse size={15} />, label: "المخزون المتعدد", sub: "مستودعات، حركة، وتنبيهات" },
                  { icon: <Zap size={15} />, label: "عروض وخصومات", sub: "حملات موسمية وكوبونات" },
                  { icon: <BarChart3 size={15} />, label: "تقارير المبيعات", sub: "تفصيلية بالمنتج والموظف" },
                ],
              },
            ].map((sector) => (
              <div key={sector.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all">
                <div className="px-6 pt-6 pb-4 border-b border-gray-50">
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-9 h-9 rounded-xl ${sector.bg} flex items-center justify-center`}>
                      {sector.iconEl}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{sector.title}</p>
                      <p className="text-xs text-gray-400">{sector.sub}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-2 gap-3">
                  {sector.items.map((item) => (
                    <div key={item.label} className="flex gap-3 items-start">
                      <div className={`w-7 h-7 rounded-lg ${sector.bg} flex items-center justify-center shrink-0 mt-0.5 ${sector.textColor}`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                        <p className="text-[11px] text-gray-400">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: How it works ──────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">كيف يعمل</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">ثلاث خطوات للبدء</h2>
            <p className="text-gray-500 max-w-lg mx-auto">من التسجيل حتى استقبال أول حجز — في أقل من ساعة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 right-1/3 left-1/3 h-px" style={{ background: "repeating-linear-gradient(90deg, #5b9bd5 0px, #5b9bd5 8px, transparent 8px, transparent 16px)" }} />

            {[
              { step: "01", title: "سجّل حسابك", desc: "أنشئ حسابك في دقيقتين واختر نوع نشاطك. النظام يُهيئ الوحدات المناسبة تلقائياً." },
              { step: "02", title: "استورد خدماتك", desc: "اختر من 80+ خدمة جاهزة لقطاعك، أضفها بنقرة، ثم عدّل الأسعار وأوقات العمل حسب نشاطك." },
              { step: "03", title: "استقبل الحجوزات", desc: "شارك رابط الحجز وابدأ استقبال العملاء فوراً مع إشعارات وتأكيدات تلقائية." },
            ].map((item, i) => (
              <div key={item.step} className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center hover:shadow-md transition-all">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#5b9bd5]/10 text-[#5b9bd5] mb-5 mx-auto">
                  <span className="text-2xl font-black text-[#5b9bd5]">{i + 1}</span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: Pricing ───────────────────────────────────────────── */}
      <section id="pricing" className="py-24 md:py-32 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">الأسعار</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">خطة تناسب كل مرحلة</h2>
            <p className="text-gray-500 max-w-md mx-auto">ابدأ مجاناً وطوّر خطتك مع نمو نشاطك</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {[
              {
                name: "مجاني",
                price: "0",
                period: "لا رسوم شهرية",
                desc: "استكشف كامل النظام بلا تكلفة",
                features: ["جميع وحدات النظام", "15 حجز مدى الحياة", "5 موظفين", "موقع حجز كامل", "دعم عبر البريد"],
                cta: "ابدأ مجاناً",
                href: "/register",
                popular: false,
              },
              {
                name: "الأساسي",
                price: "199",
                period: "ر.س / شهرياً",
                desc: "للأنشطة النامية التي تحتاج استمرارية",
                features: ["حجوزات غير محدودة", "10 موظفين", "فرع واحد", "تقارير متقدمة", "تسويق وحملات", "دعم أولوي"],
                cta: "ابدأ الآن",
                href: "/register",
                popular: true,
              },
              {
                name: "الاحترافي",
                price: "999",
                period: "ر.س / شهرياً",
                desc: "للشركات والفروع المتعددة",
                features: ["حجوزات غير محدودة", "50 موظف", "5 فروع", "API مخصص", "مدير حساب", "SLA 99.9%"],
                cta: "تواصل معنا",
                href: "/contact",
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 transition-all ${
                  plan.popular
                    ? "bg-white border-2 border-[#5b9bd5] shadow-xl scale-[1.02]"
                    : "bg-white border border-gray-100 shadow-sm hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#5b9bd5] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                      الأكثر طلباً
                    </span>
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-base font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-xs text-gray-400">{plan.desc}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-400 mr-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 size={14} className="text-[#10b981] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className={`block text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-[#5b9bd5] text-white hover:bg-[#4a8ac4] shadow-sm hover:shadow-md"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-8">
            هل أنت شركة كبيرة أو لديك فروع متعددة؟
            <Link to="/contact" className="text-[#5b9bd5] font-semibold mr-1 hover:underline">تواصل معنا للخطة المؤسسية</Link>
          </p>
        </div>
      </section>

      {/* ── Section 8: Testimonials ──────────────────────────────────────── */}
      <section id="testimonials" className="py-24 md:py-32" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">آراء العملاء</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">يقولون عن نسق</h2>
            <p className="text-gray-500">من صالونات الرياض إلى فنادق جدة — تجارب حقيقية من قطاعات مختلفة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "أحمد الغامدي",
                role: "مدير صالون — الرياض",
                text: "قبل نسق كنت أدير كل شيء يدوياً. الآن تقويم الموظفين يعمل تلقائياً والعملاء يحجزون بأنفسهم. وفّرت 3 ساعات يومياً.",
                stars: 5,
                initials: "أغ",
                type: "صالون",
                typeColor: "bg-pink-50 text-pink-600",
              },
              {
                name: "سارة العمري",
                role: "صاحبة محل ورد — جدة",
                text: "محرر التنسيقات غيّر طريقة عملي تماماً. الآن أبني باقات الكوشة وأسعّرها في دقائق، وتنبيهات انتهاء الصلاحية وفّرت عليّ خسائر كثيرة.",
                stars: 5,
                initials: "سع",
                type: "ورد",
                typeColor: "bg-emerald-50 text-emerald-600",
              },
              {
                name: "محمد الحربي",
                role: "مالك كافيه — الدمام",
                text: "نظام المطبخ والطلبات الإلكترونية غيّرا الكافيه بالكامل. الطلبات تذهب مباشرة للمطبخ، ولا أحد يفوّت أمر. الإيرادات زادت 30% بعد ستة أشهر.",
                stars: 5,
                initials: "مح",
                type: "مطعم",
                typeColor: "bg-orange-50 text-orange-600",
              },
              {
                name: "فيصل السعدون",
                role: "مدير فندق — مكة",
                text: "إدارة الغرف وخريطة الإشغال أصبحت بصرية وفورية. تقارير RevPAR تساعدني على قرارات التسعير يومياً. نظام متكامل فعلاً.",
                stars: 5,
                initials: "فس",
                type: "فندق",
                typeColor: "bg-blue-50 text-blue-600",
              },
              {
                name: "نورة القحطاني",
                role: "مديرة استوديو تصوير — الرياض",
                text: "جدولة الجلسات وإرسال تأكيدات للعملاء كان مشكلة كبيرة. نسق حلها بالكامل. الآن أتابع كل مشروع من الحجز للتسليم من شاشة واحدة.",
                stars: 5,
                initials: "نق",
                type: "تصوير",
                typeColor: "bg-purple-50 text-purple-600",
              },
              {
                name: "خالد المطيري",
                role: "مالك شركة تأجير سيارات — الخبر",
                text: "عقود التأجير والصيانة الدورية كانت تضيع في أوراق. الآن الأسطول كله في نسق — إتاحة كل سيارة، موعد صيانتها، وحالة كل عقد.",
                stars: 5,
                initials: "خم",
                type: "تأجير سيارات",
                typeColor: "bg-indigo-50 text-indigo-600",
              },
            ].map((t) => (
              <div key={t.name} className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} size={13} className="fill-[#f59e0b] text-[#f59e0b]" />
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.typeColor}`}>{t.type}</span>
                </div>
                <p className="text-gray-700 text-sm leading-loose mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#5b9bd5]/15 flex items-center justify-center">
                    <span className="text-[#5b9bd5] text-xs font-bold">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 9: CTA ───────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
        <div className="absolute inset-0 dot-pattern pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#5b9bd5] flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-white font-black text-xl">ن</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight">
            نظامك التشغيلي جاهز
          </h2>
          <p className="text-white/60 text-lg mb-4 font-light leading-relaxed">
            سجّل الآن واختر تخصص نشاطك — النظام يُهيئ نفسه تلقائياً
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10 text-white/40 text-sm">
            {["صالون", "حلاقة", "سبا", "ورد", "مطعم", "كافيه", "فندق", "تأجير سيارات", "تجزئة", "تأجير", "لياقة", "تصوير", "ضيافة", "ديكور", "فعاليات", "مدرسة"].map((t) => (
              <span key={t} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">{t}</span>
            ))}
          </div>
          <Link
            to="/register"
            className="inline-flex items-center gap-3 bg-white text-[#1a1a2e] px-10 py-4 rounded-xl font-bold text-base hover:bg-gray-100 transition-all shadow-2xl hover:shadow-xl"
          >
            ابدأ مجاناً الآن
            <ArrowLeft size={16} />
          </Link>
          <p className="mt-4 text-white/30 text-sm">لا بطاقة ائتمانية — 15 حجز مجاناً</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0d0d1a] text-gray-400 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <FooterLogo />
              <p className="text-sm leading-relaxed mb-5 max-w-[200px]">
                نظام تشغيل متكامل لكل أنواع الأنشطة التجارية
              </p>
              <div className="flex gap-3">
                {[
                  { icon: <Twitter size={15} />, href: "#" },
                  { icon: <Linkedin size={15} />, href: "#" },
                  { icon: <Instagram size={15} />, href: "#" },
                ].map((social, i) => (
                  <a key={i} href={social.href}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">المنتج</h4>
              <div className="space-y-3">
                <a href="#specializations" className="block text-sm hover:text-white transition-colors">التخصصات</a>
                <a href="#features" className="block text-sm hover:text-white transition-colors">الإمكانيات</a>
                <Link to="/pricing" className="block text-sm hover:text-white transition-colors">الأسعار</Link>
                <Link to="/register" className="block text-sm hover:text-white transition-colors">ابدأ مجاناً</Link>
                <Link to="/school" className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                  <GraduationCap className="w-3.5 h-3.5" />
                  نسق للمدارس
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">الشركة</h4>
              <div className="space-y-3">
                <Link to="/about" className="block text-sm hover:text-white transition-colors">من نحن</Link>
                <Link to="/contact" className="block text-sm hover:text-white transition-colors">تواصل معنا</Link>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">تواصل</h4>
              <div className="space-y-3 text-sm">
                {platform.supportEmail && (
                  <p><a href={`mailto:${platform.supportEmail}`} className="hover:text-white transition-colors">{platform.supportEmail}</a></p>
                )}
                {platform.supportPhone && (
                  <p><a href={`tel:+966${platform.supportPhone.replace(/^0/, "")}`} className="hover:text-white transition-colors" dir="ltr">{platform.supportPhone}</a></p>
                )}
                <div className="mt-4">
                  <p className="text-xs text-gray-600 mb-2">نشرة بريدية</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="بريدك الإلكتروني"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-[#5b9bd5]/50"
                    />
                    <button className="bg-[#5b9bd5] text-white text-xs px-3 py-2 rounded-lg hover:bg-[#4a8ac4] transition-colors whitespace-nowrap">
                      اشتراك
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">© 2026 نسق. جميع الحقوق محفوظة.</p>
            <div className="flex gap-6">
              <Link to="/contact" className="text-xs hover:text-white transition-colors">تواصل معنا</Link>
              <Link to="/about" className="text-xs hover:text-white transition-colors">من نحن</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
