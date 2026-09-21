import { CAKE_STAGES } from "@/lib/wann-stages";
import type { Task } from "@/lib/wann-data";

/**
 * Per-Project "traffic light" row — one dot per production stage (see
 * wann-stages.ts), showing exactly which stage(s) this Project's Tasks are
 * explicitly tagged at. Deliberately reads only the explicit `stage` field
 * on each Task — never guesses from dates or titles (see wann-stages.ts's
 * doc comment for why).
 *
 * Only meaningful for Projects that belong to a Group — callers should only
 * render this when the Project has a group_id.
 *
 * A stage with no tagged Tasks yet renders as an empty ring (nothing
 * assigned there). A stage whose tagged Tasks are all completed renders
 * filled/green. A stage with at least one incomplete tagged Task renders as
 * the active/amber dot — there can be more than one active stage at once
 * (e.g. content prepped ahead while this week's bake is still active).
 */
export function StageTracker({ tasks }: { tasks: Task[] }) {
  const stageStatus = CAKE_STAGES.map((s) => {
    const tagged = tasks.filter((t) => t.stage === s.key);
    if (tagged.length === 0) return { ...s, status: "none" as const };
    const allDone = tagged.every((t) => t.completed);
    return { ...s, status: allDone ? ("done" as const) : ("active" as const) };
  });

  if (stageStatus.every((s) => s.status === "none")) return null;

  return (
    <div className="flex items-center gap-1 py-0.5" role="list" aria-label="생산 단계">
      {stageStatus.map((s) => (
        <span
          key={s.key}
          role="listitem"
          title={`${s.label}${s.status === "done" ? " · 완료" : s.status === "active" ? " · 진행중" : " · 미배정"}`}
          className={
            "h-2 w-2 rounded-full flex-shrink-0 border " +
            (s.status === "done"
              ? "bg-foreground border-foreground"
              : s.status === "active"
                ? "bg-amber-400 border-amber-400"
                : "bg-transparent border-border")
          }
        />
      ))}
    </div>
  );
}
