import { useState } from "react";
import type { WidgetDef } from "@/lib/widget-registry";
import { CategoryFilterBar } from "./CategoryFilterBar";
import { TasksPanel } from "./TasksPanel";
import { MultipleTasksPanel } from "./MultipleTasksPanel";
import { TaskForm } from "./TaskForm";
import type { CategoryFilter } from "./TaskForm";
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
        <p className="label-caps">Tasks &amp; Projects</p>
      </div>

      <TaskForm
        editingTask={ctx.editingTask}
        onCancelEdit={ctx.taskActions.onCancelEdit}
        onAddTask={ctx.taskActions.onAddTask}
        onAddTaskSeries={ctx.taskActions.onAddTaskSeries}
        onUpdateTask={ctx.taskActions.onUpdateTask}
        categories={ctx.categories}
        subtags={ctx.subtags}
        projects={ctx.projects}
        projectItems={ctx.projectItems}
        groups={ctx.groups}
        filter={filter}
      />

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
            groups={ctx.groups}
            allTasks={ctx.tasks}
            editingTaskId={ctx.editingTask?.id ?? null}
            onToggleTask={ctx.taskActions.onToggleTask}
            onEditTask={ctx.taskActions.onEditTask}
            onDeleteTask={ctx.taskActions.onDeleteTask}
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
            groups={ctx.groups}
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
  label: "Tasks & Projects",
  defaultVisible: true,
  category: "planning",
  description: "Full task list, categories, and multi-day projects",
  render: (ctx) => <TaskWorkspace ctx={ctx} />,
};

