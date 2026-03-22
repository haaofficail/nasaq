import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { suppliersApi } from "@/lib/api";
import { Truck, Plus, X, ShoppingBag, TrendingUp, Search, Package, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { clsx } from "clsx";

const STATUS_LABELS: Record<string, string> = { pending: "قيد المعالجة", received: "مستلم", cancelled: "ملغي" };
const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  received:  "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

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

const EMPTY_SUPPLIER = { name: "", contactName: "", phone: "", email: "", category: "" };

export function SuppliersPage() {
  const { data, loading, refetch }              = useApi(() => suppliersApi.list(), []);
  const { data: statsData }                     = useApi(() => suppliersApi.stats(), []);
  const { data: ordersData, refetch: refetchOrders } = useApi(() => suppliersApi.orders(), []);

  const [tab, setTab]           = useState<"suppliers" | "orders">("suppliers");
  const [search, setSearch]     = useState("");
  const [supplierModal, setSupplierModal] = useState(false);
  const [orderModal, setOrderModal]       = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [supplierForm, setSupplierForm] = useState({ ...EMPTY_SUPPLIER });
  const [orderForm, setOrderForm] = useState({ supplierId: "", totalAmount: "", notes: "", expectedDate: "" });
  const [saving, setSaving] = useState(false);

  const createSupplier = useMutation((d: any) => suppliersApi.create(d));
  const updateSupplier = useMutation(({ id, data }: any) => suppliersApi.update(id, data));
  const removeSupplier = useMutation((id: string) => suppliersApi.remove(id));
  const createOrder    = useMutation((d: any) => suppliersApi.createOrder(d));
  const updateOrder    = useMutation(({ id, data }: any) => suppliersApi.updateOrder(id, data));

  const suppliers: any[] = data?.data || [];
  const orders: any[]    = ordersData?.data || [];
  const stats            = statsData?.data;

  const filtered = suppliers.filter(s =>
    !search || s.name?.includes(search) || s.contact_name?.includes(search)
  );

  const openCreate = () => {
    setEditingSupplier(null);
    setSupplierForm({ ...EMPTY_SUPPLIER });
    setSupplierModal(true);
  };

  const openEdit = (s: any) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name || "",
      contactName: s.contact_name || "",
      phone: s.phone || "",
      email: s.email || "",
      category: s.category || "",
    });
    setSupplierModal(true);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingSupplier) {
        await updateSupplier.mutate({ id: editingSupplier.id, data: supplierForm });
      } else {
        await createSupplier.mutate(supplierForm);
      }
      setSupplierModal(false);
      setSupplierForm({ ...EMPTY_SUPPLIER });
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("حذف هذا المورد؟")) return;
    await removeSupplier.mutate(id);
    refetch();
  };

  const saveOrder = async () => {
    if (!orderForm.supplierId || !orderForm.totalAmount) return;
    await createOrder.mutate({ ...orderForm, totalAmount: parseFloat(orderForm.totalAmount) });
    setOrderModal(false);
    setOrderForm({ supplierId: "", totalAmount: "", notes: "", expectedDate: "" });
    refetchOrders();
  };

  const handleOrderStatus = async (id: string, status: string) => {
    await updateOrder.mutate({ id, data: { status } });
    refetchOrders();
  };

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-500" /> الموردون
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{suppliers.length} مورد</p>
        </div>
        <button
          onClick={() => tab === "suppliers" ? openCreate() : setOrderModal(true)}
          className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> {tab === "suppliers" ? "مورد جديد" : "طلب جديد"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "إجمالي الموردين",  value: stats?.suppliers?.total || suppliers.length, icon: Truck,       color: "text-brand-500 bg-brand-50" },
          { label: "طلبات الشراء",     value: stats?.orders?.total    || orders.length,    icon: ShoppingBag, color: "text-purple-600 bg-purple-50" },
          { label: "قيد المعالجة",     value: stats?.orders?.pending  || orders.filter((o: any) => o.status === "pending").length, icon: TrendingUp, color: "text-yellow-600 bg-yellow-50" },
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
        {([["suppliers", "الموردون"], ["orders", "أوامر الشراء"]] as [string, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v as any)}
            className={clsx("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {l}
          </button>
        ))}
      </div>

      {tab === "suppliers" && (
        <>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 w-64">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
              className="bg-transparent outline-none text-sm text-gray-700 flex-1" />
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">لا يوجد موردون</p>
                  <button onClick={openCreate} className="mt-2 text-sm text-brand-500 hover:underline">أضف أول مورد</button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">المورد</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden sm:table-cell">التواصل</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">الفئة</th>
                      <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">إجمالي المشتريات</th>
                      <th className="py-3 px-4 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <p className="font-medium text-gray-900">{s.name}</p>
                          {s.contact_name && <p className="text-xs text-gray-400">{s.contact_name}</p>}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 text-xs hidden sm:table-cell">
                          {s.phone && <p>{s.phone}</p>}
                          {s.email && <p>{s.email}</p>}
                        </td>
                        <td className="py-3.5 px-4">
                          {s.category && <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-xs">{s.category}</span>}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900 tabular-nums hidden md:table-cell">
                          {parseFloat(s.total_purchases || 0).toFixed(0)} ر.س
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-brand-500" />
                            </button>
                            <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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

      {tab === "orders" && (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد أوامر شراء</p>
            </div>
          ) : (
            orders.map((o: any) => (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{o.supplier_name || "مورد"}</p>
                  <p className="text-xs text-gray-400">{o.po_number} · {o.order_date ? new Date(o.order_date).toLocaleDateString("ar-SA") : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 tabular-nums">{parseFloat(o.total_amount || 0).toFixed(0)} ر.س</span>
                  <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium border", STATUS_COLORS[o.status] || "bg-gray-100 text-gray-500 border-gray-200")}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                  {o.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOrderStatus(o.id, "received")}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                        title="تأكيد الاستلام"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOrderStatus(o.id, "cancelled")}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="إلغاء الطلب"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      {supplierModal && (
        <Modal title={editingSupplier ? "تعديل المورد" : "مورد جديد"} onClose={() => setSupplierModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم المورد *</label>
              <input value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))}
                className={inputCls} placeholder="اسم الشركة أو الفرد" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">اسم المسؤول</label>
                <input value={supplierForm.contactName} onChange={e => setSupplierForm(p => ({ ...p, contactName: e.target.value }))}
                  className={inputCls} placeholder="اسم المسؤول" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">الجوال</label>
                <input value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))}
                  className={inputCls} placeholder="05xxxxxxxx" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">البريد الإلكتروني</label>
              <input type="email" value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))}
                className={inputCls} placeholder="email@example.com" dir="ltr" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">الفئة</label>
              <input value={supplierForm.category} onChange={e => setSupplierForm(p => ({ ...p, category: e.target.value }))}
                className={inputCls} placeholder="مثال: مواد غذائية، ورد، أثاث" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveSupplier} disabled={saving}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                {editingSupplier ? "حفظ التعديلات" : "إضافة"}
              </button>
              <button onClick={() => setSupplierModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Order Modal */}
      {orderModal && (
        <Modal title="أمر شراء جديد" onClose={() => setOrderModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">المورد *</label>
              <select value={orderForm.supplierId} onChange={e => setOrderForm(p => ({ ...p, supplierId: e.target.value }))}
                className={inputCls}>
                <option value="">اختر المورد</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">المبلغ (ر.س) *</label>
                <input type="number" value={orderForm.totalAmount} onChange={e => setOrderForm(p => ({ ...p, totalAmount: e.target.value }))}
                  className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">تاريخ الاستلام</label>
                <input type="date" value={orderForm.expectedDate} onChange={e => setOrderForm(p => ({ ...p, expectedDate: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">ملاحظات</label>
              <textarea value={orderForm.notes} onChange={e => setOrderForm(p => ({ ...p, notes: e.target.value }))}
                className={clsx(inputCls, "resize-none")} rows={2} placeholder="تفاصيل الطلب..." />
            </div>
            <div className="flex gap-2">
              <button onClick={saveOrder} disabled={createOrder.loading}
                className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">
                إضافة
              </button>
              <button onClick={() => setOrderModal(false)}
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
