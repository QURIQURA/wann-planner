import { useEffect, useRef, useState } from "react";
import type { Category, MultipleTask, MultipleTaskItem, Subtag, Task } from "@/lib/wann-data";
import { todayLocalStr, shortTime, formatDateKo, koDow } from "@/lib/wann-data";
import type { Group } from "@/lib/wann-groups";
import { Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchSubitemsForTask, type SubitemDraft } from "@/lib/wann-subitems";

export type CategoryFilter = { categoryId: string | null; subtagId: string | null };

export type NewProjectValues = {
  name: string;
  startDate: string | null;
  endDate: string | null;
};

export type TaskFormValues = {
  title: string;
  /** A Task can belong to any number of categories (0, 1, or many). The
   * first entry is treated as the "primary" category wherever only one
   * category can be shown (colours, month view, patterns, summary stats). */
  categoryIds: string[];
  subtagId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  endTime: string | null;
  recurrence: string;
  projectId: string | null;
  newProject: NewProjectValues | null;
  /** Group a "Shared Task" belongs to directly (mutually exclusive with
   * projectId/newProject — a Task belongs to at most one of the two). */
  groupId: string | null;
  /** Lightweight checklist for duration tasks. */
  subitems: SubitemDraft[];
  /** "Can't miss this" marker — thicker border + icon wherever the task renders. */
  isCritical: boolean;
};

export function TaskForm({
  editingTask,
  onCancelEdit,
  onAddTask,
  onAddTaskSeries,
  onUpdateTask,
  categories,
  subtags,
  projects,
  projectItems,
  groups = [],
  forcedGroupId,
  hideProjectField,
  filter,
}: {
  editingTask: Task | null;
  onCancelEdit: () => void;
  onAddTask: (v: TaskFormValues) => void;
  /** Opt-in "독립 모드" — creates the recurring Task as real, independent
   * per-date rows from the start instead of one virtually-expanded row.
   * Only offered when adding (not editing) a recurring Task. */
  onAddTaskSeries?: (v: TaskFormValues) => void;
  onUpdateTask: (id: string, v: TaskFormValues) => void;
  categories: Category[];
  subtags: Subtag[];
  projects: MultipleTask[];
  projectItems: MultipleTaskItem[];
  /** Groups a new/edited Task can be assigned to directly as a Shared Task. */
  groups?: Group[];
  /** Pre-selects (and defaults new tasks to) this Group — used by the "Add
   * Shared Task" flow inside a Group's detail view. */
  forcedGroupId?: string;
  /** Hide the Project selector entirely — used by the "Add Shared Task" flow
   * inside a Group's detail view, where a Task added here must stay a pure
   * Group-level Shared Task and should never be assignable to a Project. */
  hideProjectField?: boolean;
  filter: CategoryFilter;
}) {
  const emptyForm = (): TaskFormValues => ({
    title: "",
    categoryIds: filter.categoryId ? [filter.categoryId] : [],
    subtagId: filter.subtagId,
    dueDate: todayLocalStr(),
    dueTime: null,
    endTime: null,
    recurrence: "none",
    projectId: null,
    newProject: null,
    groupId: forcedGroupId ?? null,
    subitems: [],
    isCritical: false,
  });

  const [form, setForm] = useState<TaskFormValues>(emptyForm);
  const [independentMode, setIndependentMode] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setForm({
        title: editingTask.title,
        categoryIds: editingTask.category_ids?.length
          ? editingTask.category_ids
          : editingTask.category_id
            ? [editingTask.category_id]
            : [],
        subtagId: editingTask.subtag_id,
        dueDate: editingTask.due_date ?? todayLocalStr(),
        dueTime: shortTime(editingTask.due_time) || null,
        endTime: shortTime(editingTask.end_time) || null,
        recurrence: editingTask.recurrence ?? "none",
        projectId: editingTask.multiple_task_id ?? null,
        newProject: null,
        groupId: editingTask.group_id ?? null,
        subitems: [],
        isCritical: editingTask.is_critical ?? false,
      });
    }
  }, [editingTask]);

  const subitemsQ = useQuery({
    queryKey: ["task-subitems", editingTask?.id],
    queryFn: () => fetchSubitemsForTask(editingTask!.id),
    enabled: !!editingTask,
  });

  useEffect(() => {
    if (!editingTask || !subitemsQ.data) return;
    setForm((f) => ({
      ...f,
      subitems: subitemsQ.data.map((s) => ({
        id: s.id,
        time: s.time ? s.time.slice(0, 5) : null,
        content: s.content,
        completed: s.completed,
      })),
    }));
  }, [editingTask?.id, subitemsQ.data]);

  useEffect(() => {
    if (!editingTask) {
      setForm(emptyForm());
    }
  }, [filter.categoryId, filter.subtagId]);

  const resetForm = () => setForm(emptyForm());

  /**
   * Fully completed projects are hidden from the dropdown so new tasks aren't
   * added to them by mistake. Projects with no sub-tasks (0/0) have no progress
   * at all, so they stay selectable.
   */
  const selectableProjects = projects.filter((p) => {
    const items = projectItems.filter((i) => i.multiple_task_id === p.id);
    if (items.length === 0) return true;
    if (p.id === form.projectId || p.id === editingTask?.multiple_task_id) return true;
    return items.some((i) => !i.completed);
  });

  const submit = () => {
    if (!form.title.trim()) return;
    if (!form.dueDate) return; // 날짜 없는 항목은 Task가 아니라 Idea — Ideas & Goals에서 추가하세요.
    if (form.newProject && !form.newProject.name.trim()) return;
    const payload: TaskFormValues = {
      ...form,
      title: form.title.trim(),
      recurrence: form.dueDate ? form.recurrence : "none",
      dueTime: form.dueDate ? form.dueTime : null,
      endTime: form.dueDate ? form.endTime : null,
      newProject: form.newProject
        ? { ...form.newProject, name: form.newProject.name.trim() }
        : null,
    };
    if (editingTask) {
      onUpdateTask(editingTask.id, payload);
      onCancelEdit();
    } else if (independentMode && payload.recurrence !== "none" && onAddTaskSeries) {
      onAddTaskSeries(payload);
    } else {
      onAddTask(payload);
    }
    setIndependentMode(false);
    resetForm();
  };

  return (
    <div className="card-flat p-2 mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <p className="label-caps text-[10px]">{editingTask ? "Edit task" : "New task"}</p>
        {editingTask && (
          <button
            onClick={() => { onCancelEdit(); resetForm(); }}
            className="ml-auto hover:text-destructive"
            aria-label="Cancel edit"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <input
        type="text"
        placeholder="Task title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="w-full bg-transparent outline-none text-sm border-b border-border py-1"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-[10px] label-caps text-muted-foreground">Date</label>
        <input
          type="date"
          value={form.dueDate ?? ""}
          required
          onChange={(e) => setForm({ ...form, dueDate: e.target.value || todayLocalStr() })}
          className="bg-transparent outline-none text-sm border-b border-border py-1"
        />
        {form.dueDate && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatDateKo(form.dueDate)} ({koDow(form.dueDate)})
          </span>
        )}
        <label className="text-[10px] label-caps text-muted-foreground">Time</label>
        <input
          type="time"
          value={form.dueTime ?? ""}
          disabled={!form.dueDate}
          onChange={(e) => setForm({ ...form, dueTime: e.target.value || null })}
          className="bg-transparent outline-none text-sm border-b border-border py-1 disabled:opacity-40"
        />
        <label className="text-[10px] label-caps text-muted-foreground">End</label>
        <input
          type="time"
          value={form.endTime ?? ""}
          onChange={(e) => setForm({ ...form, endTime: e.target.value || null })}
          disabled={!form.dueTime}
          title={form.dueTime ? "Optional end time" : "Set a start time first"}
          className="bg-transparent outline-none text-sm border-b border-border py-1 disabled:opacity-40"
        />
        <CategoryMultiSelect
          categories={categories}
          value={form.categoryIds}
          onChange={(ids) =>
            setForm({
              ...form,
              categoryIds: ids,
              subtagId:
                form.subtagId && subtags.some((s) => s.id === form.subtagId && ids.includes(s.category_id))
                  ? form.subtagId
                  : null,
            })
          }
        />
        <select
          value={form.subtagId ?? ""}
          onChange={(e) => setForm({ ...form, subtagId: e.target.value || null })}
          className="bg-transparent outline-none text-sm border-b border-border py-1"
          disabled={form.categoryIds.length === 0}
        >
          <option value="">no sub</option>
          {subtags.filter((s) => form.categoryIds.includes(s.category_id)).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={form.dueDate ? form.recurrence : "none"}
          onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
          disabled={!form.dueDate}
          title={form.dueDate ? "Recurrence" : "날짜 미정 항목은 반복할 수 없습니다"}
          className="bg-transparent outline-none text-sm border-b border-border py-1 disabled:opacity-40"
        >
          <option value="none">once</option>
          <option value="daily">daily</option>
          <option value="weekly">weekly</option>
          <option value="biweekly">biweekly</option>
          <option value="monthly">monthly</option>
        </select>
        {!editingTask && onAddTaskSeries && form.recurrence !== "none" && (
          <label
            className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground"
            title="각 날짜가 완전히 독립된 항목으로 미리 생성돼요 — 메모/시간을 날짜별로 따로 수정할 수 있어요 (페이로그 등에 적합)"
          >
            <input
              type="checkbox"
              checked={independentMode}
              onChange={(e) => setIndependentMode(e.target.checked)}
              className="h-3 w-3 accent-foreground"
            />
            날짜별 독립 운용
          </label>
        )}
        {!hideProjectField && (
          <select
            value={form.newProject ? "__new__" : (form.projectId ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__new__") {
                setForm({ ...form, projectId: null, newProject: { name: "", startDate: null, endDate: null }, groupId: null });
              } else {
                setForm({ ...form, projectId: v || null, newProject: null, groupId: v ? null : form.groupId });
              }
            }}
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          >
            <option value="">소속 프로젝트 없음</option>
            {selectableProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="__new__">+ 새 프로젝트</option>
          </select>
        )}
        {groups.length > 0 && (
          <select
            value={form.groupId ?? ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setForm({
                ...form,
                groupId: v,
                projectId: v ? null : form.projectId,
                newProject: v ? null : form.newProject,
              });
            }}
            title="Shared Task — a Group-level Task, mutually exclusive with Project"
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          >
            <option value="">그룹 없음</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
        <label
          className={`flex items-center gap-1 text-[10px] label-caps ${form.isCritical ? "text-foreground" : "text-muted-foreground"}`}
          title="놓치면 안 됨"
        >
          <input
            type="checkbox"
            checked={form.isCritical}
            onChange={(e) => setForm({ ...form, isCritical: e.target.checked })}
            className="h-3 w-3 accent-foreground"
          />
          <AlertTriangle size={11} />
          Critical
        </label>
        <button
          onClick={submit}
          className="ml-auto border border-border px-3 py-1 label-caps hover:bg-muted flex items-center gap-1"
        >
          <Plus size={12} /> {editingTask ? "Save" : "Add"}
        </button>
      </div>
      {!hideProjectField && form.newProject && (
        <div className="border-t border-border pt-2 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="새 프로젝트 이름"
            value={form.newProject.name}
            onChange={(e) =>
              setForm({ ...form, newProject: { ...form.newProject!, name: e.target.value } })
            }
            className="flex-1 min-w-[140px] bg-transparent outline-none text-sm border-b border-border py-1"
          />
          <label className="text-[10px] label-caps text-muted-foreground">Start</label>
          <input
            type="date"
            value={form.newProject.startDate ?? ""}
            onChange={(e) =>
              setForm({ ...form, newProject: { ...form.newProject!, startDate: e.target.value || null } })
            }
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          />
          <label className="text-[10px] label-caps text-muted-foreground">End</label>
          <input
            type="date"
            value={form.newProject.endDate ?? ""}
            onChange={(e) =>
              setForm({ ...form, newProject: { ...form.newProject!, endDate: e.target.value || null } })
            }
            className="bg-transparent outline-none text-sm border-b border-border py-1"
          />
          <button
            onClick={() => setForm({ ...form, newProject: null })}
            aria-label="Cancel new project"
            className="hover:text-destructive"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {form.dueTime && form.endTime && (
        <div className="border-t border-border pt-2 space-y-1">
          <p className="label-caps text-[10px] text-muted-foreground">상세 항목</p>
          {form.subitems.map((si, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                value={si.time ?? ""}
                onChange={(e) => {
                  const next = [...form.subitems];
                  next[i] = { ...si, time: e.target.value || null };
                  setForm({ ...form, subitems: next });
                }}
                className="bg-transparent outline-none text-sm border-b border-border py-1"
              />
              <input
                type="text"
                placeholder="할 일 메모"
                value={si.content}
                onChange={(e) => {
                  const next = [...form.subitems];
                  next[i] = { ...si, content: e.target.value };
                  setForm({ ...form, subitems: next });
                }}
                className="flex-1 min-w-[100px] bg-transparent outline-none text-sm border-b border-border py-1"
              />
              <button
                onClick={() =>
                  setForm({ ...form, subitems: form.subitems.filter((_, j) => j !== i) })
                }
                aria-label="상세 항목 삭제"
                className="hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setForm({
                ...form,
                subitems: [...form.subitems, { time: null, content: "", completed: false }],
              })
            }
            className="border border-border px-2 py-1 label-caps hover:bg-muted flex items-center gap-1"
          >
            <Plus size={12} /> 상세 항목 추가
          </button>
        </div>
      )}
    </div>
  );
}

/** Dropdown checklist — a Task can belong to any number of categories (0+). */
function CategoryMultiSelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const label =
    value.length === 0
      ? "no cat"
      : value
          .map((id) => categories.find((c) => c.id === id)?.name)
          .filter(Boolean)
          .join(", ");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-transparent outline-none text-sm border-b border-border py-1 max-w-[140px] truncate text-left"
        title={label}
      >
        {label}
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 card-flat bg-background border border-border p-1 min-w-[140px] max-h-[220px] overflow-y-auto">
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-2 py-1">No categories</p>
          )}
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-muted cursor-pointer whitespace-nowrap"
            >
              <input
                type="checkbox"
                checked={value.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="h-3 w-3 accent-foreground"
              />
              <span className="inline-block h-2 w-2 flex-shrink-0" style={{ background: c.color }} />
              {c.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
