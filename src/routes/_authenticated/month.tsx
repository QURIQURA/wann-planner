import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import {
  fetchTasks,
  fetchEvents,
  fetchExceptions,
  fetchCategories,
  effectiveOccurrencesOnDate,
  eventsOnDate,
  formatLocalDate,
  todayLocalStr,
  EVENT_COLORS,
  type Category,
} from "@/lib/wann-data";

export const Route = createFileRoute("/_authenticated/month")({
  component: MonthPage,
  head: () => ({
    meta: [
      { title: "Month · WANN Weekly OS" },
      { name: "description", content: "A Notion-style month grid of tasks and events, separate from the daily This Week view." },
    ],
  }),
});

/**
 * Dedicated scheduler month view (item #4 from the backlog) — a plain
 * calendar grid of tasks + events, no photos. Distinct from:
 *  - MonthlySummaryPanel (completion-rate stats, not a calendar)
 *  - Diary's MonthView (photo/journal archive)
 * Clicking a day jumps back to the This Week dashboard anchored on that date.
 */
function MonthPage() {
  const { user } = Route.useRouteContext() as { user: { id: string } };
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();

  const tasksQ = useQuery({ queryKey: ["tasks", user.id], queryFn: () => fetchTasks(user.id) });
  const eventsQ = useQuery({ queryKey: ["events", user.id], queryFn: () => fetchEvents(user.id) });
  const exceptionsQ = useQuery({ queryKey: ["exceptions", user.id], queryFn: () => fetchExceptions(user.id) });
  const categoriesQ = useQuery({ queryKey: ["categories", user.id], queryFn: () => fetchCategories(user.id) });

  const catById = useMemo(() => {
    const m: Record<string, Category> = {};
    for (const c of categoriesQ.data ?? []) m[c.id] = c;
    return m;
  }, [categoriesQ.data]);

  const tasks = tasksQ.data ?? [];
  const events = eventsQ.data ?? [];
  const exceptions = exceptionsQ.data ?? [];
  const today = todayLocalStr();

  const first = new Date(year, month0, 1);
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const startDow = first.getDay();

  const cells: Array<{ key: string; date?: string }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ key: `pad-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatLocalDate(new Date(year, month0, d));
    cells.push({ key: dateStr, date: dateStr });
  }

  const MAX_ITEMS = 3;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 flex items-center gap-3">
          <Link to="/" className="border border-border p-2 hover:bg-muted" aria-label="Back">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <p className="label-caps text-muted-foreground">WANN</p>
            <h1 className="text-lg font-light tracking-tight">Month</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setCursor(new Date(year, month0 - 1, 1))}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <p className="text-lg font-light tracking-tight min-w-0 sm:min-w-[10rem]">
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </p>
          <button
            onClick={() => setCursor(new Date(year, month0 + 1, 1))}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="ml-1 border border-border px-2 py-1 text-[10px] label-caps hover:bg-muted"
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={`h${i}`} className="label-caps text-center text-muted-foreground py-1">
              {d}
            </div>
          ))}
          {cells.map((c) => {
            if (!c.date) return <div key={c.key} />;
            const occs = effectiveOccurrencesOnDate(tasks, exceptions, c.date);
            const dayEvents = eventsOnDate(events, c.date);
            const totalItems = occs.length + dayEvents.length;
            const isToday = c.date === today;

            const items: Array<{ key: string; label: string; color?: string; critical?: boolean }> = [
              ...dayEvents.map((e) => ({
                key: `ev-${e.id}`,
                label: e.name,
                color: EVENT_COLORS[e.type] ?? "var(--border)",
              })),
              ...occs.map((o) => ({
                key: `t-${o.task.id}-${o.originalDate}`,
                label: o.task.title || "(제목 없음)",
                color: o.task.category_id ? catById[o.task.category_id]?.color : undefined,
                critical: !!o.task.is_critical,
              })),
            ];

            return (
              <Link
                key={c.key}
                to="/"
                search={{ date: c.date }}
                className={`relative min-h-[6rem] border p-1 text-left hover:bg-muted flex flex-col overflow-hidden ${
                  isToday ? "border-foreground border-2" : "border-border"
                }`}
              >
                <span className={`text-xs flex-shrink-0 ${isToday ? "font-medium" : ""}`}>
                  {Number(c.date.slice(-2))}
                </span>
                <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                  {items.slice(0, MAX_ITEMS).map((it) => (
                    <span
                      key={it.key}
                      className={`text-[9px] truncate px-1 leading-tight ${it.critical ? "border-2 border-destructive" : ""}`}
                      style={{ background: it.color ? `${it.color}80` : "var(--muted)" }}
                    >
                      {it.label}
                    </span>
                  ))}
                  {totalItems > MAX_ITEMS && (
                    <span className="text-[9px] text-muted-foreground">+{totalItems - MAX_ITEMS} more</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
