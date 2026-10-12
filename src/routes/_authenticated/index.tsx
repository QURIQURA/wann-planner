import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Settings as SettingsIcon, LogOut, BookOpen, LineChart, CalendarDays, LayoutGrid } from "lucide-react";

import { isDPlusEvent, dPlusLabel, formatLocalDate, parseLocalDate } from "@/lib/wann-data";
import { useWannDashboard } from "@/lib/use-wann-dashboard";
import { orderedDashboardSections, type DashboardSectionId } from "@/lib/dashboard-sections";
import { WeekRotation } from "@/components/wann/WeekRotation";
import { WeeklyView } from "@/components/wann/WeeklyView";
import { ShoppingListWidget } from "@/components/wann/ShoppingListWidget";
import { ProductLineCards } from "@/components/wann/ProductLineCards";
import { SettingsPanel } from "@/components/wann/SettingsPanel";
import { QuickAdd } from "@/components/wann/QuickAdd";
import { TaskWorkspace } from "@/components/wann/TaskWorkspace";

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
 * Quick Add (capture) → Timeline (the day/week grid) → Tasks → Projects, in
 * that order: a glanceable view of what's live right now. Full management —
 * category setup, Ideas & Goals, Event/colour configuration, Habits, Monthly
 * Summary, etc. — lives on the separate /widgets page ("What do I want to
 * manage?"). The Tasks/Projects lists below are the SAME TasksPanel /
 * MultipleTasksPanel used on /widgets' "Tasks & Projects" widget — both
 * pages share the exact same data/actions via useWannDashboard(), so an
 * edit made in either place is reflected everywhere immediately.
 */
function Dashboard() {
  const { user } = Route.useRouteContext() as { user: { id: string; email?: string } };
  const { date: dateParam } = Route.useSearch();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    tapHabit,
    toggleOccurrence,
    moveTask,
    moveProject,
    moveEvent,
    widgetCtx,
    upcoming,
    handleSignOut,
    scrollToId,
  } = useWannDashboard(user, { initialDate: dateParam });

  // The Projects list lives right on the Dashboard again (below), so a
  // Timeline project-item tap scrolls to it in place instead of navigating away.
  const openProject = (projectId: string) => scrollToId(`mt-${projectId}`);

  const renderSection = (id: DashboardSectionId) => {
    switch (id) {
      case "quickadd":
        return <QuickAdd ctx={widgetCtx} />;
      case "shopping":
        return (
          <ShoppingListWidget
            anchorKey={formatLocalDate(anchor)}
            tasks={tasksQ.data ?? []}
            completions={completionsQ.data ?? []}
            onToggle={(t, date) => toggleOccurrence.mutate({ task: t, date })}
            onEdit={(t) => widgetCtx.taskActions.onEditTask(t)}
            onAdd={(title, date) =>
              widgetCtx.taskActions.onAddTask({
                title,
                categoryIds: [],
                subtagId: null,
                dueDate: date,
                dueTime: null,
                endTime: null,
                recurrence: "none",
                projectId: null,
                newProject: null,
                subitems: [],
                isCritical: false,
                isShopping: true,
                stage: null,
                productLine: null,
                linkUrl: null,
              })
            }
            onReorder={(ids) => widgetCtx.taskActions.onReorderShopping(ids)}
          />
        );
      case "weekly":
        return (
          <WeeklyView
            tasks={tasksQ.data ?? []}
            exceptions={exceptionsQ.data ?? []}
            events={eventsQ.data ?? []}
            eventTypes={eventTypesQ.data ?? []}
            categories={widgetCtx.categories}
            onSelectDate={(date) => setAnchor(parseLocalDate(date))}
          />
        );
      case "timeline":
        return (
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
            onOpenMultiple={(id) => openProject(id)}
            onToggleOccurrence={(task, date) => toggleOccurrence.mutate({ task, date })}
            onEditTask={(t) => widgetCtx.taskActions.onEditTask(t)}
            onAddTask={(v) => widgetCtx.taskActions.onAddTask(v)}
          />
        );
      case "productline":
        return (
          <ProductLineCards
            projects={multipleQ.data ?? []}
            projectItems={multipleItemsQ.data ?? []}
            tasks={tasksQ.data ?? []}
            onEditTask={(t) => widgetCtx.taskActions.onEditTask(t)}
            onOpenProject={(id) => openProject(id)}
          />
        );
      case "tasks":
        // Original combined layout: one shared category filter, Projects
        // left / Tasks right — the exact same TaskWorkspace used on
        // /widgets' "Tasks & Projects" widget, same ctx.taskActions/
        // projectActions.
        return <TaskWorkspace ctx={widgetCtx} />;
      default:
        return null;
    }
  };

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

      <main className="px-3 sm:px-6 py-6 space-y-6">
        {/* The Dashboard's 6 sections — Quick Add / Shopping List / Weekly
            View / Timeline / Product Line / Tasks & Projects — in the
            user's drag-reordered order (Settings > Dashboard). All share
            the same wide container now that they're freely reorderable:
            Timeline's long titles need the extra room, and the others read
            fine at it too. */}
        <div className="max-w-[1800px] mx-auto space-y-4">
          {orderedDashboardSections(settings.dashboard_order).map((id) => (
            <div key={id}>{renderSection(id)}</div>
          ))}
        </div>
      </main>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={(patch) => settingsMutation.mutate(patch)}
          onClose={() => setSettingsOpen(false)}
          stages={widgetCtx.stages}
          onAddStage={widgetCtx.stageActions.onAdd}
          onUpdateStage={widgetCtx.stageActions.onUpdate}
          onDeleteStage={widgetCtx.stageActions.onDelete}
          onReorderStages={widgetCtx.stageActions.onReorder}
        />
      )}
    </div>
  );
}
