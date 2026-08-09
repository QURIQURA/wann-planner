ALTER TABLE public.planner_habits
  ADD COLUMN IF NOT EXISTS routine_group_id uuid REFERENCES public.planner_routine_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS habit_time time without time zone,
  ADD COLUMN IF NOT EXISTS legacy_item_id uuid;

INSERT INTO public.planner_habits (user_id, name, days_of_week, target_count, sort_order, routine_group_id, legacy_item_id)
SELECT g.user_id,
       i.title,
       CASE WHEN array_length(g.days_of_week, 1) IS NULL THEN ARRAY[0,1,2,3,4,5,6] ELSE g.days_of_week END,
       1,
       i.sort_order,
       g.id,
       i.id
FROM public.planner_routine_items i
JOIN public.planner_routine_groups g ON g.id = i.group_id;

INSERT INTO public.planner_habit_completions (habit_id, user_id, date, count)
SELECT h.id, c.user_id, c.date, 1
FROM public.planner_routine_completions c
JOIN public.planner_habits h ON h.legacy_item_id = c.item_id;

ALTER TABLE public.planner_habits DROP COLUMN legacy_item_id;

DROP TABLE IF EXISTS public.planner_routine_completions;
DROP TABLE IF EXISTS public.planner_routine_items;

CREATE INDEX IF NOT EXISTS planner_habits_group_idx ON public.planner_habits (routine_group_id);