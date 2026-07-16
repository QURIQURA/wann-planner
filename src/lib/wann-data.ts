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

export type Category = Tables<"task_categories">;
export type Subtag = Tables<"task_subtags">;
export type Task = Tables<"tasks">;
export type SpecialDate = Tables<"special_dates">;

export async function fetchSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data as unknown as UserSettings;
  const { data: created, error: cErr } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select()
    .single();
  if (cErr) throw cErr;
  return created as unknown as UserSettings;
}

export async function updateSettings(userId: string, patch: Partial<UserSettings>) {
  const { error } = await supabase.from("user_settings").update(patch).eq("user_id", userId);
  if (error) throw error;
}

export async function fetchCategories(userId: string) {
  const { data, error } = await supabase
    .from("task_categories")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchSubtags(userId: string) {
  const { data, error } = await supabase.from("task_subtags").select("*").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTasks(userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSpecialDates(userId: string) {
  const { data, error } = await supabase.from("special_dates").select("*").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
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
