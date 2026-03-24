import { useState, useEffect } from "react";
import { toast } from "@/hooks/useToast";
import {
  User, Lock, Shield, Monitor, Smartphone, Globe, LogOut,
  Save, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle,
  Upload, X, Clock, MapPin, Key, Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { authApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Button, Input } from "@/components/ui";
import { MediaPickerModal } from "@/components/media/MediaPickerModal";

// ── helpers ────────────────────────────────────────────────────────────────

function getStoredUser(): any {
  try { return JSON.parse(localStorage.getItem("nasaq_user") || "{}"); } catch { return {}; }
}

function syncLocalUser(patch: Partial<{ name: string; email: string; avatar: string }>) {
  try {
    const u = getStoredUser();
    localStorage.setItem("nasaq_user", JSON.stringify({ ...u, ...patch }));
  } catch {}
}

function getDeviceIcon(device: string) {
  if (/mobile|android|iphone/i.test(device)) return Smartphone;
  if (/postman|curl|api/i.test(device)) return Globe;
  return Monitor;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-SA");
}

// ── password strength ───────────────────────────────────────────────────────

type StrengthRule = { label: string; test: (p: string) => boolean };
const STRENGTH_RULES: StrengthRule[] = [
  { label: "8 أحرف على الأقل",         test: p => p.length >= 8 },
  { label: "حرف كبير (A-Z)",            test: p => /[A-Z]/.test(p) },
  { label: "حرف صغير (a-z)",            test: p => /[a-z]/.test(p) },
  { label: "رقم (0-9)",                 test: p => /\d/.test(p) },
  { label: "رمز خاص (!@#$...)",        test: p => /[^A-Za-z0-9]/.test(p) },
];
function calcStrength(p: string): number {
  return STRENGTH_RULES.filter(r => r.test(p)).length;
}
const STRENGTH_META = [
  { label: "",         color: "bg-gray-200" },
  { label: "ضعيفة جداً", color: "bg-red-500" },
  { label: "ضعيفة",    color: "bg-orange-500" },
  { label: "مقبولة",   color: "bg-yellow-500" },
  { label: "جيدة",     color: "bg-blue-500" },
  { label: "قوية",     color: "bg-emerald-500" },
];

// ── sub-components ──────────────────────────────────────────────────────────

function Section({
  title, subtitle, icon: Icon, children,
}: { title: string; subtitle?: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-brand-500" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function PasswordInput({
  label, name, value, onChange, placeholder,
}: { label: string; name: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || "••••••••••••"}
          dir="ltr"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 pr-10 transition-all"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── main page ───────────────────────────────────────────────────────────────

export function AccountPage() {
  const storedUser = getStoredUser();
  const { context: orgCtx } = useOrgContext();

  // ── profile state
  const [profile, setProfile] = useState({
    name: storedUser.name || "",
    email: storedUser.email || "",
    avatar: storedUser.avatar || "",
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarPicker, setAvatarPicker] = useState(false);

  // ── password state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  // ── sessions
  const { data: sessionsRes, loading: sessionsLoading, refetch: refetchSessions } =
    useApi(() => authApi.sessions(), []);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const sessions: any[] = sessionsRes?.data || [];
  const currentToken = localStorage.getItem("nasaq_token") || "";

  // ── sync profile from /auth/me on mount
  const { data: meRes } = useApi(() => authApi.me(), []);
  useEffect(() => {
    if (meRes?.data) {
      const me = meRes.data;
      setProfile({ name: me.name || "", email: me.email || "", avatar: me.avatar || "" });
    }
  }, [meRes]);

  // ── role label
  const roleLabel: Record<string, string> = {
    owner: "مالك المنشأة", admin: "مسؤول", manager: "مدير",
    branch_manager: "مدير فرع", staff: "موظف", operator: "مشغّل",
  };
  const userRole = storedUser.role || storedUser.type || "owner";

  // ── password strength
  const strength = calcStrength(pwForm.next);
  const strengthMeta = STRENGTH_META[strength] || STRENGTH_META[0];

  // ── handlers
  const pf = (k: keyof typeof profile, v: string) => {
    setProfile(p => ({ ...p, [k]: v }));
    setProfileDirty(true);
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) { toast.error("الاسم مطلوب"); return; }
    setSavingProfile(true);
    try {
      const res = await authApi.updateMe(profile);
      syncLocalUser(res.data);
      toast.success("تم تحديث بياناتك بنجاح");
      setProfileDirty(false);
    } catch (err: any) {
      toast.error(err.message?.includes("مستخدم") ? "البريد الإلكتروني مستخدم بالفعل" : "فشل الحفظ");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!pwForm.current) { setPwError("أدخل كلمة المرور الحالية"); return; }
    if (strength < 3)    { setPwError("كلمة المرور الجديدة ضعيفة جداً"); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("كلمتا المرور غير متطابقتين"); return; }
    setSavingPw(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      toast.success("تم تغيير كلمة المرور بنجاح");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      const msg = err.message || "";
      setPwError(msg.includes("غير صحيحة") || msg.includes("incorrect") ? "كلمة المرور الحالية غير صحيحة" : "فشل تغيير كلمة المرور");
    } finally {
      setSavingPw(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await authApi.deleteSession(id);
      toast.success("تم إنهاء الجلسة");
      refetchSessions();
    } catch { toast.error("فشل إنهاء الجلسة"); }
    finally { setRevokingId(null); }
  };

  const initials = profile.name
    ? profile.name.trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "م";

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-500" />
            حسابي
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">بياناتك الشخصية وإعدادات الأمان</p>
        </div>
      </div>

      {/* ── Profile Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Avatar banner */}
        <div className="h-20 bg-gradient-to-l from-brand-600 to-brand-400 relative" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end gap-4 -mt-10 mb-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl border-4 border-white bg-brand-100 flex items-center justify-center overflow-hidden shadow-md">
                {profile.avatar
                  ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-brand-600">{initials}</span>
                }
              </div>
              <button
                onClick={() => setAvatarPicker(true)}
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-900">{profile.name || "—"}</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium border border-brand-100">
                  {roleLabel[userRole] || userRole}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{profile.email || storedUser.phone || "—"}</p>
            </div>
          </div>

          {/* Unsaved notice */}
          {profileDirty && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>لديك تغييرات غير محفوظة</span>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="الاسم الكامل"
                name="name"
                value={profile.name}
                onChange={e => pf("name", e.target.value)}
                placeholder="اسمك الكامل"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">رقم الجوال</label>
                <div className="flex items-center px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 gap-2" dir="ltr">
                  <span>{storedUser.phone || "—"}</span>
                  <span className="mr-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">لا يمكن التغيير</span>
                </div>
              </div>

              {orgCtx?.orgCode && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">الرقم المرجعي للمنشأة</label>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-brand-100 bg-brand-50">
                    <Key className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="font-mono font-semibold text-brand-700 tracking-widest text-sm" dir="ltr">{orgCtx.orgCode}</span>
                    <span className="mr-auto text-xs text-brand-400 bg-brand-100 px-2 py-0.5 rounded-full">مرجع ثابت</span>
                  </div>
                  <p className="text-xs text-gray-400">يُستخدم في الفواتير والتقارير والدعم الفني</p>
                </div>
              )}
            </div>

            <Input
              label="البريد الإلكتروني"
              name="email"
              value={profile.email}
              onChange={e => pf("email", e.target.value)}
              placeholder="example@domain.com"
              dir="ltr"
            />

            {profile.avatar && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                <img src={profile.avatar} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{profile.avatar}</p>
                </div>
                <button
                  onClick={() => pf("avatar", "")}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                icon={Save}
                onClick={handleSaveProfile}
                loading={savingProfile}
                disabled={!profileDirty}
              >
                حفظ البيانات
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password ── */}
      <Section title="تغيير كلمة المرور" subtitle="يُنصح بتغييرها دورياً للحفاظ على أمان حسابك" icon={Lock}>
        <div className="space-y-4">
          <PasswordInput
            label="كلمة المرور الحالية"
            name="current"
            value={pwForm.current}
            onChange={v => setPwForm(p => ({ ...p, current: v }))}
          />

          <div className="space-y-2">
            <PasswordInput
              label="كلمة المرور الجديدة"
              name="next"
              value={pwForm.next}
              onChange={v => { setPwForm(p => ({ ...p, next: v })); setPwError(""); }}
              placeholder="أدخل كلمة مرور قوية"
            />

            {/* Strength bar */}
            {pwForm.next.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className={clsx(
                        "h-1.5 flex-1 rounded-full transition-all duration-300",
                        i <= strength ? strengthMeta.color : "bg-gray-100"
                      )}
                    />
                  ))}
                </div>
                {strength > 0 && (
                  <p className={clsx("text-xs font-medium", {
                    "text-red-500": strength <= 2,
                    "text-yellow-600": strength === 3,
                    "text-blue-600": strength === 4,
                    "text-emerald-600": strength === 5,
                  })}>
                    {strengthMeta.label}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                  {STRENGTH_RULES.map(rule => (
                    <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                      {rule.test(pwForm.next)
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      }
                      <span className={rule.test(pwForm.next) ? "text-emerald-600" : "text-gray-400"}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <PasswordInput
            label="تأكيد كلمة المرور"
            name="confirm"
            value={pwForm.confirm}
            onChange={v => { setPwForm(p => ({ ...p, confirm: v })); setPwError(""); }}
            placeholder="أعد كتابة كلمة المرور"
          />

          {/* match indicator */}
          {pwForm.confirm.length > 0 && (
            <div className={clsx("flex items-center gap-1.5 text-xs", pwForm.next === pwForm.confirm ? "text-emerald-600" : "text-red-500")}>
              {pwForm.next === pwForm.confirm
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> كلمتا المرور متطابقتان</>
                : <><XCircle className="w-3.5 h-3.5" /> كلمتا المرور غير متطابقتين</>
              }
            </div>
          )}

          {pwError && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button
              icon={Key}
              onClick={handleChangePassword}
              loading={savingPw}
              disabled={!pwForm.current || !pwForm.next || !pwForm.confirm}
            >
              تحديث كلمة المرور
            </Button>
          </div>
        </div>
      </Section>

      {/* ── Active Sessions ── */}
      <Section
        title="الجلسات النشطة"
        subtitle={`${sessions.length} جلسة مفتوحة على أجهزتك`}
        icon={Shield}
      >
        {sessionsLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                  <div className="h-3 w-28 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">لا توجد جلسات نشطة</div>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s: any) => {
              const DeviceIcon = getDeviceIcon(s.device || "");
              const isCurrent = s.token === currentToken || s.isCurrent;
              return (
                <div
                  key={s.id}
                  className={clsx(
                    "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                    isCurrent
                      ? "border-brand-200 bg-brand-50"
                      : "border-gray-100 bg-white hover:bg-gray-50"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isCurrent ? "bg-brand-100" : "bg-gray-100"
                  )}>
                    <DeviceIcon className={clsx("w-5 h-5", isCurrent ? "text-brand-500" : "text-gray-400")} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 truncate max-w-xs">
                        {s.device || "جهاز غير معروف"}
                      </p>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 text-xs font-medium shrink-0">
                          الجلسة الحالية
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      {s.ip && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {s.ip}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(s.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <LogOut className="w-3 h-3" />
                        تنتهي {new Date(s.expiresAt).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      disabled={revokingId === s.id}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-100 text-red-500 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {revokingId === s.id
                        ? <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                      إنهاء
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {sessions.filter((s: any) => s.token !== currentToken && !s.isCurrent).length > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={async () => {
                const others = sessions.filter((s: any) => s.token !== currentToken && !s.isCurrent);
                for (const s of others) await authApi.deleteSession(s.id).catch(() => {});
                toast.success("تم إنهاء جميع الجلسات الأخرى");
                refetchSessions();
              }}
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              إنهاء جميع الجلسات الأخرى
            </button>
          </div>
        )}
      </Section>

      {/* ── Media picker ── */}
      {avatarPicker && (
        <MediaPickerModal
          accept="image"
          title="اختر صورة الملف الشخصي"
          onSelect={asset => { pf("avatar", asset.fileUrl); setAvatarPicker(false); }}
          onClose={() => setAvatarPicker(false)}
        />
      )}
    </div>
  );
}
