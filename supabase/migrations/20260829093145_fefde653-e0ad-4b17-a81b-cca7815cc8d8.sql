ALTER TABLE public.planner_tasks ADD COLUMN is_critical boolean NOT NULL DEFAULT false;
ALTER TABLE public.planner_habits ADD COLUMN is_critical boolean NOT NULL DEFAULT false;
