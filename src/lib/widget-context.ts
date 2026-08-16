import type {
  Category,
  Subtag,
  Task,
  TaskCompletion,
  MultipleTask,
  MultipleTaskItem,
  EventEntry,
} from "@/lib/wann-data";
import type { TaskFormValues } from "@/components/wann/TaskForm";
import type { MultipleTaskForm } from "@/components/wann/MultipleTasksPanel";
import type { EventForm } from "@/components/wann/EventsPanel";

/**
 * Everything a dashboard widget may need. The dashboard builds this once and
 * passes it to every registered widget's `render`.
 */
export type WidgetContext = {
  userId: string;
  anchor: Date;
  /** Two-way sync with the This Week timeline's anchor date. */
  onAnchorChange?: (d: Date) => void;

  categories: Category[];
  subtags: Subtag[];
  tasks: Task[];
  completions: TaskCompletion[];
  projects: MultipleTask[];
  projectItems: MultipleTaskItem[];
  events: EventEntry[];
  editingTask: Task | null;

  taskActions: {
    onCancelEdit: () => void;
    onAddCategory: (name: string, color: string) => void;
    onAddSubtag: (categoryId: string, name: string) => void;
    onAddTask: (v: TaskFormValues) => void;
    onUpdateTask: (id: string, v: TaskFormValues) => void;
    onToggleTask: (t: Task, occurrenceDate: string) => void;
    onEditTask: (t: Task) => void;
    onDeleteTask: (id: string) => void;
    onDeleteCategory: (id: string) => void;
    onUpdateCategory: (id: string, name: string, color: string) => void;
    onUpdateSubtag: (id: string, name: string) => void;
    onDeleteSubtag: (id: string) => void;
  };

  projectActions: {
    onAdd: (v: MultipleTaskForm) => void;
    onUpdate: (id: string, patch: MultipleTaskForm) => void;
    onDelete: (id: string) => void;
    onAddItem: (parentId: string, title: string, date: string | null, time: string | null) => void;
    onUpdateItem: (id: string, patch: { title?: string; date?: string | null; time?: string | null }) => void;
    onToggleItem: (item: MultipleTaskItem) => void;
    onDeleteItem: (id: string) => void;
  };

  eventActions: {
    onAdd: (v: EventForm) => void;
    onUpdate: (id: string, patch: EventForm) => void;
    onDelete: (id: string) => void;
  };
};
