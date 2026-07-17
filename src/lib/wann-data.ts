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
export type Task = Tables<"tasks">;
export type SpecialDate = Tables<"planner_special_dates">;

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

export async function fetchSpecialDates(_userId: string) {
  const { data, error } = await supabase.from("planner_special_dates").select("*");
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
    .from("planner_task_completions" as never)
    .select("*");
  if (error) throw error;
  return (data ?? []) as unknown as TaskCompletion[];
}


/**
 * Returns true if a task (recurring or one-off) occurs on the given local date.
 * Recurrence rules are evaluated against `task.due_date` as the anchor/start date.
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

/** Expand tasks to those occurring on a given local YYYY-MM-DD date. */
export function tasksOnDate(tasks: Task[], dateStr: string): Task[] {
  return tasks.filter((t) => taskOccursOn(t, dateStr));
}

/** Is this specific occurrence completed? */
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


/** Parse a YYYY-MM-DD string into a local-timezone Date at midnight. */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Format a Date as YYYY-MM-DD in local timezone. */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Local today as YYYY-MM-DD. */
export function todayLocalStr(): string {
  return formatLocalDate(new Date());
}

/** Days from today to next occurrence of a MM-DD date (annual). */
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

/** "HH:MM" from a Postgres time string (which may be "HH:MM:SS"). */
export function shortTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}
