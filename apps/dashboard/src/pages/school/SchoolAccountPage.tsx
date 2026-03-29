import { useState } from "react";
import {
  User, Lock, Shield, Monitor, Smartphone, Globe, LogOut,
  Save, Eye, EyeOff, Clock, Key, GraduationCap, Building2,
  MapPin, Phone, Mail, BookOpen,
} from "lucide-react";
import { clsx } from "clsx";
import { authApi, settingsApi, schoolApi } from "@/lib/api";
import { fmtHijri } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { useOrgContext } from "@/hooks/useOrgContext";
import { toast } from "@/hooks/useToast";
import { invalidateOrgContextCache } from "@/hooks/useOrgContext";
import { useNavigate } from "react-router-dom";

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  "ابتدائية": "المرحلة الابتدائية",
  "متوسطة":   "المرحلة المتوسطة",
  "ثانوية":   "المرحلة الثانوية",
  "شاملة":    "مدرسة شاملة (كل المراحل)",
};

const SCHOOL_TYPE_MAP: Record<string, string> = {
  "حكومية":  "حكومية",
  "أهلية":   "أهلية",
  "دولية":   "دولية",
};

function getStoredUser(): any {
  try { return JSON.parse(localStorage.getItem("nasaq_user") || sessionStorage.getItem("nasaq_user") || "{}"); }
  catch { return {}; }
}

function getDeviceIcon(device: string) {
  if (/mobile|android|iphone|ipad/i.test(device)) return Smartphone;
  if (/postman|curl|api/i.test(device)) return Globe;
  return Monitor;
}

function parseDevice(ua: string): string {
  if (!ua) return "جهاز غير معروف";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) { const m = ua.match(/Android[^;]*;\s*([^)]+)\)/); return m ? m[1].trim() : "Android"; }
  const os = /Windows NT 10/i.test(ua) ? "Windows 10"
    : /Mac OS X/i.test(ua) ? "macOS"
    : /Linux/i.test(ua) ? "Linux" : "جهاز غير معروف";
  const browser = /Chrome\//i.test(ua) ? "Chrome"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Safari\//i.test(ua) ? "Safari" : "متصفح";
  return `${browser} — ${os}`;
}

// ─── Card wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, dir }: {
  value: string; onChange: (v: string) => void; placeholder?: string; dir?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-colors"
    />
  );
}

function ReadonlyField({ value, badge }: { value: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500" dir="ltr">
      <span>{value}</span>
      {badge && <span className="mr-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{badge}</span>}
    </div>
  );
}

export function SchoolAccountPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const { context } = useOrgContext();

  // Profile
  const [profile, setProfile] = useState({ name: storedUser.name || "", email: storedUser.email || "" });
  const [profileDirty, setProfileDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const pf = (k: keyof typeof profile, v: string) => { setProfile(p => ({ ...p, [k]: v })); setProfileDirty(true); };

  // School settings
  const { data: settingsRes, refetch: refetchSettings } = useApi(() => schoolApi.getSettings(), []);
  const schoolData = settingsRes?.data ?? {};
  const [schoolForm, setSchoolForm] = useState<any>(null);
  const [savingSchool, setSavingSchool] = useState(false);

  const sf = (k: string, v: string) => setSchoolForm((prev: any) => ({ ...(prev ?? schoolData), [k]: v }));
  const currentSchool = schoolForm ?? schoolData;

  // Password
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);

  // Sessions
  const { data: sessionsRes, refetch: refetchSessions } = useApi(() => authApi.sessions(), []);
  const sessions: any[] = sessionsRes?.data ?? [];

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await authApi.updateMe({ name: profile.name, email: profile.email || undefined });
      const u = getStoredUser();
      const updated = { ...u, name: profile.name, email: profile.email };
      localStorage.setItem("nasaq_user", JSON.stringify(updated));
      setProfileDirty(false);
      toast.success("تم حفظ البيانات");
    } catch (e: any) { toast.error(e.message || "تعذّر الحفظ"); }
    finally { setSavingProfile(false); }
  };

  const handleSaveSchool = async () => {
    setSavingSchool(true);
    try {
      await schoolApi.saveSettings(currentSchool);
      refetchSettings();
      setSchoolForm(null);
      toast.success("تم حفظ بيانات المدرسة");
    } catch (e: any) { toast.error(e.message || "تعذّر الحفظ"); }
    finally { setSavingSchool(false); }
  };

  const handleChangePwd = async () => {
    if (!pwd.current || !pwd.next) { toast.error("أدخل كلمة المرور الحالية والجديدة"); return; }
    if (pwd.next !== pwd.confirm) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    if (pwd.next.length < 6) { toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setSavingPwd(true);
    try {
      await authApi.changePassword(pwd.current, pwd.next);
      setPwd({ current: "", next: "", confirm: "" });
      toast.success("تم تحديث كلمة المرور");
    } catch (e: any) { toast.error(e.message || "كلمة المرور الحالية غير صحيحة"); }
    finally { setSavingPwd(false); }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await authApi.deleteSession(sessionId);
      refetchSessions();
      toast.success("تم إنهاء الجلسة");
    } catch (e: any) { toast.error(e.message || "تعذّر إنهاء الجلسة"); }
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    ["nasaq_token","nasaq_org_id","nasaq_user_id","nasaq_user"].forEach(k => {
      localStorage.removeItem(k); sessionStorage.removeItem(k);
    });
    invalidateOrgContextCache();
    navigate("/school/login", { replace: true });
  };

  return (
    <div dir="rtl" className="space-y-0">

      {/* Banner — dark hero matching landing */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 px-6 pt-8 pb-10">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-28 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{storedUser.name || "حسابي"}</h1>
            <p className="text-sm text-emerald-400 mt-0.5">إدارة بيانات الحساب والمدرسة</p>
            {context?.orgCode && (
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest" dir="ltr">{context.orgCode}</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 bg-gray-50">

        {/* ── Personal Info ── */}
        <Section title="البيانات الشخصية" subtitle="اسمك ورقم جوالك في نسق" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الاسم الكامل">
              <TextInput value={profile.name} onChange={v => pf("name", v)} placeholder="اسمك الكامل" />
            </Field>
            <Field label="رقم الجوال">
              <ReadonlyField value={storedUser.phone || "—"} badge="لا يمكن التغيير" />
            </Field>
            <Field label="البريد الإلكتروني">
              <TextInput value={profile.email} onChange={v => pf("email", v)} placeholder="example@domain.com" dir="ltr" />
            </Field>
            {context?.orgCode && (
              <Field label="رمز المنشأة">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-emerald-100 bg-emerald-50">
                  <Key className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-mono font-bold text-emerald-700 tracking-widest text-sm" dir="ltr">{context.orgCode}</span>
                  <span className="mr-auto text-xs text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full">مرجع ثابت</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">يُستخدم في التقارير والدعم الفني</p>
              </Field>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={!profileDirty || savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? "جاري الحفظ..." : "حفظ البيانات"}
            </button>
          </div>
        </Section>

        {/* ── School Settings ── */}
        <Section title="بيانات المدرسة" subtitle="الاسم والنوع والمرحلة التعليمية" icon={Building2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="اسم المدرسة">
              <TextInput value={currentSchool.schoolName || ""} onChange={v => sf("schoolName", v)} placeholder="اسم المدرسة الرسمي" />
            </Field>
            <Field label="رقم المدرسة">
              <TextInput value={currentSchool.schoolPhone || ""} onChange={v => sf("schoolPhone", v)} placeholder="05xxxxxxxx" dir="ltr" />
            </Field>
            <Field label="نوع المدرسة">
              <select
                value={currentSchool.schoolType || ""}
                onChange={e => sf("schoolType", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">اختر النوع</option>
                {Object.entries(SCHOOL_TYPE_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="المرحلة التعليمية">
              <select
                value={currentSchool.educationLevel || ""}
                onChange={e => sf("educationLevel", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="">اختر المرحلة</option>
                {Object.entries(EDUCATION_LEVEL_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="المنطقة">
              <TextInput value={currentSchool.schoolRegion || ""} onChange={v => sf("schoolRegion", v)} placeholder="منطقة الرياض" />
            </Field>
            <Field label="البريد الإلكتروني للمدرسة">
              <TextInput value={currentSchool.schoolEmail || ""} onChange={v => sf("schoolEmail", v)} placeholder="school@domain.com" dir="ltr" />
            </Field>
            <Field label="عنوان المدرسة">
              <TextInput value={currentSchool.schoolAddress || ""} onChange={v => sf("schoolAddress", v)} placeholder="الحي، الشارع" />
            </Field>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSaveSchool}
              disabled={savingSchool}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              {savingSchool ? "جاري الحفظ..." : "حفظ بيانات المدرسة"}
            </button>
          </div>
        </Section>

        {/* ── Password ── */}
        <Section title="كلمة المرور" subtitle="يُنصح بتغييرها دورياً للحفاظ على أمان حسابك" icon={Lock}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["current", "next", "confirm"] as const).map((k) => (
              <Field key={k} label={k === "current" ? "كلمة المرور الحالية" : k === "next" ? "كلمة المرور الجديدة" : "تأكيد كلمة المرور"}>
                <div className="relative">
                  <input
                    type={showPwd[k] ? "text" : "password"}
                    value={pwd[k]}
                    onChange={e => setPwd(p => ({ ...p, [k]: e.target.value }))}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => ({ ...p, [k]: !p[k] }))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleChangePwd}
              disabled={savingPwd}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              <Shield className="w-4 h-4" />
              {savingPwd ? "جاري التحديث..." : "تحديث كلمة المرور"}
            </button>
          </div>
        </Section>

        {/* ── Sessions ── */}
        <Section title="الجلسات النشطة" subtitle={`${sessions.length} جلسة مفتوحة على أجهزتك`} icon={Shield}>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">لا توجد جلسات نشطة</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s: any) => {
                const DevIcon = getDeviceIcon(s.userAgent || "");
                const isCurrent = s.isCurrent;
                return (
                  <div key={s.id} className={clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
                    isCurrent ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-white hover:bg-gray-50"
                  )}>
                    <DevIcon className={clsx("w-5 h-5 shrink-0", isCurrent ? "text-emerald-600" : "text-gray-400")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{parseDevice(s.userAgent || "")}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                        {s.ipAddress && <span dir="ltr">{s.ipAddress}</span>}
                        {s.lastUsedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {fmtHijri(s.lastUsedAt)}
                          </span>
                        )}
                        {s.expiresAt && (
                          <span>تنتهي {fmtHijri(s.expiresAt)}</span>
                        )}
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">الجلسة الحالية</span>
                    ) : (
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      >
                        إنهاء
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Logout */}
          <div className="mt-5 pt-4 border-t border-gray-50">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج من جميع الأجهزة
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
