import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Settings as SettingsIcon, LogOut, BookOpen, LineChart, CalendarDays, LayoutGrid } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isDPlusEvent, dPlusLabel } from "@/lib/wann-data";
import { useWannDashboard } from "@/lib/use-wann-dashboard";
import { WeekRotation } from "@/components/wann/WeekRotation";
import { SettingsPanel } from "@/components/wann/SettingsPanel";
import { QuickAdd } from "@/components/wann/QuickAdd";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
  // Lets the Month view (and anything else) deep-link into a specific day,
  // e.g. navigating here with `search={{ date: "2026-08-17" }}`.
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date: typeof search.date === "string" ? search.date : undefined,
  }),
});

/**
 * DASHBOARD = "What am I doing now?" — execution only.
 *
 * Just two things live here: Quick Add (capture) and Timeline (the day/week
 * grid). Everything else — full Task/Project lists, Ideas & Goals management,
 * Event/colour configuration, Habits, Monthly Summary, etc. — lives on the
 * separate /widgets page ("What do I want to manage?"). Both pages share the
 * exact same data/actions via useWannDashboard(), so an edit made in Widgets
 * is reflected here immediately (and vice versa).
 */
function Dashboard() {
  const { user } = Route.useRouteContext() as { user: { id: string; email?: string } };
  const { date: dateParam } = Route.useSearch();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewPromptDismissed, setReviewPromptDismissed] = useState(false);

  const {
    anchor,
    setAnchor,
    settings,
    settingsMutation,
    tasksQ,
    eventsQ,
    eventNotesQ,
    eventTypesQ,
    completionsQ,
    exceptionsQ,
    multipleQ,
    multipleItemsQ,
    habitsQ,
    habitCompQ,
    intentionsQ,
    tapHabit,
    toggleOccurrence,
    moveTask,
    moveProject,
    moveEvent,
    widgetCtx,
    dueReviews,
    upcoming,
    handleSignOut,
  } = useWannDashboard(user, { initialDate: dateParam });

  const openGoalsWidget = (intentionId?: string) =>
    navigate({
      to: "/widgets",
      search: { open: "goals", scrollTo: intentionId ? `gi-${intentionId}` : undefined },
    });

  const openProjectInWidgets = (projectId: string) =>
    navigate({ to: "/widgets", search: { open: "task_workspace", scrollTo: `mt-${projectId}` } });

  if (!settings) {
    return <div className="min-h-screen flex items-center justify-center label-caps text-muted-foreground">Loading</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-caps text-muted-foreground">WANN</p>
            <h1 className="text-lg font-light tracking-tight">Weekly OS</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {dueReviews.length > 0 && (
              <button
                onClick={() => openGoalsWidget()}
                className="border border-destructive text-destructive p-2 hover:bg-muted flex items-center gap-1"
                aria-label="Reviews due"
              >
                <span className="label-caps text-[10px]">REVIEW · {dueReviews.length}</span>
              </button>
            )}
            <Link
              to="/month"
              className="border border-border p-2 hover:bg-muted flex items-center gap-1"
              aria-label="Month"
            >
              <CalendarDays size={14} />
              <span className="label-caps hidden sm:inline">Month</span>
            </Link>
            <Link
              to="/diary"
              className="border border-border p-2 hover:bg-muted flex items-center gap-1"
              aria-label="Diary"
            >
              <BookOpen size={14} />
              <span className="label-caps hidden sm:inline">Diary</span>
            </Link>
            <Link
              to="/patterns"
              className="border border-border p-2 hover:bg-muted flex items-center gap-1"
              aria-label="Patterns"
            >
              <LineChart size={14} />
              <span className="label-caps hidden sm:inline">Patterns</span>
            </Link>
            <Link
              to="/widgets"
              className="border border-border p-2 hover:bg-muted flex items-center gap-1"
              aria-label="Widgets"
            >
              <LayoutGrid size={14} />
              <span className="label-caps hidden sm:inline">Widgets</span>
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

      {dueReviews.length > 0 && !reviewPromptDismissed && (
        <div className="border-b border-border bg-muted">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm">
              {dueReviews.length}개 항목을 다시 확인할 시간이에요.
            </span>
            <button
              onClick={() => openGoalsWidget()}
              className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-background"
            >
              보러 가기
            </button>
            <button
              onClick={() => setReviewPromptDismissed(true)}
              className="ml-auto label-caps text-[10px] text-muted-foreground hover:text-foreground"
            >
              나중에
            </button>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="border-b border-border bg-muted">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
            <span className="label-caps">Upcoming</span>
            {upcoming.slice(0, 4).map(({ e, dd }) => (
              <span key={e.id} className="text-sm">
                {e.name}
                <span className="text-muted-foreground"> · {isDPlusEvent(e) ? "D+day" : e.type}</span>
                <span className="ml-2 border border-border px-1 label-caps text-[10px]">
                  {isDPlusEvent(e) ? dPlusLabel(e) : dd === 0 ? "TODAY" : `D-${dd}`}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        <QuickAdd ctx={widgetCtx} />

        <WeekRotation
          anchorDate={anchor}
          onAnchorChange={setAnchor}
          tasks={tasksQ.data ?? []}
          categories={widgetCtx.categories}
          events={eventsQ.data ?? []}
          eventNotes={eventNotesQ.data ?? []}
          eventTypes={eventTypesQ.data ?? []}
          completions={completionsQ.data ?? []}
          exceptions={exceptionsQ.data ?? []}
          onMoveTask={(args) => moveTask.mutate(args)}
          onMoveProject={(args) => moveProject.mutate(args)}
          onMoveEvent={(ev, newDate) => {
            // recurring events keep their original year (birth year etc.)
            const date = ev.is_recurring ? `${ev.date.slice(0, 4)}${newDate.slice(4)}` : newDate;
            if (date === ev.date) return;
            moveEvent.mutate({ id: ev.id, date });
          }}

          multipleTasks={multipleQ.data ?? []}
          multipleTaskItems={multipleItemsQ.data ?? []}
          habits={habitsQ.data ?? []}
          habitCompletions={habitCompQ.data ?? []}
          onTapHabit={(habit, date) => tapHabit.mutate({ habit, date })}
          onOpenMultiple={(id) => openProjectInWidgets(id)}
          onToggleOccurrence={(task, date) => toggleOccurrence.mutate({ task, date })}
          onEditTask={(t) => widgetCtx.taskActions.onEditTask(t)}
          intentions={(intentionsQ.data ?? []).filter((i) => i.status === "active")}
          onOpenIntention={(id) => openGoalsWidget(id)}
        />
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={(patch) => settingsMutation.mutate(patch)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
