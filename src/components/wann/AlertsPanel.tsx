import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAlerts } from "@/lib/wann-extra";
import { todayLocalStr } from "@/lib/wann-data";

export function AlertsPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const alertsQ = useQuery({ queryKey: ["alerts"], queryFn: fetchAlerts });
  const [creating, setCreating] = useState(false);
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("planner_alerts").insert({
        user_id: userId, source_app: source.trim() || "unknown", message: message.trim(), date: todayLocalStr(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCreating(false); setSource(""); setMessage("");
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_alerts").update({ resolved: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planner_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const alerts = alertsQ.data ?? [];

  return (
    <section className="card-flat p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="label-caps">Cross-App Alerts</p>
          <p className="text-xs text-muted-foreground">Needs update</p>
        </div>
        <button onClick={() => setCreating(!creating)} className="border border-border p-1 hover:bg-muted" aria-label="Add alert">
          <Plus size={14} />
        </button>
      </div>

      {creating && (
        <div className="card-flat p-3 mb-3 space-y-2">
          <input
            autoFocus
            placeholder="Source app (e.g. Finance, Croijang)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-transparent outline-none border-b border-border py-1 text-sm"
          />
          <input
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-transparent outline-none border-b border-border py-1 text-sm"
          />
          <div className="flex justify-end">
            <button
              onClick={() => { if (message.trim()) add.mutate(); }}
              className="border border-border px-3 py-1 label-caps hover:bg-muted"
            >Add</button>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">All clear</p>
      ) : (
        <div className="space-y-1">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-2 py-1 border-b border-border/50 group">
              <span className="text-[10px] label-caps border border-border px-1">{a.source_app}</span>
              <span className="text-sm flex-1">{a.message}</span>
              <span className="text-xs text-muted-foreground">{a.date}</span>
              <button onClick={() => resolve.mutate(a.id)} className="opacity-0 group-hover:opacity-100 hover:text-foreground" aria-label="Resolve">
                <Check size={12} />
              </button>
              <button onClick={() => remove.mutate(a.id)} className="opacity-0 group-hover:opacity-100 hover:text-destructive" aria-label="Delete">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
