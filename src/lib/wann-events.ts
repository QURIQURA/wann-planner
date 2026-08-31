/**
 * Event colour architecture (agreed with user 2026-08-31).
 *
 * Scope of this module: colour SOURCE only. The Timeline/Month RENDERER
 * (the 2px day-card border, event dots, chips) is unchanged — every caller
 * just swaps `EVENT_COLORS[e.type]` for `resolveEventColor(e, eventTypes)`.
 *
 * - System Event Types (birthday/anniversary/holiday/dplus) are NOT rows in
 *   the DB — they stay exactly as before, as the `EVENT_COLORS` constant in
 *   wann-data.ts. This is what makes the migration provably non-destructive:
 *   no rows to seed, so existing System Event colours cannot change.
 * - Custom Event Types are rows in `planner_event_types` (name + a
 *   system-generated `key`, never user-typed — see `slugifyEventTypeKey`).
 * - `planner_events.color` is a per-EVENT override. NULL does not mean
 *   "no colour" — it means "inherit from the type's default colour".
 *
 * Resolution order (single source of truth — every renderer calls this):
 *   event.color                          (individual override)
 *     -> custom type's default_color     (planner_event_types, keyed by event.type)
 *       -> EVENT_COLORS[event.type]      (system default, unchanged)
 *         -> NEUTRAL_FALLBACK_COLOR      (only for a truly unknown/orphaned type)
 */
import { EVENT_COLORS, DPLUS_TYPE, type EventEntry, type EventType } from "@/lib/wann-data";

/** Curated palette for Event colour — not a free RGB picker. Every swatch is a
 * medium-light pastel tone (same family as EVENT_COLORS / BABY_SLOT_PALETTE)
 * chosen so the app's dark foreground text stays readable directly on top of
 * a full solid swatch, in both the small dot/chip uses and any future
 * full-day solid treatment. */
export const EVENT_PALETTE: { name: string; hex: string }[] = [
  { name: "Tan", hex: "#D4A574" },
  { name: "Pink", hex: "#C99BA3" },
  { name: "Terracotta", hex: "#C17A6E" },
  { name: "Sage", hex: "#8FA98A" },
  { name: "Purple", hex: "#B6A6D9" },
  { name: "Blue", hex: "#A6BFD9" },
  { name: "Gold", hex: "#D9C27A" },
  { name: "Slate", hex: "#ACA9A2" },
];

export const NEUTRAL_FALLBACK_COLOR = "#ACA9A2";

export type SystemEventTypeKey = "birthday" | "anniversary" | "holiday" | typeof DPLUS_TYPE;

/** Labels for the 4 built-in types — unchanged set, just centralized here
 * alongside the rest of the type-picker logic. */
export const SYSTEM_EVENT_TYPES: { key: SystemEventTypeKey; label: string }[] = [
  { key: "birthday", label: "birthday" },
  { key: "anniversary", label: "anniversary" },
  { key: "holiday", label: "public holiday" },
  { key: DPLUS_TYPE, label: "D+day" },
];

/** System-generated, stable, unique-enough slug — the user only ever types a Name. */
export function slugifyEventTypeKey(name: string, existingKeys: string[]): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "_")
      .replace(/^_+|_+$/g, "") || "type";
  const taken = new Set(existingKeys);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** The single source of truth for an event's rendered colour. */
export function resolveEventColor(
  event: Pick<EventEntry, "type" | "color">,
  eventTypes: EventType[],
): string {
  if (event.color) return event.color;
  const custom = eventTypes.find((t) => t.key === event.type);
  if (custom?.default_color) return custom.default_color;
  return EVENT_COLORS[event.type] ?? NEUTRAL_FALLBACK_COLOR;
}

/** Display name for an event's type — system label, or the custom type's Name. */
export function eventTypeLabel(type: string, eventTypes: EventType[]): string {
  const sys = SYSTEM_EVENT_TYPES.find((t) => t.key === type);
  if (sys) return sys.label;
  const custom = eventTypes.find((t) => t.key === type);
  return custom?.name ?? type;
}
