import type { WidgetDef } from "@/lib/widget-registry";
import { useState, useEffect } from "react";
import type { EventEntry, EventNote, EventType } from "@/lib/wann-data";
import {
  daysUntilAnnual,
  ageOn,
  todayLocalStr,
  formatDateKo,
  DPLUS_TYPE,
  isDPlusEvent,
  dPlusLabel,
  daysSince,
  durationSinceLabel,
  sortEventNotes,
  eventNoteLabel,
  EVENT_COLORS,
} from "@/lib/wann-data";
import {
  EVENT_PALETTE,
  SYSTEM_EVENT_TYPES,
  slugifyEventTypeKey,
  resolveEventColor,
  eventTypeLabel,
  NEUTRAL_FALLBACK_COLOR,
} from "@/lib/wann-events";
import { Plus, Trash2, X, Pencil, ChevronDown, ChevronRight, Check, Pin, Settings2, Archive, RotateCcw } from "lucide-react";

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
  color: string | null;
  notes: string;
  is_recurring: boolean;
  birth_year: number | null;
  show_day_count: boolean;
  show_duration: boolean;
};

export type EventTypeActions = {
  /** key is pre-generated client-side (slugifyEventTypeKey) so the caller can
   * select the new type immediately without waiting on a round-trip. */
  onCreate: (key: string, name: string, color: string) => void;
  onRename: (id: string, name: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onArchive: (id: string) => void;
  /** Overrides one of the 4 built-in System Event Types' default colour
   * (birthday/anniversary/holiday/dplus). Upserts a `planner_event_types` row
   * keyed by the system key — created only when the user actually customizes
   * it, so untouched installs keep zero rows and the original EVENT_COLORS. */
  onSetSystemColor: (key: string, label: string, color: string) => void;
  /** Clears a System Type's colour override, falling back to EVENT_COLORS. */
  onResetSystemColor: (key: string) => void;
};

export const emptyEventForm = (): EventForm => ({
  name: "",
  date: todayLocalStr(),
  type: "birthday",
  color: null,
  notes: "",
  is_recurring: true,
  birth_year: null,
  show_day_count: true,
  show_duration: false,
});

export function EventsPanel({
  entries,
  notes = [],
  eventTypes,
  eventTypeActions,
  onAdd,
  onUpdate,
  onDelete,
  onTogglePin,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: {
  entries: EventEntry[];
  notes?: EventNote[];
  eventTypes: EventType[];
  eventTypeActions: EventTypeActions;
  onAdd: (v: EventForm) => void;
  onUpdate: (id: string, patch: EventForm) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
} & Partial<EventNoteActions>) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyEventForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventForm>(emptyEventForm());
  const [managingTypes, setManagingTypes] = useState(false);

  const sorted = [...entries].sort((a, b) => {
    const rank = (x: EventEntry) => (isDPlusEvent(x) ? 1000 : x.is_recurring ? daysUntilAnnual(x.date) : 999);
    // pinned events stick to the top, sorted among themselves by nearest date
    return Number(b.is_pinned) - Number(a.is_pinned) || rank(a) - rank(b);
  });

  const startEdit = (e: EventEntry) => {
    setEditingId(e.id);
    setEditForm({
      name: e.name,
      date: e.date,
      type: e.type,
      color: e.color,
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setManagingTypes(!managingTypes)}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Manage event types"
            title="Event Types"
          >
            <Settings2 size={14} />
          </button>
          <button
            onClick={() => setCreating(!creating)}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Add event"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {managingTypes && (
        <EventTypeManager eventTypes={eventTypes} actions={eventTypeActions} />
      )}

      {creating && (
        <EventEditor
          value={form}
          onChange={setForm}
          eventTypes={eventTypes}
          eventTypeActions={eventTypeActions}
          submitLabel="Add"
          onSubmit={() => {
            if (form.name.trim() && form.date) {
              onAdd({ ...form, name: form.name.trim() });
              setForm(emptyEventForm());
              setCreating(false);
            }
          }}
          onCancel={() => { setCreating(false); setForm(emptyEventForm()); }}
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
              <div className="flex items-center gap-2 py-1 group flex-wrap">
                <span
                  className="inline-block h-3 w-3 flex-shrink-0"
                  style={{ background: resolveEventColor(e, eventTypes) }}
                />
                <span className="text-xs text-muted-foreground w-14">{e.date.slice(5)}</span>
                <span className="text-sm flex-1 min-w-[6rem] truncate">
                  {e.name}
                  {age !== null && <span className="text-muted-foreground"> · turns {age}</span>}
                </span>
                <span className="text-[10px] label-caps text-muted-foreground">
                  {dplus ? "D+DAY" : eventTypeLabel(e.type, eventTypes)}
                </span>
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
                {onTogglePin && (
                  <button
                    onClick={() => onTogglePin(e.id, !e.is_pinned)}
                    className={e.is_pinned ? "text-foreground" : "opacity-0 group-hover:opacity-100 hover:text-foreground"}
                    aria-label={e.is_pinned ? "Unpin" : "Pin"}
                    title={e.is_pinned ? "고정 해제" : "고정"}
                  >
                    <Pin size={12} fill={e.is_pinned ? "currentColor" : "none"} />
                  </button>
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
                    eventTypes={eventTypes}
                    eventTypeActions={eventTypeActions}
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

const CREATE_TYPE_SENTINEL = "__create_new_event_type__";

export function EventEditor({
  value,
  onChange,
  eventTypes,
  eventTypeActions,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  value: EventForm;
  onChange: (v: EventForm) => void;
  eventTypes: EventType[];
  eventTypeActions: EventTypeActions;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [creatingType, setCreatingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(EVENT_PALETTE[0].hex);
  const activeCustomTypes = eventTypes.filter((t) => !t.is_archived && !t.is_system);

  const submitNewType = () => {
    const name = newTypeName.trim();
    if (!name) return;
    const key = slugifyEventTypeKey(
      name,
      [...SYSTEM_EVENT_TYPES.map((t) => t.key), ...eventTypes.map((t) => t.key)],
    );
    eventTypeActions.onCreate(key, name, newTypeColor);
    onChange({ ...value, type: key, is_recurring: value.is_recurring });
    setNewTypeName("");
    setCreatingType(false);
  };

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
            if (type === CREATE_TYPE_SENTINEL) {
              setCreatingType(true);
              return;
            }
            onChange({
              ...value,
              type,
              // D+day counts up from a fixed reference date — annual repeat makes no sense.
              is_recurring: type === DPLUS_TYPE ? false : value.is_recurring,
            });
          }}
          className="bg-transparent outline-none border-b border-border py-1 text-sm max-w-[9rem]"
        >
          {SYSTEM_EVENT_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
          {activeCustomTypes.map((t) => (
            <option key={t.id} value={t.key}>{t.name}</option>
          ))}
          <option value={CREATE_TYPE_SENTINEL}>+ Create New Event Type</option>
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

      {creatingType && (
        <div className="border border-border p-2 space-y-2">
          <p className="label-caps text-[10px] text-muted-foreground">New Event Type</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              autoFocus
              type="text"
              placeholder="Name (e.g. Tax Payment)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNewType()}
              className="flex-1 min-w-[8rem] bg-transparent outline-none border-b border-border py-1 text-sm"
            />
            <ColorSwatchPicker value={newTypeColor} onChange={setNewTypeColor} />
          </div>
          <div className="flex justify-end gap-1">
            <button
              onClick={() => { setCreatingType(false); setNewTypeName(""); }}
              className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={submitNewType}
              className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="label-caps text-[10px] text-muted-foreground">Colour</span>
        <button
          onClick={() => onChange({ ...value, color: null })}
          title="Use the type's default colour"
          className={`text-[10px] label-caps border px-1.5 py-1 ${!value.color ? "border-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          Type default
        </button>
        <ColorSwatchPicker value={value.color} onChange={(hex) => onChange({ ...value, color: hex })} />
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

/** Curated palette swatches for a quick pick, plus a free `<input type="color">`
 * (+ hex text field) for any arbitrary colour — matches the free-picker pattern
 * already used elsewhere (SettingsPanel, CategoryFilterBar). `value === null`
 * renders no swatch selected. */
function ColorSwatchPicker({ value, onChange }: { value: string | null; onChange: (hex: string) => void }) {
  const isCustom = value != null && !EVENT_PALETTE.some((c) => c.hex === value);
  // Local draft so a half-typed hex (e.g. "#a1") isn't clobbered every
  // keystroke by the last *committed* colour re-rendering the input.
  const [hexDraft, setHexDraft] = useState(value ?? "");
  useEffect(() => setHexDraft(value ?? ""), [value]);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EVENT_PALETTE.map((c) => (
        <button
          key={c.hex}
          type="button"
          onClick={() => onChange(c.hex)}
          title={c.name}
          aria-label={c.name}
          className={`h-6 w-6 rounded-full border-2 flex-shrink-0 ${value === c.hex ? "border-foreground" : "border-transparent"}`}
          style={{ background: c.hex }}
        />
      ))}
      <input
        type="color"
        value={value ?? NEUTRAL_FALLBACK_COLOR}
        onChange={(e) => onChange(e.target.value)}
        title="Custom colour"
        aria-label="Custom colour"
        className={`h-6 w-6 rounded-full border-2 flex-shrink-0 p-0 overflow-hidden ${isCustom ? "border-foreground" : "border-transparent"}`}
      />
      <input
        type="text"
        value={hexDraft}
        placeholder="#RRGGBB"
        onChange={(e) => {
          const v = e.target.value.trim();
          setHexDraft(v);
          if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
        }}
        className="w-[72px] bg-transparent outline-none text-xs border-b border-border py-1"
      />
    </div>
  );
}

/** System (colour overridable, never renamed/archived) + Custom (rename /
 * change default colour / archive) type list. */
function EventTypeManager({ eventTypes, actions }: { eventTypes: EventType[]; actions: EventTypeActions }) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const customTypes = eventTypes.filter((t) => !t.is_system);
  const active = customTypes.filter((t) => !t.is_archived);
  const archived = customTypes.filter((t) => t.is_archived);

  return (
    <div className="card-flat p-3 mb-3 space-y-3">
      <div>
        <p className="label-caps text-[10px] text-muted-foreground mb-1">System</p>
        <div className="space-y-1">
          {SYSTEM_EVENT_TYPES.map((t) => {
            const override = eventTypes.find((et) => et.key === t.key && et.is_system);
            const color = override?.default_color ?? EVENT_COLORS[t.key] ?? undefined;
            return (
              <div key={t.key} className="flex items-center gap-2 flex-wrap py-1 border-b border-border/50">
                <span
                  className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-sm flex-1 min-w-[6rem] text-muted-foreground">{t.label}</span>
                <ColorSwatchPicker
                  value={color ?? null}
                  onChange={(hex) => actions.onSetSystemColor(t.key, t.label, hex)}
                />
                {override && (
                  <button
                    onClick={() => actions.onResetSystemColor(t.key)}
                    className="text-muted-foreground hover:text-foreground p-1 -m-1 flex-shrink-0"
                    aria-label="Reset to default colour"
                    title="Reset to default colour"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label-caps text-[10px] text-muted-foreground mb-1">Custom</p>
        {active.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No custom types yet.</p>
        ) : (
          <div className="space-y-1">
            {active.map((t) => (
              <div key={t.id} className="flex items-center gap-2 flex-wrap py-1 border-b border-border/50">
                <span
                  className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                  style={{ background: t.default_color ?? undefined }}
                />
                {renamingId === t.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => {
                      const v = renameValue.trim();
                      if (v && v !== t.name) actions.onRename(t.id, v);
                      setRenamingId(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="flex-1 min-w-[6rem] bg-transparent outline-none border-b border-border py-0.5 text-sm"
                  />
                ) : (
                  <button
                    onClick={() => { setRenamingId(t.id); setRenameValue(t.name); }}
                    className="text-sm flex-1 min-w-[6rem] text-left truncate hover:underline"
                  >
                    {t.name}
                  </button>
                )}
                <ColorSwatchPicker value={t.default_color} onChange={(hex) => actions.onChangeColor(t.id, hex)} />
                <button
                  onClick={() => actions.onArchive(t.id)}
                  className="text-muted-foreground hover:text-destructive p-1 -m-1 flex-shrink-0"
                  aria-label="Archive"
                  title="Archive"
                >
                  <Archive size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {archived.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {archived.length}개 archived — 기존 Event는 계속 정상 작동합니다.
        </p>
      )}
    </div>
  );
}

export const eventsWidget: WidgetDef = {
  id: "events",
  label: "Events",
  category: "planning",
  description: "Birthdays, anniversaries, holidays, custom event types & colours",
  render: (ctx) => (
    <section className="card-flat p-4">
      <EventsPanel
        entries={ctx.events}
        notes={ctx.eventNotes}
        eventTypes={ctx.eventTypes}
        eventTypeActions={ctx.eventTypeActions}
        {...ctx.eventActions}
      />
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
