import { useState } from "react";
import { useApi, useMutation } from "@/hooks/useApi";
import { FileSignature, Plus, X, CheckCircle2, Clock, FileX, Package } from "lucide-react";
import { clsx } from "clsx";
import { api } from "@/lib/api";

const contractsApi = {
  list: (status?: string) => api.get<{ data: any[] }>(`/contracts${status ? `?status=${status}` : ""}`),
  create: (data: any) => api.post<{ data: any }>("/contracts", data),
  update: (id: string, data: any) => api.patch<{ data: any }>(`/contracts/${id}`, data),
  stats: () => api.get<{ data: any }>("/contracts/stats"),
};

const STATUS_LABELS: Record<string, string> = { draft: "مسودة", active: "نشط", signed: "موقّع", expired: "منتهي", cancelled: "ملغي" };
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  signed: "bg-green-50 text-green-700 border-green-200",
  expired: "bg-orange-50 text-orange-600 border-orange-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", validFrom: "", validTo: "" });

  const { data, loading, refetch } = useApi(() => contractsApi.list(statusFilter !== "all" ? statusFilter : undefined), [statusFilter]);
  const { data: statsData } = useApi(() => contractsApi.stats(), []);
  const createContract = useMutation((d: any) => contractsApi.create(d));
  const updateContract = useMutation(({ id, ...d }: any) => contractsApi.update(id, d));

  const contracts: any[] = data?.data || [];
  const stats = statsData?.data;

  const save = async () => {
    if (!form.title.trim()) return;
    await createContract.mutate(form);
    setModal(false);
    setForm({ title: "", content: "", validFrom: "", validTo: "" });
    refetch();
  };

  const handleSign = async (id: string) => {
    const name = prompt("اسم الموقّع:");
    if (!name) return;
    await updateContract.mutate({ id, status: "signed", signedByName: name, signedAt: new Date().toISOString() });
    refetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-brand-500" /> العقود
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{contracts.length} عقد</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-1.5 bg-brand-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors">
          <Plus className="w-4 h-4" /> عقد جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي", value: stats?.total || contracts.length, icon: FileSignature, color: "text-brand-500 bg-brand-50" },
          { label: "مسودة", value: stats?.draft || contracts.filter((c: any) => c.status === "draft").length, icon: Clock, color: "text-gray-500 bg-gray-100" },
          { label: "موقّعة", value: stats?.signed || contracts.filter((c: any) => c.status === "signed").length, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "منتهية", value: stats?.expired || contracts.filter((c: any) => c.status === "expired").length, icon: FileX, color: "text-orange-600 bg-orange-50" },
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

      {/* Status filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {([["all","الكل"],["draft","مسودة"],["active","نشط"],["signed","موقّع"],["expired","منتهي"]] as [string,string][]).map(([v,l]) => (
          <button key={v} onClick={() => setStatusFilter(v)} className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors", statusFilter === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {l}
          </button>
        ))}
      </div>

      {/* Contracts list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">جاري التحميل...</div>
      ) : (
        <div className="space-y-2">
          {contracts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">لا توجد عقود</p>
              <button onClick={() => setModal(true)} className="mt-2 text-sm text-brand-500 hover:underline">أضف أول عقد</button>
            </div>
          ) : (
            contracts.map((c: any) => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.contract_number}
                      {c.customer_name && ` · ${c.customer_name}`}
                      {c.valid_from && ` · ${new Date(c.valid_from).toLocaleDateString("ar-SA")}`}
                    </p>
                    {c.signed_by_name && <p className="text-xs text-green-600 mt-0.5">موقّع من: {c.signed_by_name}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium border", STATUS_COLORS[c.status] || "bg-gray-100 text-gray-500 border-gray-200")}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                    {c.status === "draft" && (
                      <button onClick={() => handleSign(c.id)} className="px-3 py-1.5 bg-green-500 text-white rounded-xl text-xs font-medium hover:bg-green-600 transition-colors">
                        توقيع
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {modal && (
        <Modal title="عقد جديد" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">عنوان العقد *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" placeholder="مثال: عقد تأجير معدات" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">تاريخ البداية</label>
                <input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">تاريخ الانتهاء</label>
                <input type="date" value={form.validTo} onChange={e => setForm(p => ({ ...p, validTo: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">محتوى العقد</label>
              <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-300 resize-none" rows={4} placeholder="نص العقد..." />
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={createContract.loading} className="flex-1 bg-brand-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-brand-600 disabled:opacity-60">حفظ</button>
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
