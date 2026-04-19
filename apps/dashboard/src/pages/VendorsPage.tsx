import { useState, useEffect, useCallback } from "react";
import { accountingApi } from "../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────
const VENDOR_CATEGORIES: { value: string; label: string }[] = [
  { value: "general", label: "عام" },
  { value: "materials", label: "مواد بناء" },
  { value: "maintenance", label: "صيانة" },
  { value: "cleaning", label: "تنظيف" },
  { value: "security", label: "أمن وحراسة" },
  { value: "it", label: "تقنية المعلومات" },
  { value: "office_supplies", label: "مستلزمات مكتبية" },
  { value: "food", label: "مواد غذائية" },
  { value: "other", label: "أخرى" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vendor {
  id: string;
  vendor_code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  vat_number: string | null;
  commercial_registration: string | null;
  bank_name: string | null;
  iban: string | null;
  address: string | null;
  city: string | null;
  category: string;
  rating: number;
  notes: string | null;
  is_active: boolean;
  invoice_count: number;
  total_invoiced: string;
  total_paid: string;
}

interface VendorForm {
  vendorCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  vatNumber: string;
  commercialRegistration: string;
  bankName: string;
  iban: string;
  address: string;
  city: string;
  category: string;
  rating: number;
  notes: string;
  isActive: boolean;
}

const emptyForm: VendorForm = {
  vendorCode: "",
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  vatNumber: "",
  commercialRegistration: "",
  bankName: "",
  iban: "",
  address: "",
  city: "",
  category: "general",
  rating: 0,
  notes: "",
  isActive: true,
};

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-1 items-center" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange?.(star)}
          className={`text-xl transition-colors ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"} ${
            star <= value ? "text-yellow-400" : "text-gray-300"
          }`}
          disabled={readOnly}
          aria-label={`تقييم ${star}`}
        >
          &#9733;
        </button>
      ))}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-[#eef2f6]">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-[10px] py-[6px]">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#eef2f6]">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Vendor Form Modal ────────────────────────────────────────────────────────
function VendorFormModal({
  vendor,
  onClose,
  onSaved,
}: {
  vendor: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<VendorForm>(
    vendor
      ? {
          vendorCode: vendor.vendor_code || "",
          name: vendor.name,
          contactPerson: vendor.contact_person || "",
          phone: vendor.phone || "",
          email: vendor.email || "",
          vatNumber: vendor.vat_number || "",
          commercialRegistration: vendor.commercial_registration || "",
          bankName: vendor.bank_name || "",
          iban: vendor.iban || "",
          address: vendor.address || "",
          city: vendor.city || "",
          category: vendor.category || "general",
          rating: vendor.rating || 0,
          notes: vendor.notes || "",
          isActive: vendor.is_active,
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof VendorForm, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("اسم المورد مطلوب"); return; }
    setSaving(true);
    setError("");
    try {
      if (vendor) {
        await accountingApi.vendors.update(vendor.id, form);
      } else {
        await accountingApi.vendors.create(form);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    field,
    type = "text",
    half = false,
  }: {
    label: string;
    field: keyof VendorForm;
    type?: string;
    half?: boolean;
  }) => (
    <div className={half ? "col-span-1" : "col-span-2"}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[field] as string}
        onChange={(e) => set(field, e.target.value)}
        className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      />
    </div>
  );

  return (
    <Modal title={vendor ? "تعديل مورد" : "مورد جديد"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="كود المورد" field="vendorCode" half />
          <Field label="اسم المورد *" field="name" half />
          <Field label="جهة الاتصال" field="contactPerson" half />
          <Field label="الجوال" field="phone" type="tel" half />
          <Field label="البريد الإلكتروني" field="email" type="email" half />
          <Field label="الرقم الضريبي" field="vatNumber" half />
          <Field label="السجل التجاري" field="commercialRegistration" half />
          <Field label="اسم البنك" field="bankName" half />
          <Field label="رقم الآيبان" field="iban" half />
          <Field label="المدينة" field="city" half />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white"
            >
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">التقييم</label>
            <StarRating value={form.rating} onChange={(v) => set("rating", v)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
          </div>
          {vendor && (
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">مورد نشط</label>
            </div>
          )}
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#4a8bc4] transition-colors disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : vendor ? "حفظ التعديلات" : "إضافة المورد"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Statement Modal ──────────────────────────────────────────────────────────
function StatementModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await accountingApi.vendors.statement(vendor.id, from || undefined, to || undefined);
      setData(res.data);
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, [vendor.id, from, to]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: string | number) =>
    Number(n).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Modal title={`كشف حساب: ${vendor.name}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Date filters */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">من تاريخ</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <button
            onClick={load}
            className="bg-brand-500 text-white rounded-xl px-4 py-2 text-sm hover:bg-[#4a8bc4] transition-colors"
          >
            تصفية
          </button>
        </div>

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">إجمالي الفواتير</p>
              <p className="text-lg font-bold text-blue-800">{fmt(data.total_invoiced)} ر.س</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 mb-1">إجمالي المدفوع</p>
              <p className="text-lg font-bold text-green-800">{fmt(data.total_paid)} ر.س</p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {!loading && !error && data && (
          data.invoices.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">لا توجد فواتير لهذا المورد</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#eef2f6]">
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">رقم الفاتورة</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">التاريخ</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">المبلغ</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">المدفوع</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv: any, idx: number) => (
                    <tr key={idx} className="border-b border-[#eef2f6] hover:bg-[#f8fafc]">
                      <td className="py-2 px-3 text-brand-500 font-mono">{inv.invoice_number || "-"}</td>
                      <td className="py-2 px-3 text-gray-600">
                        {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("ar-SA") : "-"}
                      </td>
                      <td className="py-2 px-3 font-medium">{fmt(inv.total_amount || 0)}</td>
                      <td className="py-2 px-3 text-green-600">{fmt(inv.paid_amount || 0)}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            inv.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : inv.status === "partial"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {inv.status === "paid" ? "مدفوع" : inv.status === "partial" ? "جزئي" : "غير مدفوع"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ vendor, onClose, onDeleted }: { vendor: Vendor; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await accountingApi.vendors.delete(vendor.id);
      onDeleted();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal title="تعطيل مورد" onClose={onClose}>
      <p className="text-gray-600 text-sm mb-5">
        هل أنت متأكد من تعطيل المورد <span className="font-semibold text-gray-800">"{vendor.name}"</span>؟ سيتم إخفاؤه من القوائم ولن يُحذف نهائياً.
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? "جاري التعطيل..." : "تعطيل"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          إلغاء
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [statementVendor, setStatementVendor] = useState<Vendor | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: any = {};
      if (debouncedSearch) params.q = debouncedSearch;
      if (!showInactive) params.active = "true";
      const res = await accountingApi.vendors.list(params);
      setVendors(res.data || []);
    } catch (err: any) {
      setError(err.message || "تعذّر تحميل الموردين");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, showInactive]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: string | number) =>
    Number(n).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getCategoryLabel = (val: string) =>
    VENDOR_CATEGORIES.find((c) => c.value === val)?.label || val;

  const handleFormClose = () => {
    setShowForm(false);
    setEditVendor(null);
  };

  const handleSaved = () => {
    handleFormClose();
    load();
  };

  const handleDeleted = () => {
    setDeleteVendor(null);
    load();
  };

  return (
    <div className="p-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الموردون</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة موردي المنشأة وكشوف حساباتهم</p>
        </div>
        <button
          onClick={() => { setEditVendor(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-brand-500 text-white rounded-2xl px-5 py-2.5 text-sm font-medium hover:bg-[#4a8bc4] transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          مورد جديد
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            placeholder="بحث باسم المورد أو الجوال..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-[#eef2f6] rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">&#128269;</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-600">إظهار الغير نشطين</span>
        </label>
        <span className="text-sm text-gray-400">{vendors.length} مورد</span>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-lg">!</span>
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={load} className="mr-auto text-sm text-red-600 underline">إعادة المحاولة</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#eef2f6] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#eef2f6] bg-gray-50">
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">الكود</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">الاسم</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">جهة الاتصال</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">الجوال</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">المدينة</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">الفئة</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">التقييم</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">إجمالي الفواتير</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="text-gray-400 space-y-2">
                      <p className="text-4xl">&#128179;</p>
                      <p className="text-base font-medium">لا يوجد موردون</p>
                      <p className="text-sm">ابدأ بإضافة أول مورد للمنشأة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-[#eef2f6] hover:bg-[#f8fafc] transition-colors">
                    <td className="px-[10px] py-[6px] text-brand-500 font-mono text-xs">{vendor.vendor_code || "-"}</td>
                    <td className="px-[10px] py-[6px]">
                      <button
                        onClick={() => setStatementVendor(vendor)}
                        className="font-medium text-gray-800 hover:text-brand-500 transition-colors text-right"
                      >
                        {vendor.name}
                      </button>
                    </td>
                    <td className="px-[10px] py-[6px] text-gray-600">{vendor.contact_person || "-"}</td>
                    <td className="px-[10px] py-[6px] text-gray-600 dir-ltr text-left">{vendor.phone || "-"}</td>
                    <td className="px-[10px] py-[6px] text-gray-600">{vendor.city || "-"}</td>
                    <td className="px-[10px] py-[6px]">
                      <span className="bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 text-xs">
                        {getCategoryLabel(vendor.category)}
                      </span>
                    </td>
                    <td className="px-[10px] py-[6px]">
                      <StarRating value={vendor.rating} readOnly />
                    </td>
                    <td className="px-[10px] py-[6px] text-gray-700 font-medium">
                      {fmt(vendor.total_invoiced)} ر.س
                    </td>
                    <td className="px-[10px] py-[6px]">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendor.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {vendor.is_active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                    <td className="px-[10px] py-[6px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setStatementVendor(vendor)}
                          className="text-brand-500 hover:text-[#4a8bc4] text-xs border border-brand-500/30 rounded-lg px-2 py-1 hover:bg-brand-500/5 transition-colors"
                          title="كشف حساب"
                        >
                          كشف
                        </button>
                        <button
                          onClick={() => { setEditVendor(vendor); setShowForm(true); }}
                          className="text-gray-500 hover:text-gray-700 text-xs border border-[#eef2f6] rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
                          title="تعديل"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => setDeleteVendor(vendor)}
                          className="text-red-400 hover:text-red-600 text-xs border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-colors"
                          title="تعطيل"
                        >
                          تعطيل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <VendorFormModal vendor={editVendor} onClose={handleFormClose} onSaved={handleSaved} />
      )}
      {deleteVendor && (
        <DeleteModal vendor={deleteVendor} onClose={() => setDeleteVendor(null)} onDeleted={handleDeleted} />
      )}
      {statementVendor && (
        <StatementModal vendor={statementVendor} onClose={() => setStatementVendor(null)} />
      )}
    </div>
  );
}

export default VendorsPage;
