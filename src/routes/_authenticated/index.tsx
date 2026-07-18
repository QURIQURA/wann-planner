import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Settings as SettingsIcon, LogOut, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchSettings,
  updateSettings,
  fetchCategories,
  fetchSubtags,
  fetchTasks,
  fetchEvents,
  fetchMultipleTasks,
  fetchMultipleTaskItems,
  fetchCompletions,
  fetchExceptions,
  daysUntilAnnual,
  todayLocalStr,
  type UserSettings,
  type Task,
  type MultipleTaskItem,
} from "@/lib/wann-data";

import { useApplySettings } from "@/lib/use-apply-settings";
import { WeekRotation } from "@/components/wann/WeekRotation";
import { TasksPanel } from "@/components/wann/TasksPanel";
import { MultipleTasksPanel, type MultipleTaskForm } from "@/components/wann/MultipleTasksPanel";
import { EventsPanel, type EventForm } from "@/components/wann/EventsPanel";
import { SettingsPanel } from "@/components/wann/SettingsPanel";
import { HabitTrackerPanel } from "@/components/wann/HabitTrackerPanel";
import { RoutinesPanel } from "@/components/wann/RoutinesPanel";
import { MonthlySummaryPanel } from "@/components/wann/MonthlySummaryPanel";
import { AlertsPanel } from "@/components/wann/AlertsPanel";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext() as { user: { id: string; email?: string } };
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const settingsQ = useQuery({ queryKey: ["settings", user.id], queryFn: () => fetchSettings(user.id) });
  const categoriesQ = useQuery({ queryKey: ["categories", user.id], queryFn: () => fetchCategories(user.id) });
  const subtagsQ = useQuery({ queryKey: ["subtags", user.id], queryFn: () => fetchSubtags(user.id) });
  const tasksQ = useQuery({ queryKey: ["tasks", user.id], queryFn: () => fetchTasks(user.id) });
  const eventsQ = useQuery({ queryKey: ["events", user.id], queryFn: () => fetchEvents(user.id) });
  const multipleQ = useQuery({ queryKey: ["multiple_tasks", user.id], queryFn: () => fetchMultipleTasks(user.id) });
  const multipleItemsQ = useQuery({ queryKey: ["multiple_task_items", user.id], queryFn: () => fetchMultipleTaskItems(user.id) });
  const completionsQ = useQuery({ queryKey: ["completions", user.id], queryFn: () => fetchCompletions(user.id) });
  const exceptionsQ = useQuery({ queryKey: ["exceptions", user.id], queryFn: () => fetchExceptions(user.id) });

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

  const addSubtag = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const { error } = await supabase.from("planner_task_subtags").insert({ user_id: user.id, category_id: categoryId, name });
      if (error) throw error;
    },
    onSuccess: () => invalidate("subtags"),
  });

  const addTask = useMutation({
    mutationFn: async (input: import("@/components/wann/TasksPanel").TaskFormValues) => {
      const { error } = await supabase.from("planner_tasks").insert({
        user_id: user.id,
        title: input.title,
        category_id: input.categoryId,
        subtag_id: input.subtagId,
        due_date: input.dueDate,
        due_time: input.dueTime,
        recurrence: input.recurrence,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("tasks"),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: import("@/components/wann/TasksPanel").TaskFormValues }) => {
      const { error } = await supabase.from("planner_tasks").update({
        title: input.title,
        category_id: input.categoryId,
        subtag_id: input.subtagId,
        due_date: input.dueDate,
        due_time: input.dueTime,
        recurrence: input.recurrence,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("tasks"),
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
        const patch: { due_date: string; due_time?: string | null } = { due_date: newDate };
        if (newTime !== null) patch.due_time = newTime;
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
              ? { ...t, due_date: vars.newDate, due_time: vars.newTime ?? t.due_time }
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
        date: v.date,
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
        date: patch.date,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("multiple_tasks"),
  });

  const deleteMultiple = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_multiple_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate("multiple_tasks"); invalidate("multiple_task_items"); },
  });

  const addMultipleItem = useMutation({
    mutationFn: async ({ parentId, title }: { parentId: string; title: string }) => {
      const siblings = (multipleItemsQ.data ?? []).filter((i) => i.parent_id === parentId);
      const { error } = await supabase.from("planner_multiple_task_items").insert({
        parent_id: parentId,
        title,
        sort_order: siblings.length,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("multiple_task_items"),
  });

  const updateMultipleItem = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("planner_multiple_task_items").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("multiple_task_items"),
  });

  const toggleMultipleItem = useMutation({
    mutationFn: async (item: MultipleTaskItem) => {
      const { error } = await supabase
        .from("planner_multiple_task_items")
        .update({ completed: !item.completed })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("multiple_task_items"),
  });

  const deleteMultipleItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_multiple_task_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("multiple_task_items"),
  });

  // --- Events ---
  const addEvent = useMutation({
    mutationFn: async (v: EventForm) => {
      const { error } = await supabase.from("planner_events").insert({
        user_id: user.id,
        name: v.name,
        date: v.date,
        type: v.type,
        notes: v.notes || null,
        is_recurring: v.is_recurring,
        birth_year: v.birth_year,
      });
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
        notes: patch.notes || null,
        is_recurring: patch.is_recurring,
        birth_year: patch.birth_year,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("events"),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("events"),
  });

  const upcoming = useMemo(() => {
    return (eventsQ.data ?? [])
      .map((e) => ({ e, dd: e.is_recurring ? daysUntilAnnual(e.date) : Infinity }))
      .filter((x) => x.dd <= 14)
      .sort((a, b) => a.dd - b.dd);
  }, [eventsQ.data]);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  };

  useEffect(() => {
    document.title = "WANN Weekly OS";
  }, []);

  if (!settingsQ.data) {
    return <div className="min-h-screen flex items-center justify-center label-caps text-muted-foreground">Loading</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="label-caps text-muted-foreground">WANN</p>
            <h1 className="text-lg font-light tracking-tight">Weekly OS</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/diary"
              className="border border-border p-2 hover:bg-muted flex items-center gap-1"
              aria-label="Diary"
            >
              <BookOpen size={14} />
              <span className="label-caps hidden sm:inline">Diary</span>
            </Link>
            <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
            <button
              onClick={() => setSettingsOpen(true)}
              className="border border-border p-2 hover:bg-muted"
              aria-label="Settings"
            >
              <SettingsIcon size={14} />
            </button>
            <button
              onClick={handleSignOut}
              className="border border-border p-2 hover:bg-muted"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {upcoming.length > 0 && (
        <div className="border-b border-border bg-muted">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
            <span className="label-caps">Upcoming</span>
            {upcoming.slice(0, 4).map(({ e, dd }) => (
              <span key={e.id} className="text-sm">
                {e.name}
                <span className="text-muted-foreground"> · {e.type}</span>
                <span className="ml-2 border border-border px-1 label-caps text-[10px]">
                  {dd === 0 ? "TODAY" : `D-${dd}`}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        <WeekRotation
          anchorDate={anchor}
          onAnchorChange={setAnchor}
          tasks={tasksQ.data ?? []}
          categories={categoriesQ.data ?? []}
          events={eventsQ.data ?? []}
          completions={completionsQ.data ?? []}
          multipleTasks={multipleQ.data ?? []}
          multipleTaskItems={multipleItemsQ.data ?? []}
          onOpenMultiple={(id) => {
            const el = document.getElementById(`mt-${id}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-2", "ring-foreground");
              setTimeout(() => el.classList.remove("ring-2", "ring-foreground"), 1500);
            }
          }}
          onToggleOccurrence={(task, date) => toggleOccurrence.mutate({ task, date })}
          onEditTask={(t) => setEditingTask(t)}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <section className="card-flat p-4">
            <TasksPanel
              categories={categoriesQ.data ?? []}
              subtags={subtagsQ.data ?? []}
              tasks={tasksQ.data ?? []}
              completions={completionsQ.data ?? []}
              editingTask={editingTask}
              onCancelEdit={() => setEditingTask(null)}
              onAddCategory={(name, color) => addCategory.mutate({ name, color })}
              onAddSubtag={(categoryId, name) => addSubtag.mutate({ categoryId, name })}
              onAddTask={(v) => addTask.mutate(v)}
              onUpdateTask={(id, v) => updateTask.mutate({ id, input: v })}
              onToggleTask={(t) => toggleOccurrence.mutate({ task: t, date: todayLocalStr() })}
              onEditTask={(t) => setEditingTask(t)}
              onDeleteTask={(id) => { if (editingTask?.id === id) setEditingTask(null); deleteTask.mutate(id); }}
              onDeleteCategory={(id) => deleteCategory.mutate(id)}
            />
          </section>

          <section className="card-flat p-4 space-y-8">
            <MultipleTasksPanel
              entries={multipleQ.data ?? []}
              items={multipleItemsQ.data ?? []}
              categories={categoriesQ.data ?? []}
              onAdd={(v) => addMultiple.mutate(v)}
              onUpdate={(id, patch) => updateMultiple.mutate({ id, patch })}
              onDelete={(id) => deleteMultiple.mutate(id)}
              onAddItem={(parentId, title) => addMultipleItem.mutate({ parentId, title })}
              onUpdateItem={(id, title) => updateMultipleItem.mutate({ id, title })}
              onToggleItem={(item) => toggleMultipleItem.mutate(item)}
              onDeleteItem={(id) => deleteMultipleItem.mutate(id)}
            />
            <EventsPanel
              entries={eventsQ.data ?? []}
              onAdd={(v) => addEvent.mutate(v)}
              onUpdate={(id, patch) => updateEvent.mutate({ id, patch })}
              onDelete={(id) => deleteEvent.mutate(id)}
            />
          </section>
        </div>

        <HabitTrackerPanel userId={user.id} anchorDate={anchor} />

        <div className="grid md:grid-cols-2 gap-6">
          <RoutinesPanel userId={user.id} />
          <AlertsPanel userId={user.id} />
        </div>

        <MonthlySummaryPanel userId={user.id} />
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settingsQ.data}
          onChange={(patch) => settingsMutation.mutate(patch)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
