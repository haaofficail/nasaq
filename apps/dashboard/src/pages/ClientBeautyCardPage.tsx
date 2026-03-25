import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi, useMutation } from "@/hooks/useApi";
import { salonApi, customersApi } from "@/lib/api";
import {
  ArrowRight, Sparkles, AlertTriangle, Heart, User,
  Clock, Pencil, Check, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { clsx } from "clsx";
import { fmtDate } from "@/lib/utils";

const HAIR_TYPES   = ["straight", "wavy", "curly", "coily"];
const HAIR_LABELS: Record<string, string> = { straight: "ناعم مستقيم", wavy: "موجي", curly: "مجعد", coily: "مجعد كثيف" };
const HAIR_COND    = ["healthy", "damaged", "color_treated", "bleached", "dry", "oily"];
const HAIR_COND_AR: Record<string, string> = { healthy: "سليم", damaged: "تالف", color_treated: "مصبوغ", bleached: "مبيض", dry: "جاف", oily: "دهني" };
const SKIN_TYPES   = ["normal", "oily", "dry", "combination", "sensitive"];
const SKIN_LABELS: Record<string, string> = { normal: "عادي", oily: "دهني", dry: "جاف", combination: "مختلط", sensitive: "حساس" };

// ============================================================
// Editable Section Wrapper
// ============================================================
function Section({ title, icon: Icon, color, children, editing, onEdit, onSave, onCancel }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className={clsx("flex items-center justify-between px-5 py-3 border-b border-gray-50", color || "bg-gray-50/50")}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-semibold text-sm text-gray-800">{title}</span>
        </div>
        {editing ? (
          <div className="flex gap-1">
            <button onClick={onCancel} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button onClick={onSave} className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ) : (
          <button onClick={onEdit} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, value, empty = "غير محدد" }: { label: string; value?: string | null; empty?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={clsx("text-sm", value ? "text-gray-900 font-medium" : "text-gray-300 italic")}>{value || empty}</p>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export function ClientBeautyCardPage() {
  const { id: customerId } = useParams<{ id: string }>();

  const { data: customerRes } = useApi(() => customersApi.get(customerId!), [customerId]);
  const { data: beautyRes, refetch } = useApi(() => salonApi.beautyProfile(customerId!), [customerId]);

  const customer  = customerRes?.data;
  const profile   = beautyRes?.data?.profile || {};
  const visits    = beautyRes?.data?.recentVisits || [];

  // Local edit state mirrors the profile fields
  const [editHair, setEditHair]   = useState(false);
  const [editSkin, setEditSkin]   = useState(false);
  const [editAlert, setEditAlert] = useState(false);
  const [editPref, setEditPref]   = useState(false);

  const [hairDraft, setHairDraft] = useState<any>({});
  const [skinDraft, setSkinDraft] = useState<any>({});
  const [alertDraft, setAlertDraft] = useState<any>({});
  const [prefDraft, setPrefDraft]  = useState<any>({});

  const { mutate: saveProfile } = useMutation((data: any) => salonApi.saveBeautyProfile(customerId!, data));

  const startEdit = (section: string) => {
    if (section === "hair")  { setHairDraft({ hairType: profile.hairType, hairTexture: profile.hairTexture, hairCondition: profile.hairCondition, naturalColor: profile.naturalColor, currentColor: profile.currentColor }); setEditHair(true); }
    if (section === "skin")  { setSkinDraft({ skinType: profile.skinType, skinConcerns: profile.skinConcerns }); setEditSkin(true); }
    if (section === "alert") { setAlertDraft({ allergies: profile.allergies, sensitivities: profile.sensitivities, medicalNotes: profile.medicalNotes }); setEditAlert(true); }
    if (section === "pref")  { setPrefDraft({ preferences: profile.preferences, avoidNotes: profile.avoidNotes, lastFormula: profile.lastFormula }); setEditPref(true); }
  };

  const save = async (section: string, draft: any) => {
    await saveProfile({ ...profile, ...draft });
    refetch();
    if (section === "hair")  setEditHair(false);
    if (section === "skin")  setEditSkin(false);
    if (section === "alert") setEditAlert(false);
    if (section === "pref")  setEditPref(false);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/dashboard/customers/${customerId}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-500" />
            بطاقة الجمال
          </h1>
          <p className="text-sm text-gray-400">{customer?.name}</p>
        </div>
      </div>

      {/* Last Formula Banner */}
      {profile.lastFormula && (
        <div className="bg-brand-50 border border-brand-100 rounded-2xl px-5 py-3">
          <p className="text-xs font-semibold text-brand-400 mb-0.5">آخر فورمولا مستخدمة</p>
          <p className="text-sm font-bold text-brand-700">{profile.lastFormula}</p>
        </div>
      )}

      {/* Alerts first — most critical */}
      <Section
        title="تنبيهات طبية وحساسيات"
        icon={AlertTriangle}
        color="bg-red-50/60"
        editing={editAlert}
        onEdit={() => startEdit("alert")}
        onSave={() => save("alert", alertDraft)}
        onCancel={() => setEditAlert(false)}
      >
        {editAlert ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">حساسية لمنتجات</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={alertDraft.allergies || ""} onChange={e => setAlertDraft((d: any) => ({ ...d, allergies: e.target.value }))}
                placeholder="مثال: أوكسيجين 40 درجة، البيروكسيد" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">حساسية في الجسم</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={alertDraft.sensitivities || ""} onChange={e => setAlertDraft((d: any) => ({ ...d, sensitivities: e.target.value }))}
                placeholder="مثال: فروة الرأس حساسة جداً" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">ملاحظات طبية</label>
              <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2}
                value={alertDraft.medicalNotes || ""} onChange={e => setAlertDraft((d: any) => ({ ...d, medicalNotes: e.target.value }))} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <Field label="حساسية لمنتجات" value={profile.allergies} empty="لا توجد حساسيات مسجلة" />
            <Field label="حساسية في الجسم" value={profile.sensitivities} />
            <Field label="ملاحظات طبية" value={profile.medicalNotes} />
          </div>
        )}
      </Section>

      {/* Hair Profile */}
      <Section
        title="ملف الشعر"
        icon={Sparkles}
        color="bg-violet-50/60"
        editing={editHair}
        onEdit={() => startEdit("hair")}
        onSave={() => save("hair", hairDraft)}
        onCancel={() => setEditHair(false)}
      >
        {editHair ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">نوع الشعر</label>
              <div className="flex gap-2 flex-wrap">
                {HAIR_TYPES.map(t => (
                  <button key={t}
                    className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium border",
                      hairDraft.hairType === t ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
                    onClick={() => setHairDraft((d: any) => ({ ...d, hairType: t }))}
                  >{HAIR_LABELS[t]}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">حالة الشعر</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                  value={hairDraft.hairCondition || ""}
                  onChange={e => setHairDraft((d: any) => ({ ...d, hairCondition: e.target.value }))}>
                  <option value="">—</option>
                  {HAIR_COND.map(c => <option key={c} value={c}>{HAIR_COND_AR[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">اللون الطبيعي</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  value={hairDraft.naturalColor || ""} onChange={e => setHairDraft((d: any) => ({ ...d, naturalColor: e.target.value }))}
                  placeholder="بني داكن" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">اللون الحالي</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={hairDraft.currentColor || ""} onChange={e => setHairDraft((d: any) => ({ ...d, currentColor: e.target.value }))}
                placeholder="بلاتيني مع بالياج ذهبي" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="نوع الشعر" value={profile.hairType ? HAIR_LABELS[profile.hairType] || profile.hairType : null} />
            <Field label="حالة الشعر" value={profile.hairCondition ? HAIR_COND_AR[profile.hairCondition] || profile.hairCondition : null} />
            <Field label="اللون الطبيعي" value={profile.naturalColor} />
            <Field label="اللون الحالي" value={profile.currentColor} />
          </div>
        )}
      </Section>

      {/* Skin Profile */}
      <Section
        title="ملف البشرة"
        icon={User}
        color="bg-pink-50/60"
        editing={editSkin}
        onEdit={() => startEdit("skin")}
        onSave={() => save("skin", skinDraft)}
        onCancel={() => setEditSkin(false)}
      >
        {editSkin ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">نوع البشرة</label>
              <div className="flex gap-2 flex-wrap">
                {SKIN_TYPES.map(t => (
                  <button key={t}
                    className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium border",
                      skinDraft.skinType === t ? "bg-brand-500 text-white border-brand-500" : "border-gray-200 text-gray-600 hover:bg-gray-50")}
                    onClick={() => setSkinDraft((d: any) => ({ ...d, skinType: t }))}
                  >{SKIN_LABELS[t]}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">المشاكل</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={skinDraft.skinConcerns || ""} onChange={e => setSkinDraft((d: any) => ({ ...d, skinConcerns: e.target.value }))}
                placeholder="مسامات، تصبغات، حب شباب" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="نوع البشرة" value={profile.skinType ? SKIN_LABELS[profile.skinType] || profile.skinType : null} />
            <Field label="المشاكل" value={profile.skinConcerns} />
          </div>
        )}
      </Section>

      {/* Preferences */}
      <Section
        title="التفضيلات والملاحظات"
        icon={Heart}
        color="bg-rose-50/60"
        editing={editPref}
        onEdit={() => startEdit("pref")}
        onSave={() => save("pref", prefDraft)}
        onCancel={() => setEditPref(false)}
      >
        {editPref ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">التفضيلات</label>
              <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2}
                value={prefDraft.preferences || ""} onChange={e => setPrefDraft((d: any) => ({ ...d, preferences: e.target.value }))}
                placeholder="تفضل التجفيف بدون فرد، لا تحب الروائح القوية" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">تجنب</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={prefDraft.avoidNotes || ""} onChange={e => setPrefDraft((d: any) => ({ ...d, avoidNotes: e.target.value }))}
                placeholder="تجنب الألوان الرمادية الباردة" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">آخر فورمولا</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
                value={prefDraft.lastFormula || ""} onChange={e => setPrefDraft((d: any) => ({ ...d, lastFormula: e.target.value }))}
                placeholder="لوريال 7.1 + أوكسيجين 20 | 1:1 | 35 دقيقة" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="التفضيلات" value={profile.preferences} />
            <Field label="تجنب" value={profile.avoidNotes} />
          </div>
        )}
      </Section>

      {/* Visit History */}
      {visits.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 bg-gray-50/50">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-800">آخر الزيارات</span>
          </div>
          <div className="divide-y divide-gray-50">
            {visits.map((v: any) => (
              <div key={v.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {v.formula && (
                      <p className="text-xs font-mono bg-gray-50 rounded-lg px-2 py-1 text-gray-700 mb-1.5">
                        {v.formula}
                      </p>
                    )}
                    {v.technique && <p className="text-xs text-gray-500">الأسلوب: {v.technique}</p>}
                    {v.resultNotes && <p className="text-xs text-gray-500 mt-0.5">{v.resultNotes}</p>}
                  </div>
                  <p className="text-xs text-gray-300 shrink-0">
                    {fmtDate(v.createdAt)}
                  </p>
                </div>
                {v.nextVisitIn && (
                  <p className="text-xs text-brand-500 mt-1">موعد قادم بعد {v.nextVisitIn} أسابيع</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
