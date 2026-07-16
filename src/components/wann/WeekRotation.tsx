import { useMemo, useRef, useState } from "react";
import type { Task, Category, SpecialDate, TaskCompletion } from "@/lib/wann-data";
import { formatLocalDate, shortTime, tasksOnDate, isOccurrenceCompleted } from "@/lib/wann-data";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function WeekRotation({
  anchorDate,
  onAnchorChange,
  tasks,
  categories,
  specialDates,
  completions,
  onToggleOccurrence,
  onEditTask,
}: {
  anchorDate: Date;
  onAnchorChange: (d: Date) => void;
  tasks: Task[];
  categories: Category[];
  specialDates: SpecialDate[];
  completions: TaskCompletion[];
  onToggleOccurrence: (task: Task, date: string) => void;
  onEditTask: (t: Task) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(anchorDate, i)),
    [anchorDate],
  );
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const datesByMMDD = useMemo(() => {
    const map: Record<string, SpecialDate[]> = {};
    for (const e of specialDates) {
      const mmdd = e.date.slice(5);
      (map[mmdd] ||= []).push(e);
    }
    return map;
  }, [specialDates]);

  // touch swipe state (mobile only)
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      onAnchorChange(addDays(anchorDate, dx < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  };

  const renderDayCard = (d: Date, isToday: boolean, extraClass = "") => {
    const key = formatLocalDate(d);
    const dayTasks = tasksOnDate(tasks, key);
    const allDay = dayTasks
      .filter((t) => !t.due_time)
      .sort((a, b) => a.title.localeCompare(b.title));
    const timed = dayTasks
      .filter((t) => !!t.due_time)
      .sort((a, b) => (a.due_time ?? "").localeCompare(b.due_time ?? ""));
    const specials = datesByMMDD[key.slice(5)] ?? [];
    return (
      <div key={key} className={`card-flat p-3 flex flex-col min-h-[320px] ${extraClass}`}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="label-caps">
            {isToday ? "Today · " : ""}
            {DOW[d.getDay()]}
          </span>
          <span className="text-xs text-muted-foreground">
            {d.getMonth() + 1}/{d.getDate()}
          </span>
        </div>

        {/* ALL-DAY */}
        <div className="mb-2">
          <p className="label-caps text-[10px] text-muted-foreground mb-1">All-day</p>
          <div className="space-y-1">
            {specials.map((s) => {
              const linked = tasks.filter((t) => t.special_occasion_id === s.id);
              const done = linked.filter((t) => t.completed).length;
              const pct = linked.length > 0 ? Math.round((done / linked.length) * 100) : null;
              return (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-3 w-3 border border-border flex-shrink-0" />
                  <span className="flex-1 truncate">
                    {s.name}
                    <span className="text-muted-foreground"> · {s.type}</span>
                    {pct !== null && <span className="text-muted-foreground"> · {pct}%</span>}
                  </span>
                </div>
              );
            })}
            <TaskLines
              items={allDay}
              date={key}
              completions={completions}
              catMap={catMap}
              onToggle={onToggleOccurrence}
              onEdit={onEditTask}
            />
            {specials.length === 0 && allDay.length === 0 && (
              <p className="text-xs text-muted-foreground italic">—</p>
            )}
          </div>
        </div>

        {/* TIMELINE */}
        <div className="border-t border-border pt-2 flex-1">
          <p className="label-caps text-[10px] text-muted-foreground mb-1">Timeline</p>
          <div className="space-y-1">
            {timed.length === 0 && (
              <p className="text-xs text-muted-foreground italic">—</p>
            )}
            <TaskLines
              items={timed}
              date={key}
              completions={completions}
              catMap={catMap}
              onToggle={onToggleOccurrence}
              onEdit={onEditTask}
              showTime
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">This Week</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAnchorChange(addDays(anchorDate, -1))}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Previous day"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              onAnchorChange(d);
            }}
            className="border border-border px-3 py-1 label-caps hover:bg-muted"
          >
            Today
          </button>
          <button
            onClick={() => onAnchorChange(addDays(anchorDate, 1))}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Next day"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* MOBILE: single-day card with swipe */}
      <div
        className="md:hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {renderDayCard(anchorDate, true, "")}
      </div>

      {/* DESKTOP: 5-day grid, today spans 3 cols */}
      <div className="hidden md:grid md:grid-cols-7 gap-2 auto-rows-fr">
        {days.map((d, i) => renderDayCard(d, i === 0, i === 0 ? "md:col-span-3" : ""))}
      </div>
    </div>
  );
}

function TaskLines({
  items,
  date,
  completions,
  catMap,
  onToggle,
  onEdit,
  showTime = false,
}: {
  items: Task[];
  date: string;
  completions: TaskCompletion[];
  catMap: Record<string, Category>;
  onToggle: (task: Task, date: string) => void;
  onEdit: (t: Task) => void;
  showTime?: boolean;
}) {
  const [showDone, setShowDone] = useState(false);
  const active = items.filter((t) => !isOccurrenceCompleted(t, date, completions));
  const done = items.filter((t) => isOccurrenceCompleted(t, date, completions));

  const render = (t: Task, completed: boolean) => {
    const cat = t.category_id ? catMap[t.category_id] : undefined;
    return (
      <div key={t.id} className="flex items-start gap-2 group">
        {showTime && (
          <span className="text-[10px] text-muted-foreground w-10 mt-0.5 tabular-nums">
            {shortTime(t.due_time)}
          </span>
        )}
        <button
          onClick={() => onToggle(t, date)}
          aria-label="Toggle"
          className={`mt-1 inline-block h-3 w-3 border border-border flex-shrink-0 ${completed ? "bg-foreground" : ""}`}
        />
        <button
          onClick={() => onEdit(t)}
          className={`text-sm flex-1 text-left truncate hover:underline ${completed ? "line-through text-muted-foreground" : ""}`}
        >
          {t.title}
          {(t.recurrence ?? "none") !== "none" && (
            <span className="ml-1 text-[10px] text-muted-foreground">↻</span>
          )}
        </button>
        {cat && (
          <span
            className="text-[10px] px-1 border border-border label-caps"
            style={{ color: cat.color }}
          >
            {cat.name}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      {active.map((t) => render(t, false))}
      {done.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground hover:text-foreground"
          >
            {showDone ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Completed ({done.length})
          </button>
          {showDone && <div className="mt-1 space-y-1">{done.map((t) => render(t, true))}</div>}
        </div>
      )}
    </>
  );
}
