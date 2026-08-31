import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, CheckSquare, Repeat, Cake, ListChecks } from "lucide-react";
import { fetchDaySummary } from "@/lib/wann-extra";
import { fetchEventTypes } from "@/lib/wann-data";
import { resolveEventColor, eventTypeLabel } from "@/lib/wann-events";

export function DaySummaryPanel({ date }: { date: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["day-summary", date], queryFn: () => fetchDaySummary(date) });
  const eventTypesQ = useQuery({ queryKey: ["event_types"], queryFn: () => fetchEventTypes("") });
  const eventTypes = eventTypesQ.data ?? [];
  const s = q.data;
  const total =
    (s?.tasks.length ?? 0) + (s?.habits.length ?? 0) + (s?.events.length ?? 0) + (s?.multipleItems.length ?? 0);

  return (
    <div className="card-flat p-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 label-caps text-muted-foreground text-left"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Day summary
        <span className="text-muted-foreground/70">
          {q.isLoading ? "…" : `(${total})`}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!q.isLoading && total === 0 && (
            <p className="text-xs text-muted-foreground italic">No recorded activity for this day</p>
          )}

          {!!s?.tasks.length && (
            <Section icon={<CheckSquare size={11} />} title={`Tasks completed (${s.tasks.length})`}>
              {s.tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.category && (
                    <span
                      className="text-[10px] label-caps border border-border px-1"
                      style={{ color: t.categoryColor ?? undefined }}
                    >
                      {t.category}
                    </span>
                  )}
                </li>
              ))}
            </Section>
          )}

          {!!s?.habits.length && (
            <Section icon={<Repeat size={11} />} title={`Habits (${s.habits.length})`}>
              {s.habits.map((h) => (
                <li key={h.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{h.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {h.target > 1 ? `${h.count}/${h.target}` : "✓"}
                  </span>
                </li>
              ))}
            </Section>
          )}

          {!!s?.events.length && (
            <Section icon={<Cake size={11} />} title={`Events (${s.events.length})`}>
              {s.events.map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 flex-shrink-0"
                      style={{ background: resolveEventColor(e, eventTypes) }}
                    />
                    <span className="flex-1 truncate">{e.name}</span>
                    <span className="text-[10px] label-caps text-muted-foreground">{eventTypeLabel(e.type, eventTypes)}</span>
                  </div>
                  {e.records.map((r, i) => (
                    <p key={i} className="pl-4 text-xs text-muted-foreground italic">
                      · {r}
                    </p>
                  ))}
                </li>
              ))}
            </Section>
          )}

          {!!s?.multipleItems.length && (
            <Section icon={<ListChecks size={11} />} title={`Checklist items (${s.multipleItems.length})`}>
              {s.multipleItems.map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{i.title}</span>
                  {i.parent && (
                    <span className="text-[10px] label-caps text-muted-foreground">{i.parent}</span>
                  )}
                </li>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-caps text-muted-foreground flex items-center gap-1 mb-1">
        {icon}
        {title}
      </p>
      <ul className="space-y-1 pl-4">{children}</ul>
    </div>
  );
}
