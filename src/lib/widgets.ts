/**
 * Side-effect module: importing this guarantees every widget has registered
 * itself with the registry. Add new widget modules here (or rely on them being
 * imported elsewhere) and they show up in Settings automatically.
 */
import "@/components/wann/TasksPanel";
import "@/components/wann/MultipleTasksPanel";
import "@/components/wann/EventsPanel";
import "@/components/wann/HabitTrackerPanel";
import "@/components/wann/MonthlySummaryPanel";

export { getWidgets, orderedWidgets, isWidgetVisible, type WidgetDef } from "./widget-registry";
export type { WidgetContext } from "./widget-context";
