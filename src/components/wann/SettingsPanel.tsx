import { useState } from "react";
import { X } from "lucide-react";
import type { UserSettings } from "@/lib/wann-data";

const PRESETS = [
  { name: "Stone", bg: "#F5F4F1", border: "#D4D3CE", text: "#1A1A18" },
  { name: "Paper", bg: "#FAF8F3", border: "#E4DFD3", text: "#2A2620" },
  { name: "Slate", bg: "#E8E9EA", border: "#B8BCC0", text: "#141618" },
  { name: "Ink", bg: "#1A1A18", border: "#3A3A36", text: "#EDECE7" },
  { name: "Sand", bg: "#EEE7D8", border: "#C9BFA8", text: "#3D2E1B" },
];

const FONTS = [
  { id: "dm-mono", label: "DM Mono" },
  { id: "ibm-plex", label: "IBM Plex Mono" },
  { id: "system", label: "System" },
];

const WIDGETS = [
  { id: "habit_tracker", label: "Habit Tracker" },
  { id: "weekly_review", label: "Weekly Review" },
  { id: "monthly_summary", label: "Monthly Summary" },
] as const;

export function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"colors" | "font" | "widgets">("colors");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/10">
      <div className="w-full max-w-md bg-background border-l border-border overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <p className="label-caps">Settings</p>
          <button onClick={onClose} className="hover:bg-muted p-1"><X size={16} /></button>
        </div>

        <div className="flex border-b border-border">
          {(["colors", "font", "widgets"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 label-caps border-r border-border last:border-r-0 ${tab === t ? "bg-muted" : "hover:bg-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "colors" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="label-caps mb-3 text-muted-foreground">Presets</p>
              <div className="grid grid-cols-5 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => onChange({ bg_color: p.bg, border_color: p.border, text_color: p.text })}
                    className="border border-border p-2 hover:opacity-80"
                    style={{ background: p.bg }}
                    title={p.name}
                  >
                    <div className="h-6" style={{ background: p.text }} />
                  </button>
                ))}
              </div>
            </div>
            <ColorRow label="Background" value={settings.bg_color} onChange={(v) => onChange({ bg_color: v })} />
            <ColorRow label="Border" value={settings.border_color} onChange={(v) => onChange({ border_color: v })} />
            <ColorRow label="Text" value={settings.text_color} onChange={(v) => onChange({ text_color: v })} />
          </div>
        )}

        {tab === "font" && (
          <div className="p-6 space-y-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => onChange({ font: f.id })}
                className={`w-full text-left border border-border p-3 flex items-center justify-between ${settings.font === f.id ? "bg-muted" : "hover:bg-muted"}`}
              >
                <span>{f.label}</span>
                {settings.font === f.id && <span className="label-caps">Active</span>}
              </button>
            ))}
          </div>
        )}

        {tab === "widgets" && (
          <div className="p-6 space-y-2">
            {WIDGETS.map((w) => {
              const on = settings.widget_visibility[w.id] !== false;
              return (
                <label key={w.id} className="flex items-center justify-between border border-border p-3 cursor-pointer hover:bg-muted">
                  <span>{w.label}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      onChange({
                        widget_visibility: { ...settings.widget_visibility, [w.id]: e.target.checked },
                      })
                    }
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="label-caps mb-2 text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 border border-border p-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
    </div>
  );
}
