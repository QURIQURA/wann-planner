import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchHyattHours,
  upsertHyattHours,
  fetchKoraSetup,
  fetchHabits,
  fetchHabitCompletionsRange,
  monthBounds,
  monthKey,
} from "@/lib/wann-extra";
import {
  fetchCategories,
  fetchTasks,
  fetchCompletions,
  taskOccursOn,
  isOccurrenceCompleted,
  formatLocalDate,
} from "@/lib/wann-data";

export function MonthlySummaryPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month0 = cursor.getMonth();
  const { start, end, days } = monthBounds(year, month0);
  const mkey = monthKey(cursor);

  const catsQ = useQuery({ queryKey: ["categories-any"], queryFn: () => fetchCategories(userId) });
  const tasksQ = useQuery({ queryKey: ["tasks-any"], queryFn: () => fetchTasks(userId) });
  const compQ = useQuery({ queryKey: ["completions-any"], queryFn: () => fetchCompletions(userId) });
  const habitsQ = useQuery({ queryKey: ["habits"], queryFn: fetchHabits });
  const hcompQ = useQuery({
    queryKey: ["habit_comp_month", start, end],
    queryFn: () => fetchHabitCompletionsRange(start, end),
  });
  const hyattQ = useQuery({ queryKey: ["hyatt", mkey], queryFn: () => fetchHyattHours(mkey) });
  const koraQ = useQuery({ queryKey: ["kora_setup"], queryFn: fetchKoraSetup });

  const [hoursInput, setHoursInput] = useState<string>("");
  useEffect(() => {
    setHoursInput(hyattQ.data ? String(hyattQ.data.hours) : "");
  }, [hyattQ.data, mkey]);

  const saveHours = useMutation({
    mutationFn: async (v: number) => upsertHyattHours(userId, mkey, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hyatt", mkey] }),
  });

  // Category completion rates
  const perCat = useMemo(() => {
    const cats = catsQ.data ?? [];
    const tasks = tasksQ.data ?? [];
    const comps = compQ.data ?? [];
    const dayList = Array.from({ length: days }, (_, i) => formatLocalDate(new Date(year, month0, i + 1)));
    return cats.map((c) => {
      let occ = 0, done = 0;
      for (const t of tasks.filter((tt) => tt.category_id === c.id)) {
        for (const d of dayList) {
          if (taskOccursOn(t, d)) {
            occ++;
            if (isOccurrenceCompleted(t, d, comps)) done++;
          }
        }
      }
      return { cat: c, occ, done, pct: occ > 0 ? Math.round((done / occ) * 100) : null };
    });
  }, [catsQ.data, tasksQ.data, compQ.data, year, month0, days]);

  const rollover = useMemo(() => {
    // "Most rolled-over": category with most past-due incomplete task-occurrences before today, in this month
    const cats = catsQ.data ?? [];
    const tasks = tasksQ.data ?? [];
    const comps = compQ.data ?? [];
    const today = new Date(); today.setHours(0,0,0,0);
    const counts: Record<string, number> = {};
    const dayList = Array.from({ length: days }, (_, i) => new Date(year, month0, i + 1));
    for (const d of dayList) {
      if (d >= today) continue;
      const key = formatLocalDate(d);
      for (const t of tasks) {
        if (!t.category_id) continue;
        if (taskOccursOn(t, key) && !isOccurrenceCompleted(t, key, comps)) {
          counts[t.category_id] = (counts[t.category_id] ?? 0) + 1;
        }
      }
    }
    let top: { name: string; count: number; color: string } | null = null;
    for (const [id, count] of Object.entries(counts)) {
      const cat = cats.find((c) => c.id === id);
      if (!cat) continue;
      if (!top || count > top.count) top = { name: cat.name, count, color: cat.color };
    }
    return top;
  }, [catsQ.data, tasksQ.data, compQ.data, year, month0, days]);

  // Habit avg
  const habitAvg = useMemo(() => {
    const habits = habitsQ.data ?? [];
    const comps = hcompQ.data ?? [];
    if (habits.length === 0) return null;
    const possible = habits.length * days;
    const done = comps.length;
    return Math.round((done / possible) * 100);
  }, [habitsQ.data, hcompQ.data, days]);

  // Kora setup grouped
  const koraByCat = useMemo(() => {
    const items = koraQ.data ?? [];
    const map: Record<string, typeof items> = {};
    for (const i of items) (map[i.category] ??= []).push(i);
    return map;
  }, [koraQ.data]);

  const [koraNew, setKoraNew] = useState({ category: "Legal", title: "", next_action_date: "" });
  const addKora = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("planner_kora_setup_items").insert({
        user_id: userId,
        category: koraNew.category.trim(),
        title: koraNew.title.trim(),
        next_action_date: koraNew.next_action_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setKoraNew({ ...koraNew, title: "", next_action_date: "" });
      qc.invalidateQueries({ queryKey: ["kora_setup"] });
    },
  });
  const toggleKora = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("planner_kora_setup_items").update({ completed: !completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kora_setup"] }),
  });
  const deleteKora = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_kora_setup_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kora_setup"] }),
  });

  const shift = (delta: number) => {
    const d = new Date(year, month0 + delta, 1);
    setCursor(d);
  };

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-caps">Monthly Summary</p>
          <p className="text-xs text-muted-foreground">{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => shift(-1)} className="border border-border p-1 hover:bg-muted"><ChevronLeft size={12} /></button>
          <button onClick={() => setCursor(new Date())} className="border border-border px-2 label-caps hover:bg-muted">Today</button>
          <button onClick={() => shift(1)} className="border border-border p-1 hover:bg-muted"><ChevronRight size={12} /></button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category completion */}
        <div>
          <p className="label-caps text-muted-foreground mb-2">Category completion</p>
          <div className="space-y-1">
            {perCat.length === 0 && <p className="text-xs text-muted-foreground italic">No categories</p>}
            {perCat.map(({ cat, done, occ, pct }) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-2 w-2" style={{ background: cat.color }} />
                  <span className="flex-1">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{done}/{occ} · {pct ?? "—"}%</span>
                </div>
                {pct !== null && (
                  <div className="h-[2px] bg-border">
                    <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <div>
              <p className="label-caps text-muted-foreground mb-1">Habit avg</p>
              <p className="text-sm">{habitAvg === null ? "—" : `${habitAvg}%`}</p>
            </div>
            <div>
              <p className="label-caps text-muted-foreground mb-1">Most rolled-over</p>
              <p className="text-sm">
                {rollover ? (
                  <>
                    <span className="inline-block h-2 w-2 mr-2" style={{ background: rollover.color }} />
                    {rollover.name} <span className="text-muted-foreground">· {rollover.count} carry-overs</span>
                  </>
                ) : "—"}
              </p>
            </div>
            <div>
              <p className="label-caps text-muted-foreground mb-1">Hyatt hours worked</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  onBlur={() => {
                    const v = Number(hoursInput);
                    if (!Number.isNaN(v)) saveHours.mutate(v);
                  }}
                  className="bg-transparent border-b border-border py-1 text-sm w-24"
                />
                <span className="text-xs text-muted-foreground">hrs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kora setup */}
        <div>
          <p className="label-caps text-muted-foreground mb-2">Kora Cakes setup</p>
          <div className="space-y-3">
            {Object.entries(koraByCat).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-xs label-caps mb-1">{cat}</p>
                <div className="space-y-1">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => toggleKora.mutate({ id: it.id, completed: it.completed })}
                        className={`h-3 w-3 border border-border ${it.completed ? "bg-foreground" : ""}`}
                        aria-label="toggle"
                      />
                      <span className={`text-sm flex-1 ${it.completed ? "line-through text-muted-foreground" : ""}`}>{it.title}</span>
                      {it.next_action_date && (
                        <span className="text-[10px] text-muted-foreground">{it.next_action_date}</span>
                      )}
                      <button
                        onClick={() => deleteKora.mutate(it.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                        aria-label="delete"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card-flat p-2 mt-3 space-y-1">
            <div className="flex gap-1">
              <input
                value={koraNew.category}
                onChange={(e) => setKoraNew({ ...koraNew, category: e.target.value })}
                placeholder="Category"
                list="kora-cats"
                className="bg-transparent border-b border-border py-1 text-xs w-24"
              />
              <datalist id="kora-cats">
                <option value="Legal" />
                <option value="Brand" />
                <option value="Operations" />
              </datalist>
              <input
                value={koraNew.title}
                onChange={(e) => setKoraNew({ ...koraNew, title: e.target.value })}
                placeholder="Task"
                className="flex-1 bg-transparent border-b border-border py-1 text-xs"
              />
              <input
                type="date"
                value={koraNew.next_action_date}
                onChange={(e) => setKoraNew({ ...koraNew, next_action_date: e.target.value })}
                className="bg-transparent border-b border-border py-1 text-xs"
              />
              <button
                onClick={() => { if (koraNew.title.trim()) addKora.mutate(); }}
                className="border border-border p-1 hover:bg-muted"
                aria-label="Add"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
