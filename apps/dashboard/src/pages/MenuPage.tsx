import { useState, useEffect } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { menuApi } from "@/lib/api";
import { Plus, Edit2, Trash2, Search, X, UtensilsCrossed, ToggleLeft, ToggleRight, Star, ChevronDown, ChevronRight, Settings2, GripVertical } from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { confirmDialog } from "@/components/ui";
import { toast } from "@/hooks/useToast";

interface MenuCategory { id: string; name: string; description?: string; image_url?: string; is_active?: boolean; }
interface MenuItem { id: string; name: string; description?: string; price: number; image_url?: string; category_id?: string; is_available?: boolean; is_active?: boolean; is_popular?: boolean; preparation_time?: number; }
interface ModifierOption { id: string; name: string; price_delta: number; is_default: boolean; is_available: boolean; sort_order: number; }
interface ModifierGroup { id: string; name: string; selection_type: "single" | "multiple"; is_required: boolean; min_select: number; max_select: number; sort_order: number; modifiers: ModifierOption[] | null; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#eef2f6] shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Modifier Groups Panel ─────────────────────────────────────────────────────
function ModifierGroupsPanel({ itemId }: { itemId: string }) {
  const { data, loading, refetch } = useApi(() => menuApi.modifierGroups(itemId), [itemId]);
  const groups: ModifierGroup[] = data?.data || [];

  const createGroup  = useMutation((d: any) => menuApi.createModifierGroup(itemId, d));
  const deleteGroup  = useMutation((id: string) => menuApi.deleteModifierGroup(id));
  const createMod    = useMutation(({ groupId, ...d }: any) => menuApi.createModifier(groupId, d));
  const deleteMod    = useMutation((id: string) => menuApi.deleteModifier(id));

  const [newGroup, setNewGroup] = useState<{ name: string; selectionType: "single" | "multiple"; isRequired: boolean } | null>(null);
  const [addModState, setAddModState] = useState<{ groupId: string; name: string; priceDelta: string } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const saveGroup = async () => {
    if (!newGroup?.name.trim()) return;
    await createGroup.mutate({ name: newGroup.name, selectionType: newGroup.selectionType, isRequired: newGroup.isRequired, maxSelect: newGroup.selectionType === "single" ? 1 : 5 });
    setNewGroup(null);
    toast.success("تم إضافة مجموعة التخصيص");
    refetch();
  };

  const saveMod = async () => {
    if (!addModState?.name.trim() || !addModState.groupId) return;
    await createMod.mutate({ groupId: addModState.groupId, name: addModState.name, priceDelta: parseFloat(addModState.priceDelta) || 0 });
    setAddModState(null);
    toast.success("تم إضافة الخيار");
    refetch();
  };

  const handleDeleteGroup = async (g: ModifierGroup) => {
    const ok = await confirmDialog({ title: `حذف "${g.name}"؟`, message: "سيُحذف مع جميع خياراته", danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    await deleteGroup.mutate(g.id);
    toast.success("تم الحذف");
    refetch();
  };

  const handleDeleteMod = async (mod: ModifierOption) => {
    const ok = await confirmDialog({ title: `حذف "${mod.name}"؟`, danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    await deleteMod.mutate(mod.id);
    refetch();
  };

  if (loading) return <div className="py-6 flex justify-center"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {groups.length === 0 && !newGroup && (
        <div className="border-2 border-dashed border-[#eef2f6] rounded-2xl p-6 text-center">
          <Settings2 className="w-7 h-7 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">لا توجد مجموعات تخصيص بعد</p>
          <p className="text-xs text-gray-300 mt-1">مثال: الحجم، الإضافات، درجة الحلاوة</p>
        </div>
      )}

      {groups.map(g => (
        <div key={g.id} className="border border-[#eef2f6] rounded-2xl overflow-hidden">
          {/* Group header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
            <button onClick={() => setExpanded(p => ({ ...p, [g.id]: !p[g.id] }))} className="flex items-center gap-2 flex-1 min-w-0">
              {expanded[g.id] ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
              <span className="text-sm font-semibold text-gray-800">{g.name}</span>
              <span className="text-xs bg-white border border-[#eef2f6] text-gray-500 px-2 py-0.5 rounded-full">
                {g.selection_type === "single" ? "اختيار واحد" : "اختيار متعدد"}
              </span>
              {g.is_required && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">مطلوب</span>}
              <span className="text-xs text-gray-400">{(g.modifiers || []).length} خيار</span>
            </button>
            <button onClick={() => handleDeleteGroup(g)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Modifiers list */}
          {expanded[g.id] && (
            <div className="p-3 space-y-1.5">
              {(g.modifiers || []).map(m => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-[#eef2f6] rounded-xl group">
                  <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  <span className="flex-1 text-sm text-gray-800">{m.name}</span>
                  {m.price_delta > 0
                    ? <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">+{m.price_delta} ر.س</span>
                    : <span className="text-xs text-gray-300">مجاني</span>
                  }
                  {m.is_default && <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-lg">افتراضي</span>}
                  <button onClick={() => handleDeleteMod(m)} className="w-8 h-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add modifier inline */}
              {addModState?.groupId === g.id ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    autoFocus
                    value={addModState.name}
                    onChange={e => setAddModState(p => p ? { ...p, name: e.target.value } : p)}
                    onKeyDown={e => { if (e.key === "Enter") saveMod(); if (e.key === "Escape") setAddModState(null); }}
                    placeholder="اسم الخيار (مثال: كبير)"
                    className="flex-1 border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"
                  />
                  <input
                    type="number"
                    value={addModState.priceDelta}
                    onChange={e => setAddModState(p => p ? { ...p, priceDelta: e.target.value } : p)}
                    placeholder="إضافة سعر"
                    className="w-28 border border-[#eef2f6] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-300"
                  />
                  <button onClick={saveMod} className="bg-brand-500 text-white rounded-xl px-3 py-2 text-xs font-medium hover:bg-brand-600">إضافة</button>
                  <button onClick={() => setAddModState(null)} className="border border-[#eef2f6] text-gray-500 rounded-xl px-3 py-2 text-xs hover:bg-[#f8fafc]">إلغاء</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddModState({ groupId: g.id, name: "", priceDelta: "" })}
                  className="w-full flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 font-medium py-1.5 px-3 hover:bg-brand-50 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة خيار
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add new group */}
      {newGroup ? (
        <div className="border-2 border-brand-100 rounded-2xl p-4 space-y-3 bg-brand-50/30">
          <input
            autoFocus
            value={newGroup.name}
            onChange={e => setNewGroup(p => p ? { ...p, name: e.target.value } : p)}
            placeholder="اسم المجموعة (مثال: الحجم، الإضافات)"
            className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 bg-white"
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white border border-[#eef2f6] rounded-xl p-1">
              {(["single", "multiple"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setNewGroup(p => p ? { ...p, selectionType: t } : p)}
                  className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", newGroup.selectionType === t ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-[#f8fafc]")}
                >{t === "single" ? "اختيار واحد" : "اختيار متعدد"}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <button type="button" onClick={() => setNewGroup(p => p ? { ...p, isRequired: !p.isRequired } : p)} className={clsx("w-9 h-5 rounded-full transition-colors relative shrink-0", newGroup.isRequired ? "bg-red-400" : "bg-gray-200")}>
                <span className={clsx("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", newGroup.isRequired ? "right-0.5" : "left-0.5")} />
              </button>
              <span className="text-xs text-gray-600">مطلوب</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={saveGroup} disabled={createGroup.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">حفظ المجموعة</button>
            <button onClick={() => setNewGroup(null)} className="flex-1 border border-[#eef2f6] text-gray-600 rounded-xl py-2 text-sm hover:bg-[#f8fafc]">إلغاء</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setNewGroup({ name: "", selectionType: "single", isRequired: false })}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-brand-200 text-brand-500 rounded-2xl py-3 text-sm font-medium hover:bg-brand-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> إضافة مجموعة تخصيص
        </button>
      )}
    </div>
  );
}

export function MenuPage() {
  const { data: catData, loading: catLoading, refetch: refetchCats } = useApi(() => menuApi.categories(), []);
  const { data: itemData, loading: itemLoading, refetch: refetchItems } = useApi(() => menuApi.items(), []);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catModal, setCatModal] = useState<{ open: boolean; item?: MenuCategory }>({ open: false });
  const [itemModal, setItemModal] = useState<{ open: boolean; item?: MenuItem; catId?: string; tab?: "info" | "modifiers" }>({ open: false });
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [itemForm, setItemForm] = useState({ name: "", price: "", description: "", image_url: "", is_available: true, is_popular: false, preparation_time: "" });

  const createCat  = useMutation((d: any) => menuApi.createCategory(d));
  const updateCat  = useMutation(({ id, ...d }: any) => menuApi.updateCategory(id, d));
  const deleteCat  = useMutation((id: string) => menuApi.deleteCategory(id));
  const createItem = useMutation((d: any) => menuApi.createItem(d));
  const updateItem = useMutation(({ id, ...d }: any) => menuApi.updateItem(id, d));
  const deleteItem = useMutation((id: string) => menuApi.deleteItem(id));

  const categories: MenuCategory[] = catData?.data || [];
  const allItems: MenuItem[] = itemData?.data || [];

  const filteredCats = categories.filter(c => !search || c.name.includes(search));
  const activeCatId = selectedCat || categories[0]?.id;
  const catItems = allItems.filter(i => i.category_id === activeCatId).filter(i => !search || i.name.includes(search));

  const openCatModal = (item?: MenuCategory) => {
    setCatForm({ name: item?.name || "", description: item?.description || "" });
    setCatModal({ open: true, item });
  };

  const openItemModal = (catId: string, item?: MenuItem, tab: "info" | "modifiers" = "info") => {
    setItemForm({
      name: item?.name || "",
      price: item ? String(item.price) : "",
      description: item?.description || "",
      image_url: item?.image_url || "",
      is_available: item?.is_available !== false,
      is_popular: item?.is_popular || false,
      preparation_time: item?.preparation_time ? String(item.preparation_time) : "",
    });
    setItemModal({ open: true, item, catId, tab });
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) return;
    if (catModal.item) {
      const res = await updateCat.mutate({ id: catModal.item.id, ...catForm });
      if (!res) return;
    } else {
      const res = await createCat.mutate(catForm);
      if (!res) return;
    }
    setCatModal({ open: false });
    toast.success(catModal.item ? "تم تعديل التصنيف" : "تم إضافة التصنيف");
    refetchCats();
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) return;
    const payload = {
      name: itemForm.name,
      price: parseFloat(itemForm.price) || 0,
      description: itemForm.description || null,
      imageUrl: itemForm.image_url || null,
      categoryId: itemModal.catId,
      isAvailable: itemForm.is_available,
      isPopular: itemForm.is_popular,
      preparationTime: itemForm.preparation_time ? parseInt(itemForm.preparation_time) : 10,
    };
    if (itemModal.item) {
      await updateItem.mutate({ id: itemModal.item.id, ...payload });
      setItemModal({ open: false });
      toast.success("تم تعديل الصنف");
    } else {
      const res = await createItem.mutate(payload);
      const created = (res as any)?.data;
      if (created?.id) {
        // انتقل تلقائياً لتبويب التخصيص بعد إنشاء الصنف
        setItemModal(p => ({ ...p, item: created, tab: "modifiers" }));
        toast.success("تم إضافة الصنف — يمكنك الآن إضافة خيارات التخصيص");
      } else {
        setItemModal({ open: false });
        toast.success("تم إضافة الصنف");
      }
    }
    refetchItems();
  };

  const handleDeleteCat = async (id: string, name: string) => {
    const ok = await confirmDialog({ title: `حذف تصنيف "${name}"؟`, message: "سيُحذف التصنيف وجميع أصنافه نهائياً", danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    const res = await deleteCat.mutate(id);
    if (!res) return;
    if (selectedCat === id) setSelectedCat(null);
    toast.success("تم حذف التصنيف");
    refetchCats();
    refetchItems();
  };

  const handleDeleteItem = async (id: string, name: string) => {
    const ok = await confirmDialog({ title: `حذف "${name}"؟`, danger: true, confirmLabel: "حذف" });
    if (!ok) return;
    const res = await deleteItem.mutate(id);
    if (!res) return;
    toast.success("تم حذف الصنف");
    refetchItems();
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    await updateItem.mutate({ id: item.id, isAvailable: !item.is_available });
    toast.info(item.is_available ? "تم إيقاف الصنف مؤقتاً" : "تم إتاحة الصنف");
    refetchItems();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-brand-500" /> قائمة الطعام
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{categories.length} تصنيف · {allItems.length} صنف</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-[#eef2f6] rounded-xl px-3 py-2 w-44">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="bg-transparent outline-none text-sm text-gray-700 w-full" />
          </div>
          <button onClick={() => openCatModal()} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-4 h-4" /> تصنيف
          </button>
        </div>
      </div>

      {(catLoading || itemLoading) && <SkeletonRows />}

      {!catLoading && categories.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#eef2f6] text-center py-16">
          <UtensilsCrossed className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">لا توجد تصنيفات بعد</p>
          <p className="text-xs text-gray-300 mb-4">أضف تصنيفاً مثل "المشروبات" أو "الحلويات"</p>
          <button onClick={() => openCatModal()} className="bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-4 h-4 inline ml-1" />أضف أول تصنيف
          </button>
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex gap-4 min-h-[500px]">
          {/* Categories panel */}
          <div className="w-52 shrink-0 flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-400 px-1 mb-1">التصنيفات</p>
            {filteredCats.map(cat => {
              const count = allItems.filter(i => i.category_id === cat.id).length;
              const active = cat.id === activeCatId;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={clsx(
                    "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                    active ? "bg-brand-500 text-white" : "bg-white border border-[#eef2f6] hover:border-brand-200"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={clsx("text-sm font-medium truncate", active ? "text-white" : "text-gray-800")}>{cat.name}</p>
                    <p className={clsx("text-xs", active ? "text-blue-100" : "text-gray-400")}>{count} صنف</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openCatModal(cat)} className={clsx("w-8 h-8 flex items-center justify-center rounded-lg", active ? "hover:bg-blue-600" : "hover:bg-gray-100 text-gray-400")}>
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteCat(cat.id, cat.name)} className={clsx("w-8 h-8 flex items-center justify-center rounded-lg", active ? "hover:bg-red-400" : "hover:bg-red-50 text-gray-400 hover:text-red-500")}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Items grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                {categories.find(c => c.id === activeCatId)?.name || ""}
                <span className="text-xs font-normal text-gray-400 mr-2">{catItems.length} صنف</span>
              </p>
              {activeCatId && (
                <button
                  onClick={() => openItemModal(activeCatId)}
                  className="flex items-center gap-1.5 border border-brand-200 text-brand-600 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-brand-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة صنف
                </button>
              )}
            </div>

            {catItems.length === 0 && !itemLoading && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-[#eef2f6] text-center py-12 cursor-pointer hover:border-brand-200 transition-colors" onClick={() => activeCatId && openItemModal(activeCatId)}>
                <Plus className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm font-medium">لا توجد أصناف هنا بعد</p>
                <p className="text-xs text-gray-300 mt-1">اضغط لإضافة أول صنف في هذا التصنيف</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {catItems.map(item => (
                <div key={item.id} className={clsx("bg-white rounded-2xl border overflow-hidden group transition-shadow hover:shadow-md", item.is_available !== false ? "border-[#eef2f6]" : "border-red-100 opacity-70")}>
                  <div className="aspect-video relative overflow-hidden bg-gray-50">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-6 h-6 text-gray-200" />
                      </div>
                    )}
                    {item.is_popular && (
                      <div className="absolute top-1.5 right-1.5 bg-amber-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" /> مميز
                      </div>
                    )}
                    {item.is_available === false && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-lg">نفذ مؤقتاً</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm font-bold text-brand-600 tabular-nums">{item.price} ر.س</p>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleToggleAvailable(item)} title={item.is_available !== false ? "إيقاف مؤقت" : "إتاحة"} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                          {item.is_available !== false ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5 text-red-400" />}
                        </button>
                        <button onClick={() => openItemModal(item.category_id || activeCatId!, item)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-500 transition-colors">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id, item.name)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModal.open && (
        <Modal title={catModal.item ? "تعديل التصنيف" : "تصنيف جديد"} onClose={() => setCatModal({ open: false })}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم التصنيف *</label>
              <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: المشروبات الباردة" autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الوصف (اختياري)</label>
              <input value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="وصف مختصر" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveCat} disabled={createCat.loading || updateCat.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">حفظ</button>
              <button onClick={() => setCatModal({ open: false })} className="flex-1 border border-[#eef2f6] text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-[#f8fafc] transition-colors">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Item Modal — wide with tabs */}
      {itemModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#eef2f6] shrink-0">
              <h3 className="font-bold text-gray-900">{itemModal.item ? "تعديل الصنف" : "صنف جديد"}</h3>
              <button onClick={() => setItemModal({ open: false })} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#eef2f6] px-5 shrink-0">
              {[
                { key: "info",      label: "المعلومات الأساسية" },
                { key: "modifiers", label: "التخصيص (الحجم والإضافات)" },
              ].map(t => (
                <button
                  key={t.key}
                  disabled={t.key === "modifiers" && !itemModal.item}
                  onClick={() => setItemModal(p => ({ ...p, tab: t.key as "info" | "modifiers" }))}
                  className={clsx(
                    "px-[10px] py-[6px] text-sm font-medium border-b-2 transition-colors -mb-px",
                    (itemModal.tab || "info") === t.key
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-gray-500 hover:text-gray-700",
                    t.key === "modifiers" && !itemModal.item && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {t.label}
                  {t.key === "modifiers" && !itemModal.item && <span className="text-xs mr-1">(احفظ أولاً)</span>}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {(itemModal.tab || "info") === "info" ? (
                <div className="space-y-4">
                  <ImageUpload label="صورة الصنف" value={itemForm.image_url} onChange={url => setItemForm(p => ({ ...p, image_url: url }))} aspectRatio="video" />
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم الصنف *</label>
                    <input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: كابتشينو" autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">السعر الأساسي (ر.س) *</label>
                      <input type="number" value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">وقت التحضير (دقيقة)</label>
                      <input type="number" value={itemForm.preparation_time} onChange={e => setItemForm(p => ({ ...p, preparation_time: e.target.value }))} className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="5" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">الوصف</label>
                    <textarea value={itemForm.description} onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-[#eef2f6] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 resize-none" placeholder="وصف الصنف..." />
                  </div>
                  <div className="flex items-center gap-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button type="button" onClick={() => setItemForm(p => ({ ...p, is_available: !p.is_available }))} className={clsx("w-10 h-6 rounded-full transition-colors relative shrink-0", itemForm.is_available ? "bg-brand-500" : "bg-gray-200")}>
                        <span className={clsx("absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all", itemForm.is_available ? "right-1" : "left-1")} />
                      </button>
                      <span className="text-sm text-gray-600">متاح للطلب</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button type="button" onClick={() => setItemForm(p => ({ ...p, is_popular: !p.is_popular }))} className={clsx("w-10 h-6 rounded-full transition-colors relative shrink-0", itemForm.is_popular ? "bg-amber-400" : "bg-gray-200")}>
                        <span className={clsx("absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all", itemForm.is_popular ? "right-1" : "left-1")} />
                      </button>
                      <span className="text-sm text-gray-600">مميز</span>
                    </label>
                  </div>
                </div>
              ) : (
                itemModal.item && <ModifierGroupsPanel itemId={itemModal.item.id} />
              )}
            </div>

            {/* Footer */}
            {(itemModal.tab || "info") === "info" && (
              <div className="p-5 border-t border-[#eef2f6] flex gap-2 shrink-0">
                <button onClick={saveItem} disabled={createItem.loading || updateItem.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">
                  {createItem.loading || updateItem.loading ? "جاري الحفظ..." : "حفظ"}
                </button>
                {!itemModal.item && (
                  <p className="text-xs text-gray-400 self-center">بعد الحفظ يمكنك إضافة خيارات التخصيص</p>
                )}
                <button onClick={() => setItemModal({ open: false })} className="px-5 border border-[#eef2f6] text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-[#f8fafc] transition-colors">إلغاء</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
