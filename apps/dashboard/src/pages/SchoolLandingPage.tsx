import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, ClipboardCheck, Users, CalendarDays, AlertCircle,
  BookOpenCheck, Upload, BarChart3, CheckCircle2, ArrowLeft,
  ChevronDown, Shield, Clock, Layers, Bell, FileSpreadsheet,
  CalendarCheck, ClipboardPen, MonitorCheck, UserCheck,
} from "lucide-react";

// ─── Counter Hook ──────────────────────────────────────────────────────────────
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

// ─── Header ───────────────────────────────────────────────────────────────────
function SchoolHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100" : "bg-transparent"
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/school" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className={`text-base font-black transition-colors ${scrolled ? "text-gray-900" : "text-white"}`}>
              ترميز OS
            </span>
            <span className={`text-[10px] font-semibold transition-colors ${scrolled ? "text-emerald-600" : "text-emerald-300"}`}>
              للمدارس
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7">
          {[
            { to: "#features", label: "الميزات" },
            { to: "#how", label: "كيف يعمل" },
            { to: "#modules", label: "الوحدات" },
          ].map((item) => (
            <a
              key={item.to}
              href={item.to}
              className={`text-sm font-medium transition-colors hover:text-emerald-600 ${
                scrolled ? "text-gray-600" : "text-white/80"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/school/login"
            className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${
              scrolled ? "text-gray-600 hover:bg-gray-100" : "text-white/80 hover:text-white"
            }`}
          >
            تسجيل الدخول
          </Link>
          <Link
            to="/school/register"
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md"
          >
            ابدأ مجاناً
          </Link>
        </div>

        {/* Mobile burger */}
        <button className="md:hidden p-2 rounded-lg" onClick={() => setMobileOpen(!mobileOpen)}>
          <div className={`w-5 h-0.5 mb-1 transition-colors ${scrolled ? "bg-gray-700" : "bg-white"}`} />
          <div className={`w-5 h-0.5 mb-1 transition-colors ${scrolled ? "bg-gray-700" : "bg-white"}`} />
          <div className={`w-5 h-0.5 transition-colors ${scrolled ? "bg-gray-700" : "bg-white"}`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3 shadow-lg">
          <a href="#features" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>الميزات</a>
          <a href="#how" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>كيف يعمل</a>
          <a href="#modules" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>الوحدات</a>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Link to="/school/login" className="flex-1 text-center border border-gray-200 text-sm font-medium text-gray-700 py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>تسجيل الدخول</Link>
            <Link to="/school/register" className="flex-1 text-center bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>ابدأ مجاناً</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: MonitorCheck,
    title: "مراقب اليوم",
    desc: "لوحة تحكم لحظية تعرض حضور المعلمين، حالة الحصص، والتأخر — كل شيء في شاشة واحدة.",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    border: "border-blue-100",
  },
  {
    icon: CalendarDays,
    title: "الجداول الأسبوعية",
    desc: "بناء جداول دراسية مرنة للفصول الصيفية والشتوية مع تعيين المعلمين والمواد لكل حصة.",
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
    border: "border-emerald-100",
  },
  {
    icon: UserCheck,
    title: "رصد تأخر المعلمين",
    desc: "تسجيل دقائق التأخر لكل معلم مع توقيت الوصول ومتابعة الأداء عبر الزمن.",
    color: "bg-amber-50",
    iconColor: "text-amber-600",
    border: "border-amber-100",
  },
  {
    icon: AlertCircle,
    title: "الحالات والمتابعة",
    desc: "إدارة حالات الطلاب السلوكية والأكاديمية مع خطوات متابعة تفصيلية وتاريخ كامل.",
    color: "bg-rose-50",
    iconColor: "text-rose-600",
    border: "border-rose-100",
  },
  {
    icon: Users,
    title: "الطلاب والفصول",
    desc: "قاعدة بيانات شاملة للطلاب مع ربطهم بالفصول الدراسية وإدارة الظرفية.",
    color: "bg-violet-50",
    iconColor: "text-violet-600",
    border: "border-violet-100",
  },
  {
    icon: FileSpreadsheet,
    title: "الاستيراد الذكي",
    desc: "استورد بيانات الطلاب والجداول من Excel/CSV مع معاينة وتحقق قبل الحفظ.",
    color: "bg-sky-50",
    iconColor: "text-sky-600",
    border: "border-sky-100",
  },
];

const MODULES = [
  { icon: MonitorCheck,  label: "مراقب اليوم",        desc: "لوحة الحصص اللحظية" },
  { icon: Users,         label: "الطلاب",              desc: "قاعدة بيانات الطلاب" },
  { icon: GraduationCap, label: "الفصول",              desc: "إدارة الفصول والمراحل" },
  { icon: CalendarCheck, label: "حصص اليوم",           desc: "الجدول اليومي الحالي" },
  { icon: AlertCircle,   label: "الحالات والمتابعة",   desc: "رصد وتتبع الحالات" },
  { icon: BookOpenCheck, label: "قوالب الجداول",       desc: "صيفي وشتوي" },
  { icon: ClipboardPen,  label: "الأسابيع والجداول",   desc: "بناء الجدول الأسبوعي" },
  { icon: Upload,        label: "الاستيراد",           desc: "Excel / CSV" },
];

const HOW_STEPS = [
  {
    step: "1",
    title: "أنشئ حسابك",
    desc: "سجّل منشأتك في دقيقة واحدة واختر نوع العمل \"مدرسة\".",
    color: "bg-emerald-600",
  },
  {
    step: "2",
    title: "استورد بياناتك",
    desc: "ارفع ملفات الطلاب والمعلمين والجداول من Excel أو أدخلها يدوياً.",
    color: "bg-blue-600",
  },
  {
    step: "3",
    title: "شغّل النظام",
    desc: "ابدأ بمراقبة الحصص اليومية، تسجيل التأخر، وإدارة الحالات فوراً.",
    color: "bg-violet-600",
  },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function SchoolLandingPage() {
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const s1 = useCounter(120, 1800, statsInView);
  const s2 = useCounter(18000, 2000, statsInView);
  const s3 = useCounter(40, 1600, statsInView);

  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans overflow-x-hidden">
      <SchoolHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-6 text-center py-32">
          {/* Logo mark */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <p className="text-white font-black text-2xl leading-none">ترميز OS</p>
              <p className="text-emerald-400 text-sm font-semibold">نظام إدارة المدارس</p>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            نظام تشغيل يومي
            <br />
            <span className="text-emerald-400">للمدرسة الحديثة</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-10">
            راقب الحصص والمعلمين، أدِر الطلاب والفصول، وتابع الحالات — كل شيء في منصة واحدة خفيفة وسريعة.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/school/register"
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 hover:-translate-y-0.5 flex items-center gap-2"
            >
              ابدأ مجاناً الآن
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link
              to="/school/login"
              className="border border-white/20 text-white px-8 py-4 rounded-2xl text-base font-semibold hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              تسجيل الدخول
            </Link>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            {["بدون تعقيد", "بيانات آمنة", "دعم فني مستمر", "لا تكامل حكومي مطلوب"].map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                {b}
              </span>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-white/30" />
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 py-16">
        <div ref={statsRef} className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-4xl font-black text-gray-900">{s1}+</p>
            <p className="text-sm text-gray-500 mt-1 font-medium">مدرسة تثق بترميز OS</p>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-900">{s2.toLocaleString("en-US")}+</p>
            <p className="text-sm text-gray-500 mt-1 font-medium">طالب مُدار</p>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-900">{s3}+</p>
            <p className="text-sm text-gray-500 mt-1 font-medium">وحدة تشغيلية</p>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 mb-4">
              الميزات الرئيسية
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              كل ما تحتاجه لإدارة
              <span className="text-emerald-600"> يوم دراسي متكامل</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              ترميز OS للمدارس ليس نظاماً حكومياً — هو نظام تشغيل يومي خفيف يخدم الوكيل والإدارة.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`bg-white rounded-2xl border ${f.border} p-6 hover:shadow-md transition-all hover:-translate-y-1`}
              >
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">ابدأ في 3 خطوات</h2>
            <p className="text-gray-500 text-lg">لا تدريب طويل، لا إعداد معقد.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {HOW_STEPS.map((step, i) => (
              <div key={step.step} className="text-center relative">
                {i < HOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-0 w-full h-px bg-gray-200 -z-0" style={{ left: "60%" }} />
                )}
                <div className={`relative z-10 w-12 h-12 rounded-2xl ${step.color} text-white text-xl font-black flex items-center justify-center mx-auto mb-5 shadow-md`}>
                  {step.step}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules Grid ─────────────────────────────────────────────────── */}
      <section id="modules" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">8 وحدات متكاملة</h2>
            <p className="text-gray-500">كل شيء تحتاجه ضمن نظام موحد</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MODULES.map((m) => (
              <div
                key={m.label}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 hover:shadow-sm transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-100 transition-colors">
                  <m.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-gray-900">{m.label}</p>
                <p className="text-xs text-gray-400 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Login CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-900/50">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            جاهز للبدء؟
          </h2>
          <p className="text-gray-300 text-lg mb-3 leading-relaxed">
            سجّل مدرستك اليوم وابدأ بإدارة يومك الدراسي بشكل أذكى.
          </p>
          <p className="text-gray-500 text-sm mb-10">
            منظومة متكاملة — مؤسسية، ذكية، نموذجية.
          </p>

          {/* Login card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-sm mx-auto mb-8">
            <p className="text-white font-bold text-base mb-5">بوابة دخول المدارس</p>
            <div className="space-y-3">
              <Link
                to="/school/login"
                className="block w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors text-center"
              >
                تسجيل الدخول للحساب الحالي
              </Link>
              <Link
                to="/school/register"
                className="block w-full border border-white/30 text-white py-3 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors text-center"
              >
                إنشاء حساب مدرسة جديد
              </Link>
            </div>
            <p className="text-gray-400 text-xs mt-4 text-center">
              لا يتطلب ربط بأنظمة حكومية
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-500" /> بيانات آمنة ومعزولة</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-500" /> استيراد بيانات فوري</span>
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-emerald-500" /> دعم فني مستمر</span>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 py-10 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm">ترميز OS للمدارس</span>
          </div>
          <p className="text-gray-500 text-xs">جزء من منصة ترميز OS — نظام إدارة الأعمال المتكامل</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">الصفحة الرئيسية</Link>
            <Link to="/school/login" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">تسجيل الدخول</Link>
            <Link to="/contact" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">التواصل</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
