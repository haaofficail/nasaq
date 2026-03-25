import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, AlertCircle, Save, SlidersHorizontal } from "lucide-react";
import { clsx } from "clsx";
import { settingsApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Button } from "@/components/ui";

const TABS = [
  { key: "expenseCategories", label: "فئات المصروفات" },
  { key: "paymentMethods", label: "طرق الدفع" },
  { key: "customerSources", label: "مصادر العملاء" },
  { key: "customerTypes", label: "أنواع العملاء" },
  { key: "pricingUnits", label: "وحدات التسعير" },
];

const DEFAULTS: Record<string, string[]> = {
  paymentMethods: ["تحويل بنكي", "نقداً", "بطاقة ائتمان", "مدى", "Apple Pay"],
  customerSources: ["انستقرام", "واتساب", "توصية", "قوقل", "تيك توك", "معرض"],
  customerTypes: ["individual", "company", "government"],
  expenseCategories: ["رواتب", "إيجار", "مشتريات", "مواصلات", "تسويق", "صيانة", "أخرى"],
  pricingUnits: ["لكل حدث", "لكل ساعة", "لكل يوم", "لكل شخص"],
};

export function CustomizationPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [lists, setLists] = useState<Record<string, string[]>>({});
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const { data: res, loading, error } = useApi(() => settingsApi.customLists(), []);
  const { mutate: updateList } = useMutation(({ key, values }: any) =>
    settingsApi.updateCustomList(key, values)
  );

  useEffect(() => {
    if (res?.data) {
      const merged: Record<string, string[]> = {};
      for (const tab of TABS) {
        merged[tab.key] = res.data[tab.key] || DEFAULTS[tab.key] || [];
      }
      setLists(merged);
    }
  }, [res]);

  const currentTab = TABS[activeTab];
  const currentList = lists[currentTab?.key] || DEFAULTS[currentTab?.key] || [];

  const addItem = () => {
    const val = (newValues[currentTab.key] || "").trim();
    if (!val || currentList.includes(val)) return;
    setLists((prev) => ({ ...prev, [currentTab.key]: [...currentList, val] }));
    setNewValues((prev) => ({ ...prev, [currentTab.key]: "" }));
  };

  const removeItem = (index: number) => {
    setLists((prev) => ({
      ...prev,
      [currentTab.key]: currentList.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSavingKey(currentTab.key);
    try {
      await updateList({ key: currentTab.key, values: currentList });
      setSavedKey(currentTab.key);
      setTimeout(() => setSavedKey(null), 2000);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-brand-500" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">تخصيص النظام</h1>
        <p className="text-sm text-gray-400 mt-0.5">إدارة القوائم المخصصة المستخدمة في النماذج</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1 overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(i)}
            className={clsx(
              "flex-1 min-w-max py-2.5 px-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === i ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{currentTab?.label}</h2>
          <Button
            onClick={handleSave}
            loading={savingKey === currentTab?.key}
            icon={Save}
            variant={savedKey === currentTab?.key ? "secondary" : "primary"}
          >
            {savedKey === currentTab?.key ? "تم الحفظ" : "حفظ التغييرات"}
          </Button>
        </div>

        {/* Items list */}
        <div className="space-y-2">
          {currentList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">القائمة فارغة — أضف عناصر أدناه</p>
          ) : (
            currentList.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100"
              >
                <span className="text-sm text-gray-800">{item}</span>
                <button
                  onClick={() => removeItem(index)}
                  className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <input
            type="text"
            value={newValues[currentTab?.key] || ""}
            onChange={(e) => setNewValues((prev) => ({ ...prev, [currentTab.key]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
            placeholder="أضف عنصر جديد..."
            className="flex-1 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-50 transition-all"
          />
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة
          </button>
        </div>
        <p className="text-xs text-gray-400">اضغط Enter أو زر الإضافة لإضافة عنصر جديد</p>
      </div>
    </div>
  );
}
