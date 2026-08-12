import type { WidgetDef } from "@/lib/widget-registry";
import { useState } from "react";
import type { EventEntry } from "@/lib/wann-data";
import { daysUntilAnnual, ageOn, todayLocalStr, EVENT_COLORS, formatDateKo } from "@/lib/wann-data";
import { Plus, Trash2, X, Pencil } from "lucide-react";

export type EventForm = {
  name: string;
  date: string;
  type: string;
  notes: string;
  is_recurring: boolean;
  birth_year: number | null;
};

const emptyForm = (): EventForm => ({
  name: "",
  date: todayLocalStr(),
  type: "birthday",
  notes: "",
  is_recurring: true,
  birth_year: null,
});

export function EventsPanel({
  entries,
  onAdd,
  onUpdate,
  onDelete,
}: {
  entries: EventEntry[];
  onAdd: (v: EventForm) => void;
  onUpdate: (id: string, patch: EventForm) => void;
  onDelete: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventForm>(emptyForm());

  const sorted = [...entries].sort((a, b) => {
    const da = a.is_recurring ? daysUntilAnnual(a.date) : 999;
    const db = b.is_recurring ? daysUntilAnnual(b.date) : 999;
    return da - db;
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
          const dd = e.is_recurring ? daysUntilAnnual(e.date) : null;
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
                <span className="text-[10px] label-caps text-muted-foreground">{e.type}</span>
                {dd !== null && (
                  <span className="text-[10px] label-caps border border-border px-1">
                    {dd === 0 ? "TODAY" : `D-${dd}`}
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
          onChange={(e) => onChange({ ...value, type: e.target.value })}
          className="bg-transparent outline-none border-b border-border py-1 text-sm"
        >
          <option value="birthday">birthday</option>
          <option value="anniversary">anniversary</option>
          <option value="holiday">public holiday</option>
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
      <textarea
        placeholder="Notes (gift ideas…)"
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        className="w-full bg-transparent outline-none border border-border p-2 text-sm resize-none"
        rows={2}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={value.is_recurring}
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
      <EventsPanel entries={ctx.events} {...ctx.eventActions} />
    </section>
  ),
};
