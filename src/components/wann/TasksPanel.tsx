import { useEffect, useState } from "react";
import type { Category, MultipleTask, Subtag, Task, TaskCompletion } from "@/lib/wann-data";
import { todayLocalStr, shortTime, isOccurrenceCompleted, currentOccurrenceDate, formatDateKo, koDow } from "@/lib/wann-data";
import { Plus, Trash2, X, ChevronDown, ChevronUp, Pencil } from "lucide-react";


export type NewProjectValues = {
  name: string;
  startDate: string | null;
  endDate: string | null;
};

export type TaskFormValues = {
  title: string;
  categoryId: string | null;
  subtagId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  endTime: string | null;
  recurrence: string;
  projectId: string | null;
  newProject: NewProjectValues | null;
};


export function TasksPanel({
  categories,
  subtags,
  projects,
  tasks,
  completions,
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
  onUpdateCategory,
  onUpdateSubtag,
  onDeleteSubtag,
}: {
  categories: Category[];
  subtags: Subtag[];
  projects: MultipleTask[];
  tasks: Task[];
  completions: TaskCompletion[];
  editingTask: Task | null;
  onCancelEdit: () => void;
  onAddCategory: (name: string, color: string) => void;
  onAddSubtag: (categoryId: string, name: string) => void;
  onAddTask: (v: TaskFormValues) => void;
  onUpdateTask: (id: string, v: TaskFormValues) => void;
  onToggleTask: (t: Task, occurrenceDate: string) => void;
  onEditTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCategory: (id: string, name: string, color: string) => void;
  onUpdateSubtag: (id: string, name: string) => void;
  onDeleteSubtag: (id: string) => void;
}) {
  const today = todayLocalStr();
  const [showDone, setShowDone] = useState(false);

  const [filter, setFilter] = useState<{ categoryId: string | null; subtagId: string | null }>({
    categoryId: null,
    subtagId: null,
  });
  const [newCat, setNewCat] = useState({ open: false, name: "", color: "#1A1A18" });
  const [editCat, setEditCat] = useState<{ id: string; name: string; color: string } | null>(null);
  const [editingSubtagId, setEditingSubtagId] = useState<string | null>(null);
  const [editingSubtagName, setEditingSubtagName] = useState("");

  const emptyForm = (): TaskFormValues => ({
    title: "",
    categoryId: filter.categoryId,
    subtagId: filter.subtagId,
    dueDate: todayLocalStr(),
    dueTime: null,
    endTime: null,
    recurrence: "none",
    projectId: null,
    newProject: null,
  });

  const [form, setForm] = useState<TaskFormValues>(emptyForm);

  useEffect(() => {
    if (editingTask) {
      setForm({
        title: editingTask.title,
        categoryId: editingTask.category_id,
        subtagId: editingTask.subtag_id,
        dueDate: editingTask.due_date ?? todayLocalStr(),
        dueTime: shortTime(editingTask.due_time) || null,
        endTime: shortTime(editingTask.end_time) || null,
        recurrence: editingTask.recurrence ?? "none",
        projectId: editingTask.multiple_task_id ?? null,
        newProject: null,
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
    if (form.newProject && !form.newProject.name.trim()) return;
    const payload: TaskFormValues = {
      ...form,
      title: form.title.trim(),
      newProject: form.newProject
        ? { ...form.newProject, name: form.newProject.name.trim() }
        : null,
    };
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

      {editCat && (
        <div className="card-flat p-2 mb-2 flex gap-2 items-center">
          <input
            type="text"
            value={editCat.name}
            onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
            className="flex-1 bg-transparent outline-none border-b border-border px-1 py-1 text-sm"
          />
          <input
            type="color"
            value={editCat.color}
            onChange={(e) => setEditCat({ ...editCat, color: e.target.value })}
            className="h-8 w-10"
          />
          <button
            onClick={() => {
              if (editCat.name.trim()) {
                onUpdateCategory(editCat.id, editCat.name.trim(), editCat.color);
                setEditCat(null);
              }
            }}
            className="border border-border px-3 py-1 label-caps hover:bg-muted"
          >
            Save
          </button>
          <button onClick={() => setEditCat(null)} aria-label="Cancel" className="hover:text-destructive">
            <X size={12} />
          </button>
        </div>
      )}

      {activeCat && (
        <div className="flex flex-wrap gap-1 mb-3 items-center">
          <button
            onClick={() => setFilter({ ...filter, subtagId: null })}
            className={`border border-border px-2 py-1 text-xs ${!filter.subtagId ? "bg-muted" : "hover:bg-muted"}`}
          >
            all
          </button>
          {catSubtags.map((s) => (
            <span
              key={s.id}
              className={`border border-border px-2 py-1 text-xs flex items-center gap-1 group/sub ${filter.subtagId === s.id ? "bg-muted" : ""}`}
            >
              {editingSubtagId === s.id ? (
                <input
                  autoFocus
                  value={editingSubtagName}
                  onChange={(e) => setEditingSubtagName(e.target.value)}
                  onBlur={() => {
                    const v = editingSubtagName.trim();
                    if (v && v !== s.name) onUpdateSubtag(s.id, v);
                    setEditingSubtagId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditingSubtagId(null);
                  }}
                  className="bg-transparent outline-none border-b border-border w-20 text-xs"
                />
              ) : (
                <>
                  <button onClick={() => setFilter({ ...filter, subtagId: s.id })} className="hover:underline">
                    {s.name}
                  </button>
                  <button
                    onClick={() => { setEditingSubtagId(s.id); setEditingSubtagName(s.name); }}
                    aria-label={`Edit subtag ${s.name}`}
                    className="opacity-0 group-hover/sub:opacity-100 hover:text-foreground"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={() => {
                      const used = tasks.filter((t) => t.subtag_id === s.id).length;
                      const msg = used > 0
                        ? `This subcategory is used by ${used} task${used === 1 ? "" : "s"}. Delete anyway?`
                        : `Delete subcategory "${s.name}"?`;
                      if (confirm(msg)) {
                        if (filter.subtagId === s.id) setFilter({ ...filter, subtagId: null });
                        onDeleteSubtag(s.id);
                      }
                    }}
                    aria-label={`Delete subtag ${s.name}`}
                    className="opacity-0 group-hover/sub:opacity-100 hover:text-destructive"
                  >
                    <X size={10} />
                  </button>
                </>
              )}
            </span>
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
            onClick={() => setEditCat({ id: activeCat.id, name: activeCat.name, color: activeCat.color })}
            aria-label="Edit category"
            className="ml-auto border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete category "${activeCat.name}"?`)) {
                onDeleteCategory(activeCat.id);
                setFilter({ categoryId: null, subtagId: null });
              }
            }}
            className="border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

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
          {form.dueDate && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {formatDateKo(form.dueDate)}
            </span>
          )}
          <label className="text-[10px] label-caps text-muted-foreground">Time</label>
          <input
            type="time"
            value={form.dueTime ?? ""}
            onChange={(e) => setForm({ ...form, dueTime: e.target.value || null })}
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          />
          <label className="text-[10px] label-caps text-muted-foreground">End</label>
          <input
            type="time"
            value={form.endTime ?? ""}
            onChange={(e) => setForm({ ...form, endTime: e.target.value || null })}
            disabled={!form.dueTime}
            title={form.dueTime ? "Optional end time" : "Set a start time first"}
            className="bg-transparent outline-none text-sm border-b border-border py-1 disabled:opacity-40"
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
            <option value="biweekly">biweekly</option>
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

      <TaskList
        items={filtered.filter((t) => !isOccurrenceCompleted(t, currentOccurrenceDate(t, today), completions))}
        categories={categories}
        projects={projects}
        editingId={editingTask?.id ?? null}
        onToggle={onToggleTask}
        onEdit={onEditTask}
        onDelete={onDeleteTask}
      />

      {(() => {
        const done = filtered.filter((t) => isOccurrenceCompleted(t, currentOccurrenceDate(t, today), completions));
        if (done.length === 0) return null;
        return (
          <div className="mt-3 border-t border-border pt-2">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground hover:text-foreground"
            >
              {showDone ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              Completed ({done.length})
            </button>
            {showDone && (
              <div className="mt-1">
                <TaskList
                  items={done}
                  categories={categories}
                  projects={projects}
                  editingId={editingTask?.id ?? null}
                  onToggle={onToggleTask}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  completed
                />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function TaskList({
  projects,
  items,
  categories,
  editingId,
  onToggle,
  onEdit,
  onDelete,
  completed = false,
}: {
  items: Task[];
  categories: Category[];
  editingId: string | null;
  onToggle: (t: Task, occurrenceDate: string) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  completed?: boolean;
  projects: MultipleTask[];
}) {
  if (items.length === 0 && !completed) {
    return <p className="text-xs text-muted-foreground italic">No tasks</p>;
  }
  return (
    <div className="space-y-1">
      {items.map((t) => {
        const cat = t.category_id ? categories.find((c) => c.id === t.category_id) : null;
        const project = t.multiple_task_id ? projects.find((p) => p.id === t.multiple_task_id) : null;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 py-1 border-b border-border/50 group ${editingId === t.id ? "bg-muted" : ""}`}
          >
            <button
              onClick={() => onToggle(t, currentOccurrenceDate(t))}
              aria-label="Toggle"
              className={`h-3 w-3 border border-border flex-shrink-0 ${completed ? "bg-foreground" : ""}`}
            />
            <button
              onClick={() => onEdit(t)}
              className={`text-sm flex-1 text-left hover:underline ${completed ? "line-through text-muted-foreground" : ""}`}
            >
              {t.title}
              {(t.recurrence ?? "none") !== "none" && (
                <span className="ml-1 text-[10px] text-muted-foreground">↻</span>
              )}
            </button>
            {project && (
              <span className="text-[10px] text-muted-foreground border-b border-border max-w-[90px] truncate">
                {project.name}
              </span>
            )}
            {cat && (
              <span className="text-[10px] label-caps" style={{ color: cat.color }}>
                {cat.name}
              </span>
            )}
            {t.due_date && (
              <span className="text-[10px] text-muted-foreground">
                {t.due_date.slice(5)} ({koDow(t.due_date)})
              </span>
            )}
            {t.due_time && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {shortTime(t.due_time)}
                {t.end_time ? `–${shortTime(t.end_time)}` : ""}
              </span>
            )}
            <button
              onClick={() => onDelete(t.id)}
              aria-label="Delete"
              className="opacity-0 group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
