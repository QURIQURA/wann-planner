-- Issue #1: restrict the Pilot -> Planner order receiver to the service role.
--
-- Findings (2026-11-15, read-only audit):
--   * public.sync_kora_order is SECURITY DEFINER and was executable by anon and
--     authenticated. The WANN anon key ships in the Planner web bundle, so any
--     client could upsert planner_multiple_tasks / planner_tasks for any user_id
--     or overwrite an existing task by id (title, due date, link_url).
--   * The only legitimate caller is the SHCS DB trigger
--     sync_confirmed_order_to_planner(), which authenticates with a new-style
--     secret key (service_role). The Planner frontend never calls this RPC.
--   * sync_kora_popup is already service_role-only; this aligns the order receiver.
--   * The legacy 2-arg overload sync_kora_order(jsonb, jsonb) is unused (the
--     trigger always sends 3 named args) and makes 2-arg PostgREST calls ambiguous.
--
-- Approved by the owner 2026-11-16. Applied manually in the WANN SQL editor.
-- Rollback: grant execute on function public.sync_kora_order(jsonb, jsonb, jsonb)
--           to anon, authenticated;  (and re-create the 2-arg overload if needed)

revoke execute on function public.sync_kora_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant  execute on function public.sync_kora_order(jsonb, jsonb, jsonb) to service_role;

drop function if exists public.sync_kora_order(jsonb, jsonb);

-- Verification (expect exec_roles = {service_role} and a single signature):
-- select p.oid::regprocedure,
--        array(select r.rolname from pg_roles r
--              where has_function_privilege(r.oid, p.oid, 'execute')
--                and r.rolname in ('anon','authenticated','service_role'))
-- from pg_proc p where proname = 'sync_kora_order';
