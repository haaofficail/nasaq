import { Link } from "react-router-dom";
import { PublicLayout } from "../components/public/PublicLayout";

const team = [
  { name: "عبدالله المطيري", role: "المؤسس والرئيس التنفيذي", initials: "ع" },
  { name: "نورة العتيبي", role: "مديرة المنتج", initials: "ن" },
  { name: "خالد الشمري", role: "مهندس البرمجيات", initials: "خ" },
  { name: "ريم الحربي", role: "مديرة تجربة المستخدم", initials: "ر" },
];

const stats = [
  { val: "500+", label: "شركة تستخدم نسق" },
  { val: "50,000+", label: "حجز شهرياً" },
  { val: "15 مليون", label: "ريال معالجة شهرياً" },
  { val: "99.9%", label: "وقت التشغيل" },
];

export function AboutPage() {
  return (
    <PublicLayout>
      <div className="pt-24">
        {/* Hero */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-black text-gray-900 mb-6">قصتنا</h1>
            <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
              بدأت فكرة نسق من تجربة شخصية — رأينا كيف يُضيع أصحاب الفعاليات ساعات طويلة في إدارة الحجوزات
              يدوياً، ومتابعة المدفوعات في دفاتر ورقية، وتنسيق الفريق عبر رسائل واتساب متفرقة.
              قررنا أن يكون هناك حل أفضل.
            </p>
          </div>
        </section>

        {/* Vision */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-6">رؤيتنا</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  نؤمن بأن كل شركة فعاليات — سواء كانت قاعة أفراح صغيرة أو شركة تنظيم فعاليات كبرى —
                  تستحق الأدوات الاحترافية التي كانت حكراً على الشركات الكبيرة.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  هدفنا أن نمكّن كل مزود خدمة في المملكة العربية السعودية من تشغيل عمله بكفاءة،
                  وتوفير تجربة استثنائية لعملائه، وبناء عمل ناجح ومستدام.
                </p>
              </div>
              <div className="bg-[#1A56DB] rounded-2xl p-8 text-white">
                <div className="text-5xl mb-6">🎯</div>
                <h3 className="text-2xl font-black mb-3">مهمتنا</h3>
                <p className="text-blue-100 leading-relaxed">
                  تبسيط إدارة الفعاليات من خلال تقنية ذكية وسهلة الاستخدام،
                  مما يتيح لأصحاب الأعمال التركيز على ما يحبون — إبداع التجارب الاستثنائية.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-4xl font-black text-[#1A56DB] mb-2">{s.val}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-black text-gray-900 text-center mb-12">فريقنا</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {team.map((member) => (
                <div key={member.name} className="bg-white rounded-2xl p-6 text-center border border-gray-100">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-[#1A56DB] font-black text-2xl flex items-center justify-center mx-auto mb-4">
                    {member.initials}
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl font-black text-gray-900 text-center mb-12">قيمنا</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: "🤝", title: "الثقة", desc: "نحرص على بناء علاقات شفافة وموثوقة مع عملائنا" },
                { icon: "🚀", title: "الابتكار", desc: "نسعى دائماً لتطوير حلول جديدة تلبي احتياجات السوق" },
                { icon: "❤️", title: "الاهتمام", desc: "نهتم بنجاح عملائنا كما نهتم بنجاح أنفسنا" },
              ].map((v) => (
                <div key={v.title} className="bg-gray-50 rounded-2xl p-6 text-center">
                  <div className="text-4xl mb-4">{v.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-500">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[#1A56DB] text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl font-black text-white mb-4">انضم إلى عائلة نسق</h2>
            <p className="text-blue-200 mb-8">نحن هنا لمساعدتك في بناء عمل ناجح</p>
            <Link to="/register" className="inline-block bg-white text-[#1A56DB] px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors">
              ابدأ مجاناً
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
