-- Issue #11: independent Hyatt shifts, preserving childcare data and existing RLS.
alter table public.childcare_schedules
  add column if not exists work_weekly jsonb not null default '[]'::jsonb,
  add column if not exists work_overrides jsonb not null default '[]'::jsonb;
comment on column public.childcare_schedules.work_weekly is 'Hyatt weekly intervals [{day,start,end}], decimal hours';
comment on column public.childcare_schedules.work_overrides is 'Hyatt date patches [{date,start,end,off?}], applied in array order';
