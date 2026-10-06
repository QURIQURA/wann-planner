import { PRODUCT_LINES, compareGroupsRecency } from "@/lib/wann-groups";
import type { MultipleTask, Task } from "@/lib/wann-data";
import { projectSpan, todayLocalStr } from "@/lib/wann-data";
import { ChevronRight } from "lucide-react";

/**
 * Three fixed cards — one per real product line the business sells (Weekly
 * Surprise Cake / Chiffon Cake / Confectionery Box), each showing at a
 * glance: which Project is current, the next pickup date, rough progress,
 * and the single most urgent next action. This is a manually-tagged
 * (`project.product_line` / `task.product_line`) summary layer on top of
 * Projects and Tasks — not a separate hierarchy level.
 *
 * A line with no Projects yet (Chiffon starts 11/14, Confectionery 12/12)
 * shows a launch countdown instead of stats.
 */
export function ProductLineCards({
  projects,
  projectItems,
  tasks,
  onOpenProject,
  onEditTask,
}: {
  projects: MultipleTask[];
  projectItems: Task[];
  tasks: Task[];
  onOpenProject: (projectId: string) => void;
  /** Opens a Product-Line-level shared Task (no Project) for editing —
   * optional so a caller that hasn't wired Task editing here still works. */
  onEditTask?: (t: Task) => void;
}) {
  const today = todayLocalStr();

  const pctOfProject = (p: { id: string }) => {
    const items = projectItems.filter((i) => i.multiple_task_id === p.id);
    return items.length > 0
      ? Math.round((items.filter((i) => i.completed).length / items.length) * 100)
      : null;
  };

  const cards = PRODUCT_LINES.map((line) => {
    const lineProjects = projects
      .filter((p) => p.product_line === line.key)
      .map((p) => {
        const progress = pctOfProject(p);
        const isDone = progress === 100;
        const items = projectItems.filter((i) => i.multiple_task_id === p.id && !i.completed);
        const nextAction = items
          .slice()
          .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0] ?? null;
        const span = projectSpan(p);
        const latestDate = span?.end ?? null;

        return { p, isDone, latestDate, progress, nextAction, nextDate: latestDate };
      })
      .sort((a, b) =>
        compareGroupsRecency(
          { name: a.p.name, created_at: a.p.created_at, latestDate: a.latestDate },
          { name: b.p.name, created_at: b.p.created_at, latestDate: b.latestDate },
        ),
      );

    // The current instance is the highest-numbered (or most recent) one
    // that isn't fully done yet — an empty just-created Project with no
    // items linked yet still counts as current, not "done", so it never
    // gets skipped in favour of an already-finished earlier one.
    const current = lineProjects.find((r) => !r.isDone) ?? lineProjects[0] ?? null;

    // Tasks tagged directly to this Product Line (no Project) — e.g. next
    // cycle's prep started before that cycle's Project even exists. Shown
    // regardless of which Project is "current", since these deliberately
    // sit above any one cycle.
    const lineTasks = tasks
      .filter((t) => t.product_line === line.key && !t.multiple_task_id && !t.completed)
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

    return { line, current, projectCount: lineProjects.length, lineTasks };
  });

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(({ line, current, projectCount, lineTasks }) => {
        const daysToLaunch = line.launchDate
          ? Math.ceil(
              (new Date(line.launchDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) /
                86400000,
            )
          : null;

        return (
          <div key={line.key} className="card-flat p-4 flex flex-col gap-2 min-w-0">
            <p className="label-caps text-[10px] text-muted-foreground truncate">{line.label}</p>

            {!current ? (
              <div className="flex-1 flex flex-col justify-center items-start gap-1 py-2">
                {daysToLaunch !== null ? (
                  <>
                    <p className="text-2xl font-semibold tabular-nums">
                      {daysToLaunch > 0 ? `D-${daysToLaunch}` : daysToLaunch === 0 ? "D-Day" : "런칭됨"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.launchDate} 시작 예정 · 아직 Project 없음
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">아직 Project가 없어요.</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenProject(current.p.id)}
                className="flex-1 flex flex-col gap-1.5 text-left group"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold truncate group-hover:underline">
                    {current.p.name}
                  </span>
                  {current.progress !== null && (
                    <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                      {current.progress}%
                    </span>
                  )}
                </div>
                {current.progress !== null && (
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${current.progress}%` }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {current.nextDate ? `다음 픽업 · ${current.nextDate.slice(5)}` : "예정된 날짜 없음"}
                </p>
                {current.nextAction && (
                  <p className="text-xs truncate flex items-center gap-1 mt-auto pt-1">
                    <ChevronRight size={11} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{current.nextAction.title}</span>
                  </p>
                )}
                {projectCount > 1 && (
                  <p className="text-[10px] text-muted-foreground">Project {projectCount}개</p>
                )}
              </button>
            )}

            {lineTasks.length > 0 && (
              <div className="border-t border-border pt-2 mt-1 space-y-1">
                <p className="label-caps text-[9px] text-muted-foreground">
                  공통 준비 · {lineTasks.length}개
                </p>
                {lineTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onEditTask?.(t)}
                    disabled={!onEditTask}
                    className="w-full text-left text-xs truncate flex items-center gap-1 hover:underline disabled:hover:no-underline"
                  >
                    <ChevronRight size={11} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{t.title}</span>
                    {t.due_date && (
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-auto">
                        {t.due_date.slice(5)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
