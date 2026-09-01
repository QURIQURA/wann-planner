/**
 * Group = a generic context/batch entity that Projects and standalone
 * ("Shared") Tasks can optionally belong to — e.g. a cake order made of
 * several Projects that all need "buy cream" once, a trip, a renovation.
 * Deliberately minimal: no date/end_date yet. Has an optional `color`
 * column (nullable — user-set via the create/edit Group form); groupColor()
 * below is the deterministic fallback for Groups without one. Mirrors
 * wann-events.ts's fetch pattern.
 *
 * Hierarchy: GROUP (context/batch) > PROJECT (deliverable) > TASK (action).
 * A Task belongs to at most one of {multiple_task_id, group_id} — enforced
 * both by a DB CHECK constraint and by mutually-exclusive UI in TaskForm.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Group = Tables<"planner_groups">;

export async function fetchGroups(_userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from("planner_groups")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Deterministic, purely presentational fallback colour for a Group that
 * hasn't set its own `color` — a stable hash of the id into a small
 * palette. Used to visually bracket a Group's Projects together wherever
 * they're listed side by side (e.g. the Dashboard's Groups card), so the
 * relationship reads at a glance instead of just being a plain list.
 * Prefer `group.color ?? groupColor(group.id)` at call sites.
 */
export const GROUP_COLOR_PALETTE = [
  "#F87171", "#FB923C", "#FBBF24", "#4ADE80",
  "#22D3EE", "#818CF8", "#F472B6", "#A78BFA",
];

export function groupColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GROUP_COLOR_PALETTE[h % GROUP_COLOR_PALETTE.length];
}
