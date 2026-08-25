import { useEffect, useState } from "react";
import type { Category, MultipleTask, MultipleTaskItem, Subtag, Task } from "@/lib/wann-data";
import { todayLocalStr, shortTime, formatDateKo, koDow } from "@/lib/wann-data";
import { Plus, Trash2, X } from "lucide-react";
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
  categoryId: string | null;
  subtagId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  endTime: string | null;
  recurrence: string;
  projectId: string | null;
  newProject: NewProjectValues | null;
  /** Lightweight checklist for duration tasks. */
  subitems: SubitemDraft[];
};

export function TaskForm({
  editingTask,
  onCancelEdit,
  onAddTask,
  onUpdateTask,
  categories,
  subtags,
  projects,
  projectItems,
  filter,
}: {
  editingTask: Task | null;
  onCancelEdit: () => void;
  onAddTask: (v: TaskFormValues) => void;
  onUpdateTask: (id: string, v: TaskFormValues) => void;
  categories: Category[];
  subtags: Subtag[];
  projects: MultipleTask[];
  projectItems: MultipleTaskItem[];
  filter: CategoryFilter;
}) {
  const emptyForm = (): TaskFormValues => ({
    title: "",
    categoryId: filter.categoryId,
    subtagId: filter.subtagId,
    dueDate: todayLocalStr(),
    dueTime: null,
    endTime: null,
    recurrence: "none",
    projectId: null,
    newProject: null,
    subitems: [],
  });

  const [form, setForm] = useState<TaskFormValues>(emptyForm);

  useEffect(() => {
    if (editingTask) {
      setForm({
        title: editingTask.title,
        categoryId: editingTask.category_id,
        subtagId: editingTask.subtag_id,
        dueDate: editingTask.due_date ?? todayLocalStr(),
        dueTime: shortTime(editingTask.due_time) || null,
        endTime: shortTime(editingTask.end_time) || null,
        recurrence: editingTask.recurrence ?? "none",
        projectId: editingTask.multiple_task_id ?? null,
        newProject: null,
        subitems: [],
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
    if (form.newProject && !form.newProject.name.trim()) return;
    const payload: TaskFormValues = {
      ...form,
      title: form.title.trim(),
      newProject: form.newProject
        ? { ...form.newProject, name: form.newProject.name.trim() }
        : null,
    };
    if (editingTask) {
      onUpdateTask(editingTask.id, payload);
      onCancelEdit();
    } else {
      onAddTask(payload);
    }
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
          disabled={form.dueDate === null}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
          className="bg-transparent outline-none text-sm border-b border-border py-1 disabled:opacity-40"
        />
        <label className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground">
          <input
            type="checkbox"
            checked={form.dueDate === null}
            onChange={(e) =>
              setForm(
                e.target.checked
                  ? { ...form, dueDate: null, dueTime: null, endTime: null, recurrence: "none" }
                  : { ...form, dueDate: todayLocalStr() },
              )
            }
            className="h-3 w-3 accent-foreground"
          />
          날짜 미정
        </label>
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
        <select
          value={form.categoryId ?? ""}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value || null, subtagId: null })}
          className="bg-transparent outline-none text-sm border-b border-border py-1"
        >
          <option value="">no cat</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={form.subtagId ?? ""}
          onChange={(e) => setForm({ ...form, subtagId: e.target.value || null })}
          className="bg-transparent outline-none text-sm border-b border-border py-1"
          disabled={!form.categoryId}
        >
          <option value="">no sub</option>
          {subtags.filter((s) => s.category_id === form.categoryId).map((s) => (
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
        <select
          value={form.newProject ? "__new__" : (form.projectId ?? "")}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__new__") {
              setForm({ ...form, projectId: null, newProject: { name: "", startDate: null, endDate: null } });
            } else {
              setForm({ ...form, projectId: v || null, newProject: null });
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
        <button
          onClick={submit}
          className="ml-auto border border-border px-3 py-1 label-caps hover:bg-muted flex items-center gap-1"
        >
          <Plus size={12} /> {editingTask ? "Save" : "Add"}
        </button>
      </div>
      {form.newProject && (
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
