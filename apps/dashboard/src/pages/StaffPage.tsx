import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/useToast";
import { Users, Plus, Pencil, Trash2, AlertCircle, UserCheck, UserX, Shield, Search, ArrowLeft } from "lucide-react";
import { clsx } from "clsx";
import { staffApi, rolesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Input, Select, Button, Toggle } from "@/components/ui";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  owner:    { label: "مالك",       color: "bg-amber-50 text-amber-700 border-amber-100" },
  admin:    { label: "مدير",       color: "bg-violet-50 text-violet-700 border-violet-100" },
  employee: { label: "موظف",       color: "bg-blue-50 text-blue-700 border-blue-100" },
  vendor:   { label: "مقدم خدمة", color: "bg-teal-50 text-teal-700 border-teal-100" },
};

const EMPTY_FORM = { name: "", phone: "", email: "", type: "employee", roleId: "", jobTitle: "", salary: "", startDate: "", status: "active" };

export function StaffPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const { data: res, loading, error, refetch } = useApi(() => staffApi.list(), []);
  const { data: rolesRes } = useApi(() => rolesApi.list(), []);
  const { mutate: removeStaff } = useMutation((id: string) => staffApi.remove(id));

  const staff: any[] = res?.data || [];
  const roles: any[] = rolesRes?.data || [];

  const filtered = staff.filter(s => {
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    if (search && !s.name?.includes(search) && !s.phone?.includes(search)) return false;
    return true;
  });
  const active = staff.filter(s => s.status === "active").length;

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name || "", phone: s.phone || "", email: s.email || "", type: s.type || "employee",
      roleId: s.roleId || "", jobTitle: s.jobTitle || "", salary: s.salary || "",
      startDate: s.startDate ? s.startDate.split("T")[0] : "", status: s.status || "active" });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) { toast.error("الاسم والجوال مطلوبان"); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.roleId) delete payload.roleId;
      if (editing) { await staffApi.update(editing.id, payload); toast.success("تم التحديث"); }
      else { await staffApi.create(payload); toast.success("تمت الإضافة"); }
      setShowModal(false); refetch();
    } catch { toast.error("فشل الحفظ"); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s: any) => {
    await staffApi.update(s.id, { status: s.status === "active" ? "inactive" : "active" });
    refetch();
  };

  const handleDelete = async (s: any) => {
    if (!confirm(`تعطيل "${s.name}"؟`)) return;
    await removeStaff(s.id);
    toast.success("تم تعطيل الموظف");
    refetch();
  };

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-9 h-9 text-red-400" />
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">الموظفون</h1>
          <p className="text-sm text-gray-400 mt-0.5">{staff.length} موظف · {active} نشط</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>موظف جديد</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي", value: staff.length, color: "text-brand-600 bg-brand-50", icon: Users },
          { label: "نشط", value: active, color: "text-emerald-600 bg-emerald-50", icon: UserCheck },
          { label: "معطّل", value: staff.length - active, color: "text-gray-500 bg-gray-100", icon: UserX },
          { label: "مُعيَّن دور", value: staff.filter(s => s.roleId).length, color: "text-violet-600 bg-violet-50", icon: Shield },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color.split(" ")[1])}>
              <Icon className={clsx("w-4 h-4", color.split(" ")[0])} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الجوال..."
            className="w-full bg-white border border-gray-100 rounded-xl pr-10 pl-4 py-2.5 text-sm outline-none focus:border-brand-300 transition-all" />
        </div>
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1">
          {[["all","الكل"],["employee","موظف"],["admin","مدير"],["vendor","مقدم خدمة"]].map(([v,l]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                typeFilter === v ? "bg-brand-500 text-white" : "text-gray-500 hover:text-gray-700")}>{l}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-1.5"><div className="h-3.5 w-36 bg-gray-100 rounded" /><div className="h-3 w-24 bg-gray-100 rounded" /></div>
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">{search ? "لا توجد نتائج" : "لا يوجد موظفون"}</h3>
            <p className="text-sm text-gray-400 mb-4">{search ? "جرب كلمة بحث مختلفة" : "أضف أول موظف للفريق"}</p>
            {!search && <Button icon={Plus} onClick={openCreate}>موظف جديد</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-right py-3 px-5 text-xs text-gray-400 font-semibold">الموظف</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden sm:table-cell">الجوال</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold">النوع</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-400 font-semibold hidden md:table-cell">الدور / المسمى</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-400 font-semibold">نشط</th>
                  <th className="py-3 px-4 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => {
                  const typeConf = TYPE_CONFIG[s.type] || TYPE_CONFIG.employee;
                  const roleName = roles.find((r: any) => r.id === s.roleId)?.name || s.roleName;
                  return (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm",
                            s.status === "active" ? "bg-brand-50 text-brand-600" : "bg-gray-100 text-gray-400")}>
                            {s.name?.[0] || "م"}
                          </div>
                          <div>
                            <p className={clsx("font-medium text-gray-900", s.status !== "active" && "opacity-50")}>{s.name}</p>
                            {s.email && <p className="text-xs text-gray-400">{s.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500 hidden sm:table-cell" dir="ltr">{s.phone || "—"}</td>
                      <td className="py-3.5 px-4">
                        <span className={clsx("px-2.5 py-0.5 rounded-full text-[11px] font-medium border", typeConf.color)}>{typeConf.label}</span>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div>
                          {roleName && <p className="text-xs font-medium text-violet-600">{roleName}</p>}
                          {s.jobTitle && <p className="text-xs text-gray-400">{s.jobTitle}</p>}
                          {!roleName && !s.jobTitle && <span className="text-xs text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Toggle checked={s.status === "active"} onChange={() => handleToggle(s)} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-brand-50 transition-colors"><Pencil className="w-3.5 h-3.5 text-brand-500" /></button>
                          <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* الخطوة التالية */}
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-center justify-between mt-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">الخطوة التالية</p>
          <p className="text-xs text-brand-500 mt-0.5">بعد إضافة الموظف — سجّل جدول الحضور</p>
        </div>
        <Link to="/dashboard/hr" className="flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-brand-600 transition-colors">
          إدارة الحضور <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editing ? "تعديل بيانات الموظف" : "إضافة موظف جديد"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>إلغاء</Button><Button onClick={handleSubmit} loading={saving}>حفظ</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الكامل" name="name" value={form.name} onChange={e => f("name", e.target.value)} placeholder="اسم الموظف" required />
            <Input label="رقم الجوال" name="phone" value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="05XXXXXXXX" dir="ltr" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={e => f("email", e.target.value)} placeholder="email@example.com" dir="ltr" />
            <Input label="المسمى الوظيفي" name="jobTitle" value={form.jobTitle} onChange={e => f("jobTitle", e.target.value)} placeholder="مثال: مشرف عمليات" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="نوع الحساب" name="type" value={form.type} onChange={e => f("type", e.target.value)}
              options={[{ value:"employee",label:"موظف" }, { value:"admin",label:"مدير" }, { value:"vendor",label:"مقدم خدمة" }, { value:"owner",label:"مالك" }]} />
            <Select label="الدور" name="roleId" value={form.roleId} onChange={e => f("roleId", e.target.value)}
              options={[{ value:"",label:"— بدون دور —" }, ...roles.map((r: any) => ({ value: r.id, label: r.name }))]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="الراتب (ر.س)" name="salary" value={form.salary} onChange={e => f("salary", e.target.value)} placeholder="0.00" dir="ltr" />
            <Input label="تاريخ الانضمام" name="startDate" type="date" value={form.startDate} onChange={e => f("startDate", e.target.value)} dir="ltr" />
          </div>
          {editing && (
            <Select label="الحالة" name="status" value={form.status} onChange={e => f("status", e.target.value)}
              options={[{ value:"active",label:"نشط" }, { value:"inactive",label:"معطّل" }]} />
          )}
        </div>
      </Modal>    </div>
  );
}
