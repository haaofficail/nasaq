import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard, TrendingUp, Clock, XCircle, BadgeDollarSign,
  Settings, RefreshCw, Lock, CheckCircle2,
  Plug, ChevronLeft, ShieldCheck, Landmark, Undo2,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useOrgContext } from "@/hooks/useOrgContext";
import { paymentsApi } from "@/lib/api";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { confirmDialog } from "@/components/ui";

const STATUS_LABELS: Record<string, string> = {
  pending:   "معلقة",
  paid:      "مدفوعة",
  failed:    "فاشلة",
  refunded:  "مستردة",
  cancelled: "ملغاة",
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700",
  paid:      "bg-green-50 text-green-700",
  failed:    "bg-red-50 text-red-600",
  refunded:  "bg-blue-50 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function PaymentsPage() {
  const navigate     = useNavigate();
  const { context }  = useOrgContext();
  const caps: string[] = (context?.capabilities ?? []) as string[];

  const hasNasaqGateway = caps.includes("payment_gateway_nasaq");
  const hasOwnGateway   = caps.includes("payment_gateway_own");

  const [activeMode, setActiveMode]       = useState<"nasaq" | "own">("nasaq");
  const [statusFilter, setStatusFilter]   = useState("");
  const [saving, setSaving]               = useState(false);
  const [saveMsg, setSaveMsg]             = useState("");

  const { data: statsRes,    loading: statsLoading }    = useApi(() => paymentsApi.stats(), []);
  const { data: txRes,       loading: txLoading }       = useApi(() => paymentsApi.transactions({ status: statusFilter || undefined }), [statusFilter]);
  const { data: settingsRes, loading: settingsLoading, refetch: refetchSettings } = useApi(() => paymentsApi.getSettings(), []);

  const stats    = statsRes?.data;
  const txList   = txRes?.data ?? [];
  const settings = settingsRes?.data;

  const [form, setForm]     = useState({ ibanNumber: "", accountName: "", bankName: "", defaultDeliveryFee: "0" });
  const [formInit, setFormInit] = useState(false);

  if (settings && !formInit) {
    setForm({
      ibanNumber:          settings.ibanNumber         ?? "",
      accountName:         settings.accountName        ?? "",
      bankName:            settings.bankName           ?? "",
      defaultDeliveryFee:  String(settings.defaultDeliveryFee ?? "0"),
    });
    setFormInit(true);
  }

  async function handleSave() {
    setSaving(true); setSaveMsg("");
    try {
      await paymentsApi.updateSettings({
        ...form,
        defaultDeliveryFee: Number(form.defaultDeliveryFee) || 0,
      });
      setSaveMsg("تم الحفظ");
      refetchSettings();
    } catch (e: any) { setSaveMsg(e.message || "حدث خطأ"); }
    finally { setSaving(false); }
  }

  const tf = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">المدفوعات الإلكترونية</h1>
        <p className="text-sm text-gray-500 mt-0.5">استقبل مدفوعات عملائك بكل سهولة</p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModeCard
          id="nasaq"
          active={activeMode === "nasaq"}
          enabled={hasNasaqGateway}
          title="بوابة ترميز OS المركزية"
          subtitle="ندير الدفع نيابةً عنك"
          description="لا تحتاج حساباً في أي بوابة. ترميز OS يستقبل المدفوعات ويحوّل لك صافي المبلغ بعد خصم رسوم خدمة بسيطة."
          badge="لا إعداد مطلوب"
          badgeColor="bg-green-50 text-green-700"
          icon={<ShieldCheck className="w-6 h-6 text-brand-500" />}
          bg="bg-blue-50"
          onClick={() => hasNasaqGateway && setActiveMode("nasaq")}
        />
        <ModeCard
          id="own"
          active={activeMode === "own"}
          enabled={hasOwnGateway}
          title="بوابتك الخاصة"
          subtitle="ربط مباشر بحساب التاجر"
          description="ربط بوابتك الخاصة (Moyasar, Tap, HyperPay, Stripe). المال يذهب مباشرة لحسابك البنكي دون وسيط."
          badge="تحكم كامل"
          badgeColor="bg-purple-50 text-purple-700"
          icon={<Plug className="w-6 h-6 text-purple-500" />}
          bg="bg-purple-50"
          onClick={() => hasOwnGateway && setActiveMode("own")}
        />
      </div>

      {/* ── بوابة ترميز OS ── */}
      {activeMode === "nasaq" && (
        hasNasaqGateway ? (
          <NasaqGatewaySection
            stats={stats}
            statsLoading={statsLoading}
            txList={txList}
            txLoading={txLoading}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            settings={settings}
            settingsLoading={settingsLoading}
            form={form}
            tf={tf}
            saving={saving}
            saveMsg={saveMsg}
            handleSave={handleSave}
          />
        ) : (
          <LockedSection
            title="بوابة ترميز OS المركزية"
            description="تواصل مع فريق ترميز OS لتفعيل الدفع عبر البوابة المركزية."
          />
        )
      )}

      {/* ── بوابة خاصة ── */}
      {activeMode === "own" && (
        hasOwnGateway ? (
          <OwnGatewaySection navigate={navigate} />
        ) : (
          <LockedSection
            title="بوابة الدفع الخاصة"
            description="هذه الميزة غير مفعّلة لحسابك. تواصل مع فريق ترميز OS للتفعيل."
          />
        )
      )}
    </div>
  );
}

// ── Mode Card ────────────────────────────────────────────────

function ModeCard({
  active, enabled, title, subtitle, description, badge, badgeColor, icon, bg, onClick,
}: {
  id: string; active: boolean; enabled: boolean;
  title: string; subtitle: string; description: string;
  badge: string; badgeColor: string;
  icon: React.ReactNode; bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`text-right w-full p-5 rounded-2xl border-2 transition-all ${
        !enabled
          ? "border-[#eef2f6] bg-[#f8fafc] opacity-60 cursor-not-allowed"
          : active
            ? "border-brand-500 bg-white shadow-sm"
            : "border-[#eef2f6] bg-white hover:border-[#eef2f6]"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
          {!enabled ? <Lock className="w-5 h-5 text-gray-400" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-gray-800 text-sm">{title}</p>
            {!enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                <Lock className="w-3 h-3" /> مقفل
              </span>
            )}
            {enabled && (
              <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-brand-500 font-medium mb-1.5">{subtitle}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </div>
        {active && enabled && (
          <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
        )}
      </div>
    </button>
  );
}

// ── بوابة ترميز OS Section ────────────────────────────────────────

function NasaqGatewaySection({
  stats, statsLoading, txList, txLoading, statusFilter, setStatusFilter,
  settings, settingsLoading, form, tf, saving, saveMsg, handleSave,
}: any) {
  const [tab, setTab]             = useState<"transactions" | "settlement">("transactions");
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundMsg, setRefundMsg]     = useState<Record<string, string>>({});

  async function handleRefund(txId: string) {
    if (!(await confirmDialog({ title: "استرداد هذه الدفعة؟", message: "سيتم إرجاع المبلغ للعميل", confirmLabel: "استرداد", cancelLabel: "إلغاء", danger: true }))) return;
    setRefundingId(txId);
    try {
      await paymentsApi.refund(txId);
      setRefundMsg(p => ({ ...p, [txId]: "تم الاسترداد" }));
    } catch (e: any) {
      setRefundMsg(p => ({ ...p, [txId]: e.message || "حدث خطأ" }));
    } finally {
      setRefundingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#f1f5f9] rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<TrendingUp className="w-5 h-5 text-green-600" />}  bg="bg-green-50"  label="إجمالي المحصّل"    value={`${Number(stats?.totalPaid    ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`} />
          <KpiCard icon={<BadgeDollarSign className="w-5 h-5 text-brand-500" />} bg="bg-blue-50" label="بانتظار التسوية" value={`${Number(stats?.unsettledAmount ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س`} />
          <KpiCard icon={<Clock className="w-5 h-5 text-amber-600" />}       bg="bg-amber-50"  label="معاملات معلقة"   value={String(stats?.countPending ?? 0)} />
          <KpiCard icon={<XCircle className="w-5 h-5 text-red-500" />}       bg="bg-red-50"    label="معاملات فاشلة"   value={String(stats?.countFailed  ?? 0)} />
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex border-b border-[#eef2f6] gap-1">
        {(["transactions", "settlement"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t ? "border-b-2 border-brand-500 text-brand-500" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t === "transactions" ? "المعاملات" : "بيانات التسوية"}
          </button>
        ))}
      </div>

      {tab === "transactions" && (
        <div className="space-y-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {txLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-[#f1f5f9] rounded-2xl animate-pulse" />)}</div>
          ) : txList.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <CreditCard className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">لا توجد معاملات</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium">الوصف</th>
                    <th className="text-right px-4 py-3 font-medium">المبلغ</th>
                    <th className="text-right px-4 py-3 font-medium">الحالة</th>
                    <th className="text-right px-4 py-3 font-medium">وسيلة الدفع</th>
                    <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                    <th className="text-right px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txList.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-[#f8fafc]">
                      <td className="px-[10px] py-[6px] text-gray-700">{tx.description || "—"}</td>
                      <td className="px-[10px] py-[6px] font-medium">{Number(tx.merchantAmount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</td>
                      <td className="px-[10px] py-[6px]">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[tx.status] ?? "bg-gray-100"}`}>
                          {STATUS_LABELS[tx.status] ?? tx.status}
                        </span>
                      </td>
                      <td className="px-[10px] py-[6px] text-gray-500 capitalize">{tx.paymentMethod || "—"}</td>
                      <td className="px-[10px] py-[6px] text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleDateString("ar-SA")}</td>
                      <td className="px-[10px] py-[6px]">
                        {tx.status === "paid" && (
                          refundMsg[tx.id] ? (
                            <span className="text-xs text-green-600">{refundMsg[tx.id]}</span>
                          ) : (
                            <button
                              onClick={() => handleRefund(tx.id)}
                              disabled={refundingId === tx.id}
                              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                            >
                              {refundingId === tx.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                              استرداد
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "settlement" && (
        <div className="max-w-lg">
          {settingsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-[#f1f5f9] rounded-2xl animate-pulse" />)}</div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#eef2f6] p-6 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Landmark className="w-4 h-4" />
                الحساب البنكي للتسوية
              </h2>
              <p className="text-xs text-gray-400">سيتم تحويل مبالغ التسويات الدورية إلى هذا الحساب.</p>

              {[
                { field: "ibanNumber",  label: "رقم الآيبان", placeholder: "SA29 0000 0000 0000 0000 0000", dir: "ltr" },
                { field: "accountName", label: "اسم صاحب الحساب", placeholder: "الاسم كما في البطاقة" },
                { field: "bankName",    label: "اسم البنك", placeholder: "مثال: بنك الراجحي" },
              ].map(({ field, label, placeholder, dir }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    value={(form as any)[field]}
                    onChange={tf(field as any)}
                    placeholder={placeholder}
                    dir={dir as any}
                    className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-gray-500 mb-1">رسوم التوصيل الافتراضية (ر.س)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.defaultDeliveryFee}
                  onChange={e => setForm(p => ({ ...p, defaultDeliveryFee: e.target.value }))}
                  placeholder="0.00"
                  dir="ltr"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <p className="text-xs text-gray-400 mt-1">تُطبَّق تلقائياً على طلبات المتجر الإلكتروني إذا لم يحدد العميل غيرها</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saveMsg && <p className={`text-sm ${saveMsg === "تم الحفظ" ? "text-green-600" : "text-red-500"}`}>{saveMsg}</p>}
                <button onClick={handleSave} disabled={saving}
                  className="mr-auto flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  حفظ البيانات
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── بوابة خاصة Section ────────────────────────────────────────

function OwnGatewaySection({ navigate }: { navigate: (path: string) => void }) {
  const gateways = [
    { provider: "moyasar",    name: "ميسر",        logo: "M", color: "bg-green-100 text-green-700",  desc: "مدى، فيزا، ماستركارد، آبل باي" },
    { provider: "tap",        name: "Tap Payments", logo: "T", color: "bg-blue-100 text-blue-700",    desc: "فيزا، ماستركارد، STC Pay" },
    { provider: "hyperpay",   name: "HyperPay",     logo: "H", color: "bg-orange-100 text-orange-700", desc: "مدى، فيزا، ماستركارد" },
    { provider: "stripe",     name: "Stripe",       logo: "S", color: "bg-indigo-100 text-indigo-700", desc: "فيزا، ماستركارد، آبل باي، جوجل باي" },
    { provider: "myfatoorah", name: "MyFatoorah",   logo: "F", color: "bg-teal-100 text-teal-700",    desc: "K-Net، Benefit، مدى" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <Plug className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800 mb-0.5">ربط بوابة خاصة</p>
          <p className="text-xs text-blue-600">
            اربط بوابتك الخاصة من صفحة التكاملات. المال يُحوَّل مباشرة لحسابك دون أي وساطة من ترميز OS.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {gateways.map(g => (
          <button
            key={g.provider}
            onClick={() => navigate(`/dashboard/integrations`)}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#eef2f6] hover:border-brand-500/40 hover:shadow-sm transition-all text-right"
          >
            <div className={`w-10 h-10 ${g.color} rounded-xl flex items-center justify-center font-bold text-sm shrink-0`}>
              {g.logo}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{g.name}</p>
              <p className="text-xs text-gray-400 truncate">{g.desc}</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0" />
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate("/dashboard/integrations")}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#eef2f6] rounded-2xl text-sm text-gray-500 hover:border-brand-500/40 hover:text-brand-500 transition-colors"
      >
        <Settings className="w-4 h-4" />
        إدارة التكاملات والبوابات
      </button>
    </div>
  );
}

// ── Locked Section ────────────────────────────────────────────

function LockedSection({ title, description }: { title: string; description: string }) {
  const platform = usePlatformConfig();
  const phone = platform.supportPhone?.replace(/^0/, "") ?? "532064321";
  const email = platform.supportEmail ?? "info@tarmizos.com";
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-[#f1f5f9] rounded-2xl flex items-center justify-center mb-4">
        <Lock className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-700 mb-2">{title} — غير مفعّل</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6">{description}</p>
      <div className="flex flex-col items-center gap-2">
        <a
          href={`https://wa.me/966${phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors"
        >
          تواصل معنا لتفعيل الخدمة
        </a>
        <a
          href={`mailto:${email}`}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {email}
        </a>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] p-5">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
  );
}
