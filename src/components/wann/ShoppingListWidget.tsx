import type { Task, TaskCompletion } from "@/lib/wann-data";
import { currentOccurrenceDate, isOccurrenceCompleted, koDow, shortTime } from "@/lib/wann-data";
import { ShoppingCart } from "lucide-react";

/**
 * Every Task with `is_shopping` set, grouped by due date (soonest first),
 * shown above the Timeline. A plain flat checklist — checking an item off
 * reuses the same completion mutation as everywhere else, so it stays in
 * sync with the Task itself (Timeline, Task list, etc.).
 *
 * Hides entirely when there's nothing marked as shopping, same as every
 * other optional section in this app (no empty-state clutter).
 */
export function ShoppingListWidget({
  tasks,
  completions,
  onToggle,
  onEdit,
}: {
  tasks: Task[];
  completions: TaskCompletion[];
  onToggle: (t: Task, occurrenceDate: string) => void;
  onEdit: (t: Task) => void;
}) {
  const shopping = tasks.filter((t) => t.is_shopping);
  if (shopping.length === 0) return null;

  const byDate = new Map<string, Task[]>();
  for (const t of shopping) {
    const key = t.due_date ?? "날짜 없음";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(t);
  }
  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <section className="card-flat p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart size={14} />
        <p className="label-caps">Shopping List</p>
      </div>
      <div className="space-y-3">
        {dates.map((date) => {
          const items = byDate
            .get(date)!
            .slice()
            .sort((a, b) => (a.due_time ?? "").localeCompare(b.due_time ?? ""));
          return (
            <div key={date}>
              <p className="label-caps text-[10px] text-muted-foreground mb-1">
                {date === "날짜 없음" ? date : `${date.slice(5)} (${koDow(date)})`}
              </p>
              <div className="space-y-1">
                {items.map((t) => {
                  const occ = currentOccurrenceDate(t, date);
                  const done = isOccurrenceCompleted(t, occ, completions);
                  return (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => onToggle(t, occ)}
                        aria-label="Toggle"
                        className={`h-3 w-3 border border-border flex-shrink-0 ${done ? "bg-foreground" : ""}`}
                      />
                      <button
                        onClick={() => onEdit(t)}
                        className={`flex-1 min-w-0 text-left truncate hover:underline ${done ? "line-through text-muted-foreground" : ""}`}
                      >
                        {t.title}
                      </button>
                      {t.due_time && (
                        <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                          {shortTime(t.due_time)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
