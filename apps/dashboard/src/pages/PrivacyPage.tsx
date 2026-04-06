import { useState } from "react";
import { PublicLayout } from "../components/public/PublicLayout";
import { NasaqThemeGuard } from "../context/NasaqThemeGuard";
import { Loader2 } from "lucide-react";

// ============================================================
// سياسة الخصوصية — متوافقة مع:
// - نظام حماية البيانات الشخصية (PDPL) م/19 — هيئة SDAIA
// - لائحة نظام حماية البيانات التنفيذية
// - ZATCA — الاحتفاظ بالسجلات المالية
// ============================================================

const SECTIONS = [
  {
    title: "١. هوية المتحكم في البيانات",
    body: `وفق نظام حماية البيانات الشخصية (PDPL) المادة 17، يُفصح المتحكم في البيانات عن هويته:\n\n• الجهة المتحكمة: ترميز OS\n• البريد الإلكتروني: info@nasaqpro.tech\n• مسؤول حماية البيانات (DPO): privacy@nasaqpro.tech\n• الهاتف: 0522064321\n• الجهة الرقابية: هيئة البيانات والذكاء الاصطناعي (SDAIA) — sdaia.gov.sa\n\nهذه السياسة تُوضح كيفية جمع بياناتك الشخصية ومعالجتها وحمايتها وفق أعلى المعايير القانونية السعودية.`,
  },
  {
    title: "٢. البيانات التي نجمعها",
    body: `نجمع البيانات التالية فقط لأغراض محددة ومشروعة:\n\nبيانات إلزامية:\n• بيانات المنشأة: الاسم، النوع التجاري، رقم السجل التجاري، الرقم الضريبي\n• بيانات الاتصال: البريد الإلكتروني، رقم الهاتف\n• بيانات المصادقة: اسم المستخدم وكلمة المرور المشفّرة\n\nبيانات تشغيلية:\n• الصفحات المُزارة، الميزات المُستخدمة، أوقات الدخول\n• سجلات المعاملات والفواتير\n\nبيانات الدفع:\n• لا نُخزّن بيانات البطاقات مباشرةً — تُعالَج بالكامل عبر بوابات دفع مرخّصة`,
  },
  {
    title: "٣. الأساس القانوني للمعالجة",
    body: `وفق نظام حماية البيانات الشخصية (PDPL) المادة 8، تُعالَج بياناتك بناءً على أحد الأسس القانونية التالية:\n\nالموافقة الصريحة (م/8-أ):\n• تحليل الاستخدام لتطوير الميزات — يمكنك سحب الموافقة في أي وقت\n• إرسال العروض والتحديثات التسويقية\n\nتنفيذ العقد (م/8-ب):\n• تشغيل خدمات المنصة التي اشتركت فيها\n• إصدار الفواتير ومعالجة المدفوعات\n• تقديم الدعم الفني\n\nالالتزام القانوني (م/8-ج):\n• الامتثال لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA)\n• الاستجابة للطلبات الحكومية والأوامر القضائية\n\nالمصلحة المشروعة (م/8-د):\n• الأمن وحماية النظام من الاختراق والإساءة\n• منع الاحتيال وحماية مصالح المنشآت الأخرى`,
  },
  {
    title: "٤. البيانات الحساسة",
    body: `وفق PDPL المادة 5، تشمل البيانات الحساسة: البيانات البيومترية، المعلومات الصحية، المعتقدات الدينية، البيانات الجنائية.\n\nموقفنا:\n• لا تجمع المنصة بيانات حساسة عن المستخدمين أو عملائهم بصورة مقصودة\n• إذا أدخلت بيانات حساسة في حقول النصوص الحرة، فأنت تتحمل مسؤولية ذلك\n• في حال اكتشاف بيانات حساسة تُعالَج دون أساس قانوني واضح، نُبادر فوراً بحذفها وإخطارك`,
  },
  {
    title: "٥. كيف نستخدم بياناتك",
    body: `نستخدم البيانات فقط للأغراض التي جُمعت من أجلها:\n\n• تشغيل وتحسين خدمات المنصة\n• إرسال الإشعارات التشغيلية والفواتير الإلكترونية\n• تقديم الدعم الفني والتواصل معك\n• تحليل الاستخدام لتطوير ميزات جديدة (بموافقتك)\n• الامتثال للمتطلبات القانونية والنظامية\n\nلا نستخدم بياناتك في الإعلانات الموجّهة. لا نبيع بياناتك لأي طرف ثالث بأي شكل.`,
  },
  {
    title: "٦. مشاركة البيانات ونقلها خارج المملكة",
    body: `مشاركة البيانات مع أطراف ثالثة:\n• مزوّدو الخدمة التقنية: استضافة سحابية وبوابات دفع ملتزمون بمعايير PDPL وعقود معالجة بيانات رسمية\n• المتطلبات القانونية: عند وجود أمر قضائي أو طلب رسمي من الجهات الحكومية المختصة\n• نقل الأعمال: في حال الاندماج أو الاستحواذ مع إشعارك المسبق بـ 30 يوماً\n\nنقل البيانات خارج المملكة (PDPL المادة 29):\nلا ننقل بياناتك الشخصية خارج المملكة العربية السعودية إلا في الحالات التالية:\n• عند توافر مستوى حماية كافٍ في الدولة المستقبلة وفق تقدير NDMO\n• مع ضمانات تعاقدية ملزمة تحمي حقوق صاحب البيانات\n• بموافقتك الصريحة والمحددة\n\nخوادم الاستضافة الرئيسية موجودة في منطقة الشرق الأوسط / الخليج.`,
  },
  {
    title: "٧. أمان البيانات والإخطار بالاختراق",
    body: `نطبّق معايير أمان تقنية وتنظيمية عالية:\n\n• تشفير SSL/TLS لجميع الاتصالات\n• تشفير AES-256 للبيانات المخزّنة\n• قواعد بيانات معزولة لكل منشأة (multi-tenant isolation)\n• نسخ احتياطية يومية مشفّرة محفوظة 30 يوماً\n• مراقبة أمنية مستمرة ٢٤/٧\n• صلاحيات وصول محكمة بنظام الأدوار (RBAC)\n\nالإخطار بالاختراق (PDPL المادة 20):\n• في حال وقوع اختراق يُؤثر على بياناتك الشخصية، نُخطرك فوراً بمجرد اكتشافه\n• يُخطَر كل من: الهيئة الوطنية لإدارة البيانات (NDMO) خلال 72 ساعة من اكتشاف الحوادث الجسيمة، والمتضررون مباشرةً`,
  },
  {
    title: "٨. ملفات تعريف الارتباط (Cookies)",
    body: `نستخدم ملفات تعريف الارتباط للأغراض التالية:\n\nضرورية (لا يمكن تعطيلها):\n• الجلسات: للحفاظ على حالة تسجيل الدخول\n• الأمان: منع هجمات CSRF والجلسات المزيّفة\n\nاختيارية (بموافقتك):\n• التفضيلات: حفظ إعداداتك المفضّلة\n• التحليل: فهم كيفية استخدام المنصة (بيانات مجمّعة وغير شخصية)\n\nيمكنك تعطيل ملفات الارتباط الاختيارية من إعدادات متصفحك، لكن ذلك قد يؤثر على بعض وظائف المنصة.`,
  },
  {
    title: "٩. الاحتفاظ بالبيانات",
    body: `نحتفظ ببياناتك وفق الجداول الزمنية التالية:\n\n• بيانات الحساب والاستخدام: طوال فترة الاشتراك النشط + 30 يوماً بعد الإلغاء\n• السجلات المالية والفواتير: 5 سنوات من تاريخ المعاملة (متطلبات ZATCA)\n• سجلات الدخول والأحداث الأمنية: 3 سنوات\n• النسخ الاحتياطية: 30 يوماً متداولة\n\nعند إلغاء الاشتراك:\n• لديك 30 يوماً لتصدير جميع بياناتك\n• بعد 30 يوماً تُحذف البيانات التشغيلية نهائياً وبشكل لا رجعة فيه`,
  },
  {
    title: "١٠. حقوقك بموجب PDPL",
    body: `وفق نظام حماية البيانات الشخصية (PDPL) المواد 11-16، لديك الحقوق التالية:\n\n• حق الاطلاع (م/11): طلب نسخة كاملة من بياناتك المعالَجة خلال 30 يوماً\n• حق التصحيح (م/12): تعديل أي بيانات غير دقيقة أو غير مكتملة\n• حق الحذف (م/13): طلب حذف بياناتك عند انتفاء الحاجة إليها أو عند سحب الموافقة\n• حق الاعتراض (م/14): الاعتراض على معالجة بياناتك لأغراض معينة\n• حق التقييد (م/15): طلب تقييد المعالجة في حالات محددة\n• حق التنقّل (م/16): تلقّي بياناتك بصيغة قابلة للقراءة الآلية\n\nلممارسة أي من هذه الحقوق: privacy@nasaqpro.tech\nمدة الاستجابة: لا تتجاوز 30 يوماً`,
  },
  {
    title: "١١. سحب الموافقة",
    body: `وفق PDPL المادة 10، يحق لك سحب موافقتك على أي معالجة مبنية على الموافقة في أي وقت.\n\nآلية السحب:\n• راسلنا على: privacy@nasaqpro.tech مع تحديد الغرض المطلوب إيقافه\n• أو من إعدادات الخصوصية داخل حسابك\n\nتأثير السحب:\n• لا يؤثر على مشروعية المعالجة السابقة قبل السحب\n• تتوقف المعالجة فوراً للأغراض المستقبلية\n• المعالجات المبنية على أساس قانوني آخر (كالعقد أو الالتزام القانوني) لا تتأثر بسحب الموافقة`,
  },
  {
    title: "١٢. خصوصية الأطفال",
    body: `المنصة موجّهة للمنشآت التجارية البالغة (18+ سنة) فقط. لا تُجمع بيانات من أشخاص دون سن 18 عاماً بصورة مقصودة.\n\nإذا اكتشفنا جمع بيانات قاصر بالخطأ عبر نماذج المنشأة أو غيرها، سنحذفها فوراً ونُخطر الطرف المعني.`,
  },
  {
    title: "١٣. التعديلات على سياسة الخصوصية",
    body: `نحتفظ بالحق في تعديل هذه السياسة. في حال إجراء تغييرات جوهرية، سنُخطرك عبر:\n\n• البريد الإلكتروني المسجّل — قبل 30 يوماً من سريان التغييرات\n• إشعار بارز داخل المنصة\n\nاستمرارك في استخدام المنصة بعد سريان التعديلات يُعدّ موافقةً ضمنية عليها. للاعتراض على التعديلات، يحق لك إلغاء اشتراكك واسترداد الجزء غير المستخدم.`,
  },
  {
    title: "١٤. التواصل والشكاوى",
    body: `للتواصل بشأن خصوصيتك أو ممارسة حقوقك:\n\nمسؤول حماية البيانات: privacy@nasaqpro.tech\nالبريد العام: info@nasaqpro.tech\nالهاتف: 0522064321\nنلتزم بالرد خلال 5 أيام عمل وإتمام الطلب خلال 30 يوماً.\n\nحق تقديم الشكوى للجهة الرقابية:\nإذا لم تكن راضياً عن معالجتنا لطلبك، يحق لك تقديم شكوى مباشرة إلى:\nالهيئة الوطنية لإدارة البيانات (NDMO) — هيئة البيانات والذكاء الاصطناعي\nsdaia.gov.sa`,
  },
];

function PrivacyRequestButtons() {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [type, setType] = useState<"export" | "delete" | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error" | "duplicate">("idle");

  async function submit(reqType: "export" | "delete") {
    if (!form.name || !form.phone) return;
    setType(reqType);
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/website/public/privacy-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reqType,
          requesterName: form.name,
          requesterPhone: form.phone,
          requesterEmail: form.email || null,
        }),
      });
      if (res.ok) {
        setStatus("done");
      } else if (res.status === 409) {
        setStatus("duplicate");
      } else if (res.status === 429) {
        setStatus("error");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") return (
    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "18px 22px", textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "#166534", fontWeight: 600, margin: 0 }}>
        {type === "export" ? "تم تسجيل طلب نسخة بياناتك" : "تم تسجيل طلب حذف بياناتك"} — سيتم التواصل معك خلال 30 يوماً وفق PDPL م/11
      </p>
    </div>
  );

  if (status === "duplicate") return (
    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: "18px 22px", textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "#9a3412", fontWeight: 600, margin: 0 }}>
        طلب مماثل مسجّل خلال آخر 24 ساعة — سيتم معالجته قريباً
      </p>
    </div>
  );

  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: "22px 24px" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 14, marginTop: 0 }}>
        ممارسة حقوقك وفق PDPL — أدخل بياناتك ثم اختر الطلب
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>الاسم *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="اسمك الكامل"
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>الجوال *</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="05XXXXXXXX" dir="ltr"
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>البريد الإلكتروني (اختياري)</label>
        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="email@example.com" dir="ltr"
          style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      </div>
      {status === "error" && (
        <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>
          حدث خطأ أو تجاوزت الحد المسموح — تواصل مع privacy@nasaqpro.tech
        </p>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => submit("export")}
          disabled={!form.name || !form.phone || status === "loading"}
          style={{
            flex: 1, background: "#5b9bd5", color: "white", border: "none",
            borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600,
            cursor: !form.name || !form.phone ? "not-allowed" : "pointer",
            opacity: !form.name || !form.phone ? 0.5 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
          {status === "loading" && type === "export" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
          طلب نسخة من بياناتي
        </button>
        <button
          onClick={() => submit("delete")}
          disabled={!form.name || !form.phone || status === "loading"}
          style={{
            flex: 1, background: "white", color: "#dc2626", border: "1px solid #fca5a5",
            borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600,
            cursor: !form.name || !form.phone ? "not-allowed" : "pointer",
            opacity: !form.name || !form.phone ? 0.5 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
          {status === "loading" && type === "delete" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
          طلب حذف بياناتي
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 10, marginBottom: 0 }}>
        سيتم التحقق من هويتك قبل تنفيذ الطلب — الاستجابة خلال 30 يوماً وفق PDPL م/13
      </p>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <NasaqThemeGuard>
      <PublicLayout>
        <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif" }}>

          {/* Hero */}
          <section style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)", padding: "96px 24px 72px", textAlign: "center" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#f0fdf4", color: "#16a34a",
                padding: "6px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                marginBottom: 24, border: "1px solid rgba(34,197,94,0.2)",
              }}>
                سياسة الخصوصية
              </div>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "#0f172a", marginBottom: 18, lineHeight: 1.2 }}>
                كيف نحمي بياناتك
              </h1>
              <p style={{ fontSize: 17, color: "#64748b", lineHeight: 1.8, maxWidth: 560, margin: "0 auto" }}>
                نلتزم بأعلى معايير حماية البيانات الشخصية وفق نظام PDPL السعودي. بياناتك ملكٌ لك دائماً.
              </p>
              <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 16 }}>
                آخر تحديث: أبريل ٢٠٢٥
              </p>

              {/* Compliance badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 24 }}>
                {["PDPL م/19 — هيئة SDAIA", "ZATCA — سجلات مالية 5 سنوات", "حقوق صاحب البيانات", "إخطار NDMO — 72 ساعة"].map((b) => (
                  <span key={b} style={{
                    background: "rgba(22,163,74,0.08)", color: "#16a34a",
                    padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                    border: "1px solid rgba(22,163,74,0.2)",
                  }}>{b}</span>
                ))}
              </div>
            </div>
          </section>

          {/* Content */}
          <section style={{ padding: "72px 24px", background: "#ffffff" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {SECTIONS.map((s, i) => (
                  <div key={i} style={{
                    background: "#f8fafc", borderRadius: 16, padding: "28px 32px",
                    border: "1px solid #e2e8f0",
                  }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 32, height: 32, borderRadius: 8, background: "#f0fdf4",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: "#16a34a", flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      {s.title.replace(/^[٠-٩]+\. /, "")}
                    </h2>
                    <p style={{ fontSize: 14, color: "#475569", lineHeight: 2, whiteSpace: "pre-line", margin: 0 }}>
                      {s.body}
                    </p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ marginTop: 52, padding: "28px 32px", background: "#f0fdf4", borderRadius: 16, textAlign: "center", border: "1px solid rgba(34,197,94,0.15)" }}>
                <p style={{ fontSize: 15, color: "#0f172a", fontWeight: 600, marginBottom: 6 }}>
                  تريد ممارسة حقوقك على بياناتك؟
                </p>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
                  مسؤول حماية البيانات يُجيب خلال 5 أيام عمل — نُتمّ الطلب خلال 30 يوماً
                </p>
                <div style={{ marginBottom: 24 }}>
                  <PrivacyRequestButtons />
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <a href="mailto:privacy@nasaqpro.tech" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "#5b9bd5", color: "white", padding: "10px 24px",
                    borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none",
                  }}>
                    تواصل مع مسؤول الخصوصية
                  </a>
                  <a href="/legal/compliance" style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "white", color: "#374151", padding: "10px 24px",
                    borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none",
                    border: "1px solid #e2e8f0",
                  }}>
                    صفحة الامتثال القانوني
                  </a>
                </div>
              </div>
            </div>
          </section>

        </div>
      </PublicLayout>
    </NasaqThemeGuard>
  );
}
