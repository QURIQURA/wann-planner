import { useEffect, useState } from "react";
import type { Category, Subtag, Task, SpecialDate } from "@/lib/wann-data";
import { todayLocalStr, shortTime } from "@/lib/wann-data";
import { Plus, Trash2, X } from "lucide-react";

export type TaskFormValues = {
  title: string;
  categoryId: string | null;
  subtagId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  recurrence: string;
  specialOccasionId: string | null;
};

export function TasksPanel({
  categories,
  subtags,
  tasks,
  editingTask,
  onCancelEdit,
  onAddCategory,
  onAddSubtag,
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onDeleteCategory,
}: {
  categories: Category[];
  subtags: Subtag[];
  tasks: Task[];
  editingTask: Task | null;
  onCancelEdit: () => void;
  onAddCategory: (name: string, color: string) => void;
  onAddSubtag: (categoryId: string, name: string) => void;
  onAddTask: (v: TaskFormValues) => void;
  onUpdateTask: (id: string, v: TaskFormValues) => void;
  onToggleTask: (t: Task) => void;
  onEditTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  onDeleteCategory: (id: string) => void;
}) {
  const [filter, setFilter] = useState<{ categoryId: string | null; subtagId: string | null }>({
    categoryId: null,
    subtagId: null,
  });
  const [newCat, setNewCat] = useState({ open: false, name: "", color: "#1A1A18" });

  const emptyForm = (): TaskFormValues => ({
    title: "",
    categoryId: filter.categoryId,
    subtagId: filter.subtagId,
    dueDate: todayLocalStr(),
    dueTime: null,
    recurrence: "none",
  });

  const [form, setForm] = useState<TaskFormValues>(emptyForm);

  // Sync form with editing task
  useEffect(() => {
    if (editingTask) {
      setForm({
        title: editingTask.title,
        categoryId: editingTask.category_id,
        subtagId: editingTask.subtag_id,
        dueDate: editingTask.due_date ?? todayLocalStr(),
        dueTime: shortTime(editingTask.due_time) || null,
        recurrence: editingTask.recurrence ?? "none",
      });
    }
  }, [editingTask]);

  const resetForm = () => setForm(emptyForm());

  const filtered = tasks.filter((t) => {
    if (filter.categoryId && t.category_id !== filter.categoryId) return false;
    if (filter.subtagId && t.subtag_id !== filter.subtagId) return false;
    return true;
  });

  const activeCat = filter.categoryId ? categories.find((c) => c.id === filter.categoryId) : null;
  const catSubtags = activeCat ? subtags.filter((s) => s.category_id === activeCat.id) : [];

  const submit = () => {
    if (!form.title.trim()) return;
    const payload = { ...form, title: form.title.trim() };
    if (editingTask) {
      onUpdateTask(editingTask.id, payload);
      onCancelEdit();
    } else {
      onAddTask(payload);
    }
    resetForm();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Tasks</p>
      </div>

      {/* categories */}
      <div className="flex flex-wrap gap-1 mb-2">
        <button
          onClick={() => setFilter({ categoryId: null, subtagId: null })}
          className={`border border-border px-2 py-1 label-caps ${!filter.categoryId ? "bg-foreground text-background" : "hover:bg-muted"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter({ categoryId: c.id, subtagId: null })}
            className={`border border-border px-2 py-1 label-caps flex items-center gap-1 ${filter.categoryId === c.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            <span className="inline-block h-2 w-2" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setNewCat({ ...newCat, open: !newCat.open })}
          className="border border-border px-2 py-1 label-caps hover:bg-muted"
        >
          + Cat
        </button>
      </div>

      {newCat.open && (
        <div className="card-flat p-2 mb-2 flex gap-2 items-center">
          <input
            type="text"
            placeholder="Name"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
            className="flex-1 bg-transparent outline-none border-b border-border px-1 py-1 text-sm"
          />
          <input
            type="color"
            value={newCat.color}
            onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
            className="h-8 w-10"
          />
          <button
            onClick={() => {
              if (newCat.name.trim()) {
                onAddCategory(newCat.name.trim(), newCat.color);
                setNewCat({ open: false, name: "", color: "#1A1A18" });
              }
            }}
            className="border border-border px-3 py-1 label-caps hover:bg-muted"
          >
            Add
          </button>
        </div>
      )}

      {/* subtags */}
      {activeCat && (
        <div className="flex flex-wrap gap-1 mb-3">
          <button
            onClick={() => setFilter({ ...filter, subtagId: null })}
            className={`border border-border px-2 py-1 text-xs ${!filter.subtagId ? "bg-muted" : "hover:bg-muted"}`}
          >
            all
          </button>
          {catSubtags.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter({ ...filter, subtagId: s.id })}
              className={`border border-border px-2 py-1 text-xs ${filter.subtagId === s.id ? "bg-muted" : "hover:bg-muted"}`}
            >
              {s.name}
            </button>
          ))}
          <button
            onClick={() => {
              const name = prompt("Subtag name")?.trim();
              if (name && activeCat) onAddSubtag(activeCat.id, name);
            }}
            className="border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            + sub
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete category "${activeCat.name}"?`)) {
                onDeleteCategory(activeCat.id);
                setFilter({ categoryId: null, subtagId: null });
              }
            }}
            className="ml-auto border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* task form (create/edit) */}
      <div className="card-flat p-2 mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <p className="label-caps text-[10px]">{editingTask ? "Edit task" : "New task"}</p>
          {editingTask && (
            <button
              onClick={() => { onCancelEdit(); resetForm(); }}
              className="ml-auto hover:text-destructive"
              aria-label="Cancel edit"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="w-full bg-transparent outline-none text-sm border-b border-border py-1"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-[10px] label-caps text-muted-foreground">Date</label>
          <input
            type="date"
            value={form.dueDate ?? ""}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          />
          <label className="text-[10px] label-caps text-muted-foreground">Time</label>
          <input
            type="time"
            value={form.dueTime ?? ""}
            onChange={(e) => setForm({ ...form, dueTime: e.target.value || null })}
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          />
          <select
            value={form.categoryId ?? ""}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value || null, subtagId: null })}
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          >
            <option value="">no cat</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={form.subtagId ?? ""}
            onChange={(e) => setForm({ ...form, subtagId: e.target.value || null })}
            className="bg-transparent outline-none text-sm border-b border-border py-1"
            disabled={!form.categoryId}
          >
            <option value="">no sub</option>
            {subtags.filter((s) => s.category_id === form.categoryId).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={form.recurrence}
            onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          >
            <option value="none">once</option>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
          <button
            onClick={submit}
            className="ml-auto border border-border px-3 py-1 label-caps hover:bg-muted flex items-center gap-1"
          >
            <Plus size={12} /> {editingTask ? "Save" : "Add"}
          </button>
        </div>
      </div>

      {/* task list */}
      <div className="space-y-1">
        {filtered.length === 0 && <p className="text-xs text-muted-foreground italic">No tasks</p>}
        {filtered.map((t) => {
          const cat = t.category_id ? categories.find((c) => c.id === t.category_id) : null;
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2 py-1 border-b border-border/50 group ${editingTask?.id === t.id ? "bg-muted" : ""}`}
            >
              <button
                onClick={() => onToggleTask(t)}
                aria-label="Toggle"
                className={`h-3 w-3 border border-border flex-shrink-0 ${t.completed ? "bg-foreground" : ""}`}
              />
              <button
                onClick={() => onEditTask(t)}
                className={`text-sm flex-1 text-left hover:underline ${t.completed ? "line-through text-muted-foreground" : ""}`}
              >
                {t.title}
              </button>
              {cat && (
                <span className="text-[10px] label-caps" style={{ color: cat.color }}>
                  {cat.name}
                </span>
              )}
              {t.due_date && <span className="text-[10px] text-muted-foreground">{t.due_date.slice(5)}</span>}
              {t.due_time && (
                <span className="text-[10px] text-muted-foreground tabular-nums">{shortTime(t.due_time)}</span>
              )}
              <button
                onClick={() => onDeleteTask(t.id)}
                aria-label="Delete"
                className="opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
