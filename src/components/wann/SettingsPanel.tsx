import { useState } from "react";
import { X, GripVertical, Plus, Trash2 } from "lucide-react";
import type { UserSettings } from "@/lib/wann-data";
import { orderedWidgets, isWidgetVisible } from "@/lib/widgets";
import type { Stage } from "@/lib/wann-stages";

const PRESETS = [
  { name: "Stone", bg: "#F5F4F1", border: "#D4D3CE", text: "#1A1A18" },
  { name: "Paper", bg: "#FAF8F3", border: "#E4DFD3", text: "#2A2620" },
  { name: "Slate", bg: "#E8E9EA", border: "#B8BCC0", text: "#141618" },
  { name: "Ink", bg: "#1A1A18", border: "#3A3A36", text: "#EDECE7" },
  { name: "Sand", bg: "#EEE7D8", border: "#C9BFA8", text: "#3D2E1B" },
];

const FONTS = [
  { id: "dm-mono", label: "DM Mono" },
  { id: "ibm-plex", label: "IBM Plex Mono" },
  { id: "system", label: "System" },
];


export function SettingsPanel({
  settings,
  onChange,
  onClose,
  stages,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
  onReorderStages,
}: {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
  onClose: () => void;
  /** Weekly-cake production stage list — Groups' Project traffic-light
   * tracker reads whatever's here (see StageTracker.tsx). Optional so this
   * panel still works for a caller that hasn't wired stages up. */
  stages?: Stage[];
  onAddStage?: (v: { label: string; color: string }) => void;
  onUpdateStage?: (id: string, patch: { label?: string; color?: string }) => void;
  onDeleteStage?: (id: string) => void;
  onReorderStages?: (orderedIds: string[]) => void;
}) {
  const [tab, setTab] = useState<"colors" | "font" | "widgets" | "stages">("colors");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/10">
      <div className="w-full max-w-md bg-background border-l border-border overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <p className="label-caps">Settings</p>
          <button onClick={onClose} className="hover:bg-muted p-1"><X size={16} /></button>
        </div>

        <div className="flex border-b border-border">
          {(["colors", "font", "widgets", "stages"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 label-caps border-r border-border last:border-r-0 ${tab === t ? "bg-muted" : "hover:bg-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "colors" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="label-caps mb-3 text-muted-foreground">Presets</p>
              <div className="grid grid-cols-5 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => onChange({ bg_color: p.bg, border_color: p.border, text_color: p.text })}
                    className="border border-border p-2 hover:opacity-80"
                    style={{ background: p.bg }}
                    title={p.name}
                  >
                    <div className="h-6" style={{ background: p.text }} />
                  </button>
                ))}
              </div>
            </div>
            <ColorRow label="Background" value={settings.bg_color} onChange={(v) => onChange({ bg_color: v })} />
            <ColorRow label="Border" value={settings.border_color} onChange={(v) => onChange({ border_color: v })} />
            <ColorRow label="Text" value={settings.text_color} onChange={(v) => onChange({ text_color: v })} />
            <div>
              <ColorRow
                label="Review Highlight"
                value={settings.review_highlight_color || "#FDE047"}
                onChange={(v) => onChange({ review_highlight_color: v })}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Timeline에서 다시 확인할 Goal/Idea에 붙는 하이라이터 색 — Task 카테고리 색과 헷갈리지 않게 직접 골라보세요. 기한이 지난 리뷰는 항상 빨간색으로 표시돼요.
              </p>
            </div>
          </div>
        )}

        {tab === "font" && (
          <div className="p-6 space-y-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => onChange({ font: f.id })}
                className={`w-full text-left border border-border p-3 flex items-center justify-between ${settings.font === f.id ? "bg-muted" : "hover:bg-muted"}`}
              >
                <span>{f.label}</span>
                {settings.font === f.id && <span className="label-caps">Active</span>}
              </button>
            ))}
          </div>
        )}

        {tab === "widgets" && <WidgetsTab settings={settings} onChange={onChange} />}

        {tab === "stages" && (
          <StagesTab
            stages={stages ?? []}
            onAdd={onAddStage}
            onUpdate={onUpdateStage}
            onDelete={onDeleteStage}
            onReorder={onReorderStages}
          />
        )}

      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="label-caps mb-2 text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 border border-border p-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
    </div>
  );
}

const NEW_STAGE_DEFAULT_COLOR = "#9CA3AF";

/**
 * Edit the weekly-cake production stage list — add/rename/recolor/reorder/
 * delete, all persisted to planner_cake_stages. Only Groups' Projects read
 * this list (see StageTracker.tsx), and a Task's `stage` stores a stage's
 * id, so renaming or recoloring never orphans a tagged Task. Deleting one
 * does leave any Tasks tagged with it showing "단계 없음" — a deliberate,
 * visible consequence rather than a silent cascade.
 */
function StagesTab({
  stages,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: {
  stages: Stage[];
  onAdd?: (v: { label: string; color: string }) => void;
  onUpdate?: (id: string, patch: { label?: string; color?: string }) => void;
  onDelete?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(NEW_STAGE_DEFAULT_COLOR);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order);

  const commitOrder = (fromId: string, toId: string) => {
    if (fromId === toId || !onReorder) return;
    const ids = sorted.map((s) => s.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
  };

  const submitNew = () => {
    const label = newLabel.trim();
    if (!label || !onAdd) return;
    onAdd({ label, color: newColor });
    setNewLabel("");
    setNewColor(NEW_STAGE_DEFAULT_COLOR);
  };

  return (
    <div className="p-6 space-y-4">
      <p className="text-[11px] text-muted-foreground">
        그룹에 속한 프로젝트의 신호등 단계예요. 순서는 드래그로, 색은 아래에서 바로 바꿀 수 있어요.
      </p>

      <div className="space-y-2">
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground italic">아직 단계가 없어요.</p>
        )}
        {sorted.map((s) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDragId(s.id)}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            onDragOver={(e) => { e.preventDefault(); setOverId(s.id); }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) commitOrder(dragId, s.id);
              setDragId(null);
              setOverId(null);
            }}
            className={`flex items-center gap-2 border border-border p-2 bg-background ${
              overId === s.id && dragId && dragId !== s.id ? "border-foreground" : ""
            } ${dragId === s.id ? "opacity-50" : ""}`}
          >
            <GripVertical size={14} className="cursor-grab text-muted-foreground shrink-0" />
            <input
              type="color"
              value={s.color}
              onChange={(e) => onUpdate?.(s.id, { color: e.target.value })}
              className="h-6 w-8 cursor-pointer flex-shrink-0"
              aria-label={`${s.label} 색`}
            />
            <input
              type="text"
              value={s.label}
              onChange={(e) => onUpdate?.(s.id, { label: e.target.value })}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm border-b border-transparent focus:border-border py-0.5"
            />
            <button
              onClick={() => onDelete?.(s.id)}
              aria-label={`${s.label} 삭제`}
              title="삭제 — 이 단계로 태그된 Task는 '단계 없음'이 돼요"
              className="text-muted-foreground hover:text-destructive flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-7 w-9 cursor-pointer flex-shrink-0"
          aria-label="새 단계 색"
        />
        <input
          type="text"
          placeholder="새 단계 이름"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submitNew(); }}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm border-b border-border py-1"
        />
        <button
          onClick={submitNew}
          className="border border-border px-3 py-1 label-caps hover:bg-muted flex items-center gap-1 flex-shrink-0"
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}

function WidgetsTab({
  settings,
  onChange,
}: {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
}) {
  const widgets = orderedWidgets(settings.widget_order);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const commitOrder = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = widgets.map((w) => w.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onChange({ widget_order: ids });
  };

  return (
    <div className="p-6 space-y-2">
      <p className="label-caps text-muted-foreground mb-3">Drag to reorder</p>
      {widgets.map((w) => {
        const on = isWidgetVisible(w, settings.widget_visibility);
        return (
          <div
            key={w.id}
            draggable
            onDragStart={() => setDragId(w.id)}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            onDragOver={(e) => { e.preventDefault(); setOverId(w.id); }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) commitOrder(dragId, w.id);
              setDragId(null);
              setOverId(null);
            }}
            className={`flex items-center justify-between gap-3 border border-border p-3 bg-background ${
              overId === w.id && dragId && dragId !== w.id ? "border-foreground" : ""
            } ${dragId === w.id ? "opacity-50" : ""}`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <GripVertical size={14} className="cursor-grab text-muted-foreground shrink-0" />
              <span className="truncate">{w.label}</span>
            </span>
            <input
              type="checkbox"
              checked={on}
              aria-label={`Show ${w.label}`}
              onChange={(e) =>
                onChange({
                  widget_visibility: { ...(settings.widget_visibility ?? {}), [w.id]: e.target.checked },
                })
              }
            />
          </div>
        );
      })}
    </div>
  );
}
