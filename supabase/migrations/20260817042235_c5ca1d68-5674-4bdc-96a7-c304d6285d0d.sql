ALTER TABLE public.planner_events
  ADD COLUMN IF NOT EXISTS show_day_count boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_duration boolean NOT NULL DEFAULT false;