import { useState } from "react";
import type { SpecialDate } from "@/lib/wann-data";
import { daysUntilAnnual, ageOn } from "@/lib/wann-data";
import { Plus, Trash2 } from "lucide-react";

export function BirthdaysPanel({
  entries,
  onAdd,
  onDelete,
}: {
  entries: SpecialDate[];
  onAdd: (e: Omit<SpecialDate, "id" | "user_id" | "created_at">) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    date: "",
    type: "birthday",
    category: "Family",
    notes: "",
    show_age: true,
  });

  const sorted = [...entries].sort((a, b) => daysUntilAnnual(a.date) - daysUntilAnnual(b.date));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Birthdays &amp; Anniversaries</p>
        <button onClick={() => setOpen(!open)} className="border border-border p-1 hover:bg-muted">
          <Plus size={14} />
        </button>
      </div>

      {open && (
        <div className="card-flat p-3 mb-3 space-y-2">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-transparent outline-none border-b border-border py-1 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="flex-1 bg-transparent outline-none border-b border-border py-1 text-sm"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="bg-transparent outline-none border-b border-border py-1 text-sm"
            >
              <option value="birthday">birthday</option>
              <option value="anniversary">anniversary</option>
              <option value="other">other</option>
            </select>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-transparent outline-none border-b border-border py-1 text-sm"
            >
              <option>Family</option>
              <option>Friend</option>
              <option>Work</option>
            </select>
          </div>
          <textarea
            placeholder="Notes (gift ideas…)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full bg-transparent outline-none border border-border p-2 text-sm resize-none"
            rows={2}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.show_age}
                onChange={(e) => setForm({ ...form, show_age: e.target.checked })}
              />
              Show age
            </label>
            <button
              onClick={() => {
                if (form.name && form.date) {
                  onAdd(form);
                  setForm({ name: "", date: "", type: "birthday", category: "Family", notes: "", show_age: true });
                  setOpen(false);
                }
              }}
              className="border border-border px-3 py-1 label-caps hover:bg-muted"
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {sorted.length === 0 && <p className="text-xs text-muted-foreground italic">No entries</p>}
        {sorted.map((e) => {
          const dd = daysUntilAnnual(e.date);
          const age = e.type === "birthday" && e.show_age ? ageOn(e.date) + (dd === 0 ? 0 : 1) : null;
          return (
            <div key={e.id} className="flex items-center gap-2 py-1 border-b border-border/50 group">
              <span className="text-xs text-muted-foreground w-14">{e.date.slice(5)}</span>
              <span className="text-sm flex-1">
                {e.name}
                {age !== null && <span className="text-muted-foreground"> · turns {age}</span>}
              </span>
              <span className="text-[10px] label-caps text-muted-foreground">{e.category}</span>
              <span className="text-[10px] label-caps border border-border px-1">
                {dd === 0 ? "TODAY" : `D-${dd}`}
              </span>
              <button
                onClick={() => onDelete(e.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
