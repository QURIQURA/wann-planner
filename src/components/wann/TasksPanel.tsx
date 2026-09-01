import type { WidgetDef } from "@/lib/widget-registry";
import { useState } from "react";
import type { Category, MultipleTask, Subtag, Task, TaskCompletion } from "@/lib/wann-data";
import { todayLocalStr, shortTime, isOccurrenceCompleted, currentOccurrenceDate, koDow, taskSortKey, diffDays, taskCategoryIds } from "@/lib/wann-data";
import type { Group } from "@/lib/wann-groups";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { CategoryFilterBar } from "./CategoryFilterBar";
import type { CategoryFilter, TaskFormValues } from "./TaskForm";

export function TasksPanel({
  categories,
  subtags,
  projects,
  groups = [],
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
  filter: filterProp,
  onFilterChange,
  hideFilterBar,
}: {
  categories: Category[];
  subtags: Subtag[];
  projects: MultipleTask[];
  groups?: Group[];
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
  /** Controlled category filter (shared with the Multiple Task column). */
  filter?: CategoryFilter;
  onFilterChange?: (f: CategoryFilter) => void;
  /** Hide the built-in filter bar when a shared one is rendered above. */
  hideFilterBar?: boolean;
}) {
  const today = todayLocalStr();
  const [showDone, setShowDone] = useState(false);

  const [localFilter, setLocalFilter] = useState<CategoryFilter>({
    categoryId: null,
    subtagId: null,
  });
  const filter = filterProp ?? localFilter;
  const setFilter = (f: CategoryFilter) => (onFilterChange ? onFilterChange(f) : setLocalFilter(f));

  const filtered = tasks.filter((t) => {
    if (filter.categoryId && !taskCategoryIds(t).includes(filter.categoryId)) return false;
    if (filter.subtagId && t.subtag_id !== filter.subtagId) return false;
    // Recurring tasks only show their nearest occurrence when it falls within a
    // week of today — this list is a "what's live right now" view, not a full
    // history. This Week / Month views are unaffected: they scope by date range
    // already and never go through this filter.
    if ((t.recurrence ?? "none") !== "none" && t.due_date) {
      const occ = currentOccurrenceDate(t, today);
      if (Math.abs(diffDays(today, occ)) > 7) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Tasks</p>
      </div>

      {!hideFilterBar && (
        <CategoryFilterBar
          categories={categories}
          subtags={subtags}
          tasks={tasks}
          filter={filter}
          setFilter={setFilter}
          onAddCategory={onAddCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
          onAddSubtag={onAddSubtag}
          onUpdateSubtag={onUpdateSubtag}
          onDeleteSubtag={onDeleteSubtag}
        />
      )}

      {(() => {
        // Tasks always carry a due date now (undated capture belongs to Ideas &
        // Goals instead), so there's no separate "날짜 미정" bucket to split out
        // any more — every open Task renders in one dated list.
        const open = filtered
          .filter((t) => !isOccurrenceCompleted(t, currentOccurrenceDate(t, today), completions))
          .slice()
          .sort((a, b) => taskSortKey(a).localeCompare(taskSortKey(b)));
        return (
          <TaskList
            items={open}
            categories={categories}
            projects={projects}
            groups={groups}
            editingId={editingTask?.id ?? null}
            onToggle={onToggleTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        );
      })()}


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
                  groups={groups}
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
  groups = [],
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
  groups?: Group[];
}) {
  if (items.length === 0 && !completed) {
    return <p className="text-xs text-muted-foreground italic">No tasks</p>;
  }
  return (
    <div className="space-y-1">
      {items.map((t) => {
        const cats = taskCategoryIds(t)
          .map((id) => categories.find((c) => c.id === id))
          .filter((c): c is Category => !!c);
        const project = t.multiple_task_id ? projects.find((p) => p.id === t.multiple_task_id) : null;
        // Mutually exclusive with project — a Task belongs to at most one.
        const group = !project && t.group_id ? groups.find((g) => g.id === t.group_id) : null;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 py-1 border-b border-border/50 group flex-wrap ${editingId === t.id ? "bg-muted" : ""}`}
          >
            <button
              onClick={() => onToggle(t, currentOccurrenceDate(t))}
              aria-label="Toggle"
              className={`h-3 w-3 border border-border flex-shrink-0 ${completed ? "bg-foreground" : ""}`}
            />
            <button
              onClick={() => onEdit(t)}
              className={`text-sm flex-1 min-w-[6rem] text-left truncate hover:underline ${completed ? "line-through text-muted-foreground" : ""}`}
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
            {group && (
              <span className="text-[10px] label-caps bg-foreground text-background px-1.5 py-0.5 max-w-[90px] truncate flex-shrink-0">
                {group.name}
              </span>
            )}
            {cats.map((c) => (
              <span key={c.id} className="text-[10px] label-caps" style={{ color: c.color }}>
                {c.name}
              </span>
            ))}
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

export const tasksWidget: WidgetDef = {
  id: "tasks",
  label: "Tasks",
  render: (ctx) => (
    <section className="card-flat p-4">
      <TasksPanel
        categories={ctx.categories}
        subtags={ctx.subtags}
        projects={ctx.projects}
        tasks={ctx.tasks}
        completions={ctx.completions}
        editingTask={ctx.editingTask}
        {...ctx.taskActions}
      />
    </section>
  ),
};
