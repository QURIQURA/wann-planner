import { useState } from "react";
import type { WidgetDef } from "@/lib/widget-registry";
import type { Group } from "@/lib/wann-groups";
import { koDow, shortTime, currentOccurrenceDate } from "@/lib/wann-data";
import { Plus, Trash2, X, Pencil, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { MultipleTasksPanel, MultipleTaskEditor, emptyMultipleTaskForm } from "./MultipleTasksPanel";
import { TaskForm } from "./TaskForm";
import type { WidgetContext } from "@/lib/widget-context";

/**
 * Group = a generic context/batch entity above Project (e.g. a cake order
 * made of several Projects, a trip, a renovation). A Group's detail view is
 * split into its Projects (reuses MultipleTasksPanel/MultipleTaskEditor
 * verbatim) and its Shared Tasks — Tasks that belong to the Group directly
 * rather than to any one Project (reuses TaskForm verbatim, same
 * ctx.taskActions used everywhere else, so editing one here is the exact
 * same edit session as editing it from Tasks & Projects). No new editor.
 */
export function GroupsPanel({ ctx }: { ctx: WidgetContext }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; notes: string | null }>({ name: "", notes: null });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; notes: string | null }>({ name: "", notes: null });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingProjectFor, setAddingProjectFor] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState(emptyMultipleTaskForm());

  const startEdit = (g: Group) => {
    setEditingId(g.id);
    setEditForm({ name: g.name, notes: g.notes });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Groups</p>
        <button
          onClick={() => setCreating(!creating)}
          className="border border-border p-1 hover:bg-muted"
          aria-label="Add group"
        >
          <Plus size={14} />
        </button>
      </div>

      {creating && (
        <div className="card-flat p-3 mb-3 space-y-2">
          <input
            autoFocus
            type="text"
            placeholder="Name (e.g. 케이크 주문 · 크리스마스)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-transparent outline-none text-sm border-b border-border py-1"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            className="w-full bg-transparent outline-none text-sm border-b border-border py-1"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setCreating(false); setForm({ name: "", notes: null }); }}
              className="hover:text-destructive"
              aria-label="Cancel"
            >
              <X size={12} />
            </button>
            <button
              onClick={() => {
                const name = form.name.trim();
                if (!name) return;
                ctx.groupActions.onAdd({ name, notes: form.notes });
                setForm({ name: "", notes: null });
                setCreating(false);
              }}
              className="border border-border px-3 py-1 label-caps hover:bg-muted flex items-center gap-1"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {ctx.groups.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No groups</p>
        )}
        {ctx.groups.map((g) => {
          const groupProjects = ctx.projects.filter((p) => p.group_id === g.id);
          const sharedTasks = ctx.tasks.filter((t) => t.group_id === g.id && !t.multiple_task_id);
          const expanded = expandedId === g.id;
          const editing = editingId === g.id;

          return (
            <div key={g.id} id={`group-${g.id}`} className="border-b border-border/50 transition-shadow">
              <div className="flex items-center gap-2 py-1 group flex-wrap">
                <button
                  onClick={() => setExpandedId(expanded ? null : g.id)}
                  className="text-muted-foreground p-1 -m-1"
                  aria-label="Expand"
                >
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <button
                  onClick={() => setExpandedId(expanded ? null : g.id)}
                  className="text-sm flex-1 min-w-[6rem] text-left truncate hover:underline"
                >
                  {g.name}
                </button>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {groupProjects.length} Projects · {sharedTasks.length} Shared Tasks
                </span>
                <button
                  onClick={() => startEdit(g)}
                  className="opacity-0 group-hover:opacity-100 hover:text-foreground"
                  aria-label="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => ctx.groupActions.onDelete(g.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  aria-label="Delete"
                  title="Deletes this Group — unlinks its Projects, deletes its Shared Tasks"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {editing && (
                <div className="mb-2 card-flat p-3 space-y-2">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-transparent outline-none text-sm border-b border-border py-1"
                  />
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={editForm.notes ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value || null })}
                    className="w-full bg-transparent outline-none text-sm border-b border-border py-1"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="hover:text-destructive" aria-label="Cancel">
                      <X size={12} />
                    </button>
                    <button
                      onClick={() => {
                        const name = editForm.name.trim();
                        if (!name) return;
                        ctx.groupActions.onUpdate(g.id, { name, notes: editForm.notes });
                        setEditingId(null);
                      }}
                      className="border border-border px-3 py-1 label-caps hover:bg-muted"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {expanded && (
                <div className="pl-6 pr-1 pb-3 space-y-4 min-w-0">
                  {g.notes && <p className="text-xs text-muted-foreground italic">{g.notes}</p>}

                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="label-caps text-[10px] text-muted-foreground">Projects</p>
                      <button
                        onClick={() => {
                          setAddingProjectFor(addingProjectFor === g.id ? null : g.id);
                          setProjectForm(emptyMultipleTaskForm(g.id));
                        }}
                        className="border border-border p-1 hover:bg-muted"
                        aria-label="Add project"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    {addingProjectFor === g.id && (
                      <MultipleTaskEditor
                        value={projectForm}
                        onChange={setProjectForm}
                        categories={ctx.categories}
                        subtags={ctx.subtags}
                        submitLabel="Add"
                        onSubmit={() => {
                          if (!projectForm.name.trim()) return;
                          ctx.projectActions.onAdd({ ...projectForm, name: projectForm.name.trim() });
                          setAddingProjectFor(null);
                        }}
                        onCancel={() => setAddingProjectFor(null)}
                      />
                    )}
                    <MultipleTasksPanel
                      entries={groupProjects}
                      items={ctx.projectItems}
                      categories={ctx.categories}
                      subtags={ctx.subtags}
                      groups={ctx.groups}
                      hideFilterBar
                      {...ctx.projectActions}
                    />
                  </div>

                  <div className="min-w-0 border-t border-border pt-3">
                    <p className="label-caps text-[10px] text-muted-foreground mb-2">Shared Tasks</p>
                    <SharedTaskList
                      tasks={sharedTasks}
                      onToggle={ctx.taskActions.onToggleTask}
                      onEdit={ctx.taskActions.onEditTask}
                      onDelete={ctx.taskActions.onDeleteTask}
                      editingId={ctx.editingTask?.id ?? null}
                    />
                    <div className="mt-2">
                      <TaskForm
                        editingTask={ctx.editingTask && ctx.editingTask.group_id === g.id ? ctx.editingTask : null}
                        onCancelEdit={ctx.taskActions.onCancelEdit}
                        onAddTask={ctx.taskActions.onAddTask}
                        onUpdateTask={ctx.taskActions.onUpdateTask}
                        categories={ctx.categories}
                        subtags={ctx.subtags}
                        projects={ctx.projects}
                        projectItems={ctx.projectItems}
                        groups={ctx.groups}
                        forcedGroupId={g.id}
                        filter={{ categoryId: null, subtagId: null }}
                      />
                    </div>
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

/** Minimal Shared Task row — same fields as TasksPanel's TaskList, minus the
 * Project/Group label (redundant inside a Group's own detail view). */
function SharedTaskList({
  tasks,
  editingId,
  onToggle,
  onEdit,
  onDelete,
}: {
  tasks: import("@/lib/wann-data").Task[];
  editingId: string | null;
  onToggle: (t: import("@/lib/wann-data").Task, occurrenceDate: string) => void;
  onEdit: (t: import("@/lib/wann-data").Task) => void;
  onDelete: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No shared tasks</p>;
  }
  return (
    <div className="space-y-1">
      {tasks.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 py-1 border-b border-border/50 group flex-wrap ${editingId === t.id ? "bg-muted" : ""}`}
        >
          <button
            onClick={() => onToggle(t, currentOccurrenceDate(t))}
            aria-label="Toggle"
            className={`h-3 w-3 border border-border flex-shrink-0 ${t.completed ? "bg-foreground" : ""}`}
          />
          <button
            onClick={() => onEdit(t)}
            className={`text-sm flex-1 min-w-[6rem] text-left truncate hover:underline ${t.completed ? "line-through text-muted-foreground" : ""}`}
          >
            {t.title}
          </button>
          {t.is_critical && <AlertTriangle size={11} className="text-muted-foreground flex-shrink-0" />}
          {t.due_date && (
            <span className="text-[10px] text-muted-foreground">
              {t.due_date.slice(5)} ({koDow(t.due_date)})
            </span>
          )}
          {t.due_time && (
            <span className="text-[10px] text-muted-foreground tabular-nums">{shortTime(t.due_time)}</span>
          )}
          <button
            onClick={() => onDelete(t.id)}
            aria-label="Delete"
            className="opacity-0 group-hover:opacity-100 hover:text-destructive"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export const groupsWidget: WidgetDef = {
  id: "groups",
  label: "Groups",
  defaultVisible: true,
  category: "planning",
  description: "Context/batches spanning multiple Projects — e.g. a cake order or a trip",
  render: (ctx) => (
    <section className="card-flat p-4">
      <GroupsPanel ctx={ctx} />
    </section>
  ),
};
