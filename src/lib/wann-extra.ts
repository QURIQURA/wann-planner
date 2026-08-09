import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Habit = Tables<"planner_habits">;
export type HabitCompletion = Tables<"planner_habit_completions">;
export type RoutineGroup = Tables<"planner_routine_groups">;
export type HyattHours = Tables<"planner_monthly_hyatt_hours">;
export type KoraSetupItem = Tables<"planner_kora_setup_items">;
export type DiaryEntry = Tables<"planner_diary_entries">;
export type Sticker = Tables<"planner_stickers">;
export type DiaryPhoto = Tables<"planner_diary_photos">;


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

/* ---------- DIARY PHOTOS ---------- */
export const MAX_DIARY_PHOTOS = 6;

export async function fetchDiaryPhotos(date: string) {
  const { data, error } = await supabase
    .from("planner_diary_photos")
    .select("*")
    .eq("date", date)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchDiaryPhotosRange(start: string, end: string) {
  const { data, error } = await supabase
    .from("planner_diary_photos")
    .select("*")
    .gte("date", start)
    .lte("date", end)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function signDiaryPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("diary-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadDiaryPhoto(
  userId: string,
  date: string,
  file: File,
  sortOrder: number,
  makeCover: boolean,
): Promise<DiaryPhoto> {
  const blob = await compressToWebp(file, 1600);
  const path = `${userId}/${date}/${crypto.randomUUID()}.webp`;
  const { error: upErr } = await supabase.storage.from("diary-photos").upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (upErr) throw upErr;
  if (makeCover) {
    await supabase.from("planner_diary_photos").update({ is_cover: false }).eq("date", date);
  }
  const { data, error } = await supabase
    .from("planner_diary_photos")
    .insert({ user_id: userId, date, storage_path: path, sort_order: sortOrder, is_cover: makeCover })
    .select()
    .single();
  if (error) throw error;
  return data as DiaryPhoto;
}

export async function setDiaryCoverPhoto(date: string, photoId: string) {
  const { error: clearErr } = await supabase
    .from("planner_diary_photos")
    .update({ is_cover: false })
    .eq("date", date);
  if (clearErr) throw clearErr;
  const { error } = await supabase
    .from("planner_diary_photos")
    .update({ is_cover: true })
    .eq("id", photoId);
  if (error) throw error;
}

export async function deleteDiaryPhoto(photo: DiaryPhoto) {
  const { error } = await supabase.from("planner_diary_photos").delete().eq("id", photo.id);
  if (error) throw error;
  await supabase.storage.from("diary-photos").remove([photo.storage_path]);
  if (photo.is_cover) {
    const rest = await fetchDiaryPhotos(photo.date);
    if (rest[0]) await setDiaryCoverPhoto(photo.date, rest[0].id);
  }
}

/** Downscale to max edge px and encode as webp. */
async function compressToWebp(file: File, maxEdge: number): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/webp", 0.82);
  });
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

/* ---------- DAY SUMMARY (read-only recap for diary) ---------- */
export type DaySummary = {
  tasks: Array<{ id: string; title: string; category: string | null; categoryColor: string | null }>;
  habits: Array<{ id: string; name: string; count: number; target: number }>;
  events: Array<{ id: string; name: string; type: string }>;
  multipleItems: Array<{ id: string; title: string; parent: string | null }>;
};

function localDateOf(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function fetchDaySummary(date: string): Promise<DaySummary> {
  const mmdd = date.slice(5);
  const [
    catsRes,
    tasksRes,
    completionsRes,
    habitsRes,
    habitLogsRes,
    eventsRes,
    mtItemsRes,
    mtRes,
  ] = await Promise.all([
    supabase.from("planner_task_categories").select("id,name,color"),
    supabase.from("planner_tasks").select("id,title,category_id,recurrence,completed,completed_at,due_date"),
    supabase.from("planner_task_completions").select("task_id").eq("occurrence_date", date),
    supabase.from("planner_habits").select("id,name,target_count"),
    supabase.from("planner_habit_completions").select("habit_id,count").eq("date", date),
    supabase.from("planner_events").select("id,name,type,date,is_recurring"),
    supabase
      .from("planner_tasks")
      .select("id,title,multiple_task_id,completed,completed_at")
      .not("multiple_task_id", "is", null)
      .eq("completed", true),

    supabase.from("planner_multiple_tasks").select("id,name"),
  ]);

  const err = [catsRes, tasksRes, completionsRes, habitsRes, habitLogsRes, eventsRes, mtItemsRes, mtRes]
    .find((r) => r.error);
  if (err?.error) throw err.error;

  const catById = new Map((catsRes.data ?? []).map((c) => [c.id, c]));
  const completedIds = new Set((completionsRes.data ?? []).map((c) => c.task_id));

  const tasks = (tasksRes.data ?? [])
    .filter((t) => {
      const rec = t.recurrence ?? "none";
      if (rec === "none") {
        if (!t.completed) return false;
        const when = t.completed_at ? localDateOf(t.completed_at) : t.due_date;
        return when === date;
      }
      return completedIds.has(t.id);
    })
    .map((t) => {
      const c = t.category_id ? catById.get(t.category_id) : null;
      return { id: t.id, title: t.title, category: c?.name ?? null, categoryColor: c?.color ?? null };
    });

  const habitById = new Map((habitsRes.data ?? []).map((h) => [h.id, h]));
  const habits = (habitLogsRes.data ?? [])
    .filter((l) => (l.count ?? 0) > 0 && habitById.has(l.habit_id))
    .map((l) => {
      const h = habitById.get(l.habit_id)!;
      return { id: h.id, name: h.name, count: l.count ?? 0, target: h.target_count ?? 1 };
    });

  const events = (eventsRes.data ?? [])
    .filter((e) => (e.is_recurring ? e.date.slice(5) === mmdd : e.date === date))
    .map((e) => ({ id: e.id, name: e.name, type: e.type }));

  const mtById = new Map((mtRes.data ?? []).map((m) => [m.id, m.name]));
  const multipleItems = (mtItemsRes.data ?? [])
    .filter((i) => (i.completed_at ? localDateOf(i.completed_at) === date : false))
    .map((i) => ({ id: i.id, title: i.title, parent: i.multiple_task_id ? mtById.get(i.multiple_task_id) ?? null : null }));


  return { tasks, habits, events, multipleItems };
}
