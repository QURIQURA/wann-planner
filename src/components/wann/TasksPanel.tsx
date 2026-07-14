import { useState } from "react";
import type { Category, Subtag, Task } from "@/lib/wann-data";
import { Plus, Trash2 } from "lucide-react";

export function TasksPanel({
  categories,
  subtags,
  tasks,
  onAddCategory,
  onAddSubtag,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onDeleteCategory,
}: {
  categories: Category[];
  subtags: Subtag[];
  tasks: Task[];
  onAddCategory: (name: string, color: string) => void;
  onAddSubtag: (categoryId: string, name: string) => void;
  onAddTask: (title: string, categoryId: string | null, subtagId: string | null, dueDate: string | null) => void;
  onToggleTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  onDeleteCategory: (id: string) => void;
}) {
  const [filter, setFilter] = useState<{ categoryId: string | null; subtagId: string | null }>({
    categoryId: null,
    subtagId: null,
  });
  const [newCat, setNewCat] = useState({ open: false, name: "", color: "#1A1A18" });
  const [newTask, setNewTask] = useState({ title: "", dueDate: "" });

  const filtered = tasks.filter((t) => {
    if (filter.categoryId && t.category_id !== filter.categoryId) return false;
    if (filter.subtagId && t.subtag_id !== filter.subtagId) return false;
    return true;
  });

  const activeCat = filter.categoryId ? categories.find((c) => c.id === filter.categoryId) : null;
  const catSubtags = activeCat ? subtags.filter((s) => s.category_id === activeCat.id) : [];

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

      {/* new task */}
      <div className="card-flat p-2 flex gap-2 mb-3">
        <input
          type="text"
          placeholder="+ Task"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTask.title.trim()) {
              onAddTask(newTask.title.trim(), filter.categoryId, filter.subtagId, newTask.dueDate || null);
              setNewTask({ title: "", dueDate: "" });
            }
          }}
          className="flex-1 bg-transparent outline-none text-sm"
        />
        <input
          type="date"
          value={newTask.dueDate}
          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
          className="bg-transparent outline-none text-sm border-l border-border pl-2"
        />
        <button
          onClick={() => {
            if (newTask.title.trim()) {
              onAddTask(newTask.title.trim(), filter.categoryId, filter.subtagId, newTask.dueDate || null);
              setNewTask({ title: "", dueDate: "" });
            }
          }}
          className="hover:bg-muted p-1"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* task list */}
      <div className="space-y-1">
        {filtered.length === 0 && <p className="text-xs text-muted-foreground italic">No tasks</p>}
        {filtered.map((t) => {
          const cat = t.category_id ? categories.find((c) => c.id === t.category_id) : null;
          return (
            <div key={t.id} className="flex items-center gap-2 py-1 border-b border-border/50 group">
              <button
                onClick={() => onToggleTask(t)}
                className={`h-3 w-3 border border-border flex-shrink-0 ${t.completed ? "bg-foreground" : ""}`}
              />
              <span className={`text-sm flex-1 ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </span>
              {cat && (
                <span className="text-[10px] label-caps" style={{ color: cat.color }}>
                  {cat.name}
                </span>
              )}
              {t.due_date && <span className="text-[10px] text-muted-foreground">{t.due_date.slice(5)}</span>}
              <button
                onClick={() => onDeleteTask(t.id)}
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
