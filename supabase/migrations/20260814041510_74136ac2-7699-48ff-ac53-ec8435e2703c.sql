CREATE TABLE public.planner_baby_slot_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  tracks_duration boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_baby_slot_types TO authenticated;
GRANT ALL ON public.planner_baby_slot_types TO service_role;
ALTER TABLE public.planner_baby_slot_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage slot types" ON public.planner_baby_slot_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.planner_baby_slot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  date date NOT NULL,
  slot_type_id uuid NOT NULL REFERENCES public.planner_baby_slot_types(id) ON DELETE CASCADE,
  start_time time NOT NULL,
  end_time time,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, slot_type_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_baby_slot_logs TO authenticated;
GRANT ALL ON public.planner_baby_slot_logs TO service_role;
ALTER TABLE public.planner_baby_slot_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage slot logs" ON public.planner_baby_slot_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER planner_baby_slot_types_touch BEFORE UPDATE ON public.planner_baby_slot_types
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();
CREATE TRIGGER planner_baby_slot_logs_touch BEFORE UPDATE ON public.planner_baby_slot_logs
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

INSERT INTO public.planner_baby_slot_types (name, sort_order, tracks_duration) VALUES
  ('낮잠1', 0, true),
  ('낮잠2', 1, true),
  ('낮잠3', 2, true),
  ('밤잠 시작', 3, true),
  ('아침식사', 4, false),
  ('점심식사', 5, false),
  ('애프터눈티', 6, false),
  ('저녁', 7, false);