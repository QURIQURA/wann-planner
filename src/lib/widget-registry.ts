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

/**
 * Optional escape hatch for dynamically added widgets. Built-in widgets are
 * listed as values in `src/lib/widgets.ts` instead, because side-effect
 * registration is removed by the production bundler.
 */
export function registerWidget(def: WidgetDef) {
  registry.set(def.id, def);
}

/** Widgets added through registerWidget(), in registration order. */
export function registeredWidgets(): WidgetDef[] {
  return Array.from(registry.values());
}
