import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi, useMutation } from "@/hooks/useApi";
import { salonApi, customersApi, settingsApi } from "@/lib/api";
import { useBusiness } from "@/hooks/useBusiness";
import {
  ArrowRight, Sparkles, AlertTriangle, Heart, User,
  Clock, Pencil, Check, X, Loader2, Activity, Car, FileText, Shield, Scissors
} from "lucide-react";
import { clsx } from "clsx";
import { fmtDate } from "@/lib/utils";
import { getMatrixForBusiness, SectionDef, FieldDef } from "@/lib/businessViewMatrix";

const ICONS: Record<string, any> = {
  Sparkles, User, Heart, Activity, Car, FileText, Shield, Scissors, AlertTriangle
};

// ============================================================
// Editable Section Wrapper
// ============================================================
function Section({ section, profile, editing, onEdit, onSave, onCancel, draft, setDraft }: any) {
  const Icon = ICONS[section.iconName] || FileText;
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className={clsx("flex items-center justify-between px-5 py-3 border-b border-gray-50", section.colorClass || "bg-gray-50/50")}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-semibold text-sm text-gray-800">{section.title}</span>
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
      <div className="px-5 py-4">
        {editing ? (
          <div className="space-y-3">
            {section.fields.map((f: FieldDef) => (
              <div key={f.key}>
                <label className="text-xs font-medium text-gray-500 block mb-1">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" rows={2}
                    value={draft[f.key] || ""} onChange={e => setDraft({ ...draft, [f.key]: e.target.value })} placeholder={f.placeholder} />
                ) : f.type === "select" ? (
                  <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
                    value={draft[f.key] || ""} onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}>
                    <option value="">—</option>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    value={draft[f.key] || ""} onChange={e => setDraft({ ...draft, [f.key]: e.target.value })} placeholder={f.placeholder} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map((f: FieldDef) => {
              const val = profile[f.key] || profile.metadata?.[f.key];
              const displayVal = f.type === "select" ? f.options?.find(o => o.value === val)?.label || val : val;
              return (
                <div key={f.key}>
                  <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                  <p className={clsx("text-sm", displayVal ? "text-gray-900 font-medium" : "text-gray-300 italic")}>{displayVal || "غير محدد"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export function ClientBeautyCardPage() {
  const { id: customerId } = useParams<{ id: string }>();
  const biz = useBusiness();
  const matrix = getMatrixForBusiness(biz.key);

  const { data: customerRes, loading: customerLoading } = useApi(() => customersApi.get(customerId!), [customerId]);
  const { data: beautyRes, loading: beautyLoading, refetch } = useApi(() => salonApi.beautyProfile(customerId!), [customerId]);

  const customer  = customerRes?.data;
  const profile   = beautyRes?.data?.profile || {};
  const visits    = beautyRes?.data?.recentVisits || [];

  const { data: orgProfileRes, loading: orgLoading } = useApi(() => settingsApi.profile(), []);
  const orgSettings = orgProfileRes?.data?.settings || {};
  const customFields = orgSettings.customerFields || [];

  // Merge the static matrix with the dynamic customFields from settings
  const finalSections = [...matrix.sections];
  if (customFields.length > 0) {
    finalSections.push({
      id: "org_custom_fields",
      title: "بيانات إضافية مخصصة",
      iconName: "Sparkles",
      colorClass: "bg-brand-50 text-brand-600",
      fields: customFields.map((f: any) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        options: f.options
      }))
    });
  }


  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const { mutate: saveProfile } = useMutation((data: any) => salonApi.saveBeautyProfile(customerId!, data));
  const [saveError, setSaveError] = useState<string | null>(null);

  const startEdit = (sectionId: string) => {
    const sec = finalSections.find(s => s.id === sectionId);
    if (!sec) return;
    const newDraft: Record<string, any> = {};
    sec.fields.forEach(f => {
      newDraft[f.key] = profile[f.key] !== undefined ? profile[f.key] : profile.metadata?.[f.key];
    });
    setDraft(newDraft);
    setEditingSection(sectionId);
  };

  const save = async (sectionId: string) => {
    setSaveError(null);
    const sec = finalSections.find(s => s.id === sectionId);
    if (!sec) return;

    // Distinguish legacy columns vs JSONB metadata
    const newData = { ...profile, metadata: { ...(profile.metadata || {}) } };
    sec.fields.forEach(f => {
      // If it exists in profile as a strict column (hack: if value exists historically or we know it)
      // Actually backend will handle it if we send it on root or metadata
      // The backend saveBeautyProfile merges properly if we send it all.
      // But let's dump everything in metadata just in case, or root.
      newData.metadata[f.key] = draft[f.key];
      newData[f.key] = draft[f.key];
    });

    const result = await saveProfile(newData);
    if (result === null) {
      setSaveError("تعذّر حفظ التغييرات — حاول مجدداً");
      return; 
    }
    refetch();
    setEditingSection(null);
  };

  if (customerLoading || beautyLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
      </div>
    );
  }

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
            {matrix.profileTitle}
          </h1>
          <p className="text-sm text-gray-400">{customer?.name}</p>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-600">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Dynamic Sections */}
      {finalSections.map(sec => (
        <Section
          key={sec.id}
          section={sec}
          profile={profile}
          editing={editingSection === sec.id}
          onEdit={() => startEdit(sec.id)}
          onSave={() => save(sec.id)}
          onCancel={() => setEditingSection(null)}
          draft={draft}
          setDraft={setDraft}
        />
      ))}

      {/* Visit History */}
      {visits.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 bg-gray-50/50">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-800">سجل الأحداث والزيارات</span>
          </div>
          <div className="divide-y divide-gray-50">
            {visits.map((v: any) => (
              <div key={v.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* Render primary visit note field if exists (like formula) */}
                    {(v.formula || v.customFields?.formula || v.customFields?.focusAreas || v.customFields?.workoutFocus) && (
                      <p className="text-xs font-mono bg-gray-50 rounded-lg px-2 py-1 text-gray-700 mb-1.5 inline-block">
                        {v.formula || v.customFields?.formula || v.customFields?.focusAreas || v.customFields?.workoutFocus}
                      </p>
                    )}
                    {(v.technique || v.customFields?.technique || v.customFields?.styleUsed) && (
                      <p className="text-xs text-gray-500 mb-1">الأسلوب: {v.technique || v.customFields?.technique || v.customFields?.styleUsed}</p>
                    )}
                    {(v.resultNotes || v.customFields?.resultNotes) && <p className="text-xs text-gray-500 mt-0.5">{v.resultNotes || v.customFields?.resultNotes}</p>}
                  </div>
                  <p className="text-xs text-gray-300 shrink-0">
                    {fmtDate(v.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
