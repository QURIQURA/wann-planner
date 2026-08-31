/**
 * Group = a generic context/batch entity that Projects and standalone
 * ("Shared") Tasks can optionally belong to — e.g. a cake order made of
 * several Projects that all need "buy cream" once, a trip, a renovation.
 * Deliberately minimal: no date/end_date/color yet (see 2026-08-31 schema
 * discussion). Mirrors wann-events.ts's fetch pattern.
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
