import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type UserSettings = {
  user_id: string;
  bg_color: string;
  border_color: string;
  text_color: string;
  font: string;
  widget_visibility: {
    habit_tracker?: boolean;
    weekly_review?: boolean;
    monthly_summary?: boolean;
    cross_app_alerts?: boolean;
  };
};

export type Category = Tables<"planner_task_categories">;
export type Subtag = Tables<"planner_task_subtags">;
export type Task = Tables<"planner_tasks">;
export type MultipleTask = Tables<"planner_multiple_tasks">;
export type MultipleTaskItem = Tables<"planner_multiple_task_items">;
export type EventEntry = Tables<"planner_events">;
export type RecurringException = Tables<"planner_recurring_task_exceptions">;

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
};

/** Priority for showing a single border color when a date has multiple events. */
export const EVENT_PRIORITY = ["birthday", "anniversary", "holiday"] as const;

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
    .from("planner_multiple_task_items")
    .select("*")
    .order("sort_order", { ascending: true });
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

/**
 * Returns true if a task (recurring or one-off) occurs on the given local date.
 */
export function taskOccursOn(task: Task, dateStr: string): boolean {
  if (!task.due_date) return false;
  const anchor = parseLocalDate(task.due_date);
  const target = parseLocalDate(dateStr);
  if (target < anchor) return false;
  const rec = task.recurrence ?? "none";
  if (rec === "none") return task.due_date === dateStr;
  const diffMs = target.getTime() - anchor.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (rec === "daily") return true;
  if (rec === "weekly") return diffDays % 7 === 0;
  if (rec === "biweekly") return diffDays % 14 === 0;
  if (rec === "monthly") return anchor.getDate() === target.getDate();
  return false;
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
