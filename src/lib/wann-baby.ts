import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type BabySlotType = Tables<"planner_baby_slot_types">;
export type BabySlotLog = Tables<"planner_baby_slot_logs">;

export async function fetchBabySlotTypes(): Promise<BabySlotType[]> {
  const { data, error } = await supabase
    .from("planner_baby_slot_types")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function fetchBabySlotLogs(date: string): Promise<BabySlotLog[]> {
  const { data, error } = await supabase
    .from("planner_baby_slot_logs")
    .select("*")
    .eq("date", date);
  if (error) throw error;
  return data ?? [];
}

export async function upsertBabySlotLog(args: {
  id?: string;
  userId: string;
  date: string;
  slotTypeId: string;
  startTime: string;
  endTime: string | null;
  note?: string | null;
}) {
  const row = {
    user_id: args.userId,
    date: args.date,
    slot_type_id: args.slotTypeId,
    start_time: args.startTime,
    end_time: args.endTime,
    note: args.note ?? null,
  };
  if (args.id) {
    const { error } = await supabase.from("planner_baby_slot_logs").update(row).eq("id", args.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("planner_baby_slot_logs")
    .upsert(row, { onConflict: "date,slot_type_id" });
  if (error) throw error;
}

export async function deleteBabySlotLog(id: string) {
  const { error } = await supabase.from("planner_baby_slot_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function addBabySlotType(args: {
  userId: string;
  name: string;
  tracksDuration: boolean;
  sortOrder: number;
}) {
  const { error } = await supabase.from("planner_baby_slot_types").insert({
    user_id: args.userId,
    name: args.name,
    tracks_duration: args.tracksDuration,
    sort_order: args.sortOrder,
  });
  if (error) throw error;
}

export async function updateBabySlotType(
  id: string,
  patch: Partial<Pick<BabySlotType, "name" | "tracks_duration" | "sort_order">>,
) {
  const { error } = await supabase.from("planner_baby_slot_types").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBabySlotType(id: string) {
  const { error } = await supabase.from("planner_baby_slot_types").delete().eq("id", id);
  if (error) throw error;
}

/** "1시간 30분" style duration label between two HH:MM(:SS) times. */
export function durationLabel(start: string, end: string): string {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(end) - toMin(start);
  if (diff < 0) diff += 24 * 60; // crossing midnight (night sleep)
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
}

export async function fetchBabySlotLogsRange(dates: string[]): Promise<BabySlotLog[]> {
  const { data, error } = await supabase
    .from("planner_baby_slot_logs")
    .select("*")
    .in("date", dates);
  if (error) throw error;
  return data ?? [];
}

/** Default pastel palette cycled for new slot types. */
export const BABY_SLOT_PALETTE = [
  "#C7B9E8",
  "#F7C9A9",
  "#A9D8C8",
  "#F3B9C6",
  "#B9CDEB",
  "#EBD9A9",
  "#D8B9E8",
  "#A9C9B0",
];

export function minutesOf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
