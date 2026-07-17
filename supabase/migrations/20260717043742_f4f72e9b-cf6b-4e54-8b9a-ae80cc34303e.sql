
-- Drop old special occasions structure
ALTER TABLE public.planner_tasks DROP COLUMN IF EXISTS special_occasion_id;
DROP TABLE IF EXISTS public.planner_special_dates CASCADE;

-- Multiple Tasks (task grouping/projects)
CREATE TABLE public.planner_multiple_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.planner_task_categories(id) ON DELETE SET NULL,
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_multiple_tasks TO authenticated;
GRANT ALL ON public.planner_multiple_tasks TO service_role;
ALTER TABLE public.planner_multiple_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared read" ON public.planner_multiple_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared insert" ON public.planner_multiple_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared update" ON public.planner_multiple_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared delete" ON public.planner_multiple_tasks FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_planner_multiple_tasks_updated_at BEFORE UPDATE ON public.planner_multiple_tasks
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

-- Multiple Task Items (child checklist items)
CREATE TABLE public.planner_multiple_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.planner_multiple_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_multiple_task_items TO authenticated;
GRANT ALL ON public.planner_multiple_task_items TO service_role;
ALTER TABLE public.planner_multiple_task_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared read" ON public.planner_multiple_task_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared insert" ON public.planner_multiple_task_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared update" ON public.planner_multiple_task_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared delete" ON public.planner_multiple_task_items FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_planner_multiple_task_items_updated_at BEFORE UPDATE ON public.planner_multiple_task_items
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();
CREATE INDEX idx_planner_multiple_task_items_parent ON public.planner_multiple_task_items(parent_id);

-- Events (birthdays / anniversaries / public holidays)
CREATE TABLE public.planner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'birthday',
  notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  birth_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_events TO authenticated;
GRANT ALL ON public.planner_events TO service_role;
ALTER TABLE public.planner_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared read" ON public.planner_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "shared insert" ON public.planner_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shared update" ON public.planner_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shared delete" ON public.planner_events FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_planner_events_updated_at BEFORE UPDATE ON public.planner_events
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();
