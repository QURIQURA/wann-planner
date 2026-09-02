import { useState } from "react";
import type { Task, TaskCompletion } from "@/lib/wann-data";
import { currentOccurrenceDate, isOccurrenceCompleted, koDow, shortTime } from "@/lib/wann-data";
import { Plus, ShoppingCart } from "lucide-react";

/**
 * Every Task with `is_shopping` set, grouped by due date (soonest first),
 * shown above the Timeline. A plain flat checklist — checking an item off
 * reuses the same completion mutation as everywhere else, so it stays in
 * sync with the Task itself (Timeline, Task list, etc.).
 *
 * The quick-add box only takes a title — it creates a real Task (due today,
 * no category) that can be opened via onEdit afterwards to fill in category,
 * time, notes, etc., same as any other Task.
 */
export function ShoppingListWidget({
  tasks,
  completions,
  onToggle,
  onEdit,
  onAdd,
}: {
  tasks: Task[];
  completions: TaskCompletion[];
  onToggle: (t: Task, occurrenceDate: string) => void;
  onEdit: (t: Task) => void;
  /** Quick-add — title only; category/time/notes are filled in later via onEdit. */
  onAdd: (title: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft("");
  };

  const shopping = tasks.filter((t) => t.is_shopping);
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

      <div className="flex items-center gap-1 mb-3">
        <Plus size={12} className="text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Shopping 빠른 추가 — 카테고리·상세는 나중에 수정"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Korean/Japanese/Chinese IME: the Enter that confirms a composing
            // syllable also bubbles as a plain keydown Enter — ignore it so a
            // stray extra item isn't created from the trailing leftover text.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
          }}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm border-b border-border py-1"
        />
      </div>

      {dates.length > 0 && (
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
      )}
    </section>
  );
}
