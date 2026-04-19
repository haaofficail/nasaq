import { useState } from "react";
import { propertyApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { useApi } from "@/hooks/useApi";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "كاش", desc: "دفع كامل نقداً أو تحويل" },
  { value: "mortgage", label: "رهن عقاري", desc: "تمويل عقاري من بنك أو جهة تمويلية" },
  { value: "installment", label: "تقسيط", desc: "دفعات منتظمة على فترة محددة" },
];

export function NewSaleWizard({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  // Step 2
  const [buyer, setBuyer] = useState({
    name: "",
    phone: "",
    nationalId: "",
    paymentMethod: "cash",
  });

  // Step 3
  const [saleDetails, setSaleDetails] = useState({
    salePrice: "",
    commissionRate: "2",
    saleDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: propertiesData } = useApi(() => propertyApi.properties.list(), []);
  const properties: any[] = (propertiesData as any)?.data ?? [];

  const { data: unitsData } = useApi(
    () => selectedPropertyId ? propertyApi.units.list({ propertyId: selectedPropertyId }) : Promise.resolve(null),
    [selectedPropertyId]
  );
  const units: any[] = (unitsData as any)?.data ?? [];

  if (!open) return null;

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  const commissionAmount = saleDetails.salePrice && saleDetails.commissionRate
    ? (Number(saleDetails.salePrice) * Number(saleDetails.commissionRate)) / 100
    : 0;

  async function handleSubmit() {
    if (!selectedPropertyId || !buyer.name || !saleDetails.salePrice) {
      toast.error("يرجى ملء جميع البيانات المطلوبة");
      return;
    }
    setSaving(true);
    try {
      await propertyApi.sales.create({
        propertyId: selectedPropertyId,
        unitId: selectedUnitId || undefined,
        buyerName: buyer.name,
        buyerPhone: buyer.phone,
        buyerNationalId: buyer.nationalId,
        paymentMethod: buyer.paymentMethod,
        salePrice: Number(saleDetails.salePrice),
        commissionRate: Number(saleDetails.commissionRate),
        commissionAmount,
        saleDate: saleDetails.saleDate,
        notes: saleDetails.notes,
      });
      toast.success("تم تسجيل عملية البيع بنجاح");
      onSuccess();
      onClose();
      setStep(1);
      setSelectedPropertyId("");
      setSelectedUnitId("");
      setBuyer({ name: "", phone: "", nationalId: "", paymentMethod: "cash" });
      setSaleDetails({ salePrice: "", commissionRate: "2", saleDate: new Date().toISOString().split("T")[0], notes: "" });
    } catch (e: any) {
      toast.error(`فشل تسجيل البيع: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eef2f6]">
          <h2 className="text-lg font-bold text-gray-900">عملية بيع جديدة</h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    s === step ? "text-white" :
                    s < step ? "bg-emerald-100 text-emerald-700" :
                    "bg-gray-100 text-gray-400"
                  }`}
                  style={s === step ? { backgroundColor: "#5b9bd5" } : {}}
                >
                  {s < step ? "✓" : s}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Step 1: Property / Unit */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">اختر العقار والوحدة المراد بيعها</p>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">العقار *</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setSelectedUnitId("");
                  }}
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">اختر العقار</option>
                  {properties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {selectedPropertyId && units.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">الوحدة (اختياري)</label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">العقار بالكامل</option>
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.unitNumber ?? u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedProperty && (
                <div className="bg-blue-50 rounded-xl p-3 text-sm">
                  <div className="font-medium text-blue-900">{selectedProperty.name}</div>
                  <div className="text-blue-700 text-xs mt-0.5">
                    {selectedProperty.city ?? ""} {selectedProperty.neighborhood ? `· ${selectedProperty.neighborhood}` : ""}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Buyer + Payment Method */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">بيانات المشتري وطريقة الدفع</p>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">اسم المشتري *</label>
                <input
                  value={buyer.name}
                  onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                  placeholder="الاسم الكامل"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">رقم الجوال</label>
                <input
                  value={buyer.phone}
                  onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">رقم الهوية الوطنية</label>
                <input
                  value={buyer.nationalId}
                  onChange={(e) => setBuyer({ ...buyer, nationalId: e.target.value })}
                  placeholder="1xxxxxxxxx"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">طريقة الدفع</label>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.value}
                      onClick={() => setBuyer({ ...buyer, paymentMethod: method.value })}
                      className={`w-full p-3 rounded-2xl border-2 text-right transition-all ${
                        buyer.paymentMethod === method.value
                          ? "border-blue-400 bg-blue-50"
                          : "border-[#eef2f6] hover:border-[#eef2f6]"
                      }`}
                    >
                      <div className="font-medium text-gray-900 text-sm">{method.label}</div>
                      <div className="text-xs text-gray-500">{method.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Price + Commission + Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">سعر البيع (ر.س) *</label>
                <input
                  type="number"
                  value={saleDetails.salePrice}
                  onChange={(e) => setSaleDetails({ ...saleDetails, salePrice: e.target.value })}
                  placeholder="0"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">نسبة العمولة %</label>
                <input
                  type="number"
                  value={saleDetails.commissionRate}
                  onChange={(e) => setSaleDetails({ ...saleDetails, commissionRate: e.target.value })}
                  placeholder="2"
                  min="0"
                  max="100"
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">تاريخ البيع</label>
                <input
                  type="date"
                  value={saleDetails.saleDate}
                  onChange={(e) => setSaleDetails({ ...saleDetails, saleDate: e.target.value })}
                  className="w-full border border-[#eef2f6] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* Summary */}
              {saleDetails.salePrice && (
                <div className="bg-emerald-50 rounded-2xl p-4 space-y-2 text-sm">
                  <h3 className="font-semibold text-emerald-900">ملخص المالي</h3>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">سعر البيع:</span>
                    <span className="font-medium">{Number(saleDetails.salePrice).toLocaleString("en-US")} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">العمولة ({saleDetails.commissionRate}%):</span>
                    <span className="font-medium">{commissionAmount.toLocaleString("en-US")} ر.س</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-emerald-200 pt-2 mt-2">
                    <span className="text-emerald-900">صافي للمالك:</span>
                    <span className="text-emerald-700">
                      {(Number(saleDetails.salePrice) - commissionAmount).toLocaleString("en-US")} ر.س
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#eef2f6]">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            className="px-5 py-2 border border-[#eef2f6] text-gray-700 rounded-xl text-sm hover:bg-[#f8fafc] transition-colors"
          >
            {step === 1 ? "إلغاء" : "السابق"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !selectedPropertyId) {
                  toast.error("يرجى اختيار عقار");
                  return;
                }
                if (step === 2 && !buyer.name) {
                  toast.error("يرجى إدخال اسم المشتري");
                  return;
                }
                setStep(step + 1);
              }}
              className="px-5 py-2 text-white rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: "#5b9bd5" }}
            >
              التالي
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "#5b9bd5" }}
            >
              {saving ? "جاري التسجيل..." : "تسجيل البيع"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
