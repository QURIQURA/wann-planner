import { useState } from "react";
import type { Task, TaskCompletion } from "@/lib/wann-data";
import { currentOccurrenceDate, isOccurrenceCompleted, shortTime, todayLocalStr } from "@/lib/wann-data";
import { GripVertical, Plus, ShoppingCart } from "lucide-react";

/**
 * A "daily" box, like the Timeline: only shows Tasks with `is_shopping` due
 * *today*. Nothing is ever deleted to make an item go away — a day's items
 * simply stop showing once due_date is no longer today, the same way the
 * Timeline's own "Today" card moves forward on its own every day.
 *
 * Drag to reorder (native HTML5 DnD — a plain list within one day doesn't
 * need @dnd-kit's cross-column machinery); the new order is persisted to
 * each Task's `shopping_order`.
 */
export function ShoppingListWidget({
  tasks,
  completions,
  onToggle,
  onEdit,
  onAdd,
  onReorder,
}: {
  tasks: Task[];
  completions: TaskCompletion[];
  onToggle: (t: Task, occurrenceDate: string) => void;
  onEdit: (t: Task) => void;
  /** Quick-add — title only; category/time/notes are filled in later via onEdit. */
  onAdd: (title: string) => void;
  /** Full new top-to-bottom id order after a drag-reorder. */
  onReorder: (orderedIds: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft("");
  };

  const today = todayLocalStr();
  const items = tasks
    .filter((t) => t.is_shopping && t.due_date === today)
    .slice()
    .sort((a, b) => {
      const so = (a.shopping_order ?? 0) - (b.shopping_order ?? 0);
      if (so !== 0) return so;
      return (a.due_time ?? "").localeCompare(b.due_time ?? "") || a.created_at.localeCompare(b.created_at);
    });

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

      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((t) => {
            const occ = currentOccurrenceDate(t, today);
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
                className={`flex items-center gap-2 text-sm rounded-sm ${
                  overId === t.id && dragId && dragId !== t.id ? "border-t-2 border-foreground" : ""
                } ${dragId === t.id ? "opacity-40" : ""}`}
              >
                <GripVertical size={12} className="text-muted-foreground flex-shrink-0 cursor-grab" />
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
      )}
    </section>
  );
}
