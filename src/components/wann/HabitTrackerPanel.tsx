import type { WidgetDef } from "@/lib/widget-registry";
import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2, X, CircleDashed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchHabits,
  fetchHabitCompletionsRange,
  fetchRoutineGroups,
  setHabitCount,
  cycleHabitCount,
  habitAppliesOnDow,
  ALL_DAYS,
  type Habit,
} from "@/lib/wann-extra";
import { formatLocalDate, shortTime } from "@/lib/wann-data";

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfWeek(d: Date) {
  const day = d.getDay();
  const out = new Date(d);
  out.setDate(d.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex gap-1">
      {ALL_DAYS.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
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

type HabitDraft = {
  name: string;
  days: number[];
  target: number;
  time: string;
  groupId: string; // "" = none, "__new" = create
  newGroupName: string;
};

const emptyDraft = (): HabitDraft => ({
  name: "",
  days: ALL_DAYS,
  target: 1,
  time: "",
  groupId: "",
  newGroupName: "",
});

export function HabitTrackerPanel({ userId, anchorDate }: { userId: string; anchorDate: Date }) {
  const qc = useQueryClient();
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );
  const startKey = formatLocalDate(days[0]);
  const endKey = formatLocalDate(days[6]);

  const habitsQ = useQuery({ queryKey: ["habits"], queryFn: fetchHabits });
  const groupsQ = useQuery({ queryKey: ["routine_groups"], queryFn: fetchRoutineGroups });
  const compQ = useQuery({
    queryKey: ["habit_comp", startKey, endKey],
    queryFn: () => fetchHabitCompletionsRange(startKey, endKey),
  });

  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<HabitDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<HabitDraft>(emptyDraft);

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDays, setGroupDays] = useState<number[]>(ALL_DAYS);

  const habits = habitsQ.data ?? [];
  const groups = groupsQ.data ?? [];
  const comps = compQ.data ?? [];

  const resolveGroupId = async (d: HabitDraft): Promise<string | null> => {
    if (d.groupId === "__new") {
      const name = d.newGroupName.trim();
      if (!name) return null;
      const { data, error } = await supabase
        .from("planner_routine_groups")
        .insert({ user_id: userId, name, days_of_week: ALL_DAYS, sort_order: groups.length })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    }
    return d.groupId || null;
  };

  const addHabit = useMutation({
    mutationFn: async () => {
      const routine_group_id = await resolveGroupId(draft);
      const { error } = await supabase.from("planner_habits").insert({
        user_id: userId,
        name: draft.name.trim(),
        sort_order: habits.length,
        days_of_week: draft.days.length ? draft.days : ALL_DAYS,
        target_count: Math.max(1, draft.target),
        habit_time: draft.time || null,
        routine_group_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft(emptyDraft());
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["routine_groups"] });
    },
  });

  const updateHabit = useMutation({
    mutationFn: async (id: string) => {
      const routine_group_id = await resolveGroupId(editDraft);
      const { error } = await supabase
        .from("planner_habits")
        .update({
          name: editDraft.name.trim(),
          days_of_week: editDraft.days.length ? editDraft.days : ALL_DAYS,
          target_count: Math.max(1, editDraft.target),
          habit_time: editDraft.time || null,
          routine_group_id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["routine_groups"] });
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

  const addGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("planner_routine_groups").insert({
        user_id: userId,
        name: groupName.trim(),
        days_of_week: groupDays.length ? groupDays : ALL_DAYS,
        sort_order: groups.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setGroupName("");
      setGroupDays(ALL_DAYS);
      setShowNewGroup(false);
      qc.invalidateQueries({ queryKey: ["routine_groups"] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_routine_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine_groups"] });
      qc.invalidateQueries({ queryKey: ["habits"] });
    },
  });

  const tapCount = useMutation({
    mutationFn: (args: { habitId: string; date: string; existingId?: string; count: number }) =>
      setHabitCount({ ...args, userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_comp"] }),
  });

  const entryFor = (habitId: string, date: string) =>
    comps.find((c) => c.habit_id === habitId && c.date === date);

  const groupOf = (h: Habit) => h.routine_group_id ?? null;
  const grouped = groups.map((g) => ({ group: g, items: habits.filter((h) => groupOf(h) === g.id) }));
  const ungrouped = habits.filter((h) => !groupOf(h));

  const habitStats = (h: Habit) => {
    const target = Math.max(1, h.target_count ?? 1);
    const active = days.filter((d) => habitAppliesOnDow(h, d.getDay()));
    const done = active.filter((d) => (entryFor(h.id, formatLocalDate(d))?.count ?? 0) >= target).length;
    return { target, active: active.length, done, pct: active.length ? Math.round((done / active.length) * 100) : 0 };
  };

  const renderDraftForm = (d: HabitDraft, set: (v: HabitDraft) => void, onSubmit: () => void, submitLabel: string) => (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Habit name"
        value={d.name}
        onChange={(e) => set({ ...d, name: e.target.value })}
        className="bg-transparent outline-none border-b border-border py-1 text-sm"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <DayPicker value={d.days} onChange={(v) => set({ ...d, days: v })} />
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          target/day
          <input
            type="number"
            min={1}
            value={d.target}
            onChange={(e) => set({ ...d, target: Number(e.target.value) || 1 })}
            className="w-12 bg-transparent border-b border-border text-center text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          time
          <input
            type="time"
            value={d.time}
            onChange={(e) => set({ ...d, time: e.target.value })}
            className="bg-transparent border-b border-border text-sm"
          />
        </label>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-muted-foreground">group</label>
        <select
          value={d.groupId}
          onChange={(e) => set({ ...d, groupId: e.target.value })}
          className="bg-transparent border-b border-border text-sm py-1"
        >
          <option value="">None</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          <option value="__new">+ New group…</option>
        </select>
        {d.groupId === "__new" && (
          <input
            type="text"
            placeholder="New group name"
            value={d.newGroupName}
            onChange={(e) => set({ ...d, newGroupName: e.target.value })}
            className="bg-transparent border-b border-border text-sm py-1"
          />
        )}
        <button
          onClick={() => d.name.trim() && onSubmit()}
          className="ml-auto border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );

  const renderCells = (h: Habit) => {
    const target = Math.max(1, h.target_count ?? 1);
    return days.map((d) => {
      const key = formatLocalDate(d);
      if (!habitAppliesOnDow(h, d.getDay())) {
        return (
          <td key={key} className="text-center px-1">
            <div className="h-4 w-4 mx-auto bg-muted/60" aria-hidden />
          </td>
        );
      }
      const entry = entryFor(h.id, key);
      const count = entry?.count ?? 0;
      const done = count >= target;
      const next = cycleHabitCount(count, target);
      return (
        <td key={key} className="text-center px-1">
          <button
            onClick={() => tapCount.mutate({ habitId: h.id, date: key, existingId: entry?.id, count: next })}
            aria-label={`${h.name} ${key}`}
            className={
              target === 1
                ? `h-4 w-4 border border-border ${done ? "bg-foreground" : ""}`
                : `text-[10px] border border-border px-1 py-[1px] min-w-[26px] ${done ? "bg-foreground text-background" : "hover:bg-muted"}`
            }
          >
            {target === 1 ? "" : `${count}/${target}`}
          </button>
        </td>
      );
    });
  };

  const renderHabitRow = (h: Habit, indented: boolean) => {
    const s = habitStats(h);
    const isEditing = editingId === h.id;
    return (
      <tr key={h.id} className="border-t border-border/50 group align-top">
        <td className={`py-1 pr-2 ${indented ? "pl-4" : ""}`}>
          {isEditing ? (
            <div className="py-1">
              {renderDraftForm(editDraft, setEditDraft, () => updateHabit.mutate(h.id), "Save")}
            </div>
          ) : (
            <span className="flex items-center gap-1">
              <CircleDashed size={11} className="text-muted-foreground flex-shrink-0" />
              {h.name}
              {h.habit_time && (
                <span className="text-[10px] text-muted-foreground tabular-nums">{shortTime(h.habit_time)}</span>
              )}
              {s.target > 1 && <span className="text-[10px] text-muted-foreground">×{s.target}</span>}
            </span>
          )}
        </td>
        {renderCells(h)}
        <td className="pl-2 text-right text-xs text-muted-foreground">{s.pct}%</td>
        <td className="pl-2">
          <div className="flex items-center gap-1">
            {isEditing ? (
              <button onClick={() => updateHabit.mutate(h.id)} aria-label="Save habit">
                <Check size={12} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingId(h.id);
                  setEditDraft({
                    name: h.name,
                    days: h.days_of_week ?? ALL_DAYS,
                    target: Math.max(1, h.target_count ?? 1),
                    time: h.habit_time ? h.habit_time.slice(0, 5) : "",
                    groupId: h.routine_group_id ?? "",
                    newGroupName: "",
                  });
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
  };

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-caps">Habits &amp; Routines</p>
          <p className="text-xs text-muted-foreground">Week of {startKey}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewGroup((v) => !v)}
            className="border border-border px-2 py-1 label-caps text-[10px] hover:bg-muted"
          >
            {showNewGroup ? "Cancel" : "+ Group"}
          </button>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="border border-border p-1 hover:bg-muted"
            aria-label="Add habit"
          >
            {showNew ? <X size={12} /> : <Plus size={12} />}
          </button>
        </div>
      </div>

      {showNewGroup && (
        <div className="mb-4 border border-border p-3 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Group name (e.g. 아침 루틴)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="bg-transparent outline-none border-b border-border py-1 text-sm"
          />
          <DayPicker value={groupDays} onChange={setGroupDays} />
          <button
            onClick={() => groupName.trim() && addGroup.mutate()}
            className="border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            Add group
          </button>
        </div>
      )}

      {showNew && (
        <div className="mb-4 border border-border p-3">
          {renderDraftForm(draft, setDraft, () => addHabit.mutate(), "Add")}
        </div>
      )}

      {habits.length === 0 && groups.length === 0 ? (
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
              {grouped.map(({ group, items }) => {
                const totals = items.reduce(
                  (acc, h) => {
                    const s = habitStats(h);
                    return { done: acc.done + s.done, active: acc.active + s.active };
                  },
                  { done: 0, active: 0 },
                );
                const pct = totals.active ? Math.round((totals.done / totals.active) * 100) : 0;
                return (
                  <Fragment key={group.id}>
                    <tr className="border-t border-border group/g">
                      <td colSpan={9} className="py-1">
                        <div className="flex items-center gap-2">
                          <span className="label-caps text-[10px]">{group.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {items.length} habits · {pct}%
                          </span>
                          <div className="h-1 w-24 bg-muted">
                            <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                          </div>
                          <button
                            onClick={() => deleteGroup.mutate(group.id)}
                            className="opacity-0 group-hover/g:opacity-100 hover:text-destructive"
                            aria-label="Delete group"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {items.map((h) => renderHabitRow(h, true))}
                  </Fragment>
                );
              })}
              {ungrouped.map((h) => renderHabitRow(h, false))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export const habitTrackerWidget: WidgetDef = {
  id: "habit_tracker",
  label: "Habit Tracker",
  render: (ctx) => <HabitTrackerPanel userId={ctx.userId} anchorDate={ctx.anchor} />,
};
