import type { WidgetDef } from "@/lib/widget-registry";
import { useState } from "react";
import type { Category, MultipleTask, Subtag, Task, TaskCompletion } from "@/lib/wann-data";
import { todayLocalStr, shortTimeAmPm, isOccurrenceCompleted, isOccurrenceOverdue, currentOccurrenceDate, koDow, taskSortKey, diffDays, taskCategoryIds, hexToRgba } from "@/lib/wann-data";
import { PRODUCT_LINES } from "@/lib/wann-groups";
import { Trash2, ChevronDown, ChevronUp, ChevronRight, Link2 } from "lucide-react";
import { CategoryFilterBar } from "./CategoryFilterBar";
import type { CategoryFilter, TaskFormValues } from "./TaskForm";

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
  filter: filterProp,
  onFilterChange,
  hideFilterBar,
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
  /** Controlled category filter (shared with the Multiple Task column). */
  filter?: CategoryFilter;
  onFilterChange?: (f: CategoryFilter) => void;
  /** Hide the built-in filter bar when a shared one is rendered above. */
  hideFilterBar?: boolean;
}) {
  const today = todayLocalStr();
  const [showDone, setShowDone] = useState(false);
  const [showUndated, setShowUndated] = useState(false);

  const [localFilter, setLocalFilter] = useState<CategoryFilter>({
    categoryId: null,
    subtagId: null,
  });
  const filter = filterProp ?? localFilter;
  const setFilter = (f: CategoryFilter) => (onFilterChange ? onFilterChange(f) : setLocalFilter(f));

  const filtered = tasks.filter((t) => {
    // Linked tasks (참고 링크 걸린 Task) have their own home in the Linked
    // Tasks widget — keep them out of the plain Tasks list so they don't
    // duplicate there.
    if (t.link_url) return false;
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
        // Open (not-yet-completed) tasks split into a dated list — the main,
        // always-visible view, sorted by due date — and an undated "날짜 미정"
        // bucket behind a collapsible toggle, mirroring the Projects pattern
        // in MultipleTasksPanel.
        const open = filtered.filter((t) => !isOccurrenceCompleted(t, currentOccurrenceDate(t, today), completions));
        const dated = open
          .filter((t) => !!t.due_date)
          .slice()
          .sort((a, b) => taskSortKey(a).localeCompare(taskSortKey(b)));
        const undated = open.filter((t) => !t.due_date);
        return (
          <>
            <TaskList
              items={dated}
              categories={categories}
              projects={projects}
              editingId={editingTask?.id ?? null}
              onToggle={onToggleTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
            {undated.length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <button
                  onClick={() => setShowUndated((v) => !v)}
                  className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground hover:text-foreground"
                >
                  {showUndated ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  날짜 미정 ({undated.length})
                </button>
                {showUndated && (
                  <div className="mt-1">
                    <TaskList
                      items={undated}
                      categories={categories}
                      projects={projects}
                      editingId={editingTask?.id ?? null}
                      onToggle={onToggleTask}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                    />
                  </div>
                )}
              </div>
            )}
          </>
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
        const cats = taskCategoryIds(t)
          .map((id) => categories.find((c) => c.id === id))
          .filter((c): c is Category => !!c);
        const project = t.multiple_task_id ? projects.find((p) => p.id === t.multiple_task_id) : null;
        // A pure Product Line tag only shows up when there's no Project — a
        // Task in a Project takes its product line from there instead.
        const productLine =
          !project && t.product_line ? PRODUCT_LINES.find((l) => l.key === t.product_line) : null;
        const overdue = !completed && isOccurrenceOverdue(currentOccurrenceDate(t), completed);
        // For a recurring task this is THIS occurrence's date, not the
        // series' original anchor date — e.g. a task anchored 8/27 and
        // recurring weekly shows 10/8 once that's the live occurrence,
        // never a frozen 8/27. Undated tasks stay undated (currentOccurrenceDate
        // falls back to today for those, which isn't a real due date to show).
        const displayDate = t.due_date ? currentOccurrenceDate(t) : null;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 py-1 px-1 -mx-1 rounded-sm border-b border-border/50 group flex-wrap ${editingId === t.id ? "bg-muted" : ""}`}
            style={overdue ? { background: hexToRgba("#F87171", 0.2) } : undefined}
          >
            <button
              onClick={() => onToggle(t, currentOccurrenceDate(t))}
              aria-label="Toggle"
              className={`h-3 w-3 border border-border flex-shrink-0 ${completed ? "bg-foreground" : ""}`}
            />
            <button
              onClick={() => onEdit(t)}
              className={`text-sm flex-1 min-w-[6rem] text-left truncate hover:underline ${completed ? "line-through text-muted-foreground" : overdue ? "text-destructive font-medium" : ""}`}
              style={t.is_critical && !completed ? { background: "#FFFF00", color: "#000", padding: "0 4px", borderRadius: "2px" } : undefined}
            >
              {t.title}
              {(t.recurrence ?? "none") !== "none" && (
                <span className="ml-1 text-[10px] text-muted-foreground">↻</span>
              )}
            </button>
            {t.link_url && (
              <a
                href={t.link_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={t.link_url}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <Link2 size={11} />
              </a>
            )}
            {project && (
              <span className="text-[10px] text-muted-foreground border-b border-border max-w-[90px] truncate">
                {project.name}
              </span>
            )}
            {productLine && (
              <span
                className="text-[10px] label-caps border border-border rounded-full px-1.5 py-0.5 text-muted-foreground max-w-[90px] truncate flex-shrink-0"
                title="특정 Project 없이 이 제품 라인에 직접 소속된 공통 작업"
              >
                {productLine.label}
              </span>
            )}
            {cats.map((c) => (
              <span key={c.id} className="text-[10px] label-caps" style={{ color: c.color }}>
                {c.name}
              </span>
            ))}
            {displayDate && (
              <span className={`text-[10px] tabular-nums ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {displayDate.slice(5)} ({koDow(displayDate)})
              </span>
            )}
            {t.due_time && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {shortTimeAmPm(t.due_time)}
                {t.end_time ? `–${shortTimeAmPm(t.end_time)}` : ""}
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
