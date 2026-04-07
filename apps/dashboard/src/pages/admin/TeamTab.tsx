import React, { useState } from "react";
import { Users2, Plus, Search, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { adminApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { RoleBadge, SectionHeader, Spinner, Empty, Modal } from "./shared";

const ROLES_CONFIG = [
  { value: "account_manager", label: "مدير حساب",   desc: "متابعة ودعم عملاء محددين" },
  { value: "support_agent",   label: "دعم فني",      desc: "معالجة تذاكر الدعم" },
  { value: "content_manager", label: "مدير محتوى",  desc: "إدارة الإعلانات والمحتوى" },
  { value: "viewer",          label: "مشاهد فقط",   desc: "صلاحية قراءة بدون تعديل" },
];

function TeamTab() {
  const { data, loading, refetch } = useApi(() => adminApi.staff(), []);
  const [search, setSearch] = useState("");
  const [editRole, setEditRole] = useState<{ userId: string; current: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", email: "", phone: "", password: "", role: "account_manager" });
  const [formErr, setFormErr] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { mutate: setRole, loading: settingRole } = useMutation(({ userId, role }: any) => adminApi.setStaffRole(userId, role));
  const { mutate: createStaff, loading: creating } = useMutation((d: any) => adminApi.createStaff(d));
  const { mutate: removeStaff, loading: removing } = useMutation((id: string) => adminApi.removeStaff(id));

  const all: any[] = data?.data || [];
  const filtered = search ? all.filter((u: any) => u.name?.includes(search) || u.phone?.includes(search) || u.email?.includes(search)) : all;

  const handleCreate = async () => {
    setFormErr("");
    if (!newForm.name.trim()) { setFormErr("الاسم مطلوب"); return; }
    if (!newForm.email && !newForm.phone) { setFormErr("البريد الإلكتروني أو الجوال مطلوب"); return; }
    if (newForm.password.length < 8) { setFormErr("كلمة المرور 8 أحرف على الأقل"); return; }
    try {
      await createStaff(newForm);
      setAddOpen(false);
      setNewForm({ name: "", email: "", phone: "", password: "", role: "account_manager" });
      refetch();
    } catch (e: any) { setFormErr(e.message || "حدث خطأ"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="فريق ترميز OS" sub="موظفو المنصة وصلاحياتهم" />
        <button onClick={() => { setAddOpen(true); setFormErr(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600">
          <Plus className="w-4 h-4" /> إضافة عضو
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..."
          className="flex-1 text-sm outline-none" />
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? <Empty icon={Users2} text="لا يوجد فريق ترميز OS" /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-right px-4 py-3 font-semibold">العضو</th>
                <th className="text-right px-4 py-3 font-semibold">الدور</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">العملاء المعيّنون</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">آخر دخول</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => {
                const currentRole = u.isSuperAdmin ? "super_admin" : (u.nasaqRole || "");
                return (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                          {u.name?.[0] || "م"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{u.phone || u.email || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={currentRole || "viewer"} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.assignedOrgs || 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("ar") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {!u.isSuperAdmin && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditRole({ userId: u.id, current: currentRole })}
                            className="text-xs text-brand-500 border border-brand-200 px-2.5 py-1 rounded-lg hover:bg-brand-50">
                            تعديل الدور
                          </button>
                          <button onClick={() => setDeleteId(u.id)}
                            className="text-xs text-red-400 border border-red-100 px-2.5 py-1 rounded-lg hover:bg-red-50">
                            حذف
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add member modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة عضو جديد لفريق ترميز OS">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">الاسم *</label>
            <input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" placeholder="اسم العضو" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">البريد الإلكتروني</label>
            <input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" placeholder="email@example.com" dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">الجوال</label>
            <input value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" placeholder="+966xxxxxxxxx" dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">كلمة المرور *</label>
            <input type="password" value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" placeholder="8 أحرف على الأقل" dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">الدور *</label>
            <div className="space-y-2">
              {ROLES_CONFIG.map((r) => (
                <div key={r.value} onClick={() => setNewForm({ ...newForm, role: r.value })}
                  className={clsx("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    newForm.role === r.value ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                  <div className={clsx("w-4 h-4 rounded-full border-2 shrink-0", newForm.role === r.value ? "border-brand-500 bg-brand-500" : "border-gray-300")} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-400">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {formErr && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formErr}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setAddOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
            <button onClick={handleCreate} disabled={creating}
              className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إضافة العضو"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Role edit modal */}
      <Modal open={!!editRole} onClose={() => setEditRole(null)} title="تعديل دور الموظف">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">اختر الدور المناسب لهذا الموظف في فريق ترميز OS.</p>
          <div className="space-y-2">
            {ROLES_CONFIG.map((r) => (
              <div key={r.value} onClick={() => setEditRole((prev) => prev ? { ...prev, current: r.value } : null)}
                className={clsx("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  editRole?.current === r.value ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:bg-gray-50")}>
                <div className={clsx("w-4 h-4 rounded-full border-2 shrink-0", editRole?.current === r.value ? "border-brand-500 bg-brand-500" : "border-gray-300")} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.label}</p>
                  <p className="text-xs text-gray-400">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditRole(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
            <button disabled={settingRole} onClick={async () => {
              if (!editRole) return;
              await setRole({ userId: editRole.userId, role: editRole.current });
              setEditRole(null); refetch();
            }} className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              {settingRole ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "حفظ الدور"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="تأكيد الحذف">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">سيتم إيقاف الحساب وإزالة صلاحياته. هل أنت متأكد؟</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">إلغاء</button>
            <button disabled={removing} onClick={async () => {
              if (!deleteId) return;
              await removeStaff(deleteId);
              setDeleteId(null); refetch();
            }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50">
              {removing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تأكيد الحذف"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TeamTab;
