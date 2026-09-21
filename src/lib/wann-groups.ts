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

/**
 * Fixed product lines for the Dashboard's Product Line cards. Manually
 * tagged onto a Group via its `product_line` column (see GroupsPanel's
 * create/edit form) — deliberately not inferred from the name, so
 * ambiguous/renamed groups don't silently jump lines.
 */
export type ProductLine = {
  key: string;
  label: string;
  /** First real week/launch date — used for the countdown before any Group
   * exists yet for this line. Weekly Surprise Cake is already running, so
   * it has none. */
  launchDate: string | null;
};

export const PRODUCT_LINES: ProductLine[] = [
  { key: "weekly_cake", label: "Weekly Surprise Cake", launchDate: null },
  { key: "chiffon", label: "딸기·카카오 시폰 케이크", launchDate: "2026-11-14" },
  { key: "confectionery", label: "컨펙셔너리 박스", launchDate: "2026-12-12" },
];

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

/**
 * Extracts "N" out of a name like "CAKE WEEK5" / "week 5" — deliberately
 * requires the literal word "week" so it never misfires on an unrelated
 * group whose name happens to contain a digit (e.g. an order for a
 * 2-tier cake). Returns null when the name doesn't match.
 */
export function weekNumber(name: string): number | null {
  const m = name.match(/week\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Shared ordering for "recent Group first": recurring weekly instances
 * (whose name embeds a week number) sort by that number — the label the
 * business actually thinks in — since generated dates on backfilled/test
 * data don't reliably track it. Anything else falls back to its latest
 * linked date, then created_at.
 */
export function compareGroupsRecency(
  a: { name: string; created_at: string; latestDate: string | null },
  b: { name: string; created_at: string; latestDate: string | null },
): number {
  const wa = weekNumber(a.name);
  const wb = weekNumber(b.name);
  if (wa !== null && wb !== null && wa !== wb) return wb - wa;
  if (wa !== null && wb === null) return -1;
  if (wa === null && wb !== null) return 1;
  const da = a.latestDate ?? "0000-00-00";
  const db = b.latestDate ?? "0000-00-00";
  if (da !== db) return db.localeCompare(da);
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
}
