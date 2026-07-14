import { useEffect } from "react";
import type { UserSettings } from "@/lib/wann-data";

const FONT_MAP: Record<string, string> = {
  "dm-mono": '"DM Mono", ui-monospace, monospace',
  "ibm-plex": '"IBM Plex Mono", ui-monospace, monospace',
  "system": 'ui-sans-serif, system-ui, -apple-system, sans-serif',
};

export function useApplySettings(settings: UserSettings | undefined) {
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty("--background", settings.bg_color);
    root.style.setProperty("--border", settings.border_color);
    root.style.setProperty("--foreground", settings.text_color);
    root.style.setProperty("--app-font", FONT_MAP[settings.font] ?? FONT_MAP["dm-mono"]);
    // derived card + muted colors
    root.style.setProperty("--card", mix(settings.bg_color, "#ffffff", 0.5));
    root.style.setProperty("--muted", mix(settings.bg_color, settings.border_color, 0.4));
    root.style.setProperty("--muted-foreground", mix(settings.text_color, settings.bg_color, 0.45));
  }, [settings]);
}

function mix(a: string, b: string, t: number) {
  const pa = hex(a); const pb = hex(b);
  const r = Math.round(pa[0] * (1 - t) + pb[0] * t);
  const g = Math.round(pa[1] * (1 - t) + pb[1] * t);
  const bl = Math.round(pa[2] * (1 - t) + pb[2] * t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function hex(s: string): [number, number, number] {
  const c = s.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}
