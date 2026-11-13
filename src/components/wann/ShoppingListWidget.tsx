import { useState } from "react";
import type { Task, TaskCompletion } from "@/lib/wann-data";
import {
  currentOccurrenceDate,
  isOccurrenceCompleted,
  koDow,
  shiftDate,
  shortTimeAmPm,
  taskOccursOn,
  todayLocalStr,
} from "@/lib/wann-data";
import { GripVertical, Plus, ShoppingCart, ChevronDown, ChevronRight } from "lucide-react";
import { SHOPPING_TYPES, type ShoppingType } from "./TaskForm";

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
  onBulkMoveOverdueToToday,
  dayOffsets = [-1, 0, 1],
}: {
  /** formatLocalDate(anchorDate) — same anchor the Timeline is centred on. */
  anchorKey: string;
  /** Which days to show relative to anchorKey — the Dashboard's 3-day strip
   * by default; Daily Focus passes [0] for just the viewed day. */
  dayOffsets?: number[];
  tasks: Task[];
  completions: TaskCompletion[];
  onToggle: (t: Task, occurrenceDate: string) => void;
  /** Opens the full Task editor; omit where there is none (Daily Focus) and
   * the title renders as plain text. */
  onEdit?: (t: Task) => void;
  /** Quick-add — title plus optional fulfillment type/pickup date, set via
   * the inline "detail" toggle; everything else is filled in later via
   * onEdit. */
  onAdd: (title: string, date: string, shoppingType: ShoppingType | null, pickupDate: string | null) => void;
  /** Full new top-to-bottom id order for the one day column being reordered. */
  onReorder: (orderedIds: string[]) => void;
  /** Bulk-moves every still-open, one-off Shopping item whose date has
   * already passed up to today. */
  onBulkMoveOverdueToToday: () => void;
}) {
  const todayStr = todayLocalStr();
  const dayKeys = dayOffsets.map((n) => shiftDate(anchorKey, n));

  const shopping = tasks.filter((t) => t.is_shopping && !!t.due_date);
  const overdueCount = shopping.filter(
    (t) => (t.recurrence ?? "none") === "none" && !t.completed && t.due_date! < todayStr,
  ).length;
  // Which of the 3 shown days a task occurs on — tested per day rather than
  // keyed by the task's raw due_date, so a recurring shopping item (e.g.
  // "주간 장보기" every week) keeps reappearing on its live occurrence date
  // instead of only ever matching the column for its original anchor date.
  const byDate = new Map<string, Task[]>();
  for (const date of dayKeys) byDate.set(date, []);
  for (const t of shopping) {
    for (const date of dayKeys) {
      if (taskOccursOn(t, date)) byDate.get(date)!.push(t);
    }
  }

  return (
    <section className="card-flat p-4">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <ShoppingCart size={14} />
        <p className="label-caps">Shopping List</p>
        {overdueCount > 0 && (
          <button
            onClick={() => {
              if (confirm(`날짜 지난 항목 ${overdueCount}개를 오늘 날짜로 한번에 옮길까요?`)) {
                onBulkMoveOverdueToToday();
              }
            }}
            className="ml-auto label-caps text-[10px] border border-destructive/40 text-destructive px-1.5 py-0.5 hover:bg-destructive/10"
          >
            지난 항목 {overdueCount}개 오늘로
          </button>
        )}
      </div>
      <div className={`grid grid-cols-1 gap-3 ${dayKeys.length > 1 ? "sm:grid-cols-3" : ""}`}>
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
  onEdit?: (t: Task) => void;
  onAdd: (title: string, date: string, shoppingType: ShoppingType | null, pickupDate: string | null) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [draftType, setDraftType] = useState<ShoppingType | null>(null);
  const [draftPickupDate, setDraftPickupDate] = useState("");

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    const pickupApplies = draftType === "click_collect" || draftType === "delivery";
    onAdd(title, date, draftType, pickupApplies ? draftPickupDate || null : null);
    setDraft("");
    setDraftType(null);
    setDraftPickupDate("");
    setShowDetails(false);
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

      <div className="flex items-center gap-1 mb-1">
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
        <button
          onClick={() => setShowDetails((v) => !v)}
          aria-label="상세 설정"
          title="구매 방식 / 픽업일 설정"
          className={`flex-shrink-0 ${draftType ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {draftType && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full mr-0.5 align-middle"
              style={{ background: SHOPPING_TYPES.find((s) => s.id === draftType)?.color }}
            />
          )}
          {showDetails ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
      </div>

      {showDetails && (
        <div className="flex flex-wrap items-center gap-1 mb-2 pl-4">
          <div className="flex items-center border border-border rounded-sm overflow-hidden text-[9px] label-caps">
            {SHOPPING_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  setDraftType((prev) => {
                    const next = prev === t.id ? null : t.id;
                    if (next !== "click_collect" && next !== "delivery") setDraftPickupDate("");
                    return next;
                  })
                }
                className="px-1.5 py-0.5"
                style={
                  draftType === t.id
                    ? { background: t.color, color: "#000" }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          {(draftType === "click_collect" || draftType === "delivery") && (
            <input
              type="date"
              value={draftPickupDate}
              onChange={(e) => setDraftPickupDate(e.target.value)}
              aria-label={draftType === "click_collect" ? "Pickup date" : "Delivery date"}
              className="bg-transparent outline-none text-[10px] text-muted-foreground border-b border-border py-0.5 w-[92px]"
            />
          )}
        </div>
      )}

      <div className="space-y-1">
        {items.map((t) => {
          const occ = currentOccurrenceDate(t, date);
          const done = isOccurrenceCompleted(t, occ, completions);
          const typeInfo = t.shopping_type ? SHOPPING_TYPES.find((s) => s.id === t.shopping_type) : undefined;
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
              {typeInfo && (
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: typeInfo.color }}
                  title={typeInfo.label}
                />
              )}
              {onEdit ? (
                <button
                  onClick={() => onEdit(t)}
                  className={`flex-1 min-w-0 text-left truncate hover:underline ${done ? "line-through text-muted-foreground" : ""}`}
                >
                  {t.title}
                </button>
              ) : (
                <span className={`flex-1 min-w-0 truncate ${done ? "line-through text-muted-foreground" : ""}`}>
                  {t.title}
                </span>
              )}
              {t.due_time && (
                <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                  {shortTimeAmPm(t.due_time)}
                </span>
              )}
              {t.end_date && t.end_date !== t.due_date && (
                <span
                  className="text-[9px] label-caps flex-shrink-0 px-1"
                  style={{ background: typeInfo?.color, color: "#000" }}
                  title={`${typeInfo?.label ?? ""} · ${t.due_date} → ${t.end_date}`}
                >
                  → {t.end_date.slice(5)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
