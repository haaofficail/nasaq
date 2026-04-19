import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { complianceApi } from "../lib/api";
import { Shield, FileText, AlertTriangle, CheckCircle, Clock, Download, Trash2, Save } from "lucide-react";

type Tab = "settings" | "requests" | "incidents";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:    { label: "قيد الانتظار", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  processing: { label: "قيد المعالجة", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  completed:  { label: "مكتمل",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected:   { label: "مرفوض",         cls: "bg-red-50 text-red-700 border-red-200" },
};

const SEVERITY_LABELS: Record<string, { label: string; cls: string }> = {
  low:      { label: "منخفض",   cls: "bg-gray-50 text-gray-600 border-[#eef2f6]" },
  medium:   { label: "متوسط",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  high:     { label: "عالٍ",    cls: "bg-orange-50 text-orange-700 border-orange-200" },
  critical: { label: "حرج",     cls: "bg-red-50 text-red-700 border-red-200" },
};

export function LegalSettingsPage() {
  const [tab, setTab] = useState<Tab>("settings");

  return (
    <div dir="rtl" className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">الإعدادات القانونية</h1>
          <p className="text-sm text-gray-500">
            PDPL · نظام التجارة الإلكترونية · ZATCA
          </p>
        </div>
      </div>

      {/* Compliance Banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex flex-wrap gap-4">
        {[
          { label: "PDPL", sub: "نظام حماية البيانات الشخصية م/19" },
          { label: "التجارة الإلكترونية", sub: "م/69 — وزارة التجارة" },
          { label: "ZATCA", sub: "الفاتورة الإلكترونية — المرحلة الأولى" },
          { label: "نظام مكافحة الجرائم", sub: "المعلوماتية — الأمن الإلكتروني" },
        ].map((b) => (
          <div key={b.label} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-blue-100">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="text-xs font-700 text-gray-900 leading-tight">{b.label}</div>
              <div className="text-[11px] text-gray-500">{b.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f1f5f9] rounded-xl p-1 w-fit">
        {([
          { key: "settings",  label: "بيانات المنشأة",     icon: FileText },
          { key: "requests",  label: "طلبات الخصوصية",     icon: Download },
          { key: "incidents", label: "حوادث الأمان",        icon: AlertTriangle },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "settings"  && <LegalSettingsTab />}
      {tab === "requests"  && <PrivacyRequestsTab />}
      {tab === "incidents" && <SecurityIncidentsTab />}
    </div>
  );
}

// ============================================================
// TAB: Legal Settings
// ============================================================

function LegalSettingsTab() {
  const { data: res, loading } = useApi(() => complianceApi.legalSettings(), []);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (res?.data) setForm(res.data);
  }, [res]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await complianceApi.updateLegalSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-40 bg-[#f8fafc] rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-6">
      {/* بيانات قانونية */}
      <Section title="بيانات المنشأة القانونية" sub="مطلوبة بموجب نظام التجارة الإلكترونية م/69 المادة 7">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم المنشأة التجاري" value={form.businessName ?? ""} onChange={(v) => set("businessName", v)} />
          <Field label="رقم السجل التجاري" value={form.commercialRegistration ?? ""} onChange={(v) => set("commercialRegistration", v)} placeholder="1234567890" />
          <Field label="الرقم الضريبي (VAT)" value={form.vatNumber ?? ""} onChange={(v) => set("vatNumber", v)} placeholder="300XXXXXXXXX1003" />
          <Field label="بريد التواصل الرسمي" value={form.contactEmail ?? ""} onChange={(v) => set("contactEmail", v)} type="email" />
          <Field label="هاتف التواصل" value={form.contactPhone ?? ""} onChange={(v) => set("contactPhone", v)} />
          <Field label="العنوان" value={form.address ?? ""} onChange={(v) => set("address", v)} />
        </div>
      </Section>

      {/* سياسات الخدمة */}
      <Section title="سياسات الخدمة" sub="سياسة الاسترداد والإلغاء — نظام حماية المستهلك">
        <TextArea label="سياسة الاسترداد" value={form.refundPolicy ?? ""} onChange={(v) => set("refundPolicy", v)} placeholder="مثال: يحق للعميل طلب الاسترداد خلال 14 يوم من تاريخ الاشتراك..." />
        <TextArea label="سياسة الإلغاء" value={form.cancellationPolicy ?? ""} onChange={(v) => set("cancellationPolicy", v)} placeholder="مثال: يمكن إلغاء الاشتراك في أي وقت. يستمر الوصول حتى نهاية الفترة المدفوعة..." />
      </Section>

      {/* إعدادات الخصوصية */}
      <Section title="إعدادات الخصوصية" sub="PDPL نظام حماية البيانات الشخصية م/19">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="مدة الاحتفاظ بالبيانات (يوم)"
            value={String(form.dataRetentionDays ?? 365)}
            onChange={(v) => set("dataRetentionDays", parseInt(v) || 365)}
            type="number"
          />
          <Field
            label="بريد مسؤول حماية البيانات (DPO)"
            value={form.dpoEmail ?? ""}
            onChange={(v) => set("dpoEmail", v)}
            type="email"
            placeholder="privacy@example.com"
          />
        </div>
        <div className="flex flex-col gap-3 mt-2">
          <Toggle label="السماح للعملاء بتصدير بياناتهم" sub="PDPL المادة 13 — حق التنقّل" checked={form.allowDataExport ?? true} onChange={(v) => set("allowDataExport", v)} />
          <Toggle label="السماح للعملاء بطلب حذف بياناتهم" sub="PDPL المادة 12 — حق الحذف" checked={form.allowDataDeletion ?? true} onChange={(v) => set("allowDataDeletion", v)} />
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "تم الحفظ" : saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// TAB: Privacy Requests
// ============================================================

function PrivacyRequestsTab() {
  const { data: res, loading, refetch } = useApi(() => complianceApi.privacyRequests(), []);
  const requests: any[] = res?.data ?? [];

  const updateStatus = async (id: string, status: string) => {
    await complianceApi.updateRequestStatus(id, { status });
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          طلبات الاطلاع والحذف المقدَّمة من العملاء بموجب PDPL المادة 11-16
        </p>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{requests.length} طلب</span>
      </div>

      {loading && <div className="h-32 bg-[#f8fafc] rounded-2xl animate-pulse" />}

      {!loading && requests.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-[#f8fafc] rounded-2xl">
          <Download className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">لا توجد طلبات خصوصية</p>
        </div>
      )}

      {requests.map((r) => {
        const s = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending;
        return (
          <div key={r.id} className="bg-white border border-[#eef2f6] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${r.type === "delete" ? "bg-red-50" : "bg-blue-50"}`}>
                {r.type === "delete" ? <Trash2 className="w-4 h-4 text-red-500" /> : <Download className="w-4 h-4 text-blue-500" />}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{r.requesterName ?? "—"}</div>
                <div className="text-xs text-gray-400">{r.type === "delete" ? "طلب حذف البيانات" : "طلب تصدير البيانات"} · {new Date(r.createdAt).toLocaleDateString("ar-SA")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-lg border ${s.cls}`}>{s.label}</span>
              {r.status === "pending" && (
                <>
                  <button onClick={() => updateStatus(r.id, "processing")} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50">بدء المعالجة</button>
                  <button onClick={() => updateStatus(r.id, "completed")} className="text-xs text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded-lg hover:bg-emerald-50">إتمام</button>
                  <button onClick={() => updateStatus(r.id, "rejected")} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50">رفض</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TAB: Security Incidents
// ============================================================

function SecurityIncidentsTab() {
  const { data: res, loading } = useApi(() => complianceApi.securityIncidents(), []);
  const incidents: any[] = res?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <span className="font-semibold">إشعار PDPL المادة 20:</span> الحوادث ذات الخطورة العالية أو الحرجة تستوجب إخطار الهيئة الوطنية لإدارة البيانات (NDMO) خلال <strong>72 ساعة</strong> من اكتشافها.
        </div>
      </div>

      {loading && <div className="h-32 bg-[#f8fafc] rounded-2xl animate-pulse" />}

      {!loading && incidents.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-[#f8fafc] rounded-2xl">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">لا توجد حوادث أمان مسجّلة</p>
        </div>
      )}

      {incidents.map((i) => {
        const sev = SEVERITY_LABELS[i.severity] ?? SEVERITY_LABELS.low;
        return (
          <div key={i.id} className="bg-white border border-[#eef2f6] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-lg border ${sev.cls}`}>{sev.label}</span>
                <span className="text-sm font-medium text-gray-900">{i.type}</span>
              </div>
              <div className="flex items-center gap-2">
                {i.reportedToNdmo ? (
                  <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> أُبلِغ NDMO</span>
                ) : (i.severity === "high" || i.severity === "critical") ? (
                  <span className="text-xs text-red-600 flex items-center gap-1"><Clock className="w-3 h-3" /> يستلزم إبلاغ NDMO</span>
                ) : null}
                <span className="text-xs text-gray-400">{new Date(i.detectedAt).toLocaleDateString("ar-SA")}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">{i.description}</p>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// UI Helpers
// ============================================================

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#eef2f6] rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-700 text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
      />
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: {
  label: string; sub: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div>
        <div className="text-sm text-gray-800">{label}</div>
        <div className="text-xs text-gray-400">{sub}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-blue-500" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-0.5" : "translate-x-5"}`} />
      </button>
    </label>
  );
}
