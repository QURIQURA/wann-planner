import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronDown, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRoutineGroups,
  fetchRoutineItems,
  fetchRoutineCompletionsForDate,
} from "@/lib/wann-extra";
import { todayLocalStr } from "@/lib/wann-data";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function RoutinesPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const today = todayLocalStr();
  const todayDow = new Date().getDay();

  const groupsQ = useQuery({ queryKey: ["routine_groups"], queryFn: fetchRoutineGroups });
  const itemsQ = useQuery({ queryKey: ["routine_items"], queryFn: fetchRoutineItems });
  const compsQ = useQuery({
    queryKey: ["routine_comp", today],
    queryFn: () => fetchRoutineCompletionsForDate(today),
  });

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDays, setNewDays] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [itemInput, setItemInput] = useState<Record<string, string>>({});

  const addGroup = useMutation({
    mutationFn: async () => {
      const sort = groupsQ.data?.length ?? 0;
      const { error } = await supabase.from("planner_routine_groups").insert({
        user_id: userId, name: newName.trim(), days_of_week: newDays, sort_order: sort,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCreating(false); setNewName(""); setNewDays([]);
      qc.invalidateQueries({ queryKey: ["routine_groups"] });
    },
  });
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_routine_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine_groups"] }),
  });
  const addItem = useMutation({
    mutationFn: async ({ groupId, title }: { groupId: string; title: string }) => {
      const sibs = (itemsQ.data ?? []).filter((i) => i.group_id === groupId);
      const { error } = await supabase.from("planner_routine_items").insert({
        group_id: groupId, title, sort_order: sibs.length,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine_items"] }),
  });
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_routine_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine_items"] }),
  });
  const toggleItem = useMutation({
    mutationFn: async ({ itemId, existingId }: { itemId: string; existingId?: string }) => {
      if (existingId) {
        const { error } = await supabase.from("planner_routine_completions").delete().eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planner_routine_completions").insert({
          item_id: itemId, user_id: userId, date: today,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine_comp", today] }),
  });

  const groups = groupsQ.data ?? [];
  const items = itemsQ.data ?? [];
  const comps = compsQ.data ?? [];

  const visibleGroups = useMemo(
    () => groups.filter((g) => !g.days_of_week?.length || g.days_of_week.includes(todayDow)),
    [groups, todayDow],
  );

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-caps">Daily Routines</p>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="border border-border p-1 hover:bg-muted"
          aria-label="Add routine group"
        >
          <Plus size={14} />
        </button>
      </div>

      {creating && (
        <div className="card-flat p-3 mb-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Group name (e.g. Morning routine)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-transparent outline-none border-b border-border py-1 text-sm"
            />
            <button onClick={() => setCreating(false)} aria-label="Cancel" className="hover:text-destructive"><X size={12} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Days:</span>
            {DAY_LABELS.map((d, i) => {
              const on = newDays.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => setNewDays(on ? newDays.filter((x) => x !== i) : [...newDays, i])}
                  className={`h-6 w-6 border border-border text-xs ${on ? "bg-foreground text-background" : ""}`}
                >
                  {d}
                </button>
              );
            })}
            <span className="text-[10px] text-muted-foreground">none = every day</span>
            <button
              onClick={() => { if (newName.trim()) addGroup.mutate(); }}
              className="ml-auto border border-border px-3 py-1 label-caps hover:bg-muted"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No routine groups</p>
      )}

      <div className="space-y-2">
        {groups.map((g) => {
          const its = items.filter((i) => i.group_id === g.id);
          const done = its.filter((i) => comps.some((c) => c.item_id === i.id)).length;
          const total = its.length;
          const isToday = !g.days_of_week?.length || g.days_of_week.includes(todayDow);
          const open = expanded[g.id] ?? isToday;
          return (
            <div key={g.id} className={`border border-border rounded-sm ${!isToday ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2 p-2 group">
                <button onClick={() => setExpanded({ ...expanded, [g.id]: !open })} aria-label="Toggle group">
                  {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                <span className="text-sm flex-1">{g.name}</span>
                <span className="text-xs text-muted-foreground">{done}/{total}</span>
                <div className="flex gap-0.5">
                  {g.days_of_week?.length ? g.days_of_week.map((d) => (
                    <span key={d} className="text-[10px] text-muted-foreground">{DAY_LABELS[d]}</span>
                  )) : <span className="text-[10px] text-muted-foreground">daily</span>}
                </div>
                <button
                  onClick={() => deleteGroup.mutate(g.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  aria-label="Delete group"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {open && (
                <div className="px-4 pb-2 space-y-1">
                  {its.length === 0 && <p className="text-xs text-muted-foreground italic">No items</p>}
                  {its.map((i) => {
                    const comp = comps.find((c) => c.item_id === i.id);
                    return (
                      <div key={i.id} className="flex items-center gap-2 group/child">
                        <button
                          onClick={() => isToday && toggleItem.mutate({ itemId: i.id, existingId: comp?.id })}
                          aria-label="Toggle"
                          className={`h-3 w-3 border border-border ${comp ? "bg-foreground" : ""}`}
                          disabled={!isToday}
                        />
                        <span className={`text-sm flex-1 ${comp ? "line-through text-muted-foreground" : ""}`}>{i.title}</span>
                        <button
                          onClick={() => deleteItem.mutate(i.id)}
                          className="opacity-0 group-hover/child:opacity-100 hover:text-destructive"
                          aria-label="Delete item"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    );
                  })}
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder="+ Add item"
                      value={itemInput[g.id] ?? ""}
                      onChange={(e) => setItemInput({ ...itemInput, [g.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = (itemInput[g.id] ?? "").trim();
                          if (v) {
                            addItem.mutate({ groupId: g.id, title: v });
                            setItemInput({ ...itemInput, [g.id]: "" });
                          }
                        }
                      }}
                      className="w-full bg-transparent outline-none border-b border-border py-1 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
