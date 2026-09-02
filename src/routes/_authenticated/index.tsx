import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Settings as SettingsIcon, LogOut, BookOpen, LineChart, CalendarDays, LayoutGrid, ChevronDown, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isDPlusEvent, dPlusLabel, todayLocalStr } from "@/lib/wann-data";
import { groupColor } from "@/lib/wann-groups";
import { useWannDashboard } from "@/lib/use-wann-dashboard";
import { WeekRotation } from "@/components/wann/WeekRotation";
import { SettingsPanel } from "@/components/wann/SettingsPanel";
import { QuickAdd } from "@/components/wann/QuickAdd";
import { TaskWorkspace } from "@/components/wann/TaskWorkspace";
import { SharedTaskList } from "@/components/wann/MultipleTasksPanel";
import { Plus } from "lucide-react";

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
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [quickSharedTaskInput, setQuickSharedTaskInput] = useState<Record<string, string>>({});

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

      <main className="px-3 sm:px-6 py-6 space-y-6">
        <div className="max-w-5xl mx-auto">
          <QuickAdd ctx={widgetCtx} />
        </div>

        {/* Timeline alone gets a much wider container than the rest of the
            Dashboard — it's the view most starved for horizontal room
            (event/task/project-bar titles truncating), while QuickAdd and
            Tasks & Projects/Groups read better at the original column width. */}
        <div className="max-w-[1800px] mx-auto">
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
          intentions={(intentionsQ.data ?? []).filter((i) => i.status === "active")}
          onOpenIntention={(id) => openGoalsWidget(id)}
          reviewHighlightColor={settings.review_highlight_color}
        />
        </div>

        <div className="max-w-5xl mx-auto">
        {/* Original combined layout restored: one shared category filter,
            Projects left / Tasks right — the exact same TaskWorkspace used
            on /widgets' "Tasks & Projects" widget, same ctx.taskActions/
            projectActions. (Splitting this into two separately-filtered
            boxes was a mistake — same category, no reason for two boxes.) */}
        {(() => {
          const taskWorkspaceSection = <TaskWorkspace key="task_workspace" ctx={widgetCtx} />;

          // Compact summary only — full Group detail (add-existing-project
          // flow, editing) lives on /widgets so Dashboard doesn't grow
          // complex again. Always rendered (even with 0 groups) so the
          // feature has a visible entry point — a card that only ever
          // appears once you already have a Group is undiscoverable.
          const pctOfProject = (p: { id: string }) => {
            const items = (multipleItemsQ.data ?? []).filter((i) => i.multiple_task_id === p.id);
            return items.length > 0
              ? Math.round((items.filter((i) => i.completed).length / items.length) * 100)
              : null;
          };
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
              ) : (() => {
                // Newest-created Group first; a Group whose Projects and Shared
                // Tasks are all done (and has at least one of either) moves into
                // its own collapsed "완료됨" section, same pattern as the
                // Projects/Tasks completed dropdowns elsewhere on this page.
                const groupRows = (groupsQ.data ?? [])
                  .slice()
                  .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
                  .map((g) => {
                    const allGroupProjects = (multipleQ.data ?? []).filter((p) => p.group_id === g.id);
                    const activeProjects = allGroupProjects.filter((p) => pctOfProject(p) !== 100);
                    const doneProjects = allGroupProjects.filter((p) => pctOfProject(p) === 100);
                    const allSharedTasks = (tasksQ.data ?? []).filter(
                      (t) => t.group_id === g.id && !t.multiple_task_id,
                    );
                    const activeSharedTasks = allSharedTasks.filter((t) => !t.completed);
                    const doneSharedTasks = allSharedTasks.filter((t) => t.completed);
                    const hasAny = allGroupProjects.length > 0 || allSharedTasks.length > 0;
                    const isGroupDone = hasAny && activeProjects.length === 0 && activeSharedTasks.length === 0;
                    return { g, allGroupProjects, activeProjects, doneProjects, allSharedTasks, activeSharedTasks, doneSharedTasks, isGroupDone };
                  });
                const activeGroupRows = groupRows.filter((r) => !r.isGroupDone);
                const doneGroupRows = groupRows.filter((r) => r.isGroupDone);

                const renderGroupRow = ({
                  g, allGroupProjects, activeProjects, doneProjects, allSharedTasks, activeSharedTasks, doneSharedTasks, isGroupDone,
                }: (typeof groupRows)[number]) => {
                  const expanded = expandedGroupId === g.id;
                  const color = g.color || groupColor(g.id);
                  return (
                      <div key={g.id} className="border-b border-border/50">
                        <button
                          onClick={() => setExpandedGroupId(expanded ? null : g.id)}
                          className="w-full flex items-center gap-2 py-1 text-left hover:bg-muted"
                        >
                          {expanded ? <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />}
                          <span className="inline-block h-2 w-2 flex-shrink-0" style={{ background: color }} />
                          <span className="text-sm flex-1 min-w-0 truncate">{g.name}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {allGroupProjects.length} Projects · {allSharedTasks.length} Shared Tasks
                          </span>
                        </button>
                        {expanded && (
                          <div className="pl-5 pb-2 space-y-2">
                            {/* 2-column layout in one dashed box, the Group's colour:
                                Projects on the left, Shared Tasks (quick add + list) on
                                the right, split by a dashed divider — same pattern as
                                the Groups detail view on /widgets. Finished items move
                                outside/below it, out of the way but still one click from
                                view. */}
                            <div
                              className="rounded-lg border-2 border-dashed p-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
                              style={{ borderColor: color }}
                            >
                              <div
                                className="space-y-1 sm:border-r sm:border-dashed sm:pr-3"
                                style={{ borderColor: color }}
                              >
                                {isGroupDone ? (
                                  doneProjects.length > 0 && (
                                    <>
                                      <p className="text-[9px] label-caps text-muted-foreground">Projects</p>
                                      {doneProjects.map((p) => (
                                        <button
                                          key={p.id}
                                          onClick={() => openProject(p.id)}
                                          className="w-full flex items-center gap-1.5 text-left hover:underline"
                                        >
                                          <span className="text-sm flex-1 min-w-0 truncate text-muted-foreground line-through">{p.name}</span>
                                        </button>
                                      ))}
                                    </>
                                  )
                                ) : (
                                  <>
                                    <p className="text-[9px] label-caps text-muted-foreground">Projects</p>
                                    {activeProjects.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">
                                        {allGroupProjects.length === 0
                                          ? "아직 Project가 없어요."
                                          : "진행 중인 Project가 없어요."}
                                      </p>
                                    ) : (
                                      activeProjects.map((p) => {
                                        const pct = pctOfProject(p);
                                        return (
                                          <button
                                            key={p.id}
                                            onClick={() => openProject(p.id)}
                                            className="w-full flex items-center gap-1.5 text-left hover:underline"
                                            title="Tasks & Projects에서 바로 보기"
                                          >
                                            <span className="text-sm flex-1 min-w-0 truncate">{p.name}</span>
                                            {pct !== null && (
                                              <span className="text-[10px] text-muted-foreground flex-shrink-0">{pct}%</span>
                                            )}
                                          </button>
                                        );
                                      })
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="space-y-1">
                                {isGroupDone ? (
                                  doneSharedTasks.length > 0 && (
                                    <>
                                      <p className="text-[9px] label-caps text-muted-foreground">Shared Tasks</p>
                                      <SharedTaskList
                                        tasks={doneSharedTasks}
                                        editingId={widgetCtx.editingTask?.id ?? null}
                                        onToggle={widgetCtx.taskActions.onToggleTask}
                                        onEdit={widgetCtx.taskActions.onEditTask}
                                        onDelete={widgetCtx.taskActions.onDeleteTask}
                                      />
                                    </>
                                  )
                                ) : (
                                  <>
                                    <p className="text-[9px] label-caps text-muted-foreground">Shared Tasks</p>
                                    {/* Quick add — a pure Group-level Shared Task, never a
                                        Project item, mirroring the "add Shared Task" flow
                                        on /widgets. */}
                                    <div className="flex items-center gap-1">
                                      <Plus size={12} className="text-muted-foreground flex-shrink-0" />
                                      <input
                                        type="text"
                                        placeholder="Shared Task 빠른 추가"
                                        value={quickSharedTaskInput[g.id] ?? ""}
                                        onChange={(e) =>
                                          setQuickSharedTaskInput({ ...quickSharedTaskInput, [g.id]: e.target.value })
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                                          const title = (quickSharedTaskInput[g.id] ?? "").trim();
                                          if (!title) return;
                                          widgetCtx.taskActions.onAddTask({
                                            title,
                                            categoryIds: [],
                                            subtagId: null,
                                            dueDate: todayLocalStr(),
                                            dueTime: null,
                                            endTime: null,
                                            recurrence: "none",
                                            projectId: null,
                                            newProject: null,
                                            groupId: g.id,
                                            subitems: [],
                                            isCritical: false,
                                          });
                                          setQuickSharedTaskInput({ ...quickSharedTaskInput, [g.id]: "" });
                                        }}
                                        className="flex-1 min-w-0 bg-transparent outline-none text-sm border-b border-border py-1"
                                      />
                                    </div>
                                    {activeSharedTasks.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">진행 중인 Shared Task가 없어요.</p>
                                    ) : (
                                      <SharedTaskList
                                        tasks={activeSharedTasks}
                                        editingId={widgetCtx.editingTask?.id ?? null}
                                        onToggle={widgetCtx.taskActions.onToggleTask}
                                        onEdit={widgetCtx.taskActions.onEditTask}
                                        onDelete={widgetCtx.taskActions.onDeleteTask}
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {!isGroupDone && (doneProjects.length > 0 || doneSharedTasks.length > 0) && (
                              <details className="group/done">
                                <summary className="text-[10px] label-caps text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center gap-1">
                                  <ChevronRight size={10} className="group-open/done:hidden" />
                                  <ChevronDown size={10} className="hidden group-open/done:inline" />
                                  완료됨 ({doneProjects.length + doneSharedTasks.length})
                                </summary>
                                <div className="mt-1 space-y-1 pl-1">
                                  {doneProjects.map((p) => (
                                    <button
                                      key={p.id}
                                      onClick={() => openProject(p.id)}
                                      className="w-full flex items-center gap-1.5 text-left hover:underline"
                                    >
                                      <span className="text-sm flex-1 min-w-0 truncate text-muted-foreground line-through">{p.name}</span>
                                    </button>
                                  ))}
                                  {doneSharedTasks.length > 0 && (
                                    <SharedTaskList
                                      tasks={doneSharedTasks}
                                      editingId={widgetCtx.editingTask?.id ?? null}
                                      onToggle={widgetCtx.taskActions.onToggleTask}
                                      onEdit={widgetCtx.taskActions.onEditTask}
                                      onDelete={widgetCtx.taskActions.onDeleteTask}
                                    />
                                  )}
                                </div>
                              </details>
                            )}

                            <button
                              onClick={() => openGroupsWidget(g.id)}
                              className="label-caps text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              그룹 상세 보기
                            </button>
                          </div>
                        )}
                      </div>
                  );
                };

                return (
                  <div className="space-y-1">
                    {activeGroupRows.map(renderGroupRow)}
                    {doneGroupRows.length > 0 && (
                      <details className="group/donegroups mt-2 pt-2 border-t border-border/50">
                        <summary className="text-[10px] label-caps text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center gap-1">
                          <ChevronRight size={10} className="group-open/donegroups:hidden" />
                          <ChevronDown size={10} className="hidden group-open/donegroups:inline" />
                          완료됨 ({doneGroupRows.length})
                        </summary>
                        <div className="mt-1 space-y-1">
                          {doneGroupRows.map(renderGroupRow)}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })()}
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
        </div>
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
