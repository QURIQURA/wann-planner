import type { ReactNode } from "react";
import type { WidgetContext } from "./widget-context";

export type WidgetDef = {
  /** Stable id, also the key used in user_settings.widget_visibility / widget_order. */
  id: string;
  /** Human label shown in Settings. */
  label: string;
  /** Shown when the user has no saved preference. Defaults to true. */
  defaultVisible?: boolean;
  render: (ctx: WidgetContext) => ReactNode;
};

const registry = new Map<string, WidgetDef>();

/** Called from each widget module so new widgets appear in Settings automatically. */
export function registerWidget(def: WidgetDef) {
  registry.set(def.id, def);
}

/** All registered widgets, in registration order. */
export function getWidgets(): WidgetDef[] {
  return Array.from(registry.values());
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
 * Registered widgets sorted by the user's saved order. Widgets missing from the
 * saved order (newly added ones) keep their registration order at the end.
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
