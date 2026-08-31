import { useMemo, useRef, useState } from "react";
import type {
  Task,
  Category,
  EventEntry,
  EventNote,
  TaskCompletion,
  MultipleTask,
  MultipleTaskItem,
  RecurringException,
  EffectiveOccurrence,
  Intention,
} from "@/lib/wann-data";
import { reviewShowsOnDate, reviewStatus } from "@/lib/wann-intentions";
import {
  formatLocalDate,
  todayLocalStr,
  shortTime,
  effectiveOccurrencesOnDate,
  isOccurrenceCompleted,
  eventsOnDate,
  sortEventNotes,
  eventNoteLabel,
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
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ListChecks, GripVertical, CircleDashed, StickyNote, AlertTriangle, RotateCcw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllSubitems, sortSubitems, updateSubitem, type TaskSubitem } from "@/lib/wann-subitems";
import type { Habit, HabitCompletion } from "@/lib/wann-extra";
import { habitAppliesOnDow } from "@/lib/wann-extra";

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * Pointer-first collision detection.
 * closestCenter compares the *dragged card's* rect center, which sits left of the
 * pointer and made the highlighted column drift by one. The pointer is authoritative;
 * among the containers under it we pick the most specific one.
 */
const DROP_SPECIFICITY = ["slot", "allday", "barcol", "day"];
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const collisions = pointer.length > 0 ? pointer : rectIntersection(args);
  if (collisions.length === 0) return closestCenter(args);
  const rank = (id: string) => {
    const i = DROP_SPECIFICITY.indexOf(String(id).split("|")[0]);
    return i === -1 ? DROP_SPECIFICITY.length : i;
  };
  return [...collisions].sort((a, b) => rank(String(a.id)) - rank(String(b.id)));
};

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
  | { kind: "task"; taskId: string; originalDate: string; title: string; isMoved: boolean }
  | { kind: "bar"; projectId: string; mode: "move" | "start" | "end"; grabbedDate: string; title: string }
  | { kind: "event"; eventId: string; title: string };

const BAR_ROW_H = 22;


export function WeekRotation({
  anchorDate,
  onAnchorChange,
  tasks,
  categories,
  events,
  eventNotes = [],
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
  intentions = [],
  onOpenIntention,
}: {
  anchorDate: Date;
  onAnchorChange: (d: Date) => void;
  tasks: Task[];
  categories: Category[];
  events: EventEntry[];
  eventNotes?: EventNote[];
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
  /** Active IDEA/LATER/GOAL intentions whose Review Timer may be due. Optional — Timeline works without it. */
  intentions?: Intention[];
  onOpenIntention?: (id: string) => void;
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
      // Only a true no-op (unmoved occurrence dropped back on its own date+time) is skipped.
      // A *moved* occurrence dropped back onto its original date+time must still fire, so the
      // exception gets reverted (new_date/new_time reset to the anchor) instead of staying stuck.
      const isNoOp = !src.isMoved && date === src.originalDate && newTime === (task.due_time?.slice(0, 5) ?? "");
      if (isNoOp) return;
      onMoveTask({ task, originalDate: src.originalDate, newDate: date, newTime });
    } else {
      // Same reasoning as above: only skip when the occurrence was never moved in the first
      // place. A moved occurrence dropped back on its original date is a real revert.
      if (!src.isMoved && dropDate === src.originalDate) return;
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
    // Multi-day projects are drawn as bars above the cards, not inside them.
    const dayMultiples = multipleTasks.filter((m) => m.date === key && !isMultiDayProject(m));

    const dayHabits = habits.filter((h) => habitAppliesOnDow(h, d.getDay()));
    const primaryType = EVENT_PRIORITY.find((t) => dayEvents.some((e) => e.type === t));
    const borderColor = primaryType ? EVENT_COLORS[primaryType] : undefined;

    const cardStyle = borderColor ? { borderColor, borderWidth: 2 } : undefined;
    // A Review only ever shows starting on its (single, mutable) next_review_date, and then
    // carries forward every day after — never a duplicate row, never a planner_tasks row.
    const dayReviews = intentions.filter((i) => reviewShowsOnDate(i, key));

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
        eventNotes={eventNotes}
        dayMultiples={dayMultiples}
        dayReviews={dayReviews}
        onOpenIntention={onOpenIntention}
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

  // ---- multi-day project bars (Google-Calendar style) ----
  const viewStart = dayKeys[0];
  const viewEnd = dayKeys[dayKeys.length - 1];
  const rowEnds: string[] = [];
  const bars = multipleTasks
    .filter((m) => isMultiDayProject(m))
    .map((m) => ({ m, span: projectSpan(m)! }))
    .filter(({ span }) => span.start <= viewEnd && span.end >= viewStart)
    .sort((a, b) => a.span.start.localeCompare(b.span.start) || a.m.name.localeCompare(b.m.name))
    .map(({ m, span }) => {
      const startIdx = Math.max(0, diffDays(viewStart, span.start));
      const endIdx = Math.min(dayKeys.length - 1, diffDays(viewStart, span.end));
      let row = rowEnds.findIndex((e) => e < span.start);
      if (row === -1) {
        row = rowEnds.length;
        rowEnds.push(span.end);
      } else {
        rowEnds[row] = span.end;
      }
      const children = multipleTaskItems.filter((i) => i.multiple_task_id === m.id);
      const done = children.filter((i) => i.completed).length;
      const pct = children.length > 0 ? Math.round((done / children.length) * 100) : null;
      return {
        m,
        span,
        startIdx,
        endIdx,
        row,
        pct,
        continuesLeft: span.start < viewStart,
        continuesRight: span.end > viewEnd,
      };
    });
  const barRows = bars.reduce((n, b) => Math.max(n, b.row + 1), 0);
  const mobileBars = bars.filter(
    (b) => b.span.start <= anchorKey && b.span.end >= anchorKey,
  );



  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      // Droppable rects must be re-measured continuously: the cards re-layout
      // right after a drop (and while dragging), so cached rects from drag-start
      // point at the previous positions and make the next drag land one card off.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always, frequency: 100 } }}
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

        {/* multi-day project bars — mobile */}
        {mobileBars.length > 0 && (
          <div className="md:hidden mb-2 space-y-1">
            {mobileBars.map((b) => (
              <ProjectBar
                key={b.m.id}
                bar={b}
                cat={b.m.category_id ? catMap[b.m.category_id] : undefined}
                draggableId={`bar|${b.m.id}|mobile`}
                grabbedDate={anchorKey}
                onOpen={() => onOpenMultiple(b.m.id)}
                showHandles={false}
              />
            ))}
          </div>
        )}

        <div className="md:hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {renderDayCard(anchorDate, todayInMobileView, "")}
        </div>

        {/* multi-day project bars — desktop, spanning the 3 day columns */}
        {barRows > 0 && (
          <div className="hidden md:block relative mb-2">
            <div className="absolute inset-0 grid grid-cols-3 gap-2">
              {dayKeys.map((k) => (
                <BarColumn key={k} dateKey={k} isDragging={!!dragging} />
              ))}
            </div>
            <div
              className="relative grid grid-cols-3 gap-2"
              style={{ gridTemplateRows: `repeat(${barRows}, ${BAR_ROW_H}px)`, rowGap: 2 }}
            >
              {bars.map((b) => (
                <div
                  key={b.m.id}
                  style={{
                    gridColumn: `${b.startIdx + 1} / span ${b.endIdx - b.startIdx + 1}`,
                    gridRow: b.row + 1,
                  }}
                >
                  <ProjectBar
                    bar={b}
                    cat={b.m.category_id ? catMap[b.m.category_id] : undefined}
                    draggableId={`bar|${b.m.id}`}
                    grabbedDate={dayKeys[b.startIdx]}
                    onOpen={() => onOpenMultiple(b.m.id)}
                    showHandles
                  />
                </div>
              ))}
            </div>
          </div>
        )}

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
  eventNotes,
  dayMultiples,
  dayReviews,
  onOpenIntention,
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
  eventNotes: EventNote[];
  dayMultiples: MultipleTask[];
  dayReviews: Intention[];
  onOpenIntention?: (id: string) => void;
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

      <AllDayZone dateKey={dateKey} isDragging={isDragging}>
        <p className="label-caps text-[10px] text-muted-foreground mb-1">All-day</p>
        <div className="space-y-1">
          {/* REVIEW — a distinct semantic item type from TASK/EVENT/PROJECT ITEM. Never a
              planner_tasks row, never draggable, never duplicated: one intention, one
              next_review_date, re-shown every day (in "overdue" red) until handled. */}
          {dayReviews.map((intention) => {
            // Status is always relative to *real* today, not the card's date — a review
            // showing on a past/future card is still "overdue"/"upcoming" the same way everywhere.
            const st = reviewStatus(intention.next_review_date);
            const overdue = st === "overdue";
            const Comp = onOpenIntention ? "button" : "div";
            // Highlighter-marker look — deliberately loud, unlike a plain task line, so a
            // Review never blends into the rest of the timeline. Overdue swaps the highlighter
            // colour from yellow to red on top of the existing red text/icon.
            const markerBg = overdue ? hexToRgba("#F87171", 0.35) : hexToRgba("#FDE047", 0.55);
            return (
              <Comp
                key={`review-${intention.id}`}
                onClick={onOpenIntention ? () => onOpenIntention(intention.id) : undefined}
                className={`flex items-center gap-1.5 text-sm w-full text-left px-1.5 py-0.5 rounded-sm ${overdue ? "text-destructive font-medium" : "text-foreground"} ${onOpenIntention ? "hover:brightness-95" : ""}`}
                style={{ background: markerBg }}
                title={overdue ? "Review overdue" : "Review due"}
              >
                <RotateCcw size={11} className="flex-shrink-0" />
                <span className="label-caps text-[10px] flex-shrink-0">REVIEW</span>
                <span className="truncate">{intention.title}</span>
              </Comp>
            );
          })}
          {dayEvents.map((ev) => (
            <DraggableEventLine key={ev.id} ev={ev} notes={eventNotes.filter((n) => n.event_id === ev.id)} />
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
          {dayEvents.length === 0 && allDay.length === 0 && dayMultiples.length === 0 && dayReviews.length === 0 && (
            <p className="text-xs text-muted-foreground italic">—</p>
          )}
        </div>
      </AllDayZone>


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
  // Layout model:
  // - A task with a duration renders TWO full-width single-slot rows: one at its
  //   start time ("[start]") and one at its end time ("[end]"), plus a thin
  //   vertical rail in the left gutter connecting them.
  // - Tasks without a duration and timed habits render as one full-width row.
  // - Rows only share width when two rows land on the same slot.
  const RAIL_W = 4;

  type Row =
    | { kind: "task"; startMin: number; marker: "start" | "end" | null; endStr: string | null; endMin?: number; o: EffectiveOccurrence }
    | { kind: "habit"; startMin: number; habit: Habit };

  const rows: Row[] = [];
  const rails: { startMin: number; endMin: number; color: string | undefined; key: string }[] = [];

  for (const o of timed) {
    const startMin = timeToMinutes(o.effectiveTime) ?? START_HOUR * 60;
    const endStr = occurrenceEndTime(o.task, o.effectiveTime);
    const rawEnd = timeToMinutes(endStr);
    const spans = rawEnd != null && rawEnd > startMin;
    if (spans) {
      rows.push({ kind: "task", startMin, marker: "start", endStr, endMin: rawEnd!, o });
      rows.push({ kind: "task", startMin: rawEnd!, marker: "end", endStr, o });
      const cat = o.task.category_id ? catMap[o.task.category_id] : undefined;
      rails.push({
        startMin,
        endMin: rawEnd!,
        color: cat?.color ?? undefined,
        key: `${o.task.id}-${o.originalDate}`,
      });
    } else {
      rows.push({ kind: "task", startMin, marker: null, endStr: null, o });
    }
  }
  for (const h of timedHabits) {
    rows.push({ kind: "habit", startMin: timeToMinutes(h.habit_time) ?? START_HOUR * 60, habit: h });
  }

  const slotOf = (min: number) =>
    Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor((min - START_HOUR * 60) / SLOT_MIN)));

  // Rows only compete when they sit on the same slot.
  const bySlot: Record<number, Row[]> = {};
  for (const r of rows) {
    const s = slotOf(r.startMin);
    (bySlot[s] ||= []).push(r);
  }

  const gutter = rails.length * RAIL_W;

  return (
    <div
      className="relative"
      style={{ height: SLOT_COUNT * SLOT_HEIGHT }}
    >
      {/* Slot droppables (grid background) */}
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <SlotCell key={i} dateKey={dateKey} idx={i} isDragging={isDragging} />
      ))}

      {/* Thin progress rails for tasks that span time */}
      {rails.map((r, i) => {
        const top = slotOf(r.startMin) * SLOT_HEIGHT;
        const bottom = (slotOf(r.endMin) + 1) * SLOT_HEIGHT;
        return (
          <div
            key={`rail-${r.key}`}
            className="absolute pointer-events-none"
            style={{
              top,
              height: Math.max(SLOT_HEIGHT, bottom - top),
              left: i * RAIL_W,
              width: RAIL_W - 1,
              background: r.color ?? "var(--foreground)",
              opacity: 0.7,
            }}
          />
        );
      })}

      {/* Rows */}
      {Object.entries(bySlot).flatMap(([slotStr, slotRows]) =>
        slotRows.map((b, idx) => {
          const slot = Number(slotStr);
          const n = slotRows.length;
          const style = {
            top: slot * SLOT_HEIGHT,
            height: SLOT_HEIGHT,
            left: `calc(${gutter}px + ${(idx / n) * 100}%)`,
            width: `calc(${100 / n}% - ${gutter / n}px)`,
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
          const project = o.task.multiple_task_id ? projMap[o.task.multiple_task_id] : undefined;
          const key = `${o.task.id}-${o.originalDate}-${b.marker ?? "single"}`;
          if (b.marker === "end") {
            return (
              <div key={key} className="absolute px-0.5" style={style}>
                <TimedTaskBody
                  occ={o}
                  timeLabel={shortTime(b.endStr)}
                  marker="end"
                  completed={completed}
                  cat={cat}
                  project={project}
                  onToggle={() => onToggle(o.task, o.originalDate)}
                  onEdit={() => onEdit(o.task)}
                />
              </div>
            );
          }
          if (b.marker === "start") {
            return (
              <div key={key} className="absolute px-0.5" style={style}>
                <TimedTaskWithSubitems
                  occ={o}
                  endTime={b.endStr}
                  startMin={b.startMin}
                  endMin={b.endMin ?? b.startMin}
                  completed={completed}
                  cat={cat}
                  project={project}
                  onToggle={() => onToggle(o.task, o.originalDate)}
                  onEdit={() => onEdit(o.task)}
                />
              </div>
            );
          }
          return (
            <div key={key} className="absolute px-0.5" style={style}>
              <DraggableTimedTask
                occ={o}
                marker={b.marker}
                endTime={null}
                completed={completed}
                cat={cat}
                project={project}
                onToggle={() => onToggle(o.task, o.originalDate)}
                onEdit={() => onEdit(o.task)}
              />
            </div>
          );
        }),
      )}
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


/** Shared (deduped) query of every task subitem. */
function useSubitemsFor(taskId: string): TaskSubitem[] {
  const q = useQuery({ queryKey: ["task-subitems"], queryFn: fetchAllSubitems, staleTime: 30_000 });
  return useMemo(
    () => sortSubitems((q.data ?? []).filter((s) => s.task_id === taskId)),
    [q.data, taskId],
  );
}

/**
 * A spanning task row plus its collapsible "post-it" of detail items.
 * Each instance owns its own open state, so several days can stay expanded.
 */
function TimedTaskWithSubitems({
  occ,
  endTime,
  endMin,
  startMin,
  completed,
  cat,
  project,
  onToggle,
  onEdit,
}: {
  occ: EffectiveOccurrence;
  endTime: string | null;
  endMin: number;
  startMin: number;
  completed: boolean;
  cat: Category | undefined;
  project?: string;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const items = useSubitemsFor(occ.task.id);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (v: { id: string; patch: Partial<TaskSubitem> }) => updateSubitem(v.id, v.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-subitems"] }),
  });

  return (
    <>
      <DraggableTimedTask
        occ={occ}
        marker="start"
        endTime={endTime}
        completed={completed}
        cat={cat}
        project={project}
        onToggle={onToggle}
        onEdit={onEdit}
        extra={
          items.length > 0 ? (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="상세 항목 펼치기"
              className={`flex items-center gap-0.5 text-[9px] px-0.5 border border-foreground/40 flex-shrink-0 ${open ? "bg-foreground text-background" : ""}`}
            >
              <StickyNote size={9} />
              {items.length}
            </button>
          ) : null
        }
      />
      {open && items.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-0.5 border border-foreground bg-[#FFF9C4] shadow-sm p-1 space-y-0.5">
          {items.map((si) => (
            <SubitemRow
              key={si.id}
              item={si}
              minMin={startMin}
              maxMin={endMin}
              onToggle={() => save.mutate({ id: si.id, patch: { completed: !si.completed } })}
              onTimeChange={(time) => save.mutate({ id: si.id, patch: { time } })}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** One detail item: checkbox + text, draggable vertically to shift its time by 30-min steps. */
function SubitemRow({
  item,
  minMin,
  maxMin,
  onToggle,
  onTimeChange,
}: {
  item: TaskSubitem;
  minMin: number;
  maxMin: number;
  onToggle: () => void;
  onTimeChange: (time: string) => void;
}) {
  const baseMin = timeToMinutes(item.time) ?? minMin;
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? baseMin;

  const startDrag = (e: React.PointerEvent) => {
    if (!item.time) return;
    e.preventDefault();
    const startY = e.clientY;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const clamp = (m: number) => Math.max(minMin, Math.min(maxMin, m));
    const compute = (y: number) =>
      clamp(baseMin + Math.round((y - startY) / SLOT_HEIGHT) * SLOT_MIN);
    const move = (ev: PointerEvent) => setPreview(compute(ev.clientY));
    const up = (ev: PointerEvent) => {
      const next = compute(ev.clientY);
      setPreview(null);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      if (next !== baseMin) onTimeChange(minutesToTime(next));
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  return (
    <div className="flex items-center gap-1 text-[10px] leading-tight text-foreground">
      {item.time && (
        <button
          onPointerDown={startDrag}
          aria-label="시간 조정"
          className="cursor-ns-resize touch-none text-foreground/60 flex-shrink-0"
        >
          <GripVertical size={9} />
        </button>
      )}
      <span className="tabular-nums text-foreground/70 flex-shrink-0 w-[30px]">
        {item.time ? minutesToTime(shown) : "--:--"}
      </span>
      <button
        onClick={onToggle}
        aria-label="완료 표시"
        className={`inline-block h-2.5 w-2.5 border border-foreground/60 flex-shrink-0 ${item.completed ? "bg-foreground" : ""}`}
      />
      <span className={`flex-1 min-w-0 truncate ${item.completed ? "line-through opacity-60" : ""}`}>
        {item.content}
      </span>
    </div>
  );
}

/** Presentational timeline row. `marker` adds a [start]/[end] tag for spanning tasks. */
function TimedTaskBody({
  occ,
  timeLabel,
  marker,
  completed,
  cat,
  project,
  onToggle,
  onEdit,
  dragHandle,
  dimmed,
  extra,
}: {
  occ: EffectiveOccurrence;
  timeLabel: string;
  marker: "start" | "end" | null;
  completed: boolean;
  cat: Category | undefined;
  project?: string;
  onToggle: () => void;
  onEdit: () => void;
  dragHandle?: React.ReactNode;
  dimmed?: boolean;
  extra?: React.ReactNode;
}) {
  // Timeline boxes are tinted with the category colour at 50% opacity.
  const bg = hexToRgba(cat?.color, 0.5) ?? "var(--background)";
  const critical = !!occ.task.is_critical;
  return (
    <div
      className={`flex items-center gap-1 px-1 text-[11px] leading-tight h-full overflow-hidden text-foreground ${
        critical ? "border-2 border-destructive" : "border border-border"
      } ${dimmed ? "opacity-30" : ""}`}
      style={{ background: bg }}
    >
      {dragHandle ?? <span className="w-[10px] flex-shrink-0" />}
      <span className="text-[9px] text-foreground/70 tabular-nums flex-shrink-0">{timeLabel}</span>
      <button
        onClick={onToggle}
        aria-label="Toggle"
        className={`inline-block h-2.5 w-2.5 border border-foreground/50 flex-shrink-0 ${completed ? "bg-foreground" : ""}`}
      />
      {critical && (
        <AlertTriangle size={10} className="text-destructive flex-shrink-0" aria-label="놓치면 안 됨" />
      )}
      <button
        onClick={onEdit}
        className={`flex-1 min-w-[3rem] text-left truncate hover:underline text-foreground ${completed ? "line-through" : ""}`}
      >
        {occ.task.title || "(제목 없음)"}
        {marker && <span className="ml-1 text-[9px] text-foreground/60">[{marker}]</span>}
        {(occ.task.recurrence ?? "none") !== "none" && (
          <span className="ml-1 text-[9px] text-foreground/60">↻</span>
        )}
        {occ.isMoved && <span className="ml-1 text-[9px] text-foreground/60">•</span>}
      </button>
      {extra}
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

function DraggableTimedTask({
  occ,
  endTime,
  marker,
  completed,
  cat,
  project,
  onToggle,
  onEdit,
  extra,
}: {
  occ: EffectiveOccurrence;
  endTime?: string | null;
  marker?: "start" | null;
  completed: boolean;
  cat: Category | undefined;
  project?: string;
  onToggle: () => void;
  onEdit: () => void;
  extra?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task|${occ.task.id}|${occ.originalDate}`,
    data: { kind: "task", taskId: occ.task.id, originalDate: occ.originalDate, title: occ.task.title, isMoved: occ.isMoved } satisfies DragData,
  });
  return (
    <div ref={setNodeRef} className="h-full relative">
      <TimedTaskBody
        occ={occ}
        timeLabel={`${shortTime(occ.effectiveTime)}${endTime ? `–${shortTime(endTime)}` : ""}`}
        marker={marker ?? null}
        completed={completed}
        cat={cat}
        project={project}
        onToggle={onToggle}
        onEdit={onEdit}
        extra={extra}
        dimmed={isDragging}
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-foreground/60 touch-none flex-shrink-0"
            aria-label="Drag"
          >
            <GripVertical size={10} />
          </button>
        }
      />
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
      <DraggableAllDayTask
        key={`${o.task.id}-${o.originalDate}`}
        occ={o}
        completed={completed}
        cat={cat}
        project={project}
        onToggle={() => onToggle(o.task, o.originalDate)}
        onEdit={() => onEdit(o.task)}
      />
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

/* ---------- multi-day project bars ---------- */

type BarItem = {
  m: MultipleTask;
  span: { start: string; end: string };
  startIdx: number;
  endIdx: number;
  row: number;
  pct: number | null;
  continuesLeft: boolean;
  continuesRight: boolean;
};

/** Droppable column behind the bar row — one per visible day. */
function BarColumn({ dateKey, isDragging }: { dateKey: string; isDragging: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `barcol|${dateKey}`,
    data: { kind: "barcol", date: dateKey },
  });
  return (
    <div
      ref={setNodeRef}
      className={`h-full ${isDragging ? "outline outline-1 outline-dashed outline-border" : ""} ${
        isOver ? "bg-muted" : ""
      }`}
    />
  );
}

function ProjectBar({
  bar,
  cat,
  draggableId,
  grabbedDate,
  onOpen,
  showHandles,
}: {
  bar: BarItem;
  cat?: Category;
  draggableId: string;
  grabbedDate: string;
  onOpen: () => void;
  showHandles: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: {
      kind: "bar",
      projectId: bar.m.id,
      mode: "move",
      grabbedDate,
      title: bar.m.name,
    } satisfies DragData,
  });
  const bg = hexToRgba(cat?.color, 0.5) ?? "var(--muted)";
  return (
    <div
      className={`relative flex items-center gap-1 h-[20px] px-1 border border-border text-[11px] overflow-hidden ${
        isDragging ? "opacity-30" : ""
      }`}
      style={{
        background: bg,
        borderLeftStyle: bar.continuesLeft ? "dashed" : "solid",
        borderRightStyle: bar.continuesRight ? "dashed" : "solid",
      }}
    >
      {showHandles && !bar.continuesLeft && (
        <BarResizeHandle
          id={`${draggableId}|start`}
          projectId={bar.m.id}
          mode="start"
          title={bar.m.name}
          grabbedDate={bar.span.start}
          side="left"
        />
      )}
      {bar.continuesLeft && <span className="text-foreground/60 flex-shrink-0">‹</span>}
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={onOpen}
        className="cursor-grab active:cursor-grabbing touch-none flex items-center gap-1 min-w-0 flex-1 text-left"
        title={`${bar.span.start} → ${bar.span.end}`}
      >
        <GripVertical size={10} className="flex-shrink-0 text-foreground/60" />
        <ListChecks size={10} className="flex-shrink-0 text-foreground/60" />
        <span className="truncate">{bar.m.name}</span>
        {bar.pct !== null && (
          <span className="text-[9px] tabular-nums text-foreground/70 flex-shrink-0">{bar.pct}%</span>
        )}
      </button>
      {cat && (
        <span className="text-[9px] px-1 label-caps flex-shrink-0 bg-foreground text-background">
          {cat.name}
        </span>
      )}
      {bar.continuesRight && <span className="text-foreground/60 flex-shrink-0">›</span>}
      {showHandles && !bar.continuesRight && (
        <BarResizeHandle
          id={`${draggableId}|end`}
          projectId={bar.m.id}
          mode="end"
          title={bar.m.name}
          grabbedDate={bar.span.end}
          side="right"
        />
      )}
    </div>
  );
}

function BarResizeHandle({
  id,
  projectId,
  mode,
  title,
  grabbedDate,
  side,
}: {
  id: string;
  projectId: string;
  mode: "start" | "end";
  title: string;
  grabbedDate: string;
  side: "left" | "right";
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    data: { kind: "bar", projectId, mode, grabbedDate, title } satisfies DragData,
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={mode === "start" ? "Resize start" : "Resize end"}
      className={`absolute top-0 ${side === "left" ? "left-0" : "right-0"} h-full w-2 cursor-ew-resize touch-none bg-foreground/20 hover:bg-foreground/40`}
    />
  );
}

/* ---------- all-day drop zone & draggable rows ---------- */

function AllDayZone({
  dateKey,
  isDragging,
  children,
}: {
  dateKey: string;
  isDragging: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `allday|${dateKey}`,
    data: { kind: "allday", date: dateKey },
  });
  return (
    <div
      ref={setNodeRef}
      // outline instead of border+padding: it must not shift the layout while
      // dragging, otherwise every droppable below moves under the pointer.
      className={`mb-2 min-h-[18px] ${isDragging ? "outline outline-1 outline-dashed outline-border" : ""} ${
        isOver ? "bg-muted" : ""
      }`}
    >
      {children}
    </div>
  );
}

/** Events can be dragged onto another day card to change their date. */
function DraggableEventLine({ ev, notes = [] }: { ev: EventEntry; notes?: EventNote[] }) {
  // Timeline shows only the single most recent record, if any.
  const latest = sortEventNotes(notes)[0];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event|${ev.id}`,
    data: { kind: "event", eventId: ev.id, title: ev.name } satisfies DragData,
  });
  return (
    <div className={`flex items-center gap-1.5 text-sm ${isDragging ? "opacity-30" : ""}`}>
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none flex-shrink-0"
        aria-label="Drag event"
      >
        <GripVertical size={10} />
      </button>
      <span
        className="inline-block h-3 w-3 flex-shrink-0"
        style={{ background: EVENT_COLORS[ev.type] ?? "transparent" }}
      />
      <span className="flex-1 truncate">
        {ev.name}
        <span className="text-muted-foreground"> · {ev.type}</span>
        {latest && (
          <span className="text-muted-foreground">
            {" "}· {eventNoteLabel(latest, ev)} {latest.note}
          </span>
        )}
      </span>
    </div>
  );
}

/** All-day task row — draggable to another day card. */
function DraggableAllDayTask({
  occ,
  completed,
  cat,
  project,
  onToggle,
  onEdit,
}: {
  occ: EffectiveOccurrence;
  completed: boolean;
  cat?: Category;
  project?: string;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `allday-task|${occ.task.id}|${occ.originalDate}`,
    data: {
      kind: "task",
      taskId: occ.task.id,
      originalDate: occ.originalDate,
      title: occ.task.title,
      isMoved: occ.isMoved,
    } satisfies DragData,
  });
  return (
    <div className={`flex items-start gap-1.5 group ${isDragging ? "opacity-30" : ""}`}>
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground touch-none flex-shrink-0"
        aria-label="Drag task"
      >
        <GripVertical size={10} />
      </button>
      <button
        onClick={onToggle}
        aria-label="Toggle"
        className={`mt-1 inline-block h-3 w-3 border flex-shrink-0 ${occ.task.is_critical ? "border-2 border-destructive" : "border-border"} ${completed ? "bg-foreground" : ""}`}
      />
      {occ.task.is_critical && (
        <AlertTriangle size={11} className="mt-0.5 text-destructive flex-shrink-0" aria-label="놓치면 안 됨" />
      )}
      <button
        onClick={onEdit}
        className={`text-sm flex-1 text-left truncate hover:underline text-foreground ${completed ? "line-through" : ""}`}
      >
        {occ.task.title}
        {(occ.task.recurrence ?? "none") !== "none" && (
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
}
