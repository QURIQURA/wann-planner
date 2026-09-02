import { useState } from "react";
import type { Task, TaskCompletion } from "@/lib/wann-data";
import {
  currentOccurrenceDate,
  isOccurrenceCompleted,
  koDow,
  shiftDate,
  shortTime,
  todayLocalStr,
} from "@/lib/wann-data";
import { GripVertical, Plus, ShoppingCart } from "lucide-react";

/**
 * Mirrors the Timeline's own Yesterday/Today/Tomorrow 3-column layout and
 * moves with the same anchor date — a day's items don't vanish forever once
 * that day passes, they're simply off to the side until you page back to
 * them, exactly like the Timeline cards.
 *
 * Drag to reorder within a column (native HTML5 DnD — a plain per-day list
 * doesn't need @dnd-kit's cross-column machinery); the new order is
 * persisted to each Task's `shopping_order`.
 */
export function ShoppingListWidget({
  anchorKey,
  tasks,
  completions,
  onToggle,
  onEdit,
  onAdd,
  onReorder,
}: {
  /** formatLocalDate(anchorDate) — same anchor the Timeline is centred on. */
  anchorKey: string;
  tasks: Task[];
  completions: TaskCompletion[];
  onToggle: (t: Task, occurrenceDate: string) => void;
  onEdit: (t: Task) => void;
  /** Quick-add — title only; category/time/notes are filled in later via onEdit. */
  onAdd: (title: string, date: string) => void;
  /** Full new top-to-bottom id order for the one day column being reordered. */
  onReorder: (orderedIds: string[]) => void;
}) {
  const todayStr = todayLocalStr();
  const dayKeys = [-1, 0, 1].map((n) => shiftDate(anchorKey, n));

  const shopping = tasks.filter((t) => t.is_shopping);
  const byDate = new Map<string, Task[]>();
  for (const t of shopping) {
    const key = t.due_date ?? "";
    if (!key) continue;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(t);
  }

  return (
    <section className="card-flat p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart size={14} />
        <p className="label-caps">Shopping List</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {dayKeys.map((date) => (
          <ShoppingDayColumn
            key={date}
            date={date}
            isToday={date === todayStr}
            items={(byDate.get(date) ?? []).slice().sort((a, b) => {
              const so = (a.shopping_order ?? 0) - (b.shopping_order ?? 0);
              if (so !== 0) return so;
              return (
                (a.due_time ?? "").localeCompare(b.due_time ?? "") ||
                a.created_at.localeCompare(b.created_at)
              );
            })}
            completions={completions}
            onToggle={onToggle}
            onEdit={onEdit}
            onAdd={onAdd}
            onReorder={onReorder}
          />
        ))}
      </div>
    </section>
  );
}

function ShoppingDayColumn({
  date,
  isToday,
  items,
  completions,
  onToggle,
  onEdit,
  onAdd,
  onReorder,
}: {
  date: string;
  isToday: boolean;
  items: Task[];
  completions: TaskCompletion[];
  onToggle: (t: Task, occurrenceDate: string) => void;
  onEdit: (t: Task) => void;
  onAdd: (title: string, date: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title, date);
    setDraft("");
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const ids = items.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDragId(null);
      setOverId(null);
      return;
    }
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="label-caps text-[10px]">
          {isToday ? "Today · " : ""}
          {koDow(date)}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{date.slice(5)}</span>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <Plus size={11} className="text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="빠른 추가"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Korean/Japanese/Chinese IME: the Enter that confirms a composing
            // syllable also bubbles as a plain keydown Enter — ignore it so a
            // stray extra item isn't created from the trailing leftover text.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
          }}
          className="flex-1 min-w-0 bg-transparent outline-none text-xs border-b border-border py-0.5"
        />
      </div>

      <div className="space-y-1">
        {items.map((t) => {
          const occ = currentOccurrenceDate(t, date);
          const done = isOccurrenceCompleted(t, occ, completions);
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
              className={`flex items-center gap-1.5 text-sm rounded-sm ${
                overId === t.id && dragId && dragId !== t.id ? "border-t-2 border-foreground" : ""
              } ${dragId === t.id ? "opacity-40" : ""}`}
            >
              <GripVertical size={11} className="text-muted-foreground flex-shrink-0 cursor-grab" />
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
}
