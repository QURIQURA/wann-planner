ALTER TABLE public.planner_multiple_tasks
  ADD COLUMN IF NOT EXISTS subtag_id uuid REFERENCES public.planner_task_subtags(id) ON DELETE SET NULL;

ALTER TABLE public.planner_tasks
  DROP CONSTRAINT IF EXISTS planner_tasks_subtag_id_fkey;

ALTER TABLE public.planner_tasks
  ADD CONSTRAINT planner_tasks_subtag_id_fkey
  FOREIGN KEY (subtag_id) REFERENCES public.planner_task_subtags(id) ON DELETE SET NULL;