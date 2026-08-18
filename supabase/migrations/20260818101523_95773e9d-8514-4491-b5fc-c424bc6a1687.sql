CREATE TABLE public.planner_event_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.planner_events(id) ON DELETE CASCADE,
  year integer,
  date date,
  note text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX planner_event_notes_event_idx ON public.planner_event_notes(event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_event_notes TO authenticated;
GRANT ALL ON public.planner_event_notes TO service_role;
ALTER TABLE public.planner_event_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household can manage event notes" ON public.planner_event_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER planner_event_notes_touch BEFORE UPDATE ON public.planner_event_notes FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();