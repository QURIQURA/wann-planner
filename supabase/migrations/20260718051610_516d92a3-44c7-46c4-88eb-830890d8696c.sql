
CREATE TABLE public.planner_recurring_task_exceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  original_date date NOT NULL,
  new_date date NOT NULL,
  new_time time NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, original_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_recurring_task_exceptions TO authenticated;
GRANT ALL ON public.planner_recurring_task_exceptions TO service_role;

ALTER TABLE public.planner_recurring_task_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_all" ON public.planner_recurring_task_exceptions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER planner_rec_exceptions_touch
  BEFORE UPDATE ON public.planner_recurring_task_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();
