import { useState } from "react";
import { propertyApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import { useApi } from "@/hooks/useApi";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewLeaseWizard({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [selectedUnitId, setSelectedUnitId] = useState("");

  // Step 2
  const [tenant, setTenant] = useState({
    name: "",
    phone: "",
    nationalId: "",
  });

  // Step 3 — auto-filled from unit
  const [contractData, setContractData] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    monthlyRent: "",
    depositAmount: "",
    paymentMethod: "bank_transfer",
  });

  const { data: vacantData } = useApi(() => propertyApi.units.vacant(), []);
  const vacantUnits: any[] = (vacantData as any)?.data ?? [];

  const selectedUnit = vacantUnits.find((u) => u.id === selectedUnitId);

  if (!open) return null;

  function handleUnitSelect(unitId: string) {
    setSelectedUnitId(unitId);
    const unit = vacantUnits.find((u) => u.id === unitId);
    if (unit) {
      // Auto-fill contract data from unit
      const start = new Date();
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      setContractData({
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        monthlyRent: String(unit.monthlyRent ?? unit.rentAmount ?? ""),
        depositAmount: String(unit.depositAmount ?? unit.monthlyRent ?? ""),
        paymentMethod: "bank_transfer",
      });
    }
  }

  async function handleSubmit() {
    if (!tenant.name || !tenant.phone || !selectedUnitId) {
      toast.error("يرجى ملء جميع البيانات المطلوبة");
      return;
    }

    setSaving(true);
    try {
      // 1. Create or find tenant
      let tenantRes = await propertyApi.tenants.create({
        name: tenant.name,
        phone: tenant.phone,
        nationalId: tenant.nationalId,
      }) as any;
      const tenantId = tenantRes?.data?.id;

      // 2. Create contract
      const contractRes = await propertyApi.contracts.create({
        unitId: selectedUnitId,
        tenantId,
        startDate: contractData.startDate,
        endDate: contractData.endDate,
        monthlyRent: Number(contractData.monthlyRent),
        depositAmount: Number(contractData.depositAmount),
        paymentMethod: contractData.paymentMethod,
      }) as any;
      const contractId = contractRes?.data?.id;

      // 3. Update unit status to occupied
      await propertyApi.units.patch(selectedUnitId, { status: "occupied" });

      // 4. Create first month invoice
      if (contractId) {
        await propertyApi.invoices.create({
          contractId,
          amount: Number(contractData.monthlyRent),
          dueDate: contractData.startDate,
          description: "فاتورة الشهر الأول",
        });
      }

      toast.success("تم إنشاء العقد بنجاح — لا تنسَ التوثيق في منصة إيجار");

      onSuccess();
      onClose();
      setStep(1);
      setSelectedUnitId("");
      setTenant({ name: "", phone: "", nationalId: "" });
    } catch (e: any) {
      toast.error(`فشل إنشاء العقد: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const stepLabels = ["اختر الوحدة", "بيانات المستأجر", "بيانات العقد", "تأكيد"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">عقد إيجار جديد</h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
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

        <div className="px-6 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-500">{stepLabels[step - 1]}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Step 1: Select Unit */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">اختر وحدة شاغرة لإنشاء العقد عليها</p>
              {vacantUnits.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                  لا توجد وحدات شاغرة حالياً
                </div>
              ) : (
                <div className="space-y-2">
                  {vacantUnits.map((unit: any) => (
                    <button
                      key={unit.id}
                      onClick={() => handleUnitSelect(unit.id)}
                      className={`w-full p-4 rounded-2xl border-2 text-right transition-all ${
                        selectedUnitId === unit.id
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {unit.unitNumber ?? unit.name} — {unit.propertyName ?? ""}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {unit.bedrooms ? `${unit.bedrooms} غرف · ` : ""}
                        {unit.area ? `${unit.area} م² · ` : ""}
                        {unit.monthlyRent ? `${Number(unit.monthlyRent).toLocaleString("en-US")} ر.س/شهر` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Tenant Info */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">بيانات المستأجر الأساسية</p>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">الاسم *</label>
                <input
                  value={tenant.name}
                  onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                  placeholder="الاسم الكامل"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">رقم الجوال *</label>
                <input
                  value={tenant.phone}
                  onChange={(e) => setTenant({ ...tenant, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">رقم الهوية الوطنية</label>
                <input
                  value={tenant.nationalId}
                  onChange={(e) => setTenant({ ...tenant, nationalId: e.target.value })}
                  placeholder="1xxxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          )}

          {/* Step 3: Contract Data */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">بيانات العقد (معبأة تلقائياً من الوحدة)</p>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">تاريخ البداية</label>
                <input
                  type="date"
                  value={contractData.startDate}
                  onChange={(e) => setContractData({ ...contractData, startDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={contractData.endDate}
                  onChange={(e) => setContractData({ ...contractData, endDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">الإيجار الشهري (ر.س)</label>
                <input
                  type="number"
                  value={contractData.monthlyRent}
                  onChange={(e) => setContractData({ ...contractData, monthlyRent: e.target.value })}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">مبلغ الضمان (ر.س)</label>
                <input
                  type="number"
                  value={contractData.depositAmount}
                  onChange={(e) => setContractData({ ...contractData, depositAmount: e.target.value })}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-2xl p-4 space-y-3 text-sm">
                <h3 className="font-semibold text-blue-900">ملخص العقد</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-blue-700">الوحدة:</span>
                    <span className="font-medium text-blue-900">
                      {selectedUnit?.unitNumber ?? ""} — {selectedUnit?.propertyName ?? ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">المستأجر:</span>
                    <span className="font-medium text-blue-900">{tenant.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">الجوال:</span>
                    <span className="font-medium text-blue-900">{tenant.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">مدة العقد:</span>
                    <span className="font-medium text-blue-900">
                      {contractData.startDate} — {contractData.endDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">الإيجار الشهري:</span>
                    <span className="font-medium text-blue-900">
                      {Number(contractData.monthlyRent).toLocaleString("en-US")} ر.س
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
                <p className="font-semibold text-amber-800 mb-1">إجراءات تلقائية عند الإنشاء:</p>
                <ul className="text-amber-700 space-y-1 list-disc list-inside text-xs">
                  <li>إنشاء عقد الإيجار</li>
                  <li>تحديث حالة الوحدة إلى "مشغولة"</li>
                  <li>إنشاء فاتورة الشهر الأول</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                تذكير: لا تنسَ التوثيق في منصة إيجار (ejar.sa)
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            className="px-5 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            {step === 1 ? "إلغاء" : "السابق"}
          </button>

          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && !selectedUnitId) {
                  toast.error("يرجى اختيار وحدة");
                  return;
                }
                if (step === 2 && (!tenant.name || !tenant.phone)) {
                  toast.error("يرجى إدخال اسم المستأجر وجواله");
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
              {saving ? "جاري الإنشاء..." : "إنشاء العقد"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
