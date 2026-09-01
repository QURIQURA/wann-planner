import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type UserSettings = {
  user_id: string;
  bg_color: string;
  border_color: string;
  text_color: string;
  font: string;
  widget_visibility: Record<string, boolean>;
  widget_order: string[];
  /** Background colour for the "review due" highlighter-marker on Intentions
   * (goals/ideas) in the Timeline — user-customisable so it never blends
   * into the unrelated category colours also shown there. Overdue reviews
   * stay a fixed red regardless of this setting (mirrors overdue Tasks). */
  review_highlight_color: string;
};


export type Category = Tables<"planner_task_categories">;
export type Subtag = Tables<"planner_task_subtags">;
export type Task = Tables<"planner_tasks">;
export type MultipleTask = Tables<"planner_multiple_tasks">;
/** Sub-items of a Multiple Task are now regular tasks tagged with multiple_task_id. */
export type MultipleTaskItem = Task;

export type EventEntry = Tables<"planner_events">;
export type RecurringException = Tables<"planner_recurring_task_exceptions">;
/** Template + pattern for an opt-in "독립 모드" recurring Task — see
 * generateSeriesOccurrenceDates() below and use-wann-dashboard.ts's
 * addTaskSeries/topUpTaskSeries. */
export type TaskSeries = Tables<"planner_task_series">;

/**
 * A Task may carry any number of categories (`category_ids`). `category_id`
 * stays in sync as the first entry — the "primary" category — for the
 * single-category views (colours, month view, patterns, summary stats) that
 * only ever show one. This helper is the one place that reconciles both.
 */
export function taskCategoryIds(t: Task): string[] {
  if (t.category_ids?.length) return t.category_ids;
  return t.category_id ? [t.category_id] : [];
}

/** An occurrence is overdue once its (effective) date is in the past and it
 * hasn't been completed. Used to give overdue Tasks a red highlight in the
 * Timeline, distinct from any category colour also shown there. */
export function isOccurrenceOverdue(originalDate: string, completed: boolean, today = todayLocalStr()): boolean {
  return !completed && originalDate < today;
}

export async function fetchExceptions(_userId: string): Promise<RecurringException[]> {
  const { data, error } = await supabase.from("planner_recurring_task_exceptions").select("*");
  if (error) throw error;
  return (data ?? []) as RecurringException[];
}

/**
 * Effective occurrence of a task on a given date, after applying moves via
 * planner_recurring_task_exceptions. `originalDate` is the date the occurrence
 * *would* have happened on (used as the key for completions).
 */
export type EffectiveOccurrence = {
  task: Task;
  effectiveTime: string | null;
  originalDate: string;
  isMoved: boolean;
};

export function effectiveOccurrencesOnDate(
  tasks: Task[],
  exceptions: RecurringException[],
  dateStr: string,
): EffectiveOccurrence[] {
  const out: EffectiveOccurrence[] = [];
  for (const task of tasks) {
    const rec = task.recurrence ?? "none";
    const taskExc = exceptions.filter((e) => e.task_id === task.id);

    if (rec === "none") {
      if (!task.due_date) continue;
      const moved = taskExc.find((e) => e.original_date === task.due_date);
      if (moved) {
        if (moved.new_date === dateStr) {
          out.push({ task, effectiveTime: moved.new_time ?? task.due_time, originalDate: task.due_date, isMoved: true });
        }
      } else if (task.due_date === dateStr) {
        out.push({ task, effectiveTime: task.due_time, originalDate: task.due_date, isMoved: false });
      }
      continue;
    }

    // Recurring: natural occurrence, unless moved away
    if (taskOccursOn(task, dateStr)) {
      const movedAway = taskExc.find((e) => e.original_date === dateStr && e.new_date !== dateStr);
      if (!movedAway) {
        out.push({ task, effectiveTime: task.due_time, originalDate: dateStr, isMoved: false });
      }
    }
    // Recurring: an occurrence moved into this date
    for (const e of taskExc) {
      if (e.new_date !== dateStr) continue;
      if (e.original_date === dateStr) continue; // pure time change already covered below
      if (!taskOccursOn(task, e.original_date)) continue;
      out.push({ task, effectiveTime: e.new_time ?? task.due_time, originalDate: e.original_date, isMoved: true });
    }
    // Recurring: time-only override (original_date === new_date === dateStr)
    const timeOnly = taskExc.find((e) => e.original_date === dateStr && e.new_date === dateStr);
    if (timeOnly) {
      const idx = out.findIndex((o) => o.task.id === task.id && o.originalDate === dateStr && !o.isMoved);
      if (idx >= 0) {
        out[idx] = { ...out[idx], effectiveTime: timeOnly.new_time ?? task.due_time, isMoved: true };
      }
    }
  }
  return out;
}

export const EVENT_COLORS: Record<string, string> = {
  birthday: "#D4A574",
  anniversary: "#C99BA3",
  holiday: "#C17A6E",
  dplus: "#8FA98A",
};

/**
 * Priority for showing a single representative border color when a date has
 * multiple events. Deterministic: first type in this list that has an event
 * on the day wins. `dplus` used to be silently excluded (a day with only a
 * D+day event got no border at all) — now explicitly included, last, so
 * existing birthday/anniversary/holiday days are unaffected but a D+day-only
 * day now gets a color too.
 */
export const EVENT_PRIORITY = ["birthday", "anniversary", "holiday", "dplus"] as const;

/** "D+day" events count up from a past reference date instead of down to a future one. */
export const DPLUS_TYPE = "dplus";

export function isDPlusEvent(e: { type: string }): boolean {
  return e.type === DPLUS_TYPE;
}

/** Whole days elapsed since the reference date (reference day itself = 0). */
export function daysSince(dateStr: string, today = new Date()): number {
  const d = parseLocalDate(dateStr);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t.getTime() - d.getTime()) / 86400000);
}

/** Calendar months + remaining days elapsed since the reference date. */
export function monthsDaysSince(dateStr: string, today = new Date()): { months: number; days: number } {
  const d = parseLocalDate(dateStr);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (t < d) return { months: 0, days: 0 };
  let months = (t.getFullYear() - d.getFullYear()) * 12 + (t.getMonth() - d.getMonth());
  const anchor = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  if (anchor > t) {
    months -= 1;
  }
  const base = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  const days = Math.round((t.getTime() - base.getTime()) / 86400000);
  return { months, days };
}

export function durationSinceLabel(dateStr: string, today = new Date()): string {
  const n = daysSince(dateStr, today);
  if (n < 0) return `${-n}일 전`;
  const { months, days } = monthsDaysSince(dateStr, today);
  if (months < 1) return `${n}일째`;
  return `${months}개월 ${days}일`;
}

/** Label shown for a D+day event, honouring its display-format flags. */
export function dPlusLabel(
  e: { date: string; show_day_count?: boolean | null; show_duration?: boolean | null },
  today = new Date(),
): string {
  const parts: string[] = [];
  const showNum = e.show_day_count !== false;
  if (showNum) parts.push(`D+${daysSince(e.date, today)}`);
  if (e.show_duration) parts.push(durationSinceLabel(e.date, today));
  if (parts.length === 0) parts.push(`D+${daysSince(e.date, today)}`);
  return parts.join(" · ");
}


export async function fetchSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase.from("planner_user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data as unknown as UserSettings;
  const { data: created, error: cErr } = await supabase
    .from("planner_user_settings")
    .insert({ user_id: userId })
    .select()
    .single();
  if (cErr) throw cErr;
  return created as unknown as UserSettings;
}

export async function updateSettings(userId: string, patch: Partial<UserSettings>) {
  const { error } = await supabase.from("planner_user_settings").update(patch).eq("user_id", userId);
  if (error) throw error;
}

export async function fetchCategories(_userId: string) {
  const { data, error } = await supabase
    .from("planner_task_categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSubtags(_userId: string) {
  const { data, error } = await supabase.from("planner_task_subtags").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function fetchTasks(_userId: string) {
  const { data, error } = await supabase
    .from("planner_tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTaskSeries(_userId: string): Promise<TaskSeries[]> {
  const { data, error } = await supabase
    .from("planner_task_series")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMultipleTasks(_userId: string) {
  const { data, error } = await supabase
    .from("planner_multiple_tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMultipleTaskItems(_userId: string) {
  const { data, error } = await supabase
    .from("planner_tasks")
    .select("*")
    .not("multiple_task_id", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}


export async function fetchEvents(_userId: string) {
  const { data, error } = await supabase
    .from("planner_events")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Custom Event Types only — system types (birthday/anniversary/holiday/dplus)
 * are not stored here, see wann-events.ts. */
export type EventType = Tables<"planner_event_types">;

export async function fetchEventTypes(_userId: string): Promise<EventType[]> {
  const { data, error } = await supabase
    .from("planner_event_types")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type TaskCompletion = {
  id: string;
  task_id: string;
  user_id: string;
  occurrence_date: string;
  completed_at: string;
};

export async function fetchCompletions(_userId: string): Promise<TaskCompletion[]> {
  const { data, error } = await supabase
    .from("planner_task_completions")
    .select("*");
  if (error) throw error;
  return (data ?? []) as unknown as TaskCompletion[];
}

/* ============================================================
 * INTENTIONS — IDEA / LATER / GOAL + Review Timer
 * A separate "intent layer" that sits alongside (not inside) the
 * existing Project/Multitask execution layer. See wann-intentions.ts
 * comment block for the full design rationale.
 * ============================================================ */
export type Intention = Tables<"planner_intentions">;

export async function fetchIntentions(_userId: string): Promise<Intention[]> {
  const { data, error } = await supabase
    .from("planner_intentions")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Core recurrence pattern match: does `dateStr` line up with `recurrence`,
 * phased off `anchorDateStr`? Shared by taskOccursOn() (single-date test, for
 * virtual expansion) and generateSeriesOccurrenceDates() (range scan, for
 * materializing a "독립 모드" series' real Task rows).
 */
function matchesRecurrencePattern(anchorDateStr: string, recurrence: string, dateStr: string): boolean {
  const anchor = parseLocalDate(anchorDateStr);
  const target = parseLocalDate(dateStr);
  if (target < anchor) return false;
  if (recurrence === "none") return anchorDateStr === dateStr;
  const diffMs = target.getTime() - anchor.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (recurrence === "daily") return true;
  if (recurrence === "weekly") return diffDays % 7 === 0;
  if (recurrence === "biweekly") return diffDays % 14 === 0;
  if (recurrence === "monthly") return anchor.getDate() === target.getDate();
  return false;
}

/**
 * Returns true if a task (recurring or one-off) occurs on the given local date.
 */
export function taskOccursOn(task: Task, dateStr: string): boolean {
  if (!task.due_date) return false;
  return matchesRecurrencePattern(task.due_date, task.recurrence ?? "none", dateStr);
}

/**
 * All dates in (fromExclusiveStr, untilInclusiveStr] that match the given
 * recurrence pattern phased off anchorDateStr. Used to materialize a
 * "독립 모드" series' real Task rows — both on initial creation (from = the
 * day before anchor, so the anchor date itself is included) and on later
 * top-up (from = the series' current generated_until).
 */
export function generateSeriesOccurrenceDates(
  anchorDateStr: string,
  recurrence: string,
  fromExclusiveStr: string,
  untilInclusiveStr: string,
): string[] {
  const dates: string[] = [];
  const cursor = parseLocalDate(fromExclusiveStr);
  cursor.setDate(cursor.getDate() + 1);
  const until = parseLocalDate(untilInclusiveStr);
  while (cursor <= until) {
    const ds = formatLocalDate(cursor);
    if (matchesRecurrencePattern(anchorDateStr, recurrence, ds)) dates.push(ds);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function tasksOnDate(tasks: Task[], dateStr: string): Task[] {
  return tasks.filter((t) => taskOccursOn(t, dateStr));
}

export function isOccurrenceCompleted(
  task: Task,
  dateStr: string,
  completions: TaskCompletion[],
): boolean {
  if ((task.recurrence ?? "none") === "none") {
    return !!task.completed;
  }
  return completions.some((c) => c.task_id === task.id && c.occurrence_date === dateStr);
}

/** Does an event fall on the given local date (annual repeat if is_recurring). */
export function eventOccursOn(event: EventEntry, dateStr: string): boolean {
  if (event.is_recurring) {
    return event.date.slice(5) === dateStr.slice(5);
  }
  return event.date === dateStr;
}

export function eventsOnDate(events: EventEntry[], dateStr: string): EventEntry[] {
  return events.filter((e) => eventOccursOn(e, dateStr));
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayLocalStr(): string {
  return formatLocalDate(new Date());
}

export function daysUntilAnnual(dateStr: string, today = new Date()): number {
  const d = parseLocalDate(dateStr);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(t.getFullYear(), d.getMonth(), d.getDate());
  if (next < t) next = new Date(t.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((next.getTime() - t.getTime()) / 86400000);
}

export function ageOn(dateStr: string, today = new Date()): number {
  const d = parseLocalDate(dateStr);
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export function shortTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/* ---------- Korean weekday helpers ---------- */
export const KO_DOW = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "2026-08-17" -> "17/08/2026 (월)" */
export function formatDateKo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} (${KO_DOW[d.getDay()]})`;
}

/** "2026-08-17" -> "월" */
export function koDow(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return KO_DOW[d.getDay()];
}

/**
 * The occurrence date a task should be evaluated against "right now".
 * For one-off tasks this is the due date. For recurring tasks this is the most
 * recent occurrence on or before today (so checking off an occurrence sticks
 * until the next one comes around), all in LOCAL YYYY-MM-DD form.
 */
export function currentOccurrenceDate(task: Task, todayStr: string = todayLocalStr()): string {
  const rec = task.recurrence ?? "none";
  if (!task.due_date) return todayStr;
  if (rec === "none") return task.due_date;
  const anchor = parseLocalDate(task.due_date);
  const today = parseLocalDate(todayStr);
  if (anchor > today) return task.due_date;
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const s = formatLocalDate(d);
    if (taskOccursOn(task, s)) return s;
  }
  return task.due_date;
}

/** Sort key for list ordering: dated+timed first (chronological), then dated, then undated. */
export function taskSortKey(t: { due_date?: string | null; due_time?: string | null }): string {
  if (!t.due_date) return "9999-99-99 99:99";
  return `${t.due_date} ${t.due_time ? t.due_time.slice(0, 5) : "99:99"}`;
}

/* ---------- time span helpers (start ~ end time tasks) ---------- */

export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Duration in minutes between due_time and end_time, or null when no end time. */
export function taskDurationMin(task: { due_time?: string | null; end_time?: string | null }): number | null {
  const s = timeToMinutes(task.due_time);
  const e = timeToMinutes(task.end_time);
  if (s == null || e == null) return null;
  const d = e - s;
  return d > 0 ? d : null;
}

/** End time for a specific occurrence, keeping the task's original duration. */
export function occurrenceEndTime(
  task: { due_time?: string | null; end_time?: string | null },
  effectiveTime: string | null | undefined,
): string | null {
  const dur = taskDurationMin(task);
  const start = timeToMinutes(effectiveTime);
  if (dur == null || start == null) return null;
  return minutesToTime(start + dur);
}

/** Hex (#rgb / #rrggbb) → rgba() string at the given alpha. */
export function hexToRgba(hex: string | null | undefined, alpha: number): string | undefined {
  if (!hex) return undefined;
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return undefined;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return undefined;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* ---------- multi-day project (Multiple Task) span helpers ---------- */

/** Start/end of a project's date range. `date` is the start date, `end_date` the end. */
export function projectSpan(
  m: { date?: string | null; end_date?: string | null },
): { start: string; end: string } | null {
  const start = m.date ?? m.end_date ?? null;
  const end = m.end_date ?? m.date ?? null;
  if (!start || !end) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

/** True when the project covers more than one day. */
export function isMultiDayProject(m: { date?: string | null; end_date?: string | null }): boolean {
  const s = projectSpan(m);
  return !!s && s.start !== s.end;
}

/** Shift a YYYY-MM-DD date by n days (local). */
export function shiftDate(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatLocalDate(d);
}

/** Whole-day difference b - a. */
export function diffDays(a: string, b: string): number {
  return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86400000);
}

/* ---------- EVENT RECORDS (기록) — separate from the single `notes` field ---------- */
export type EventNote = Tables<"planner_event_notes">;

export async function fetchEventNotes(): Promise<EventNote[]> {
  const { data, error } = await supabase
    .from("planner_event_notes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Sort records: recurring events by year desc, D+day events by date desc. */
export function sortEventNotes(notes: EventNote[]): EventNote[] {
  return [...notes].sort((a, b) => {
    const ka = a.date ?? (a.year ? `${a.year}-12-31` : "");
    const kb = b.date ?? (b.year ? `${b.year}-12-31` : "");
    if (ka !== kb) return kb.localeCompare(ka);
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
}

/** Short one-line label for a record, e.g. "2026" or "D+291 · 8/17". */
export function eventNoteLabel(note: EventNote, event?: { date: string } | null): string {
  if (note.date) {
    const d = note.date;
    const md = `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
    if (event) return `D+${daysSince(event.date, parseLocalDate(d))} · ${md}`;
    return md;
  }
  return note.year ? String(note.year) : "";
}
