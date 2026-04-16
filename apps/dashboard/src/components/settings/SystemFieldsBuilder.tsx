import React, { useState } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Settings2, ShieldCheck, ListOrdered, Type, Eye, CheckSquare, Hash, Phone } from "lucide-react";
import { Button, Input, Modal, Select, Toggle } from "@/components/ui";
import clsx from "clsx";

export type CustomFieldDef = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "textarea" | "tel";
  required?: boolean;
  options?: string[];
  showInTable?: boolean;
};

const FIELD_TYPES = [
  { value: "text",     label: "نص قصير",     icon: Type },
  { value: "textarea", label: "نص طويل",     icon: ListOrdered },
  { value: "number",   label: "رقم",         icon: Hash },
  { value: "tel",      label: "رقم جوال",    icon: Phone },
  { value: "boolean",  label: "صندوق اختيار", icon: CheckSquare },
  { value: "select",   label: "قائمة منسدلة", icon: ListOrdered },
];

function SortableFieldItem({
  field, index, onEdit, onDelete
}: {
  field: CustomFieldDef; index: number;
  onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const typeConfig = FIELD_TYPES.find(t => t.value === field.type) || FIELD_TYPES[0];
  const Icon = typeConfig.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-3 bg-white border rounded-xl p-3 mb-2 transition-all",
        isDragging ? "shadow-lg border-brand-400 z-10 opacity-80" : "border-gray-200 shadow-sm hover:border-gray-300",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="touch-none flex items-center justify-center p-1.5 text-gray-400 hover:text-gray-600 rounded bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      {/* Field Info */}
      <div className="flex-1 min-w-0 flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
            {field.label}
            {field.required && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold">ضروري</span>}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-brand-600 bg-brand-50 px-1.5 rounded">{typeConfig.label}</span>
            <span className="text-xs text-gray-400 font-mono" dir="ltr">{field.key}</span>
            {field.showInTable && <span className="text-xs flex items-center gap-1 text-emerald-600"><Eye size={12}/> يعرض بالجدول</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
          <Settings2 size={16} />
        </button>
        <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export function SystemFieldsBuilder({
  title, description, fields, onChange
}: {
  title: string;
  description: string;
  fields: CustomFieldDef[];
  onChange: (fields: CustomFieldDef[]) => void;
}) {
  const [editingField, setEditingField] = useState<CustomFieldDef | null>(null);
  const [isNew, setIsNew] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((item) => item.id === active.id);
      const newIndex = fields.findIndex((item) => item.id === over.id);
      onChange(arrayMove(fields, oldIndex, newIndex));
    }
  };

  const openNew = () => {
    setEditingField({
      id: crypto.randomUUID(),
      key: "",
      label: "",
      type: "text",
      required: false,
      showInTable: false,
      options: [],
    });
    setIsNew(true);
  };

  const saveField = () => {
    if (!editingField || !editingField.label || !editingField.key) return; // Simple validation
    
    // auto format key: lowercase, no spaces
    const formattedKey = editingField.key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const toSave = { ...editingField, key: formattedKey };

    if (isNew) {
      onChange([...fields, toSave]);
    } else {
      onChange(fields.map(f => f.id === toSave.id ? toSave : f));
    }
    setEditingField(null);
  };

  return (
    <div className="elegant-card p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-500" />
            {title}
          </h2>
          <p className="text-[13px] text-gray-500 mt-1">{description}</p>
        </div>
        <Button onClick={openNew} icon={Plus} size="sm">إضافة حقل</Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
          <Type size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">لا توجد حقول إضافية مخصصة</p>
          <p className="text-xs text-gray-400">انقر على "إضافة حقل" لتخصيص البيانات التي تريد جمعها.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {fields.map((field, index) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  index={index}
                  onEdit={() => { setEditingField(field); setIsNew(false); }}
                  onDelete={() => onChange(fields.filter(f => f.id !== field.id))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Field Editor Modal */}
      <Modal
        open={editingField !== null}
        onClose={() => setEditingField(null)}
        title={isNew ? "إضافة حقل مخصص جديد" : "تعديل الحقل المخصص"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingField(null)}>إلغاء</Button>
            <Button onClick={saveField}>حفظ الحقل</Button>
          </>
        }
      >
        {editingField && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="اسم الحقل (يظهر للعميل أو الموظف) *"
                name="label"
                value={editingField.label}
                onChange={e => setEditingField({ ...editingField, label: e.target.value })}
                placeholder="مثال: رقم اللوحة، مقاس القميص..."
              />
              <Input
                label="مفتاح البرمجة (Key) *"
                name="key"
                value={editingField.key}
                onChange={e => setEditingField({ ...editingField, key: e.target.value.replace(/\s+/g, '_') })}
                placeholder="car_plate, shirt_size..."
                dir="ltr"
                hint="يستخدم للتخزين البرمجي، حروف إنجليزية فقط"
              />
            </div>

            <Select
              label="نوع الحقل"
              name="type"
              value={editingField.type}
              onChange={e => setEditingField({ ...editingField, type: e.target.value as any })}
              options={FIELD_TYPES}
            />

            {editingField.type === "select" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">خيارات القائمة المنسدلة (افصل بينها بفاصلة)</label>
                <textarea
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-3 text-sm outline-none focus:border-brand-400 focus:bg-white resize-none h-20"
                  placeholder="صغير, متوسط, كبير"
                  value={(editingField.options || []).join(", ")}
                  onChange={e => setEditingField({ ...editingField, options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                />
              </div>
            )}

            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-4">
              <Toggle
                label="هذا الحقل إجباري (مطلوب)"
                checked={!!editingField.required}
                onChange={v => setEditingField({ ...editingField, required: v })}
              />
              <Toggle
                label="عرض هذا الحقل في الجداول الرئيسية (مثال: جدول العملاء أو الحجوزات)"
                checked={!!editingField.showInTable}
                onChange={v => setEditingField({ ...editingField, showInTable: v })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
