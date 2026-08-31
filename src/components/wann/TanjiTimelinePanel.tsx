import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Settings2, Trash2, X } from "lucide-react";
import type { WidgetDef } from "@/lib/widget-registry";
import type { WidgetContext } from "@/lib/widget-context";
import { formatLocalDate, formatDateKo, shortTime, todayLocalStr } from "@/lib/wann-data";
import {
  addBabySlotType,
  BABY_SLOT_PALETTE,
  deleteBabySlotLog,
  deleteBabySlotType,
  durationLabel,
  fetchBabySlotLogsRange,
  fetchBabySlotTypes,
  minutesOf,
  updateBabySlotType,
  upsertBabySlotLog,
  type BabySlotLog,
  type BabySlotType,
} from "@/lib/wann-baby";

const START_H = 4;
const END_H = 21;
const TOTAL_MIN = (END_H - START_H) * 60;
const PX_PER_MIN = 0.62; // ~633px tall grid
const GRID_H = TOTAL_MIN * PX_PER_MIN;

const colorOf = (t: BabySlotType) =>
  (t as BabySlotType & { color?: string }).color || BABY_SLOT_PALETTE[0];

const clampTop = (min: number) => Math.max(0, Math.min(TOTAL_MIN, min - START_H * 60));

type Sel = { date: string; typeId: string; log?: BabySlotLog };

export function TanjiTimelinePanel({ ctx }: { ctx: WidgetContext }) {
  const { userId, anchor, onAnchorChange } = ctx;
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);
  const qc = useQueryClient();

  const dates = useMemo(() => {
    return [-1, 0, 1].map((n) => {
      const d = new Date(anchor);
      d.setDate(d.getDate() + n);
      return formatLocalDate(d);
    });
  }, [anchor]);

  const typesQ = useQuery({ queryKey: ["baby-slot-types"], queryFn: fetchBabySlotTypes });
  const logsQ = useQuery({
    queryKey: ["baby-slot-logs", dates],
    queryFn: () => fetchBabySlotLogsRange(dates),
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["baby-slot-logs"] });
    qc.invalidateQueries({ queryKey: ["baby-slot-types"] });
  };
  const saveLog = useMutation({ mutationFn: upsertBabySlotLog, onSuccess: invalidate });
  const removeLog = useMutation({ mutationFn: deleteBabySlotLog, onSuccess: invalidate });
  const addType = useMutation({ mutationFn: addBabySlotType, onSuccess: invalidate });
  const editType = useMutation({
    mutationFn: (v: { id: string; patch: Partial<BabySlotType> }) => updateBabySlotType(v.id, v.patch),
    onSuccess: invalidate,
  });
  const removeType = useMutation({ mutationFn: deleteBabySlotType, onSuccess: invalidate });

  const types = typesQ.data ?? [];
  const typeById = new Map(types.map((t) => [t.id, t]));
  const logs = logsQ.data ?? [];

  const shiftDay = (n: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + n);
    onAnchorChange?.(d);
  };

  const hours = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i);
  const today = todayLocalStr();

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 label-caps">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Tanji Timeline
        </button>

        {open && (
          <div className="flex items-center gap-2">
            <span className="text-sm">{formatDateKo(dates[1])}</span>
            <button onClick={() => shiftDay(-1)} className="border border-border p-1 hover:bg-muted" aria-label="이전 날">
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onAnchorChange?.(new Date())}
              className="border border-border px-2 py-1 label-caps hover:bg-muted"
            >
              오늘로
            </button>
            <button onClick={() => shiftDay(1)} className="border border-border p-1 hover:bg-muted" aria-label="다음 날">
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setManage((m) => !m)}
              className={`border border-border p-1 hover:bg-muted ${manage ? "bg-muted" : ""}`}
              aria-label="슬롯 종류 관리"
            >
              <Settings2 size={14} />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {manage && (
            <SlotTypeManager
              types={types}
              onAdd={(name, tracksDuration, color) =>
                addType.mutate({ userId, name, tracksDuration, color, sortOrder: types.length })
              }
              onUpdate={(id, patch) => editType.mutate({ id, patch })}
              onDelete={(id) => removeType.mutate(id)}
            />
          )}

          <div className="flex gap-2">
            {/* hour gutter */}
            <div className="relative shrink-0 w-9" style={{ height: GRID_H, marginTop: 22 }}>
              {hours.map((h) => (
                <span
                  key={h}
                  className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground"
                  style={{ top: (h - START_H) * 60 * PX_PER_MIN }}
                >
                  {String(h).padStart(2, "0")}
                </span>
              ))}
            </div>

            {dates.map((d, i) => (
              <div key={d} className={i === 1 ? "flex-1 min-w-0" : "hidden sm:block flex-1 min-w-0"}>
                <DayColumn
                  date={d}
                  isToday={d === today}
                  hours={hours}
                  types={types}
                  logs={logs.filter((l) => l.date === d)}
                  onPick={(log) => setSel({ date: d, typeId: log.slot_type_id, log })}
                  onAdd={() => types[0] && setSel({ date: d, typeId: types[0].id })}
                />
              </div>
            ))}
          </div>

          {sel && (
            <LogEditor
              sel={sel}
              types={types}
              typeById={typeById}
              onClose={() => setSel(null)}
              onSave={(v) => {
                saveLog.mutate({
                  id: sel.log?.id,
                  userId,
                  date: sel.date,
                  slotTypeId: v.typeId,
                  startTime: v.start,
                  endTime: v.end || null,
                });
                setSel(null);
              }}
              onDelete={() => {
                if (sel.log) removeLog.mutate(sel.log.id);
                setSel(null);
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

function DayColumn({
  date,
  isToday,
  hours,
  types,
  logs,
  onPick,
  onAdd,
}: {
  date: string;
  isToday: boolean;
  hours: number[];
  types: BabySlotType[];
  logs: BabySlotLog[];
  onPick: (log: BabySlotLog) => void;
  onAdd: () => void;
}) {
  const typeById = new Map(types.map((t) => [t.id, t]));
  const label = formatDateKo(date).split(" ").slice(-2).join(" ");

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1 h-[22px]">
        <span className={`label-caps truncate ${isToday ? "" : "text-muted-foreground"}`}>
          {isToday ? "TODAY" : label}
        </span>
        <button onClick={onAdd} className="border border-border p-[2px] hover:bg-muted" aria-label="기록 추가">
          <Plus size={11} />
        </button>
      </div>
      <div
        className={`relative border ${isToday ? "border-foreground" : "border-border"} bg-background`}
        style={{ height: GRID_H }}
      >
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-border/50"
            style={{ top: (h - START_H) * 60 * PX_PER_MIN }}
          />
        ))}
        {logs.map((l) => {
          const t = typeById.get(l.slot_type_id);
          if (!t) return null;
          const startM = clampTop(minutesOf(l.start_time));
          const endM = l.end_time ? clampTop(minutesOf(l.end_time)) : null;
          const isBlock = endM !== null && endM > startM;
          const height = isBlock ? Math.max(6, (endM! - startM) * PX_PER_MIN) : 3;
          return (
            <button
              key={l.id}
              onClick={() => onPick(l)}
              title={`${t.name} ${shortTime(l.start_time)}${l.end_time ? `-${shortTime(l.end_time)}` : ""}`}
              className="absolute left-[2px] right-[2px] text-left overflow-hidden"
              style={{
                top: startM * PX_PER_MIN,
                height,
                backgroundColor: colorOf(t),
                border: isBlock ? "1px solid rgba(0,0,0,0.15)" : "none",
              }}
            >
              {isBlock && height > 16 && (
                <span className="block px-1 text-[9px] leading-tight text-[#1A1A18] truncate">{t.name}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LogEditor({
  sel,
  types,
  typeById,
  onSave,
  onDelete,
  onClose,
}: {
  sel: Sel;
  types: BabySlotType[];
  typeById: Map<string, BabySlotType>;
  onSave: (v: { typeId: string; start: string; end: string }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [typeId, setTypeId] = useState(sel.typeId);
  const [start, setStart] = useState(shortTime(sel.log?.start_time) ?? "");
  const [end, setEnd] = useState(sel.log?.end_time ? (shortTime(sel.log.end_time) ?? "") : "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTypeId(sel.typeId);
    setStart(shortTime(sel.log?.start_time) ?? "");
    setEnd(sel.log?.end_time ? (shortTime(sel.log.end_time) ?? "") : "");
  }, [sel]);

  const t = typeById.get(typeId);
  const tracks = t?.tracks_duration ?? false;

  return (
    <div ref={ref} className="border border-border p-3 space-y-2 bg-card">
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps">{formatDateKo(sel.date)}</span>
        <button onClick={onClose} className="border border-border p-1 hover:bg-muted" aria-label="닫기">
          <X size={12} />
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="border border-border p-1 bg-transparent text-sm"
        >
          {types.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <span className="inline-block w-3 h-3 border border-border" style={{ backgroundColor: t ? colorOf(t) : "" }} />
        <input
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border border-border p-1 bg-transparent text-sm"
        />
        {tracks && (
          <>
            <span className="text-muted-foreground">-</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="border border-border p-1 bg-transparent text-sm"
            />
            {start && end && <span className="text-xs text-muted-foreground">({durationLabel(start, end)})</span>}
          </>
        )}
        <button
          onClick={() => start && onSave({ typeId, start, end: tracks ? end : "" })}
          className="border border-border px-2 py-1 label-caps hover:bg-muted"
        >
          저장
        </button>
        {sel.log && (
          <button onClick={onDelete} className="border border-border p-1 hover:bg-muted" aria-label="삭제">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function SlotTypeManager({
  types,
  onAdd,
  onUpdate,
  onDelete,
}: {
  types: BabySlotType[];
  onAdd: (name: string, tracksDuration: boolean, color: string) => void;
  onUpdate: (id: string, patch: Partial<BabySlotType>) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [tracks, setTracks] = useState(false);
  const nextColor = BABY_SLOT_PALETTE[types.length % BABY_SLOT_PALETTE.length];
  const [color, setColor] = useState(nextColor);

  return (
    <div className="border border-border p-3 space-y-2">
      <p className="label-caps text-muted-foreground">슬롯 종류 관리</p>
      {types.map((t) => (
        <div key={t.id} className="flex items-center gap-2">
          <input
            type="color"
            value={colorOf(t)}
            onChange={(e) => onUpdate(t.id, { color: e.target.value } as Partial<BabySlotType>)}
            className="w-7 h-7 border border-border bg-transparent p-0"
            aria-label={`${t.name} 색상`}
          />
          <input
            value={t.name}
            onChange={(e) => onUpdate(t.id, { name: e.target.value })}
            className="flex-1 min-w-0 border border-border p-1 bg-transparent text-sm"
          />
          <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <input
              type="checkbox"
              checked={t.tracks_duration}
              onChange={(e) => onUpdate(t.id, { tracks_duration: e.target.checked })}
            />
            지속시간
          </label>
          <button onClick={() => onDelete(t.id)} className="border border-border p-1 hover:bg-muted" aria-label="삭제">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-7 h-7 border border-border bg-transparent p-0"
          aria-label="새 슬롯 색상"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 슬롯 이름"
          className="flex-1 min-w-0 border border-border p-1 bg-transparent text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <input type="checkbox" checked={tracks} onChange={(e) => setTracks(e.target.checked)} />
          지속시간
        </label>
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd(name.trim(), tracks, color);
            setName("");
            setTracks(false);
            setColor(BABY_SLOT_PALETTE[(types.length + 1) % BABY_SLOT_PALETTE.length]);
          }}
          className="border border-border px-2 py-1 label-caps hover:bg-muted"
        >
          추가
        </button>
      </div>
    </div>
  );
}

export const tanjiTimelineWidget: WidgetDef = {
  id: "tanji_timeline",
  label: "Tanji Timeline",
  defaultVisible: true,
  render: (ctx) => <TanjiTimelinePanel ctx={ctx} />,
};
