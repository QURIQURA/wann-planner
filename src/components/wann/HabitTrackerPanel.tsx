import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchHabits,
  fetchHabitCompletionsRange,
  type Habit,
} from "@/lib/wann-extra";
import { formatLocalDate } from "@/lib/wann-data";

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function startOfWeek(d: Date) {
  const day = d.getDay();
  const out = new Date(d);
  out.setDate(d.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (v: number[]) => void;
}) {
  return (
    <div className="flex gap-1">
      {ALL_DAYS.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() =>
              onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())
            }
            className={`h-6 w-6 border border-border text-[10px] ${on ? "bg-foreground text-background" : "hover:bg-muted"}`}
            aria-label={`day ${d}`}
          >
            {DOW_LABELS[d]}
          </button>
        );
      })}
    </div>
  );
}

export function HabitTrackerPanel({ userId, anchorDate }: { userId: string; anchorDate: Date }) {
  const qc = useQueryClient();
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);
  const startKey = formatLocalDate(days[0]);
  const endKey = formatLocalDate(days[6]);

  const habitsQ = useQuery({ queryKey: ["habits"], queryFn: fetchHabits });
  const compQ = useQuery({
    queryKey: ["habit_comp", startKey, endKey],
    queryFn: () => fetchHabitCompletionsRange(startKey, endKey),
  });

  const [newName, setNewName] = useState("");
  const [newDays, setNewDays] = useState<number[]>(ALL_DAYS);
  const [newTarget, setNewTarget] = useState(1);
  const [showNew, setShowNew] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDays, setEditDays] = useState<number[]>(ALL_DAYS);
  const [editTarget, setEditTarget] = useState(1);

  const addHabit = useMutation({
    mutationFn: async () => {
      const sort = habitsQ.data?.length ?? 0;
      const { error } = await supabase.from("planner_habits").insert({
        user_id: userId,
        name: newName.trim(),
        sort_order: sort,
        days_of_week: newDays.length ? newDays : ALL_DAYS,
        target_count: Math.max(1, newTarget),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName("");
      setNewDays(ALL_DAYS);
      setNewTarget(1);
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const updateHabit = useMutation({
    mutationFn: async (h: { id: string; name: string; days_of_week: number[]; target_count: number }) => {
      const { error } = await supabase
        .from("planner_habits")
        .update({
          name: h.name,
          days_of_week: h.days_of_week.length ? h.days_of_week : ALL_DAYS,
          target_count: Math.max(1, h.target_count),
        })
        .eq("id", h.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["habit_comp"] });
    },
  });

  const setCount = useMutation({
    mutationFn: async ({
      habit,
      date,
      existingId,
      count,
    }: { habit: Habit; date: string; existingId?: string; count: number }) => {
      if (count <= 0) {
        if (existingId) {
          const { error } = await supabase.from("planner_habit_completions").delete().eq("id", existingId);
          if (error) throw error;
        }
        return;
      }
      if (existingId) {
        const { error } = await supabase
          .from("planner_habit_completions")
          .update({ count })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planner_habit_completions").insert({
          habit_id: habit.id,
          user_id: userId,
          date,
          count,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_comp"] }),
  });

  const habits = habitsQ.data ?? [];
  const comps = compQ.data ?? [];

  const entryFor = (habitId: string, date: string) =>
    comps.find((c) => c.habit_id === habitId && c.date === date);

  const appliesOn = (h: Habit, d: Date) => (h.days_of_week ?? ALL_DAYS).includes(d.getDay());

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Habit Tracker</p>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="border border-border p-1 hover:bg-muted"
          aria-label="Add habit"
        >
          {showNew ? <X size={12} /> : <Plus size={12} />}
        </button>
      </div>

      {showNew && (
        <div className="mb-4 border border-border p-3 flex flex-col gap-2">
          <input
            type="text"
            placeholder="Habit name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-transparent outline-none border-b border-border py-1 text-sm"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <DayPicker value={newDays} onChange={setNewDays} />
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              target/day
              <input
                type="number"
                min={1}
                value={newTarget}
                onChange={(e) => setNewTarget(Number(e.target.value) || 1)}
                className="w-12 bg-transparent border-b border-border text-center text-sm"
              />
            </label>
            <button
              onClick={() => newName.trim() && addHabit.mutate()}
              className="border border-border px-2 py-1 text-xs hover:bg-muted"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {habits.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No habits yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left label-caps text-muted-foreground">
                <th className="pb-2 pr-2 font-normal">Habit</th>
                {days.map((d) => (
                  <th key={d.toISOString()} className="pb-2 px-1 font-normal text-center">
                    {DOW_LABELS[d.getDay()]}
                    <div className="text-[10px]">{d.getDate()}</div>
                  </th>
                ))}
                <th className="pb-2 pl-2 font-normal text-right">%</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const target = Math.max(1, h.target_count ?? 1);
                const activeDays = days.filter((d) => appliesOn(h, d));
                const doneCount = activeDays.filter(
                  (d) => (entryFor(h.id, formatLocalDate(d))?.count ?? 0) >= target,
                ).length;
                const pct = activeDays.length ? Math.round((doneCount / activeDays.length) * 100) : 0;
                const isEditing = editingId === h.id;
                return (
                  <tr key={h.id} className="border-t border-border/50 group align-top">
                    <td className="py-1 pr-2">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 py-1">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-transparent border-b border-border text-sm"
                          />
                          <DayPicker value={editDays} onChange={setEditDays} />
                          <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            target/day
                            <input
                              type="number"
                              min={1}
                              value={editTarget}
                              onChange={(e) => setEditTarget(Number(e.target.value) || 1)}
                              className="w-10 bg-transparent border-b border-border text-center text-xs"
                            />
                          </label>
                        </div>
                      ) : (
                        <span>
                          {h.name}
                          {target > 1 && (
                            <span className="text-[10px] text-muted-foreground ml-1">×{target}</span>
                          )}
                        </span>
                      )}
                    </td>
                    {days.map((d) => {
                      const key = formatLocalDate(d);
                      if (!appliesOn(h, d)) {
                        return (
                          <td key={key} className="text-center px-1">
                            <div className="h-4 w-4 mx-auto bg-muted/60" aria-hidden />
                          </td>
                        );
                      }
                      const entry = entryFor(h.id, key);
                      const count = entry?.count ?? 0;
                      const done = count >= target;
                      if (target === 1) {
                        return (
                          <td key={key} className="text-center px-1">
                            <button
                              onClick={() =>
                                setCount.mutate({ habit: h, date: key, existingId: entry?.id, count: done ? 0 : 1 })
                              }
                              className={`h-4 w-4 border border-border ${done ? "bg-foreground" : ""}`}
                              aria-label="toggle"
                            />
                          </td>
                        );
                      }
                      return (
                        <td key={key} className="text-center px-1">
                          <div className="inline-flex items-center gap-[2px]">
                            <button
                              onClick={() =>
                                setCount.mutate({
                                  habit: h,
                                  date: key,
                                  existingId: entry?.id,
                                  count: Math.max(0, count - 1),
                                })
                              }
                              className="text-[10px] px-1 text-muted-foreground hover:text-foreground"
                              aria-label="decrement"
                            >
                              −
                            </button>
                            <button
                              onClick={() =>
                                setCount.mutate({
                                  habit: h,
                                  date: key,
                                  existingId: entry?.id,
                                  count: Math.min(target, count + 1),
                                })
                              }
                              className={`text-[10px] border border-border px-1 py-[1px] min-w-[26px] ${done ? "bg-foreground text-background" : "hover:bg-muted"}`}
                              aria-label="increment"
                            >
                              {count}/{target}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                    <td className="pl-2 text-right text-xs text-muted-foreground">{pct}%</td>
                    <td className="pl-2">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <button
                            onClick={() =>
                              updateHabit.mutate({
                                id: h.id,
                                name: editName.trim() || h.name,
                                days_of_week: editDays,
                                target_count: editTarget,
                              })
                            }
                            className="hover:text-foreground"
                            aria-label="Save habit"
                          >
                            <Check size={12} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(h.id);
                              setEditName(h.name);
                              setEditDays(h.days_of_week ?? ALL_DAYS);
                              setEditTarget(target);
                            }}
                            className="opacity-0 group-hover:opacity-100"
                            aria-label="Edit habit"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteHabit.mutate(h.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                          aria-label="Delete habit"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
