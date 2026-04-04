import { useRef, useState } from "react";
import { Loader2, ImagePlus, Save, RefreshCw } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { toast } from "@/hooks/useToast";
import { invalidatePlatformConfig } from "@/hooks/usePlatformConfig";
import { Spinner } from "./shared";

// ── UploadZone ─────────────────────────────────────────────────────────────────
function UploadZone({
  label, hint, currentUrl, onUploaded, upload,
}: {
  label: string;
  hint: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  upload: (file: File) => Promise<{ data: { url: string } }>;
}) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const res = await upload(file);
      if (res?.data?.url) {
        onUploaded(res.data.url);
        toast.success("تم الرفع بنجاح");
      } else {
        toast.error("فشل الرفع");
        setPreview("");
      }
    } finally {
      setUploading(false);
    }
  };

  const displayed = preview || currentUrl;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragging ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
        }`}
      >
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        )}
        {displayed ? (
          <div className="flex flex-col items-center gap-3">
            <img src={displayed} alt={label} className="max-h-20 max-w-[180px] object-contain mx-auto" />
            <p className="text-xs text-gray-400">اضغط أو اسحب لتغييره</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500 font-medium">اسحب الصورة هنا أو اضغط للاختيار</p>
            <p className="text-xs text-gray-400">{hint}</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ── PlatformSettingsTab ─────────────────────────────────────────────────────────
export default function PlatformSettingsTab() {
  const { data, loading, refetch } = useApi(() => adminApi.getPlatformConfig(), []);
  const config = data?.data;

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // استخدم config كـ initial state
  const f = form ?? config ?? {};

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updatePlatformConfig({
        platformName: f.platformName,
        primaryColor: f.primaryColor,
        supportEmail: f.supportEmail,
        supportPhone: f.supportPhone,
      });
      invalidatePlatformConfig();
      toast.success("تم حفظ إعدادات المنصة");
      refetch();
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">إعدادات المنصة</h2>
          <p className="text-xs text-gray-400 mt-0.5">هوية نسق — الشعار والاسم والألوان</p>
        </div>
        <button onClick={refetch} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> تحديث
        </button>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-50 pb-3">الهوية البصرية</h3>

        <UploadZone
          label="شعار المنصة"
          hint="PNG, SVG, WebP — يظهر في الـ Sidebar — حتى 5MB"
          currentUrl={f.logoUrl}
          upload={adminApi.uploadPlatformLogo}
          onUploaded={(url) => {
            setForm((prev: any) => ({ ...(prev ?? config), logoUrl: url }));
            invalidatePlatformConfig();
            refetch();
          }}
        />

        <UploadZone
          label="Favicon (أيقونة التبويب)"
          hint="PNG, ICO, SVG — 32×32 أو 64×64 — حتى 1MB"
          currentUrl={f.faviconUrl}
          upload={adminApi.uploadPlatformFavicon}
          onUploaded={(url) => {
            setForm((prev: any) => ({ ...(prev ?? config), faviconUrl: url }));
            // تحديث الـ favicon في المتصفح فوراً
            const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
            if (link) link.href = url;
            refetch();
          }}
        />
      </div>

      {/* Text settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-50 pb-3">الإعدادات العامة</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">اسم المنصة</label>
            <input
              value={f.platformName ?? "نسق"}
              onChange={(e) => setForm((prev: any) => ({ ...(prev ?? config), platformName: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-300"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">اللون الأساسي</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2 pr-3">
              <input
                type="color"
                value={f.primaryColor ?? "#5b9bd5"}
                onChange={(e) => setForm((prev: any) => ({ ...(prev ?? config), primaryColor: e.target.value }))}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
              />
              <span className="text-sm text-gray-600 font-mono">{f.primaryColor ?? "#5b9bd5"}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">بريد الدعم</label>
            <input
              value={f.supportEmail ?? ""}
              onChange={(e) => setForm((prev: any) => ({ ...(prev ?? config), supportEmail: e.target.value }))}
              placeholder="support@nasaqpro.tech"
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-300"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">رقم الدعم</label>
            <input
              value={f.supportPhone ?? ""}
              onChange={(e) => setForm((prev: any) => ({ ...(prev ?? config), supportPhone: e.target.value }))}
              placeholder="0532064321"
              className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-brand-300"
              dir="ltr"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !form}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl px-5 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الإعدادات
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 border-b border-gray-50 pb-3">معاينة الـ Sidebar</h3>
        <div className="bg-gray-900 rounded-2xl p-4 w-48">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
              style={{ backgroundColor: f.primaryColor ?? "#5b9bd5" }}>
              {f.logoUrl
                ? <img src={f.logoUrl} alt="شعار" className="w-full h-full object-contain" />
                : <span className="text-white text-xs font-bold">{(f.platformName ?? "نسق")[0]}</span>
              }
            </div>
            <span className="text-sm font-bold" style={{ color: f.primaryColor ?? "#5b9bd5" }}>
              {f.platformName ?? "نسق"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
