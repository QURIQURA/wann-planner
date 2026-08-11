import { registerWidget } from "@/lib/widget-registry";
import { useState } from "react";
import type { Category, MultipleTask, MultipleTaskItem, Subtag } from "@/lib/wann-data";
import { todayLocalStr, taskSortKey, formatDateKo, koDow } from "@/lib/wann-data";
import { Plus, Trash2, X, Pencil, ChevronDown, ChevronRight } from "lucide-react";

export type MultipleTaskForm = {
  name: string;
  categoryId: string | null;
  subtagId: string | null;
  /** start date */
  date: string | null;
  /** end date (optional — same as start / null means single day) */
  endDate: string | null;
};

const emptyForm = (): MultipleTaskForm => ({
  name: "",
  categoryId: null,
  subtagId: null,
  date: todayLocalStr(),
  endDate: null,
});


export function MultipleTasksPanel({
  entries,
  items,
  categories,
  subtags,
  onAdd,
  onUpdate,
  onDelete,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
}: {
  entries: MultipleTask[];
  items: MultipleTaskItem[];
  categories: Category[];
  subtags: Subtag[];
  onAdd: (v: MultipleTaskForm) => void;
  onUpdate: (id: string, patch: MultipleTaskForm) => void;
  onDelete: (id: string) => void;
  onAddItem: (parentId: string, title: string, date: string | null, time: string | null) => void;
  onUpdateItem: (id: string, patch: { title?: string; date?: string | null; time?: string | null }) => void;
  onToggleItem: (item: MultipleTaskItem) => void;

  onDeleteItem: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MultipleTaskForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MultipleTaskForm>(emptyForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [childInput, setChildInput] = useState<Record<string, string>>({});
  const [childDate, setChildDate] = useState<Record<string, string>>({});
  const [childTime, setChildTime] = useState<Record<string, string>>({});

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");
  const [filter, setFilter] = useState<{ categoryId: string | null; subtagId: string | null }>({
    categoryId: null,
    subtagId: null,
  });

  const startEdit = (e: MultipleTask) => {
    setEditingId(e.id);
    setEditForm({
      name: e.name,
      categoryId: e.category_id,
      subtagId: (e as MultipleTask & { subtag_id: string | null }).subtag_id ?? null,
      date: e.date,
      endDate: (e as MultipleTask & { end_date: string | null }).end_date ?? null,
    });
  };


  const filterSubtags = filter.categoryId
    ? subtags.filter((s) => s.category_id === filter.categoryId)
    : [];

  const visible = entries.filter((e) => {
    if (filter.categoryId && e.category_id !== filter.categoryId) return false;
    if (filter.subtagId && (e as MultipleTask & { subtag_id: string | null }).subtag_id !== filter.subtagId) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Multiple Task</p>
        <span className="text-[10px] text-muted-foreground">Tasks 폼에서 생성</span>
      </div>


      {/* filters */}
      <div className="flex flex-wrap gap-1 mb-2">
        <button
          onClick={() => setFilter({ categoryId: null, subtagId: null })}
          className={`border border-border px-2 py-1 label-caps text-[10px] ${!filter.categoryId ? "bg-foreground text-background" : "hover:bg-muted"}`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter({ categoryId: c.id, subtagId: null })}
            className={`border border-border px-2 py-1 label-caps text-[10px] flex items-center gap-1 ${filter.categoryId === c.id ? "bg-foreground text-background" : "hover:bg-muted"}`}
          >
            <span className="inline-block h-2 w-2" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
      </div>
      {filter.categoryId && filterSubtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          <button
            onClick={() => setFilter({ ...filter, subtagId: null })}
            className={`border border-border px-2 py-1 text-xs ${!filter.subtagId ? "bg-muted" : "hover:bg-muted"}`}
          >
            all
          </button>
          {filterSubtags.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter({ ...filter, subtagId: s.id })}
              className={`border border-border px-2 py-1 text-xs ${filter.subtagId === s.id ? "bg-muted" : "hover:bg-muted"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}


      <div className="space-y-1">
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No entries</p>
        )}
        {visible.map((e) => {
          const cat = e.category_id ? categories.find((c) => c.id === e.category_id) : null;
          const subId = (e as MultipleTask & { subtag_id: string | null }).subtag_id ?? null;
          const sub = subId ? subtags.find((s) => s.id === subId) : null;
          const showSub = sub && sub.name.trim().toLowerCase() !== e.name.trim().toLowerCase();
          const children = items
            .filter((i) => i.multiple_task_id === e.id)
            .slice()
            .sort((a, b) => {
              const k = taskSortKey(a).localeCompare(taskSortKey(b));
              return k !== 0 ? k : a.title.localeCompare(b.title);
            });
          const done = children.filter((i) => i.completed).length;
          const total = children.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : null;
          const expanded = expandedId === e.id;
          const editing = editingId === e.id;

          return (
            <div key={e.id} id={`mt-${e.id}`} className="border-b border-border/50 rounded-sm transition-shadow">
              <div className="flex items-center gap-2 py-1 group">
                <button
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  className="text-muted-foreground"
                  aria-label="Expand"
                >
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {e.date && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {e.date.slice(5)} ({koDow(e.date)})
                    {e.end_date && e.end_date !== e.date
                      ? ` → ${e.end_date.slice(5)} (${koDow(e.end_date)})`
                      : ""}
                  </span>
                )}

                <button
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  className="text-sm flex-1 text-left hover:underline"
                >
                  {e.name}
                  {pct !== null && (
                    <span className="text-muted-foreground"> · {pct}%</span>
                  )}
                </button>
                {cat && (
                  <span
                    className="text-[10px] label-caps border border-border px-1"
                    style={{ color: cat.color }}
                  >
                    {cat.name}
                  </span>
                )}
                {showSub && (
                  <span className="text-[9px] text-muted-foreground border-b border-border">
                    {sub!.name}
                  </span>
                )}
                <button
                  onClick={() => startEdit(e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-foreground"
                  aria-label="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => onDelete(e.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {pct !== null && (
                <div className="h-[2px] bg-border mb-1">
                  <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                </div>
              )}

              {editing && (
                <div className="mb-2">
                  <MultipleTaskEditor
                    value={editForm}
                    onChange={setEditForm}
                    categories={categories}
                    subtags={subtags}
                    submitLabel="Save"
                    onSubmit={() => {
                      onUpdate(e.id, { ...editForm, name: editForm.name.trim() });
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}

              {expanded && (
                <div className="pl-8 pr-1 pb-2 space-y-1">
                  {children.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No items</p>
                  )}
                  {children.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 group/child">
                      <button
                        onClick={() => onToggleItem(it)}
                        aria-label="Toggle"
                        className={`h-3 w-3 border border-border flex-shrink-0 ${it.completed ? "bg-foreground" : ""}`}
                      />
                      {editingItemId === it.id ? (
                        <input
                          autoFocus
                          value={editingItemTitle}
                          onChange={(ev) => setEditingItemTitle(ev.target.value)}
                          onBlur={() => {
                            const v = editingItemTitle.trim();
                            if (v && v !== it.title) onUpdateItem(it.id, { title: v });
                            setEditingItemId(null);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                            if (ev.key === "Escape") setEditingItemId(null);
                          }}
                          className="flex-1 bg-transparent outline-none border-b border-border py-0.5 text-sm"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingItemId(it.id); setEditingItemTitle(it.title); }}
                          className={`text-sm flex-1 text-left hover:underline ${it.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {it.title}
                        </button>
                      )}
                      <input
                        type="date"
                        value={it.due_date ?? ""}
                        onChange={(ev) => onUpdateItem(it.id, { date: ev.target.value || null })}
                        aria-label="Item date"
                        className="bg-transparent border-b border-border text-[10px] text-muted-foreground w-[92px]"
                      />
                      {it.due_date && (
                        <span className="text-[10px] text-muted-foreground w-4">({koDow(it.due_date)})</span>
                      )}
                      <input
                        type="time"
                        value={it.due_time ? it.due_time.slice(0, 5) : ""}
                        onChange={(ev) => onUpdateItem(it.id, { time: ev.target.value || null })}
                        aria-label="Item time"
                        className="bg-transparent border-b border-border text-[10px] text-muted-foreground w-[64px]"
                      />
                      <button
                        onClick={() => onDeleteItem(it.id)}
                        aria-label="Delete item"
                        className="opacity-0 group-hover/child:opacity-100 hover:text-destructive"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1 pt-1 items-center">
                    <input
                      type="text"
                      placeholder="+ Add item"
                      value={childInput[e.id] ?? ""}
                      onChange={(ev) => setChildInput({ ...childInput, [e.id]: ev.target.value })}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          const v = (childInput[e.id] ?? "").trim();
                          if (v) {
                            onAddItem(e.id, v, childDate[e.id] || e.date || null, childTime[e.id] || null);
                            setChildInput({ ...childInput, [e.id]: "" });
                            setChildDate({ ...childDate, [e.id]: "" });
                            setChildTime({ ...childTime, [e.id]: "" });
                          }
                        }
                      }}
                      className="flex-1 bg-transparent outline-none border-b border-border py-1 text-xs"
                    />
                    <input
                      type="date"
                      value={childDate[e.id] ?? ""}
                      onChange={(ev) => setChildDate({ ...childDate, [e.id]: ev.target.value })}
                      aria-label="New item date"
                      className="bg-transparent border-b border-border text-[10px] text-muted-foreground w-[92px]"
                    />
                    {childDate[e.id] && (
                      <span className="text-[10px] text-muted-foreground w-4">({koDow(childDate[e.id])})</span>
                    )}
                    <input
                      type="time"
                      value={childTime[e.id] ?? ""}
                      onChange={(ev) => setChildTime({ ...childTime, [e.id]: ev.target.value })}
                      aria-label="New item time"
                      className="bg-transparent border-b border-border text-[10px] text-muted-foreground w-[64px]"
                    />
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultipleTaskEditor({
  value,
  onChange,
  categories,
  subtags,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  value: MultipleTaskForm;
  onChange: (v: MultipleTaskForm) => void;
  categories: Category[];
  subtags: Subtag[];
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="card-flat p-3 mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Name (e.g. 한인마트)"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="flex-1 bg-transparent outline-none border-b border-border py-1 text-sm"
        />
        <button onClick={onCancel} aria-label="Cancel" className="hover:text-destructive">
          <X size={12} />
        </button>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground label-caps">
          시작
          <input
            type="date"
            value={value.date ?? ""}
            onChange={(e) => onChange({ ...value, date: e.target.value || null })}
            className="bg-transparent outline-none border-b border-border py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground label-caps">
          종료
          <input
            type="date"
            value={value.endDate ?? ""}
            min={value.date ?? undefined}
            onChange={(e) => onChange({ ...value, endDate: e.target.value || null })}
            className="bg-transparent outline-none border-b border-border py-1 text-sm"
          />
        </label>
        {value.date && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatDateKo(value.date)}
            {value.endDate ? ` → ${formatDateKo(value.endDate)}` : ""}
          </span>
        )}

        <select
          value={value.categoryId ?? ""}
          onChange={(e) => onChange({ ...value, categoryId: e.target.value || null, subtagId: null })}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        >
          <option value="">no cat</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={value.subtagId ?? ""}
          onChange={(e) => onChange({ ...value, subtagId: e.target.value || null })}
          disabled={!value.categoryId}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        >
          <option value="">no sub</option>
          {subtags.filter((s) => s.category_id === value.categoryId).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={onSubmit}
          className="ml-auto border border-border px-3 py-1 label-caps hover:bg-muted"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

registerWidget({
  id: "multiple_tasks",
  label: "Multiple Task",
  render: (ctx) => (
    <section className="card-flat p-4">
      <MultipleTasksPanel
        entries={ctx.projects}
        items={ctx.projectItems}
        categories={ctx.categories}
        subtags={ctx.subtags}
        {...ctx.projectActions}
      />
    </section>
  ),
});
