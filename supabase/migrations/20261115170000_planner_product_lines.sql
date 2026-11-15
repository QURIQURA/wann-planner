create table if not exists public.planner_product_lines (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  active boolean not null default true,
  launch_date date,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id,key),
  constraint planner_product_lines_key_check check(key ~ '^[a-z0-9_]+$'),
  constraint planner_product_lines_label_check check(length(btrim(label)) between 1 and 100)
);
alter table public.planner_product_lines enable row level security;
grant select,insert,update,delete on public.planner_product_lines to authenticated;
create policy "Users read own product lines" on public.planner_product_lines for select to authenticated using(user_id=(select auth.uid()));
create policy "Users insert own product lines" on public.planner_product_lines for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Users update own product lines" on public.planner_product_lines for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Users delete own product lines" on public.planner_product_lines for delete to authenticated using(user_id=(select auth.uid()));