-- ============ 21. DIARY PHOTOS ============
CREATE TABLE IF NOT EXISTS public.planner_diary_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_diary_photos TO authenticated;
GRANT ALL ON public.planner_diary_photos TO service_role;

ALTER TABLE public.planner_diary_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared diary photos" ON public.planner_diary_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS planner_diary_photos_date_idx ON public.planner_diary_photos(date);

CREATE TRIGGER planner_diary_photos_touch
  BEFORE UPDATE ON public.planner_diary_photos
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

-- ============ 22. UNIFY MULTIPLE TASK SUB-ITEMS WITH TASKS ============
ALTER TABLE public.planner_tasks
  ADD COLUMN IF NOT EXISTS multiple_task_id uuid
  REFERENCES public.planner_multiple_tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS planner_tasks_multiple_task_id_idx
  ON public.planner_tasks(multiple_task_id);

-- migrate existing sub-items into tasks, preserving completion
INSERT INTO public.planner_tasks
  (user_id, title, due_date, recurrence, category_id, subtag_id, completed, completed_at, multiple_task_id, created_at)
SELECT
  mt.user_id,
  i.title,
  mt.date,
  'none',
  mt.category_id,
  mt.subtag_id,
  i.completed,
  CASE WHEN i.completed THEN i.updated_at ELSE NULL END,
  mt.id,
  i.created_at
FROM public.planner_multiple_task_items i
JOIN public.planner_multiple_tasks mt ON mt.id = i.parent_id;

DROP TABLE public.planner_multiple_task_items;