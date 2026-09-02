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
import type { Group } from "@/lib/wann-groups";
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
  /** Generic context/batch entity above Project (e.g. a cake order made of
   * several Projects, or a "Shared Task" belonging directly to the Group). */
  groups: Group[];

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
    onUpdateItem: (id: string, patch: { title?: string; date?: string | null; time?: string | null }) => void;
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

  groupActions: {
    onAdd: (v: { name: string; notes: string | null; color?: string | null }) => void;
    onUpdate: (id: string, patch: { name: string; notes: string | null; color?: string | null }) => void;
    onDelete: (id: string) => void;
    /** Links an existing Project into a Group — a plain group_id update, the
     * Project keeps its id/Tasks/completions/progress untouched. Never
     * duplicates the Project row. */
    onAddExistingProjectToGroup: (projectId: string, groupId: string) => void;
    /** Unlinks a Project from its Group (group_id -> null). The Project
     * itself is never deleted. */
    onRemoveProjectFromGroup: (projectId: string) => void;
  };

  intentionActions: IntentionActions;
};
