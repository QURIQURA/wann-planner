CREATE TABLE public.planner_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_groups TO authenticated;
GRANT ALL ON public.planner_groups TO service_role;
ALTER TABLE public.planner_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_groups" ON public.planner_groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_groups_user ON public.planner_groups(user_id);
CREATE TRIGGER trg_planner_groups_updated
  BEFORE UPDATE ON public.planner_groups
  FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

ALTER TABLE public.planner_multiple_tasks
  ADD COLUMN group_id uuid NULL REFERENCES public.planner_groups(id) ON DELETE SET NULL;
CREATE INDEX idx_multiple_tasks_group ON public.planner_multiple_tasks(group_id) WHERE group_id IS NOT NULL;

ALTER TABLE public.planner_tasks
  ADD COLUMN group_id uuid NULL REFERENCES public.planner_groups(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_group ON public.planner_tasks(group_id) WHERE group_id IS NOT NULL;

ALTER TABLE public.planner_tasks
  ADD CONSTRAINT chk_tasks_project_or_group_exclusive
  CHECK (NOT (multiple_task_id IS NOT NULL AND group_id IS NOT NULL));
