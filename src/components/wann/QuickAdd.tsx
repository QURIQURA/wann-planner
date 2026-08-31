import { useEffect, useState } from "react";
import { Plus, X, ListChecks } from "lucide-react";
import { todayLocalStr } from "@/lib/wann-data";
import type { WidgetContext } from "@/lib/widget-context";
import { TaskForm, type CategoryFilter } from "./TaskForm";
import type { MultipleTaskForm } from "./MultipleTasksPanel";
import { FastCapture } from "./GoalsPanel";

/**
 * Dashboard = execution. Quick Add is the entire "create" surface here — full
 * management (filters, editing lists, category setup, …) lives on /widgets.
 * Every action below calls the SAME ctx.*Actions used by the Widgets page —
 * no new data logic, just a compact presentation of existing capture flows.
 */
export function QuickAdd({ ctx }: { ctx: WidgetContext }) {
  return (
    <section className="card-flat p-4 space-y-2">
      <p className="label-caps mb-1">Quick Add</p>
      <QuickAddTask ctx={ctx} />
      <QuickAddProject ctx={ctx} />
      <FastCapture onAdd={ctx.intentionActions.onAdd} />
    </section>
  );
}

/** + TASK — reuses TaskForm verbatim, including its edit mode. Auto-opens
 * when the Timeline hands it a task to edit (ctx.editingTask). */
function QuickAddTask({ ctx }: { ctx: WidgetContext }) {
  const [open, setOpen] = useState(false);
  const filter: CategoryFilter = { categoryId: null, subtagId: null };

  useEffect(() => {
    if (ctx.editingTask) setOpen(true);
  }, [ctx.editingTask]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground"
      >
        <Plus size={13} /> TASK
      </button>
    );
  }

  return (
    <TaskForm
      editingTask={ctx.editingTask}
      onCancelEdit={() => {
        ctx.taskActions.onCancelEdit();
        setOpen(false);
      }}
      onAddTask={(v) => ctx.taskActions.onAddTask(v)}
      onUpdateTask={(id, v) => ctx.taskActions.onUpdateTask(id, v)}
      categories={ctx.categories}
      subtags={ctx.subtags}
      projects={ctx.projects}
      projectItems={ctx.projectItems}
      filter={filter}
    />
  );
}

const emptyProjectForm = (): MultipleTaskForm => ({
  name: "",
  categoryId: null,
  subtagId: null,
  date: todayLocalStr(),
  endDate: null,
});

/** + MULTITASK — a minimal creation form (name + dates) over the existing
 * projectActions.onAdd mutation. Full editing/progress lives on /widgets. */
function QuickAddProject({ ctx }: { ctx: WidgetContext }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MultipleTaskForm>(emptyProjectForm());

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground"
      >
        <Plus size={13} /> MULTITASK
      </button>
    );
  }

  const submit = () => {
    const name = form.name.trim();
    if (!name) return;
    ctx.projectActions.onAdd({ ...form, name });
    setForm(emptyProjectForm());
    setOpen(false);
  };

  return (
    <div className="card-flat p-2 space-y-2">
      <div className="flex items-center gap-2">
        <ListChecks size={12} className="text-muted-foreground flex-shrink-0" />
        <p className="label-caps text-[10px]">New multitask / project</p>
        <button
          onClick={() => { setOpen(false); setForm(emptyProjectForm()); }}
          className="ml-auto hover:text-destructive"
          aria-label="Cancel"
        >
          <X size={12} />
        </button>
      </div>
      <input
        autoFocus
        type="text"
        placeholder="Project name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-full bg-transparent outline-none text-sm border-b border-border py-1"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-[10px] label-caps text-muted-foreground">Start</label>
        <input
          type="date"
          value={form.date ?? ""}
          onChange={(e) => setForm({ ...form, date: e.target.value || null })}
          className="bg-transparent outline-none text-sm border-b border-border py-1"
        />
        <label className="text-[10px] label-caps text-muted-foreground">End</label>
        <input
          type="date"
          value={form.endDate ?? ""}
          onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
          className="bg-transparent outline-none text-sm border-b border-border py-1"
        />
        <button
          onClick={submit}
          className="ml-auto border border-border px-3 py-1 label-caps hover:bg-muted flex items-center gap-1"
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}
