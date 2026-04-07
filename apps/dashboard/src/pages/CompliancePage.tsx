import { PublicLayout } from "../components/public/PublicLayout";
import { NasaqThemeGuard } from "../context/NasaqThemeGuard";

const FRAMEWORKS = [
  {
    id: "pdpl",
    badge: "PDPL",
    badgeColor: "#5b9bd5",
    badgeBg: "#EBF3FB",
    title: "نظام حماية البيانات الشخصية",
    ref: "المرسوم الملكي م/19 — هيئة البيانات والذكاء الاصطناعي (SDAIA)",
    items: [
      "تحديد الغرض من جمع البيانات وإفصاح المستخدمين",
      "الأساس القانوني لكل عملية معالجة (موافقة / عقد / مصلحة مشروعة)",
      "حقوق صاحب البيانات: اطلاع · تصحيح · حذف · اعتراض · تنقّل",
      "سحب الموافقة في أي وقت دون أثر رجعي",
      "إخطار NDMO بحوادث الاختراق خلال 72 ساعة",
      "قيود نقل البيانات خارج المملكة — المادة 29",
      "مسؤول حماية البيانات (DPO) لكل منشأة",
      "سجل معالجة البيانات وفترات الاحتفاظ المحددة",
    ],
  },
  {
    id: "ecommerce",
    badge: "التجارة الإلكترونية",
    badgeColor: "#16a34a",
    badgeBg: "#f0fdf4",
    title: "نظام التجارة الإلكترونية",
    ref: "المرسوم الملكي م/69 بتاريخ 1441هـ — وزارة التجارة",
    items: [
      "الإفصاح الكامل عن هوية مزوّد الخدمة (م/7): اسم الشركة، رقم السجل التجاري، العنوان، بيانات التواصل",
      "عرض الأسعار شاملة ضريبة القيمة المضافة 15%",
      "سياسة إلغاء واسترداد واضحة قبل إتمام العقد",
      "تأكيد الطلب وإشعار العميل فور إبرام العقد الإلكتروني",
      "الاحتفاظ بسجلات المعاملات الإلكترونية",
      "توفير وسيلة تواصل فعّالة للشكاوى والاستفسارات",
    ],
  },
  {
    id: "zatca",
    badge: "ZATCA",
    badgeColor: "#d97706",
    badgeBg: "#fffbeb",
    title: "الفاتورة الإلكترونية",
    ref: "هيئة الزكاة والضريبة والجمارك — المرحلة الأولى",
    items: [
      "إصدار فاتورة إلكترونية لكل معاملة مالية",
      "رقم تسلسلي فريد لكل فاتورة",
      "تاريخ الإصدار · المشتري · البائع · الرقم الضريبي",
      "مبلغ ضريبة القيمة المضافة 15% منفصل في الفاتورة",
      "الاحتفاظ بسجلات الفواتير 5 سنوات (متطلبات ZATCA)",
      "جاهزية المرحلة الثانية: توليد XML وإرسال لـ ZATCA API",
    ],
  },
  {
    id: "cybercrime",
    badge: "الجرائم المعلوماتية",
    badgeColor: "#7c3aed",
    badgeBg: "#f5f3ff",
    title: "نظام مكافحة الجرائم المعلوماتية",
    ref: "المرسوم الملكي م/17 بتاريخ 1428هـ",
    items: [
      "منع الوصول غير المصرح به لأنظمة وبيانات المنشآت",
      "تشفير SSL/TLS لجميع الاتصالات",
      "سجلات دخول وأحداث أمنية محفوظة وقابلة للمراجعة",
      "عزل قواعد البيانات لكل منشأة (multi-tenant isolation)",
      "نظام صلاحيات RBAC يمنع تجاوز الحدود المحددة",
      "مراقبة أمنية مستمرة 24/7",
    ],
  },
];

const SECURITY_MEASURES = [
  { title: "تشفير البيانات", body: "SSL/TLS لجميع الاتصالات · AES-256 للتخزين" },
  { title: "عزل البيانات", body: "قاعدة بيانات معزولة لكل منشأة — multi-tenant isolation" },
  { title: "النسخ الاحتياطي", body: "نسخ يومية مشفّرة محفوظة 30 يوماً" },
  { title: "الصلاحيات", body: "RBAC — نظام أدوار وصلاحيات دقيق" },
  { title: "موقع الاستضافة", body: "خوادم في منطقة الشرق الأوسط / الخليج" },
  { title: "المراقبة الأمنية", body: "مراقبة مستمرة ٢٤/٧ — استجابة فورية للحوادث" },
];

const DATA_RETENTION = [
  { type: "بيانات الحساب والاستخدام", period: "طوال فترة الاشتراك + 30 يوماً بعد الإلغاء", ref: "PDPL م/18" },
  { type: "السجلات المالية والفواتير", period: "5 سنوات من تاريخ المعاملة", ref: "ZATCA" },
  { type: "سجلات الدخول والأحداث الأمنية", period: "3 سنوات", ref: "نظام الجرائم المعلوماتية" },
  { type: "بيانات العملاء التشغيلية", period: "طوال الاشتراك · حذف نهائي بعد 30 يوماً من الإلغاء", ref: "PDPL م/18" },
  { type: "النسخ الاحتياطية", period: "30 يوماً متداولة", ref: "عقد مستوى الخدمة" },
];

export function CompliancePage() {
  return (
    <NasaqThemeGuard>
      <PublicLayout>
        <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>
          <style>{`
            @media (max-width: 767px) {
              .legal-hero { padding: 48px 16px 36px !important; }
              .legal-section { padding: 40px 16px !important; }
              .legal-card { padding: 20px 16px !important; }
              .legal-fw-card { padding: 20px 16px !important; }
            }
            @media (min-width: 768px) and (max-width: 1023px) {
              .legal-hero { padding: 64px 20px 52px !important; }
              .legal-section { padding: 52px 20px !important; }
            }
          `}</style>

          {/* Hero */}
          <section className="legal-hero" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #EBF3FB 100%)", padding: "96px 24px 72px", textAlign: "center" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#EBF3FB", color: "#5b9bd5",
                padding: "6px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                marginBottom: 24, border: "1px solid rgba(91,155,213,0.2)",
              }}>
                الامتثال القانوني
              </div>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "#0f172a", marginBottom: 18, lineHeight: 1.2 }}>
                ملتزمون بالأنظمة السعودية
              </h1>
              <p style={{ fontSize: 17, color: "#64748b", lineHeight: 1.8, maxWidth: 580, margin: "0 auto" }}>
                ترميز OS مبنية من الأساس لتحقيق الامتثال الكامل مع متطلبات هيئة البيانات والذكاء الاصطناعي وهيئة الزكاة والضريبة ووزارة التجارة
              </p>
              <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 16 }}>
                آخر مراجعة: أبريل ٢٠٢٥
              </p>
            </div>
          </section>

          {/* Compliance Summary Badges */}
          <section className="legal-section" style={{ background: "#ffffff", padding: "48px 24px 0" }}>
            <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              {FRAMEWORKS.map((f) => (
                <a key={f.id} href={`#${f.id}`} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: f.badgeBg, border: `1px solid ${f.badgeColor}30`,
                  borderRadius: 12, padding: "10px 18px",
                  textDecoration: "none", transition: "box-shadow 0.2s",
                }}>
                  <span style={{
                    background: f.badgeColor, color: "#fff",
                    borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                  }}>{f.badge}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{f.title}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Framework Sections */}
          <section className="legal-section" style={{ padding: "64px 24px", background: "#ffffff" }}>
            <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40 }}>

              {FRAMEWORKS.map((f) => (
                <div key={f.id} id={f.id} className="legal-fw-card" style={{
                  background: "#f8fafc", borderRadius: 20, padding: "32px",
                  border: "1px solid #e2e8f0",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
                    <span style={{
                      background: f.badgeColor, color: "#fff",
                      borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                    }}>{f.badge}</span>
                    <div>
                      <h2 style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{f.title}</h2>
                      <p style={{ fontSize: 12, color: "#94a3b8" }}>{f.ref}</p>
                    </div>
                  </div>
                  <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {f.items.map((item, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, listStyle: "none" }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 6, background: f.badgeBg,
                          border: `1px solid ${f.badgeColor}40`,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, color: f.badgeColor, fontWeight: 700, flexShrink: 0, marginTop: 2,
                        }}>✓</span>
                        <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Security Measures */}
          <section className="legal-section" style={{ padding: "64px 24px", background: "#f8fafc" }}>
            <div style={{ maxWidth: 860, margin: "0 auto" }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8, textAlign: "center" }}>
                التدابير الأمنية المطبّقة
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 36 }}>
                بنية تحتية مصممة لحماية بيانات كل منشأة على حدة
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {SECURITY_MEASURES.map((m) => (
                  <div key={m.title} style={{
                    background: "#ffffff", borderRadius: 14, padding: "20px",
                    border: "1px solid #e2e8f0",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{m.title}</div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>{m.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Data Retention Table */}
          <section className="legal-section" style={{ padding: "64px 24px", background: "#ffffff" }}>
            <div style={{ maxWidth: 860, margin: "0 auto" }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8, textAlign: "center" }}>
                جدول الاحتفاظ بالبيانات
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 36 }}>
                فترات الاحتفاظ وفق المتطلبات القانونية السعودية
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      {["نوع البيانات", "فترة الاحتفاظ", "المستند القانوني"].map((h) => (
                        <th key={h} style={{
                          padding: "12px 16px", textAlign: "right", fontWeight: 700,
                          color: "#374151", borderBottom: "1px solid #e2e8f0",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_RETENTION.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                        <td style={{ padding: "12px 16px", color: "#374151", borderBottom: "1px solid #e2e8f0" }}>{row.type}</td>
                        <td style={{ padding: "12px 16px", color: "#374151", borderBottom: "1px solid #e2e8f0" }}>{row.period}</td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                          <span style={{
                            background: "#EBF3FB", color: "#5b9bd5",
                            padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          }}>{row.ref}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Contact DPO */}
          <section className="legal-section" style={{ padding: "64px 24px", background: "#f8fafc" }}>
            <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
                مسؤول حماية البيانات
              </h2>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28, lineHeight: 1.8 }}>
                لأي استفسار متعلق بالخصوصية أو الامتثال القانوني أو ممارسة حقوق البيانات
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <a href="mailto:privacy@nasaqpro.tech" style={{
                  background: "#5b9bd5", color: "#ffffff",
                  padding: "10px 28px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                  textDecoration: "none",
                }}>
                  privacy@nasaqpro.tech
                </a>
                <p style={{ fontSize: 12, color: "#94a3b8" }}>
                  للشكاوى: يمكنك التواصل مع هيئة البيانات والذكاء الاصطناعي
                  {" "}<a href="https://sdaia.gov.sa" target="_blank" rel="noopener noreferrer" style={{ color: "#5b9bd5" }}>sdaia.gov.sa</a>
                </p>
              </div>
            </div>
          </section>

        </div>
      </PublicLayout>
    </NasaqThemeGuard>
  );
}
