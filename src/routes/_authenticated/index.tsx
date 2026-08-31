import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Settings as SettingsIcon, LogOut, BookOpen, LineChart, CalendarDays, LayoutGrid } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isDPlusEvent, dPlusLabel } from "@/lib/wann-data";
import { useWannDashboard } from "@/lib/use-wann-dashboard";
import { WeekRotation } from "@/components/wann/WeekRotation";
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
    groupsQ,
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
    scrollToId,
  } = useWannDashboard(user, { initialDate: dateParam });

  const openGoalsWidget = (intentionId?: string) =>
    navigate({
      to: "/widgets",
      search: { open: "goals", scrollTo: intentionId ? `gi-${intentionId}` : undefined },
    });

  const openGroupsWidget = (groupId?: string) =>
    navigate({
      to: "/widgets",
      search: { open: "groups", scrollTo: groupId ? `group-${groupId}` : undefined },
    });

  // The Projects list lives right on the Dashboard again (below), so a
  // Timeline project-item tap scrolls to it in place instead of navigating away.
  const openProject = (projectId: string) => scrollToId(`mt-${projectId}`);

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
          onOpenMultiple={(id) => openProject(id)}
          onToggleOccurrence={(task, date) => toggleOccurrence.mutate({ task, date })}
          onEditTask={(t) => widgetCtx.taskActions.onEditTask(t)}
          intentions={(intentionsQ.data ?? []).filter((i) => i.status === "active")}
          onOpenIntention={(id) => openGoalsWidget(id)}
        />

        {/* Original combined layout restored: one shared category filter,
            Projects left / Tasks right — the exact same TaskWorkspace used
            on /widgets' "Tasks & Projects" widget, same ctx.taskActions/
            projectActions. (Splitting this into two separately-filtered
            boxes was a mistake — same category, no reason for two boxes.) */}
        {(() => {
          const taskWorkspaceSection = <TaskWorkspace key="task_workspace" ctx={widgetCtx} />;

          // Compact summary only — full Group detail (Projects/Shared Tasks
          // lists, add flows) lives on /widgets so Dashboard doesn't grow
          // complex again. Always rendered (even with 0 groups) so the
          // feature has a visible entry point — a card that only ever
          // appears once you already have a Group is undiscoverable.
          const groupsSection = (
            <section key="groups" className="card-flat p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="label-caps">Groups</p>
                <button
                  onClick={() => openGroupsWidget()}
                  className="label-caps text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {(groupsQ.data ?? []).length > 0 ? "모두 보기" : "+ 그룹 추가"}
                </button>
              </div>
              {(groupsQ.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  여러 Project에 걸친 묶음(예: 케이크 주문, 여행)이 필요할 때 추가하세요.
                </p>
              ) : (
                <div className="space-y-1">
                  {(groupsQ.data ?? []).map((g) => {
                    const nProjects = (multipleQ.data ?? []).filter(
                      (p) => p.group_id === g.id,
                    ).length;
                    const nShared = (tasksQ.data ?? []).filter(
                      (t) => t.group_id === g.id && !t.multiple_task_id,
                    ).length;
                    return (
                      <button
                        key={g.id}
                        onClick={() => openGroupsWidget(g.id)}
                        className="w-full flex items-center gap-2 py-1 border-b border-border/50 text-left hover:bg-muted"
                      >
                        <span className="text-sm flex-1 min-w-0 truncate">{g.name}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {nProjects} Projects · {nShared} Shared Tasks
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );

          // Settings > Widgets' "drag to reorder" list is the single source
          // of truth for these two sections' relative order — otherwise
          // dragging Groups above Tasks & Projects there would silently do
          // nothing on the Dashboard, which used to render them in a fixed
          // order regardless of widget_order.
          const order = settings.widget_order ?? [];
          const groupsIdx = order.indexOf("groups");
          const tasksIdx = order.indexOf("task_workspace");
          const groupsFirst = groupsIdx !== -1 && tasksIdx !== -1 && groupsIdx < tasksIdx;

          return groupsFirst
            ? <>{groupsSection}{taskWorkspaceSection}</>
            : <>{taskWorkspaceSection}{groupsSection}</>;
        })()}
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
