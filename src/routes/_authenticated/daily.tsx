import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Pin, ArrowRightCircle } from "lucide-react";

import {
  effectiveOccurrencesOnDate,
  isOccurrenceCompleted,
  shortTimeAmPm,
  taskCategoryIds,
  shiftDate,
  todayLocalStr,
  koDow,
  hexToRgba,
  type Task,
  type TaskCompletion,
} from "@/lib/wann-data";
import { useWannDashboard } from "@/lib/use-wann-dashboard";
import { CategoryFilterBar } from "@/components/wann/CategoryFilterBar";
import { TaskForm, type CategoryFilter } from "@/components/wann/TaskForm";

export const Route = createFileRoute("/_authenticated/daily")({
  component: DailyFocusPage,
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date: typeof search.date === "string" ? search.date : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Daily Focus · WANN Weekly OS" },
      {
        name: "description",
        content: "Today's existing Tasks, grouped and prioritized — not a new Task store, just a daily lens on the Planner.",
      },
    ],
  }),
});

/**
 * Daily Focus — a READ/ACTION view over the existing Task table, not a new
 * storage system (user's explicit principle #3). Everything here is the same
 * `tasks`/`completions`/`multiple_tasks` data and the same mutations
 * (toggleOccurrence/moveTask/setPinnedDate/updateTask) the Dashboard and
 * Widgets pages use — ticking a box or editing a Task here shows up in
 * Project/Weekly View immediately, and vice versa.
 *
 * "Pin to Daily" = Task.pinned_date (single date, no auto-expiry/unpin —
 * 2026-11-13 user decision). Top Priorities = tasks pinned to the viewed day.
 */
function DailyFocusPage() {
  const { user } = Route.useRouteContext() as { user: { id: string } };
  const { date: dateParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [date, setDate] = useState(() => dateParam ?? todayLocalStr());

  const changeDate = (next: string) => {
    setDate(next);
    void navigate({ search: { date: next }, replace: true });
  };

  const {
    tasksQ,
    exceptionsQ,
    completionsQ,
    multipleQ,
    widgetCtx,
    toggleOccurrence,
    moveTask,
    setPinnedDate,
  } = useWannDashboard(user, { initialDate: date });

  const tasks = tasksQ.data ?? [];
  const exceptions = exceptionsQ.data ?? [];
  const completions = completionsQ.data ?? [];
  const projects = multipleQ.data ?? [];
  const today = todayLocalStr();
  const isToday = date === today;

  const [filter, setFilter] = useState<CategoryFilter>({ categoryId: null, subtagId: null });

  const occurrences = useMemo(
    () => effectiveOccurrencesOnDate(tasks, exceptions, date),
    [tasks, exceptions, date],
  );

  const filtered = occurrences.filter((o) => {
    if (filter.categoryId && !taskCategoryIds(o.task).includes(filter.categoryId)) return false;
    if (filter.subtagId && o.task.subtag_id !== filter.subtagId) return false;
    return true;
  });

  const completedCount = filtered.filter((o) => isOccurrenceCompleted(o.task, o.originalDate, completions)).length;
  const pct = filtered.length > 0 ? Math.round((completedCount / filtered.length) * 100) : 0;

  const pinned = tasks.filter((t) => t.pinned_date === date);

  const timed = filtered
    .filter((o) => !!o.effectiveTime)
    .slice()
    .sort((a, b) => (a.effectiveTime ?? "").localeCompare(b.effectiveTime ?? ""));

  // Group the rest by Project — a project's own occurrences stay grouped
  // under its name; everything without a multiple_task_id is "No project".
  const groups = useMemo(() => {
    const byProject = new Map<string, typeof filtered>();
    const solo: typeof filtered = [];
    for (const o of filtered) {
      if (o.task.multiple_task_id) {
        const arr = byProject.get(o.task.multiple_task_id) ?? [];
        arr.push(o);
        byProject.set(o.task.multiple_task_id, arr);
      } else {
        solo.push(o);
      }
    }
    return { byProject, solo };
  }, [filtered]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/" className="border border-border p-2 hover:bg-muted" aria-label="Back">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <p className="label-caps text-muted-foreground">WANN</p>
            <h1 className="text-lg font-light tracking-tight">Daily Focus</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* Date nav */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => changeDate(shiftDate(date, -1))}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Previous day"
          >
            <ChevronLeft size={14} />
          </button>
          <p className="text-lg font-light tracking-tight min-w-[12rem]">
            {date} ({koDow(date)}){isToday && <span className="ml-2 text-xs label-caps text-muted-foreground">TODAY</span>}
          </p>
          <button
            onClick={() => changeDate(shiftDate(date, 1))}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Next day"
          >
            <ChevronRight size={14} />
          </button>
          {!isToday && (
            <button
              onClick={() => changeDate(today)}
              className="ml-1 border border-border px-2 py-1 text-[10px] label-caps hover:bg-muted"
            >
              Today
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-28 border border-border bg-muted overflow-hidden">
              <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs label-caps text-muted-foreground tabular-nums">
              {completedCount}/{filtered.length} ({pct}%)
            </span>
          </div>
        </div>

        <TaskForm
          editingTask={widgetCtx.editingTask}
          onCancelEdit={widgetCtx.taskActions.onCancelEdit}
          onAddTask={widgetCtx.taskActions.onAddTask}
          onAddTaskSeries={widgetCtx.taskActions.onAddTaskSeries}
          onUpdateTask={widgetCtx.taskActions.onUpdateTask}
          onDeleteTask={widgetCtx.taskActions.onDeleteTask}
          categories={widgetCtx.categories}
          subtags={widgetCtx.subtags}
          projects={widgetCtx.projects}
          projectItems={widgetCtx.projectItems}
          stages={widgetCtx.stages}
          filter={filter}
        />

        <CategoryFilterBar
          categories={widgetCtx.categories}
          subtags={widgetCtx.subtags}
          tasks={tasks}
          filter={filter}
          setFilter={setFilter}
          onAddCategory={widgetCtx.taskActions.onAddCategory}
          onUpdateCategory={widgetCtx.taskActions.onUpdateCategory}
          onDeleteCategory={widgetCtx.taskActions.onDeleteCategory}
          onAddSubtag={widgetCtx.taskActions.onAddSubtag}
          onUpdateSubtag={widgetCtx.taskActions.onUpdateSubtag}
          onDeleteSubtag={widgetCtx.taskActions.onDeleteSubtag}
        />

        {/* Top Priorities — pinned_date === date */}
        <section className="card-flat p-4">
          <p className="label-caps mb-2">Top Priorities</p>
          {pinned.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              아직 고정된 작업이 없습니다. Tasks 목록에서 핀 아이콘으로 오늘의 우선순위를 고정하세요.
            </p>
          ) : (
            <div className="space-y-1">
              {pinned.map((t) => {
                const done = isOccurrenceCompleted(t, date, completions);
                return (
                  <OccRow
                    key={t.id}
                    task={t}
                    occurrenceDate={date}
                    done={done}
                    categories={widgetCtx.categories}
                    projects={projects}
                    onToggle={() => toggleOccurrence.mutate({ task: t, date })}
                    onEdit={() => widgetCtx.taskActions.onEditTask(t)}
                    onUnpin={() => setPinnedDate.mutate({ id: t.id, date: null })}
                    pinned
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Timed mini-timeline */}
        {timed.length > 0 && (
          <section className="card-flat p-4">
            <p className="label-caps mb-2">Timeline</p>
            <div className="space-y-1">
              {timed.map((o) => {
                const done = isOccurrenceCompleted(o.task, o.originalDate, completions);
                return (
                  <div key={`${o.task.id}-${o.originalDate}`} className="flex items-center gap-2 py-1 border-b border-border/50">
                    <span className="text-xs tabular-nums text-muted-foreground w-16 flex-shrink-0">
                      {shortTimeAmPm(o.effectiveTime)}
                    </span>
                    <OccRow
                      task={o.task}
                      occurrenceDate={o.originalDate}
                      done={done}
                      categories={widgetCtx.categories}
                      projects={projects}
                      onToggle={() => toggleOccurrence.mutate({ task: o.task, date: o.originalDate })}
                      onEdit={() => widgetCtx.taskActions.onEditTask(o.task)}
                      onPin={() => setPinnedDate.mutate({ id: o.task.id, date: o.task.pinned_date === date ? null : date })}
                      pinned={o.task.pinned_date === date}
                      bare
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Today's tasks, grouped by project + a "No project" bucket */}
        <section className="card-flat p-4 space-y-4">
          <p className="label-caps">Today</p>
          {filtered.length === 0 && <p className="text-xs text-muted-foreground italic">No tasks for this day</p>}

          {[...groups.byProject.entries()].map(([projectId, occs]) => {
            const project = projects.find((p) => p.id === projectId);
            return (
              <div key={projectId}>
                <p className="text-[10px] label-caps text-muted-foreground mb-1">{project?.name ?? "Project"}</p>
                <div className="space-y-1">
                  {occs.map((o) => (
                    <OccRowWithCarry
                      key={`${o.task.id}-${o.originalDate}`}
                      o={o}
                      date={date}
                      completions={completions}
                      categories={widgetCtx.categories}
                      projects={projects}
                      onToggle={() => toggleOccurrence.mutate({ task: o.task, date: o.originalDate })}
                      onEdit={() => widgetCtx.taskActions.onEditTask(o.task)}
                      onPin={() => setPinnedDate.mutate({ id: o.task.id, date: o.task.pinned_date === date ? null : date })}
                      onCarryOver={() =>
                        moveTask.mutate({
                          task: o.task,
                          originalDate: o.originalDate,
                          newDate: shiftDate(date, 1),
                          newTime: o.effectiveTime,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {groups.solo.length > 0 && (
            <div>
              {groups.byProject.size > 0 && <p className="text-[10px] label-caps text-muted-foreground mb-1">No project</p>}
              <div className="space-y-1">
                {groups.solo.map((o) => (
                  <OccRowWithCarry
                    key={`${o.task.id}-${o.originalDate}`}
                    o={o}
                    date={date}
                    completions={completions}
                    categories={widgetCtx.categories}
                    projects={projects}
                    onToggle={() => toggleOccurrence.mutate({ task: o.task, date: o.originalDate })}
                    onEdit={() => widgetCtx.taskActions.onEditTask(o.task)}
                    onPin={() => setPinnedDate.mutate({ id: o.task.id, date: o.task.pinned_date === date ? null : date })}
                    onCarryOver={() =>
                      moveTask.mutate({
                        task: o.task,
                        originalDate: o.originalDate,
                        newDate: shiftDate(date, 1),
                        newTime: o.effectiveTime,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/** One occurrence row — checkbox / title / category chips / pin. Shared by
 * Top Priorities and Timeline (which don't need the carry-over action). */
function OccRow({
  task,
  occurrenceDate,
  done,
  categories,
  projects,
  onToggle,
  onEdit,
  onPin,
  onUnpin,
  pinned,
  bare = false,
}: {
  task: Task;
  occurrenceDate: string;
  done: boolean;
  categories: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  onToggle: () => void;
  onEdit: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  pinned?: boolean;
  bare?: boolean;
}) {
  const cats = taskCategoryIds(task)
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is { id: string; name: string } => !!c);
  const project = task.multiple_task_id ? projects.find((p) => p.id === task.multiple_task_id) : null;
  return (
    <div className={`flex items-center gap-2 py-1 ${bare ? "" : "px-1 -mx-1 border-b border-border/50"} group flex-wrap`}>
      <button
        onClick={onToggle}
        aria-label="Toggle"
        className={`h-3 w-3 border border-border flex-shrink-0 ${done ? "bg-foreground" : ""}`}
      />
      <button
        onClick={onEdit}
        className={`text-sm flex-1 min-w-[6rem] text-left truncate hover:underline ${done ? "line-through text-muted-foreground" : ""}`}
      >
        {task.title}
      </button>
      {!bare && project && (
        <span className="text-[10px] text-muted-foreground border-b border-border max-w-[90px] truncate">{project.name}</span>
      )}
      {cats.map((c) => (
        <span key={c.id} className="text-[10px] px-1 label-caps bg-foreground text-background flex-shrink-0">
          {c.name}
        </span>
      ))}
      {(onPin || onUnpin) && (
        <button
          onClick={onUnpin ?? onPin}
          aria-label={pinned ? "Unpin" : "Pin to Daily"}
          className={`flex-shrink-0 ${pinned ? "text-foreground" : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"}`}
        >
          <Pin size={12} fill={pinned ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}

/** OccRow + a "carry over to tomorrow" action, shown only for incomplete items. */
function OccRowWithCarry({
  o,
  date,
  completions,
  categories,
  projects,
  onToggle,
  onEdit,
  onPin,
  onCarryOver,
}: {
  o: { task: Task; originalDate: string; effectiveTime: string | null };
  date: string;
  completions: TaskCompletion[];
  categories: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  onToggle: () => void;
  onEdit: () => void;
  onPin: () => void;
  onCarryOver: () => void;
}) {
  const done = isOccurrenceCompleted(o.task, o.originalDate, completions);
  const overdue = !done && o.originalDate < date;
  return (
    <div
      className="flex items-center gap-1"
      style={overdue ? { background: hexToRgba("#F87171", 0.2) } : undefined}
    >
      <div className="flex-1 min-w-0">
        <OccRow
          task={o.task}
          occurrenceDate={o.originalDate}
          done={done}
          categories={categories}
          projects={projects}
          onToggle={onToggle}
          onEdit={onEdit}
          onPin={onPin}
          pinned={o.task.pinned_date === date}
        />
      </div>
      {!done && (
        <button
          onClick={onCarryOver}
          aria-label="Carry over to tomorrow"
          title="내일로 넘기기"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 p-1"
        >
          <ArrowRightCircle size={13} />
        </button>
      )}
    </div>
  );
}
