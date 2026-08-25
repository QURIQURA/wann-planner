import type { WidgetDef } from "@/lib/widget-registry";
import { useState } from "react";
import type { Category, MultipleTask, Subtag, Task, TaskCompletion } from "@/lib/wann-data";
import { todayLocalStr, shortTime, isOccurrenceCompleted, currentOccurrenceDate, koDow, taskSortKey } from "@/lib/wann-data";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
    if (filter.categoryId && t.category_id !== filter.categoryId) return false;
    if (filter.subtagId && t.subtag_id !== filter.subtagId) return false;
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
        const open = filtered.filter(
          (t) => !isOccurrenceCompleted(t, currentOccurrenceDate(t, today), completions),
        );
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
                  {showUndated ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
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
