import type { WidgetDef } from "@/lib/widget-registry";
import type { MultipleTask, Task } from "@/lib/wann-data";
import { koDow, currentOccurrenceDate } from "@/lib/wann-data";
import { Link2, ExternalLink } from "lucide-react";

/**
 * Collects every Task that carries an external reference link (Figma,
 * Notion, Drive, etc. — set via TaskForm's "참고 링크" field) into one place,
 * regardless of which Project/Product Line it belongs to. e.g. the
 * "MoodBoard" task under a project can hold a Figma moodboard link, and this
 * widget is where all such linked tasks surface together.
 */
export function LinkedTasksPanel({
  tasks,
  projects,
  onEditTask,
}: {
  tasks: Task[];
  projects: MultipleTask[];
  onEditTask: (t: Task) => void;
}) {
  const linked = tasks
    .filter((t) => !!t.link_url)
    .slice()
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const da = a.due_date ? currentOccurrenceDate(a) : "";
      const db = b.due_date ? currentOccurrenceDate(b) : "";
      return da.localeCompare(db);
    });

  if (linked.length === 0) {
    return <p className="text-xs text-muted-foreground italic">링크가 걸린 작업이 없어요.</p>;
  }

  return (
    <div className="space-y-1">
      {linked.map((t) => {
        const project = t.multiple_task_id ? projects.find((p) => p.id === t.multiple_task_id) : null;
        // THIS occurrence's date for a recurring task, not the series'
        // frozen anchor date (see TasksPanel's same fix).
        const displayDate = t.due_date ? currentOccurrenceDate(t) : null;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2 py-1 px-1 -mx-1 rounded-sm border-b border-border/50 group ${t.completed ? "opacity-50" : ""}`}
          >
            <Link2 size={12} className="text-muted-foreground flex-shrink-0" />
            <button
              onClick={() => onEditTask(t)}
              className={`text-sm flex-1 min-w-[6rem] text-left truncate hover:underline ${t.completed ? "line-through" : ""}`}
            >
              {t.title}
            </button>
            {project && (
              <span className="text-[10px] text-muted-foreground border-b border-border max-w-[90px] truncate">
                {project.name}
              </span>
            )}
            {displayDate && (
              <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                {displayDate.slice(5)} ({koDow(displayDate)})
              </span>
            )}
            <a
              href={t.link_url!}
              target="_blank"
              rel="noopener noreferrer"
              title={t.link_url!}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        );
      })}
    </div>
  );
}

export const linkedTasksWidget: WidgetDef = {
  id: "linked_tasks",
  label: "Linked Tasks",
  description: "링크(Figma/Notion/Drive 등)가 걸린 Task 모아보기",
  category: "planning",
  defaultVisible: false,
  render: (ctx) => (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Linked Tasks</p>
      </div>
      <LinkedTasksPanel
        tasks={ctx.tasks}
        projects={ctx.projects}
        onEditTask={ctx.taskActions.onEditTask}
      />
    </section>
  ),
};
