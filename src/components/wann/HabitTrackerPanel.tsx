import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchHabits,
  fetchHabitCompletionsRange,
  type Habit,
} from "@/lib/wann-extra";
import { formatLocalDate } from "@/lib/wann-data";

function startOfWeek(d: Date) {
  const day = d.getDay();
  const out = new Date(d);
  out.setDate(d.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
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

  const addHabit = useMutation({
    mutationFn: async (name: string) => {
      const sort = habitsQ.data?.length ?? 0;
      const { error } = await supabase
        .from("planner_habits")
        .insert({ user_id: userId, name, sort_order: sort });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
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
  const toggle = useMutation({
    mutationFn: async ({ habit, date, existingId }: { habit: Habit; date: string; existingId?: string }) => {
      if (existingId) {
        const { error } = await supabase.from("planner_habit_completions").delete().eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planner_habit_completions").insert({
          habit_id: habit.id,
          user_id: userId,
          date,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_comp"] }),
  });

  const habits = habitsQ.data ?? [];
  const comps = compQ.data ?? [];

  const isDone = (habitId: string, date: string) =>
    comps.find((c) => c.habit_id === habitId && c.date === date);

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="label-caps">Habit Tracker</p>
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="+ new habit"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                addHabit.mutate(newName.trim());
                setNewName("");
              }
            }}
            className="bg-transparent outline-none border-b border-border py-1 text-xs w-32"
          />
          <button
            onClick={() => {
              if (newName.trim()) { addHabit.mutate(newName.trim()); setNewName(""); }
            }}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Add habit"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

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
                    {["S","M","T","W","T","F","S"][d.getDay()]}
                    <div className="text-[10px]">{d.getDate()}</div>
                  </th>
                ))}
                <th className="pb-2 pl-2 font-normal text-right">%</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const doneCount = days.filter((d) => isDone(h.id, formatLocalDate(d))).length;
                const pct = Math.round((doneCount / 7) * 100);
                return (
                  <tr key={h.id} className="border-t border-border/50 group">
                    <td className="py-1 pr-2">{h.name}</td>
                    {days.map((d) => {
                      const key = formatLocalDate(d);
                      const done = isDone(h.id, key);
                      return (
                        <td key={key} className="text-center px-1">
                          <button
                            onClick={() => toggle.mutate({ habit: h, date: key, existingId: done?.id })}
                            className={`h-4 w-4 border border-border ${done ? "bg-foreground" : ""}`}
                            aria-label="toggle"
                          />
                        </td>
                      );
                    })}
                    <td className="pl-2 text-right text-xs text-muted-foreground">{pct}%</td>
                    <td className="pl-2">
                      <button
                        onClick={() => deleteHabit.mutate(h.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                        aria-label="Delete habit"
                      >
                        <Trash2 size={12} />
                      </button>
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
