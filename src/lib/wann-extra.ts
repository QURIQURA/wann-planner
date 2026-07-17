import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Habit = Tables<"planner_habits">;
export type HabitCompletion = Tables<"planner_habit_completions">;
export type RoutineGroup = Tables<"planner_routine_groups">;
export type RoutineItem = Tables<"planner_routine_items">;
export type RoutineCompletion = Tables<"planner_routine_completions">;
export type HyattHours = Tables<"planner_monthly_hyatt_hours">;
export type KoraSetupItem = Tables<"planner_kora_setup_items">;
export type Alert = Tables<"planner_alerts">;
export type DiaryEntry = Tables<"planner_diary_entries">;
export type Sticker = Tables<"planner_stickers">;

/* ---------- HABITS ---------- */
export async function fetchHabits() {
  const { data, error } = await supabase.from("planner_habits").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function fetchHabitCompletionsRange(start: string, end: string) {
  const { data, error } = await supabase
    .from("planner_habit_completions")
    .select("*")
    .gte("date", start)
    .lte("date", end);
  if (error) throw error;
  return data ?? [];
}

/* ---------- ROUTINES ---------- */
export async function fetchRoutineGroups() {
  const { data, error } = await supabase.from("planner_routine_groups").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function fetchRoutineItems() {
  const { data, error } = await supabase.from("planner_routine_items").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}
export async function fetchRoutineCompletionsForDate(date: string) {
  const { data, error } = await supabase
    .from("planner_routine_completions")
    .select("*")
    .eq("date", date);
  if (error) throw error;
  return data ?? [];
}

/* ---------- MONTHLY ---------- */
export async function fetchHyattHours(month: string) {
  const { data, error } = await supabase
    .from("planner_monthly_hyatt_hours")
    .select("*")
    .eq("month", month)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertHyattHours(userId: string, month: string, hours: number) {
  const { error } = await supabase
    .from("planner_monthly_hyatt_hours")
    .upsert({ user_id: userId, month, hours }, { onConflict: "user_id,month" });
  if (error) throw error;
}
export async function fetchKoraSetup() {
  const { data, error } = await supabase
    .from("planner_kora_setup_items")
    .select("*")
    .order("category")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/* ---------- ALERTS ---------- */
export async function fetchAlerts() {
  const { data, error } = await supabase
    .from("planner_alerts")
    .select("*")
    .eq("resolved", false)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ---------- DIARY ---------- */
export async function fetchDiaryEntry(date: string) {
  const { data, error } = await supabase
    .from("planner_diary_entries")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertDiaryEntry(
  userId: string,
  date: string,
  content_html: string,
  preview: string,
  has_sticker: boolean,
  thumbnail_sticker_path: string | null,
) {
  const { error } = await supabase
    .from("planner_diary_entries")
    .upsert(
      { user_id: userId, date, content_html, preview, has_sticker, thumbnail_sticker_path },
      { onConflict: "user_id,date" },
    );
  if (error) throw error;
}
export async function fetchDiaryMonthPreviews(monthStart: string, monthEnd: string) {
  const { data, error } = await supabase
    .from("planner_diary_entries")
    .select("date,preview,has_sticker,thumbnail_sticker_path")
    .gte("date", monthStart)
    .lte("date", monthEnd);
  if (error) throw error;
  return data ?? [];
}
export async function fetchDiaryYearDates(yearStart: string, yearEnd: string) {
  const { data, error } = await supabase
    .from("planner_diary_entries")
    .select("date,has_sticker")
    .gte("date", yearStart)
    .lte("date", yearEnd);
  if (error) throw error;
  return data ?? [];
}
export async function fetchDiaryOnThisDay(mmdd: string) {
  // Postgres pattern match on ISO date suffix
  const { data, error } = await supabase
    .from("planner_diary_entries")
    .select("date,preview,has_sticker,thumbnail_sticker_path")
    .like("date", `%-${mmdd}`)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ---------- STICKERS ---------- */
export async function fetchStickers() {
  const { data, error } = await supabase
    .from("planner_stickers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function signStickerUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("stickers").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) throw error;
  return data.signedUrl;
}

/* Upload a file → crop to circle → webp → storage + row */
export async function uploadStickerFromFile(userId: string, file: File): Promise<Sticker> {
  const blob = await cropCircleWebp(file, 96);
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error: upErr } = await supabase.storage.from("stickers").upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("planner_stickers")
    .insert({ user_id: userId, storage_path: path })
    .select()
    .single();
  if (error) throw error;
  return data as Sticker;
}

async function cropCircleWebp(file: File, size: number): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const min = Math.min(img.width, img.height);
  const sx = (img.width - min) / 2;
  const sy = (img.height - min) / 2;
  ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
  ctx.restore();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/webp",
      0.8,
    );
  });
}
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/* Date helpers */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function monthBounds(year: number, month0: number) {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0);
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { start: fmt(start), end: fmt(end), days: end.getDate() };
}
