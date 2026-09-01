import { useState } from "react";
import type { WidgetDef } from "@/lib/widget-registry";
import type { Group } from "@/lib/wann-groups";
import { Plus, Trash2, X, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { MultipleTasksPanel, MultipleTaskEditor, emptyMultipleTaskForm, SharedTaskList } from "./MultipleTasksPanel";
import { TaskForm } from "./TaskForm";
import type { WidgetContext } from "@/lib/widget-context";
import { groupColor, GROUP_COLOR_PALETTE } from "@/lib/wann-groups";

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
  const [form, setForm] = useState<{ name: string; notes: string | null; color: string | null }>({ name: "", notes: null, color: null });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; notes: string | null; color: string | null }>({ name: "", notes: null, color: null });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingProjectFor, setAddingProjectFor] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState(emptyMultipleTaskForm());
  const [addingExistingFor, setAddingExistingFor] = useState<string | null>(null);
  const [existingCategoryFilter, setExistingCategoryFilter] = useState<string>("");
  const [existingProjectId, setExistingProjectId] = useState<string>("");

  const startEdit = (g: Group) => {
    setEditingId(g.id);
    setEditForm({ name: g.name, notes: g.notes, color: g.color ?? null });
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
          <GroupColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setCreating(false); setForm({ name: "", notes: null, color: null }); }}
              className="hover:text-destructive"
              aria-label="Cancel"
            >
              <X size={12} />
            </button>
            <button
              onClick={() => {
                const name = form.name.trim();
                if (!name) return;
                ctx.groupActions.onAdd({ name, notes: form.notes, color: form.color });
                setForm({ name: "", notes: null, color: null });
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
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: g.color || groupColor(g.id) }}
                />
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
                  <GroupColorPicker value={editForm.color} onChange={(c) => setEditForm({ ...editForm, color: c })} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="hover:text-destructive" aria-label="Cancel">
                      <X size={12} />
                    </button>
                    <button
                      onClick={() => {
                        const name = editForm.name.trim();
                        if (!name) return;
                        ctx.groupActions.onUpdate(g.id, { name, notes: editForm.notes, color: editForm.color });
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
                <div className="pl-6 pr-1 pb-3 space-y-3 min-w-0">
                  {g.notes && <p className="text-xs text-muted-foreground italic">{g.notes}</p>}

                  {/* Projects + Shared Tasks together in one dashed box, in
                      the Group's colour — same visual treatment as the
                      Dashboard's Groups card, so the two views read as one
                      consistent pattern. */}
                  <div
                    className="rounded-lg border-2 border-dashed p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0"
                    style={{ borderColor: g.color || groupColor(g.id) }}
                  >
                  <div
                    className="min-w-0 sm:border-r sm:border-dashed sm:pr-4"
                    style={{ borderColor: g.color || groupColor(g.id) }}
                  >
                    <p className="label-caps text-[10px] text-muted-foreground mb-2">Projects</p>
                    <MultipleTasksPanel
                      entries={groupProjects}
                      items={ctx.projectItems}
                      categories={ctx.categories}
                      subtags={ctx.subtags}
                      groups={ctx.groups}
                      allTasks={ctx.tasks}
                      editingTaskId={ctx.editingTask?.id ?? null}
                      onToggleTask={ctx.taskActions.onToggleTask}
                      onEditTask={ctx.taskActions.onEditTask}
                      onDeleteTask={ctx.taskActions.onDeleteTask}
                      hideGroupSharedTasks
                      hideFilterBar
                      hideHeader
                      {...ctx.projectActions}
                      // Inside a Group, the row's trash icon unlinks the
                      // Project from this Group — it never deletes the
                      // Project itself (still fully editable/visible from
                      // Widgets > Tasks & Projects).
                      onDelete={(id) => ctx.groupActions.onRemoveProjectFromGroup(id)}
                      deleteLabel="Remove from group"
                    />

                    {addingExistingFor === g.id && (
                      <div className="card-flat p-3 mt-2 space-y-2">
                        <p className="label-caps text-[10px] text-muted-foreground">Add existing project</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <label className="text-[10px] label-caps text-muted-foreground">Category</label>
                          <select
                            value={existingCategoryFilter}
                            onChange={(e) => {
                              setExistingCategoryFilter(e.target.value);
                              setExistingProjectId("");
                            }}
                            className="bg-transparent outline-none text-sm border-b border-border py-1 min-w-0"
                          >
                            <option value="">All</option>
                            <option value="uncategorized">Uncategorized</option>
                            {ctx.categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <label className="text-[10px] label-caps text-muted-foreground">Project</label>
                          <select
                            value={existingProjectId}
                            onChange={(e) => setExistingProjectId(e.target.value)}
                            className="bg-transparent outline-none text-sm border-b border-border py-1 flex-1 min-w-0"
                          >
                            <option value="">Select project…</option>
                            {ctx.projects
                              .filter((p) => {
                                if (p.group_id === g.id) return false; // already listed above
                                if (existingCategoryFilter === "uncategorized") return p.category_id === null;
                                if (existingCategoryFilter) return p.category_id === existingCategoryFilter;
                                return true;
                              })
                              .map((p) => {
                                const inOtherGroup = p.group_id != null && p.group_id !== g.id;
                                const otherGroupName = inOtherGroup
                                  ? ctx.groups.find((x) => x.id === p.group_id)?.name
                                  : null;
                                return (
                                  <option key={p.id} value={p.id} disabled={inOtherGroup}>
                                    {p.name}
                                    {inOtherGroup ? ` (already in ${otherGroupName ?? "another group"})` : ""}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setAddingExistingFor(null);
                              setExistingCategoryFilter("");
                              setExistingProjectId("");
                            }}
                            className="text-[10px] label-caps border border-border px-2 py-1 hover:bg-muted"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (!existingProjectId) return;
                              ctx.groupActions.onAddExistingProjectToGroup(existingProjectId, g.id);
                              setAddingExistingFor(null);
                              setExistingCategoryFilter("");
                              setExistingProjectId("");
                            }}
                            disabled={!existingProjectId}
                            className="text-[10px] label-caps border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

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

                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => {
                          setAddingProjectFor(null);
                          setAddingExistingFor(addingExistingFor === g.id ? null : g.id);
                          setExistingCategoryFilter("");
                          setExistingProjectId("");
                        }}
                        className="w-full flex items-center gap-2 border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground"
                      >
                        <Plus size={13} /> ADD EXISTING PROJECT
                      </button>
                      <button
                        onClick={() => {
                          setAddingExistingFor(null);
                          setAddingProjectFor(addingProjectFor === g.id ? null : g.id);
                          setProjectForm(emptyMultipleTaskForm(g.id));
                        }}
                        className="w-full flex items-center gap-2 border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground"
                      >
                        <Plus size={13} /> NEW PROJECT
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="label-caps text-[10px] text-muted-foreground mb-2">Shared Tasks</p>
                    <TaskForm
                      editingTask={ctx.editingTask && ctx.editingTask.group_id === g.id ? ctx.editingTask : null}
                      onCancelEdit={ctx.taskActions.onCancelEdit}
                      onAddTask={ctx.taskActions.onAddTask}
                      onAddTaskSeries={ctx.taskActions.onAddTaskSeries}
                      onUpdateTask={ctx.taskActions.onUpdateTask}
                      categories={ctx.categories}
                      subtags={ctx.subtags}
                      projects={ctx.projects}
                      projectItems={ctx.projectItems}
                      groups={ctx.groups}
                      forcedGroupId={g.id}
                      hideProjectField
                      filter={{ categoryId: null, subtagId: null }}
                    />
                    <div className="mt-3">
                      <SharedTaskList
                        tasks={sharedTasks}
                        onToggle={ctx.taskActions.onToggleTask}
                        onEdit={ctx.taskActions.onEditTask}
                        onDelete={ctx.taskActions.onDeleteTask}
                        editingId={ctx.editingTask?.id ?? null}
                      />
                    </div>
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

function GroupColorPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div>
      <p className="label-caps text-[10px] text-muted-foreground mb-1">Color (optional)</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`w-5 h-5 rounded-full border flex items-center justify-center ${!value ? "border-foreground" : "border-border"}`}
          title="Auto"
        >
          <X size={10} className="text-muted-foreground" />
        </button>
        {GROUP_COLOR_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`w-5 h-5 rounded-full border-2 ${value === c ? "border-foreground" : "border-transparent"}`}
            style={{ background: c }}
            title={c}
          />
        ))}
        <input
          type="color"
          value={value ?? "#888888"}
          onChange={(e) => onChange(e.target.value)}
          className="w-5 h-5 cursor-pointer border-0 bg-transparent p-0"
          title="Custom color"
        />
      </div>
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
