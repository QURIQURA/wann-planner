import type {
  Category,
  Subtag,
  Task,
  TaskCompletion,
  MultipleTask,
  MultipleTaskItem,
  EventEntry,
  EventNote,
  EventType,
  Intention,
} from "@/lib/wann-data";
import type { Stage } from "@/lib/wann-stages";
import type { TaskFormValues } from "@/components/wann/TaskForm";
import type { MultipleTaskForm } from "@/components/wann/MultipleTasksPanel";
import type { EventForm, EventNoteActions, EventTypeActions } from "@/components/wann/EventsPanel";
import type { IntentionActions } from "@/components/wann/GoalsPanel";

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
  eventNotes: EventNote[];
  /** Custom Event Types only — system types are a code constant, see wann-events.ts. */
  eventTypes: EventType[];
  editingTask: Task | null;
  /** IDEA / LATER / GOAL intent layer — independent of tasks/projects. */
  intentions: Intention[];
  /** User-editable weekly-cake production stage list (Settings > 단계) — a
   * Task's `stage` column stores one of these rows' id. */
  stages: Stage[];

  taskActions: {
    onCancelEdit: () => void;
    onAddCategory: (name: string, color: string) => void;
    onAddSubtag: (categoryId: string, name: string) => void;
    onAddTask: (v: TaskFormValues) => void;
    /** Opt-in "독립 모드": materializes a recurring Task as real, independent
     * per-date rows from the start (see use-wann-dashboard.ts's
     * addTaskSeries) instead of one virtually-expanded row. */
    onAddTaskSeries: (v: TaskFormValues) => void;
    onUpdateTask: (id: string, v: TaskFormValues) => void;
    onToggleTask: (t: Task, occurrenceDate: string) => void;
    onEditTask: (t: Task) => void;
    onDeleteTask: (id: string) => void;
    onDeleteCategory: (id: string) => void;
    onUpdateCategory: (id: string, name: string, color: string) => void;
    onUpdateSubtag: (id: string, name: string) => void;
    onDeleteSubtag: (id: string) => void;
    /** Persists a drag-reorder in the Shopping List widget — the full new
     * top-to-bottom id order for the day's items being reordered. */
    onReorderShopping: (orderedIds: string[]) => void;
  };

  projectActions: {
    onAdd: (v: MultipleTaskForm) => void;
    onUpdate: (id: string, patch: MultipleTaskForm) => void;
    onDelete: (id: string) => void;
    onAddItem: (parentId: string, title: string, date: string | null, time: string | null) => void;
    onUpdateItem: (id: string, patch: { title?: string; date?: string | null; time?: string | null; stage?: string | null; link?: string | null }) => void;
    onToggleItem: (item: MultipleTaskItem) => void;
    onDeleteItem: (id: string) => void;
  };

  eventActions: {
    onAdd: (v: EventForm) => void;
    onUpdate: (id: string, patch: EventForm) => void;
    onDelete: (id: string) => void;
    onTogglePin: (id: string, pinned: boolean) => void;
  } & EventNoteActions;
  eventTypeActions: EventTypeActions;

  intentionActions: IntentionActions;

  stageActions: {
    onAdd: (v: { label: string; color: string }) => void;
    onUpdate: (id: string, patch: { label?: string; color?: string }) => void;
    onDelete: (id: string) => void;
    /** Persists a drag-reorder of the stage list — the full new top-to-
     * bottom id order. */
    onReorder: (orderedIds: string[]) => void;
  };
};
