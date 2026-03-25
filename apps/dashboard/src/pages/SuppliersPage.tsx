import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { procurementApi } from "@/lib/api";
import { toast } from "@/hooks/useToast";
import {
  Truck, Plus, X, ShoppingBag, TrendingUp, Search, Package,
  Pencil, Trash2, ChevronDown, FileText, CheckCircle2, XCircle,
  Receipt, AlertCircle, Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { SkeletonRows } from "@/components/ui/Skeleton";

const PO_STATUS: Record<string, { label: string; cls: string }> = {
  draft:              { label: "مسودة",          cls: "bg-gray-100 text-gray-500" },
  submitted:          { label: "مُرسَل",          cls: "bg-blue-50 text-blue-600" },
  acknowledged:       { label: "مؤكد",           cls: "bg-indigo-50 text-indigo-600" },
  partially_received: { label: "استلام جزئي",    cls: "bg-yellow-50 text-yellow-700" },
  received:           { label: "مستلم",           cls: "bg-green-50 text-green-700" },
  cancelled:          { label: "ملغي",            cls: "bg-red-50 text-red-500" },
  closed:             { label: "مغلق",            cls: "bg-gray-100 text-gray-400" },
};

const INV_STATUS: Record<string, { label: string; cls: string }> = {
  received: { label: "مستلمة",    cls: "bg-blue-50 text-blue-600" },
  matched:  { label: "مطابقة",    cls: "bg-indigo-50 text-indigo-600" },
  approved: { label: "موافق عليها", cls: "bg-green-50 text-green-700" },
  paid:     { label: "مدفوعة",    cls: "bg-gray-100 text-gray-500" },
  disputed: { label: "خلاف",      cls: "bg-red-50 text-red-500" },
};

const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300";

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={clsx("bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-y-auto", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
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

type Tab = "suppliers" | "orders" | "invoices";

const EMPTY_SUP  = { name: "", contactName: "", phone: "", email: "", city: "", taxNumber: "", paymentTermsDays: "30", notes: "" };
const EMPTY_ITEM = { itemName: "", unit: "قطعة", orderedQuantity: "", unitPrice: "" };

export function SuppliersPage() {
  const [tab, setTab]   = useState<Tab>("suppliers");
  const [search, setSearch] = useState("");

  // Supplier state
  const [supplierModal, setSupplierModal] = useState(false);
  const [editingSup, setEditingSup] = useState<any>(null);
  const [supForm, setSupForm] = useState({ ...EMPTY_SUP });

  // PO state
  const [poModal, setPoModal] = useState(false);
  const [poForm, setPoForm] = useState({ supplierId: "", expectedDelivery: "", notes: "", items: [{ ...EMPTY_ITEM }] });
  const [expandedPo, setExpandedPo] = useState<string | null>(null);

  // Invoice state
  const [invModal, setInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ supplierId: "", poId: "", invoiceNumber: "", invoiceDate: "", dueDate: "", subtotal: "", vatAmount: "", totalAmount: "" });

  const { data: statsData }                     = useApi(() => procurementApi.stats(), []);
  const { data: supData, loading, refetch }     = useApi(() => procurementApi.suppliers(), []);
  const { data: poData, refetch: refetchPo }    = useApi(() => procurementApi.orders(), []);
  const { data: invData, refetch: refetchInv }  = useApi(() => procurementApi.invoices(), []);

  const createSup  = useMutation((d: any)          => procurementApi.createSupplier(d),  { silent: true });
  const updateSup  = useMutation(({ id, d }: any)  => procurementApi.updateSupplier(id, d), { silent: true });
  const deleteSup  = useMutation((id: string)      => procurementApi.deleteSupplier(id),  { silent: true });
  const createPO   = useMutation((d: any)          => procurementApi.createOrder(d),       { silent: true });
  const submitPO   = useMutation((id: string)      => procurementApi.updateOrder(id, { status: "submitted" }), { silent: true });
  const cancelPO   = useMutation((id: string)      => procurementApi.updateOrder(id, { status: "cancelled" }), { silent: true });
  const createInv  = useMutation((d: any)          => procurementApi.createInvoice(d),     { silent: true });
  const advInv     = useMutation(({ id, d }: any)  => procurementApi.advanceInvoice(id, d), { silent: true });

  const stats = statsData;
  const allSuppliers: any[] = supData?.suppliers || [];
  const orders: any[]       = poData?.orders || [];
  const invoices: any[]     = invData?.invoices || [];

  const filtered = allSuppliers.filter(s => !search || s.name?.includes(search) || s.contactName?.includes(search));

  // Supplier CRUD
  const openCreateSup = () => { setEditingSup(null); setSupForm({ ...EMPTY_SUP }); setSupplierModal(true); };
  const openEditSup   = (s: any) => {
    setEditingSup(s);
    setSupForm({ name: s.name, contactName: s.contactName || "", phone: s.phone || "", email: s.email || "",
      city: s.city || "", taxNumber: s.taxNumber || "", paymentTermsDays: String(s.paymentTermsDays ?? 30), notes: s.notes || "" });
    setSupplierModal(true);
  };
  const saveSup = async () => {
    if (!supForm.name.trim()) return;
    const res = editingSup
      ? await updateSup.mutate({ id: editingSup.id, d: { ...supForm, paymentTermsDays: parseInt(supForm.paymentTermsDays) || 30 } })
      : await createSup.mutate({ ...supForm, paymentTermsDays: parseInt(supForm.paymentTermsDays) || 30 });
    if (res) { toast.success(editingSup ? "تم تحديث المورد" : "تم إضافة المورد"); setSupplierModal(false); refetch(); }
    else toast.error("حدث خطأ أثناء الحفظ");
  };
  const handleDeleteSup = async (id: string) => {
    if (!confirm("هل تريد حذف هذا المورد؟")) return;
    const res = await deleteSup.mutate(id);
    if (res !== null) { toast.success("تم حذف المورد"); refetch(); }
    else toast.error("تعذّر حذف المورد");
  };

  // PO items helpers
  const addItem    = () => setPoForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i: number) => setPoForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const setItem    = (i: number, field: string, val: string) =>
    setPoForm(p => ({ ...p, items: p.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

  const savePO = async () => {
    if (!poForm.supplierId || poForm.items.some(it => !it.itemName || !it.orderedQuantity || !it.unitPrice)) return;
    const res = await createPO.mutate({
      supplierId: poForm.supplierId,
      expectedDelivery: poForm.expectedDelivery ? new Date(poForm.expectedDelivery).toISOString() : null,
      notes: poForm.notes || null,
      items: poForm.items.map(it => ({
        itemName: it.itemName,
        unit: it.unit,
        orderedQuantity: parseFloat(it.orderedQuantity),
        unitPrice: parseFloat(it.unitPrice),
      })),
    });
    if (res) { toast.success("تم إنشاء أمر الشراء"); setPoModal(false); setPoForm({ supplierId: "", expectedDelivery: "", notes: "", items: [{ ...EMPTY_ITEM }] }); refetchPo(); }
    else toast.error("تعذّر إنشاء أمر الشراء");
  };

  const saveInv = async () => {
    if (!invForm.supplierId || !invForm.invoiceNumber || !invForm.invoiceDate || !invForm.totalAmount) return;
    const res = await createInv.mutate({
      supplierId: invForm.supplierId,
      poId: invForm.poId || null,
      invoiceNumber: invForm.invoiceNumber,
      invoiceDate: new Date(invForm.invoiceDate).toISOString(),
      dueDate: invForm.dueDate ? new Date(invForm.dueDate).toISOString() : null,
      subtotal: parseFloat(invForm.subtotal) || parseFloat(invForm.totalAmount),
      vatAmount: parseFloat(invForm.vatAmount) || 0,
      totalAmount: parseFloat(invForm.totalAmount),
    });
    if (res) { toast.success("تم إضافة الفاتورة"); setInvModal(false); setInvForm({ supplierId: "", poId: "", invoiceNumber: "", invoiceDate: "", dueDate: "", subtotal: "", vatAmount: "", totalAmount: "" }); refetchInv(); }
    else toast.error("تعذّر إضافة الفاتورة");
  };

  const tabBtns: [Tab, string][] = [["suppliers", "الموردون"], ["orders", "أوامر الشراء"], ["invoices", "الفواتير"]];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-500" /> المشتريات
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{allSuppliers.length} مورد · {orders.length} أمر شراء</p>
        </div>
        <button
          onClick={() => tab === "suppliers" ? openCreateSup() : tab === "orders" ? setPoModal(true) : setInvModal(true)}
          className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" />
          {tab === "suppliers" ? "مورد جديد" : tab === "orders" ? "أمر شراء" : "فاتورة مورد"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الموردين",    value: allSuppliers.length,                             icon: Truck,       color: "text-brand-500 bg-brand-50" },
          { label: "أوامر في الانتظار",  value: stats?.orders?.submitted ?? 0,                   icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
          { label: "فواتير غير مدفوعة",  value: stats?.invoices?.pending ?? 0,                   icon: Receipt,     color: "text-yellow-600 bg-yellow-50" },
          { label: "فواتير متأخرة",      value: stats?.invoices?.overdue ?? 0,                   icon: AlertCircle, color: "text-red-500 bg-red-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabBtns.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Suppliers tab ── */}
      {tab === "suppliers" && (
        <>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 w-64">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              className="bg-transparent outline-none text-sm text-gray-700 flex-1" />
          </div>
          {loading ? (
            <SkeletonRows />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">لا يوجد موردون</p>
                  <button onClick={openCreateSup} className="mt-2 text-sm text-brand-500 hover:underline">أضف أول مورد</button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">المورد</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden sm:table-cell">التواصل</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">إجمالي المشتريات</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">الحالة</th>
                      <th className="py-3 px-4 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <p className="font-medium text-gray-900">{s.name}</p>
                          {s.contactName && <p className="text-xs text-gray-400">{s.contactName}</p>}
                          {s.city && <p className="text-xs text-gray-400">{s.city}</p>}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 text-xs hidden sm:table-cell">
                          {s.phone && <p>{s.phone}</p>}
                          {s.email && <p>{s.email}</p>}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900 tabular-nums hidden md:table-cell">
                          {parseFloat(s.totalSpent || 0).toFixed(0)} ر.س
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <span className={clsx("px-2 py-0.5 rounded-lg text-xs font-medium",
                            s.status === "active" ? "bg-green-50 text-green-700" : s.status === "blacklisted" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400")}>
                            {s.status === "active" ? "نشط" : s.status === "blacklisted" ? "محظور" : "غير نشط"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => openEditSup(s)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-brand-500" />
                            </button>
                            <button onClick={() => handleDeleteSup(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Purchase Orders tab ── */}
      {tab === "orders" && (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد أوامر شراء</p>
              <button onClick={() => setPoModal(true)} className="mt-2 text-sm text-brand-500 hover:underline">أنشئ أول أمر</button>
            </div>
          ) : orders.map((o: any) => {
            const s = PO_STATUS[o.status] ?? { label: o.status, cls: "bg-gray-100 text-gray-500" };
            const isExpanded = expandedPo === o.id;
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{o.supplierName || "مورد"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{o.poNumber} · {o.orderDate ? fmtDate(o.orderDate) : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-gray-900 tabular-nums hidden sm:block">
                      {parseFloat(o.totalAmount || 0).toFixed(0)} ر.س
                    </span>
                    <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium", s.cls)}>{s.label}</span>
                    {o.status === "draft" && (
                      <button onClick={async () => { const r = await submitPO.mutate(o.id); if (r) { toast.success("تم إرسال أمر الشراء"); refetchPo(); } else toast.error("تعذّر الإرسال"); }}
                        className="text-xs bg-brand-500 text-white px-2.5 py-1 rounded-lg hover:bg-brand-600">
                        إرسال
                      </button>
                    )}
                    {["draft", "submitted"].includes(o.status) && (
                      <button onClick={async () => { if (confirm("إلغاء هذا الأمر؟")) { const r = await cancelPO.mutate(o.id); if (r) { toast.info("تم إلغاء أمر الشراء"); refetchPo(); } } }}
                        className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => setExpandedPo(isExpanded ? null : o.id)}
                      className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                      <ChevronDown className={clsx("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                    </button>
                  </div>
                </div>
                {isExpanded && <POItems poId={o.id} supplierId={o.supplierId} onReceiptCreated={refetchPo} />}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Invoices tab ── */}
      {tab === "invoices" && (
        <div className="space-y-2">
          {invoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد فواتير موردين</p>
            </div>
          ) : invoices.map((inv: any) => {
            const s = INV_STATUS[inv.status] ?? { label: inv.status, cls: "bg-gray-100 text-gray-500" };
            const isOverdue = inv.dueDate && new Date(inv.dueDate) < new Date() && !["paid", "disputed"].includes(inv.status);
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{inv.invoiceNumber}</p>
                    {isOverdue && <span className="flex items-center gap-1 text-xs text-red-500"><Clock className="w-3 h-3" /> متأخرة</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {inv.invoiceDate ? fmtDate(inv.invoiceDate) : ""}
                    {inv.dueDate ? ` · استحقاق ${fmtDate(inv.dueDate)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-gray-900 tabular-nums hidden sm:block">
                    {parseFloat(inv.totalAmount || 0).toFixed(0)} ر.س
                  </span>
                  <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium", s.cls)}>{s.label}</span>
                  {inv.status === "received" && (
                    <button onClick={async () => { const r = await advInv.mutate({ id: inv.id, d: { status: "approved" } }); if (r) { toast.success("تمت الموافقة على الفاتورة"); refetchInv(); } else toast.error("تعذّر التحديث"); }}
                      className="text-xs bg-brand-500 text-white px-2.5 py-1 rounded-lg hover:bg-brand-600">
                      موافقة
                    </button>
                  )}
                  {inv.status === "approved" && (
                    <button onClick={async () => { const r = await advInv.mutate({ id: inv.id, d: { status: "paid", paidAmount: parseFloat(inv.totalAmount) } }); if (r) { toast.success("تم تسجيل الدفع"); refetchInv(); } else toast.error("تعذّر التحديث"); }}
                      className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700">
                      دفع
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Supplier Modal ── */}
      {supplierModal && (
        <Modal title={editingSup ? "تعديل المورد" : "مورد جديد"} onClose={() => setSupplierModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم المورد *</label>
                <input value={supForm.name} onChange={e => setSupForm(p => ({ ...p, name: e.target.value }))}
                  className={inp} placeholder="اسم الشركة أو الشخص" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم المسؤول</label>
                <input value={supForm.contactName} onChange={e => setSupForm(p => ({ ...p, contactName: e.target.value }))}
                  className={inp} placeholder="المسؤول عن التواصل" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الجوال</label>
                <input value={supForm.phone} onChange={e => setSupForm(p => ({ ...p, phone: e.target.value }))}
                  className={inp} placeholder="05xxxxxxxx" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">البريد الإلكتروني</label>
                <input type="email" value={supForm.email} onChange={e => setSupForm(p => ({ ...p, email: e.target.value }))}
                  className={inp} placeholder="email@example.com" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">المدينة</label>
                <input value={supForm.city} onChange={e => setSupForm(p => ({ ...p, city: e.target.value }))}
                  className={inp} placeholder="الرياض" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الرقم الضريبي</label>
                <input value={supForm.taxNumber} onChange={e => setSupForm(p => ({ ...p, taxNumber: e.target.value }))}
                  className={inp} placeholder="3xxxxxxxxxxxxxxx" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">أيام السداد</label>
                <input type="number" value={supForm.paymentTermsDays} onChange={e => setSupForm(p => ({ ...p, paymentTermsDays: e.target.value }))}
                  className={inp} placeholder="30" min="0" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">ملاحظات</label>
                <textarea value={supForm.notes} onChange={e => setSupForm(p => ({ ...p, notes: e.target.value }))}
                  className={clsx(inp, "resize-none")} rows={2} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveSup} disabled={createSup.loading || updateSup.loading}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                {editingSup ? "حفظ التعديلات" : "إضافة المورد"}
              </button>
              <button onClick={() => setSupplierModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── PO Modal ── */}
      {poModal && (
        <Modal title="أمر شراء جديد" onClose={() => setPoModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">المورد *</label>
                <select value={poForm.supplierId} onChange={e => setPoForm(p => ({ ...p, supplierId: e.target.value }))} className={inp}>
                  <option value="">اختر المورد</option>
                  {allSuppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">تاريخ الاستلام المتوقع</label>
                <input type="date" value={poForm.expectedDelivery} onChange={e => setPoForm(p => ({ ...p, expectedDelivery: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">ملاحظات</label>
                <input value={poForm.notes} onChange={e => setPoForm(p => ({ ...p, notes: e.target.value }))} className={inp} placeholder="اختياري" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500">البنود *</label>
                <button onClick={addItem} className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> إضافة بند
                </button>
              </div>
              <div className="space-y-2">
                {poForm.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <input value={item.itemName} onChange={e => setItem(i, "itemName", e.target.value)}
                        className={inp} placeholder="اسم الصنف *" />
                    </div>
                    <div className="col-span-2">
                      <input value={item.unit} onChange={e => setItem(i, "unit", e.target.value)}
                        className={inp} placeholder="الوحدة" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" value={item.orderedQuantity} onChange={e => setItem(i, "orderedQuantity", e.target.value)}
                        className={inp} placeholder="الكمية" min="0" />
                    </div>
                    <div className="col-span-2">
                      <input type="number" value={item.unitPrice} onChange={e => setItem(i, "unitPrice", e.target.value)}
                        className={inp} placeholder="السعر" min="0" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {poForm.items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="p-1 text-gray-300 hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {poForm.items.some(it => it.orderedQuantity && it.unitPrice) && (
                <p className="text-xs text-gray-400 mt-2 text-left">
                  الإجمالي (قبل ضريبة): {poForm.items.reduce((s, it) => s + (parseFloat(it.orderedQuantity) || 0) * (parseFloat(it.unitPrice) || 0), 0).toFixed(2)} ر.س
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={savePO} disabled={createPO.loading}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                {createPO.loading ? "جاري الإنشاء..." : "إنشاء أمر الشراء"}
              </button>
              <button onClick={() => setPoModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Invoice Modal ── */}
      {invModal && (
        <Modal title="فاتورة مورد جديدة" onClose={() => setInvModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">المورد *</label>
                <select value={invForm.supplierId} onChange={e => setInvForm(p => ({ ...p, supplierId: e.target.value }))} className={inp}>
                  <option value="">اختر المورد</option>
                  {allSuppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">رقم الفاتورة *</label>
                <input value={invForm.invoiceNumber} onChange={e => setInvForm(p => ({ ...p, invoiceNumber: e.target.value }))}
                  className={inp} placeholder="INV-001" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">ربط بأمر شراء</label>
                <select value={invForm.poId} onChange={e => setInvForm(p => ({ ...p, poId: e.target.value }))} className={inp}>
                  <option value="">— بدون ربط —</option>
                  {orders.filter(o => !invForm.supplierId || o.supplierId === invForm.supplierId).map((o: any) =>
                    <option key={o.id} value={o.id}>{o.poNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">تاريخ الفاتورة *</label>
                <input type="date" value={invForm.invoiceDate} onChange={e => setInvForm(p => ({ ...p, invoiceDate: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">تاريخ الاستحقاق</label>
                <input type="date" value={invForm.dueDate} onChange={e => setInvForm(p => ({ ...p, dueDate: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">المبلغ قبل الضريبة</label>
                <input type="number" value={invForm.subtotal} onChange={e => setInvForm(p => ({ ...p, subtotal: e.target.value }))}
                  className={inp} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">ضريبة القيمة المضافة</label>
                <input type="number" value={invForm.vatAmount} onChange={e => setInvForm(p => ({ ...p, vatAmount: e.target.value }))}
                  className={inp} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الإجمالي *</label>
                <input type="number" value={invForm.totalAmount} onChange={e => setInvForm(p => ({ ...p, totalAmount: e.target.value }))}
                  className={inp} placeholder="0.00" min="0" step="0.01" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveInv} disabled={createInv.loading}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                {createInv.loading ? "جاري الحفظ..." : "إضافة الفاتورة"}
              </button>
              <button onClick={() => setInvModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Sub-component: expandable PO items + receipt action
function POItems({ poId, supplierId, onReceiptCreated }: { poId: string; supplierId: string; onReceiptCreated: () => void }) {
  const { data } = useApi(() => procurementApi.order(poId), [poId]);
  const { data: receiptsData, refetch: refetchReceipts } = useApi(() => procurementApi.orderReceipts(poId), [poId]);
  const approveGR  = useMutation(({ id }: any)  => procurementApi.approveReceipt(id, { status: "approved" }), { silent: true });
  const createGR   = useMutation((d: any)        => procurementApi.createReceipt(d), { silent: true });

  const [showGrForm, setShowGrForm] = useState(false);
  const [grQuantities, setGrQuantities] = useState<Record<string, string>>({});
  const [grNotes, setGrNotes] = useState("");

  const items: any[]    = data?.items || [];
  const receipts: any[] = receiptsData?.receipts || [];

  const order = data?.order;
  const canReceive = order && ["submitted", "acknowledged", "partially_received"].includes(order.status);

  const openGrForm = () => {
    const init: Record<string, string> = {};
    items.forEach((it: any) => {
      const remaining = parseFloat(it.orderedQuantity) - parseFloat(it.receivedQuantity ?? 0);
      init[it.id] = remaining > 0 ? String(remaining) : "0";
    });
    setGrQuantities(init);
    setGrNotes("");
    setShowGrForm(true);
  };

  const submitGR = async () => {
    const grItems = items
      .map((it: any) => ({
        poItemId: it.id,
        receivedQuantity: parseFloat(grQuantities[it.id] || "0"),
        acceptedQuantity: parseFloat(grQuantities[it.id] || "0"),
      }))
      .filter(gi => gi.receivedQuantity > 0);
    if (!grItems.length) return;
    const res = await createGR.mutate({ poId, supplierId, items: grItems, notes: grNotes || null });
    if (res) { toast.success("تم تسجيل الاستلام"); setShowGrForm(false); refetchReceipts(); onReceiptCreated(); }
    else toast.error("تعذّر تسجيل الاستلام");
  };

  return (
    <div className="border-t border-gray-50 px-5 pb-4 pt-3 space-y-3">
      {/* Items table */}
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400">
            <th className="text-right pb-1 font-semibold">الصنف</th>
            <th className="text-right pb-1 font-semibold">الوحدة</th>
            <th className="text-right pb-1 font-semibold tabular-nums">مطلوب</th>
            <th className="text-right pb-1 font-semibold tabular-nums">مستلم</th>
            <th className="text-right pb-1 font-semibold tabular-nums">السعر</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any) => (
            <tr key={it.id} className="border-t border-gray-50">
              <td className="py-1.5 text-gray-800 font-medium">{it.itemName}</td>
              <td className="py-1.5 text-gray-500">{it.unit}</td>
              <td className="py-1.5 tabular-nums text-gray-600">{parseFloat(it.orderedQuantity)}</td>
              <td className={clsx("py-1.5 tabular-nums font-semibold",
                parseFloat(it.receivedQuantity) >= parseFloat(it.orderedQuantity) ? "text-green-600" : "text-yellow-600")}>
                {parseFloat(it.receivedQuantity ?? 0)}
              </td>
              <td className="py-1.5 tabular-nums text-gray-600">{parseFloat(it.unitPrice).toFixed(2)} ر.س</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* GR creation form */}
      {canReceive && !showGrForm && (
        <button onClick={openGrForm}
          className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-700 font-medium">
          <Plus className="w-3.5 h-3.5" /> تسجيل استلام جديد
        </button>
      )}

      {showGrForm && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-600">الكميات المستلمة</p>
          {items.map((it: any) => {
            const remaining = parseFloat(it.orderedQuantity) - parseFloat(it.receivedQuantity ?? 0);
            if (remaining <= 0) return null;
            return (
              <div key={it.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 flex-1 truncate">{it.itemName}</span>
                <span className="text-xs text-gray-400">من {remaining}</span>
                <input type="number" min="0" max={remaining}
                  value={grQuantities[it.id] ?? ""}
                  onChange={e => setGrQuantities(p => ({ ...p, [it.id]: e.target.value }))}
                  className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-300" />
              </div>
            );
          })}
          <div>
            <input value={grNotes} onChange={e => setGrNotes(e.target.value)}
              placeholder="ملاحظات الاستلام (اختياري)"
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-brand-300" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={submitGR} disabled={createGR.loading}
              className="flex-1 bg-brand-500 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-brand-600 disabled:opacity-60">
              {createGR.loading ? "جاري التسجيل..." : "تسجيل الاستلام"}
            </button>
            <button onClick={() => setShowGrForm(false)}
              className="flex-1 border border-gray-200 text-gray-500 rounded-lg py-1.5 text-xs hover:bg-gray-100">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Receipts */}
      {receipts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-400">إيصالات الاستلام</p>
          {receipts.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-gray-700 font-medium">{r.grNumber}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{fmtDate(r.receivedAt)}</span>
                <span className={clsx("px-2 py-0.5 rounded-lg font-medium",
                  r.status === "approved" ? "bg-green-50 text-green-700" : r.status === "rejected" ? "bg-red-50 text-red-500" : "bg-yellow-50 text-yellow-700")}>
                  {r.status === "approved" ? "موافق" : r.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                </span>
                {r.status === "pending" && (
                  <button onClick={async () => { const res = await approveGR.mutate({ id: r.id }); if (res) { toast.success("تمت الموافقة على الاستلام"); refetchReceipts(); onReceiptCreated(); } else toast.error("تعذّر الموافقة"); }}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> موافقة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
