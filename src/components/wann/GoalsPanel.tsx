import { useState } from "react";
import type { WidgetDef } from "@/lib/widget-registry";
import type { Category, Intention } from "@/lib/wann-data";
import {
  REVIEW_INTERVAL_LABEL,
  STAGE_LABEL,
  reviewStatus,
  type IntentionStage,
  type ReviewInterval,
} from "@/lib/wann-intentions";
import { Plus, ChevronDown, ChevronRight, Trash2, RotateCcw, ArrowUpRight, ListChecks, CheckSquare, Archive, CheckCircle2 } from "lucide-react";

const STAGES: IntentionStage[] = ["idea", "later", "goal"];
const INTERVALS: ReviewInterval[] = ["never", "1_week", "1_month", "3_months", "6_months", "1_year"];

const STATUS_STYLE: Record<string, string> = {
  overdue: "border-destructive text-destructive",
  due: "border-foreground text-foreground",
  upcoming: "border-border text-muted-foreground",
  none: "border-border text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  overdue: "OVERDUE",
  due: "DUE",
  upcoming: "UPCOMING",
  none: "",
};

export type IntentionActions = {
  onAdd: (title: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<{
      title: string;
      notes: string | null;
      category_id: string | null;
      review_interval: ReviewInterval;
      review_interval_days: number | null;
      next_review_date: string | null;
    }>,
  ) => void;
  onKeep: (intention: Intention) => void;
  onSnooze: (intention: Intention, interval: ReviewInterval) => void;
  onPromote: (intention: Intention) => void;
  onStartProject: (intention: Intention) => void;
  onStartTask: (intention: Intention) => void;
  onArchive: (intention: Intention) => void;
  onComplete: (intention: Intention) => void;
  onDelete: (id: string) => void;
  onOpenLinkedProject: (projectId: string) => void;
  onOpenLinkedTask: (taskId: string) => void;
};

/** FAST CAPTURE — the whole point of the "+ IDEA" bar: title only, one Enter, done.
 * Exported so Dashboard's Quick Add can reuse it verbatim for Idea creation. */
export function FastCapture({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground"
      >
        <Plus size={13} /> IDEA
      </button>
    );
  }
  const submit = () => {
    const v = value.trim();
    if (v) onAdd(v);
    setValue("");
    setOpen(false);
  };
  return (
    <input
      autoFocus
      value={value}
      placeholder="생각나는 대로 입력 후 Enter — 나머지는 나중에"
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") { setValue(""); setOpen(false); }
      }}
      className="w-full bg-transparent outline-none border border-foreground px-3 py-2 text-sm"
    />
  );
}

function ReviewBadge({ intention }: { intention: Intention }) {
  const st = reviewStatus(intention.next_review_date);
  if (st === "none") return null;
  return (
    <span className={`text-[9px] label-caps border px-1 flex-shrink-0 ${STATUS_STYLE[st]}`}>
      {STATUS_LABEL[st]}
      {intention.next_review_date ? ` · ${intention.next_review_date.slice(5)}` : ""}
    </span>
  );
}

function IntentionRow({
  intention,
  categories,
  actions,
}: {
  intention: Intention;
  categories: Category[];
  actions: IntentionActions;
}) {
  const [expanded, setExpanded] = useState(false);
  const [snoozeChoice, setSnoozeChoice] = useState<ReviewInterval>(
    (intention.review_interval as ReviewInterval) || "1_week",
  );
  const cat = intention.category_id ? categories.find((c) => c.id === intention.category_id) : null;

  return (
    <div id={`gi-${intention.id}`} className="border-b border-border/50">
      <div className="flex items-center gap-2 py-1.5 group">
        <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground flex-shrink-0 p-1 -m-1" aria-label="Expand">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <button onClick={() => setExpanded((v) => !v)} className="text-sm flex-1 text-left hover:underline truncate">
          {intention.title}
        </button>
        {cat && (
          <span className="text-[10px] label-caps border border-border px-1 flex-shrink-0" style={{ color: cat.color }}>
            {cat.name}
          </span>
        )}
        <ReviewBadge intention={intention} />
        <button
          onClick={() => actions.onDelete(intention.id)}
          className="opacity-0 group-hover:opacity-100 hover:text-destructive flex-shrink-0 p-1 -m-1"
          aria-label="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && (
        <div className="pl-6 pr-1 pb-3 space-y-2">
          <textarea
            value={intention.notes ?? ""}
            placeholder="메모 (선택)"
            onChange={(e) => actions.onUpdate(intention.id, { notes: e.target.value })}
            rows={2}
            className="w-full bg-transparent outline-none border-b border-border py-1 text-xs resize-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={intention.category_id ?? ""}
              onChange={(e) => actions.onUpdate(intention.id, { category_id: e.target.value || null })}
              className="bg-transparent outline-none border-b border-border py-1 text-xs"
            >
              <option value="">no category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground">
              Review in
              <select
                value={intention.review_interval}
                onChange={(e) => actions.onUpdate(intention.id, { review_interval: e.target.value as ReviewInterval })}
                className="bg-transparent outline-none border-b border-border py-1 text-xs text-foreground"
              >
                {INTERVALS.map((iv) => (
                  <option key={iv} value={iv}>{REVIEW_INTERVAL_LABEL[iv]}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground">
              or pick a date
              <input
                type="date"
                value={intention.next_review_date ?? ""}
                onChange={(e) => actions.onUpdate(intention.id, { next_review_date: e.target.value || null })}
                className="bg-transparent outline-none border-b border-border py-1 text-xs text-foreground"
              />
            </label>

            {intention.next_review_date && (
              <span className="text-[10px] text-muted-foreground">
                next: {intention.next_review_date}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            <button
              onClick={() => actions.onKeep(intention)}
              className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted flex items-center gap-1"
              title="Keep — recompute next review from the configured interval"
            >
              <RotateCcw size={10} /> KEEP
            </button>

            <select
              value={snoozeChoice}
              onChange={(e) => setSnoozeChoice(e.target.value as ReviewInterval)}
              className="bg-transparent outline-none border border-border px-1 py-1 text-[10px]"
              aria-label="Snooze interval"
            >
              {INTERVALS.filter((iv) => iv !== "never").map((iv) => (
                <option key={iv} value={iv}>{REVIEW_INTERVAL_LABEL[iv]}</option>
              ))}
            </select>
            <button
              onClick={() => actions.onSnooze(intention, snoozeChoice)}
              className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted"
            >
              SNOOZE
            </button>

            {intention.stage !== "goal" && (
              <button
                onClick={() => actions.onPromote(intention)}
                className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted flex items-center gap-1"
                title={intention.stage === "idea" ? "Idea → Later" : "Later → Goal"}
              >
                <ArrowUpRight size={10} /> PROMOTE
              </button>
            )}

            {intention.linked_project_id ? (
              <button
                onClick={() => actions.onOpenLinkedProject(intention.linked_project_id!)}
                className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted flex items-center gap-1"
              >
                <ListChecks size={10} /> OPEN PROJECT
              </button>
            ) : (
              <button
                onClick={() => actions.onStartProject(intention)}
                className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted flex items-center gap-1"
                title="Project로 시작 — 여러 단계로 나눠 진행할 때"
              >
                <ListChecks size={10} /> START PROJECT
              </button>
            )}

            {intention.linked_task_id ? (
              <button
                onClick={() => actions.onOpenLinkedTask(intention.linked_task_id!)}
                className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted flex items-center gap-1"
              >
                <CheckSquare size={10} /> OPEN TASK
              </button>
            ) : (
              <button
                onClick={() => actions.onStartTask(intention)}
                className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted flex items-center gap-1"
                title="Task로 시작 — 오늘 날짜로 바로 실행 항목이 될 때"
              >
                <CheckSquare size={10} /> START TASK
              </button>
            )}

            <button
              onClick={() => actions.onComplete(intention)}
              className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted flex items-center gap-1"
            >
              <CheckCircle2 size={10} /> COMPLETE
            </button>
            <button
              onClick={() => actions.onArchive(intention)}
              className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted flex items-center gap-1"
            >
              <Archive size={10} /> ARCHIVE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GoalsPanel({
  intentions,
  categories,
  actions,
}: {
  intentions: Intention[];
  categories: Category[];
  actions: IntentionActions;
}) {
  const [tab, setTab] = useState<IntentionStage>("idea");
  const [showDone, setShowDone] = useState(false);

  const active = intentions.filter((i) => i.status === "active");
  const finished = intentions.filter((i) => i.status !== "active");
  const byStage = STAGES.map((s) => ({ stage: s, items: active.filter((i) => i.stage === s) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="label-caps">Ideas / Later / Goals</p>
        <span className="text-[10px] text-muted-foreground">Capture now. Organize later.</span>
      </div>

      <div className="mb-3">
        <FastCapture onAdd={actions.onAdd} />
      </div>

      <div className="flex gap-1 mb-2">
        {byStage.map(({ stage, items }) => (
          <button
            key={stage}
            onClick={() => setTab(stage)}
            className={`border border-border px-2 py-1 label-caps text-[10px] ${tab === stage ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            {STAGE_LABEL[stage]} ({items.length})
          </button>
        ))}
      </div>

      {/* All stages stay mounted (just hidden) so a Timeline "REVIEW" click can scroll to any
          row regardless of the currently-selected tab. */}
      {byStage.map(({ stage, items }) => (
        <div key={stage} hidden={tab !== stage}>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Nothing here yet.</p>
          ) : (
            items.map((i) => <IntentionRow key={i.id} intention={i} categories={categories} actions={actions} />)
          )}
        </div>
      ))}

      {finished.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground hover:text-foreground"
          >
            {showDone ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            완료/보관됨 ({finished.length})
          </button>
          {showDone && (
            <div className="mt-1">
              {finished.map((i) => (
                <IntentionRow key={i.id} intention={i} categories={categories} actions={actions} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const goalsWidget: WidgetDef = {
  id: "goals",
  label: "Ideas & Goals",
  category: "planning",
  description: "Capture ideas, promote to goals, manage Review Timers",
  render: (ctx) => (
    <section id="goals-widget" className="card-flat p-4">
      <GoalsPanel intentions={ctx.intentions} categories={ctx.categories} actions={ctx.intentionActions} />
    </section>
  ),
};
