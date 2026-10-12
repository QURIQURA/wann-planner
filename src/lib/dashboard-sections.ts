/**
 * The Dashboard's own 6 sections (Quick Add / Shopping List / Weekly View /
 * Timeline / Product Line / Tasks & Projects) — drag-reorderable via
 * Settings > Dashboard, the same pattern as the existing widget_order for
 * the /widgets page but a separate, parallel list (`dashboard_order` on
 * planner_user_settings) since these aren't part of the WidgetDef/
 * BUILT_IN_WIDGETS system: they're always-on Dashboard execution surfaces,
 * not optional management widgets.
 */
export type DashboardSectionId = "quickadd" | "shopping" | "weekly" | "timeline" | "productline" | "tasks";

export const DASHBOARD_SECTIONS: { id: DashboardSectionId; label: string }[] = [
  { id: "quickadd", label: "Quick Add" },
  { id: "shopping", label: "Shopping List" },
  { id: "weekly", label: "Weekly View" },
  { id: "timeline", label: "Timeline" },
  { id: "productline", label: "Product Line" },
  { id: "tasks", label: "Tasks & Projects" },
];

export const DEFAULT_DASHBOARD_ORDER: DashboardSectionId[] = DASHBOARD_SECTIONS.map((s) => s.id);

/** Section ids sorted by the user's saved order; anything missing (a newly
 * added section) keeps its definition order at the end. */
export function orderedDashboardSections(
  order: string[] | null | undefined,
): DashboardSectionId[] {
  if (!order?.length) return DEFAULT_DASHBOARD_ORDER;
  const all = DEFAULT_DASHBOARD_ORDER;
  const seen = new Set<string>();
  const out: DashboardSectionId[] = [];
  for (const id of order) {
    if (all.includes(id as DashboardSectionId) && !seen.has(id)) {
      out.push(id as DashboardSectionId);
      seen.add(id);
    }
  }
  for (const id of all) if (!seen.has(id)) out.push(id);
  return out;
}
