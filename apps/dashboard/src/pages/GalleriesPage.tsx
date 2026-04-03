import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { mediaApi } from "@/lib/api";
import {
  Images, Plus, X, Loader2, AlertCircle, Copy, Check,
  Trash2, ExternalLink, RefreshCw, Link2, Calendar,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { fmtDate } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const iCls = "w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white";
const taCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all bg-white resize-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      title="نسخ الرابط"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

// ── Asset Picker Dialog ───────────────────────────────────────────────────────

function AssetPicker({ selected, onToggle }: { selected: Set<string>; onToggle: (id: string, url: string) => void }) {
  const { data, loading } = useApi(() => mediaApi.list({ limit: "100", type: "image" }), []);
  const assets: any[] = (data as any)?.data ?? [];

  if (loading) return (
    <div className="grid grid-cols-4 gap-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  if (assets.length === 0) return (
    <div className="text-center py-8 text-sm text-gray-400">
      لا توجد صور في مكتبة الوسائط.{" "}
      <Link to="/dashboard/media" className="text-brand-500 hover:underline">ارفع صوراً أولاً</Link>
    </div>
  );

  return (
    <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
      {assets.map((a: any) => (
        <button
          key={a.id}
          onClick={() => onToggle(a.id, a.fileUrl)}
          className={clsx(
            "relative aspect-square overflow-hidden rounded-xl border-2 transition-all",
            selected.has(a.id)
              ? "border-brand-400 ring-2 ring-brand-200"
              : "border-gray-200 hover:border-gray-300",
          )}
        >
          <img src={a.fileUrl} alt={a.name} className="w-full h-full object-cover" />
          {selected.has(a.id) && (
            <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function GalleriesPage() {
  const [modal, setModal] = useState<"create" | null>(null);
  const [form, setForm] = useState({ name: "", description: "", clientName: "", expiresAt: "" });
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formErr,  setFormErr]  = useState("");

  const { data, loading, error, refetch } = useApi(() => mediaApi.galleries(), []);
  const galleries: any[] = (data as any)?.data ?? [];

  const shareBase = `${window.location.origin}/gallery/`;

  const toggleAsset = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setForm({ name: "", description: "", clientName: "", expiresAt: "" });
    setSelectedIds(new Set());
    setFormErr("");
    setModal("create");
  };

  const handleCreate = async () => {
    if (!form.name.trim())      return setFormErr("اسم المعرض مطلوب");
    if (selectedIds.size === 0) return setFormErr("اختر صورة واحدة على الأقل");
    setSaving(true);
    setFormErr("");
    try {
      await mediaApi.createGallery({
        name:        form.name,
        description: form.description || undefined,
        clientName:  form.clientName  || undefined,
        assetIds:    Array.from(selectedIds),
        expiresAt:   form.expiresAt   ? new Date(form.expiresAt).toISOString() : undefined,
      });
      refetch();
      setModal(null);
    } catch { setFormErr("فشل إنشاء المعرض"); }
    finally   { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا المعرض؟ لن يتمكن العملاء من الوصول إليه.")) return;
    setDeleting(id);
    try { await mediaApi.deleteGallery(id); refetch(); }
    catch {}
    finally { setDeleting(null); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">معارض الصور</h1>
          <p className="text-sm text-gray-500 mt-0.5">شارك ألبومات الجلسات مع عملائك عبر رابط خاص</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dashboard/media" className="text-sm text-brand-500 hover:underline flex items-center gap-1.5">
            <Images className="w-4 h-4" /> مكتبة الوسائط
          </Link>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 h-9 rounded-xl hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            معرض جديد
          </button>
        </div>
      </div>

      {/* Galleries list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><SkeletonRows rows={4} /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-400">فشل تحميل المعارض</p>
          </div>
        ) : galleries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
              <Images className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">لا توجد معارض بعد</p>
            <p className="text-xs text-gray-400">أنشئ معرضاً وشارك رابطه مع عميلك</p>
            <button onClick={openCreate} className="mt-1 text-sm text-brand-500 hover:underline">إنشاء معرض</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {galleries.map((g: any) => {
              const shareUrl = `${shareBase}${g.token}`;
              const expired  = g.expiresAt && new Date(g.expiresAt) < new Date();
              return (
                <div key={g.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <Images className="w-5 h-5 text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{g.name}</p>
                      {expired && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">منتهي الصلاحية</span>
                      )}
                    </div>
                    {g.clientName && <p className="text-xs text-gray-400">{g.clientName}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{g.assetIds?.length ?? 0} صورة</span>
                      {g.expiresAt && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          ينتهي {fmtDate(g.expiresAt)}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{fmtDate(g.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <CopyButton text={shareUrl} />
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                      title="فتح المعرض"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(g.id)}
                      disabled={deleting === g.id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      {deleting === g.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {modal === "create" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-6" dir="rtl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">معرض جديد</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <Field label="اسم المعرض *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={iCls} placeholder="جلسة أسرة الخضيري" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="اسم العميل">
                  <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} className={iCls} placeholder="محمد الخضيري" />
                </Field>
                <Field label="تاريخ انتهاء الصلاحية">
                  <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className={iCls} dir="ltr" />
                </Field>
              </div>
              <Field label="وصف (اختياري)">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={taCls} placeholder="جلسة عائلية..." />
              </Field>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500">الصور المضافة *</label>
                  {selectedIds.size > 0 && <span className="text-xs text-brand-500">{selectedIds.size} صورة محددة</span>}
                </div>
                <AssetPicker selected={selectedIds} onToggle={toggleAsset} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 space-y-3">
              {formErr && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />{formErr}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-brand-500 text-white text-sm font-medium h-10 rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  إنشاء المعرض ونسخ الرابط
                </button>
                <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-sm text-gray-600 h-10 rounded-xl hover:bg-gray-50 transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
