/**
 * Central widget list. Definitions are imported as *values* (not side-effect
 * imports) so production builds can never tree-shake the registration away.
 * To add a new widget: export its `WidgetDef` from its panel file and add it
 * to the array below.
 */
import { registerWidget } from "./widget-registry";
import { tasksWidget } from "@/components/wann/TasksPanel";
import { multipleTasksWidget } from "@/components/wann/MultipleTasksPanel";
import { eventsWidget } from "@/components/wann/EventsPanel";
import { habitTrackerWidget } from "@/components/wann/HabitTrackerPanel";
import { monthlySummaryWidget } from "@/components/wann/MonthlySummaryPanel";

export const BUILT_IN_WIDGETS = [
  tasksWidget,
  multipleTasksWidget,
  eventsWidget,
  habitTrackerWidget,
  monthlySummaryWidget,
];

for (const def of BUILT_IN_WIDGETS) registerWidget(def);

export { getWidgets, orderedWidgets, isWidgetVisible, registerWidget, type WidgetDef } from "./widget-registry";
export type { WidgetContext } from "./widget-context";
