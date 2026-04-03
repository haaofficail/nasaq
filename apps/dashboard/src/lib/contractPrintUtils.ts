// ─── Contract Print Utilities ────────────────────────────────────────────────
// Generates Arabic RTL HTML for printing contracts and official notices.
// Opens a new window, renders the HTML with print CSS, then triggers print dialog.

const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans Arabic', sans-serif; direction: rtl; color: #1a1a1a; font-size: 13px; line-height: 1.7; background: white; }
  .page { max-width: 210mm; margin: 0 auto; padding: 20mm 18mm; }
  h1 { font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 6px; }
  h2 { font-size: 14px; font-weight: 700; margin: 18px 0 8px; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; }
  .subtitle { text-align: center; font-size: 12px; color: #555; margin-bottom: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px double #1a1a1a; padding-bottom: 14px; margin-bottom: 20px; }
  .header-logo { font-size: 20px; font-weight: 800; color: #1a1a1a; }
  .header-meta { text-align: left; font-size: 11px; color: #555; line-height: 1.6; }
  .parties-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .parties-table td, .parties-table th { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
  .parties-table th { background: #f3f3f3; font-weight: 600; width: 30%; }
  .clause { margin-bottom: 12px; }
  .clause-num { font-weight: 700; color: #1a1a1a; display: inline; }
  .clause-title { font-weight: 700; text-decoration: underline; display: inline; }
  .clause-body { margin-top: 4px; }
  .payment-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  .payment-table th { background: #1a1a1a; color: white; padding: 6px 10px; text-align: center; }
  .payment-table td { border: 1px solid #ccc; padding: 6px 10px; text-align: center; }
  .payment-table tr:nth-child(even) td { background: #f9f9f9; }
  .status-paid { color: #16a34a; font-weight: 600; }
  .status-overdue { color: #dc2626; font-weight: 600; }
  .status-pending { color: #d97706; font-weight: 600; }
  .sig-row { display: flex; gap: 40px; margin-top: 30px; }
  .sig-box { flex: 1; border-top: 1px solid #1a1a1a; padding-top: 8px; text-align: center; font-size: 12px; }
  .sig-box p { margin-bottom: 40px; font-weight: 600; }
  .seal-box { height: 80px; border: 1px dashed #ccc; border-radius: 50%; width: 80px; margin: 8px auto; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; }
  .divider { border: none; border-top: 1px solid #ddd; margin: 14px 0; }
  .notice-box { border: 2px solid #1a1a1a; padding: 20px; border-radius: 4px; margin: 20px 0; }
  .notice-body { font-size: 14px; line-height: 2; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-active { background: #dcfce7; color: #15803d; }
  .badge-draft { background: #f3f4f6; color: #374151; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page { padding: 15mm 14mm; }
  }
`;

function openPrint(html: string) {
  const win = window.open("", "_blank", "width=900,height=800");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>طباعة</title><style>${FONT_STYLE}</style></head><body>${html}<div class="no-print" style="position:fixed;top:10px;left:10px;display:flex;gap:8px;z-index:9999"><button onclick="window.print()" style="background:#1a1a1a;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px">طباعة / حفظ PDF</button><button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px">إغلاق</button></div></body></html>`);
  win.document.close();
}

// ─── Frequency helpers ────────────────────────────────────────────────────────
const FREQ_AR: Record<string, string> = {
  monthly: "شهري", quarterly: "ربع سنوي", semi_annual: "نصف سنوي", annual: "سنوي",
};
const FURNISHING_AR: Record<string, string> = {
  furnished: "مفروشة", semi_furnished: "نصف مفروشة", unfurnished: "غير مفروشة",
};
const UNIT_TYPE_AR: Record<string, string> = {
  apartment: "شقة", studio: "استوديو", villa: "فيلا", office: "مكتب",
  shop: "محل", warehouse: "مستودع", room: "غرفة", floor: "طابق",
};
const PAYMENT_STATUS_AR: Record<string, string> = {
  paid: "مدفوع", pending: "قادم", overdue: "متأخر", partial: "جزئي",
};
const PAYMENT_STATUS_CLS: Record<string, string> = {
  paid: "status-paid", pending: "", overdue: "status-overdue", partial: "status-pending",
};

function fmt(n: any) { return Number(n ?? 0).toLocaleString("ar-SA-u-nu-latn"); }
function fmtDate(d: any) { return d ? new Date(d).toLocaleDateString("ar-SA") : "—"; }

// ─── 1. LEASE CONTRACT PDF (16 clauses) ─────────────────────────────────────
export function printLeaseContract(data: any) {
  const c = data;
  const schedule: any[] = c.paymentSchedule ?? [];

  const utilsList = [
    c.includes_electricity && "كهرباء",
    c.includes_water && "ماء",
    c.includes_ac && "تكييف مركزي",
    c.includes_internet && "إنترنت",
    c.includes_parking && `موقف سيارات${c.parking_spots ? ` (${c.parking_spots} مواقف)` : ""}`,
  ].filter(Boolean).join(" — ") || "لا شيء";

  const scheduleRows = schedule.map((inv, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fmt(inv.total_amount)} ريال</td>
      <td>${fmtDate(inv.due_date)}</td>
      <td class="${PAYMENT_STATUS_CLS[inv.status] ?? ""}">${PAYMENT_STATUS_AR[inv.status] ?? inv.status}</td>
      <td>${fmt(inv.paid_amount)} ريال</td>
    </tr>`).join("");

  const html = `
<div class="page">
  <div class="header">
    <div>
      <div class="header-logo">${c.org_name ?? "المنشأة"}</div>
      <div style="font-size:11px;color:#555;margin-top:4px">
        ${c.commercial_register ? `س.ت: ${c.commercial_register}` : ""}
        ${c.org_phone ? ` | ${c.org_phone}` : ""}
      </div>
    </div>
    <div class="header-meta">
      <div>رقم العقد: <strong>${c.contract_number ?? "—"}</strong></div>
      <div>تاريخ الإنشاء: ${fmtDate(c.created_at)}</div>
      ${c.ejar_contract_number ? `<div>رقم عقد إيجار: ${c.ejar_contract_number}</div>` : ""}
    </div>
  </div>

  <h1>عقد إيجار</h1>
  <div class="subtitle">بسم الله الرحمن الرحيم — هذا عقد إيجار موثق وفقاً لنظام إيجار في المملكة العربية السعودية</div>

  <h2>البند الأول: أطراف العقد</h2>
  <table class="parties-table">
    <tr><th>المؤجر</th><td>${c.org_name ?? "—"}</td><th>رقم السجل التجاري</th><td>${c.commercial_register ?? "—"}</td></tr>
    <tr><th>المستأجر</th><td>${c.tenant_name ?? "—"}</td><th>رقم الهوية</th><td>${c.tenant_national_id ?? "—"}</td></tr>
    <tr><th>هاتف المستأجر</th><td>${c.tenant_phone ?? "—"}</td><th>البريد الإلكتروني</th><td>${c.tenant_email ?? "—"}</td></tr>
  </table>

  <h2>البند الثاني: وصف الوحدة المؤجرة</h2>
  <table class="parties-table">
    <tr><th>العقار</th><td>${c.property_name ?? "—"}</td><th>المدينة</th><td>${c.city ?? "—"} ${c.district ? `— ${c.district}` : ""}</td></tr>
    <tr><th>رقم الوحدة</th><td>${c.unit_number ?? "—"}</td><th>النوع</th><td>${UNIT_TYPE_AR[c.unit_type] ?? c.unit_type ?? "—"}</td></tr>
    <tr><th>الطابق</th><td>${c.floor ?? "—"}</td><th>المساحة</th><td>${c.area_sqm ? `${c.area_sqm} م²` : "—"}</td></tr>
    <tr><th>غرف النوم</th><td>${c.bedrooms ?? "—"}</td><th>دورات المياه</th><td>${c.bathrooms ?? "—"}</td></tr>
    <tr><th>التأثيث</th><td>${FURNISHING_AR[c.furnishing] ?? c.furnishing ?? "—"}</td><th>عداد الكهرباء</th><td>${c.electricity_meter ?? "—"}</td></tr>
    <tr><th>عداد الماء</th><td>${c.water_meter ?? "—"}</td><th>العنوان التفصيلي</th><td>${c.property_address ?? "—"}</td></tr>
  </table>

  <h2>البند الثالث: مدة العقد</h2>
  <div class="clause-body">
    تاريخ البداية: <strong>${fmtDate(c.start_date)}</strong> — تاريخ الانتهاء: <strong>${fmtDate(c.end_date)}</strong>
    <br>يُجدَّد العقد تلقائياً بإشعار مدته ${c.renewal_notice_days ?? 60} يوماً ما لم يُخطر أحد الطرفين الآخر بعدم الرغبة في التجديد.
  </div>

  <h2>البند الرابع: الأجرة وطريقة السداد</h2>
  <div class="clause-body">
    قيمة الإيجار: <strong>${fmt(c.rent_amount)} ريال سعودي</strong> — دورية السداد: <strong>${FREQ_AR[c.payment_frequency] ?? c.payment_frequency ?? "شهري"}</strong>
    <br>يلتزم المستأجر بسداد الأجرة في موعدها المحدد دون الحاجة إلى إخطار أو مطالبة.
  </div>

  <h2>البند الخامس: التأمين (الوديعة)</h2>
  <div class="clause-body">
    مبلغ التأمين: <strong>${fmt(c.deposit_amount)} ريال</strong> — يُستردّ عند انتهاء العقد وإخلاء الوحدة في حالتها الأصلية مع خصم أي أضرار أو مستحقات متأخرة.
  </div>

  <h2>البند السادس: التزامات المؤجر</h2>
  <div class="clause-body">
    يلتزم المؤجر بتسليم الوحدة في حالة صالحة للسكن أو الاستخدام المتفق عليه، وإجراء الصيانة الهيكلية الرئيسية التي تحول دون الانتفاع بالوحدة.
  </div>

  <h2>البند السابع: التزامات المستأجر</h2>
  <div class="clause-body">
    يلتزم المستأجر بما يلي: (أ) سداد الإيجار في مواعيده المحددة، (ب) عدم إجراء أي تعديلات إنشائية بدون إذن كتابي، (ج) عدم التأجير من الباطن أو التنازل عن العقد، (د) الحفاظ على الوحدة وإعادتها بحالتها عند الاستلام.
  </div>

  <h2>البند الثامن: الخدمات المشمولة</h2>
  <div class="clause-body">${utilsList}</div>

  <h2>البند التاسع: الصيانة</h2>
  <div class="clause-body">
    تقع على عاتق المؤجر الصيانة الهيكلية وصيانة الأنظمة الرئيسية. تقع على المستأجر الصيانة الدورية البسيطة والإصلاحات الناتجة عن سوء الاستخدام.
  </div>

  <h2>البند العاشر: فسخ العقد</h2>
  <div class="clause-body">
    يحق لأي من الطرفين فسخ العقد في حال إخلال الطرف الآخر بالتزاماته بعد إخطاره كتابياً ومنحه مهلة 30 يوماً للتصحيح، مع مراعاة الأحكام النظامية المعمول بها.
  </div>

  <h2>البند الحادي عشر: التجديد التلقائي</h2>
  <div class="clause-body">
    يُجدَّد هذا العقد تلقائياً بنفس الشروط لمدة مماثلة ما لم يُخطر أحد الطرفين الآخر بعدم الرغبة في التجديد قبل ${c.renewal_notice_days ?? 60} يوماً من تاريخ انتهائه.
  </div>

  <h2>البند الثاني عشر: إخلاء الوحدة</h2>
  <div class="clause-body">
    يلتزم المستأجر بإخلاء الوحدة وتسليمها للمؤجر في نهاية مدة العقد أو عند فسخه، نظيفةً ومرتبةً وخاليةً من منقولاته، مع إعادة مفاتيح الوحدة كاملةً.
  </div>

  <h2>البند الثالث عشر: تسليم واستلام</h2>
  <div class="clause-body">
    يُحرَّر محضر تسليم واستلام عند بداية العقد ونهايته موقّعاً من الطرفين يُثبت حالة الوحدة، ويكون أساساً لتسوية أي نزاع حول الأضرار.
  </div>

  <h2>البند الرابع عشر: حل النزاعات</h2>
  <div class="clause-body">
    تُحسم النزاعات الناشئة عن هذا العقد بالطريقة الودية أولاً، وعند تعذرها تُرفع إلى الجهات القضائية المختصة في المملكة العربية السعودية وفق نظام الإيجار.
  </div>

  <h2>البند الخامس عشر: شروط إضافية</h2>
  <div class="clause-body">
    ${c.internal_notes ? c.internal_notes : "لا توجد شروط إضافية."}
  </div>

  <h2>البند السادس عشر: التوقيعات</h2>
  <div class="sig-row">
    <div class="sig-box">
      <p>المؤجر</p>
      <p>${c.org_name ?? "—"}</p>
      <div class="seal-box">الختم</div>
      <p>التوقيع: _______________</p>
      <p>التاريخ: _______________</p>
    </div>
    <div class="sig-box">
      <p>المستأجر</p>
      <p>${c.tenant_name ?? "—"}</p>
      <div style="height:80px;margin:8px 0;"></div>
      <p>التوقيع: _______________</p>
      <p>التاريخ: _______________</p>
    </div>
    <div class="sig-box">
      <p>الوسيط / الشاهد</p>
      <p>—</p>
      <div style="height:80px;margin:8px 0;"></div>
      <p>التوقيع: _______________</p>
      <p>التاريخ: _______________</p>
    </div>
  </div>

  ${schedule.length > 0 ? `
  <div style="page-break-before:always;margin-top:30px;">
    <h2>جدول الدفعات</h2>
    <table class="payment-table">
      <thead><tr><th>#</th><th>المبلغ</th><th>تاريخ الاستحقاق</th><th>الحالة</th><th>المدفوع</th></tr></thead>
      <tbody>${scheduleRows}</tbody>
    </table>
  </div>` : ""}
</div>`;

  openPrint(html);
}

// ─── 2. OFFICIAL NOTICES ─────────────────────────────────────────────────────
const NOTICE_TITLES: Record<string, string> = {
  payment_reminder: "إخطار بالسداد",
  non_renewal: "إخطار بعدم التجديد",
  eviction: "إخطار بالإخلاء",
};

export function printContractNotice(data: any, type: string) {
  const d = data;
  const title = NOTICE_TITLES[type] ?? "إخطار رسمي";
  const today = new Date().toLocaleDateString("ar-SA");
  const overdueFmt = fmt(d.overdueAmount);

  const bodyText = type === "payment_reminder"
    ? `إلى المستأجر الكريم / <strong>${d.tenant_name ?? "—"}</strong><br><br>
       نفيدكم بأن مبلغ الإيجار البالغ <strong>${overdueFmt} ريال سعودي</strong> مستحق عليكم وفقاً لعقد الإيجار رقم <strong>${d.contract_number}</strong> للوحدة رقم <strong>${d.unit_number}</strong> في عقار <strong>${d.property_name}</strong>، ولم يتم سداده حتى تاريخ هذا الإخطار.<br><br>
       نأمل المبادرة بالسداد خلال <strong>15 يوماً</strong> من تاريخ هذا الإخطار، وإلا سنضطر لاتخاذ الإجراءات النظامية اللازمة وفق نظام الإيجار في المملكة العربية السعودية.`
    : type === "non_renewal"
    ? `إلى المستأجر الكريم / <strong>${d.tenant_name ?? "—"}</strong><br><br>
       نفيدكم بعدم رغبتنا في تجديد عقد الإيجار رقم <strong>${d.contract_number}</strong> المنتهي بتاريخ <strong>${fmtDate(d.end_date)}</strong> للوحدة رقم <strong>${d.unit_number}</strong> في عقار <strong>${d.property_name}</strong>.<br><br>
       نأمل منكم الاستعداد لإخلاء الوحدة وتسليمها في الموعد المحدد مع تسوية جميع المستحقات المالية.`
    : `إلى المستأجر الكريم / <strong>${d.tenant_name ?? "—"}</strong><br><br>
       بناءً على تخلفكم عن سداد الإيجار المستحق البالغ <strong>${overdueFmt} ريال</strong> لمدة تجاوزت المهلة النظامية المقررة، يُشعركم المؤجر بفسخ عقد الإيجار رقم <strong>${d.contract_number}</strong> وضرورة إخلاء الوحدة رقم <strong>${d.unit_number}</strong> في عقار <strong>${d.property_name}</strong> خلال المهلة النظامية المحددة نظاماً.`;

  const html = `
<div class="page">
  <div class="header">
    <div>
      <div class="header-logo">${d.org_name ?? "المنشأة"}</div>
      <div style="font-size:11px;color:#555;margin-top:4px">${d.commercial_register ? `س.ت: ${d.commercial_register}` : ""} ${d.org_phone ? `| ${d.org_phone}` : ""}</div>
    </div>
    <div class="header-meta">
      <div>التاريخ: ${today}</div>
      <div>رقم العقد: ${d.contract_number}</div>
    </div>
  </div>

  <h1>${title}</h1>
  <div class="subtitle">إخطار رسمي — يُعدّ هذا المستند وثيقة قانونية معتمدة</div>

  <div class="notice-box">
    <div class="notice-body">${bodyText}</div>
  </div>

  <p style="margin-top:20px">وتقبلوا فائق الاحترام والتقدير،</p>

  <div class="sig-row" style="margin-top:30px">
    <div class="sig-box">
      <p>المؤجر / مصدر الإخطار</p>
      <p>${d.org_name ?? "—"}</p>
      <div style="height:60px;margin:8px 0;"></div>
      <p>التوقيع: _______________</p>
      <p>التاريخ: ${today}</p>
    </div>
    <div class="sig-box">
      <p>استلام المستأجر</p>
      <p>${d.tenant_name ?? "—"}</p>
      <div style="height:60px;margin:8px 0;"></div>
      <p>التوقيع: _______________</p>
      <p>التاريخ: _______________</p>
    </div>
  </div>
</div>`;

  openPrint(html);
}

// ─── 3. BROKERAGE CONTRACT PDF ───────────────────────────────────────────────
const BROKER_TYPE_AR: Record<string, string> = {
  brokerage_only: "وساطة عقارية", property_management: "إدارة عقارية",
  marketing: "تسويق عقاري", full_service: "خدمات متكاملة",
};
const CLIENT_TYPE_AR: Record<string, string> = {
  landlord: "مؤجر", buyer: "مشترٍ", seller: "بائع", tenant: "مستأجر",
};
const COMMISSION_TYPE_AR: Record<string, string> = {
  percentage: "نسبة مئوية", fixed: "مبلغ ثابت", per_unit: "لكل وحدة",
};

export function printBrokerageContract(data: any) {
  const d = data;
  const commissionDesc = d.commission_type === "percentage"
    ? `${d.commission_percent ?? 0}% من قيمة الصفقة`
    : d.commission_type === "fixed"
    ? `${fmt(d.commission_amount)} ريال سعودي`
    : `${fmt(d.commission_amount)} ريال لكل وحدة`;

  const html = `
<div class="page">
  <div class="header">
    <div>
      <div class="header-logo">عقد وساطة عقارية</div>
      <div style="font-size:11px;color:#555;margin-top:4px">رقم الترخيص (فال): ${d.fal_license_number ?? "—"}</div>
    </div>
    <div class="header-meta">
      <div>رقم العقد: <strong>${d.contract_number ?? "—"}</strong></div>
      <div>تاريخ الإنشاء: ${fmtDate(d.created_at)}</div>
    </div>
  </div>

  <h1>عقد ${BROKER_TYPE_AR[d.broker_type] ?? "وساطة"}</h1>
  <div class="subtitle">وفقاً لنظام الوساطة العقارية ولوائحه التنفيذية في المملكة العربية السعودية</div>

  <h2>أطراف العقد</h2>
  <table class="parties-table">
    <tr><th>الوسيط</th><td colspan="3">${d.org_name ?? "—"} — رخصة فال: ${d.fal_license_number ?? "—"}</td></tr>
    <tr><th>نوع العميل</th><td>${CLIENT_TYPE_AR[d.client_type] ?? d.client_type}</td><th>اسم العميل</th><td>${d.client_name}</td></tr>
    <tr><th>رقم الهوية</th><td>${d.client_national_id ?? "—"}</td><th>رقم الهاتف</th><td>${d.client_phone ?? "—"}</td></tr>
    ${d.property_name ? `<tr><th>العقار</th><td colspan="3">${d.property_name}</td></tr>` : ""}
    ${d.property_description ? `<tr><th>وصف العقار</th><td colspan="3">${d.property_description}</td></tr>` : ""}
  </table>

  <h2>نطاق الوساطة</h2>
  <div class="clause-body">${d.scope ?? "—"}</div>

  <h2>مدة العقد</h2>
  <div class="clause-body">
    من: <strong>${fmtDate(d.start_date)}</strong> إلى: <strong>${fmtDate(d.end_date)}</strong>
    ${d.exclusivity ? " — <strong>عقد حصري</strong>" : " — عقد غير حصري"}
  </div>

  <h2>العمولة</h2>
  <table class="parties-table">
    <tr><th>نوع العمولة</th><td>${COMMISSION_TYPE_AR[d.commission_type] ?? d.commission_type}</td></tr>
    <tr><th>قيمة العمولة</th><td>${commissionDesc}</td></tr>
    <tr><th>يتحملها</th><td>${CLIENT_TYPE_AR[d.commission_paid_by] ?? d.commission_paid_by}</td></tr>
  </table>

  <h2>الشروط والالتزامات</h2>
  <div class="clause-body">
    <strong>يلتزم الوسيط بـ:</strong> بذل العناية اللازمة في إتمام المهمة المنوطة به، والحفاظ على سرية معلومات العميل، والتصرف بنزاهة وشفافية.<br>
    <strong>يلتزم العميل بـ:</strong> تقديم المعلومات الصحيحة، وإخطار الوسيط فور إتمام أي صفقة ذات صلة، وسداد العمولة المتفق عليها عند استحقاقها.
  </div>

  ${d.notes ? `<h2>ملاحظات</h2><div class="clause-body">${d.notes}</div>` : ""}

  <div class="sig-row" style="margin-top:30px">
    <div class="sig-box">
      <p>الوسيط العقاري</p>
      <p>${d.org_name ?? "—"}</p>
      <div class="seal-box">الختم</div>
      <p>التوقيع: _______________</p>
    </div>
    <div class="sig-box">
      <p>العميل — ${CLIENT_TYPE_AR[d.client_type] ?? ""}</p>
      <p>${d.client_name}</p>
      <div style="height:80px;margin:8px 0;"></div>
      <p>التوقيع: _______________</p>
    </div>
  </div>
</div>`;

  openPrint(html);
}
