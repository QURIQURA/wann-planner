import { useMemo, useRef, useState } from "react";
import type {
  Task,
  Category,
  EventEntry,
  TaskCompletion,
  MultipleTask,
  MultipleTaskItem,
  RecurringException,
  EffectiveOccurrence,
} from "@/lib/wann-data";
import {
  formatLocalDate,
  todayLocalStr,
  shortTime,
  effectiveOccurrencesOnDate,
  isOccurrenceCompleted,
  eventsOnDate,
  EVENT_COLORS,
  EVENT_PRIORITY,
  occurrenceEndTime,
  hexToRgba,
  taskDurationMin,
  timeToMinutes,
  minutesToTime,
} from "@/lib/wann-data";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ListChecks, GripVertical } from "lucide-react";

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Time grid config
const START_HOUR = 6;
const END_HOUR = 24;
const SLOT_MIN = 30;
const SLOT_HEIGHT = 20; // px per 30-min slot
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN;

function slotIndexFromTime(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  const total = (h - START_HOUR) * 60 + (m || 0);
  return Math.max(0, Math.min(SLOT_COUNT - 1, Math.round(total / SLOT_MIN)));
}
function timeFromSlotIndex(idx: number): string {
  const total = idx * SLOT_MIN;
  const h = START_HOUR + Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type MoveTaskArgs = {
  task: Task;
  originalDate: string;
  newDate: string;
  newTime: string | null; // null = keep original time
};

export function WeekRotation({
  anchorDate,
  onAnchorChange,
  tasks,
  categories,
  events,
  completions,
  exceptions,
  multipleTasks,
  multipleTaskItems,
  onOpenMultiple,
  onToggleOccurrence,
  onEditTask,
  onMoveTask,
}: {
  anchorDate: Date;
  onAnchorChange: (d: Date) => void;
  tasks: Task[];
  categories: Category[];
  events: EventEntry[];
  completions: TaskCompletion[];
  exceptions: RecurringException[];
  multipleTasks: MultipleTask[];
  multipleTaskItems: MultipleTaskItem[];
  onOpenMultiple: (id: string) => void;
  onToggleOccurrence: (task: Task, date: string) => void;
  onEditTask: (t: Task) => void;
  onMoveTask: (args: MoveTaskArgs) => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(anchorDate, i)),
    [anchorDate],
  );
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );
  const projMap = useMemo(
    () => Object.fromEntries(multipleTasks.map((m) => [m.id, m.name])),
    [multipleTasks],
  );

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const [dragging, setDragging] = useState<null | {
    taskId: string;
    originalDate: string;
    title: string;
  }>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current as { taskId: string; originalDate: string; title: string } | undefined;
    if (d) setDragging(d);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const src = e.active.data.current as
      | { taskId: string; originalDate: string; title: string }
      | undefined;
    const overId = e.over?.id;
    if (!src || !overId) return;
    const task = tasks.find((t) => t.id === src.taskId);
    if (!task) return;
    const overStr = String(overId);
    if (overStr.startsWith("slot|")) {
      const [, date, slotStr] = overStr.split("|");
      const newTime = timeFromSlotIndex(Number(slotStr));
      if (date === src.originalDate && newTime === (task.due_time?.slice(0, 5) ?? "")) return;
      onMoveTask({ task, originalDate: src.originalDate, newDate: date, newTime });
    } else if (overStr.startsWith("day|")) {
      const [, date] = overStr.split("|");
      if (date === src.originalDate) return;
      onMoveTask({ task, originalDate: src.originalDate, newDate: date, newTime: null });
    }
  };

  const todayStr = todayLocalStr();
  const dayKeys = days.map((d) => formatLocalDate(d));
  const anchorKey = formatLocalDate(anchorDate);
  // TODAY is "active" only when the real today is inside what we're looking at.
  const todayInRange = dayKeys.includes(todayStr);
  const todayInMobileView = anchorKey === todayStr;

  const renderDayCard = (d: Date, _unused: boolean, extraClass = "") => {
    const key = formatLocalDate(d);
    const isToday = key === todayStr;
    const occurrences = effectiveOccurrencesOnDate(tasks, exceptions, key);
    const allDay = occurrences
      .filter((o) => !o.effectiveTime)
      .sort((a, b) => a.task.title.localeCompare(b.task.title));
    const timed = occurrences
      .filter((o) => !!o.effectiveTime)
      .sort((a, b) => (a.effectiveTime ?? "").localeCompare(b.effectiveTime ?? ""));
    const dayEvents = eventsOnDate(events, key);
    const dayMultiples = multipleTasks.filter((m) => m.date === key);
    const primaryType = EVENT_PRIORITY.find((t) => dayEvents.some((e) => e.type === t));
    const borderColor = primaryType ? EVENT_COLORS[primaryType] : undefined;

    const cardStyle = borderColor ? { borderColor, borderWidth: 2 } : undefined;

    return (
      <DayCard
        key={key}
        dateKey={key}
        isToday={isToday}
        extraClass={extraClass}
        cardStyle={cardStyle}
        dow={DOW[d.getDay()]}
        month={d.getMonth() + 1}
        dom={d.getDate()}
        allDay={allDay}
        timed={timed}
        dayEvents={dayEvents}
        dayMultiples={dayMultiples}
        multipleTaskItems={multipleTaskItems}
        completions={completions}
        catMap={catMap}
        projMap={projMap}
        onToggle={onToggleOccurrence}
        onEdit={onEditTask}
        onOpenMultiple={onOpenMultiple}
        isDragging={!!dragging}
      />
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
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
              aria-pressed={todayInRange}
              className={`border border-border px-3 py-1 label-caps ${
                todayInRange ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
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

        <div className="md:hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {renderDayCard(anchorDate, todayInMobileView, "")}
        </div>

        <div className="hidden md:grid md:grid-cols-7 gap-2 auto-rows-fr">
          {days.map((d, i) => renderDayCard(d, false, i === 0 ? "md:col-span-3" : ""))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="px-2 py-1 text-xs bg-background border border-foreground shadow-sm truncate max-w-[220px]">
            {dragging.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DayCard({
  dateKey,
  isToday,
  extraClass,
  cardStyle,
  dow,
  month,
  dom,
  allDay,
  timed,
  dayEvents,
  dayMultiples,
  multipleTaskItems,
  completions,
  catMap,
  projMap,
  onToggle,
  onEdit,
  onOpenMultiple,
  isDragging,
}: {
  dateKey: string;
  isToday: boolean;
  extraClass: string;
  cardStyle?: React.CSSProperties;
  dow: string;
  month: number;
  dom: number;
  allDay: EffectiveOccurrence[];
  timed: EffectiveOccurrence[];
  dayEvents: EventEntry[];
  dayMultiples: MultipleTask[];
  multipleTaskItems: MultipleTaskItem[];
  completions: TaskCompletion[];
  catMap: Record<string, Category>;
  projMap: Record<string, string>;
  onToggle: (task: Task, date: string) => void;
  onEdit: (t: Task) => void;
  onOpenMultiple: (id: string) => void;
  isDragging: boolean;
}) {
  const { isOver: dayIsOver, setNodeRef: dayRef } = useDroppable({
    id: `day|${dateKey}`,
    data: { kind: "day", date: dateKey },
  });

  return (
    <div
      ref={dayRef}
      className={`card-flat p-3 flex flex-col min-h-[320px] ${extraClass} ${dayIsOver ? "ring-2 ring-foreground" : ""}`}
      style={cardStyle}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="label-caps">
          {isToday ? "Today · " : ""}
          {dow}
        </span>
        <span className="text-xs text-muted-foreground">
          {month}/{dom}
        </span>
      </div>

      <div className="mb-2">
        <p className="label-caps text-[10px] text-muted-foreground mb-1">All-day</p>
        <div className="space-y-1">
          {dayEvents.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 flex-shrink-0"
                style={{ background: EVENT_COLORS[ev.type] ?? "transparent" }}
              />
              <span className="flex-1 truncate">
                {ev.name}
                <span className="text-muted-foreground"> · {ev.type}</span>
              </span>
            </div>
          ))}
          {dayMultiples.map((m) => {
            const children = multipleTaskItems.filter((i) => i.multiple_task_id === m.id);
            const done = children.filter((i) => i.completed).length;
            const total = children.length;
            return (
              <button
                key={m.id}
                onClick={() => onOpenMultiple(m.id)}
                className="flex items-center gap-2 text-sm w-full text-left hover:underline"
                title="Open in Multiple Task"
              >
                <ListChecks size={12} className="flex-shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">
                  {m.name}
                  {total > 0 && (
                    <span className="text-muted-foreground"> · {done}/{total}</span>
                  )}
                </span>
              </button>
            );
          })}
          <TaskLines
            items={allDay}
            date={dateKey}
            completions={completions}
            catMap={catMap}
            projMap={projMap}
            onToggle={onToggle}
            onEdit={onEdit}
          />
          {dayEvents.length === 0 && allDay.length === 0 && dayMultiples.length === 0 && (
            <p className="text-xs text-muted-foreground italic">—</p>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-2 flex-1">
        <p className="label-caps text-[10px] text-muted-foreground mb-1">Timeline</p>
        <TimelineGrid
          dateKey={dateKey}
          timed={timed}
          completions={completions}
          catMap={catMap}
          projMap={projMap}
          onToggle={onToggle}
          onEdit={onEdit}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}

function TimelineGrid({
  dateKey,
  timed,
  completions,
  catMap,
  projMap,
  onToggle,
  onEdit,
  isDragging,
}: {
  dateKey: string;
  timed: EffectiveOccurrence[];
  completions: TaskCompletion[];
  catMap: Record<string, Category>;
  projMap: Record<string, string>;
  onToggle: (task: Task, date: string) => void;
  onEdit: (t: Task) => void;
  isDragging: boolean;
}) {
  return (
    <div
      className="relative"
      style={{ height: SLOT_COUNT * SLOT_HEIGHT }}
    >
      {/* Slot droppables (grid background) */}
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <SlotCell key={i} dateKey={dateKey} idx={i} isDragging={isDragging} />
      ))}

      {/* Timed tasks positioned absolutely */}
      {timed.map((o) => {
        const idx = slotIndexFromTime(o.effectiveTime);
        const completed = isOccurrenceCompleted(o.task, o.originalDate, completions);
        const cat = o.task.category_id ? catMap[o.task.category_id] : undefined;
        return (
          <div
            key={`${o.task.id}-${o.originalDate}`}
            className="absolute left-0 right-0 px-0.5"
            style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
          >
            <DraggableTimedTask
              occ={o}
              completed={completed}
              cat={cat}
              project={o.task.multiple_task_id ? projMap[o.task.multiple_task_id] : undefined}
              onToggle={() => onToggle(o.task, o.originalDate)}
              onEdit={() => onEdit(o.task)}
            />
          </div>
        );
      })}
    </div>
  );
}

function SlotCell({ dateKey, idx, isDragging }: { dateKey: string; idx: number; isDragging: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot|${dateKey}|${idx}`,
    data: { kind: "slot", date: dateKey, slot: idx },
  });
  const hour = START_HOUR + Math.floor((idx * SLOT_MIN) / 60);
  const onHour = idx * SLOT_MIN % 60 === 0;
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 ${onHour ? "border-t border-border/40" : ""} ${
        isDragging ? "hover:bg-muted/50" : ""
      } ${isOver ? "bg-muted" : ""}`}
      style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
    >
      {isDragging && onHour && (
        <span className="absolute left-0 -top-1.5 text-[8px] text-muted-foreground tabular-nums pl-0.5">
          {String(hour).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

function DraggableTimedTask({
  occ,
  completed,
  cat,
  project,
  onToggle,
  onEdit,
}: {
  occ: EffectiveOccurrence;
  completed: boolean;
  cat: Category | undefined;
  project?: string;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task|${occ.task.id}|${occ.originalDate}`,
    data: { taskId: occ.task.id, originalDate: occ.originalDate, title: occ.task.title },
  });
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1 border border-border bg-background px-1 text-[11px] leading-tight h-full ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none"
        aria-label="Drag"
      >
        <GripVertical size={10} />
      </button>
      <span className="text-[9px] text-muted-foreground w-8 tabular-nums flex-shrink-0">
        {shortTime(occ.effectiveTime)}
      </span>
      <button
        onClick={onToggle}
        aria-label="Toggle"
        className={`inline-block h-2.5 w-2.5 border border-border flex-shrink-0 ${completed ? "bg-foreground" : ""}`}
      />
      <button
        onClick={onEdit}
        className={`flex-1 text-left truncate hover:underline ${completed ? "line-through text-muted-foreground" : ""}`}
      >
        {occ.task.title}
        {(occ.task.recurrence ?? "none") !== "none" && (
          <span className="ml-1 text-[9px] text-muted-foreground">↻</span>
        )}
        {occ.isMoved && <span className="ml-1 text-[9px] text-muted-foreground">•</span>}
      </button>
      {project && (
        <span className="text-[9px] text-muted-foreground border-b border-border flex-shrink-0 max-w-[70px] truncate">
          {project}
        </span>
      )}
      {cat && (
        <span
          className="text-[9px] px-0.5 border border-border label-caps flex-shrink-0"
          style={{ color: cat.color }}
        >
          {cat.name}
        </span>
      )}
    </div>
  );
}

function TaskLines({
  items,
  date,
  completions,
  catMap,
  projMap,
  onToggle,
  onEdit,
}: {
  items: EffectiveOccurrence[];
  date: string;
  completions: TaskCompletion[];
  catMap: Record<string, Category>;
  projMap: Record<string, string>;
  onToggle: (task: Task, date: string) => void;
  onEdit: (t: Task) => void;
}) {
  const [showDone, setShowDone] = useState(false);
  const active = items.filter((o) => !isOccurrenceCompleted(o.task, o.originalDate, completions));
  const done = items.filter((o) => isOccurrenceCompleted(o.task, o.originalDate, completions));

  const render = (o: EffectiveOccurrence, completed: boolean) => {
    const cat = o.task.category_id ? catMap[o.task.category_id] : undefined;
    const project = o.task.multiple_task_id ? projMap[o.task.multiple_task_id] : undefined;
    return (
      <div key={`${o.task.id}-${o.originalDate}`} className="flex items-start gap-2 group">
        <button
          onClick={() => onToggle(o.task, o.originalDate)}
          aria-label="Toggle"
          className={`mt-1 inline-block h-3 w-3 border border-border flex-shrink-0 ${completed ? "bg-foreground" : ""}`}
        />
        <button
          onClick={() => onEdit(o.task)}
          className={`text-sm flex-1 text-left truncate hover:underline ${completed ? "line-through text-muted-foreground" : ""}`}
        >
          {o.task.title}
          {(o.task.recurrence ?? "none") !== "none" && (
            <span className="ml-1 text-[10px] text-muted-foreground">↻</span>
          )}
        </button>
        {project && (
          <span className="text-[10px] text-muted-foreground border-b border-border max-w-[80px] truncate">
            {project}
          </span>
        )}
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

  // silence unused var warning for date param (kept for API compat)
  void date;

  return (
    <>
      {active.map((o) => render(o, false))}
      {done.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground hover:text-foreground"
          >
            {showDone ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Completed ({done.length})
          </button>
          {showDone && <div className="mt-1 space-y-1">{done.map((o) => render(o, true))}</div>}
        </div>
      )}
    </>
  );
}
