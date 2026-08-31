import { useState } from "react";
import { Plus } from "lucide-react";
import type { WidgetContext } from "@/lib/widget-context";
import { EventEditor, emptyEventForm } from "./EventsPanel";
import { FastCapture } from "./GoalsPanel";

/**
 * Dashboard = execution. Quick Add is the entire "create" surface here — full
 * management (filters, editing lists, category setup, …) lives on /widgets.
 * Task and Project already have their own full always-visible section right
 * below Timeline (TaskWorkspace), so Quick Add only needs the two things that
 * DON'T have a full list/form on the Dashboard: Event and Idea. Every action
 * below calls the SAME ctx.*Actions used by the Widgets page — no new data
 * logic, just a compact presentation of existing capture flows.
 */
export function QuickAdd({ ctx }: { ctx: WidgetContext }) {
  return (
    <section className="card-flat p-4 space-y-2">
      <p className="label-caps mb-1">Quick Add</p>
      <QuickAddEvent ctx={ctx} />
      <FastCapture onAdd={ctx.intentionActions.onAdd} />
    </section>
  );
}

/** + EVENT — reuses EventsPanel's EventEditor verbatim behind a collapsed
 * dashed-border trigger, mirroring FastCapture's "+ IDEA" pattern. */
function QuickAddEvent({ ctx }: { ctx: WidgetContext }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyEventForm());

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground"
      >
        <Plus size={13} /> EVENT
      </button>
    );
  }

  return (
    <EventEditor
      value={form}
      onChange={setForm}
      eventTypes={ctx.eventTypes}
      eventTypeActions={ctx.eventTypeActions}
      submitLabel="Add"
      onSubmit={() => {
        if (form.name.trim() && form.date) {
          ctx.eventActions.onAdd({ ...form, name: form.name.trim() });
          setForm(emptyEventForm());
          setOpen(false);
        }
      }}
      onCancel={() => { setOpen(false); setForm(emptyEventForm()); }}
    />
  );
}
