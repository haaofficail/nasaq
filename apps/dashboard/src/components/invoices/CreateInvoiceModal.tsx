import { useState, useEffect } from "react";
import { toast } from "@/hooks/useToast";
import { financeApi, settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select } from "@/components/ui";

const EMPTY_INVOICE = {
  sellerName: "", sellerVatNumber: "", buyerName: "", buyerPhone: "", buyerEmail: "",
  subtotal: "", vatRate: "15", vatAmount: "", taxableAmount: "", totalAmount: "",
  discountAmount: "0", notes: "", invoiceType: "simplified",
};

function fmt(n: any) {
  return Number(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateInvoiceModal({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ ...EMPTY_INVOICE });
  const [saving, setSaving] = useState(false);

  const { data: profileRes } = useApi(() => settingsApi.profile(), []);
  const orgProfile = profileRes?.data;

  const { mutate: createInv } = useMutation((d: any) => financeApi.createInvoice(d));

  // Pre-fill seller info when profile loads or modal opens
  useEffect(() => {
    if (open && orgProfile) {
      setForm(prev => ({
        ...prev,
        sellerName: prev.sellerName || (orgProfile as any).name || "",
        sellerVatNumber: prev.sellerVatNumber || (orgProfile as any).vatNumber || "",
      }));
    }
  }, [open, orgProfile]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY_INVOICE });
    }
  }, [open]);

  const f = (k: string, v: string) => setForm(p => {
    const next = { ...p, [k]: v };
    if (k === "subtotal" || k === "vatRate") {
      const sub = parseFloat(next.subtotal) || 0;
      const rate = parseFloat(next.vatRate) || 0;
      const vat = +(sub * rate / 100).toFixed(2);
      next.taxableAmount = String(sub);
      next.vatAmount = String(vat);
      next.totalAmount = String(+(sub + vat).toFixed(2));
    }
    return next;
  });

  const handleCreate = async () => {
    if (!form.sellerName || !form.buyerName || !form.totalAmount) return;
    setSaving(true);
    try {
      await createInv(form);
      toast.success("تم إنشاء الفاتورة");
      onClose();
      onSuccess?.();
    } catch { toast.error("فشل إنشاء الفاتورة"); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose}
      title="إنشاء فاتورة جديدة"
      footer={<>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button onClick={handleCreate} loading={saving}>إصدار الفاتورة</Button>
      </>}>
      <div className="space-y-4">
        <Select label="نوع الفاتورة" name="invoiceType" value={form.invoiceType}
          onChange={e => f("invoiceType", e.target.value)}
          options={[{ value: "simplified", label: "فاتورة مبسطة (B2C)" }, { value: "tax", label: "فاتورة ضريبية (B2B)" }]} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="اسم البائع *" name="sellerName" value={form.sellerName}
            onChange={e => f("sellerName", e.target.value)} placeholder="اسم شركتك" required />
          <Input label="الرقم الضريبي للبائع" name="sellerVatNumber" value={form.sellerVatNumber}
            onChange={e => f("sellerVatNumber", e.target.value)} placeholder="3XXXXXXXXXX" dir="ltr" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="اسم المشتري *" name="buyerName" value={form.buyerName}
            onChange={e => f("buyerName", e.target.value)} placeholder="اسم العميل" required />
          <Input label="جوال المشتري" name="buyerPhone" value={form.buyerPhone}
            onChange={e => f("buyerPhone", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="المبلغ قبل الضريبة (ر.س) *" name="subtotal" value={form.subtotal}
            onChange={e => f("subtotal", e.target.value)} placeholder="0.00" dir="ltr" />
          <Select label="نسبة الضريبة %" name="vatRate" value={form.vatRate}
            onChange={e => f("vatRate", e.target.value)}
            options={[{ value: "15", label: "15% (القيمة المضافة)" }, { value: "0", label: "0% (معفي)" }]} />
        </div>
        {form.subtotal && (
          <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>المبلغ الخاضع للضريبة</span>
              <span className="tabular-nums font-medium">{fmt(form.taxableAmount)} ر.س</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>ضريبة القيمة المضافة ({form.vatRate}%)</span>
              <span className="tabular-nums font-medium">{fmt(form.vatAmount)} ر.س</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
              <span>الإجمالي الشامل</span>
              <span className="tabular-nums text-brand-600">{fmt(form.totalAmount)} ر.س</span>
            </div>
          </div>
        )}
        <Input label="ملاحظات" name="notes" value={form.notes}
          onChange={e => f("notes", e.target.value)} placeholder="اختياري" />
      </div>
    </Modal>
  );
}
