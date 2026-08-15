import { supabase } from "@/integrations/supabase/client";

/** A lightweight, task-scoped checklist line ("상세 항목"). */
export type TaskSubitem = {
  id: string;
  task_id: string;
  time: string | null;
  content: string;
  completed: boolean;
  sort_order: number;
};

/** Draft shape used by the task form before rows exist in the database. */
export type SubitemDraft = {
  id?: string;
  time: string | null;
  content: string;
  completed: boolean;
};

const COLS = "id, task_id, time, content, completed, sort_order";

export async function fetchAllSubitems(): Promise<TaskSubitem[]> {
  const { data, error } = await supabase
    .from("planner_task_subitems")
    .select(COLS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskSubitem[];
}

export async function fetchSubitemsForTask(taskId: string): Promise<TaskSubitem[]> {
  const { data, error } = await supabase
    .from("planner_task_subitems")
    .select(COLS)
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskSubitem[];
}

/** Replaces the whole subitem list of a task with the given drafts. */
export async function replaceSubitems(taskId: string, drafts: SubitemDraft[]) {
  const { error: delErr } = await supabase.from("planner_task_subitems").delete().eq("task_id", taskId);
  if (delErr) throw delErr;
  const rows = drafts
    .filter((d) => d.content.trim() !== "" || d.time)
    .map((d, i) => ({
      task_id: taskId,
      time: d.time,
      content: d.content.trim(),
      completed: d.completed,
      sort_order: i,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("planner_task_subitems").insert(rows);
  if (error) throw error;
}

export async function updateSubitem(
  id: string,
  patch: Partial<Pick<TaskSubitem, "time" | "content" | "completed" | "sort_order">>,
) {
  const { error } = await supabase.from("planner_task_subitems").update(patch).eq("id", id);
  if (error) throw error;
}

/** Sorts by time (untimed last), then by manual sort order. */
export function sortSubitems(items: TaskSubitem[]): TaskSubitem[] {
  return [...items].sort((a, b) => {
    if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : a.sort_order - b.sort_order;
    if (a.time) return -1;
    if (b.time) return 1;
    return a.sort_order - b.sort_order;
  });
}
