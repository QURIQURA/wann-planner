CREATE TABLE public.planner_task_subitems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  time time WITHOUT TIME ZONE,
  content text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_task_subitems TO authenticated;
GRANT ALL ON public.planner_task_subitems TO service_role;

ALTER TABLE public.planner_task_subitems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage task subitems"
ON public.planner_task_subitems FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE INDEX planner_task_subitems_task_idx ON public.planner_task_subitems(task_id);

CREATE TRIGGER planner_task_subitems_touch
BEFORE UPDATE ON public.planner_task_subitems
FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();