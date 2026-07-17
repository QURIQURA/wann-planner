
-- ============ HABIT TRACKER ============
CREATE TABLE public.planner_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_habits TO authenticated;
GRANT ALL ON public.planner_habits TO service_role;
ALTER TABLE public.planner_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_habits" ON public.planner_habits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planner_habits_updated BEFORE UPDATE ON public.planner_habits FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

CREATE TABLE public.planner_habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.planner_habits(id) on delete cascade,
  user_id uuid not null,
  date date not null,
  created_at timestamptz not null default now(),
  unique(habit_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_habit_completions TO authenticated;
GRANT ALL ON public.planner_habit_completions TO service_role;
ALTER TABLE public.planner_habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_habit_completions" ON public.planner_habit_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_habit_comp_date ON public.planner_habit_completions(date);

-- ============ DAILY ROUTINES ============
CREATE TABLE public.planner_routine_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  days_of_week int[] not null default '{}', -- 0=Sun..6=Sat; empty = every day
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_routine_groups TO authenticated;
GRANT ALL ON public.planner_routine_groups TO service_role;
ALTER TABLE public.planner_routine_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_routine_groups" ON public.planner_routine_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planner_routine_groups_updated BEFORE UPDATE ON public.planner_routine_groups FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

CREATE TABLE public.planner_routine_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.planner_routine_groups(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_routine_items TO authenticated;
GRANT ALL ON public.planner_routine_items TO service_role;
ALTER TABLE public.planner_routine_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_routine_items" ON public.planner_routine_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_routine_items_group ON public.planner_routine_items(group_id);

CREATE TABLE public.planner_routine_completions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.planner_routine_items(id) on delete cascade,
  user_id uuid not null,
  date date not null,
  created_at timestamptz not null default now(),
  unique(item_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_routine_completions TO authenticated;
GRANT ALL ON public.planner_routine_completions TO service_role;
ALTER TABLE public.planner_routine_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_routine_completions" ON public.planner_routine_completions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_routine_comp_date ON public.planner_routine_completions(date);

-- ============ MONTHLY SUMMARY ============
CREATE TABLE public.planner_monthly_hyatt_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  month text not null, -- YYYY-MM
  hours numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_monthly_hyatt_hours TO authenticated;
GRANT ALL ON public.planner_monthly_hyatt_hours TO service_role;
ALTER TABLE public.planner_monthly_hyatt_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_monthly_hyatt_hours" ON public.planner_monthly_hyatt_hours FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planner_monthly_hyatt_updated BEFORE UPDATE ON public.planner_monthly_hyatt_hours FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

CREATE TABLE public.planner_kora_setup_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null, -- Legal, Brand, Operations
  title text not null,
  next_action_date date,
  completed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_kora_setup_items TO authenticated;
GRANT ALL ON public.planner_kora_setup_items TO service_role;
ALTER TABLE public.planner_kora_setup_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_kora_setup_items" ON public.planner_kora_setup_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planner_kora_setup_updated BEFORE UPDATE ON public.planner_kora_setup_items FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

-- Stub for future Kora Cakes orders
CREATE TABLE public.planner_kora_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  customer_name text,
  order_date date,
  delivery_date date,
  items jsonb,
  status text default 'draft',
  total_amount numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_kora_orders TO authenticated;
GRANT ALL ON public.planner_kora_orders TO service_role;
ALTER TABLE public.planner_kora_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_kora_orders" ON public.planner_kora_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ CROSS-APP ALERTS ============
CREATE TABLE public.planner_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_app text not null,
  message text not null,
  date date not null default (now()::date),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_alerts TO authenticated;
GRANT ALL ON public.planner_alerts TO service_role;
ALTER TABLE public.planner_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_alerts" ON public.planner_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planner_alerts_updated BEFORE UPDATE ON public.planner_alerts FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();

-- ============ DIARY / NOTES ============
CREATE TABLE public.planner_diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,
  content_html text not null default '',
  preview text not null default '', -- first ~80 chars
  has_sticker boolean not null default false,
  thumbnail_sticker_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_diary_entries TO authenticated;
GRANT ALL ON public.planner_diary_entries TO service_role;
ALTER TABLE public.planner_diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_diary_entries" ON public.planner_diary_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_planner_diary_updated BEFORE UPDATE ON public.planner_diary_entries FOR EACH ROW EXECUTE FUNCTION public.planner_touch_updated_at();
CREATE INDEX idx_diary_date ON public.planner_diary_entries(date);

CREATE TABLE public.planner_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_stickers TO authenticated;
GRANT ALL ON public.planner_stickers TO service_role;
ALTER TABLE public.planner_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authed all planner_stickers" ON public.planner_stickers FOR ALL TO authenticated USING (true) WITH CHECK (true);
