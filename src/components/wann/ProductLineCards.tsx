import type { Group } from "@/lib/wann-groups";
import { PRODUCT_LINES, compareGroupsRecency, weekNumber } from "@/lib/wann-groups";
import type { MultipleTask, Task } from "@/lib/wann-data";
import { projectSpan, todayLocalStr } from "@/lib/wann-data";
import { ChevronRight } from "lucide-react";

/**
 * Three fixed cards — one per real product line the business sells (Weekly
 * Surprise Cake / Chiffon Cake / Confectionery Box), each showing at a
 * glance: which week/instance is current, the next pickup date, rough
 * progress, and the single most urgent next action. The actual weekly
 * Groups underneath are unchanged (still a flat list further down) — this
 * is a manually-tagged (`group.product_line`) summary layer on top, not a
 * new hierarchy level.
 *
 * A line with no Groups yet (Chiffon starts 11/14, Confectionery 12/12)
 * shows a launch countdown instead of stats.
 */
export function ProductLineCards({
  groups,
  projects,
  projectItems,
  tasks,
  onOpenGroup,
}: {
  groups: Group[];
  projects: MultipleTask[];
  projectItems: Task[];
  tasks: Task[];
  onOpenGroup: (groupId: string) => void;
}) {
  const today = todayLocalStr();

  const pctOfProject = (p: { id: string }) => {
    const items = projectItems.filter((i) => i.multiple_task_id === p.id);
    return items.length > 0
      ? Math.round((items.filter((i) => i.completed).length / items.length) * 100)
      : null;
  };

  const cards = PRODUCT_LINES.map((line) => {
    const lineGroups = groups
      .filter((g) => g.product_line === line.key)
      .map((g) => {
        const allProjects = projects.filter((p) => p.group_id === g.id);
        const activeProjects = allProjects.filter((p) => pctOfProject(p) !== 100);
        const doneProjects = allProjects.filter((p) => pctOfProject(p) === 100);
        const allTasks = tasks.filter((t) => t.group_id === g.id && !t.multiple_task_id);
        const activeTasks = allTasks.filter((t) => !t.completed);
        const doneTasks = allTasks.filter((t) => t.completed);
        const hasAny = allProjects.length > 0 || allTasks.length > 0;
        const isDone = hasAny && activeProjects.length === 0 && activeTasks.length === 0;

        const activeItems = [
          ...activeProjects.map((p) => ({ title: p.name, date: projectSpan(p)?.end ?? null })),
          ...activeTasks.map((t) => ({ title: t.title, date: t.due_date ?? null })),
        ];
        const allDates = [
          ...allProjects.map((p) => projectSpan(p)?.end ?? null),
          ...allTasks.map((t) => t.due_date ?? null),
        ].filter((d): d is string => !!d);
        const latestDate = allDates.sort().at(-1) ?? null;

        const totalUnits = allProjects.length + allTasks.length;
        const doneUnits = doneProjects.length + doneTasks.length;
        const progress = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : null;

        // Next action: soonest-dated active item, falling back to any
        // active item, so a card always points at something concrete.
        const dated = activeItems.filter((i) => i.date).sort((a, b) => a.date!.localeCompare(b.date!));
        const nextAction = dated[0] ?? activeItems[0] ?? null;
        // "다음 픽업" is the cycle's final/delivery date, not just whichever
        // linked date happens to come soonest — an intermediate bake/prep
        // task dated earlier than the actual Delivery task would otherwise
        // win here. The group's own latest linked date is the best proxy
        // for "when does this week's order actually go out."
        const upcomingDates = allDates.filter((d) => d >= today).sort();
        const nextDate = upcomingDates.at(-1) ?? latestDate;

        return { g, isDone, latestDate, progress, nextAction, nextDate };
      })
      .sort((a, b) =>
        compareGroupsRecency(
          { name: a.g.name, created_at: a.g.created_at, latestDate: a.latestDate },
          { name: b.g.name, created_at: b.g.created_at, latestDate: b.latestDate },
        ),
      );

    // The current instance is the highest-numbered (or most recent) one
    // that isn't fully done yet — an empty just-created "Week 5" with no
    // items linked yet still counts as current, not "done", so it never
    // gets skipped in favour of an already-finished earlier week.
    const current = lineGroups.find((r) => !r.isDone) ?? lineGroups[0] ?? null;

    return { line, current, groupCount: lineGroups.length };
  });

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(({ line, current, groupCount }) => {
        const week = current ? weekNumber(current.g.name) : null;
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
                      {line.launchDate} 시작 예정 · 아직 그룹 없음
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">아직 그룹이 없어요.</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenGroup(current.g.id)}
                className="flex-1 flex flex-col gap-1.5 text-left group"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold truncate group-hover:underline">
                    {week !== null ? `Week ${week}` : current.g.name}
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
                {groupCount > 1 && (
                  <p className="text-[10px] text-muted-foreground">그룹 {groupCount}개</p>
                )}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
