import { useState } from "react";
import type { Category, MultipleTask, MultipleTaskItem } from "@/lib/wann-data";
import { todayLocalStr } from "@/lib/wann-data";
import { Plus, Trash2, X, Pencil, ChevronDown, ChevronRight } from "lucide-react";

export type MultipleTaskForm = {
  name: string;
  categoryId: string | null;
  date: string | null;
};

const emptyForm = (): MultipleTaskForm => ({
  name: "",
  categoryId: null,
  date: todayLocalStr(),
});

export function MultipleTasksPanel({
  entries,
  items,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
}: {
  entries: MultipleTask[];
  items: MultipleTaskItem[];
  categories: Category[];
  onAdd: (v: MultipleTaskForm) => void;
  onUpdate: (id: string, patch: MultipleTaskForm) => void;
  onDelete: (id: string) => void;
  onAddItem: (parentId: string, title: string) => void;
  onUpdateItem: (id: string, title: string) => void;
  onToggleItem: (item: MultipleTaskItem) => void;
  onDeleteItem: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MultipleTaskForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MultipleTaskForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [childInput, setChildInput] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");

  const startEdit = (e: MultipleTask) => {
    setEditingId(e.id);
    setEditForm({ name: e.name, categoryId: e.category_id, date: e.date });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Multiple Task</p>
        <button
          onClick={() => setCreating(!creating)}
          className="border border-border p-1 hover:bg-muted"
          aria-label="Add"
        >
          <Plus size={14} />
        </button>
      </div>

      {creating && (
        <MultipleTaskEditor
          value={form}
          onChange={setForm}
          categories={categories}
          submitLabel="Add"
          onSubmit={() => {
            if (form.name.trim()) {
              onAdd({ ...form, name: form.name.trim() });
              setForm(emptyForm());
              setCreating(false);
            }
          }}
          onCancel={() => { setCreating(false); setForm(emptyForm()); }}
        />
      )}

      <div className="space-y-1">
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No entries</p>
        )}
        {entries.map((e) => {
          const cat = e.category_id ? categories.find((c) => c.id === e.category_id) : null;
          const children = items.filter((i) => i.parent_id === e.id);
          const done = children.filter((i) => i.completed).length;
          const total = children.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : null;
          const expanded = expandedId === e.id;
          const editing = editingId === e.id;

          return (
            <div key={e.id} className="border-b border-border/50">
              <div className="flex items-center gap-2 py-1 group">
                <button
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  className="text-muted-foreground"
                  aria-label="Expand"
                >
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {e.date && (
                  <span className="text-xs text-muted-foreground w-12">{e.date.slice(5)}</span>
                )}
                <button
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  className="text-sm flex-1 text-left hover:underline"
                >
                  {e.name}
                  {pct !== null && (
                    <span className="text-muted-foreground"> · {pct}%</span>
                  )}
                </button>
                {cat && (
                  <span
                    className="text-[10px] label-caps border border-border px-1"
                    style={{ color: cat.color }}
                  >
                    {cat.name}
                  </span>
                )}
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
                  <MultipleTaskEditor
                    value={editForm}
                    onChange={setEditForm}
                    categories={categories}
                    submitLabel="Save"
                    onSubmit={() => {
                      onUpdate(e.id, { ...editForm, name: editForm.name.trim() });
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}

              {expanded && (
                <div className="pl-8 pr-1 pb-2 space-y-1">
                  {children.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No items</p>
                  )}
                  {children.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 group/child">
                      <button
                        onClick={() => onToggleItem(it)}
                        aria-label="Toggle"
                        className={`h-3 w-3 border border-border flex-shrink-0 ${it.completed ? "bg-foreground" : ""}`}
                      />
                      {editingItemId === it.id ? (
                        <input
                          autoFocus
                          value={editingItemTitle}
                          onChange={(ev) => setEditingItemTitle(ev.target.value)}
                          onBlur={() => {
                            const v = editingItemTitle.trim();
                            if (v && v !== it.title) onUpdateItem(it.id, v);
                            setEditingItemId(null);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                            if (ev.key === "Escape") setEditingItemId(null);
                          }}
                          className="flex-1 bg-transparent outline-none border-b border-border py-0.5 text-sm"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingItemId(it.id); setEditingItemTitle(it.title); }}
                          className={`text-sm flex-1 text-left hover:underline ${it.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {it.title}
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteItem(it.id)}
                        aria-label="Delete item"
                        className="opacity-0 group-hover/child:opacity-100 hover:text-destructive"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1 pt-1">
                    <input
                      type="text"
                      placeholder="+ Add item"
                      value={childInput[e.id] ?? ""}
                      onChange={(ev) => setChildInput({ ...childInput, [e.id]: ev.target.value })}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          const v = (childInput[e.id] ?? "").trim();
                          if (v) {
                            onAddItem(e.id, v);
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

function MultipleTaskEditor({
  value,
  onChange,
  categories,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  value: MultipleTaskForm;
  onChange: (v: MultipleTaskForm) => void;
  categories: Category[];
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="card-flat p-3 mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Name (e.g. 한인마트)"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="flex-1 bg-transparent outline-none border-b border-border py-1 text-sm"
        />
        <button onClick={onCancel} aria-label="Cancel" className="hover:text-destructive">
          <X size={12} />
        </button>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="date"
          value={value.date ?? ""}
          onChange={(e) => onChange({ ...value, date: e.target.value || null })}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        />
        <select
          value={value.categoryId ?? ""}
          onChange={(e) => onChange({ ...value, categoryId: e.target.value || null })}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        >
          <option value="">no cat</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={onSubmit}
          className="ml-auto border border-border px-3 py-1 label-caps hover:bg-muted"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
