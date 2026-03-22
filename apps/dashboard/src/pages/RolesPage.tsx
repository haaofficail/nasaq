import { useState } from "react";
import { Shield, Plus, Loader2, AlertCircle, ChevronRight, Users, Save, X, Trash2 } from "lucide-react";
import { rolesApi } from "@/lib/api";
import { useApi, useMutation } from "@/hooks/useApi";
import { Modal, Button, Input, Toggle, Toast } from "@/components/ui";

// Permission sections with Arabic labels
const SECTIONS = [
  { key: "services", label: "الخدمات" },
  { key: "bookings", label: "الحجوزات" },
  { key: "customers", label: "العملاء" },
  { key: "finance", label: "المالية" },
  { key: "inventory", label: "المخزون" },
  { key: "team", label: "الفريق" },
  { key: "marketing", label: "التسويق" },
  { key: "reports", label: "التقارير" },
  { key: "settings", label: "الإعدادات" },
  { key: "website", label: "الموقع" },
  { key: "platform", label: "المنصة" },
];

const ACTIONS = [
  { key: "view", label: "عرض" },
  { key: "create", label: "إنشاء" },
  { key: "edit", label: "تعديل" },
  { key: "delete", label: "حذف" },
  { key: "export", label: "تصدير" },
];

export function RolesPage() {
  const { data: res, loading, error, refetch } = useApi(() => rolesApi.list(), []);
  const roles = res?.data || [];

  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const selectRole = (role: any) => {
    setSelectedRole(role);
    setPermissions(role.permissions || []);
  };

  const togglePermission = (section: string, action: string) => {
    const key = `${section}:${action}`;
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleAllSection = (section: string) => {
    const sectionPerms = ACTIONS.map((a) => `${section}:${a.key}`);
    const allSet = sectionPerms.every((p) => permissions.includes(p));
    if (allSet) {
      setPermissions((prev) => prev.filter((p) => !sectionPerms.includes(p)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...sectionPerms])]);
    }
  };

  const hasPermission = (section: string, action: string) =>
    permissions.includes(`${section}:${action}`);

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await rolesApi.updatePermissions(selectedRole.id, permissions);
      setToast({ msg: "تم حفظ الصلاحيات بنجاح", type: "success" });
      refetch();
    } catch {
      setToast({ msg: "فشل حفظ الصلاحيات", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newRoleName.trim()) return;
    try {
      await rolesApi.create({ name: newRoleName });
      setNewRoleName("");
      setShowCreate(false);
      setToast({ msg: "تم إنشاء الدور بنجاح", type: "success" });
      refetch();
    } catch {
      setToast({ msg: "فشل إنشاء الدور", type: "error" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-red-500">{error}</p>
      <button onClick={refetch} className="text-sm text-brand-500 hover:underline">إعادة المحاولة</button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأدوار والصلاحيات</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة أدوار الموظفين وصلاحياتهم</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>إنشاء دور جديد</Button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Roles list */}
        <div className="w-72 shrink-0 space-y-2 overflow-y-auto">
          {roles.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد أدوار</p>
          )}
          {roles.map((role: any) => (
            <button
              key={role.id}
              onClick={() => selectRole(role)}
              className={`w-full text-right px-4 py-4 rounded-xl border transition-all flex items-center gap-3 ${
                selectedRole?.id === role.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                selectedRole?.id === role.id ? "bg-brand-100" : "bg-gray-100"
              }`}>
                <Shield className={`w-5 h-5 ${selectedRole?.id === role.id ? "text-brand-500" : "text-gray-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${selectedRole?.id === role.id ? "text-brand-700" : "text-gray-900"}`}>
                  {role.name}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />
                  {role.memberCount ?? role.member_count ?? 0} عضو
                  {(role.isSystem || role.is_system) && <span className="mr-2 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">نظامي</span>}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          ))}
        </div>

        {/* Permission editor */}
        <div className="flex-1 overflow-y-auto">
          {!selectedRole ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Shield className="w-16 h-16 text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">اختر دوراً لتعديل صلاحياته</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Role header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-brand-500" />
                  <div>
                    <h2 className="font-bold text-gray-900">{selectedRole.name}</h2>
                    <p className="text-xs text-gray-400">{permissions.length} صلاحية محددة</p>
                  </div>
                </div>
                <Button
                  onClick={handleSave}
                  loading={saving}
                  icon={Save}
                  size="sm"
                >
                  حفظ الصلاحيات
                </Button>
              </div>

              {/* Permission matrix */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600 w-40">القسم</th>
                      {ACTIONS.map((action) => (
                        <th key={action.key} className="text-center px-4 py-3 text-sm font-semibold text-gray-600 w-24">
                          {action.label}
                        </th>
                      ))}
                      <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600 w-20">الكل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTIONS.map((section, idx) => {
                      const sectionPerms = ACTIONS.map((a) => `${section.key}:${a.key}`);
                      const allSet = sectionPerms.every((p) => permissions.includes(p));
                      const someSet = sectionPerms.some((p) => permissions.includes(p));

                      return (
                        <tr key={section.key} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-6 py-3.5">
                            <span className="font-medium text-sm text-gray-800">{section.label}</span>
                          </td>
                          {ACTIONS.map((action) => (
                            <td key={action.key} className="text-center px-4 py-3.5">
                              <input
                                type="checkbox"
                                checked={hasPermission(section.key, action.key)}
                                onChange={() => togglePermission(section.key, action.key)}
                                className="w-4 h-4 rounded text-brand-500 border-gray-300 cursor-pointer"
                              />
                            </td>
                          ))}
                          <td className="text-center px-4 py-3.5">
                            <button
                              onClick={() => toggleAllSection(section.key)}
                              className={`w-8 h-8 rounded-lg border transition-colors text-xs font-bold ${
                                allSet
                                  ? "bg-brand-500 border-brand-500 text-white"
                                  : someSet
                                  ? "bg-brand-100 border-brand-300 text-brand-600"
                                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                              }`}
                            >
                              {allSet ? "✓" : someSet ? "–" : "+"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create role modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setNewRoleName(""); }}
        title="إنشاء دور جديد"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); setNewRoleName(""); }}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={!newRoleName.trim()}>إنشاء</Button>
          </>
        }
      >
        <Input
          label="اسم الدور"
          name="name"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          placeholder="مثال: مدير العمليات"
          required
        />
      </Modal>

      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
