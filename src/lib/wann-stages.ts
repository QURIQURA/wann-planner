/**
 * Weekly cake production workflow — an explicit, ordered list of stages a
 * Task can be tagged with (via a dropdown in TaskForm, see TaskForm.tsx).
 *
 * Deliberately NOT inferred from due dates or task titles: some content gets
 * posted later than the cycle it belongs to, and some ingredients get
 * ordered a week ahead, so date order and stage order can diverge. The
 * stage is always a deliberate choice made when the Task is created/edited.
 *
 * Used to render a per-Project "traffic light" progress row (see
 * StageTracker.tsx) — only for Projects that belong to a Group.
 */
export type StageDef = {
  key: string;
  label: string;
};

export const CAKE_STAGES: StageDef[] = [
  { key: "material_order", label: "재료주문" },
  { key: "material_weigh", label: "재료계량" },
  { key: "production", label: "생산" },
  { key: "assemble", label: "조립" },
  { key: "decoration", label: "장식/마무리" },
  { key: "photo_shoot", label: "촬영" },
  { key: "delivery", label: "배달" },
  { key: "content_making", label: "콘텐츠 제작" },
  { key: "content_release", label: "콘텐츠 업로드" },
];

export function stageLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return CAKE_STAGES.find((s) => s.key === key)?.label ?? key;
}

export function stageIndex(key: string | null | undefined): number {
  if (!key) return -1;
  return CAKE_STAGES.findIndex((s) => s.key === key);
}
