import { useMemo } from "react";
import type { Task, Category, SpecialDate } from "@/lib/wann-data";
import { formatLocalDate, shortTime } from "@/lib/wann-data";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  onToggleTask,
  onEditTask,
}: {
  anchorDate: Date;
  onAnchorChange: (d: Date) => void;
  tasks: Task[];
  categories: Category[];
  specialDates: SpecialDate[];
  onToggleTask: (t: Task) => void;
  onEditTask: (t: Task) => void;
}) {
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(anchorDate, i)), [anchorDate]);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      (map[t.due_date] ||= []).push(t);
    }
    return map;
  }, [tasks]);

  const datesByMMDD = useMemo(() => {
    const map: Record<string, SpecialDate[]> = {};
    for (const e of specialDates) {
      const mmdd = e.date.slice(5);
      (map[mmdd] ||= []).push(e);
    }
    return map;
  }, [specialDates]);

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

      {/* Today (col-span 3) + 4 narrower cards, all same height */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2 auto-rows-fr">
        {days.map((d, i) => {
          const key = formatLocalDate(d);
          const dayTasks = tasksByDay[key] ?? [];
          const allDay = dayTasks
            .filter((t) => !t.due_time)
            .sort((a, b) => a.title.localeCompare(b.title));
          const timed = dayTasks
            .filter((t) => !!t.due_time)
            .sort((a, b) => (a.due_time ?? "").localeCompare(b.due_time ?? ""));
          const specials = datesByMMDD[key.slice(5)] ?? [];
          const isToday = i === 0;
          return (
            <div
              key={key}
              className={`card-flat p-3 flex flex-col min-h-[320px] ${isToday ? "md:col-span-3" : ""}`}
            >
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
                          {pct !== null && (
                            <span className="text-muted-foreground"> · {pct}%</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {allDay.map((t) => {
                    const cat = t.category_id ? catMap[t.category_id] : undefined;
                    return (
                      <div key={t.id} className="flex items-start gap-2 group">
                        <button
                          onClick={() => onToggleTask(t)}
                          aria-label="Toggle"
                          className={`mt-1 inline-block h-3 w-3 border border-border flex-shrink-0 ${t.completed ? "bg-foreground" : ""}`}
                        />
                        <button
                          onClick={() => onEditTask(t)}
                          className={`text-sm flex-1 text-left truncate hover:underline ${t.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {t.title}
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
                  })}
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
                  {timed.map((t) => {
                    const cat = t.category_id ? catMap[t.category_id] : undefined;
                    return (
                      <div key={t.id} className="flex items-start gap-2 group">
                        <span className="text-[10px] text-muted-foreground w-10 mt-0.5 tabular-nums">
                          {shortTime(t.due_time)}
                        </span>
                        <button
                          onClick={() => onToggleTask(t)}
                          aria-label="Toggle"
                          className={`mt-1 inline-block h-3 w-3 border border-border flex-shrink-0 ${t.completed ? "bg-foreground" : ""}`}
                        />
                        <button
                          onClick={() => onEditTask(t)}
                          className={`text-sm flex-1 text-left truncate hover:underline ${t.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {t.title}
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
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
