# YEON OS — Integration Contracts & Implementation Audit
Updated 2026-11-15. Evidence: live Supabase schema/function metadata and GitHub source on default branches. **No end-to-end writes, deployment, or user-facing smoke tests performed.**

## Status definitions
- **Implemented**: corresponding code, SQL function or enabled trigger exists; runtime success not implied.
- **Verified**: a representative end-to-end operation has been observed and checked, including expected destination state.
- **Proposed**: intended architecture with no confirmed implementation.
- **Unverified**: evidence is insufficient to classify runtime behavior.

## Confirmed infrastructure
- WANN Supabase: `txrxzsrjqwhvjosutotp` (family/planner).
- SHCS Supabase: `meswjzwxldhqkjglnmzt` (SHCS customer site **and** Pilot business operations).
- Repositories: `QURIQURA/wann-planner`, `QURIQURA/pastry-pilot`, `QURIQURA/shcs-order`.
- GitHub code search returned no indexed results; direct source files and database functions/triggers were inspected instead.

## Integration inventory

### A. SHCS order request → Pilot order — IMPLEMENTED, NOT END-TO-END VERIFIED
- SHCS DB `public.accept_order_request(p_request_id uuid)` checks admin permissions, creates/links a customer, inserts into shared `public.orders`, and marks `shco_order_requests` as ACCEPTED with `order_id`.
- The business operational record is already in the same SHCS Supabase project; **do not build a second cross-database handoff without evidence it is needed**.
- `shco_order_requests` and `orders` tables both exist. Current observed table row counts are nonzero; this does not prove a particular handoff succeeded.
- The accepted request initially inserts a Pilot order with `INTAKE` status. This is distinct from a later Pilot `CONFIRMED` state.

### B. Pilot CONFIRMED order → Planner — IMPLEMENTED, NOT END-TO-END VERIFIED
- SHCS DB `public.sync_confirmed_order_to_planner()` is attached to `public.orders` via `trg_sync_confirmed_order_to_planner` AFTER INSERT/UPDATE.
- Trigger only proceeds for relevant orders with status `CONFIRMED`; excludes POPUP orders.
- WANN DB `public.sync_kora_order(...)` supports project creation/update, Delivery task and an optional order-link task; uses stable IDs and upsert semantics.
- The SHCS trigger code references a Vault secret named `wann_os_secret_key`; secret contents were **not** read.
- Existing project/task linking should be preserved. Do not describe this integration as merely proposed.
- Runtime delivery, network responses and identity permissions require explicit verification.

### C. Pilot popup → Planner — IMPLEMENTED, NOT END-TO-END VERIFIED
- SHCS DB `public.sync_popup_order_to_planner()` is attached to `orders` via BEFORE INSERT/UPDATE trigger `b_sync_popup_order_to_planner`.
- Function handles POPUP orders, confirmed/production stages and existing linked projects, using `wann_project_id` and `wann_order_link_task_id`; uses `net.http_post`.
- WANN DB `public.sync_kora_popup(...)` upserts Planner project and link task and re-associates existing production tasks.
- Current trigger has an explicit single-user ownership condition. Do not assume family-wide multi-user support.
- Existing implementation should be audited for delivery success and retries before changes.

### D. Planner childcare schedule persistence — IMPLEMENTED, NOT END-TO-END VERIFIED
- WANN `public.childcare_schedules` exists with RLS enabled and a nonzero row count.
- Planner `src/lib/use-childcare-sync.ts` reads/writes weekly and override schedules, subscribes to realtime changes, and uses localStorage fallback/migration.
- Planner `src/routes/_authenticated/daily.tsx` renders the childcare timeline with date-specific overrides and weekly routine edits.
- Current underlying carer enum uses `Youn` and `Childcare`; display labels use `Yeon` and `Sage`. Keep canonical/storage mappings explicit.
- Runtime realtime delivery, multi-device conflict handling and RLS behavior remain unverified.

### E. Planner availability → Pilot Daily timeline — IN REVIEW (draft PRs, not applied or deployed)
- Planner is the source of truth for childcare-derived availability and decides each segment's state.
- Pilot **reuses its existing** DASHBOARD daily timeline and unscheduled queue; it shows Planner availability as a read-only background layer, a capacity line (Available / Allocated / Remaining / Check) and non-blocking conflict chips. Scheduling is never blocked or changed.
- Contract: Pilot edge function `planner-availability` (Pilot owner JWT only) → WANN `public.pilot_availability(p_from, p_to, p_exclude_task_ids)` (service_role only, SECURITY DEFINER). Returns derived segments `{start, end, state, reason, carer, label, override}` per Australia/Sydney date; no raw schedule JSON, no task titles. Failures return `{status: "unavailable", reason}` and the UI shows "Planner availability unavailable", never zero capacity.
- Identity: one Planner user mapped server-side in WANN `public.integration_links (source = 'pilot')`; no ids in the frontend.
- Policy approved by 연 2026-11-15: Pilot operator is Yeon alone. Tanji with Lach / Tanji at Sage = available; Tanji with Yeon = busy; Shared (carer not decided) and Unassigned = unknown, not counted; before 08:00 / from 20:00 = check (possible, must be confirmed); timed Planner task = busy, task without end time = check for 30 min; Planner tasks created by Pilot are excluded. Precedence busy > unknown > check > available, 15-minute resolution.
- Allocated = union of Pilot production blocks and daily tasks inside available time.
- Not yet verified end to end: migration not applied, edge function not deployed. Tracking: QURIQURA/pastry-pilot#4.

### F. Pilot production tasks → Planner — PARTIALLY IMPLEMENTED; SCOPE UNVERIFIED
- WANN popup receiver `sync_kora_popup` can re-parent production task IDs into the popup project.
- SHCS DB popup trigger collects linked `planner_task_id` values from `work_session_formula_versions` and `work_blocks`.
- This confirms integration hooks exist, but does **not** establish full coverage or reliability of every production task lifecycle. Inspect work-session sync paths before expanding.

## Security finding — ACTION REQUIRED (no change applied)
The Supabase table listing reported **RLS disabled** on SHCS `public._ddl_probe` and `public._sync_debug_log`. These tables may be accessible to anon/authenticated clients depending on grants. Review purpose, contents, privileges and any consumers. Decide whether to remove obsolete debug tables or enable RLS with suitable policies. **Do not blindly enable RLS without understanding application dependencies.**

## Next verification checklist
1. Use a safe existing order/project pair to verify Pilot CONFIRMED → Planner project, Delivery task and order-link task; do not create a production customer order solely for testing.
2. Inspect popup synchronization network logs and Planner destination, including idempotent re-sync.
3. Inspect SHCS accepted request → Pilot `orders` linkage using non-sensitive IDs only.
4. Verify childcare schedule saves, reloads, overrides, RLS and realtime on an authenticated account.
5. Audit security of cross-project RPC/HTTP handlers, Vault secret use, identity mapping and error/retry paths.
6. Confirm app build/tests and production deployment separately.

## Proposed future contracts
- Read-only authenticated Planner availability for Pilot with Australia/Sydney date semantics and interval provenance.
- Explicit ownership of status transitions, stable IDs, idempotency, retries, observability and minimal data transfer.
- No duplicate editable childcare data in Pilot and no duplicate production workflow in Planner.
