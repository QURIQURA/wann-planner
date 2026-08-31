-- ============ INTENTIONS (IDEA / LATER / GOAL + REVIEW TIMER) ============
CREATE TABLE public.planner_intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,

  title text not null,
  notes text,

  stage text not null default 'idea',      -- 'idea' | 'later' | 'goal'
  category_id uuid references public.planner_task_categories(id) on delete set null,

  -- Review Timer (calendar-based; see addCalendarInterval in app code)
  review_interval text not null default 'never', -- 'never'|'1_week'|'1_month'|'3_months'|'6_months'|'1_year'|'custom'
  review_interval_days int,                 -- only used when review_interval = 'custom'
  next_review_date date,
  last_reviewed_at timestamptz,

  status text not null default 'active',    -- 'active' | 'archived' | 'completed'
  linked_project_id uuid references public.planner_multiple_tasks(id) on delete set null,

  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_intentions TO authenticated;
GRANT ALL ON public.planner_intentions TO service_role;
ALTER TABLE public.planner_intentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_intentions" ON public.planner_intentions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planner_intentions_updated BEFORE UPDATE ON public.planner_intentions FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();
CREATE INDEX idx_intentions_next_review ON public.planner_intentions(next_review_date) WHERE status = 'active';
CREATE INDEX idx_intentions_stage ON public.planner_intentions(stage) WHERE status = 'active';
CREATE INDEX idx_intentions_linked_project ON public.planner_intentions(linked_project_id) WHERE linked_project_id IS NOT NULL;
