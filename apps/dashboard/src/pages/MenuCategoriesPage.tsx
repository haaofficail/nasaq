import { useState } from "react";
import { toast } from "@/hooks/useToast";
import { List, Plus, Pencil, Trash2, GripVertical, ToggleLeft, ToggleRight,
         UtensilsCrossed, X, Search, ChevronDown, ChevronRight, DollarSign, Clock } from "lucide-react";
import { clsx } from "clsx";
import { menuApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Button, Input, Toggle } from "@/components/ui";
import { DurationInput } from "@/components/ui/DurationInput";

const CATEGORY_ICONS = ["🍕","🍔","🌮","🍜","🍱","🥗","🍣","🍛","🍞","☕","🥤","🍰","🍦","🥩","🍗","🥘","🍲","🫕","🧆","🥙"];

function CatModal({ cat, onClose, onSave }: { cat?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: cat?.name || "", nameEn: cat?.nameEn || "",
    description: cat?.description || "", icon: cat?.icon || "🍽️",
  });
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Modal open title={cat ? "تعديل تصنيف" : "إضافة تصنيف"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">الأيقونة</p>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
            {CATEGORY_ICONS.map(ic => (
              <button key={ic} onClick={() => f("icon", ic)}
                className={clsx("w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all",
                  form.icon === ic ? "border-brand-400 bg-brand-50 scale-110 shadow-sm" : "border-gray-200 hover:border-gray-300")}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <Input label="اسم التصنيف *" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="مثال: المقبلات" required />
        <Input label="الاسم بالإنجليزية" name="nameEn" value={form.nameEn} onChange={e => f("nameEn", e.target.value)} placeholder="Starters" dir="ltr" />
        <Input label="وصف مختصر" name="description" value={form.description} onChange={e => f("description", e.target.value)} placeholder="اختياري" />
        <div className="flex gap-3 pt-1">
          <Button className="flex-1" onClick={() => { if (form.name.trim()) onSave(form); }}>حفظ</Button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

function ItemModal({ item, categories, onClose, onSave }: { item?: any; categories: any[]; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: item?.name || "", nameEn: item?.nameEn || "",
    description: item?.description || "", categoryId: item?.categoryId || (categories[0]?.id || ""),
    price: item?.price || "", preparationTime: item?.preparationTime || "10",
    isAvailable: item?.isAvailable ?? true, isPopular: item?.isPopular ?? false,
    calories: item?.calories || "",
  });
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Modal open title={item ? "تعديل صنف" : "إضافة صنف"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="اسم الصنف *" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="مثال: شاورما دجاج" required />
          <Input label="الاسم بالإنجليزية" name="nameEn" value={form.nameEn} onChange={e => f("nameEn", e.target.value)} placeholder="Chicken Shawarma" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">التصنيف</label>
          <select value={form.categoryId} onChange={e => f("categoryId", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300">
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <Input label="وصف الصنف" name="description" value={form.description} onChange={e => f("description", e.target.value)} placeholder="مكونات أو تفاصيل..." />
        <div className="grid grid-cols-3 gap-3">
          <Input label="السعر (ر.س) *" name="price" type="number" value={form.price} onChange={e => f("price", e.target.value)} placeholder="0" dir="ltr" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">وقت التحضير</label>
            <DurationInput valueMinutes={parseInt(form.preparationTime)||10} onChange={m => f("preparationTime", String(m))} units={["minute","hour"]} placeholder="10" />
          </div>
          <Input label="السعرات" name="calories" type="number" value={form.calories} onChange={e => f("calories", e.target.value)} placeholder="اختياري" dir="ltr" />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={form.isAvailable} onChange={v => f("isAvailable", v)} />
            <span className="text-sm text-gray-700">متاح</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Toggle checked={form.isPopular} onChange={v => f("isPopular", v)} />
            <span className="text-sm text-gray-700">الأكثر طلباً</span>
          </label>
        </div>
        <div className="flex gap-3 pt-1">
          <Button className="flex-1" onClick={() => { if (form.name.trim() && form.price) onSave(form); }}>حفظ</Button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

export function MenuCategoriesPage() {
  const { data: catData, loading, refetch } = useApi(() => menuApi.categories(), []);
  const { data: itemData, refetch: refetchItems } = useApi(() => menuApi.items(), []);
  const { mutate: createCat }  = useMutation((d: any) => menuApi.createCategory(d));
  const { mutate: updateCat }  = useMutation((d: any) => menuApi.updateCategory(d.id, d));
  const { mutate: deleteCat }  = useMutation((id: string) => menuApi.deleteCategory(id));
  const { mutate: createItem } = useMutation((d: any) => menuApi.createItem(d));
  const { mutate: updateItem } = useMutation((d: any) => menuApi.updateItem(d.id, d));
  const { mutate: deleteItem } = useMutation((id: string) => menuApi.deleteItem(id));
  const { mutate: toggleCat }  = useMutation((d: any) => menuApi.updateCategory(d.id, d));

  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [catModal, setCatModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [itemModal, setItemModal] = useState<{ open: boolean; item?: any; categoryId?: string }>({ open: false });

  const categories: any[] = catData?.data || [];
  const allItems: any[]   = itemData?.data || [];

  const filtered = categories.filter(c =>
    !search || c.name.includes(search) || c.nameEn?.includes(search)
  );

  const itemsFor = (catId: string) => allItems.filter((i: any) => i.categoryId === catId);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveCat = async (form: any) => {
    try {
      catModal.item ? await updateCat({ ...form, id: catModal.item.id }) : await createCat(form);
      toast.success("تم حفظ التصنيف");
      setCatModal({ open: false });
      refetch();
    } catch { toast.error("فشل الحفظ"); }
  };

  const saveItem = async (form: any) => {
    try {
      if (itemModal.item) {
        await updateItem({ ...form, id: itemModal.item.id });
      } else {
        await createItem({ ...form, categoryId: itemModal.categoryId || form.categoryId });
      }
      toast.success("تم حفظ الصنف");
      setItemModal({ open: false });
      refetchItems();
    } catch { toast.error("فشل الحفظ"); }
  };

  const handleDeleteCat = async (id: string, name: string) => {
    if (!confirm(`حذف تصنيف "${name}"؟ سيتم حذف جميع الأصناف المرتبطة به.`)) return;
    try { await deleteCat(id); toast.success("تم الحذف"); refetch(); refetchItems(); }
    catch { toast.error("فشل الحذف"); }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("حذف هذا الصنف؟")) return;
    try { await deleteItem(id); toast.success("تم الحذف"); refetchItems(); }
    catch { toast.error("فشل الحذف"); }
  };

  const handleToggleCat = async (cat: any) => {
    try { await toggleCat({ id: cat.id, isActive: !cat.isActive }); refetch(); }
    catch { toast.error("فشل التحديث"); }
  };

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
          <div className="h-5 w-40 bg-gray-100 rounded mb-3" />
          <div className="space-y-2">{[...Array(2)].map((_, j) => <div key={j} className="h-10 bg-gray-50 rounded-xl" />)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <List className="w-5 h-5 text-brand-500" /> تصنيفات القائمة
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">إدارة تصنيفات وأصناف قائمة الطعام</p>
        </div>
        <Button icon={Plus} onClick={() => setCatModal({ open: true })}>تصنيف جديد</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "التصنيفات", value: categories.length, icon: List, color: "text-brand-500 bg-brand-50" },
          { label: "الأصناف", value: allItems.length, icon: UtensilsCrossed, color: "text-emerald-600 bg-emerald-50" },
          { label: "متاح", value: allItems.filter((i: any) => i.isAvailable).length, icon: ToggleRight, color: "text-blue-600 bg-blue-50" },
          { label: "الأكثر طلباً", value: allItems.filter((i: any) => i.isPopular).length, icon: DollarSign, color: "text-amber-600 bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mb-2", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث في التصنيفات..."
          className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-500" />
      </div>

      {/* Categories accordion */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
          <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">لا توجد تصنيفات — أنشئ أول تصنيف</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(cat => {
            const items = itemsFor(cat.id);
            const open = expanded.has(cat.id);
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Category header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <button onClick={() => toggleExpand(cat.id)} className="text-gray-400 hover:text-gray-600">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <span className="text-2xl">{cat.icon || "🍽️"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{cat.name}</p>
                      {cat.nameEn && <span className="text-xs text-gray-400 dir-ltr">{cat.nameEn}</span>}
                      <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium",
                        cat.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                        {cat.isActive ? "نشط" : "مخفي"}
                      </span>
                    </div>
                    {cat.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{cat.description}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{items.length} صنف</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleToggleCat(cat)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors">
                      {cat.isActive ? <ToggleRight className="w-4 h-4 text-brand-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setCatModal({ open: true, item: cat })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-gray-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteCat(cat.id, cat.name)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setItemModal({ open: true, categoryId: cat.id })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 text-xs font-medium hover:bg-brand-100 transition-colors">
                      <Plus className="w-3 h-3" /> صنف
                    </button>
                  </div>
                </div>

                {/* Items list */}
                {open && (
                  <div className="border-t border-gray-50">
                    {items.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400">لا توجد أصناف — أضف أول صنف</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {items.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                            <GripVertical className="w-4 h-4 text-gray-200 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                {item.isPopular && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">⭐ الأكثر طلباً</span>
                                )}
                                {!item.isAvailable && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-xs">غير متاح</span>
                                )}
                              </div>
                              {item.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>}
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-brand-600 font-semibold">{Number(item.price).toFixed(2)} ر.س</span>
                                {item.preparationTime && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />{item.preparationTime} د
                                  </span>
                                )}
                                {item.calories && <span className="text-xs text-gray-400">{item.calories} سع</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => setItemModal({ open: true, item, categoryId: cat.id })}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition-colors">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {catModal.open && (
        <CatModal cat={catModal.item} onClose={() => setCatModal({ open: false })} onSave={saveCat} />
      )}
      {itemModal.open && (
        <ItemModal item={itemModal.item} categories={categories} onClose={() => setItemModal({ open: false })} onSave={saveItem} />
      )}    </div>
  );
}
