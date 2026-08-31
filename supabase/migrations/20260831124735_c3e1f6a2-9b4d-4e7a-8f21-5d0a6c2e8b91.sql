-- Individual per-event colour override. NULL means "inherit from type default"
-- (custom type's default_color, else the hardcoded system EVENT_COLORS[type]) —
-- NULL is not "no colour", see resolveEventColor() in app code.
ALTER TABLE public.planner_events ADD COLUMN color text;

-- Custom Event Types only. System types (birthday/anniversary/holiday/dplus) stay
-- as hardcoded EVENT_COLORS in app code — no rows are seeded here for them, so
-- existing System Event colours are provably unchanged by this migration.
CREATE TABLE public.planner_event_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  key text not null,             -- system-generated stable slug, never user-typed
  name text not null,
  default_color text,
  is_system boolean not null default false,
  is_archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_event_types TO authenticated;
GRANT ALL ON public.planner_event_types TO service_role;
ALTER TABLE public.planner_event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_event_types" ON public.planner_event_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planner_event_types_updated BEFORE UPDATE ON public.planner_event_types FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();
CREATE INDEX idx_event_types_active ON public.planner_event_types(user_id) WHERE is_archived = false;
