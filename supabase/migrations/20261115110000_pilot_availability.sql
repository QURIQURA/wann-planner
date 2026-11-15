-- YEON OS: read-only Planner availability for the Pilot daily Work Session timeline.
-- Issue: QURIQURA/pastry-pilot#4 (design) · Planner owns derivation; Pilot only displays it.
--
-- Contract (summary; see docs/yeon-os/INTEGRATION_CONTRACTS.md §E):
--   public.pilot_availability(p_from date, p_to date, p_exclude_task_ids uuid[]) -> jsonb
--   * Executable by service_role only (called server-side by Pilot's planner-availability edge function).
--   * Reads childcare_schedules, planner_tasks and planner_recurring_task_exceptions of the ONE Planner
--     user mapped in public.integration_links (source = 'pilot'). Never returns raw JSON or task titles.
--   * Dates are Australia/Sydney local dates; times are local wall-clock (same as Planner storage).
--
-- Availability policy approved by 연 on 2026-11-15 (revised the same day: the carer decides first,
-- the 08:00–20:00 window only softens Lach / Sage time and never overrides Yeon or Shared/Unassigned):
--   Timed Planner task (any carer)   -> busy (a task without an end time blocks 30 minutes)
--   Tanji with Yeon                  -> busy at any hour
--   Tanji with Lach / Tanji at Sage  -> available from 08:00 to 20:00, check before 08:00 / from 20:00
--   Shared (who cares is not decided) / Unassigned -> unknown at any hour (not counted as available)
--   Hour with no routine or override recorded -> unknown at any hour (check is only for confirmed Lach / Sage time)
--   Tasks Pilot created itself (p_exclude_task_ids) are ignored so Pilot work is not double counted.
-- Resolution: 15 minutes.

create table if not exists public.integration_links (
  source text primary key,
  planner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.integration_links enable row level security;
-- No policies on purpose: only service_role and SECURITY DEFINER functions may read it.
revoke all on table public.integration_links from public, anon, authenticated;

create or replace function public.pilot_recurrence_matches(p_anchor date, p_recurrence text, p_date date)
returns boolean language sql immutable set search_path = '' as $$
  -- Mirrors matchesRecurrencePattern() in src/lib/wann-data.ts.
  select case
    when p_anchor is null or p_date < p_anchor then false
    when coalesce(p_recurrence, 'none') = 'none' then p_anchor = p_date
    when p_recurrence = 'daily' then true
    when p_recurrence = 'weekly' then (p_date - p_anchor) % 7 = 0
    when p_recurrence = 'biweekly' then (p_date - p_anchor) % 14 = 0
    when p_recurrence = 'monthly' then extract(day from p_anchor) = extract(day from p_date)
    else false
  end
$$;

create or replace function public.pilot_availability(
  p_from date,
  p_to date,
  p_exclude_task_ids uuid[] default '{}'::uuid[]
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_weekly jsonb;
  v_overrides jsonb;
  v_updated timestamptz;
  v_days jsonb := '[]'::jsonb;
  v_day date;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 31 then
    return jsonb_build_object('status', 'unavailable', 'reason', 'invalid_range');
  end if;

  select planner_user_id into v_uid from public.integration_links where source = 'pilot';
  if v_uid is null then
    return jsonb_build_object('status', 'unavailable', 'reason', 'not_configured');
  end if;

  select weekly, overrides, updated_at into v_weekly, v_overrides, v_updated
    from public.childcare_schedules where user_id = v_uid;
  if v_weekly is null then
    return jsonb_build_object('status', 'unavailable', 'reason', 'no_childcare_schedule');
  end if;
  v_overrides := coalesce(v_overrides, '[]'::jsonb);

  for v_day in select generate_series(p_from, p_to, interval '1 day')::date loop
    v_days := v_days || jsonb_build_array(jsonb_build_object(
      'date', to_char(v_day, 'YYYY-MM-DD'),
      'segments', coalesce((
        with
        -- Effective carer per hour: first matching date override wins, else the weekly routine
        -- (sorted by start, first match), else null (nothing recorded). Same lookup order as daily.tsx.
        hours as (
          select h,
            (select o.value->>'carer' from jsonb_array_elements(v_overrides) with ordinality o(value, ord)
              where o.value->>'date' = to_char(v_day, 'YYYY-MM-DD')
                and (o.value->>'start')::numeric <= h and (o.value->>'end')::numeric > h
              order by o.ord limit 1) as override_carer,
            (select w.value->>'carer' from jsonb_array_elements(v_weekly) with ordinality w(value, ord)
              where (w.value->>'day')::int = extract(dow from v_day)::int
                and (w.value->>'start')::numeric <= h and (w.value->>'end')::numeric > h
              order by (w.value->>'start')::numeric, w.ord limit 1) as routine_carer
          from generate_series(0, 23) h
        ),
        care as (
          select h,
            coalesce(override_carer, routine_carer) as carer, -- null = nothing recorded for this hour
            override_carer is not null as is_override
          from hours
        ),
        slots as (
          select s, start_min,
            c.carer,
            c.is_override,
            -- carer first; the window only turns confirmed Lach / Sage time into check
            case
              when c.carer = 'Youn' then 'busy'
              when c.carer in ('Lach', 'Childcare') then case when in_window then 'available' else 'check' end
              else 'unknown' -- Shared, Unassigned, or nothing recorded: at any hour
            end as care_state,
            case
              when c.carer is null then 'no_record'
              when not in_window and c.carer in ('Lach', 'Childcare') then 'outside_window'
              else 'childcare'
            end as care_reason
          from (select s, s * 15 as start_min, s * 15 >= 8 * 60 and s * 15 < 20 * 60 as in_window
                from generate_series(0, 95) s) g
          join care c on c.h = g.start_min / 60
        ),
        tasks as (
          select t.id, t.due_date, t.due_time, t.end_time, coalesce(t.recurrence, 'none') as recurrence
          from public.planner_tasks t
          where t.user_id = v_uid
            and t.due_time is not null
            and t.due_date is not null
            and not (t.id = any (coalesce(p_exclude_task_ids, '{}'::uuid[])))
        ),
        -- Effective occurrences on v_day, mirroring effectiveOccurrencesOnDate() in src/lib/wann-data.ts.
        occ as (
          -- one-off, not moved
          select t.id, t.due_time as eff_time, t.due_time, t.end_time from tasks t
          where t.recurrence = 'none' and t.due_date = v_day
            and not exists (select 1 from public.planner_recurring_task_exceptions e
                            where e.task_id = t.id and e.original_date = t.due_date)
          union all
          -- one-off moved onto v_day
          select t.id, coalesce(e.new_time, t.due_time), t.due_time, t.end_time
          from tasks t join public.planner_recurring_task_exceptions e
            on e.task_id = t.id and e.original_date = t.due_date
          where t.recurrence = 'none' and e.new_date = v_day
          union all
          -- recurring natural occurrence (with optional time-only change), unless moved away
          select t.id,
            coalesce((select e.new_time from public.planner_recurring_task_exceptions e
                      where e.task_id = t.id and e.original_date = v_day and e.new_date = v_day limit 1),
                     t.due_time),
            t.due_time, t.end_time
          from tasks t
          where t.recurrence <> 'none'
            and public.pilot_recurrence_matches(t.due_date, t.recurrence, v_day)
            and not exists (select 1 from public.planner_recurring_task_exceptions e
                            where e.task_id = t.id and e.original_date = v_day and e.new_date <> v_day)
          union all
          -- recurring occurrence moved onto v_day from another date
          select t.id, coalesce(e.new_time, t.due_time), t.due_time, t.end_time
          from public.planner_tasks t join public.planner_recurring_task_exceptions e on e.task_id = t.id
          where t.user_id = v_uid and t.due_time is not null and coalesce(t.recurrence, 'none') <> 'none'
            and not (t.id = any (coalesce(p_exclude_task_ids, '{}'::uuid[])))
            and e.new_date = v_day and e.original_date <> v_day
            and public.pilot_recurrence_matches(t.due_date, t.recurrence, e.original_date)
        ),
        occ_min as (
          select
            (extract(hour from eff_time) * 60 + extract(minute from eff_time))::int as s_min,
            case
              when end_time is not null and end_time > due_time
                then (extract(epoch from (end_time - due_time)) / 60)::int
              else null
            end as dur
          from occ
        ),
        task_slots as (
          select sl.s,
            3 as task_rank
          from slots sl
          join occ_min o
            on sl.start_min < least(o.s_min + coalesce(o.dur, 30), 1440)
           and sl.start_min + 15 > o.s_min
          group by sl.s
        ),
        ranked as (
          select sl.s, sl.start_min, sl.carer, sl.is_override,
            case sl.care_state when 'available' then 0 when 'check' then 1 when 'unknown' then 2 else 3 end as care_rank,
            coalesce(ts.task_rank, -1) as task_rank,
            sl.care_reason
          from slots sl left join task_slots ts on ts.s = sl.s
        ),
        decided as (
          select s, start_min, carer, is_override,
            case greatest(care_rank, task_rank)
              when 0 then 'available' when 1 then 'check' when 2 then 'unknown' else 'busy' end as state,
            case when task_rank > care_rank then 'planner_task' else care_reason end as reason
          from ranked
        ),
        final as (
          -- carer/override only describe childcare segments, so other segments merge cleanly
          select s, start_min, state, reason,
            case when reason <> 'planner_task' then carer end as carer,
            reason <> 'planner_task' and is_override as is_override
          from decided
        ),
        grouped as (
          select *, s - row_number() over (partition by state, reason, coalesce(carer, ''), is_override order by s) as grp
          from final
        ),
        segs as (
          select min(start_min) as start_min, max(start_min) + 15 as end_min, state, reason, carer, is_override
          from grouped group by grp, state, reason, carer, is_override
        )
        select jsonb_agg(jsonb_build_object(
            'start', to_char(make_interval(mins => start_min), 'HH24:MI'),
            'end', case when end_min = 1440 then '24:00' else to_char(make_interval(mins => end_min), 'HH24:MI') end,
            'state', state,
            'reason', reason,
            'carer', carer,
            'label', case reason
              when 'planner_task' then 'Planner schedule'
              else case carer
                when 'Youn' then 'Tanji with Yeon'
                when 'Lach' then 'Tanji with Lach'
                when 'Childcare' then 'Tanji at Sage'
                when 'Shared' then 'Tanji with Yeon & Lach'
                when 'Unassigned' then 'Tanji · Unassigned'
                else 'No carer recorded' end
                || case when reason = 'outside_window' and carer is not null then ' · outside 08–20' else '' end
              end,
            'override', is_override
          ) order by start_min)
        from segs
      ), '[]'::jsonb)
    ));
  end loop;

  return jsonb_build_object(
    'status', 'ok',
    'source', 'wann-planner',
    'timezone', 'Australia/Sydney',
    'updated_at', v_updated,
    'days', v_days
  );
end;
$$;

revoke all on function public.pilot_recurrence_matches(date, text, date) from public, anon, authenticated;
revoke all on function public.pilot_availability(date, date, uuid[]) from public, anon, authenticated;
grant execute on function public.pilot_recurrence_matches(date, text, date) to service_role;
grant execute on function public.pilot_availability(date, date, uuid[]) to service_role;

-- After applying, link the Planner owner once (run by hand in the SQL editor, not committed with a real id):
--   insert into public.integration_links(source, planner_user_id) values ('pilot', '<planner owner auth.users id>')
--   on conflict (source) do update set planner_user_id = excluded.planner_user_id;
