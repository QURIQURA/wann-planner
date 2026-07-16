import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Settings as SettingsIcon, LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchSettings,
  updateSettings,
  fetchCategories,
  fetchSubtags,
  fetchTasks,
  fetchSpecialDates,
  fetchCompletions,
  daysUntilAnnual,
  isOccurrenceCompleted,
  todayLocalStr,
  type UserSettings,
  type Task,
  type SpecialDate,
  type TaskCompletion,
} from "@/lib/wann-data";

import { useApplySettings } from "@/lib/use-apply-settings";
import { WeekRotation } from "@/components/wann/WeekRotation";
import { TasksPanel } from "@/components/wann/TasksPanel";
import { SpecialOccasionsPanel } from "@/components/wann/SpecialOccasionsPanel";
import { SettingsPanel } from "@/components/wann/SettingsPanel";

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
  const datesQ = useQuery({ queryKey: ["dates", user.id], queryFn: () => fetchSpecialDates(user.id) });

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
      const { error } = await supabase.from("task_categories").insert({ user_id: user.id, name, color, sort_order: sort });
      if (error) throw error;
    },
    onSuccess: () => invalidate("categories"),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate("categories"); invalidate("subtags"); invalidate("tasks"); },
  });

  const addSubtag = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: string; name: string }) => {
      const { error } = await supabase.from("task_subtags").insert({ user_id: user.id, category_id: categoryId, name });
      if (error) throw error;
    },
    onSuccess: () => invalidate("subtags"),
  });

  const addTask = useMutation({
    mutationFn: async (input: import("@/components/wann/TasksPanel").TaskFormValues) => {
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: input.title,
        category_id: input.categoryId,
        subtag_id: input.subtagId,
        due_date: input.dueDate,
        due_time: input.dueTime,
        recurrence: input.recurrence,
        special_occasion_id: input.specialOccasionId,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("tasks"),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: import("@/components/wann/TasksPanel").TaskFormValues }) => {
      const { error } = await supabase.from("tasks").update({
        title: input.title,
        category_id: input.categoryId,
        subtag_id: input.subtagId,
        due_date: input.dueDate,
        due_time: input.dueTime,
        recurrence: input.recurrence,
        special_occasion_id: input.specialOccasionId,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("tasks"),
  });

  const addChildTask = useMutation({
    mutationFn: async ({ occasionId, title }: { occasionId: string; title: string }) => {
      const occ = (datesQ.data ?? []).find((d) => d.id === occasionId);
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title,
        due_date: occ?.date ?? null,
        special_occasion_id: occasionId,
        recurrence: "none",
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate("tasks"),
  });

  const toggleTask = useMutation({
    mutationFn: async (t: Task) => {
      const completed = !t.completed;
      const { error } = await supabase
        .from("tasks")
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("tasks"),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("tasks"),
  });

  const addSpecialDate = useMutation({
    mutationFn: async (input: Omit<SpecialDate, "id" | "user_id" | "created_at">) => {
      const { error } = await supabase.from("special_dates").insert({ ...input, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => invalidate("dates"),
  });

  const updateSpecialDate = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Omit<SpecialDate, "id" | "user_id" | "created_at">> }) => {
      const { error } = await supabase.from("special_dates").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("dates"),
  });

  const deleteSpecialDate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("special_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate("dates"); invalidate("tasks"); },
  });

  const upcoming = useMemo(() => {
    return (datesQ.data ?? [])
      .map((e) => ({ e, dd: daysUntilAnnual(e.date) }))
      .filter((x) => x.dd <= 14)
      .sort((a, b) => a.dd - b.dd);
  }, [datesQ.data]);

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
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="label-caps text-muted-foreground">WANN</p>
            <h1 className="text-lg font-light tracking-tight">Weekly OS</h1>
          </div>
          <div className="flex items-center gap-2">
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

      {/* Upcoming birthday banner */}
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
          specialDates={datesQ.data ?? []}
          onToggleTask={(t) => toggleTask.mutate(t)}
          onEditTask={(t) => setEditingTask(t)}
        />

        <div className="grid md:grid-cols-2 gap-6">
          <section className="card-flat p-4">
            <TasksPanel
              categories={categoriesQ.data ?? []}
              subtags={subtagsQ.data ?? []}
              tasks={tasksQ.data ?? []}
              specialDates={datesQ.data ?? []}
              editingTask={editingTask}
              onCancelEdit={() => setEditingTask(null)}
              onAddCategory={(name, color) => addCategory.mutate({ name, color })}
              onAddSubtag={(categoryId, name) => addSubtag.mutate({ categoryId, name })}
              onAddTask={(v) => addTask.mutate(v)}
              onUpdateTask={(id, v) => updateTask.mutate({ id, input: v })}
              onToggleTask={(t) => toggleTask.mutate(t)}
              onEditTask={(t) => setEditingTask(t)}
              onDeleteTask={(id) => { if (editingTask?.id === id) setEditingTask(null); deleteTask.mutate(id); }}
              onDeleteCategory={(id) => deleteCategory.mutate(id)}
            />
          </section>

          <section className="card-flat p-4">
            <SpecialOccasionsPanel
              entries={datesQ.data ?? []}
              tasks={tasksQ.data ?? []}
              onAdd={(e) => addSpecialDate.mutate(e)}
              onUpdate={(id, patch) => updateSpecialDate.mutate({ id, patch })}
              onDelete={(id) => deleteSpecialDate.mutate(id)}
              onAddChildTask={(occasionId, title) => addChildTask.mutate({ occasionId, title })}
              onToggleTask={(t) => toggleTask.mutate(t)}
              onDeleteTask={(id) => deleteTask.mutate(id)}
            />
          </section>
        </div>
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
