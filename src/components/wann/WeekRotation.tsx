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
  projectSpan,
  isMultiDayProject,
  shiftDate,
  diffDays,
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
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ListChecks, GripVertical, CircleDashed } from "lucide-react";
import type { Habit, HabitCompletion } from "@/lib/wann-extra";
import { habitAppliesOnDow } from "@/lib/wann-extra";

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

export type MoveProjectArgs = {
  id: string;
  date: string;
  endDate: string;
};

type DragData =
  | { kind: "task"; taskId: string; originalDate: string; title: string }
  | { kind: "bar"; projectId: string; mode: "move" | "start" | "end"; grabbedDate: string; title: string }
  | { kind: "event"; eventId: string; title: string };

const BAR_ROW_H = 22;


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
  habits,
  habitCompletions,
  onTapHabit,
  onOpenMultiple,
  onToggleOccurrence,
  onEditTask,
  onMoveTask,
  onMoveProject,
  onMoveEvent,
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
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  onTapHabit: (habit: Habit, date: string) => void;
  onOpenMultiple: (id: string) => void;
  onToggleOccurrence: (task: Task, date: string) => void;
  onEditTask: (t: Task) => void;
  onMoveTask: (args: MoveTaskArgs) => void;
  onMoveProject: (args: MoveProjectArgs) => void;
  onMoveEvent: (event: EventEntry, newDate: string) => void;
}) {

  // Yesterday / Today / Tomorrow — anchorDate is always the centre card.
  const days = useMemo(
    () => [-1, 0, 1].map((i) => addDays(anchorDate, i)),
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

  const [dragging, setDragging] = useState<DragData | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current as DragData | undefined;
    if (d) setDragging(d);
  };

  /** Every droppable encodes its date as the second "|" segment. */
  const dateFromOver = (overStr: string): string | null => {
    const [prefix, date] = overStr.split("|");
    if (!date) return null;
    if (prefix === "slot" || prefix === "day" || prefix === "allday" || prefix === "barcol") return date;
    return null;
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const src = e.active.data.current as DragData | undefined;
    const overId = e.over?.id;
    if (!src || !overId) return;
    const overStr = String(overId);
    const dropDate = dateFromOver(overStr);
    if (!dropDate) return;

    if (src.kind === "bar") {
      const proj = multipleTasks.find((m) => m.id === src.projectId);
      const span = proj ? projectSpan(proj) : null;
      if (!proj || !span) return;
      if (src.mode === "move") {
        const delta = diffDays(src.grabbedDate, dropDate);
        if (delta === 0) return;
        onMoveProject({ id: proj.id, date: shiftDate(span.start, delta), endDate: shiftDate(span.end, delta) });
      } else if (src.mode === "start") {
        const next = dropDate <= span.end ? dropDate : span.end;
        if (next === span.start) return;
        onMoveProject({ id: proj.id, date: next, endDate: span.end });
      } else {
        const next = dropDate >= span.start ? dropDate : span.start;
        if (next === span.end) return;
        onMoveProject({ id: proj.id, date: span.start, endDate: next });
      }
      return;
    }

    if (src.kind === "event") {
      const ev = events.find((x) => x.id === src.eventId);
      if (!ev) return;
      onMoveEvent(ev, dropDate);
      return;
    }

    const task = tasks.find((t) => t.id === src.taskId);
    if (!task) return;
    if (overStr.startsWith("slot|")) {
      const [, date, slotStr] = overStr.split("|");
      const newTime = timeFromSlotIndex(Number(slotStr));
      if (date === src.originalDate && newTime === (task.due_time?.slice(0, 5) ?? "")) return;
      onMoveTask({ task, originalDate: src.originalDate, newDate: date, newTime });
    } else {
      if (dropDate === src.originalDate) return;
      onMoveTask({ task, originalDate: src.originalDate, newDate: dropDate, newTime: null });
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
    const dayHabits = habits.filter((h) => habitAppliesOnDow(h, d.getDay()));
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
        dayHabits={dayHabits}
        habitCompletions={habitCompletions}
        onTapHabit={onTapHabit}
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

        <div className="hidden md:grid md:grid-cols-3 gap-2 auto-rows-fr items-stretch">
          {days.map((d) => renderDayCard(d, false, "h-full"))}
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
  dayHabits,
  habitCompletions,
  onTapHabit,
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
  dayHabits: Habit[];
  habitCompletions: HabitCompletion[];
  onTapHabit: (habit: Habit, date: string) => void;
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

  const countFor = (habitId: string) =>
    habitCompletions.find((c) => c.habit_id === habitId && c.date === dateKey)?.count ?? 0;
  const timedHabits = dayHabits.filter((h) => !!h.habit_time);
  const untimedHabits = dayHabits.filter((h) => !h.habit_time);

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
        {untimedHabits.length > 0 && (
          <div className="mb-2 space-y-1">
            {untimedHabits.map((h) => (
              <HabitLine
                key={h.id}
                habit={h}
                count={countFor(h.id)}
                onTap={() => onTapHabit(h, dateKey)}
              />
            ))}
          </div>
        )}
        <TimelineGrid
          dateKey={dateKey}
          timed={timed}
          timedHabits={timedHabits}
          habitCount={countFor}
          onTapHabit={(h) => onTapHabit(h, dateKey)}
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
  timedHabits,
  habitCount,
  onTapHabit,
  completions,
  catMap,
  projMap,
  onToggle,
  onEdit,
  isDragging,
}: {
  dateKey: string;
  timed: EffectiveOccurrence[];
  timedHabits: Habit[];
  habitCount: (habitId: string) => number;
  onTapHabit: (habit: Habit) => void;
  completions: TaskCompletion[];
  catMap: Record<string, Category>;
  projMap: Record<string, string>;
  onToggle: (task: Task, date: string) => void;
  onEdit: (t: Task) => void;
  isDragging: boolean;
}) {
  // Lay out timed occurrences: tasks with an end time span their duration,
  // tasks without one occupy a single 30-min slot. Timed habits sit in the same
  // grid so they read alongside tasks. Overlaps share the width.
  type Block =
    | { kind: "task"; startMin: number; endMin: number; top: number; height: number; spans: boolean; endStr: string | null; o: EffectiveOccurrence }
    | { kind: "habit"; startMin: number; endMin: number; top: number; height: number; habit: Habit };

  const posOf = (startMin: number, endMin: number) => ({
    top: ((startMin - START_HOUR * 60) / SLOT_MIN) * SLOT_HEIGHT,
    height: Math.max(SLOT_HEIGHT, ((endMin - startMin) / SLOT_MIN) * SLOT_HEIGHT),
  });

  const taskBlocks: Block[] = timed.map((o) => {
    const startMin = timeToMinutes(o.effectiveTime) ?? START_HOUR * 60;
    const endStr = occurrenceEndTime(o.task, o.effectiveTime);
    const rawEnd = timeToMinutes(endStr);
    const spans = rawEnd != null && rawEnd > startMin;
    const endMin = spans ? rawEnd! : startMin + SLOT_MIN;
    return { kind: "task", startMin, endMin, ...posOf(startMin, endMin), spans, endStr, o };
  });

  const habitBlocks: Block[] = timedHabits.map((h) => {
    const startMin = timeToMinutes(h.habit_time) ?? START_HOUR * 60;
    const endMin = startMin + SLOT_MIN;
    return { kind: "habit", startMin, endMin, ...posOf(startMin, endMin), habit: h };
  });

  // simple lane packing for overlapping blocks
  const laneEnds: number[] = [];
  const placed = [...taskBlocks, ...habitBlocks]
    .sort((a, b) => a.startMin - b.startMin)
    .map((b) => {
      let lane = laneEnds.findIndex((e) => e <= b.startMin);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(b.endMin); }
      else laneEnds[lane] = b.endMin;
      return { ...b, lane };
    });
  const laneCount = Math.max(1, laneEnds.length);

  return (
    <div
      className="relative"
      style={{ height: SLOT_COUNT * SLOT_HEIGHT }}
    >
      {/* Slot droppables (grid background) */}
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <SlotCell key={i} dateKey={dateKey} idx={i} isDragging={isDragging} />
      ))}

      {/* Timed tasks & habits positioned absolutely */}
      {placed.map((b) => {
        const style = {
          top: Math.max(0, b.top),
          height: b.height,
          left: `${(b.lane / laneCount) * 100}%`,
          width: `${100 / laneCount}%`,
        };
        if (b.kind === "habit") {
          const h = b.habit;
          const target = Math.max(1, h.target_count ?? 1);
          return (
            <div key={`habit-${h.id}`} className="absolute px-0.5" style={style}>
              <TimedHabit
                habit={h}
                count={habitCount(h.id)}
                target={target}
                onTap={() => onTapHabit(h)}
              />
            </div>
          );
        }
        const o = b.o;
        const completed = isOccurrenceCompleted(o.task, o.originalDate, completions);
        const cat = o.task.category_id ? catMap[o.task.category_id] : undefined;
        return (
          <div key={`${o.task.id}-${o.originalDate}`} className="absolute px-0.5" style={style}>
            <DraggableTimedTask
              occ={o}
              endTime={b.spans ? b.endStr : null}
              tall={b.height > SLOT_HEIGHT * 1.5}
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

/** A habit with a time — dashed border + dotted-circle icon marks it as a habit. */
function TimedHabit({
  habit,
  count,
  target,
  onTap,
}: {
  habit: Habit;
  count: number;
  target: number;
  onTap: () => void;
}) {
  const done = count >= target;
  const bg = hexToRgba(habit.color, 0.5) ?? "var(--background)";
  return (
    <div
      className="flex items-center gap-1 border border-dashed border-foreground/60 px-1 text-[11px] leading-tight h-full overflow-hidden text-foreground"
      style={{ background: bg }}
    >
      <CircleDashed size={10} className="flex-shrink-0 text-foreground/70" />
      <span className="text-[9px] text-foreground/70 tabular-nums flex-shrink-0">
        {shortTime(habit.habit_time)}
      </span>
      <button
        onClick={onTap}
        aria-label={`Toggle habit ${habit.name}`}
        className={`inline-block h-2.5 w-2.5 border border-dashed border-foreground/60 flex-shrink-0 ${done ? "bg-foreground" : ""}`}
      />
      <button
        onClick={onTap}
        className={`flex-1 min-w-0 text-left truncate text-foreground ${done ? "line-through" : ""}`}
      >
        {habit.name}
      </button>
      {target > 1 && (
        <span className="text-[9px] tabular-nums flex-shrink-0 px-1 bg-foreground text-background">
          {count}/{target}
        </span>
      )}
    </div>
  );
}

/** A habit without a time — listed above the timeline grid. */
function HabitLine({ habit, count, onTap }: { habit: Habit; count: number; onTap: () => void }) {
  const target = Math.max(1, habit.target_count ?? 1);
  const done = count >= target;
  return (
    <div className="flex items-center gap-1.5 border border-dashed border-border px-1 py-0.5 text-[11px]">
      <CircleDashed size={10} className="flex-shrink-0 text-muted-foreground" />
      <button
        onClick={onTap}
        aria-label={`Toggle habit ${habit.name}`}
        className={`inline-block h-2.5 w-2.5 border border-dashed border-foreground/60 flex-shrink-0 ${done ? "bg-foreground" : ""}`}
      />
      <button
        onClick={onTap}
        className={`flex-1 min-w-0 text-left truncate text-foreground ${done ? "line-through" : ""}`}
      >
        {habit.name}
      </button>
      {target > 1 && (
        <span className="text-[9px] tabular-nums flex-shrink-0 px-1 bg-foreground text-background">
          {count}/{target}
        </span>
      )}
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
  endTime,
  tall,
  completed,
  cat,
  project,
  onToggle,
  onEdit,
}: {
  occ: EffectiveOccurrence;
  endTime?: string | null;
  tall?: boolean;
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
  // Timeline boxes are tinted with the category colour at 50% opacity.
  const bg = hexToRgba(cat?.color, 0.5) ?? "var(--background)";
  return (
    <div
      ref={setNodeRef}
      className={`flex gap-1 border border-border px-1 text-[11px] leading-tight h-full overflow-hidden text-foreground ${
        tall ? "items-start pt-0.5 flex-wrap content-start" : "items-center"
      } ${isDragging ? "opacity-30" : ""}`}
      style={{ background: bg }}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-foreground/60 touch-none flex-shrink-0"
        aria-label="Drag"
      >
        <GripVertical size={10} />
      </button>
      <span className="text-[9px] text-foreground/70 tabular-nums flex-shrink-0">
        {shortTime(occ.effectiveTime)}
        {endTime ? `–${shortTime(endTime)}` : ""}
      </span>
      <button
        onClick={onToggle}
        aria-label="Toggle"
        className={`inline-block h-2.5 w-2.5 border border-foreground/50 flex-shrink-0 ${completed ? "bg-foreground" : ""}`}
      />
      <button
        onClick={onEdit}
        className={`flex-1 min-w-0 text-left truncate hover:underline text-foreground ${completed ? "line-through" : ""}`}
      >
        {occ.task.title}
        {(occ.task.recurrence ?? "none") !== "none" && (
          <span className="ml-1 text-[9px] text-foreground/60">↻</span>
        )}
        {occ.isMoved && <span className="ml-1 text-[9px] text-foreground/60">•</span>}
      </button>
      {project && (
        <span className="text-[9px] text-foreground/70 border-b border-foreground/30 flex-shrink-0 max-w-[70px] truncate">
          {project}
        </span>
      )}
      {cat && (
        <span className="text-[9px] px-1 label-caps flex-shrink-0 bg-foreground text-background">
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
          className={`text-sm flex-1 text-left truncate hover:underline text-foreground ${completed ? "line-through" : ""}`}
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
          <span className="text-[10px] px-1 label-caps bg-foreground text-background flex-shrink-0">
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
