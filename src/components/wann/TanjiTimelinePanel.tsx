import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Settings2, Trash2, X } from "lucide-react";
import type { WidgetDef } from "@/lib/widget-registry";
import type { WidgetContext } from "@/lib/widget-context";
import { formatLocalDate, formatDateKo, shortTime, todayLocalStr } from "@/lib/wann-data";
import {
  addBabySlotType,
  deleteBabySlotLog,
  deleteBabySlotType,
  durationLabel,
  fetchBabySlotLogs,
  fetchBabySlotTypes,
  updateBabySlotType,
  upsertBabySlotLog,
  type BabySlotLog,
  type BabySlotType,
} from "@/lib/wann-baby";

type Draft = { start: string; end: string };

export function TanjiTimelinePanel({ ctx }: { ctx: WidgetContext }) {
  const { userId, anchor, onAnchorChange } = ctx;
  const dateStr = formatLocalDate(anchor);
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const qc = useQueryClient();

  const typesQ = useQuery({ queryKey: ["baby-slot-types"], queryFn: fetchBabySlotTypes });
  const logsQ = useQuery({
    queryKey: ["baby-slot-logs", dateStr],
    queryFn: () => fetchBabySlotLogs(dateStr),
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
  const logs = logsQ.data ?? [];
  const logByType = new Map(logs.map((l) => [l.slot_type_id, l]));

  const shiftDay = (n: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + n);
    onAnchorChange?.(d);
  };

  const logged = types
    .filter((t) => logByType.has(t.id))
    .sort((a, b) => (logByType.get(a.id)!.start_time > logByType.get(b.id)!.start_time ? 1 : -1));
  const unlogged = types.filter((t) => !logByType.has(t.id));

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => {
      const prev: Draft = d[id] ?? { start: "", end: "" };
      return { ...d, [id]: { ...prev, ...patch } };
    });

  const commit = (type: BabySlotType, existing?: BabySlotLog) => {
    const d = drafts[type.id] ?? {
      start: shortTime(existing?.start_time) ?? "",
      end: shortTime(existing?.end_time) ?? "",
    };
    if (!d.start) return;
    saveLog.mutate({
      id: existing?.id,
      userId,
      date: dateStr,
      slotTypeId: type.id,
      startTime: d.start,
      endTime: type.tracks_duration && d.end ? d.end : null,
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[type.id];
      return next;
    });
  };

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 label-caps">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Tanji Timeline
        </button>

        {open && (
          <div className="flex items-center gap-2">
            <span className="text-sm">{formatDateKo(dateStr)}</span>
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
          {dateStr === todayLocalStr() && <p className="label-caps text-muted-foreground">Today</p>}

          {manage && (
            <SlotTypeManager
              types={types}
              onAdd={(name, tracksDuration) =>
                addType.mutate({ userId, name, tracksDuration, sortOrder: types.length })
              }
              onUpdate={(id, patch) => editType.mutate({ id, patch })}
              onDelete={(id) => removeType.mutate(id)}
            />
          )}

          <div className="space-y-2">
            {logged.length === 0 && <p className="text-sm text-muted-foreground">기록 없음</p>}
            {logged.map((t) => {
              const log = logByType.get(t.id)!;
              const d = drafts[t.id];
              const start = shortTime(log.start_time);
              const end = log.end_time ? shortTime(log.end_time) : null;
              return (
                <div key={t.id} className="border border-border p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm">
                      <span className="border border-border px-1 label-caps text-[10px] mr-2">{t.name}</span>
                      {end ? `${start}-${end} (${durationLabel(log.start_time, log.end_time!)})` : start}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDraft(t.id, { start: start, end: end ?? "" })}
                        className="border border-border px-2 py-1 label-caps hover:bg-muted"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => removeLog.mutate(log.id)}
                        className="border border-border p-1 hover:bg-muted"
                        aria-label="삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {d && (
                    <TimeEditor
                      draft={d}
                      tracksDuration={t.tracks_duration}
                      onChange={(patch) => setDraft(t.id, patch)}
                      onSave={() => commit(t, log)}
                      onCancel={() =>
                        setDrafts((prev) => {
                          const next = { ...prev };
                          delete next[t.id];
                          return next;
                        })
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {unlogged.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              {unlogged.map((t) => {
                const d = drafts[t.id];
                return (
                  <div key={t.id} className="border border-dashed border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">{t.name}</span>
                      {!d && (
                        <button
                          onClick={() => setDraft(t.id, {})}
                          className="border border-border px-2 py-1 label-caps hover:bg-muted flex items-center gap-1"
                        >
                          <Plus size={12} /> 입력
                        </button>
                      )}
                    </div>
                    {d && (
                      <TimeEditor
                        draft={d}
                        tracksDuration={t.tracks_duration}
                        onChange={(patch) => setDraft(t.id, patch)}
                        onSave={() => commit(t)}
                        onCancel={() =>
                          setDrafts((prev) => {
                            const next = { ...prev };
                            delete next[t.id];
                            return next;
                          })
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TimeEditor({
  draft,
  tracksDuration,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  tracksDuration: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <input
        type="time"
        value={draft.start}
        onChange={(e) => onChange({ start: e.target.value })}
        className="border border-border p-1 bg-transparent text-sm"
      />
      {tracksDuration && (
        <>
          <span className="text-muted-foreground">-</span>
          <input
            type="time"
            value={draft.end}
            onChange={(e) => onChange({ end: e.target.value })}
            className="border border-border p-1 bg-transparent text-sm"
          />
          {draft.start && draft.end && (
            <span className="text-xs text-muted-foreground">({durationLabel(draft.start, draft.end)})</span>
          )}
        </>
      )}
      <button onClick={onSave} className="border border-border px-2 py-1 label-caps hover:bg-muted">
        저장
      </button>
      <button onClick={onCancel} className="border border-border p-1 hover:bg-muted" aria-label="취소">
        <X size={12} />
      </button>
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
  onAdd: (name: string, tracksDuration: boolean) => void;
  onUpdate: (id: string, patch: Partial<BabySlotType>) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [tracks, setTracks] = useState(false);

  return (
    <div className="border border-border p-3 space-y-2">
      <p className="label-caps text-muted-foreground">슬롯 종류 관리</p>
      {types.map((t) => (
        <div key={t.id} className="flex items-center gap-2">
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
      <div className="flex items-center gap-2 pt-2 border-t border-border">
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
            onAdd(name.trim(), tracks);
            setName("");
            setTracks(false);
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
