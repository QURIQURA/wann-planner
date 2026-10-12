import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  effectiveOccurrencesOnDate,
  eventsOnDate,
  shiftDate,
  startOfWeek,
  todayLocalStr,
  type Category,
  type EventEntry,
  type EventType,
  type RecurringException,
  type Task,
} from "@/lib/wann-data";
import { resolveEventColor } from "@/lib/wann-events";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_ITEMS = 3;

/**
 * A single Sun–Sat row lifted straight out of the Month view's grid-cell
 * style (same item list / overflow / critical-border / today-highlight
 * logic as month.tsx) — a compact "this week at a glance" that sits above
 * the Timeline on the Dashboard, paged independently with its own
 * prev/next-week arrows rather than following the Timeline's day anchor.
 */
export function WeeklyView({
  tasks,
  exceptions,
  events,
  eventTypes,
  categories,
  onSelectDate,
}: {
  tasks: Task[];
  exceptions: RecurringException[];
  events: EventEntry[];
  eventTypes: EventType[];
  categories: Category[];
  /** Jump the Dashboard's Timeline anchor to the clicked day. */
  onSelectDate: (date: string) => void;
}) {
  const today = todayLocalStr();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const catById: Record<string, Category> = {};
  for (const c of categories) catById[c.id] = c;

  const days = Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i));
  const monthLabel = (() => {
    const [y, m] = weekStart.split("-");
    return `${y}.${m}`;
  })();

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="label-caps">Weekly View</p>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart((w) => shiftDate(w, -7))}
            className="border border-border p-1.5 hover:bg-muted"
            aria-label="Previous week"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(today))}
            className="border border-border px-3 py-1 label-caps hover:bg-muted"
          >
            Today
          </button>
          <button
            onClick={() => setWeekStart((w) => shiftDate(w, 7))}
            className="border border-border p-1.5 hover:bg-muted"
            aria-label="Next week"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d, i) => (
          <div key={`h${i}`} className="label-caps text-center text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {days.map((dateStr) => {
          const occs = effectiveOccurrencesOnDate(tasks, exceptions, dateStr);
          const dayEvents = eventsOnDate(events, dateStr);
          const totalItems = occs.length + dayEvents.length;
          const isToday = dateStr === today;

          const items: Array<{ key: string; label: string; color?: string; critical?: boolean }> = [
            ...dayEvents.map((e) => ({
              key: `ev-${e.id}`,
              label: e.name,
              color: resolveEventColor(e, eventTypes),
            })),
            ...occs.map((o) => ({
              key: `t-${o.task.id}-${o.originalDate}`,
              label: o.task.title || "(제목 없음)",
              color: o.task.category_id ? catById[o.task.category_id]?.color : undefined,
              critical: !!o.task.is_critical,
            })),
          ];

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative min-h-[6rem] border p-1 text-left hover:bg-muted flex flex-col overflow-hidden ${
                isToday ? "border-foreground border-2" : "border-border"
              }`}
            >
              <span className={`text-xs flex-shrink-0 ${isToday ? "font-medium" : ""}`}>
                {Number(dateStr.slice(-2))}
              </span>
              <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                {items.slice(0, MAX_ITEMS).map((it) => (
                  <span
                    key={it.key}
                    className={`text-[9px] truncate px-1 leading-tight ${it.critical ? "border-2 border-destructive" : ""}`}
                    style={{ background: it.color ? `${it.color}80` : "var(--muted)" }}
                  >
                    {it.label}
                  </span>
                ))}
                {totalItems > MAX_ITEMS && (
                  <span className="text-[9px] text-muted-foreground">+{totalItems - MAX_ITEMS} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
