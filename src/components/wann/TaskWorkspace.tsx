import { useState } from "react";
import type { WidgetDef } from "@/lib/widget-registry";
import { CategoryFilterBar } from "./CategoryFilterBar";
import { TasksPanel, type CategoryFilter } from "./TasksPanel";
import { MultipleTasksPanel } from "./MultipleTasksPanel";
import type { WidgetContext } from "@/lib/widget-context";

/**
 * Tasks and Multiple Tasks share one category system, so they also share one
 * filter bar: picking a category filters both columns at once.
 */
export function TaskWorkspace({ ctx }: { ctx: WidgetContext }) {
  const [filter, setFilter] = useState<CategoryFilter>({ categoryId: null, subtagId: null });

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="label-caps">Task &amp; Multiple Task</p>
      </div>

      <CategoryFilterBar
        categories={ctx.categories}
        subtags={ctx.subtags}
        tasks={ctx.tasks}
        filter={filter}
        setFilter={setFilter}
        onAddCategory={ctx.taskActions.onAddCategory}
        onUpdateCategory={ctx.taskActions.onUpdateCategory}
        onDeleteCategory={ctx.taskActions.onDeleteCategory}
        onAddSubtag={ctx.taskActions.onAddSubtag}
        onUpdateSubtag={ctx.taskActions.onUpdateSubtag}
        onDeleteSubtag={ctx.taskActions.onDeleteSubtag}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        <div className="min-w-0">
          <MultipleTasksPanel
            entries={ctx.projects}
            items={ctx.projectItems}
            categories={ctx.categories}
            subtags={ctx.subtags}
            filter={filter}
            onFilterChange={setFilter}
            hideFilterBar
            {...ctx.projectActions}
          />
        </div>
        <div className="min-w-0 lg:border-l lg:border-border lg:pl-6">
          <TasksPanel
            categories={ctx.categories}
            subtags={ctx.subtags}
            projects={ctx.projects}
            tasks={ctx.tasks}
            completions={ctx.completions}
            editingTask={ctx.editingTask}
            filter={filter}
            onFilterChange={setFilter}
            hideFilterBar
            {...ctx.taskActions}
          />
        </div>
      </div>
    </section>
  );
}

export const taskWorkspaceWidget: WidgetDef = {
  id: "task_workspace",
  label: "Task & Multiple Task",
  defaultVisible: true,
  render: (ctx) => <TaskWorkspace ctx={ctx} />,
};
