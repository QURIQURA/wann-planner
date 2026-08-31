/**
 * Central widget list.
 *
 * Definitions are imported as *values* and the list functions live in this
 * module, so nothing here depends on module side effects. The package is
 * marked `"sideEffects": false`, which means side-effect-only imports (and
 * pure re-export modules) get tree-shaken out of production builds — that is
 * what previously made every widget disappear from the built app.
 *
 * To add a widget: export its `WidgetDef` from its panel file and add it to
 * BUILT_IN_WIDGETS below.
 */
import type { WidgetDef } from "./widget-registry";
import { registeredWidgets } from "./widget-registry";
import { taskWorkspaceWidget } from "@/components/wann/TaskWorkspace";
import { eventsWidget } from "@/components/wann/EventsPanel";
import { habitTrackerWidget } from "@/components/wann/HabitTrackerPanel";
import { monthlySummaryWidget } from "@/components/wann/MonthlySummaryPanel";
import { tanjiTimelineWidget } from "@/components/wann/TanjiTimelinePanel";
import { goalsWidget } from "@/components/wann/GoalsPanel";

export const BUILT_IN_WIDGETS: WidgetDef[] = [
  taskWorkspaceWidget,
  tanjiTimelineWidget,
  goalsWidget,
  eventsWidget,
  habitTrackerWidget,
  monthlySummaryWidget,
];

/** All widgets: the built-in list plus anything added via registerWidget(). */
export function getWidgets(): WidgetDef[] {
  const out = [...BUILT_IN_WIDGETS];
  for (const def of registeredWidgets()) {
    if (!out.some((w) => w.id === def.id)) out.push(def);
  }
  return out;
}

export function isWidgetVisible(
  def: WidgetDef,
  visibility: Record<string, boolean> | null | undefined,
): boolean {
  const v = visibility?.[def.id];
  if (typeof v === "boolean") return v;
  return def.defaultVisible !== false;
}

/**
 * Widgets sorted by the user's saved order. Widgets missing from the saved
 * order (newly added ones) keep their definition order at the end.
 */
export function orderedWidgets(order: string[] | null | undefined): WidgetDef[] {
  const all = getWidgets();
  if (!order?.length) return all;
  const seen = new Set<string>();
  const out: WidgetDef[] = [];
  for (const id of order) {
    const def = all.find((w) => w.id === id);
    if (def && !seen.has(id)) {
      out.push(def);
      seen.add(id);
    }
  }
  for (const def of all) if (!seen.has(def.id)) out.push(def);
  return out;
}

export { registerWidget, type WidgetDef } from "./widget-registry";
export type { WidgetContext } from "./widget-context";
