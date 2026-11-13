import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Pin, ArrowRightCircle, GripVertical } from "lucide-react";

import {
  effectiveOccurrencesOnDate,
  isOccurrenceCompleted,
  shortTimeAmPm,
  taskCategoryIds,
  shiftDate,
  todayLocalStr,
  formatLocalDate,
  koDow,
  hexToRgba,
  timeToMinutes,
  minutesToTime,
  occurrenceEndTime,
  type Task,
  type TaskCompletion,
  type Category,
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
    reorderPinned,
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

  // Pinned ("Top Priorities") — sorted by the user's own drag order, not by
  // date. Rendered at the top of the Today box itself (2026-11-13: user
  // asked NOT to keep this as a separate box), so build a Set to keep the
  // rest of Today's lists from also showing these same tasks twice.
  const pinned = tasks
    .filter((t) => t.pinned_date === date)
    .slice()
    .sort((a, b) => a.pinned_order - b.pinned_order);
  const pinnedIds = new Set(pinned.map((t) => t.id));

  const timed = filtered
    .filter((o) => !!o.effectiveTime)
    .slice()
    .sort((a, b) => (a.effectiveTime ?? "").localeCompare(b.effectiveTime ?? ""));

  // Group the rest (minus anything already shown pinned) by Project — a
  // project's own occurrences stay grouped under its name; everything
  // without a multiple_task_id is "No project".
  const groups = (() => {
    const byProject = new Map<string, typeof filtered>();
    const solo: typeof filtered = [];
    for (const o of filtered) {
      if (pinnedIds.has(o.task.id)) continue;
      if (o.task.multiple_task_id) {
        const arr = byProject.get(o.task.multiple_task_id) ?? [];
        arr.push(o);
        byProject.set(o.task.multiple_task_id, arr);
      } else {
        solo.push(o);
      }
    }
    return { byProject, solo };
  })();

  // "오늘 추가된 작업" — tasks created on the viewed date whose due_date
  // doesn't fall on it (so they'd otherwise never surface here), e.g. a
  // Task jotted down today but dated for later or left undated.
  const addedToday = tasks.filter((t) => {
    if (pinnedIds.has(t.id)) return false;
    if (filtered.some((o) => o.task.id === t.id)) return false;
    if (filter.categoryId && !taskCategoryIds(t).includes(filter.categoryId)) return false;
    if (filter.subtagId && t.subtag_id !== filter.subtagId) return false;
    return !!t.created_at && formatLocalDate(new Date(t.created_at)) === date;
  });

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

        {/* Timed items as a horizontal hour-axis timeline (matching the
            PILOT Daily Focus mockup) instead of a plain time-sorted list. */}
        {timed.length > 0 && (
          <section className="card-flat p-4">
            <p className="label-caps mb-2">Timeline</p>
            <DailyTimelineBar
              items={timed}
              categories={widgetCtx.categories}
              onEdit={(t) => widgetCtx.taskActions.onEditTask(t)}
            />
          </section>
        )}

        {/* Today's tasks — pinned Top Priorities first (manually reorderable),
            then grouped by project + a "No project" bucket, then anything
            added today but dated elsewhere. */}
        <section className="card-flat p-4 space-y-4">
          <p className="label-caps">Today</p>
          {filtered.length === 0 && pinned.length === 0 && addedToday.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No tasks for this day</p>
          )}

          {pinned.length > 0 && (
            <PinnedList
              items={pinned}
              date={date}
              completions={completions}
              categories={widgetCtx.categories}
              projects={projects}
              onToggle={(t) => toggleOccurrence.mutate({ task: t, date })}
              onEdit={(t) => widgetCtx.taskActions.onEditTask(t)}
              onUnpin={(t) => setPinnedDate.mutate({ id: t.id, date: null })}
              onReorder={(ids) => reorderPinned.mutate(ids)}
            />
          )}

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

          {addedToday.length > 0 && (
            <div>
              <p className="text-[10px] label-caps text-muted-foreground mb-1">오늘 추가된 작업</p>
              <div className="space-y-1">
                {addedToday.map((t) => {
                  const occ = t.due_date ?? date;
                  const done = isOccurrenceCompleted(t, occ, completions);
                  return (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <OccRow
                          task={t}
                          occurrenceDate={occ}
                          done={done}
                          categories={widgetCtx.categories}
                          projects={projects}
                          onToggle={() => toggleOccurrence.mutate({ task: t, date: occ })}
                          onEdit={() => widgetCtx.taskActions.onEditTask(t)}
                          onPin={() => setPinnedDate.mutate({ id: t.id, date: t.pinned_date === date ? null : date })}
                          pinned={t.pinned_date === date}
                        />
                      </div>
                      {t.due_date && (
                        <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                          {t.due_date.slice(5)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/** The pinned ("Top Priorities") list, drag-reorderable among itself — same
 * plain HTML5 drag pattern as the Shopping List widget's day columns. */
function PinnedList({
  items,
  date,
  completions,
  categories,
  projects,
  onToggle,
  onEdit,
  onUnpin,
  onReorder,
}: {
  items: Task[];
  date: string;
  completions: TaskCompletion[];
  categories: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onUnpin: (t: Task) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const ids = items.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from !== -1 && to !== -1) {
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      onReorder(ids);
    }
    setDragId(null);
    setOverId(null);
  };

  return (
    <div>
      <p className="text-[10px] label-caps text-muted-foreground mb-1">Top Priorities</p>
      <div className="space-y-1">
        {items.map((t) => {
          const done = isOccurrenceCompleted(t, date, completions);
          return (
            <div
              key={t.id}
              draggable
              onDragStart={() => setDragId(t.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (overId !== t.id) setOverId(t.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(t.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              className={`flex items-center gap-1 ${
                overId === t.id && dragId && dragId !== t.id ? "border-t-2 border-foreground" : ""
              } ${dragId === t.id ? "opacity-40" : ""}`}
            >
              <GripVertical size={11} className="text-muted-foreground flex-shrink-0 cursor-grab" />
              <div className="flex-1 min-w-0">
                <OccRow
                  task={t}
                  occurrenceDate={date}
                  done={done}
                  categories={categories}
                  projects={projects}
                  onToggle={() => onToggle(t)}
                  onEdit={() => onEdit(t)}
                  onUnpin={() => onUnpin(t)}
                  pinned
                />
              </div>
            </div>
          );
        })}
      </div>
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

/** Horizontal hour-axis timeline — hour marks across the top, each timed
 * occurrence drawn as a bar positioned/sized by its start–end time, tinted
 * by its category colour (a plain pale fill when it has none). Matches the
 * PILOT Daily Focus mockup's timeline strip rather than a vertical list. */
function DailyTimelineBar({
  items,
  categories,
  onEdit,
}: {
  items: { task: Task; originalDate: string; effectiveTime: string | null }[];
  categories: Category[];
  onEdit: (t: Task) => void;
}) {
  const blocks = items
    .map((o) => {
      const start = timeToMinutes(o.effectiveTime);
      if (start == null) return null;
      const endStr = occurrenceEndTime(o.task, o.effectiveTime);
      const end = endStr ? (timeToMinutes(endStr) ?? start + 60) : start + 60;
      return { o, start, end: Math.max(end, start + 15) };
    })
    .filter((b): b is { o: (typeof items)[number]; start: number; end: number } => b != null);

  if (blocks.length === 0) return null;

  // Window: the data's own span, floored/ceiled to the hour, padded an hour
  // either side, with a sane minimum width so a single short task doesn't
  // render as one giant bar.
  const dataStart = Math.min(...blocks.map((b) => b.start));
  const dataEnd = Math.max(...blocks.map((b) => b.end));
  const windowStart = Math.max(0, Math.floor(dataStart / 60) * 60 - 60);
  const windowEnd = Math.min(24 * 60, Math.max(Math.ceil(dataEnd / 60) * 60 + 60, windowStart + 4 * 60));
  const span = windowEnd - windowStart;

  const hourMarks: number[] = [];
  for (let m = Math.ceil(windowStart / 60) * 60; m <= windowEnd; m += 60) hourMarks.push(m);

  const DEFAULT_COLOR = "#F87171";

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[640px]" style={{ height: "4.5rem" }}>
        {/* Hour marks */}
        <div className="absolute inset-x-0 top-0 h-5 border-b border-border">
          {hourMarks.map((m) => (
            <span
              key={m}
              className="absolute top-0 text-[10px] tabular-nums text-muted-foreground -translate-x-1/2"
              style={{ left: `${((m - windowStart) / span) * 100}%` }}
            >
              {minutesToTime(m)}
            </span>
          ))}
        </div>
        {/* Hour gridlines */}
        <div className="absolute inset-x-0 top-5 bottom-0">
          {hourMarks.map((m) => (
            <div
              key={m}
              className="absolute top-0 bottom-0 border-l border-border/40"
              style={{ left: `${((m - windowStart) / span) * 100}%` }}
            />
          ))}
        </div>
        {/* Bars */}
        <div className="absolute inset-x-0 top-7 h-9">
          {blocks.map(({ o, start, end }) => {
            const color = o.task.category_id
              ? (categories.find((c) => c.id === o.task.category_id)?.color ?? DEFAULT_COLOR)
              : DEFAULT_COLOR;
            const left = ((start - windowStart) / span) * 100;
            const width = ((end - start) / span) * 100;
            return (
              <button
                key={`${o.task.id}-${o.originalDate}`}
                onClick={() => onEdit(o.task)}
                title={`${shortTimeAmPm(o.effectiveTime)} — ${o.task.title}`}
                className="absolute top-0 h-full flex items-center justify-center px-2 text-xs truncate hover:brightness-95"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 2)}%`,
                  background: hexToRgba(color, 0.22),
                  borderLeft: `2px solid ${color}`,
                }}
              >
                <span className="truncate">{o.task.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
