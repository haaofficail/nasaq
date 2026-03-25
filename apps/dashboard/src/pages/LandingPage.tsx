import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Monitor,
  Package,
  Globe,
  BarChart3,
  Truck,
  CheckCircle2,
  ArrowLeft,
  Twitter,
  Linkedin,
  Instagram,
  Star,
  Scissors,
  Coffee,
  Flower2,
  Utensils,
  Car,
  Camera,
  Home,
} from "lucide-react";

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
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#5b9bd5] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white font-black text-sm">ن</span>
          </div>
          <span className={`text-lg font-bold transition-colors ${scrolled ? "text-gray-900" : "text-white"}`}>نسق</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { to: "#features", label: "المميزات" },
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
          <a href="#features" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>المميزات</a>
          <a href="#pricing" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>الأسعار</a>
          <a href="#testimonials" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>آراء العملاء</a>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Link to="/login" className="flex-1 text-center border border-gray-200 text-sm font-medium text-gray-700 py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>تسجيل الدخول</Link>
            <Link to="/register" className="flex-1 text-center bg-[#5b9bd5] text-white text-sm font-semibold py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>ابدأ مجاناً</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function LandingPage() {
  const { ref: statsRef, inView: statsInView } = useInView(0.3);

  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans overflow-x-hidden">
      <PublicHeader />

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #5b9bd5 100%)" }}>

        {/* Dot pattern */}
        <div className="absolute inset-0 dot-pattern pointer-events-none" />

        {/* Animated SVG background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg className="absolute -top-32 -right-32 w-[600px] h-[600px] opacity-10" viewBox="0 0 600 600">
            <circle cx="300" cy="300" r="250" fill="#5b9bd5" />
          </svg>
          <svg className="absolute -bottom-48 -left-48 w-[700px] h-[700px] opacity-[0.06]" viewBox="0 0 700 700">
            <circle cx="350" cy="350" r="300" fill="#5b9bd5" />
          </svg>
          {/* Animated paths */}
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path
              d="M0,80 C360,120 720,40 1080,80 C1260,100 1380,60 1440,80 L1440,120 L0,120 Z"
              fill="white"
              fillOpacity="1"
            />
          </svg>
          {/* Floating circles */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-[#5b9bd5]/40 animate-float" style={{ animationDelay: "0s" }} />
          <div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-[#f59e0b]/30 animate-float" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-white/20 animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute top-2/3 right-1/4 w-1.5 h-1.5 rounded-full bg-[#5b9bd5]/30 animate-float" style={{ animationDelay: "3s" }} />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-32">
          {/* Logo mark */}
          <div className="animate-fade-in-up flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#5b9bd5] shadow-2xl flex items-center justify-center">
              <span className="text-white font-black text-2xl">ن</span>
            </div>
          </div>

          {/* Badge */}
          <div className="animate-fade-in-up-delay-1 inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#10b981] pulse-dot" />
            نظام نسق — الإصدار الجديد متاح الآن
          </div>

          {/* Title */}
          <h1 className="animate-fade-in-up-delay-2 text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
            نظام تشغيل واحد
            <br />
            <span className="gradient-text">لكل نشاطك التجاري</span>
          </h1>

          {/* Description */}
          <p className="animate-fade-in-up-delay-3 text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            صالون؟ مطعم؟ كوفي؟ ورد؟ تأجير؟ — نسق يديرهم كلهم من مكان واحد
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-delay-4 flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/register"
              className="bg-white text-[#1a1a2e] px-8 py-3.5 rounded-xl font-bold text-base hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
            >
              ابدأ مجاناً
            </Link>
            <a
              href="#features"
              className="border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-white/10 transition-all backdrop-blur-sm flex items-center gap-2"
            >
              شاهد العرض
              <ArrowLeft size={16} />
            </a>
          </div>

          <p className="animate-fade-in-delay-4 mt-5 text-sm text-white/40 font-light">
            لا بطاقة ائتمانية مطلوبة — 14 يوم مجاناً — إلغاء في أي وقت
          </p>
        </div>
      </section>

      {/* ── Section 2: Stats ─────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-b border-gray-100" ref={statsRef}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <StatItem target={44530} suffix="+" label="حجز مكتمل" start={statsInView} />
            <StatItem target={7} suffix="+" label="أنواع أنشطة" start={statsInView} />
            <StatItem target={11} suffix="+" label="سنة خبرة" start={statsInView} />
            <StatItem target={999} suffix="‰" label="استمرارية الخدمة" start={statsInView} />
          </div>
        </div>
      </section>

      {/* ── Section 3: For Every Business ────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-gray-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">منصة شاملة</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-5">
                لكل نشاط تجاري
                <br />
                <span className="text-[#5b9bd5]">حل مخصص</span>
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-md">
                سواء كنت تدير صالون حلاقة، مطعماً، محل ورد، أو خدمة تأجير — نسق يتكيف مع طبيعة نشاطك ويعطيك الأدوات التي تحتاجها بالضبط.
              </p>
              <div className="space-y-3 mb-8">
                {["حجوزات ذكية مع تقويم تفاعلي", "إدارة عملاء وبناء علاقات طويلة", "تقارير تساعدك على اتخاذ قرارات أفضل"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-[#10b981] shrink-0" />
                    <span className="text-sm text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/register" className="inline-flex items-center gap-2 bg-[#5b9bd5] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#4a8ac4] transition-all shadow-sm hover:shadow-md">
                ابدأ تجربتك المجانية
                <ArrowLeft size={15} />
              </Link>
            </div>

            {/* Right: orbit animation */}
            <div className="relative flex items-center justify-center" style={{ height: 360 }}>
              {/* Center logo */}
              <div className="absolute z-10 w-20 h-20 rounded-2xl bg-[#5b9bd5] shadow-2xl flex items-center justify-center animate-float">
                <span className="text-white font-black text-2xl">ن</span>
              </div>

              {/* Ring 1 */}
              <div className="absolute w-[200px] h-[200px] rounded-full border border-[#5b9bd5]/20 orbit-ring-1">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center shadow-sm">
                  <Scissors size={16} className="text-pink-500" />
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shadow-sm">
                  <Coffee size={16} className="text-amber-600" />
                </div>
              </div>

              {/* Ring 2 */}
              <div className="absolute w-[300px] h-[300px] rounded-full border border-dashed border-[#5b9bd5]/15 orbit-ring-2">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                  <Utensils size={16} className="text-red-500" />
                </div>
                <div className="absolute top-1/2 -right-5 -translate-y-1/2 w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shadow-sm">
                  <Flower2 size={16} className="text-green-500" />
                </div>
                <div className="absolute top-1/2 -left-5 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
                  <Home size={16} className="text-blue-500" />
                </div>
              </div>

              {/* Ring 3 */}
              <div className="absolute w-[350px] h-[350px] rounded-full border border-[#5b9bd5]/10 orbit-ring-3">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                  <Car size={16} className="text-indigo-500" />
                </div>
                <div className="absolute -bottom-5 right-1/4 w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shadow-sm">
                  <Camera size={16} className="text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Features ──────────────────────────────────────────── */}
      <section id="features" className="py-24 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">الإمكانيات</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">كل ما يحتاجه نشاطك</h2>
            <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">أدوات احترافية مدمجة في منصة واحدة — لا حاجة لأنظمة متعددة</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Calendar size={22} />, title: "إدارة الحجوزات", desc: "تقويم تفاعلي مع إشعارات فورية وتتبع كل حجز من اللحظة الأولى حتى الإغلاق.", color: "bg-blue-50 text-[#5b9bd5]" },
              { icon: <Monitor size={22} />, title: "نقطة البيع", desc: "كاشير متكامل لمعالجة المدفوعات، إصدار الفواتير، وإدارة الطلبات في الوقت الفعلي.", color: "bg-indigo-50 text-indigo-600" },
              { icon: <Package size={22} />, title: "إدارة المخزون", desc: "تتبع أصولك ومعداتك وجدولة استخدامها مع تنبيهات الصيانة والنفاد.", color: "bg-amber-50 text-amber-600" },
              { icon: <Globe size={22} />, title: "الموقع الإلكتروني", desc: "موقع احترافي جاهز لنشاطك مع رابط حجز مباشر يمكن مشاركته بسهولة.", color: "bg-emerald-50 text-emerald-600" },
              { icon: <BarChart3 size={22} />, title: "التقارير والتحليلات", desc: "لوحة بيانات شاملة تعطيك رؤية واضحة عن أداء نشاطك واتجاهات الإيرادات.", color: "bg-purple-50 text-purple-600" },
              { icon: <Truck size={22} />, title: "إدارة الطلبات", desc: "تتبع الطلبات الميدانية والتوصيل مع تحديثات حالة فورية لكل طلب.", color: "bg-rose-50 text-rose-600" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-11 h-11 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: How it works ──────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">كيف يعمل</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">ثلاث خطوات للبدء</h2>
            <p className="text-gray-500 max-w-lg mx-auto">من التسجيل حتى استقبال أول حجز — في أقل من ساعة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector lines (desktop) */}
            <div className="hidden md:block absolute top-10 right-1/3 left-1/3 h-px" style={{ background: "repeating-linear-gradient(90deg, #5b9bd5 0px, #5b9bd5 8px, transparent 8px, transparent 16px)" }} />

            {[
              { step: "01", icon: <CheckCircle2 size={20} />, title: "سجّل حسابك", desc: "أنشئ حسابك في دقيقتين بالبريد أو رقم الجوال. لا بطاقة ائتمانية." },
              { step: "02", icon: <Package size={20} />, title: "خصّص نشاطك", desc: "أدخل خدماتك وأسعارك وأوقات العمل. القالب يتكيف مع نوع نشاطك تلقائياً." },
              { step: "03", icon: <Calendar size={20} />, title: "استقبل الحجوزات", desc: "شارك رابط الحجز الخاص بك واستقبل عملاءك فوراً مع إشعارات تلقائية." },
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

      {/* ── Section 6: Pricing ───────────────────────────────────────────── */}
      <section id="pricing" className="py-24 md:py-32 bg-white">
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
                period: "ر.س / شهرياً",
                desc: "لتجربة النظام والبدء الصغير",
                features: ["3 خدمات", "50 حجز / شهر", "موقع أساسي", "دعم عبر البريد"],
                cta: "ابدأ مجاناً",
                popular: false,
              },
              {
                name: "احترافي",
                price: "199",
                period: "ر.س / شهرياً",
                desc: "للأنشطة النامية والمحترفين",
                features: ["خدمات غير محدودة", "حجوزات غير محدودة", "تقارير متقدمة", "دعم أولوي", "تطبيق جوال", "نقطة بيع كاملة"],
                cta: "ابدأ التجربة",
                popular: true,
              },
              {
                name: "مؤسسي",
                price: "499",
                period: "ر.س / شهرياً",
                desc: "للشركات والفروع المتعددة",
                features: ["كل مميزات الاحترافي", "فروع متعددة", "API مخصص", "مدير حساب", "تخصيص كامل", "SLA 99.9%"],
                cta: "تواصل معنا",
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
                  to="/register"
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
        </div>
      </section>

      {/* ── Section 7: Testimonials ──────────────────────────────────────── */}
      <section id="testimonials" className="py-24 md:py-32" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-[#5b9bd5] uppercase tracking-widest mb-3">آراء العملاء</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">يقولون عن نسق</h2>
            <p className="text-gray-500">تجارب حقيقية من أصحاب أنشطة يستخدمون نسق يومياً</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "أحمد الغامدي",
                role: "مدير صالون حلاقة — الرياض",
                text: "قبل نسق كنت أدير كل شيء يدوياً. الآن الحجوزات تأتي تلقائياً والعملاء يتابعون حجوزاتهم بأنفسهم. وفّرت 3 ساعات يومياً.",
                stars: 5,
                initials: "أغ",
              },
              {
                name: "سارة العمري",
                role: "صاحبة محل ورد — جدة",
                text: "النظام بسيط جداً وتعلمت استخدامه في يوم واحد. الجزء المفضل لدي هو تقارير المبيعات — أعرف الآن أي باقات تبيع أكثر.",
                stars: 5,
                initials: "سع",
              },
              {
                name: "محمد الحربي",
                role: "مالك كافيه — الدمام",
                text: "نسق غيّر طريقة عمل كافيهي بالكامل. الطلبات والحجوزات في مكان واحد، والفريق يعرف مهامه بوضوح. ممتاز.",
                stars: 5,
                initials: "مح",
              },
            ].map((t) => (
              <div key={t.name} className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} className="fill-[#f59e0b] text-[#f59e0b]" />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-gray-700 text-sm leading-loose mb-6">"{t.text}"</p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5b9bd5]/15 flex items-center justify-center">
                    <span className="text-[#5b9bd5] text-sm font-bold">{t.initials}</span>
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

      {/* ── Section 8: CTA ───────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
        <div className="absolute inset-0 dot-pattern pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#5b9bd5] flex items-center justify-center mx-auto mb-6 shadow-xl">
            <span className="text-white font-black text-xl">ن</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-5 leading-tight">
            ابدأ رحلتك مع نسق اليوم
          </h2>
          <p className="text-white/60 text-lg mb-10 font-light leading-relaxed">
            انضم إلى آلاف أصحاب الأنشطة الذين يديرون أعمالهم بذكاء وسهولة
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-3 bg-white text-[#1a1a2e] px-10 py-4 rounded-xl font-bold text-base hover:bg-gray-100 transition-all shadow-2xl hover:shadow-xl"
          >
            ابدأ مجاناً الآن
            <ArrowLeft size={16} />
          </Link>
          <p className="mt-4 text-white/30 text-sm">لا بطاقة ائتمانية — 14 يوم مجاناً</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0d0d1a] text-gray-400 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#5b9bd5] flex items-center justify-center">
                  <span className="text-white font-black text-sm">ن</span>
                </div>
                <span className="text-lg font-bold text-white">نسق</span>
              </div>
              <p className="text-sm leading-relaxed mb-5 max-w-[200px]">
                منصة إدارة الأنشطة التجارية المتكاملة
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

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">المنتج</h4>
              <div className="space-y-3">
                <Link to="/features" className="block text-sm hover:text-white transition-colors">المميزات</Link>
                <Link to="/pricing" className="block text-sm hover:text-white transition-colors">الأسعار</Link>
                <Link to="/register" className="block text-sm hover:text-white transition-colors">ابدأ مجاناً</Link>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">الشركة</h4>
              <div className="space-y-3">
                <Link to="/about" className="block text-sm hover:text-white transition-colors">من نحن</Link>
                <Link to="/contact" className="block text-sm hover:text-white transition-colors">تواصل معنا</Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm">تواصل</h4>
              <div className="space-y-3 text-sm">
                <p>support@nasaqpro.tech</p>
                <p>+966 5X XXX XXXX</p>
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
