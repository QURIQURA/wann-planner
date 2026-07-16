import { useState } from "react";
import type { SpecialDate, Task } from "@/lib/wann-data";
import { daysUntilAnnual, ageOn, todayLocalStr } from "@/lib/wann-data";
import { Plus, Trash2, X, Pencil } from "lucide-react";

type OccasionForm = {
  name: string;
  date: string;
  type: string;
  category: string;
  notes: string;
  show_age: boolean;
};

const emptyForm = (): OccasionForm => ({
  name: "",
  date: todayLocalStr(),
  type: "birthday",
  category: "Family",
  notes: "",
  show_age: true,
});


export function SpecialOccasionsPanel({
  entries,
  tasks,
  onAdd,
  onUpdate,
  onDelete,
  onAddChildTask,
  onToggleTask,
  onDeleteTask,
}: {
  entries: SpecialDate[];
  tasks: Task[];
  onAdd: (e: OccasionForm) => void;
  onUpdate: (id: string, patch: Partial<OccasionForm>) => void;
  onDelete: (id: string) => void;
  onAddChildTask: (occasionId: string, title: string) => void;
  onToggleTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<OccasionForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OccasionForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [childInput, setChildInput] = useState<Record<string, string>>({});

  const sorted = [...entries].sort((a, b) => daysUntilAnnual(a.date) - daysUntilAnnual(b.date));

  const startEdit = (e: SpecialDate) => {
    setEditingId(e.id);
    setEditForm({
      name: e.name,
      date: e.date,
      type: e.type,
      category: e.category,
      notes: e.notes ?? "",
      show_age: e.show_age,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Special Occasions</p>
        <button
          onClick={() => setCreating(!creating)}
          className="border border-border p-1 hover:bg-muted"
          aria-label="Add occasion"
        >
          <Plus size={14} />
        </button>
      </div>

      {creating && (
        <OccasionEditor
          value={form}
          onChange={setForm}
          onSubmit={() => {
            if (form.name && form.date) {
              onAdd(form);
              setForm(emptyForm());
              setCreating(false);
            }
          }}
          onCancel={() => { setCreating(false); setForm(emptyForm()); }}
          submitLabel="Add"
        />
      )}

      <div className="space-y-1">
        {sorted.length === 0 && <p className="text-xs text-muted-foreground italic">No entries</p>}
        {sorted.map((e) => {
          const dd = daysUntilAnnual(e.date);
          const age = e.type === "birthday" && e.show_age ? ageOn(e.date) + (dd === 0 ? 0 : 1) : null;
          const childTasks = tasks.filter((t) => t.special_occasion_id === e.id);
          const done = childTasks.filter((t) => t.completed).length;
          const total = childTasks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : null;
          const expanded = expandedId === e.id;
          const editing = editingId === e.id;

          return (
            <div key={e.id} className="border-b border-border/50">
              <div className="flex items-center gap-2 py-1 group">
                <span className="text-xs text-muted-foreground w-14">{e.date.slice(5)}</span>
                <button
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  className="text-sm flex-1 text-left hover:underline"
                >
                  {e.name}
                  {age !== null && <span className="text-muted-foreground"> · turns {age}</span>}
                  {pct !== null && <span className="text-muted-foreground"> · {pct}%</span>}
                </button>
                <span className="text-[10px] label-caps text-muted-foreground">{e.category}</span>
                <span className="text-[10px] label-caps border border-border px-1">
                  {dd === 0 ? "TODAY" : `D-${dd}`}
                </span>
                <button
                  onClick={() => startEdit(e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-foreground"
                  aria-label="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => onDelete(e.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {pct !== null && (
                <div className="h-[2px] bg-border mb-1">
                  <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                </div>
              )}

              {editing && (
                <div className="mb-2">
                  <OccasionEditor
                    value={editForm}
                    onChange={setEditForm}
                    onSubmit={() => {
                      onUpdate(e.id, editForm);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    submitLabel="Save"
                  />
                </div>
              )}

              {expanded && (
                <div className="pl-14 pr-1 pb-2 space-y-1">
                  {e.notes && (
                    <p className="text-xs text-muted-foreground italic">{e.notes}</p>
                  )}
                  {childTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No linked tasks</p>
                  )}
                  {childTasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 group/child">
                      <button
                        onClick={() => onToggleTask(t)}
                        aria-label="Toggle"
                        className={`h-3 w-3 border border-border flex-shrink-0 ${t.completed ? "bg-foreground" : ""}`}
                      />
                      <span
                        className={`text-sm flex-1 ${t.completed ? "line-through text-muted-foreground" : ""}`}
                      >
                        {t.title}
                      </span>
                      {t.due_date && (
                        <span className="text-[10px] text-muted-foreground">{t.due_date.slice(5)}</span>
                      )}
                      <button
                        onClick={() => onDeleteTask(t.id)}
                        aria-label="Delete task"
                        className="opacity-0 group-hover/child:opacity-100 hover:text-destructive"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1 pt-1">
                    <input
                      type="text"
                      placeholder="+ Add task"
                      value={childInput[e.id] ?? ""}
                      onChange={(ev) => setChildInput({ ...childInput, [e.id]: ev.target.value })}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          const v = (childInput[e.id] ?? "").trim();
                          if (v) {
                            onAddChildTask(e.id, v);
                            setChildInput({ ...childInput, [e.id]: "" });
                          }
                        }
                      }}
                      className="flex-1 bg-transparent outline-none border-b border-border py-1 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OccasionEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  value: OccasionForm;
  onChange: (v: OccasionForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="card-flat p-3 mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="flex-1 bg-transparent outline-none border-b border-border py-1 text-sm"
        />
        <button onClick={onCancel} aria-label="Cancel" className="hover:text-destructive">
          <X size={12} />
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <input
          type="date"
          value={value.date || todayLocalStr()}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        />
        <select
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value })}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        >
          <option value="birthday">birthday</option>
          <option value="anniversary">anniversary</option>
          <option value="holiday">holiday</option>
          <option value="other">other</option>
        </select>
        <select
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        >
          <option>Family</option>
          <option>Friend</option>
          <option>Work</option>
        </select>
      </div>
      <textarea
        placeholder="Notes (gift ideas…)"
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        className="w-full bg-transparent outline-none border border-border p-2 text-sm resize-none"
        rows={2}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={value.show_age}
            onChange={(e) => onChange({ ...value, show_age: e.target.checked })}
          />
          Show age
        </label>
        <button
          onClick={onSubmit}
          className="border border-border px-3 py-1 label-caps hover:bg-muted"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
