-- Scratch-database test for public.pilot_availability (NOT for the live WANN project).
-- Run against an empty local Postgres:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/pilot_availability_scratch_test.sql
-- It creates minimal stand-ins for Supabase roles/tables, applies the migration, and asserts results.
\set ON_ERROR_STOP 1
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create table if not exists public.childcare_schedules (
  user_id uuid primary key, weekly jsonb not null, overrides jsonb not null default '[]', updated_at timestamptz default now());
create table if not exists public.planner_tasks (
  id uuid primary key, user_id uuid not null, title text not null default 'x', due_date date, due_time time,
  end_time time, recurrence text not null default 'none', completed boolean not null default false);
create table if not exists public.planner_recurring_task_exceptions (
  id uuid primary key default gen_random_uuid(), task_id uuid not null, original_date date not null,
  new_date date not null, new_time time);

\ir ../migrations/20261115110000_pilot_availability.sql

begin;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
-- Planner default routine (same as defaultWeekly in use-childcare-sync.ts)
insert into public.childcare_schedules(user_id, weekly, overrides) values
('00000000-0000-0000-0000-000000000001',
 '[{"day":0,"start":8,"end":20,"carer":"Youn"},{"day":1,"start":8,"end":20,"carer":"Youn"},
   {"day":2,"start":8,"end":20,"carer":"Lach"},{"day":3,"start":14,"end":20,"carer":"Lach"},{"day":3,"start":8,"end":14,"carer":"Youn"},
   {"day":4,"start":8,"end":10,"carer":"Unassigned"},{"day":4,"start":10,"end":16,"carer":"Childcare"},{"day":4,"start":16,"end":20,"carer":"Unassigned"},
   {"day":5,"start":8,"end":10,"carer":"Unassigned"},{"day":5,"start":10,"end":16,"carer":"Childcare"},{"day":5,"start":16,"end":20,"carer":"Unassigned"},
   {"day":6,"start":8,"end":20,"carer":"Lach"}]',
 '[{"date":"2026-11-20","start":12,"end":14,"carer":"Youn"},{"date":"2026-11-20","start":12,"end":13,"carer":"Lach"},
   {"date":"2026-11-21","start":9,"end":11,"carer":"Shared"},{"date":"2026-11-21","start":6,"end":8,"carer":"Lach"},
   {"date":"2026-11-21","start":20,"end":21,"carer":"Childcare"},
   {"date":"2026-11-22","start":5,"end":8,"carer":"Youn"},{"date":"2026-11-22","start":20,"end":22,"carer":"Shared"},
   {"date":"2026-11-22","start":22,"end":23,"carer":"Unassigned"}]'),
('00000000-0000-0000-0000-000000000002', '[{"day":5,"start":8,"end":20,"carer":"Lach"}]', '[]');
-- Tasks of the mapped user
insert into public.planner_tasks(id, user_id, due_date, due_time, end_time, recurrence) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','2026-11-20','11:00','11:30','none'),   -- busy 11:00-11:30
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','2026-11-20','15:00',null,'none'),      -- no end time: busy 15:00-15:30
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','2026-11-20','10:00','11:00','none'),   -- excluded (Pilot-owned)
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','2026-11-06','10:00','10:30','weekly'), -- Fridays; 11-20 moved away
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','2026-11-27','13:00','13:30','none'),   -- moved earlier onto 11-20 at 14:00
 ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000002','2026-11-20','10:00','16:00','none'),   -- other user: ignored
 ('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','2026-11-21','06:30','07:00','none');   -- task beats Lach check
insert into public.planner_recurring_task_exceptions(task_id, original_date, new_date, new_time) values
 ('10000000-0000-0000-0000-000000000004','2026-11-20','2026-11-21','09:00'),
 ('10000000-0000-0000-0000-000000000005','2026-11-27','2026-11-20','14:00');

-- Not configured yet
do $$ begin
  assert public.pilot_availability('2026-11-20','2026-11-20')->>'reason' = 'not_configured', 'expected not_configured';
  assert public.pilot_availability('2026-11-20','2026-11-19')->>'reason' = 'invalid_range', 'expected invalid_range';
end $$;
insert into public.integration_links values ('pilot','00000000-0000-0000-0000-000000000001');

create temp table r as
  select d->>'date' as date, s->>'start' as s, s->>'end' as e, s->>'state' as state, s->>'reason' as reason,
         s->>'carer' as carer, (s->>'override')::boolean as ovr
  from jsonb_array_elements(public.pilot_availability('2026-11-20','2026-11-22',
         array['10000000-0000-0000-0000-000000000003']::uuid[])->'days') d,
       jsonb_array_elements(d->'segments') s;
select * from r where date = '2026-11-20' order by s;

do $$
declare got text;
begin
  -- Friday 2026-11-20: 00-08 unknown (nothing recorded), 08-10 unknown, 10-11 available (excluded Pilot task ignored),
  -- 11:00-11:30 busy task, 11:30-12 available, 12-13 override Youn first match -> busy, 13-14 Youn busy override,
  -- 14:00-14:30 moved-in task busy, 14:30-15 available, 15:00-15:30 no-end task busy, 15:30-16 available,
  -- 16-20 unknown, 20-24 unknown (nothing recorded).
  select string_agg(s||'-'||e||':'||state, ' ' order by s) into got from r where date = '2026-11-20';
  assert got = '00:00-08:00:unknown 08:00-10:00:unknown 10:00-11:00:available 11:00-11:30:busy 11:30-12:00:available '
            || '12:00-14:00:busy 14:00-14:30:busy 14:30-15:00:available 15:00-15:30:busy 15:30-16:00:available '
            || '16:00-20:00:unknown 20:00-24:00:unknown', 'friday mismatch: ' || got;
  assert (select reason from r where date='2026-11-20' and s='00:00') = 'no_record', 'unrecorded night reason';
  assert (select ovr from r where date='2026-11-20' and s='12:00'), 'override flag expected';
  assert (select reason from r where date='2026-11-20' and s='14:00') = 'planner_task', 'moved-in task reason';
  -- Saturday 2026-11-21: Lach all day; Lach override 06-08 -> check (window only softens Lach/Sage);
  -- Shared override 09-11 -> unknown, but the weekly task moved in at 09:00 is busy (task beats any carer);
  -- Sage override 20-21 -> check; nights with nothing recorded -> unknown (never check).
  select string_agg(s||'-'||e||':'||state||':'||reason, ' ' order by s) into got from r where date = '2026-11-21';
  assert got = '00:00-06:00:unknown:no_record 06:00-06:30:check:outside_window 06:30-07:00:busy:planner_task '
            || '07:00-08:00:check:outside_window 08:00-09:00:available:childcare '
            || '09:00-09:30:busy:planner_task 09:30-11:00:unknown:childcare 11:00-20:00:available:childcare '
            || '20:00-21:00:check:outside_window 21:00-24:00:unknown:no_record',
    'saturday mismatch: ' || got;
  assert (select carer from r where date='2026-11-21' and s='06:00') = 'Lach', 'outside-window Lach keeps carer';
  assert (select carer from r where date='2026-11-21' and s='00:00') is null, 'unrecorded night has no carer';
  -- Sunday 2026-11-22 (weekday from date string = 0 -> Youn 08-20). Carer beats the window:
  -- Youn override 05-08 stays busy, Shared 20-22 and Unassigned 22-23 unknown, unrecorded hours unknown.
  select string_agg(s||'-'||e||':'||state, ' ' order by s) into got from r where date = '2026-11-22';
  assert got = '00:00-05:00:unknown 05:00-08:00:busy 08:00-20:00:busy 20:00-22:00:unknown 22:00-23:00:unknown 23:00-24:00:unknown',
    'sunday mismatch: ' || got;
end $$;

-- Weekly recurrence on its natural day (2026-11-13 Friday) and DST-change days in Sydney
do $$
declare got text;
begin
  select string_agg((s->>'start')||'-'||(s->>'end')||':'||(s->>'state'), ' ' order by s->>'start') into got
  from jsonb_array_elements(public.pilot_availability('2026-11-13','2026-11-13')->'days'->0->'segments') s;
  assert got like '%10:00-10:30:busy 10:30-16:00:available%', 'weekly natural occurrence: ' || got;
  assert jsonb_array_length(public.pilot_availability('2026-10-04','2026-10-04')->'days') = 1, 'DST start day';
  assert (public.pilot_availability('2027-04-04','2027-04-04')->'days'->0->'segments'->1->>'state') = 'busy', 'DST end Sunday = Youn';
end $$;

-- Privileges: only service_role may execute
do $$ begin
  assert not has_function_privilege('anon', 'public.pilot_availability(date,date,uuid[])', 'execute'), 'anon must not execute';
  assert not has_function_privilege('authenticated', 'public.pilot_availability(date,date,uuid[])', 'execute'), 'authenticated must not execute';
  assert has_function_privilege('service_role', 'public.pilot_availability(date,date,uuid[])', 'execute'), 'service_role executes';
  assert not has_table_privilege('authenticated', 'public.integration_links', 'select'), 'integration_links hidden';
end $$;
rollback;
\echo 'pilot_availability scratch test: OK'
