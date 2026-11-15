-- YEON OS issue #1: Pilot → Planner order sync audit (2026-11-15)
--
-- public.sync_kora_order is SECURITY DEFINER (bypasses RLS) and upserts
-- planner_multiple_tasks / planner_tasks by caller-supplied id and user_id with
-- no ownership check. It was executable by PUBLIC, anon and authenticated.
--
-- The only legitimate caller is the SHCS DB trigger
-- public.sync_confirmed_order_to_planner(), which authenticates with the
-- Vault secret wann_os_secret_key. That same secret already succeeds against
-- public.sync_kora_popup, which is granted to service_role only, so the
-- trigger keeps working after this change.
--
-- The Planner web app does not call this RPC (only generated types reference it).
--
-- Rollback:
--   grant execute on function public.sync_kora_order(jsonb, jsonb, jsonb) to anon, authenticated;
--   grant execute on function public.sync_kora_order(jsonb, jsonb) to anon, authenticated;

revoke execute on function public.sync_kora_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant  execute on function public.sync_kora_order(jsonb, jsonb, jsonb) to service_role;

-- Legacy 2-argument overload (no order-link task). No caller found; lock it down too.
revoke execute on function public.sync_kora_order(jsonb, jsonb) from public, anon, authenticated;
grant  execute on function public.sync_kora_order(jsonb, jsonb) to service_role;
