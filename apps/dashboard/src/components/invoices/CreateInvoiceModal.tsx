import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/useToast";
import { Plus, Trash2, Search, User, Building2 } from "lucide-react";
import { clsx } from "clsx";
import { financeApi, settingsApi, bookingsApi, customersApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button, Modal, Input, Select } from "@/components/ui";

const DEFAULT_VAT = 15;

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  vatAmount: string;
  taxableAmount: string;
  totalAmount: string;
}

function newLine(): LineItem {
  return { description: "", quantity: "1", unitPrice: "", vatRate: String(DEFAULT_VAT), vatAmount: "0", taxableAmount: "0", totalAmount: "0" };
}

function calcLine(line: LineItem): LineItem {
  const qty  = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unitPrice) || 0;
  const rate  = parseFloat(line.vatRate) || 0;
  const taxable = +(qty * price).toFixed(2);
  const vat     = +(taxable * rate / 100).toFixed(2);
  return { ...line, taxableAmount: String(taxable), vatAmount: String(vat), totalAmount: String(+(taxable + vat).toFixed(2)) };
}

function calcTotals(items: LineItem[]) {
  const subtotal  = items.reduce((s, l) => s + parseFloat(l.taxableAmount || "0"), 0);
  const vatTotal  = items.reduce((s, l) => s + parseFloat(l.vatAmount || "0"), 0);
  return { subtotal: +subtotal.toFixed(2), vatAmount: +vatTotal.toFixed(2), taxableAmount: +subtotal.toFixed(2), totalAmount: +(subtotal + vatTotal).toFixed(2) };
}

function fmt(n: any) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Pre-fill from a specific booking — auto-switches to booking source and imports on open */
  bookingId?: string;
}

export function CreateInvoiceModal({ open, onClose, onSuccess, bookingId: initialBookingId }: Props) {
  const [sourceType, setSourceType] = useState<"manual" | "booking">("manual");
  const [invoiceType, setInvoiceType] = useState("simplified");
  const [sellerName, setSellerName] = useState("");
  const [sellerVat, setSellerVat] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerVat, setBuyerVat] = useState("");
  const [buyerCompanyName, setBuyerCompanyName] = useState("");
  const [buyerCrNumber, setBuyerCrNumber] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isBusiness, setIsBusiness] = useState(false);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<LineItem[]>([newLine()]);
  const [saving, setSaving] = useState(false);

  // Booking import state
  const [bookingSearch, setBookingSearch] = useState("");
  const [importedBookingId, setImportedBookingId] = useState<string | null>(null);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);

  const { data: profileRes } = useApi(() => settingsApi.profile(), []);
  const orgProfile = profileRes?.data as any;

  const { data: bookingsRes } = useApi(
    () => bookingsApi.list(bookingSearch ? { q: bookingSearch } : {}),
    [bookingSearch]
  );
  const bookingList: any[] = bookingsRes?.data || [];

  const { data: customersRes } = useApi(
    () => customerSearch.length >= 2 ? customersApi.list({ q: customerSearch }) : Promise.resolve({ data: [] } as any),
    [customerSearch]
  );
  const customerList: any[] = (customersRes as any)?.data || [];

  const { mutate: createInv } = useMutation((d: any) => financeApi.createInvoice(d));

  // Pre-fill seller info when modal opens
  useEffect(() => {
    if (open && orgProfile) {
      setSellerName(orgProfile.name || "");
      setSellerVat(orgProfile.vatNumber || "");
    }
  }, [open, orgProfile]);

  // Auto-import from booking when bookingId prop provided
  useEffect(() => {
    if (!open || !initialBookingId) return;
    setSourceType("booking");
    bookingsApi.get(initialBookingId).then((res: any) => {
      if (res?.data) importFromBooking(res.data);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialBookingId]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setSourceType("manual");
      setInvoiceType("simplified");
      setSellerName("");
      setSellerVat("");
      setBuyerName("");
      setBuyerPhone("");
      setBuyerVat("");
      setBuyerCompanyName("");
      setBuyerCrNumber("");
      setSelectedCustomerId(null);
      setIsBusiness(false);
      setNotes("");
      setDueDate("");
      setItems([newLine()]);
      setBookingSearch("");
      setImportedBookingId(null);
      setCustomerSearch("");
      setShowCustomerList(false);
    }
  }, [open]);

  const selectCustomer = (customer: any) => {
    setSelectedCustomerId(customer.id);
    const business = customer.type === "business";
    setIsBusiness(business);
    setBuyerName(customer.name || "");
    setBuyerPhone(customer.phone || "");
    if (business) {
      setBuyerCompanyName(customer.companyName || "");
      setBuyerCrNumber(customer.commercialRegister || "");
      setBuyerVat(customer.vatNumber || "");
      setInvoiceType("tax");
    }
    setCustomerSearch(customer.name || "");
    setShowCustomerList(false);
  };

  const importFromBooking = useCallback(async (booking: any) => {
    setImportedBookingId(booking.id);
    const cName = booking.customerName || booking.customer?.name || booking.buyerName || "";
    const cPhone = booking.customerPhone || booking.customer?.phone || "";
    const cId = booking.customerId || null;
    setBuyerName(cName);
    setBuyerPhone(cPhone);
    if (cId) setSelectedCustomerId(cId);
    if (cName) setCustomerSearch(cName);
    // Import items from booking
    try {
      const res = await financeApi.importBooking(booking.id);
      const bk = (res as any).data;
      const importedItems: LineItem[] = (bk.items || []).map((bi: any) => calcLine({
        description: bi.serviceName || bi.description || "خدمة",
        quantity: String(bi.quantity || 1),
        unitPrice: String(bi.unitPrice || bi.totalPrice || 0),
        vatRate: String(DEFAULT_VAT),
        vatAmount: "0", taxableAmount: "0", totalAmount: "0",
      }));
      setItems(importedItems.length > 0 ? importedItems : [newLine()]);
    } catch {
      toast.error("فشل استيراد بنود الحجز");
      setItems([newLine()]);
    }
  }, []);

  const updateLine = (i: number, field: keyof LineItem, value: string) => {
    setItems(prev => {
      const next = [...prev];
      next[i] = calcLine({ ...next[i], [field]: value });
      return next;
    });
  };

  const addLine = () => setItems(prev => [...prev, newLine()]);
  const removeLine = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const totals = calcTotals(items);

  const handleCreate = async () => {
    if (!sellerName || !buyerName) { toast.error("اسم البائع والمشتري إلزاميان"); return; }
    if (items.every(l => !l.description || !l.unitPrice)) { toast.error("أضف بنداً واحداً على الأقل"); return; }
    if (totals.totalAmount <= 0) { toast.error("المبلغ الإجمالي يجب أن يكون أكبر من صفر"); return; }
    setSaving(true);
    try {
      await createInv({
        invoiceType,
        sourceType,
        bookingId: importedBookingId || null,
        sellerName, sellerVatNumber: sellerVat || null,
        buyerName, buyerPhone: buyerPhone || null,
        buyerVatNumber: buyerVat || null,
        buyerCompanyName: buyerCompanyName || null,
        buyerCrNumber: buyerCrNumber || null,
        customerId: selectedCustomerId || null,
        subtotal: String(totals.subtotal),
        taxableAmount: String(totals.taxableAmount),
        vatRate: String(DEFAULT_VAT),
        vatAmount: String(totals.vatAmount),
        totalAmount: String(totals.totalAmount),
        discountAmount: "0",
        dueDate: dueDate || null,
        notes: notes || null,
        items: items.filter(l => l.description && l.unitPrice).map(l => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxableAmount: l.taxableAmount,
          vatRate: l.vatRate,
          vatAmount: l.vatAmount,
          totalAmount: l.totalAmount,
        })),
      });
      toast.success("تم إصدار الفاتورة");
      onClose();
      onSuccess?.();
    } catch { toast.error("فشل إنشاء الفاتورة"); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="فاتورة جديدة"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleCreate} loading={saving}>إصدار الفاتورة</Button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Source + Type row */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            name="sourceType"
            label="مصدر الفاتورة"
            value={sourceType}
            onChange={e => { setSourceType(e.target.value as any); setImportedBookingId(null); setItems([newLine()]); setBuyerName(""); setBuyerPhone(""); }}
            options={[
              { value: "manual", label: "يدوي" },
              { value: "booking", label: "من حجز" },
            ]}
          />
          <Select
            name="invoiceType"
            label="نوع الفاتورة"
            value={invoiceType}
            onChange={e => setInvoiceType(e.target.value)}
            options={[
              { value: "simplified", label: "مبسطة (B2C)" },
              { value: "tax", label: "ضريبية (B2B)" },
            ]}
          />
        </div>

        {/* Booking import */}
        {sourceType === "booking" && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Search className="w-4 h-4 text-brand-400" />
              استيراد من حجز
            </div>
            <Input
              name="bookingSearch"
              placeholder="ابحث باسم العميل أو رقم الحجز..."
              value={bookingSearch}
              onChange={e => setBookingSearch(e.target.value)}
            />
            {bookingList.length > 0 && !importedBookingId && (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-h-44 overflow-y-auto">
                {bookingList.slice(0, 10).map((bk: any) => (
                  <button
                    key={bk.id}
                    type="button"
                    onClick={() => { importFromBooking(bk); setBookingSearch(""); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-brand-50 flex items-center justify-between gap-3 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{bk.customerName || bk.buyerName || "—"}</p>
                      <p className="text-xs text-gray-400">{bk.bookingNumber || bk.id.slice(0, 8)}</p>
                    </div>
                    <span className="text-xs text-brand-600 font-mono">{Number(bk.totalAmount || 0).toLocaleString("en-US")} ر.س</span>
                  </button>
                ))}
              </div>
            )}
            {importedBookingId && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span className="font-medium">تم الاستيراد</span>
                <button type="button" onClick={() => { setImportedBookingId(null); setItems([newLine()]); setBuyerName(""); setBuyerPhone(""); }} className="mr-auto text-gray-400 hover:text-red-500">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Seller info */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="sellerName"
            label="اسم البائع *"
            value={sellerName}
            onChange={e => setSellerName(e.target.value)}
            placeholder="اسم منشأتك"
          />
          <Input
            name="sellerVat"
            label="الرقم الضريبي للبائع"
            value={sellerVat}
            onChange={e => setSellerVat(e.target.value)}
            placeholder="3XXXXXXXXXX"
            dir="ltr"
          />
        </div>

        {/* Customer search */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            <input
              className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 placeholder:text-gray-300"
              placeholder="ابحث عن عميل (اكتب 2 حروف على الأقل)..."
              value={customerSearch}
              onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); }}
              onFocus={() => setShowCustomerList(true)}
            />
          </div>
          {showCustomerList && customerList.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
              {customerList.slice(0, 8).map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCustomer(c)}
                  className="w-full text-right px-4 py-2.5 hover:bg-brand-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                >
                  <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", c.type === "business" ? "bg-violet-50" : "bg-brand-50")}>
                    {c.type === "business" ? <Building2 className="w-3.5 h-3.5 text-violet-500" /> : <User className="w-3.5 h-3.5 text-brand-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.type === "business" && c.companyName ? c.companyName : c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  {c.type === "business" && (
                    <span className="mr-auto text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-medium shrink-0">مؤسسة</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buyer info */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="buyerName"
            label="اسم المشتري *"
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
            placeholder="اسم العميل"
          />
          <Input
            name="buyerPhone"
            label="جوال المشتري"
            value={buyerPhone}
            onChange={e => setBuyerPhone(e.target.value)}
            placeholder="05XXXXXXXX"
            dir="ltr"
          />
        </div>

        {/* Business buyer fields — shown when type is business or invoice is B2B */}
        {(isBusiness || invoiceType === "tax") && (
          <div className="space-y-3 p-4 bg-violet-50/50 border border-violet-100 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
              <Building2 className="w-3.5 h-3.5" />
              بيانات المؤسسة
            </div>
            <Input
              name="buyerCompanyName"
              label="اسم المؤسسة"
              value={buyerCompanyName}
              onChange={e => setBuyerCompanyName(e.target.value)}
              placeholder="الاسم التجاري للمؤسسة"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="buyerCrNumber"
                label="السجل التجاري"
                value={buyerCrNumber}
                onChange={e => setBuyerCrNumber(e.target.value)}
                placeholder="1010XXXXXX"
                dir="ltr"
              />
              <Input
                name="buyerVat"
                label="الرقم الضريبي للمشتري"
                value={buyerVat}
                onChange={e => setBuyerVat(e.target.value)}
                placeholder="3XXXXXXXXXX"
                dir="ltr"
              />
            </div>
          </div>
        )}

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-800">بنود الفاتورة</p>
            <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
              <Plus className="w-3.5 h-3.5" /> إضافة بند
            </button>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-0 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500 border-b border-gray-100">
              <span className="col-span-5">الوصف</span>
              <span className="col-span-2 text-center">الكمية</span>
              <span className="col-span-2 text-center">السعر</span>
              <span className="col-span-2 text-left">الإجمالي</span>
              <span className="col-span-1" />
            </div>
            {items.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-0 px-3 py-2 border-b border-gray-50 last:border-0 items-center">
                <div className="col-span-5 pl-2">
                  <input
                    className="w-full text-sm bg-transparent outline-none border-b border-transparent focus:border-brand-300 placeholder:text-gray-300 py-0.5"
                    placeholder="وصف الخدمة..."
                    value={line.description}
                    onChange={e => updateLine(i, "description", e.target.value)}
                  />
                </div>
                <div className="col-span-2 px-1">
                  <input
                    className="w-full text-sm bg-transparent outline-none border-b border-transparent focus:border-brand-300 text-center py-0.5 tabular-nums"
                    value={line.quantity}
                    onChange={e => updateLine(i, "quantity", e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="col-span-2 px-1">
                  <input
                    className="w-full text-sm bg-transparent outline-none border-b border-transparent focus:border-brand-300 text-center py-0.5 tabular-nums"
                    placeholder="0.00"
                    value={line.unitPrice}
                    onChange={e => updateLine(i, "unitPrice", e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="col-span-2">
                  <span className="text-sm tabular-nums text-gray-700">{fmt(line.totalAmount)}</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>المبلغ قبل الضريبة</span>
            <span className="tabular-nums font-medium">{fmt(totals.subtotal)} ر.س</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>ضريبة القيمة المضافة ({DEFAULT_VAT}%)</span>
            <span className="tabular-nums font-medium">{fmt(totals.vatAmount)} ر.س</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
            <span>الإجمالي الشامل</span>
            <span className="tabular-nums text-brand-600">{fmt(totals.totalAmount)} ر.س</span>
          </div>
        </div>

        {/* Footer fields */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="dueDate"
            label="تاريخ الاستحقاق"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
          <Input
            name="notes"
            label="ملاحظات"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="اختياري"
          />
        </div>

      </div>
    </Modal>
  );
}
