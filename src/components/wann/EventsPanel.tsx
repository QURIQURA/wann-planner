import type { WidgetDef } from "@/lib/widget-registry";
import { useState } from "react";
import type { EventEntry, EventNote } from "@/lib/wann-data";
import {
  daysUntilAnnual,
  ageOn,
  todayLocalStr,
  EVENT_COLORS,
  formatDateKo,
  DPLUS_TYPE,
  isDPlusEvent,
  dPlusLabel,
  daysSince,
  durationSinceLabel,
  sortEventNotes,
  eventNoteLabel,
} from "@/lib/wann-data";
import { Plus, Trash2, X, Pencil, ChevronDown, ChevronRight, Check } from "lucide-react";

export type EventNoteInput = { year: number | null; date: string | null; note: string };

export type EventNoteActions = {
  onAddNote: (eventId: string, v: EventNoteInput) => void;
  onUpdateNote: (id: string, note: string) => void;
  onDeleteNote: (id: string) => void;
};

export type EventForm = {
  name: string;
  date: string;
  type: string;
  notes: string;
  is_recurring: boolean;
  birth_year: number | null;
  show_day_count: boolean;
  show_duration: boolean;
};

const emptyForm = (): EventForm => ({
  name: "",
  date: todayLocalStr(),
  type: "birthday",
  notes: "",
  is_recurring: true,
  birth_year: null,
  show_day_count: true,
  show_duration: false,
});

export function EventsPanel({
  entries,
  notes = [],
  onAdd,
  onUpdate,
  onDelete,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: {
  entries: EventEntry[];
  notes?: EventNote[];
  onAdd: (v: EventForm) => void;
  onUpdate: (id: string, patch: EventForm) => void;
  onDelete: (id: string) => void;
} & Partial<EventNoteActions>) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventForm>(emptyForm());

  const sorted = [...entries].sort((a, b) => {
    const rank = (x: EventEntry) => (isDPlusEvent(x) ? 1000 : x.is_recurring ? daysUntilAnnual(x.date) : 999);
    return rank(a) - rank(b);
  });

  const startEdit = (e: EventEntry) => {
    setEditingId(e.id);
    setEditForm({
      name: e.name,
      date: e.date,
      type: e.type,
      notes: e.notes ?? "",
      is_recurring: e.is_recurring,
      birth_year: e.birth_year,
      show_day_count: e.show_day_count ?? true,
      show_duration: e.show_duration ?? false,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Event</p>
        <button
          onClick={() => setCreating(!creating)}
          className="border border-border p-1 hover:bg-muted"
          aria-label="Add event"
        >
          <Plus size={14} />
        </button>
      </div>

      {creating && (
        <EventEditor
          value={form}
          onChange={setForm}
          submitLabel="Add"
          onSubmit={() => {
            if (form.name.trim() && form.date) {
              onAdd({ ...form, name: form.name.trim() });
              setForm(emptyForm());
              setCreating(false);
            }
          }}
          onCancel={() => { setCreating(false); setForm(emptyForm()); }}
        />
      )}

      <div className="space-y-1">
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No entries</p>
        )}
        {sorted.map((e) => {
          const dplus = isDPlusEvent(e);
          const dd = !dplus && e.is_recurring ? daysUntilAnnual(e.date) : null;
          const editing = editingId === e.id;
          let age: number | null = null;
          if (e.type === "birthday" && e.birth_year) {
            const today = new Date();
            const asDate = new Date(e.birth_year, Number(e.date.slice(5, 7)) - 1, Number(e.date.slice(8, 10)));
            age = ageOn(`${e.birth_year}-${e.date.slice(5)}`, today) + (dd === 0 ? 0 : 1);
            void asDate;
          }
          return (
            <div key={e.id} className="border-b border-border/50">
              <div className="flex items-center gap-2 py-1 group">
                <span
                  className="inline-block h-3 w-3 flex-shrink-0"
                  style={{ background: EVENT_COLORS[e.type] ?? "transparent" }}
                />
                <span className="text-xs text-muted-foreground w-14">{e.date.slice(5)}</span>
                <span className="text-sm flex-1">
                  {e.name}
                  {age !== null && <span className="text-muted-foreground"> · turns {age}</span>}
                </span>
                <span className="text-[10px] label-caps text-muted-foreground">{dplus ? "D+DAY" : e.type}</span>
                {dplus ? (
                  <span className="text-[10px] label-caps border border-border px-1 whitespace-nowrap">
                    {dPlusLabel(e)}
                  </span>
                ) : (
                  dd !== null && (
                    <span className="text-[10px] label-caps border border-border px-1">
                      {dd === 0 ? "TODAY" : `D-${dd}`}
                    </span>
                  )
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
              {e.notes && !editing && (
                <p className="pl-6 pb-1 text-xs text-muted-foreground italic">{e.notes}</p>
              )}
              {editing && (
                <div className="mb-2">
                  <EventEditor
                    value={editForm}
                    onChange={setEditForm}
                    submitLabel="Save"
                    onSubmit={() => {
                      onUpdate(e.id, { ...editForm, name: editForm.name.trim() });
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
              {onAddNote && onUpdateNote && onDeleteNote && (
                <EventRecords
                  event={e}
                  notes={notes.filter((n) => n.event_id === e.id)}
                  onAddNote={onAddNote}
                  onUpdateNote={onUpdateNote}
                  onDeleteNote={onDeleteNote}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  value: EventForm;
  onChange: (v: EventForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="card-flat p-3 mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="flex-1 bg-transparent outline-none border-b border-border py-1 text-sm"
        />
        <button onClick={onCancel} aria-label="Cancel" className="hover:text-destructive">
          <X size={12} />
        </button>
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        />
        {value.date && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{formatDateKo(value.date)}</span>
        )}
        <select
          value={value.type}
          onChange={(e) => {
            const type = e.target.value;
            onChange({
              ...value,
              type,
              // D+day counts up from a fixed reference date — annual repeat makes no sense.
              is_recurring: type === DPLUS_TYPE ? false : value.is_recurring,
            });
          }}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        >
          <option value="birthday">birthday</option>
          <option value="anniversary">anniversary</option>
          <option value="holiday">public holiday</option>
          <option value={DPLUS_TYPE}>D+day</option>
        </select>
        {value.type === "birthday" && (
          <input
            type="number"
            placeholder="birth year"
            value={value.birth_year ?? ""}
            onChange={(e) => onChange({ ...value, birth_year: e.target.value ? Number(e.target.value) : null })}
            className="bg-transparent outline-none border-b border-border py-1 text-sm w-20"
          />
        )}
      </div>
      {value.type === DPLUS_TYPE && (
        <div className="flex gap-4 flex-wrap items-center border border-border p-2">
          <span className="label-caps text-[10px] text-muted-foreground">표시 형식</span>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={value.show_day_count}
              onChange={(e) =>
                onChange({
                  ...value,
                  show_day_count: e.target.checked,
                  // at least one format must stay on
                  show_duration: e.target.checked ? value.show_duration : true,
                })
              }
            />
            숫자로 표시 (D+{value.date ? daysSince(value.date) : 0})
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={value.show_duration}
              onChange={(e) =>
                onChange({
                  ...value,
                  show_duration: e.target.checked,
                  show_day_count: e.target.checked ? value.show_day_count : true,
                })
              }
            />
            기간으로 표시 ({value.date ? durationSinceLabel(value.date) : "-"})
          </label>
        </div>
      )}
      <textarea
        placeholder="Notes (gift ideas…)"
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        className="w-full bg-transparent outline-none border border-border p-2 text-sm resize-none"
        rows={2}
      />
      <div className="flex items-center justify-between">
        <label
          className={`flex items-center gap-2 text-xs ${value.type === DPLUS_TYPE ? "opacity-40" : ""}`}
        >
          <input
            type="checkbox"
            disabled={value.type === DPLUS_TYPE}
            checked={value.type === DPLUS_TYPE ? false : value.is_recurring}
            onChange={(e) => onChange({ ...value, is_recurring: e.target.checked })}
          />
          Repeats annually
        </label>
        <button
          onClick={onSubmit}
          className="border border-border px-3 py-1 label-caps hover:bg-muted"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export const eventsWidget: WidgetDef = {
  id: "events",
  label: "Events",
  render: (ctx) => (
    <section className="card-flat p-4">
      <EventsPanel entries={ctx.events} notes={ctx.eventNotes} {...ctx.eventActions} />
    </section>
  ),
};

/**
 * Accumulating record log for one Event — separate from the single `notes` field.
 * Recurring events record per year; D+day events record per date.
 */
function EventRecords({
  event,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: { event: EventEntry; notes: EventNote[] } & EventNoteActions) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [date, setDate] = useState(todayLocalStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const dplus = isDPlusEvent(event);
  const sorted = sortEventNotes(notes);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAddNote(event.id, {
      year: dplus ? null : Number(year) || new Date().getFullYear(),
      date: dplus ? date : null,
      note: text,
    });
    setDraft("");
  };

  return (
    <div className="pl-6 pb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 label-caps text-[10px] text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        기록 ({notes.length}개)
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            {dplus ? (
              <input
                type="date"
                value={date}
                onChange={(ev) => setDate(ev.target.value)}
                className="bg-transparent outline-none border-b border-border py-1 text-xs"
              />
            ) : (
              <input
                type="number"
                value={year}
                onChange={(ev) => setYear(ev.target.value)}
                className="bg-transparent outline-none border-b border-border py-1 text-xs w-16"
                aria-label="Year"
              />
            )}
            <input
              type="text"
              placeholder="기록 추가"
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") submit();
              }}
              className="flex-1 bg-transparent outline-none border-b border-border py-1 text-xs"
            />
            <button onClick={submit} className="border border-border px-2 py-0.5 label-caps text-[10px] hover:bg-muted">
              추가
            </button>
          </div>

          {sorted.length === 0 && <p className="text-xs text-muted-foreground italic">기록 없음</p>}

          {sorted.map((n) => (
            <div key={n.id} className="flex items-start gap-2 group/rec text-xs">
              <span className="label-caps text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                {eventNoteLabel(n, dplus ? event : null)}
              </span>
              {editingId === n.id ? (
                <>
                  <input
                    value={editDraft}
                    onChange={(ev) => setEditDraft(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") {
                        onUpdateNote(n.id, editDraft.trim());
                        setEditingId(null);
                      }
                    }}
                    className="flex-1 bg-transparent outline-none border-b border-border"
                  />
                  <button
                    onClick={() => {
                      onUpdateNote(n.id, editDraft.trim());
                      setEditingId(null);
                    }}
                    aria-label="Save record"
                  >
                    <Check size={12} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1">{n.note}</span>
                  <button
                    onClick={() => {
                      setEditingId(n.id);
                      setEditDraft(n.note);
                    }}
                    className="opacity-0 group-hover/rec:opacity-100 hover:text-foreground"
                    aria-label="Edit record"
                  >
                    <Pencil size={11} />
                  </button>
                </>
              )}
              <button
                onClick={() => onDeleteNote(n.id)}
                className="opacity-0 group-hover/rec:opacity-100 hover:text-destructive"
                aria-label="Delete record"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
