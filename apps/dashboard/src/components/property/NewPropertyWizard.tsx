import { useState } from "react";
import { propertyApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PROPERTY_TYPES = [
  { value: "residential", label: "سكني", desc: "شقق، فلل، توين هاوس" },
  { value: "commercial", label: "تجاري", desc: "محلات، مكاتب، معارض" },
  { value: "land", label: "أرض", desc: "أرض فضاء أو زراعية" },
  { value: "mixed", label: "متعدد الاستخدام", desc: "سكني + تجاري" },
  { value: "industrial", label: "صناعي", desc: "مستودعات، مصانع" },
  { value: "hotel", label: "فندقي", desc: "فنادق، شقق فندقية" },
];

const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الظهران", "أبها", "تبوك", "بريدة",
  "الطائف", "حائل", "الجبيل", "ينبع", "القصيم",
];

interface UnitDraft {
  unitNumber: string;
  floor: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  monthlyRent: string;
}

const EMPTY_UNIT: UnitDraft = {
  unitNumber: "", floor: "", area: "", bedrooms: "", bathrooms: "", monthlyRent: "",
};

export function NewPropertyWizard({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [propertyType, setPropertyType] = useState("");

  // Step 2
  const [basicInfo, setBasicInfo] = useState({
    name: "",
    address: "",
    neighborhood: "",
    city: "",
  });

  // Step 3
  const [unitCount, setUnitCount] = useState(1);
  const [units, setUnits] = useState<UnitDraft[]>([{ ...EMPTY_UNIT }]);

  if (!open) return null;

  function handleUnitCountChange(count: number) {
    const c = Math.max(1, count);
    setUnitCount(c);
    if (c > units.length) {
      // Copy last unit specs to new units
      const last = units[units.length - 1];
      const newUnits = [...units];
      while (newUnits.length < c) {
        newUnits.push({ ...last, unitNumber: String(newUnits.length + 1) });
      }
      setUnits(newUnits);
    } else {
      setUnits(units.slice(0, c));
    }
  }

  function updateUnit(index: number, field: keyof UnitDraft, value: string) {
    const updated = [...units];
    updated[index] = { ...updated[index], [field]: value };
    setUnits(updated);
  }

  async function handleSubmit() {
    if (!basicInfo.name || !propertyType) {
      toast.error("يرجى ملء جميع البيانات المطلوبة");
      return;
    }
    setSaving(true);
    try {
      const propertyRes = await propertyApi.properties.create({
        name: basicInfo.name,
        address: basicInfo.address,
        neighborhood: basicInfo.neighborhood,
        city: basicInfo.city,
        propertyType,
      }) as any;

      const propertyId = propertyRes?.data?.id;

      if (propertyId && units.length > 0) {
        const unitsPayload = units
          .filter((u) => u.unitNumber)
          .map((u) => ({
            unitNumber: u.unitNumber,
            floor: u.floor ? Number(u.floor) : undefined,
            area: u.area ? Number(u.area) : undefined,
            bedrooms: u.bedrooms ? Number(u.bedrooms) : undefined,
            bathrooms: u.bathrooms ? Number(u.bathrooms) : undefined,
            monthlyRent: u.monthlyRent ? Number(u.monthlyRent) : undefined,
            propertyId,
          }));

        if (unitsPayload.length > 0) {
          await propertyApi.units.bulk({ units: unitsPayload, propertyId });
        }
      }

      toast.success("تم إنشاء العقار بنجاح");
      onSuccess();
      onClose();
      setStep(1);
      setPropertyType("");
      setBasicInfo({ name: "", address: "", neighborhood: "", city: "" });
      setUnits([{ ...EMPTY_UNIT }]);
    } catch (e: any) {
      toast.error(`فشل إنشاء العقار: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">عقار جديد</h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    s === step
                      ? "text-white"
                      : s < step
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                  style={s === step ? { backgroundColor: "#5b9bd5" } : {}}
                >
                  {s < step ? "✓" : s}
                </div>
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Property Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">نوع العقار</h3>
                <p className="text-gray-500 text-sm">اختر نوع العقار الذي تريد إضافته</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setPropertyType(type.value)}
                    className={`p-4 rounded-2xl border-2 text-right transition-all ${
                      propertyType === type.value
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">البيانات الأساسية</h3>
                <p className="text-gray-500 text-sm">أدخل معلومات العقار</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">اسم العقار *</label>
                  <input
                    value={basicInfo.name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                    placeholder="مثال: برج النزهة"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">العنوان التفصيلي</label>
                  <input
                    value={basicInfo.address}
                    onChange={(e) => setBasicInfo({ ...basicInfo, address: e.target.value })}
                    placeholder="شارع / رقم المبنى"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">الحي</label>
                  <input
                    value={basicInfo.neighborhood}
                    onChange={(e) => setBasicInfo({ ...basicInfo, neighborhood: e.target.value })}
                    placeholder="اسم الحي"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">المدينة</label>
                  <select
                    value={basicInfo.city}
                    onChange={(e) => setBasicInfo({ ...basicInfo, city: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">اختر المدينة</option>
                    {SAUDI_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Units */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">الوحدات</h3>
                <p className="text-gray-500 text-sm">حدد عدد الوحدات وأدخل مواصفاتها</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">عدد الوحدات:</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUnitCountChange(unitCount - 1)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold">{unitCount}</span>
                  <button
                    onClick={() => handleUnitCountChange(unitCount + 1)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-72 overflow-y-auto">
                {units.map((unit, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <h4 className="font-medium text-gray-800 text-sm">وحدة {i + 1}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">رقم الوحدة</label>
                        <input
                          value={unit.unitNumber}
                          onChange={(e) => updateUnit(i, "unitNumber", e.target.value)}
                          placeholder={`وحدة ${i + 1}`}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">الدور</label>
                        <input
                          type="number"
                          value={unit.floor}
                          onChange={(e) => updateUnit(i, "floor", e.target.value)}
                          placeholder="1"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">المساحة (م²)</label>
                        <input
                          type="number"
                          value={unit.area}
                          onChange={(e) => updateUnit(i, "area", e.target.value)}
                          placeholder="100"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">الإيجار الشهري</label>
                        <input
                          type="number"
                          value={unit.monthlyRent}
                          onChange={(e) => updateUnit(i, "monthlyRent", e.target.value)}
                          placeholder="3000"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">غرف النوم</label>
                        <input
                          type="number"
                          value={unit.bedrooms}
                          onChange={(e) => updateUnit(i, "bedrooms", e.target.value)}
                          placeholder="2"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">دورات المياه</label>
                        <input
                          type="number"
                          value={unit.bathrooms}
                          onChange={(e) => updateUnit(i, "bathrooms", e.target.value)}
                          placeholder="1"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
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

          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !propertyType) {
                  toast.error("يرجى اختيار نوع العقار");
                  return;
                }
                if (step === 2 && !basicInfo.name) {
                  toast.error("يرجى إدخال اسم العقار");
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
              {saving ? "جاري الإنشاء..." : "إنشاء العقار"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
