import type { WidgetDef } from "@/lib/widget-registry";
import { useState } from "react";
import type { Category, MultipleTask, MultipleTaskItem, Subtag, Task } from "@/lib/wann-data";
import { todayLocalStr, taskSortKey, formatDateKo, koDow, amPmOnly } from "@/lib/wann-data";
import { PRODUCT_LINES } from "@/lib/wann-groups";
import { Plus, Trash2, X, Pencil, ChevronDown, ChevronRight, Check } from "lucide-react";
import type { CategoryFilter } from "./TaskForm";
import { StageTracker, StageDot } from "./StageTracker";
import type { Stage } from "@/lib/wann-stages";


export type MultipleTaskForm = {
  name: string;
  categoryId: string | null;
  subtagId: string | null;
  /** start date */
  date: string | null;
  /** end date (optional — same as start / null means single day) */
  endDate: string | null;
  /** Direct Product Line tag — e.g. this week's instance of Weekly Surprise
   * Cake. Replaces the deprecated Group-based batching. */
  productLine: string | null;
};

export const emptyMultipleTaskForm = (): MultipleTaskForm => ({
  name: "",
  categoryId: null,
  subtagId: null,
  date: todayLocalStr(),
  endDate: null,
  productLine: null,
});


export function MultipleTasksPanel({
  entries,
  items,
  categories,
  subtags,
  onAdd,
  onUpdate,
  onDelete,
  deleteLabel = "Delete",
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
  filter: filterProp,
  onFilterChange,
  hideFilterBar,
  hideHeader,
  allTasks,
  stages = [],
}: {

  entries: MultipleTask[];
  items: MultipleTaskItem[];
  categories: Category[];
  subtags: Subtag[];
  onAdd: (v: MultipleTaskForm) => void;
  onUpdate: (id: string, patch: MultipleTaskForm) => void;
  onDelete: (id: string) => void;
  /** Label/title for the row delete button — override when this instance's
   * onDelete isn't a hard delete. */
  deleteLabel?: string;
  onAddItem: (parentId: string, title: string, date: string | null, time: string | null) => void;
  onUpdateItem: (id: string, patch: { title?: string; date?: string | null; time?: string | null; stage?: string | null; link?: string | null }) => void;
  onToggleItem: (item: MultipleTaskItem) => void;

  onDeleteItem: (id: string) => void;
  /** Controlled category filter (shared with the Tasks column). */
  filter?: CategoryFilter;
  onFilterChange?: (f: CategoryFilter) => void;
  /** Hide the built-in filter bar when a shared one is rendered above. */
  hideFilterBar?: boolean;
  /** Hide the built-in "Projects" header when the caller already renders
   * its own. */
  hideHeader?: boolean;
  /** Full unfiltered Task list — when provided, used to compute each
   * Project's tagged Tasks for the stage tracker row. */
  allTasks?: Task[];
  /** Editable per-user production stage list (Settings > 단계) — passed down
   * to the stage tracker/dot picker. Empty until the caller wires it up. */
  stages?: Stage[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MultipleTaskForm>(emptyMultipleTaskForm());
  // A Set so any number of Projects can stay expanded at once — toggling one
  // no longer collapses the others.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [showUndated, setShowUndated] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const [childInput, setChildInput] = useState<Record<string, string>>({});
  const [childDate, setChildDate] = useState<Record<string, string>>({});
  const [childTime, setChildTime] = useState<Record<string, string>>({});

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");
  /** Separate edit mode for a linked item's title+link, opened via its Edit
   * (pencil) button — kept apart from editingItemId/editingItemTitle since a
   * linked item's title renders as a live <a>, not a click-to-edit button. */
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkTitle, setEditingLinkTitle] = useState("");
  const [editingLinkUrl, setEditingLinkUrl] = useState("");
  const [localFilter, setLocalFilter] = useState<CategoryFilter>({
    categoryId: null,
    subtagId: null,
  });
  const filter = filterProp ?? localFilter;
  const setFilter = (f: CategoryFilter) => (onFilterChange ? onFilterChange(f) : setLocalFilter(f));


  const startEdit = (e: MultipleTask) => {
    setEditingId(e.id);
    setEditForm({
      name: e.name,
      categoryId: e.category_id,
      subtagId: (e as MultipleTask & { subtag_id: string | null }).subtag_id ?? null,
      date: e.date,
      endDate: (e as MultipleTask & { end_date: string | null }).end_date ?? null,
      productLine: (e as MultipleTask & { product_line: string | null }).product_line ?? null,
    });
  };


  /** Commits the pencil-triggered name+link edit — only sends the fields
   * that actually changed. */
  const saveLinkEdit = (it: MultipleTaskItem) => {
    const patch: { title?: string; link?: string | null } = {};
    const trimmedTitle = editingLinkTitle.trim();
    if (trimmedTitle && trimmedTitle !== it.title) patch.title = trimmedTitle;
    const trimmedUrl = editingLinkUrl.trim();
    if (trimmedUrl !== (it.link_url ?? "")) patch.link = trimmedUrl || null;
    if (Object.keys(patch).length > 0) onUpdateItem(it.id, patch);
    setEditingLinkId(null);
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
      {!hideHeader && (
        <div className="flex items-center justify-between mb-4">
          <p className="label-caps">Projects</p>
          <span className="text-[10px] text-muted-foreground">Task 폼에서 생성</span>
        </div>
      )}


      {!hideFilterBar && (
      <>
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
      </>
      )}



      {(() => {
        const pctOf = (e: MultipleTask) => {
          const ch = items.filter((i) => i.multiple_task_id === e.id);
          return ch.length > 0
            ? Math.round((ch.filter((i) => i.completed).length / ch.length) * 100)
            : null;
        };
        const renderEntry = (e: MultipleTask) => {
          const cat = e.category_id ? categories.find((c) => c.id === e.category_id) : null;
          const subId = (e as MultipleTask & { subtag_id: string | null }).subtag_id ?? null;
          const sub = subId ? subtags.find((s) => s.id === subId) : null;
          const showSub = sub && sub.name.trim().toLowerCase() !== e.name.trim().toLowerCase();
          const children = items
            .filter((i) => i.multiple_task_id === e.id)
            .slice()
            .sort((a, b) => {
              // Linked items (moodboard/reference links) always pin to the
              // top of the checklist, ahead of date-sorted items.
              const linkRank = (b.link_url ? 1 : 0) - (a.link_url ? 1 : 0);
              if (linkRank !== 0) return linkRank;
              const k = taskSortKey(a).localeCompare(taskSortKey(b));
              return k !== 0 ? k : a.title.localeCompare(b.title);
            });
          const done = children.filter((i) => i.completed).length;
          const total = children.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : null;
          const expanded = expandedIds.has(e.id);
          const editing = editingId === e.id;
          const productLine = (e as MultipleTask & { product_line: string | null }).product_line ?? null;
          const productLineInfo = productLine ? PRODUCT_LINES.find((l) => l.key === productLine) : null;
          // Reads the real Tasks belonging to this Project (not the
          // lightweight checklist `items`), since that's where the stage
          // dropdown lives.
          const projectTasks = allTasks ? allTasks.filter((t) => t.multiple_task_id === e.id) : [];

          return (
            <div key={e.id} id={`mt-${e.id}`} className="border-b border-border/50 rounded-sm transition-shadow">
              <div className="flex items-center gap-2 py-1 group flex-wrap">
                <button
                  onClick={() => toggleExpanded(e.id)}
                  className="text-muted-foreground p-1 -m-1"
                  aria-label="Expand"
                >
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <button
                  onClick={() => toggleExpanded(e.id)}
                  className="text-sm flex-1 min-w-[6rem] text-left truncate hover:underline"
                >
                  {e.name}
                  {pct !== null && (
                    <span className="text-muted-foreground"> · {pct}%</span>
                  )}
                </button>
                {cat && (
                  <span className="text-[10px] px-1 label-caps bg-foreground text-background flex-shrink-0">
                    {cat.name}
                  </span>
                )}
                {expanded && showSub && (
                  <span className="text-[9px] text-muted-foreground border-b border-border">
                    {sub!.name}
                  </span>
                )}
                {expanded && productLineInfo && (
                  <span
                    className="text-[10px] label-caps border border-border rounded-full px-1.5 py-0.5 text-muted-foreground max-w-[90px] truncate flex-shrink-0"
                    title="제품 라인"
                  >
                    {productLineInfo.label}
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
                  aria-label={deleteLabel}
                  title={deleteLabel}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {expanded && e.date && (
                <p className="pl-5 -mt-1 mb-1 text-xs text-muted-foreground whitespace-nowrap">
                  {e.date.slice(5)} ({koDow(e.date)})
                  {e.end_date && e.end_date !== e.date
                    ? ` → ${e.end_date.slice(5)} (${koDow(e.end_date)})`
                    : ""}
                </p>
              )}

              {pct !== null && (
                <div className="h-[2px] bg-border mb-1">
                  <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                </div>
              )}

              <StageTracker stages={stages} tasks={projectTasks} />

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
                    <div key={it.id} className="flex items-center gap-2 flex-wrap group/child">
                      <StageDot
                        stages={stages}
                        value={it.stage}
                        onChange={(stage) => onUpdateItem(it.id, { stage })}
                      />
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
                          className="flex-1 min-w-[6rem] bg-transparent outline-none border-b border-border py-0.5 text-sm"
                        />
                      ) : editingLinkId === it.id ? (
                        // Full edit — name + link together — opened via the
                        // Edit (pencil) button. Kept separate from the plain
                        // rename input above since it needs two fields.
                        <div className="flex-1 flex items-center gap-1 min-w-[10rem] flex-wrap">
                          <input
                            autoFocus
                            value={editingLinkTitle}
                            placeholder="이름"
                            onChange={(ev) => setEditingLinkTitle(ev.target.value)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") saveLinkEdit(it);
                              if (ev.key === "Escape") setEditingLinkId(null);
                            }}
                            className="flex-1 min-w-[5rem] bg-transparent outline-none border-b border-border py-0.5 text-sm"
                          />
                          <input
                            type="url"
                            value={editingLinkUrl}
                            placeholder="링크 (선택)"
                            onChange={(ev) => setEditingLinkUrl(ev.target.value)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") saveLinkEdit(it);
                              if (ev.key === "Escape") setEditingLinkId(null);
                            }}
                            className="flex-1 min-w-[7rem] bg-transparent outline-none border-b border-border py-0.5 text-xs text-muted-foreground"
                          />
                          <button
                            onClick={() => saveLinkEdit(it)}
                            aria-label="Save"
                            className="hover:text-foreground flex-shrink-0"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingLinkId(null)}
                            aria-label="Cancel"
                            className="hover:text-destructive flex-shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : it.link_url ? (
                        // A linked item (e.g. a Figma moodboard) shows its
                        // title as an actual hyperlink — clicking opens it
                        // directly; use the Edit button to rename or change
                        // the link (a second click handler here would open
                        // the link twice).
                        <a
                          href={it.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={it.link_url}
                          className={`text-sm flex-1 min-w-[6rem] truncate text-blue-600 dark:text-blue-400 underline decoration-blue-600/50 dark:decoration-blue-400/50 hover:text-blue-700 dark:hover:text-blue-300 ${it.completed ? "line-through opacity-60" : ""}`}
                        >
                          {it.title}
                        </a>
                      ) : (
                        <button
                          onClick={() => { setEditingItemId(it.id); setEditingItemTitle(it.title); }}
                          className={`text-sm flex-1 min-w-[6rem] text-left truncate hover:underline ${it.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {it.title}
                        </button>
                      )}
                      {!it.link_url && editingLinkId !== it.id && (
                        <>
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
                          {it.due_time && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {amPmOnly(it.due_time)}
                            </span>
                          )}
                        </>
                      )}
                      {editingLinkId !== it.id && (
                        <button
                          onClick={() => {
                            setEditingLinkId(it.id);
                            setEditingLinkTitle(it.title);
                            setEditingLinkUrl(it.link_url ?? "");
                          }}
                          aria-label="Edit"
                          title="이름/링크 수정"
                          className="opacity-0 group-hover/child:opacity-100 hover:text-foreground flex-shrink-0"
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteItem(it.id)}
                        aria-label="Delete item"
                        className="opacity-0 group-hover/child:opacity-100 hover:text-destructive"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1 pt-1 items-center flex-wrap">
                    <input
                      type="text"
                      placeholder="+ Add item"
                      value={childInput[e.id] ?? ""}
                      onChange={(ev) => setChildInput({ ...childInput, [e.id]: ev.target.value })}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" && !ev.nativeEvent.isComposing) {
                          const v = (childInput[e.id] ?? "").trim();
                          if (v) {
                            onAddItem(e.id, v, childDate[e.id] || e.date || null, childTime[e.id] || null);
                            setChildInput({ ...childInput, [e.id]: "" });
                            setChildDate({ ...childDate, [e.id]: "" });
                            setChildTime({ ...childTime, [e.id]: "" });
                          }
                        }
                      }}
                      className="flex-1 min-w-[8rem] bg-transparent outline-none border-b border-border py-1 text-xs"
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
        };

        const finished = visible.filter((e) => pctOf(e) === 100);
        const rest = visible.filter((e) => pctOf(e) !== 100);
        const active = rest
          .filter((e) => !!e.date)
          .slice()
          .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
        const undated = rest.filter((e) => !e.date);

        return (
          <div className="space-y-1">
            {visible.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No entries</p>
            )}
            {active.map(renderEntry)}
            {undated.length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <button
                  onClick={() => setShowUndated((v) => !v)}
                  className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground hover:text-foreground"
                >
                  {showUndated ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  날짜 미정 ({undated.length})
                </button>
                {showUndated && <div className="mt-1">{undated.map(renderEntry)}</div>}
              </div>
            )}
            {finished.length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <button
                  onClick={() => setShowFinished((v) => !v)}
                  className="flex items-center gap-1 text-[10px] label-caps text-muted-foreground hover:text-foreground"
                >
                  {showFinished ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  완료됨 ({finished.length})
                </button>
                {showFinished && <div className="mt-1">{finished.map(renderEntry)}</div>}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export function MultipleTaskEditor({
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
            disabled={value.date === null && value.endDate === null}
            onChange={(e) => onChange({ ...value, date: e.target.value || null })}
            className="bg-transparent outline-none border-b border-border py-1 text-sm disabled:opacity-40"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground label-caps">
          종료
          <input
            type="date"
            value={value.endDate ?? ""}
            min={value.date ?? undefined}
            disabled={value.date === null && value.endDate === null}
            onChange={(e) => onChange({ ...value, endDate: e.target.value || null })}
            className="bg-transparent outline-none border-b border-border py-1 text-sm disabled:opacity-40"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground label-caps">
          <input
            type="checkbox"
            checked={value.date === null && value.endDate === null}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { ...value, date: null, endDate: null }
                  : { ...value, date: todayLocalStr() },
              )
            }
            className="h-3 w-3 accent-foreground"
          />
          날짜 미정
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
        <select
          value={value.productLine ?? ""}
          onChange={(e) => onChange({ ...value, productLine: e.target.value || null })}
          title="이 Project가 소속된 제품 라인 (선택)"
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        >
          <option value="">제품 라인 없음</option>
          {PRODUCT_LINES.map((l) => (
            <option key={l.key} value={l.key}>{l.label}</option>
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

export const multipleTasksWidget: WidgetDef = {
  id: "multiple_tasks",
  label: "Multiple Task",
  render: (ctx) => (
    <section className="card-flat p-4">
      <MultipleTasksPanel
        entries={ctx.projects}
        items={ctx.projectItems}
        categories={ctx.categories}
        subtags={ctx.subtags}
        stages={ctx.stages}
        allTasks={ctx.tasks}
        {...ctx.projectActions}
      />
    </section>
  ),
};
