import { useState } from "react";
import {
  BookOpenCheck, ChevronDown, ChevronUp,
  LayoutDashboard, ClipboardCheck, Users, DoorOpen, GraduationCap,
  AlertCircle, ShieldAlert, CalendarCheck2, CalendarRange,
  MessageCircle, Upload, Settings, ClipboardList,
} from "lucide-react";

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  steps: string[];
  tips?: string[];
}

const SECTIONS: Section[] = [
  {
    id: "dashboard",
    title: "الرئيسية",
    icon: LayoutDashboard,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "نظرة عامة سريعة على حالة المدرسة: الإيرادات، الحجوزات، والإحصاءات اليومية.",
    steps: [
      "تُعرض لوحة المعلومات فور تسجيل الدخول.",
      "تضم إحصائيات سريعة: عدد الطلاب، المعلمين، الفصول، والحالات المفتوحة.",
    ],
  },
  {
    id: "day-monitor",
    title: "مراقب اليوم المدرسي",
    icon: ClipboardCheck,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    description: "متابعة ما يجري في المدرسة يوماً بيوم: الفصل الدراسي النشط، التأخرات، وروابط سريعة للإجراءات الأساسية.",
    steps: [
      "يظهر الفصل الدراسي النشط وتاريخ اليوم في رأس الصفحة.",
      "إحصاءات فورية: المعلمون، الفصول، الطلاب، الحالات المفتوحة، تأخرات اليوم.",
      "دليل الإعداد يظهر تلقائياً إذا لم تكتمل خطوة (إضافة معلمين أو تفعيل فصل دراسي).",
      "الإجراءات السريعة: إضافة معلم، فتح التقويم، تسجيل مخالفة، استيراد بيانات.",
    ],
    tips: ["أكمل خطوات الإعداد لتختفي رسالة التنبيه الصفراء."],
  },
  {
    id: "teachers",
    title: "المعلمون",
    icon: Users,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    description: "إدارة كامل لبيانات المعلمين وإسناد حصص الانتظار لكل معلم.",
    steps: [
      "أضف معلماً جديداً بالضغط على «إضافة معلم».",
      "لكل معلم: الاسم، رقم الموظف، التخصص، الجوال، البريد، رقم الهوية.",
      "لإسناد حصة انتظار: اضغط على أيقونة الربط بجانب المعلم ← اختر نوع الارتباط (فصل / صف / مرحلة) ← حدد المادة.",
      "يمكن إسناد أكثر من مادة وأكثر من فصل لنفس المعلم.",
      "عند الإسناد، يُرسل إشعار واتساب للمعلم تلقائياً (إذا كانت الإشعارات مفعّلة).",
    ],
    tips: [
      "استخدم «صف كامل» لتوفير الوقت عند إسناد مادة لجميع فصول صف واحد.",
      "تأكد من إدخال رقم الجوال بشكل صحيح (05xxxxxxxx) لضمان وصول الإشعار.",
    ],
  },
  {
    id: "students",
    title: "الطلاب",
    icon: GraduationCap,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    description: "سجل كامل لبيانات الطلاب مع ربطهم بالفصول وبيانات أولياء الأمور.",
    steps: [
      "أضف طالباً يدوياً أو استخدم الاستيراد من Excel.",
      "لكل طالب: الاسم، الرقم، رقم الهوية، الفصل، جوال ولي الأمر.",
      "يمكن نقل الطالب بين الفصول من خلال أيقونة التعديل.",
    ],
    tips: ["استخدم صفحة الاستيراد لرفع بيانات طلاب كثيرين دفعة واحدة."],
  },
  {
    id: "classes",
    title: "الفصول الدراسية",
    icon: DoorOpen,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    description: "إنشاء وإدارة الفصول الدراسية وربطها بالطلاب والمعلمين.",
    steps: [
      "أضف فصلاً جديداً بتحديد الصف (الأول، الثاني...) والاسم (أ، ب...).",
      "عدد الطلاب يُحسب تلقائياً من سجلات الطلاب المرتبطة.",
    ],
  },
  {
    id: "attendance",
    title: "حضور المعلمين وحصص الانتظار",
    icon: CalendarCheck2,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    description: "تسجيل حضور المعلمين يومياً وإسناد حصص الانتظار عند الغياب.",
    steps: [
      "حدد تاريخ الدوام (يمكن الانتقال لأيام سابقة).",
      "لكل معلم: اختر الحالة (حاضر / غائب / متأخر / مستأذن).",
      "عند تحديد «غائب» أو «مستأذن»، يظهر زر «+ انتظار» لإسناد معلم بديل.",
      "في قسم «حصص الانتظار» يمكن إضافة تكليف يدوياً من الزر الأخضر.",
      "المعلم المكلّف يتلقى إشعار واتساب فور التكليف.",
      "اضغط «حفظ وإرسال» لحفظ جميع التغييرات وإرسال إشعارات الغياب.",
    ],
    tips: [
      "يمكن إضافة حصة انتظار بدون ربطها بمعلم غائب محدد (تكليف مباشر).",
      "حصص الانتظار تُحفظ بتاريخ محدد ويمكن استعراضها لاحقاً.",
    ],
  },
  {
    id: "academic-calendar",
    title: "التقويم الدراسي",
    icon: CalendarRange,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    description: "إدارة الفصول الدراسية والأحداث: إجازات، مناسبات وطنية، اختبارات، أنشطة.",
    steps: [
      "أضف فصلاً دراسياً (الأول أو الثاني) مع تحديد التاريخ والعام الدراسي.",
      "فعّل الفصل الحالي بالضغط على «تفعيل» — يُلغى تفعيل الفصل السابق تلقائياً.",
      "الجدول الأسبوعي يُبنى تلقائياً من تاريخ بداية ونهاية الفصل.",
      "في تبويب «الأحداث» أضف حدثاً جديداً مع تحديد النوع والتاريخ والفصل.",
      "الأحداث تظهر بألوان مميزة على الجدول الأسبوعي.",
    ],
    tips: [
      "اللون الأحمر = إجازة، الأخضر = مناسبة وطنية، البنفسجي = اختبار، العنبري = نشاط.",
      "يمكن تفعيل حدث «يؤثر على الحضور» لاستثناء أيامه من إحصاءات الغياب.",
    ],
  },
  {
    id: "cases",
    title: "الحالات والمتابعة",
    icon: AlertCircle,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    description: "تتبع الحالات التربوية والأكاديمية التي تتطلب متابعة مستمرة.",
    steps: [
      "أنشئ حالة جديدة مع تحديد الطالب، نوع الحالة، والأولوية.",
      "أضف خطوات متابعة لكل حالة مع تواريخ ومسؤولين.",
      "غيّر حالة الملف (مفتوح / قيد المعالجة / محلول / مغلق).",
    ],
  },
  {
    id: "violations",
    title: "المخالفات السلوكية",
    icon: ShieldAlert,
    color: "bg-red-50 text-red-700 border-red-200",
    description: "تسجيل المخالفات وحساب درجات السلوك وفق نظام النقاط.",
    steps: [
      "سجّل مخالفة جديدة وحدد الطالب، الفئة، الدرجة.",
      "درجات السلوك تُحسب تلقائياً وتنعكس على سجل الطالب.",
      "يُرسل إشعار لولي الأمر عند كل مخالفة (إذا كانت الإشعارات مفعّلة).",
      "يمكن إضافة تعويضات سلوكية لرفع الدرجة.",
    ],
    tips: ["أنشئ فئات مخالفات مخصصة من «فئات المخالفات» قبل البدء."],
  },
  {
    id: "notifications",
    title: "إعدادات الإشعارات",
    icon: MessageCircle,
    color: "bg-teal-50 text-teal-700 border-teal-200",
    description: "ضبط قوالب رسائل واتساب وتحديد الأحداث التي تُطلق الإشعارات.",
    steps: [
      "فعّل أو أوقف كل نوع إشعار (غياب طالب، تأخر، مخالفة، إسناد معلم...).",
      "خصّص قالب الرسالة لكل نوع — استخدم المتغيرات المتاحة بين قوسين {}.",
      "اضغط «حفظ القوالب» لحفظ التغييرات.",
      "لعرض سجل الرسائل المُرسلة، راجع قسم «سجل الإشعارات».",
    ],
    tips: [
      "المتغير {student_name} يُستبدل تلقائياً باسم الطالب عند الإرسال.",
      "تأكد من اتصال واتساب قبل تفعيل الإشعارات من صفحة «الإعدادات».",
    ],
  },
  {
    id: "import",
    title: "استيراد البيانات",
    icon: Upload,
    color: "bg-gray-50 text-gray-700 border-gray-200",
    description: "رفع بيانات الطلاب والمعلمين من ملفات Excel بشكل جماعي.",
    steps: [
      "حمّل قالب Excel الخاص بنوع البيانات (طلاب / معلمون).",
      "أدخل البيانات في القالب مع الالتزام بتنسيق الأعمدة.",
      "ارفع الملف وانتظر نتيجة المعالجة.",
      "يمكن مراجعة سجل الاستيرادات السابقة من نفس الصفحة.",
    ],
    tips: ["لا تُعدّل أسماء الأعمدة في قالب Excel لتجنب أخطاء الاستيراد."],
  },
  {
    id: "account",
    title: "الإعدادات",
    icon: Settings,
    color: "bg-slate-50 text-slate-700 border-slate-200",
    description: "بيانات المدرسة، توقيت الدوام، كلمة المرور، وإدارة جلسات الدخول.",
    steps: [
      "حدّث بيانات المدرسة (الاسم، المنطقة، النوع، المرحلة التعليمية).",
      "في قسم «توقيت الدوام» حدد بداية ونهاية الدوام حسب منطقتك.",
      "اختر نوع الجدول: شتاء / صيف / رمضان — لكل منها توقيت ومدة حصص مختلفة.",
      "يمكن تغيير كلمة المرور وإنهاء الجلسات النشطة.",
    ],
    tips: [
      "اختر «تطبيق» بجانب التوقيت المقترح لمنطقتك لملء الحقول تلقائياً.",
      "عند تحديد «جدول رمضان»، تُضبط التوقيت تلقائياً على 10:00 - 14:00 بحصص 30 دقيقة.",
    ],
  },
  {
    id: "standby",
    title: "نظام حصص الانتظار",
    icon: ClipboardList,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    description: "تكليف معلم بديل عند غياب المعلم الأصلي — مرن ويدعم تعدد المواد.",
    steps: [
      "من صفحة «حضور المعلمين»، سجّل المعلم غائباً.",
      "سيظهر زر «+ انتظار» في صف المعلم الغائب.",
      "اختر المعلم المكلّف، المادة، والفصل (اختياري).",
      "حدد الحصة ووقتها إذا كنت تريد التفاصيل في الإشعار.",
      "اضغط «تكليف وإشعار» لإرسال رسالة واتساب للمعلم المكلّف فوراً.",
      "يمكن إضافة تكليف يدوي مباشرة من زر «إضافة يدوي» بدون ربطه بغياب.",
    ],
    tips: [
      "التكاليف مرتبطة بتاريخ محدد ويمكن مراجعتها لأيام سابقة.",
      "يمكن حذف التكليف بالضغط على أيقونة الحذف في قائمة حصص الانتظار.",
    ],
  },
];

function GuideSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${section.color.replace("bg-", "border-").split(" ")[0].replace("border-", "border-")}`}
      style={{ borderColor: undefined }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors text-right"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${section.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">{section.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{section.description}</p>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4 bg-white">
          <p className="text-sm text-gray-600">{section.description}</p>

          <div>
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">خطوات الاستخدام</p>
            <ol className="space-y-2">
              {section.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white mt-0.5 ${section.color.split(" ")[0]}`}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {section.tips && section.tips.length > 0 && (
            <div className={`rounded-xl p-3.5 ${section.color.split(" ")[0]} border ${section.color.split(" ")[2]}`}>
              <p className="text-xs font-bold mb-1.5">نصائح مهمة</p>
              <ul className="space-y-1">
                {section.tips.map((tip, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span className="mt-1">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SchoolGuidePage() {
  return (
    <div dir="rtl" className="p-6 max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0">
          <BookOpenCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">دليل المستخدم</h1>
          <p className="text-sm text-gray-500 mt-0.5">شرح كامل لجميع صفحات وميزات نظام ترميز OS المدرسي</p>
        </div>
      </div>

      {/* Quick tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
        <span className="font-bold">ابدأ من هنا:</span> أضف المعلمين ← أضف الفصول ← أضف الطلاب ← فعّل الفصل الدراسي ← ابدأ تسجيل الحضور.
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map(section => (
          <GuideSection key={section.id} section={section} />
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center pt-2">ترميز OS — منصة الإدارة المدرسية الذكية</p>
    </div>
  );
}
