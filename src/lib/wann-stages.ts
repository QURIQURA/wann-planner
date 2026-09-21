/**
 * Weekly cake production workflow — an explicit, ordered list of stages a
 * Task can be tagged with (via a dropdown in TaskForm.tsx, or the compact
 * StageDot picker on a Project's checklist items — see StageTracker.tsx).
 *
 * Deliberately NOT inferred from due dates or task titles: some content gets
 * posted later than the cycle it belongs to, and some ingredients get
 * ordered a week ahead, so date order and stage order can diverge. The
 * stage is always a deliberate choice made when the Task is created/edited.
 *
 * Each stage has a fixed colour so its dot in the per-Project "traffic
 * light" row and the dot next to a tagged Task's title always match —
 * scanning the two together shows at a glance which stage a line is and
 * which stages have nothing tagged yet.
 */
export type StageDef = {
  key: string;
  label: string;
  color: string;
};

export const CAKE_STAGES: StageDef[] = [
  { key: "cake_design", label: "케이크 디자인", color: "#F472B6" },
  { key: "material_order", label: "재료주문", color: "#FB923C" },
  { key: "material_weigh", label: "재료계량", color: "#FBBF24" },
  { key: "production", label: "생산", color: "#4ADE80" },
  { key: "assemble", label: "조립", color: "#34D399" },
  { key: "decoration", label: "장식/마무리", color: "#22D3EE" },
  { key: "photo_shoot", label: "촬영", color: "#818CF8" },
  { key: "delivery", label: "배달", color: "#F87171" },
  { key: "content_making", label: "콘텐츠 제작", color: "#A78BFA" },
  { key: "content_release", label: "콘텐츠 업로드", color: "#38BDF8" },
];

export function stageLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return CAKE_STAGES.find((s) => s.key === key)?.label ?? key;
}

export function stageIndex(key: string | null | undefined): number {
  if (!key) return -1;
  return CAKE_STAGES.findIndex((s) => s.key === key);
}

/** Falls back to a neutral grey for an unset/unrecognized stage — callers
 * should generally check for null first (no dot at all) rather than render
 * this, but it keeps color lookups total. */
export function stageColor(key: string | null | undefined): string {
  if (!key) return "#9CA3AF";
  return CAKE_STAGES.find((s) => s.key === key)?.color ?? "#9CA3AF";
}
