import { useMemo } from "react";
import type { Task, Category } from "@/lib/wann-data";
import { ChevronLeft, ChevronRight } from "lucide-react";

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

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
  onToggleTask,
}: {
  anchorDate: Date;
  onAnchorChange: (d: Date) => void;
  tasks: Task[];
  categories: Category[];
  onToggleTask: (t: Task) => void;
}) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchorDate, i)), [anchorDate]);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      (map[t.due_date] ||= []).push(t);
    }
    return map;
  }, [tasks]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">This Week</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAnchorChange(addDays(anchorDate, -7))}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Previous week"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => onAnchorChange(new Date())}
            className="border border-border px-3 py-1 label-caps hover:bg-muted"
          >
            Today
          </button>
          <button
            onClick={() => onAnchorChange(addDays(anchorDate, 7))}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Next week"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map((d, i) => {
          const key = fmt(d);
          const dayTasks = tasksByDay[key] ?? [];
          const isToday = i === 0;
          return (
            <div
              key={key}
              className={`card-flat p-3 flex flex-col ${isToday ? "md:col-span-3 md:row-span-2 min-h-[280px]" : "min-h-[120px]"}`}
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
              <div className="space-y-1 flex-1">
                {dayTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">—</p>
                )}
                {dayTasks.map((t) => {
                  const cat = t.category_id ? catMap[t.category_id] : undefined;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onToggleTask(t)}
                      className="w-full text-left flex items-start gap-2 py-1 hover:bg-muted px-1 group"
                    >
                      <span
                        className={`mt-1 inline-block h-3 w-3 border border-border flex-shrink-0 ${t.completed ? "bg-foreground" : ""}`}
                      />
                      <span className={`text-sm flex-1 ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </span>
                      {cat && (
                        <span
                          className="text-[10px] px-1 border border-border label-caps"
                          style={{ color: cat.color }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
