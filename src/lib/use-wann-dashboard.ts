import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchSettings,
  updateSettings,
  fetchCategories,
  fetchSubtags,
  fetchTasks,
  fetchEvents,
  fetchEventNotes,
  fetchMultipleTasks,
  fetchMultipleTaskItems,
  fetchCompletions,
  fetchExceptions,
  fetchIntentions,
  fetchEventTypes,
  daysUntilAnnual,
  isDPlusEvent,
  DPLUS_TYPE,
  taskDurationMin,
  timeToMinutes,
  minutesToTime,
  todayLocalStr,
  type UserSettings,
  type Task,
  type MultipleTaskItem,
  type Intention,
} from "@/lib/wann-data";
import {
  nextReviewDateForKeep,
  nextReviewDateForSnooze,
  dueOrOverdueIntentions,
  type ReviewInterval,
} from "@/lib/wann-intentions";

import { fetchGroups } from "@/lib/wann-groups";

import {
  fetchHabits,
  fetchHabitCompletionsRange,
  setHabitCount,
  cycleHabitCount,
  type Habit,
} from "@/lib/wann-extra";
import { replaceSubitems } from "@/lib/wann-subitems";
import { useApplySettings } from "@/lib/use-apply-settings";
import { orderedWidgets, isWidgetVisible, type WidgetContext } from "@/lib/widgets";
import type { MultipleTaskForm } from "@/components/wann/MultipleTasksPanel";
import type { TaskFormValues } from "@/components/wann/TaskForm";
import type { EventForm, EventNoteInput } from "@/components/wann/EventsPanel";

/**
 * Everything the Dashboard (Quick Add + Timeline) and the /widgets page need:
 * every query, every mutation, and the assembled WidgetContext. Both routes
 * call this ONE hook so they always share the same underlying data/actions —
 * editing an Event in Widgets is instantly reflected in the Dashboard Timeline
 * and vice versa, because both read from the same TanStack Query cache.
 *
 * This is a pure relocation of what used to live inline in the Dashboard
 * route component — no data-fetching or mutation logic changed.
 */
export function useWannDashboard(
  user: { id: string; email?: string },
  opts: { initialDate?: string } = {},
) {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(() => {
    if (opts.initialDate) {
      const [y, m, d] = opts.initialDate.split("-").map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const settingsQ = useQuery({ queryKey: ["settings", user.id], queryFn: () => fetchSettings(user.id) });
  const categoriesQ = useQuery({ queryKey: ["categories", user.id], queryFn: () => fetchCategories(user.id) });
  const subtagsQ = useQuery({ queryKey: ["subtags", user.id], queryFn: () => fetchSubtags(user.id) });
  const tasksQ = useQuery({ queryKey: ["tasks", user.id], queryFn: () => fetchTasks(user.id) });
  const eventsQ = useQuery({ queryKey: ["events", user.id], queryFn: () => fetchEvents(user.id) });
  const eventNotesQ = useQuery({ queryKey: ["event_notes", user.id], queryFn: fetchEventNotes });
  const eventTypesQ = useQuery({ queryKey: ["event_types"], queryFn: () => fetchEventTypes(user.id) });
  const multipleQ = useQuery({ queryKey: ["multiple_tasks", user.id], queryFn: () => fetchMultipleTasks(user.id) });
  const multipleItemsQ = useQuery({ queryKey: ["multiple_task_items", user.id], queryFn: () => fetchMultipleTaskItems(user.id) });
  const completionsQ = useQuery({ queryKey: ["completions", user.id], queryFn: () => fetchCompletions(user.id) });
  const exceptionsQ = useQuery({ queryKey: ["exceptions", user.id], queryFn: () => fetchExceptions(user.id) });
  const intentionsQ = useQuery({ queryKey: ["intentions", user.id], queryFn: () => fetchIntentions(user.id) });
  const groupsQ = useQuery({ queryKey: ["groups", user.id], queryFn: () => fetchGroups(user.id) });

  const habitRange = useMemo(() => {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const start = new Date(anchor); start.setDate(start.getDate() - 8);
    const end = new Date(anchor); end.setDate(end.getDate() + 8);
    return { start: fmt(start), end: fmt(end) };
  }, [anchor]);
  const habitsQ = useQuery({ queryKey: ["habits"], queryFn: fetchHabits });
  const habitCompQ = useQuery({
    queryKey: ["habit_comp", habitRange.start, habitRange.end],
    queryFn: () => fetchHabitCompletionsRange(habitRange.start, habitRange.end),
  });

  const tapHabit = useMutation({
    mutationFn: async ({ habit, date }: { habit: Habit; date: string }) => {
      const existing = (habitCompQ.data ?? []).find((c) => c.habit_id === habit.id && c.date === date);
      const target = Math.max(1, habit.target_count ?? 1);
      await setHabitCount({
        habitId: habit.id,
        userId: user.id,
        date,
        existingId: existing?.id,
        count: cycleHabitCount(existing?.count ?? 0, target),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_comp"] }),
    onError: () => toast.error("Could not update habit"),
  });

  useApplySettings(settingsQ.data);

  const settingsMutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) => updateSettings(user.id, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["settings", user.id] });
      const prev = qc.getQueryData<UserSettings>(["settings", user.id]);
      if (prev) qc.setQueryData(["settings", user.id], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["settings", user.id], ctx.prev);
      toast.error("Could not save settings");
    },
  });

  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key, user.id] });

  const addCategory = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const sort = (categoriesQ.data?.length ?? 0);
      const { error } = await supabase.from("planner_task_categories").insert({ user_id: user.id, name, color, sort_order: sort });
      if (error) throw error;
    },
    onSuccess: () => invalidate("categories"),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_task_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate("categories"); invalidate("subtags"); invalidate("tasks"); },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase.from("planner_task_categories").update({ name, color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("categories"),
  });

  const addSubtag = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const { error } = await supabase.from("planner_task_subtags").insert({ user_id: user.id, category_id: categoryId, name });
      if (error) throw error;
    },
    onSuccess: () => invalidate("subtags"),
  });

  const updateSubtag = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("planner_task_subtags").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("subtags"),
  });

  const deleteSubtag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_task_subtags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate("subtags"); invalidate("tasks"); invalidate("multiple_tasks"); },
    onError: () => toast.error("Could not delete subcategory"),
  });


  const addTask = useMutation({
    mutationFn: async (input: TaskFormValues) => {
      const primaryCategoryId = input.categoryIds[0] ?? null;
      let projectId = input.projectId;
      if (input.newProject && input.newProject.name) {
        const { data, error: pErr } = await supabase
          .from("planner_multiple_tasks")
          .insert({
            user_id: user.id,
            name: input.newProject.name,
            category_id: primaryCategoryId,
            subtag_id: input.subtagId,
            date: input.newProject.startDate,
            end_date: input.newProject.endDate,
          })
          .select("id")
          .single();
        if (pErr) throw pErr;
        projectId = data.id;
      }
      const { data: created, error } = await supabase.from("planner_tasks").insert({
        user_id: user.id,
        title: input.title,
        category_id: primaryCategoryId,
        category_ids: input.categoryIds,
        subtag_id: input.subtagId,
        due_date: input.dueDate,
        due_time: input.dueTime,
        end_time: input.dueTime ? input.endTime : null,
        recurrence: input.recurrence,
        multiple_task_id: projectId,
        group_id: projectId ? null : input.groupId,
        is_critical: input.isCritical,
      }).select("id").single();
      if (error) throw error;
      if (input.subitems?.length) await replaceSubitems(created.id, input.subitems);
    },
    onSuccess: () => {
      invalidate("tasks"); invalidate("multiple_tasks"); invalidate("multiple_task_items");
      qc.invalidateQueries({ queryKey: ["task-subitems"] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TaskFormValues }) => {
      const primaryCategoryId = input.categoryIds[0] ?? null;
      let projectId = input.projectId;
      if (input.newProject && input.newProject.name) {
        const { data, error: pErr } = await supabase
          .from("planner_multiple_tasks")
          .insert({
            user_id: user.id,
            name: input.newProject.name,
            category_id: primaryCategoryId,
            subtag_id: input.subtagId,
            date: input.newProject.startDate,
            end_date: input.newProject.endDate,
          })
          .select("id")
          .single();
        if (pErr) throw pErr;
        projectId = data.id;
      }
      const { error } = await supabase.from("planner_tasks").update({
        title: input.title,
        category_id: primaryCategoryId,
        category_ids: input.categoryIds,
        subtag_id: input.subtagId,
        due_date: input.dueDate,
        due_time: input.dueTime,
        end_time: input.dueTime ? input.endTime : null,
        recurrence: input.recurrence,
        multiple_task_id: projectId,
        group_id: projectId ? null : input.groupId,
        is_critical: input.isCritical,
      }).eq("id", id);
      if (error) throw error;
      await replaceSubitems(id, input.subitems ?? []);
    },
    onSuccess: () => {
      invalidate("tasks"); invalidate("multiple_tasks"); invalidate("multiple_task_items");
      qc.invalidateQueries({ queryKey: ["task-subitems"] });
    },
  });


  const toggleOccurrence = useMutation({
    mutationFn: async ({ task, date }: { task: Task; date: string }) => {
      const completions = completionsQ.data ?? [];
      const existing = completions.find(
        (c) => c.task_id === task.id && c.occurrence_date === date,
      );
      if ((task.recurrence ?? "none") === "none") {
        const completed = !task.completed;
        const { error } = await supabase
          .from("planner_tasks")
          .update({ completed, completed_at: completed ? new Date().toISOString() : null })
          .eq("id", task.id);
        if (error) throw error;
        return;
      }
      if (existing) {
        const { error } = await supabase
          .from("planner_task_completions")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("planner_task_completions")
          .insert({ task_id: task.id, user_id: user.id, occurrence_date: date });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate("completions"); invalidate("tasks"); },
  });

  const moveTask = useMutation({
    mutationFn: async ({
      task,
      originalDate,
      newDate,
      newTime,
    }: {
      task: Task;
      originalDate: string;
      newDate: string;
      newTime: string | null;
    }) => {
      const rec = task.recurrence ?? "none";
      if (rec === "none") {
        const patch: { due_date: string; due_time?: string | null; end_time?: string | null } = {
          due_date: newDate,
        };
        if (newTime !== null) {
          patch.due_time = newTime;
          // keep the start–end duration intact when the task is dragged
          const dur = taskDurationMin(task);
          if (dur != null) {
            const start = timeToMinutes(newTime);
            patch.end_time = start != null ? minutesToTime(start + dur) : task.end_time;
          }
        }
        const { error } = await supabase.from("planner_tasks").update(patch).eq("id", task.id);
        if (error) throw error;
        return;
      }
      // Recurring: upsert per-occurrence exception
      const finalTime = newTime ?? task.due_time ?? null;
      const { error } = await supabase
        .from("planner_recurring_task_exceptions")
        .upsert(
          { task_id: task.id, original_date: originalDate, new_date: newDate, new_time: finalTime },
          { onConflict: "task_id,original_date" },
        );
      if (error) throw error;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["tasks", user.id] });
      await qc.cancelQueries({ queryKey: ["exceptions", user.id] });
      const prevTasks = qc.getQueryData<Task[]>(["tasks", user.id]);
      const prevExc = qc.getQueryData<import("@/lib/wann-data").RecurringException[]>(["exceptions", user.id]);
      const rec = vars.task.recurrence ?? "none";
      if (rec === "none" && prevTasks) {
        qc.setQueryData<Task[]>(
          ["tasks", user.id],
          prevTasks.map((t) =>
            t.id === vars.task.id
              ? {
                  ...t,
                  due_date: vars.newDate,
                  due_time: vars.newTime ?? t.due_time,
                  end_time: (() => {
                    const dur = taskDurationMin(t);
                    const start = timeToMinutes(vars.newTime ?? t.due_time);
                    return vars.newTime && dur != null && start != null
                      ? minutesToTime(start + dur)
                      : t.end_time;
                  })(),
                }
              : t,
          ),
        );
      } else if (prevExc) {
        const finalTime = vars.newTime ?? vars.task.due_time ?? null;
        const other = prevExc.filter(
          (e) => !(e.task_id === vars.task.id && e.original_date === vars.originalDate),
        );
        qc.setQueryData(["exceptions", user.id], [
          ...other,
          {
            id: `optimistic-${vars.task.id}-${vars.originalDate}`,
            task_id: vars.task.id,
            original_date: vars.originalDate,
            new_date: vars.newDate,
            new_time: finalTime,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      return { prevTasks, prevExc };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevTasks) qc.setQueryData(["tasks", user.id], ctx.prevTasks);
      if (ctx?.prevExc) qc.setQueryData(["exceptions", user.id], ctx.prevExc);
      toast.error("Could not move task");
    },
    onSettled: () => { invalidate("tasks"); invalidate("exceptions"); },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("tasks"),
  });

  // --- Multiple Tasks ---
  const addMultiple = useMutation({
    mutationFn: async (v: MultipleTaskForm) => {
      const { error } = await supabase.from("planner_multiple_tasks").insert({
        user_id: user.id,
        name: v.name,
        category_id: v.categoryId,
        subtag_id: v.subtagId,
        date: v.date,
        end_date: v.endDate,
        group_id: v.groupId,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("multiple_tasks"),
  });

  const updateMultiple = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: MultipleTaskForm }) => {
      const { error } = await supabase.from("planner_multiple_tasks").update({
        name: patch.name,
        category_id: patch.categoryId,
        subtag_id: patch.subtagId,
        date: patch.date,
        end_date: patch.endDate,
        group_id: patch.groupId,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("multiple_tasks"),
  });

  /** Drag/resize of a multi-day project bar in This Week. */
  const moveProject = useMutation({
    mutationFn: async ({ id, date, endDate }: { id: string; date: string; endDate: string }) => {
      const { error } = await supabase
        .from("planner_multiple_tasks")
        .update({ date, end_date: endDate })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, date, endDate }) => {
      await qc.cancelQueries({ queryKey: ["multiple_tasks", user.id] });
      const prev = qc.getQueryData<Array<Record<string, unknown>>>(["multiple_tasks", user.id]);
      if (prev) {
        qc.setQueryData(
          ["multiple_tasks", user.id],
          prev.map((m) => (m.id === id ? { ...m, date, end_date: endDate } : m)),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["multiple_tasks", user.id], ctx.prev);
      toast.error("Could not move project");
    },
    onSettled: () => invalidate("multiple_tasks"),
  });

  /** Drag of an all-day event onto another day card. */
  const moveEvent = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase.from("planner_events").update({ date }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, date }) => {
      await qc.cancelQueries({ queryKey: ["events", user.id] });
      const prev = qc.getQueryData<Array<Record<string, unknown>>>(["events", user.id]);
      if (prev) {
        qc.setQueryData(
          ["events", user.id],
          prev.map((e) => (e.id === id ? { ...e, date } : e)),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["events", user.id], ctx.prev);
      toast.error("Could not move event");
    },
    onSettled: () => invalidate("events"),
  });


  const deleteMultiple = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_multiple_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate("multiple_tasks"); invalidate("multiple_task_items"); },
  });

  // --- Groups (generic context/batch above Project — e.g. a cake order made
  // of several Projects, or a "Shared Task" belonging directly to the Group).
  // Deleting a Group unlinks its Projects (group_id -> NULL, ON DELETE SET
  // NULL) but CASCADE-deletes its direct Shared Tasks (ON DELETE CASCADE),
  // matching the existing multiple_task_id CASCADE precedent. */
  const addGroup = useMutation({
    mutationFn: async (v: { name: string; notes: string | null; color?: string | null }) => {
      const { error } = await supabase.from("planner_groups").insert({
        user_id: user.id,
        name: v.name,
        notes: v.notes,
        color: v.color ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("groups"),
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { name: string; notes: string | null; color?: string | null } }) => {
      const { error } = await supabase.from("planner_groups").update({
        name: patch.name,
        notes: patch.notes,
        color: patch.color ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("groups"),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_groups").delete().eq("id", id);
      if (error) throw error;
    },
    // The DB handles unlinking Projects (SET NULL) and cascading Shared Task
    // deletes; refresh every query that could be affected.
    onSuccess: () => { invalidate("groups"); invalidate("multiple_tasks"); invalidate("tasks"); },
  });

  // Links/unlinks an EXISTING Project to a Group — a single-column group_id
  // update, same shape as moveProject's targeted date/end_date update. Never
  // touches the Project's name/category/date/tasks, so its id, Tasks,
  // completions and progress are all completely unaffected.
  const setProjectGroup = useMutation({
    mutationFn: async ({ projectId, groupId }: { projectId: string; groupId: string | null }) => {
      const { error } = await supabase
        .from("planner_multiple_tasks")
        .update({ group_id: groupId })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => invalidate("multiple_tasks"),
  });

  const invalidateItems = () => { invalidate("multiple_task_items"); invalidate("tasks"); };

  const addMultipleItem = useMutation({
    mutationFn: async ({
      parentId,
      title,
      date,
      time,
    }: { parentId: string; title: string; date?: string | null; time?: string | null }) => {
      const parent = (multipleQ.data ?? []).find((m) => m.id === parentId);
      const { error } = await supabase.from("planner_tasks").insert({
        user_id: user.id,
        title,
        multiple_task_id: parentId,
        category_id: parent?.category_id ?? null,
        category_ids: parent?.category_id ? [parent.category_id] : [],
        subtag_id: parent?.subtag_id ?? null,
        due_date: date ?? null,
        due_time: time ?? null,
        recurrence: "none",
        completed: false,
      });
      if (error) throw error;
    },
    onSuccess: invalidateItems,
  });

  const updateMultipleItem = useMutation({
    mutationFn: async ({
      id,
      title,
      date,
      time,
    }: { id: string; title?: string; date?: string | null; time?: string | null }) => {
      const patch: { title?: string; due_date?: string | null; due_time?: string | null } = {};
      if (title !== undefined) patch.title = title;
      if (date !== undefined) patch.due_date = date;
      if (time !== undefined) patch.due_time = time;
      const { error } = await supabase.from("planner_tasks").update(patch).eq("id", id);

      if (error) throw error;
    },
    onMutate: async ({ id, title, date, time }) => {
      await qc.cancelQueries({ queryKey: ["multiple_task_items", user.id] });
      await qc.cancelQueries({ queryKey: ["tasks", user.id] });
      const prevItems = qc.getQueryData<Task[]>(["multiple_task_items", user.id]);
      const prevTasks = qc.getQueryData<Task[]>(["tasks", user.id]);
      const apply = (t: Task): Task =>
        t.id === id
          ? {
              ...t,
              ...(title !== undefined ? { title } : {}),
              ...(date !== undefined ? { due_date: date } : {}),
              ...(time !== undefined ? { due_time: time } : {}),
            }
          : t;
      if (prevItems) qc.setQueryData<Task[]>(["multiple_task_items", user.id], prevItems.map(apply));
      if (prevTasks) qc.setQueryData<Task[]>(["tasks", user.id], prevTasks.map(apply));
      return { prevItems, prevTasks };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevItems) qc.setQueryData(["multiple_task_items", user.id], ctx.prevItems);
      if (ctx?.prevTasks) qc.setQueryData(["tasks", user.id], ctx.prevTasks);
      toast.error("Could not update item");
    },
    onSettled: invalidateItems,
  });

  const toggleMultipleItem = useMutation({
    mutationFn: async (item: MultipleTaskItem) => {
      const { error } = await supabase
        .from("planner_tasks")
        .update({
          completed: !item.completed,
          completed_at: !item.completed ? new Date().toISOString() : null,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: invalidateItems,
  });

  const deleteMultipleItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateItems,
  });


  // --- Events ---
  const addEvent = useMutation({
    mutationFn: async (v: EventForm) => {
      const { error } = await supabase.from("planner_events").insert({
        user_id: user.id,
        name: v.name,
        date: v.date,
        type: v.type,
        color: v.color,
        notes: v.notes || null,
        is_recurring: v.type === DPLUS_TYPE ? false : v.is_recurring,
        birth_year: v.birth_year,
        show_day_count: v.show_day_count,
        show_duration: v.show_duration,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("events"),
  });

  const toggleEventPin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("planner_events").update({ is_pinned: pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("events"),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: EventForm }) => {
      const { error } = await supabase.from("planner_events").update({
        name: patch.name,
        date: patch.date,
        type: patch.type,
        color: patch.color,
        notes: patch.notes || null,
        is_recurring: patch.type === DPLUS_TYPE ? false : patch.is_recurring,
        birth_year: patch.birth_year,
        show_day_count: patch.show_day_count,
        show_duration: patch.show_duration,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("events"),
  });

  // --- Custom Event Types (Custom Types only — system types are a code constant) ---
  const invalidateEventTypes = () => qc.invalidateQueries({ queryKey: ["event_types"] });

  const addEventType = useMutation({
    mutationFn: async ({ key, name, color }: { key: string; name: string; color: string }) => {
      const { error } = await supabase.from("planner_event_types").insert({
        user_id: user.id,
        key,
        name,
        default_color: color,
      });
      if (error) throw error;
    },
    onSuccess: invalidateEventTypes,
  });

  const renameEventType = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("planner_event_types").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateEventTypes,
  });

  const changeEventTypeColor = useMutation({
    mutationFn: async ({ id, color }: { id: string; color: string }) => {
      const { error } = await supabase.from("planner_event_types").update({ default_color: color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateEventTypes,
  });

  const archiveEventType = useMutation({
    mutationFn: async (id: string) => {
      // Archive-only — never hard delete, so existing Events referencing this
      // type keep resolving their colour via EVENT_COLORS/default_color fallback.
      const { error } = await supabase.from("planner_event_types").update({ is_archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateEventTypes,
  });

  // System Event Types (birthday/anniversary/holiday/dplus) have no DB row by
  // default — their colour is the EVENT_COLORS constant. Customizing one
  // upserts a row keyed by the system key so it's picked up by the same
  // resolveEventColor() lookup as a Custom Type's default_color; resetting
  // deletes that row again, so an untouched install still has zero rows.
  const setSystemEventTypeColor = useMutation({
    mutationFn: async ({ key, name, color }: { key: string; name: string; color: string }) => {
      const { error } = await supabase.from("planner_event_types").upsert(
        { user_id: user.id, key, name, default_color: color, is_system: true },
        { onConflict: "user_id,key" },
      );
      if (error) throw error;
    },
    onSuccess: invalidateEventTypes,
  });

  const resetSystemEventTypeColor = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("planner_event_types")
        .delete()
        .eq("user_id", user.id)
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: invalidateEventTypes,
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("events"),
  });

  // --- Event records (기록) ---
  const addEventNote = useMutation({
    mutationFn: async ({ eventId, v }: { eventId: string; v: EventNoteInput }) => {
      const { error } = await supabase.from("planner_event_notes").insert({
        event_id: eventId,
        year: v.year,
        date: v.date,
        note: v.note,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("event_notes"),
  });

  const updateEventNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.from("planner_event_notes").update({ note }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("event_notes"),
  });

  const deleteEventNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_event_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("event_notes"),
  });

  /* ---- Intentions (IDEA / LATER / GOAL + Review Timer) ---- */
  const addIntention = useMutation({
    mutationFn: async (title: string) => {
      // Fast capture: title only. Everything else (category/notes/review) is set up later.
      const { error } = await supabase.from("planner_intentions").insert({
        user_id: user.id,
        title,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("intentions"),
  });

  const updateIntention = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{
        title: string;
        notes: string | null;
        category_id: string | null;
        review_interval: ReviewInterval;
        review_interval_days: number | null;
      }>;
    }) => {
      // Setting/changing the Review Timer immediately (re)computes next_review_date from
      // today, calendar-safe — the same addCalendarInterval used by KEEP/SNOOZE.
      const fullPatch: Record<string, unknown> = { ...patch };
      if (patch.review_interval) {
        fullPatch.next_review_date = nextReviewDateForSnooze(
          patch.review_interval,
          patch.review_interval_days,
        );
      }
      const { error } = await supabase.from("planner_intentions").update(fullPatch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("intentions"),
  });

  const keepIntention = useMutation({
    mutationFn: async (intention: Intention) => {
      const next = nextReviewDateForKeep(intention);
      const { error } = await supabase
        .from("planner_intentions")
        .update({ next_review_date: next, last_reviewed_at: new Date().toISOString() })
        .eq("id", intention.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("intentions"),
  });

  const snoozeIntention = useMutation({
    mutationFn: async ({ intention, interval }: { intention: Intention; interval: ReviewInterval }) => {
      // SNOOZE only changes the date — the configured review_interval is left untouched.
      const next = nextReviewDateForSnooze(interval);
      const { error } = await supabase
        .from("planner_intentions")
        .update({ next_review_date: next, last_reviewed_at: new Date().toISOString() })
        .eq("id", intention.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("intentions"),
  });

  const promoteIntention = useMutation({
    mutationFn: async (intention: Intention) => {
      const next = intention.stage === "idea" ? "later" : "goal";
      const { error } = await supabase.from("planner_intentions").update({ stage: next }).eq("id", intention.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("intentions"),
  });

  const startProjectFromIntention = useMutation({
    mutationFn: async (intention: Intention) => {
      const { data, error } = await supabase
        .from("planner_multiple_tasks")
        .insert({
          user_id: user.id,
          name: intention.title,
          category_id: intention.category_id,
          date: todayLocalStr(),
        })
        .select()
        .single();
      if (error) throw error;
      const { error: linkErr } = await supabase
        .from("planner_intentions")
        .update({ linked_project_id: data.id, stage: "goal" })
        .eq("id", intention.id);
      if (linkErr) throw linkErr;
    },
    onSuccess: () => { invalidate("intentions"); invalidate("multiple_tasks"); },
  });

  const archiveIntention = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_intentions").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("intentions"),
  });

  const completeIntention = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_intentions").update({ status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("intentions"),
  });

  const deleteIntention = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_intentions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("intentions"),
  });

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-foreground");
      setTimeout(() => el.classList.remove("ring-2", "ring-foreground"), 1500);
    }
  };

  const dueReviews = useMemo(() => dueOrOverdueIntentions(intentionsQ.data ?? []), [intentionsQ.data]);

  const upcoming = useMemo(() => {
    return (eventsQ.data ?? [])
      .map((e) => ({
        e,
        dd: isDPlusEvent(e) ? -1 : e.is_recurring ? daysUntilAnnual(e.date) : Infinity,
      }))
      .filter((x) => x.dd <= 14 || x.e.is_pinned)
      // pinned events always lead the bar, regardless of D-day
      .sort((a, b) => Number(b.e.is_pinned) - Number(a.e.is_pinned) || a.dd - b.dd);
  }, [eventsQ.data]);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };

  useEffect(() => {
    document.title = "WANN Weekly OS";
  }, []);

  const settings = settingsQ.data;
  const visibleWidgets = settings
    ? orderedWidgets(settings.widget_order).filter((w) => isWidgetVisible(w, settings.widget_visibility))
    : [];

  const widgetCtx: WidgetContext = {
    userId: user.id,
    anchor,
    onAnchorChange: setAnchor,
    categories: categoriesQ.data ?? [],
    subtags: subtagsQ.data ?? [],
    tasks: tasksQ.data ?? [],
    completions: completionsQ.data ?? [],
    projects: multipleQ.data ?? [],
    projectItems: multipleItemsQ.data ?? [],
    events: eventsQ.data ?? [],
    eventNotes: eventNotesQ.data ?? [],
    eventTypes: eventTypesQ.data ?? [],
    editingTask,
    intentions: intentionsQ.data ?? [],
    groups: groupsQ.data ?? [],
    taskActions: {
      onCancelEdit: () => setEditingTask(null),
      onAddCategory: (name, color) => addCategory.mutate({ name, color }),
      onAddSubtag: (categoryId, name) => addSubtag.mutate({ categoryId, name }),
      onAddTask: (v) => addTask.mutate(v),
      onUpdateTask: (id, v) => updateTask.mutate({ id, input: v }),
      onToggleTask: (t, date) => toggleOccurrence.mutate({ task: t, date }),
      onEditTask: (t) => setEditingTask(t),
      onDeleteTask: (id) => {
        if (editingTask?.id === id) setEditingTask(null);
        deleteTask.mutate(id);
      },
      onDeleteCategory: (id) => deleteCategory.mutate(id),
      onUpdateCategory: (id, name, color) => updateCategory.mutate({ id, name, color }),
      onUpdateSubtag: (id, name) => updateSubtag.mutate({ id, name }),
      onDeleteSubtag: (id) => deleteSubtag.mutate(id),
    },
    projectActions: {
      onAdd: (v) => addMultiple.mutate(v),
      onUpdate: (id, patch) => updateMultiple.mutate({ id, patch }),
      onDelete: (id) => deleteMultiple.mutate(id),
      onAddItem: (parentId, title, date, time) => addMultipleItem.mutate({ parentId, title, date, time }),
      onUpdateItem: (id, patch) => updateMultipleItem.mutate({ id, ...patch }),
      onToggleItem: (item) => toggleMultipleItem.mutate(item),
      onDeleteItem: (id) => deleteMultipleItem.mutate(id),
    },
    eventActions: {
      onAdd: (v) => addEvent.mutate(v),
      onUpdate: (id, patch) => updateEvent.mutate({ id, patch }),
      onDelete: (id) => deleteEvent.mutate(id),
      onTogglePin: (id, pinned) => toggleEventPin.mutate({ id, pinned }),
      onAddNote: (eventId, v) => addEventNote.mutate({ eventId, v }),
      onUpdateNote: (id, note) => {
        if (note) updateEventNote.mutate({ id, note });
      },
      onDeleteNote: (id) => deleteEventNote.mutate(id),
    },
    eventTypeActions: {
      onCreate: (key, name, color) => addEventType.mutate({ key, name, color }),
      onRename: (id, name) => renameEventType.mutate({ id, name }),
      onChangeColor: (id, color) => changeEventTypeColor.mutate({ id, color }),
      onArchive: (id) => archiveEventType.mutate(id),
      onSetSystemColor: (key, label, color) => setSystemEventTypeColor.mutate({ key, name: label, color }),
      onResetSystemColor: (key) => resetSystemEventTypeColor.mutate(key),
    },
    groupActions: {
      onAdd: (v) => addGroup.mutate(v),
      onUpdate: (id, patch) => updateGroup.mutate({ id, patch }),
      onDelete: (id) => deleteGroup.mutate(id),
      onAddExistingProjectToGroup: (projectId, groupId) => setProjectGroup.mutate({ projectId, groupId }),
      onRemoveProjectFromGroup: (projectId) => setProjectGroup.mutate({ projectId, groupId: null }),
    },
    intentionActions: {
      onAdd: (title) => addIntention.mutate(title),
      onUpdate: (id, patch) => updateIntention.mutate({ id, patch }),
      onKeep: (intention) => keepIntention.mutate(intention),
      onSnooze: (intention, interval) => snoozeIntention.mutate({ intention, interval }),
      onPromote: (intention) => promoteIntention.mutate(intention),
      onStartProject: (intention) => startProjectFromIntention.mutate(intention),
      onArchive: (intention) => archiveIntention.mutate(intention.id),
      onComplete: (intention) => completeIntention.mutate(intention.id),
      onDelete: (id) => deleteIntention.mutate(id),
      onOpenLinkedProject: (projectId) => scrollToId(`mt-${projectId}`),
    },
  };

  return {
    qc,
    anchor,
    setAnchor,
    editingTask,
    setEditingTask,
    settings,
    settingsQ,
    settingsMutation,
    categoriesQ,
    subtagsQ,
    tasksQ,
    eventsQ,
    eventNotesQ,
    eventTypesQ,
    multipleQ,
    multipleItemsQ,
    completionsQ,
    exceptionsQ,
    intentionsQ,
    groupsQ,
    habitsQ,
    habitCompQ,
    tapHabit,
    toggleOccurrence,
    moveTask,
    moveProject,
    moveEvent,
    visibleWidgets,
    widgetCtx,
    dueReviews,
    upcoming,
    scrollToId,
    handleSignOut,
  };
}
