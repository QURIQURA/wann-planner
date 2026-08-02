ALTER TABLE public.planner_habits
  ADD COLUMN IF NOT EXISTS days_of_week integer[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6],
  ADD COLUMN IF NOT EXISTS target_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.planner_habit_completions
  ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 1;

DELETE FROM public.planner_habit_completions a
USING public.planner_habit_completions b
WHERE a.habit_id = b.habit_id AND a.date = b.date AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS planner_habit_completions_habit_date_idx
  ON public.planner_habit_completions (habit_id, date);