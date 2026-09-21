import { useEffect, useRef, useState } from "react";
import type { Stage } from "@/lib/wann-stages";
import { stageColorOf } from "@/lib/wann-stages";
import type { Task } from "@/lib/wann-data";

/**
 * Per-Project "traffic light" row — one dot per production stage (see
 * wann-stages.ts / Settings > 단계 for how the list itself is edited),
 * showing exactly which stage(s) this Project's Tasks are explicitly tagged
 * at. Deliberately reads only the explicit `stage` field on each Task —
 * never guesses from dates or titles (see wann-stages.ts's doc comment).
 *
 * Only meaningful for Projects that belong to a Group — callers should only
 * render this when the Project has a group_id.
 *
 * Each stage keeps its own colour (user-editable) so this row reads as a
 * legend: a hollow ring means nothing is tagged for that stage yet (a gap),
 * a solid dot in that stage's colour means at least one tagged Task is
 * still open, and a solid dot with a ring around it means every tagged Task
 * for that stage is done. The same colour appears next to a tagged Task's
 * title (StageDot below) so the two views visually match up.
 */
export function StageTracker({ stages, tasks }: { stages: Stage[]; tasks: Task[] }) {
  const stageStatus = stages.map((s) => {
    const tagged = tasks.filter((t) => t.stage === s.id);
    if (tagged.length === 0) return { ...s, status: "none" as const };
    const allDone = tagged.every((t) => t.completed);
    return { ...s, status: allDone ? ("done" as const) : ("active" as const) };
  });

  if (stages.length === 0 || stageStatus.every((s) => s.status === "none")) return null;

  return (
    <div className="flex items-center gap-1 py-0.5" role="list" aria-label="생산 단계">
      {stageStatus.map((s) => (
        <span
          key={s.id}
          role="listitem"
          title={`${s.label}${s.status === "done" ? " · 완료" : s.status === "active" ? " · 진행중" : " · 미배정"}`}
          className="h-2.5 w-2.5 rounded-full flex-shrink-0 box-border"
          style={
            s.status === "none"
              ? { background: "transparent", border: `1.5px solid ${s.color}66` }
              : s.status === "active"
                ? { background: s.color, border: `1.5px solid ${s.color}` }
                : { background: s.color, border: "1.5px solid currentColor", boxShadow: `0 0 0 1.5px ${s.color}` }
          }
        />
      ))}
    </div>
  );
}

/**
 * Compact inline picker: a small coloured dot that opens a dropdown of the
 * user's stages to tag/retag a single Task's stage. Shown next to a Project
 * checklist item's title so it can carry a stage tag even though items are
 * created through the lightweight "+ Add item" flow rather than the full
 * TaskForm. An unset stage renders as a faint dashed ring (click to assign).
 */
export function StageDot({
  stages,
  value,
  onChange,
}: {
  stages: Stage[];
  value: string | null;
  onChange: (stage: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (stages.length === 0) return null;

  const color = value ? stageColorOf(stages, value) : null;
  const label = value ? stages.find((s) => s.id === value)?.label ?? "단계 없음" : "단계 없음";

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-label={`단계: ${label}`}
        className="h-2.5 w-2.5 rounded-full block"
        style={
          color
            ? { background: color, border: `1.5px solid ${color}` }
            : { background: "transparent", border: "1.5px dashed var(--border)" }
        }
      />
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 card-flat bg-background border border-border p-1 min-w-[130px] max-h-[240px] overflow-y-auto">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted text-left whitespace-nowrap"
          >
            <span className="h-2 w-2 rounded-full border border-dashed border-border flex-shrink-0" />
            단계 없음
          </button>
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => { onChange(s.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs hover:bg-muted text-left whitespace-nowrap"
            >
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
