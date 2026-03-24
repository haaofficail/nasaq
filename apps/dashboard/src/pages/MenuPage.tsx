import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { categoriesApi, servicesApi } from "@/lib/api";
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Search, X, UtensilsCrossed } from "lucide-react";
import { clsx } from "clsx";

interface Category { id: string; name: string; description?: string; }
interface Service { id: string; name: string; price: number; duration?: number; description?: string; categoryId?: string; isActive?: boolean; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function MenuPage() {
  const { data: catData, loading: catLoading, refetch: refetchCats } = useApi(() => categoriesApi.list(true));
  const { data: svcData, loading: svcLoading, refetch: refetchSvcs } = useApi(() => servicesApi.list());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [catModal, setCatModal] = useState<{ open: boolean; item?: Category }>({ open: false });
  const [svcModal, setSvcModal] = useState<{ open: boolean; item?: Service; catId?: string }>({ open: false });
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [svcForm, setSvcForm] = useState({ name: "", price: "", duration: "", description: "", categoryId: "", isActive: true });

  const createCat = useMutation((d: any) => categoriesApi.create(d));
  const updateCat = useMutation(({ id, ...d }: any) => categoriesApi.update(id, d));
  const deleteCat = useMutation((id: string) => categoriesApi.delete(id));
  const createSvc = useMutation((d: any) => servicesApi.create(d));
  const updateSvc = useMutation(({ id, ...d }: any) => servicesApi.update(id, d));
  const deleteSvc = useMutation((id: string) => servicesApi.delete(id));

  const categories: Category[] = catData?.data || [];
  const services: Service[] = svcData?.data || [];
  const filteredCats = categories.filter(c => c.name.includes(search));

  const toggle = (id: string) => {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const openCatModal = (item?: Category) => {
    setCatForm({ name: item?.name || "", description: item?.description || "" });
    setCatModal({ open: true, item });
  };

  const openSvcModal = (catId: string, item?: Service) => {
    setSvcForm({ name: item?.name || "", price: String(item?.price || ""), duration: String(item?.duration || ""), description: item?.description || "", categoryId: catId, isActive: item?.isActive !== false });
    setSvcModal({ open: true, item, catId });
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) return;
    if (catModal.item) await updateCat.mutate({ id: catModal.item.id, ...catForm });
    else await createCat.mutate(catForm);
    setCatModal({ open: false });
    refetchCats();
  };

  const saveSvc = async () => {
    if (!svcForm.name.trim()) return;
    const payload = { name: svcForm.name, price: parseFloat(svcForm.price) || 0, duration: parseInt(svcForm.duration) || 60, description: svcForm.description, categoryId: svcForm.categoryId, isActive: svcForm.isActive };
    if (svcModal.item) await updateSvc.mutate({ id: svcModal.item.id, ...payload });
    else await createSvc.mutate(payload);
    setSvcModal({ open: false });
    refetchSvcs();
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("حذف هذا التصنيف؟")) return;
    await deleteCat.mutate(id);
    refetchCats();
  };

  const handleDeleteSvc = async (id: string) => {
    if (!confirm("حذف هذا الصنف؟")) return;
    await deleteSvc.mutate(id);
    refetchSvcs();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-brand-500" /> قائمة الطعام
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{categories.length} تصنيف · {services.length} صنف</p>
        </div>
        <button onClick={() => openCatModal()} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" /> تصنيف جديد
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5 w-full max-w-xs">
        <Search className="w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في التصنيفات..." className="bg-transparent outline-none text-sm text-gray-700 w-full" />
      </div>

      {(catLoading || svcLoading) && <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>}

      <div className="space-y-2">
        {filteredCats.map(cat => {
          const catServices = services.filter(s => s.categoryId === cat.id);
          const open = expanded.has(cat.id);
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggle(cat.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{cat.name}</p>
                    {cat.description && <p className="text-xs text-gray-400">{cat.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 tabular-nums">{catServices.length} صنف</span>
                  <button onClick={e => { e.stopPropagation(); openCatModal(cat); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-500 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteCat(cat.id); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {open && (
                <div className="border-t border-gray-50 px-5 pb-4">
                  <div className="pt-3 space-y-2">
                    {catServices.length === 0 && <p className="text-sm text-gray-400 py-2">لا توجد أصناف في هذا التصنيف</p>}
                    {catServices.map(svc => (
                      <div key={svc.id} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-2 h-2 rounded-full shrink-0", svc.isActive !== false ? "bg-green-400" : "bg-gray-300")} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{svc.name}</p>
                            {svc.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{svc.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {svc.duration ? <span className="text-xs text-gray-400">{svc.duration} د</span> : null}
                          <span className="text-sm font-semibold text-brand-600 tabular-nums">{svc.price} ر.س</span>
                          <button onClick={() => openSvcModal(cat.id, svc)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-gray-400 hover:text-brand-500 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteSvc(svc.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => openSvcModal(cat.id)} className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors">
                      <Plus className="w-4 h-4" /> إضافة صنف
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCats.length === 0 && !catLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
            <UtensilsCrossed className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">لا توجد تصنيفات بعد</p>
            <button onClick={() => openCatModal()} className="mt-4 text-sm text-brand-500 hover:underline">أضف أول تصنيف</button>
          </div>
        )}
      </div>

      {catModal.open && (
        <Modal title={catModal.item ? "تعديل التصنيف" : "تصنيف جديد"} onClose={() => setCatModal({ open: false })}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم التصنيف</label>
              <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: المقبلات" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الوصف (اختياري)</label>
              <input value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="وصف مختصر" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveCat} disabled={createCat.loading || updateCat.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">حفظ</button>
              <button onClick={() => setCatModal({ open: false })} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}

      {svcModal.open && (
        <Modal title={svcModal.item ? "تعديل الصنف" : "صنف جديد"} onClose={() => setSvcModal({ open: false })}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم الصنف</label>
              <input value={svcForm.name} onChange={e => setSvcForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: شاورما دجاج" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">السعر (ر.س)</label>
                <input type="number" value={svcForm.price} onChange={e => setSvcForm(p => ({ ...p, price: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">المدة (دقائق)</label>
                <input type="number" value={svcForm.duration} onChange={e => setSvcForm(p => ({ ...p, duration: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="60" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الوصف</label>
              <textarea value={svcForm.description} onChange={e => setSvcForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 resize-none" placeholder="وصف الصنف..." />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSvcForm(p => ({ ...p, isActive: !p.isActive }))} className={clsx("w-10 h-6 rounded-full transition-colors relative shrink-0", svcForm.isActive ? "bg-brand-500" : "bg-gray-200")}>
                <span className={clsx("absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all", svcForm.isActive ? "right-1" : "left-1")} />
              </button>
              <span className="text-sm text-gray-600">متاح للطلب</span>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveSvc} disabled={createSvc.loading || updateSvc.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60 transition-colors">حفظ</button>
              <button onClick={() => setSvcModal({ open: false })} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
