
-- Categories
CREATE TABLE public.planner_task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#D4D3CE',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_task_categories TO authenticated;
GRANT ALL ON public.planner_task_categories TO service_role;
ALTER TABLE public.planner_task_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared_all" ON public.planner_task_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Subtags
CREATE TABLE public.planner_task_subtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.planner_task_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_task_subtags TO authenticated;
GRANT ALL ON public.planner_task_subtags TO service_role;
ALTER TABLE public.planner_task_subtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared_all" ON public.planner_task_subtags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Special dates
CREATE TABLE public.planner_special_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'birthday',
  category TEXT NOT NULL DEFAULT 'personal',
  notes TEXT,
  show_age BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_special_dates TO authenticated;
GRANT ALL ON public.planner_special_dates TO service_role;
ALTER TABLE public.planner_special_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared_all" ON public.planner_special_dates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tasks
CREATE TABLE public.planner_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE,
  due_time TIME,
  recurrence TEXT NOT NULL DEFAULT 'none',
  category_id UUID REFERENCES public.planner_task_categories(id) ON DELETE SET NULL,
  subtag_id UUID REFERENCES public.planner_task_subtags(id) ON DELETE SET NULL,
  special_occasion_id UUID REFERENCES public.planner_special_dates(id) ON DELETE SET NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_tasks TO authenticated;
GRANT ALL ON public.planner_tasks TO service_role;
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared_all" ON public.planner_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.planner_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER planner_tasks_touch_updated_at
BEFORE UPDATE ON public.planner_tasks
FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

-- Task completions
CREATE TABLE public.planner_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.planner_tasks(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, occurrence_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_task_completions TO authenticated;
GRANT ALL ON public.planner_task_completions TO service_role;
ALTER TABLE public.planner_task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared_all" ON public.planner_task_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- User settings (per-user personal display settings)
CREATE TABLE public.planner_user_settings (
  user_id UUID PRIMARY KEY,
  bg_color TEXT NOT NULL DEFAULT '#F5F4F1',
  border_color TEXT NOT NULL DEFAULT '#D4D3CE',
  text_color TEXT NOT NULL DEFAULT '#1A1A18',
  font TEXT NOT NULL DEFAULT 'DM Mono',
  widget_visibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_user_settings TO authenticated;
GRANT ALL ON public.planner_user_settings TO service_role;
ALTER TABLE public.planner_user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared_all" ON public.planner_user_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER planner_user_settings_touch_updated_at
BEFORE UPDATE ON public.planner_user_settings
FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();
