import { useState, useEffect } from "react";
import { toast } from "@/hooks/useToast";
import { CalendarCog, Save, AlertCircle, Clock, Globe, CreditCard, Shield, Calendar } from "lucide-react";
import { clsx } from "clsx";
import { settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Input, Toggle } from "@/components/ui";

const DAYS = [
  { key: 0, label: "الأحد" },
  { key: 1, label: "الاثنين" },
  { key: 2, label: "الثلاثاء" },
  { key: 3, label: "الأربعاء" },
  { key: 4, label: "الخميس" },
  { key: 5, label: "الجمعة" },
  { key: 6, label: "السبت" },
];

function Section({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#eef2f6] overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-brand-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0 mr-4">{children}</div>
    </div>
  );
}

const DEFAULT_SETTINGS = {
  allowOnlineBooking: true,
  requireDeposit: false,
  depositPercent: 30,
  advanceBookingDays: 180,
  minAdvanceHours: 24,
  cancellationPolicy: "",
  autoConfirm: false,
  workingHours: { start: "08:00", end: "22:00" },
  workingDays: [0, 1, 2, 3, 4, 6],
};

export function BookingSettingsPage() {
  const { data: res, loading } = useApi(() => settingsApi.bookingSettings(), []);
  const { mutate: updateSettings } = useMutation((d: any) => settingsApi.updateBookingSettings(d));

  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [dirty, setDirty]   = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (res?.data) {
      setSettings({ ...DEFAULT_SETTINGS, ...res.data });
      setDirty(false);
    }
  }, [res]);

  const set = (k: string, v: any) => { setSettings(p => ({ ...p, [k]: v })); setDirty(true); };
  const setHours = (k: "start" | "end", v: string) => {
    setSettings(p => ({ ...p, workingHours: { ...p.workingHours, [k]: v } }));
    setDirty(true);
  };
  const toggleDay = (d: number) => {
    setSettings(p => {
      const days = p.workingDays.includes(d)
        ? p.workingDays.filter(x => x !== d)
        : [...p.workingDays, d].sort((a, b) => a - b);
      return { ...p, workingDays: days };
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success("تم حفظ إعدادات الحجز");
      setDirty(false);
    } catch { toast.error("فشل الحفظ"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="space-y-5 max-w-2xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#eef2f6] p-6 animate-pulse space-y-4">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-10 bg-[#f1f5f9] rounded-xl" />
            <div className="h-10 bg-[#f1f5f9] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCog className="w-5 h-5 text-brand-500" /> إعدادات الحجز
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">تحكم في آلية استقبال ومعالجة الحجوزات</p>
        </div>
        <Button icon={Save} onClick={handleSave} loading={saving} disabled={!dirty}>
          حفظ الإعدادات
        </Button>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>لديك تغييرات غير محفوظة — احرص على الحفظ قبل المغادرة</span>
        </div>
      )}

      {/* Online Booking */}
      <Section title="الحجز الإلكتروني" subtitle="إعدادات استقبال الحجوزات عبر الموقع" icon={Globe}>
        <SettingRow label="تفعيل الحجز الإلكتروني" description="السماح للعملاء بالحجز مباشرة من الموقع">
          <Toggle checked={settings.allowOnlineBooking} onChange={v => set("allowOnlineBooking", v)} />
        </SettingRow>
        <SettingRow label="تأكيد تلقائي" description="تأكيد الحجوزات فوراً دون مراجعة يدوية">
          <Toggle checked={settings.autoConfirm} onChange={v => set("autoConfirm", v)} />
        </SettingRow>
      </Section>

      {/* Timing */}
      <Section title="المواعيد والمُهل الزمنية" subtitle="إدارة المدى الزمني المسموح للحجوزات" icon={Clock}>
        <div className="space-y-4">
          <SettingRow label="الحد الأقصى للحجز المسبق (يوم)"
            description="أقصى عدد أيام يمكن الحجز مسبقاً">
            <input type="number" min={1} max={730} value={settings.advanceBookingDays}
              onChange={e => set("advanceBookingDays", parseInt(e.target.value) || 180)}
              className="w-20 border border-[#eef2f6] rounded-xl px-3 py-1.5 text-sm text-center outline-none focus:border-brand-300 tabular-nums" dir="ltr" />
          </SettingRow>
          <SettingRow label="الحد الأدنى للحجز المسبق (ساعة)"
            description="أقل مدة مسموح بها قبل موعد الفعالية">
            <input type="number" min={0} max={168} value={settings.minAdvanceHours}
              onChange={e => set("minAdvanceHours", parseInt(e.target.value) || 0)}
              className="w-20 border border-[#eef2f6] rounded-xl px-3 py-1.5 text-sm text-center outline-none focus:border-brand-300 tabular-nums" dir="ltr" />
          </SettingRow>
        </div>
      </Section>

      {/* Working Hours */}
      <Section title="أوقات العمل" subtitle="الأيام والساعات المتاحة لاستقبال الحجوزات" icon={Calendar}>
        <div className="space-y-5">
          {/* Days */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">أيام العمل</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(d => {
                const active = settings.workingDays.includes(d.key);
                return (
                  <button key={d.key} onClick={() => toggleDay(d.key)}
                    className={clsx("px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                      active
                        ? "bg-brand-500 border-brand-500 text-white shadow-sm"
                        : "border-[#eef2f6] text-gray-500 hover:border-[#eef2f6]")}>
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Hours */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">ساعات العمل</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">من</label>
                <input type="time" value={settings.workingHours.start}
                  onChange={e => setHours("start", e.target.value)}
                  className="border border-[#eef2f6] rounded-xl px-3 py-1.5 text-sm outline-none focus:border-brand-300" dir="ltr" />
              </div>
              <span className="text-gray-300">—</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">إلى</label>
                <input type="time" value={settings.workingHours.end}
                  onChange={e => setHours("end", e.target.value)}
                  className="border border-[#eef2f6] rounded-xl px-3 py-1.5 text-sm outline-none focus:border-brand-300" dir="ltr" />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Deposit */}
      <Section title="الدفعة المقدمة" subtitle="اشتراط دفع مقدم لتأكيد الحجز" icon={CreditCard}>
        <div className="space-y-4">
          <SettingRow label="اشتراط دفعة مقدمة" description="يلزم العميل بدفع نسبة مئوية لتأكيد الحجز">
            <Toggle checked={settings.requireDeposit} onChange={v => set("requireDeposit", v)} />
          </SettingRow>
          {settings.requireDeposit && (
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نسبة الدفعة المقدمة: <span className="text-brand-600 font-bold">{settings.depositPercent}%</span>
              </label>
              <div className="flex items-center gap-4">
                <input type="range" min={10} max={100} step={5} value={settings.depositPercent}
                  onChange={e => set("depositPercent", parseInt(e.target.value))}
                  className="flex-1 accent-brand-500" />
                <input type="number" min={10} max={100} value={settings.depositPercent}
                  onChange={e => set("depositPercent", Math.min(100, Math.max(10, parseInt(e.target.value) || 30)))}
                  className="w-16 border border-[#eef2f6] rounded-xl px-2 py-1.5 text-sm text-center outline-none focus:border-brand-300 tabular-nums" dir="ltr" />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Cancellation Policy */}
      <Section title="سياسة الإلغاء" subtitle="نص السياسة الظاهر للعملاء عند الحجز" icon={Shield}>
        <div className="space-y-2">
          <textarea value={settings.cancellationPolicy}
            onChange={e => { set("cancellationPolicy", e.target.value); }}
            rows={5}
            placeholder="مثال: يحق للعميل إلغاء الحجز قبل 72 ساعة من موعد الفعالية واسترداد الدفعة المقدمة بالكامل. في حال الإلغاء خلال 72 ساعة، لا يُستردّ المبلغ..."
            className="w-full border border-[#eef2f6] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-300 resize-none leading-relaxed"
          />
          <p className="text-xs text-gray-400">يظهر هذا النص للعملاء في صفحة الحجز وفي رسائل التأكيد</p>
        </div>
      </Section>    </div>
  );
}
