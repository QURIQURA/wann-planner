-- Issue #11: Hyatt shifts are highest-priority busy in the existing read-only Pilot contract.
-- Requires work_weekly and work_overrides columns migration first.
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
  v_work_weekly jsonb;
  v_work_overrides jsonb;
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

  select weekly, overrides, work_weekly, work_overrides, updated_at into v_weekly, v_overrides, v_work_weekly, v_work_overrides, v_updated
    from public.childcare_schedules where user_id = v_uid;
  if v_weekly is null then
    return jsonb_build_object('status', 'unavailable', 'reason', 'no_childcare_schedule');
  end if;
  v_overrides := coalesce(v_overrides, '[]'::jsonb);
  v_work_weekly := coalesce(v_work_weekly, '[]'::jsonb);
  v_work_overrides := coalesce(v_work_overrides, '[]'::jsonb);

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
        hyatt_slots as (
          select sl.s,
            case
              when patch.value is not null then not coalesce((patch.value->>'off')::boolean,false)
              else exists (
                select 1 from jsonb_array_elements(v_work_weekly) w
                where (w->>'day')::int = extract(dow from v_day)::int
                  and (w->>'start')::numeric * 60 < sl.start_min + 15
                  and (w->>'end')::numeric * 60 > sl.start_min
              )
            end as is_hyatt,
            patch.value is not null as is_shift_override
          from slots sl
          left join lateral (
            select o.value from jsonb_array_elements(v_work_overrides) with ordinality o(value,ord)
            where o.value->>'date' = to_char(v_day,'YYYY-MM-DD')
              and (o.value->>'start')::numeric * 60 < sl.start_min + 15
              and (o.value->>'end')::numeric * 60 > sl.start_min
            order by o.ord desc limit 1
          ) patch on true
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
          select sl.s, sl.start_min, sl.carer, sl.is_override, coalesce(hs.is_hyatt,false) as is_hyatt, coalesce(hs.is_shift_override,false) as is_shift_override,
            case sl.care_state when 'available' then 0 when 'check' then 1 when 'unknown' then 2 else 3 end as care_rank,
            coalesce(ts.task_rank, -1) as task_rank,
            sl.care_reason
          from slots sl left join task_slots ts on ts.s = sl.s
          left join hyatt_slots hs on hs.s = sl.s
        ),
        decided as (
          select s, start_min, carer, is_override, is_hyatt, is_shift_override,
            case when is_hyatt then 'busy' else (case greatest(care_rank, task_rank)
              when 0 then 'available' when 1 then 'check' when 2 then 'unknown' else 'busy' end) end as state,
            case when is_hyatt then 'hyatt' when task_rank > care_rank then 'planner_task' else care_reason end as reason
          from ranked
        ),
        final as (
          -- carer/override only describe childcare segments, so other segments merge cleanly
          select s, start_min, state, reason,
            case when reason not in ('planner_task','hyatt') then carer end as carer,
            case when reason = 'hyatt' then is_shift_override else reason <> 'planner_task' and is_override end as is_override
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
              when 'hyatt' then 'Yeon · Hyatt shift'
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


revoke all on function public.pilot_availability(date,date,uuid[]) from public,anon,authenticated;
grant execute on function public.pilot_availability(date,date,uuid[]) to service_role;
