/**
 * Weekly cake production workflow — an ordered, per-user, fully editable
 * list of stages a Task can be tagged with (via a dropdown in TaskForm.tsx,
 * or the compact StageDot picker on a Project's checklist items — see
 * StageTracker.tsx). Managed from Settings > 단계 (see StageSettingsTab in
 * SettingsPanel.tsx) — add/rename/recolor/reorder/delete, all persisted to
 * the planner_cake_stages table.
 *
 * A Task's `stage` column stores a planner_cake_stages.id (uuid), never a
 * hardcoded key — so renaming or recoloring a stage never orphans already-
 * tagged Tasks, and deleting a stage is a real, visible action (Tasks
 * tagged with it just show "단계 없음" once it's gone).
 *
 * Deliberately NOT inferred from due dates or task titles: some content gets
 * posted later than the cycle it belongs to, and some ingredients get
 * ordered a week ahead, so date order and stage order can diverge. The
 * stage is always a deliberate choice made when the Task is created/edited.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Stage = Tables<"planner_cake_stages">;

export async function fetchStages(_userId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from("planner_cake_stages")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function stageLabel(stages: Stage[], id: string | null | undefined): string | null {
  if (!id) return null;
  return stages.find((s) => s.id === id)?.label ?? null;
}

/** Falls back to a neutral grey for an unset/deleted stage — callers should
 * generally check for null first (no dot at all) rather than render this,
 * but it keeps color lookups total. */
export function stageColorOf(stages: Stage[], id: string | null | undefined): string {
  if (!id) return "#9CA3AF";
  return stages.find((s) => s.id === id)?.color ?? "#9CA3AF";
}
