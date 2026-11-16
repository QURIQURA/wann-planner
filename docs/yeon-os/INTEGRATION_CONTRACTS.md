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

### B. Pilot CONFIRMED order → Planner — VERIFIED (DB state, 2026-11-15; Issue #1)
- SHCS DB `public.sync_confirmed_order_to_planner()` is attached to `public.orders` via `trg_sync_confirmed_order_to_planner` AFTER INSERT/UPDATE (enabled).
- Fires only for non-POPUP orders with status `CONFIRMED`, and on UPDATE only when status, product, recipient, pickup_at, product_line, customer or size changed.
- Calls WANN `rpc/sync_kora_order` via `net.http_post` (async, fire-and-forget) with Vault secret `wann_os_secret_key` (new-style secret key → service_role; contents not read).
- Stable IDs: project/Delivery/link task IDs are generated once and written back to `orders.wann_project_id`, `wann_delivery_task_id`, `wann_order_link_task_id`; every later sync reuses them.
- WANN `public.sync_kora_order(p_project, p_delivery_task, p_order_link_task)` upserts by id: project name/end_date/product_line updated, start `date` never changed after insert; Delivery task due date/time, stage “배달” and `is_delivery=true`; link task title/link_url.
- **Observed**: all 9 orders with stored WANN IDs (SH-008.1 … SH-014.1) have the Planner project, Delivery task and link task present, correctly parented, exactly one Delivery task per project. Latest CONFIRMED order (SH-014.1) synced ~1 s after its last order update. Sydney time conversion of due date/time matches `pickup_at`.
- **Idempotency**: retries/re-syncs are safe (upsert on stable IDs; no duplicates observed). The write-back UPDATE does not re-trigger the sync (wann_* columns are not in the change check).
- **Gaps (not fixed)**:
  - HTTP result is never checked; IDs are stored even if the call fails. A failed call heals only on the next qualifying edit while still CONFIRMED.
  - Edits after the order leaves CONFIRMED (e.g. pickup_at change in PRODUCTION) and CANCELLED do not sync; Planner keeps the old project/Delivery task.
  - Orders that skipped CONFIRMED (e.g. SH-001…007.x, SH-009.1, SH-010.3, now COMPLETED) never got Planner projects.
  - Hard-coded Planner user_id, category_id, stage id and a Lovable preview URL for `link_url`.
- **Security (fix approved 2026-11-16, applied manually via SQL editor)**: `sync_kora_order` is SECURITY DEFINER and was executable by `anon`/`authenticated`, so anyone with the public WANN anon key could write or overwrite Planner projects/tasks. Migration `supabase/migrations/20261115100000_restrict_sync_kora_order.sql` revokes this and drops the unused 2-arg overload. Post-apply privilege check and one live re-sync still to be recorded.

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

### E. Planner availability → Pilot Daily timeline — IMPLEMENTED & DEPLOYED; DATA PATH VERIFIED, UI NOT VERIFIED
- Planner is the source of truth for childcare-derived availability and decides each segment's state.
- Pilot **reuses its existing** DASHBOARD daily timeline and unscheduled queue; it shows Planner availability as a read-only background layer, a capacity line (Available / Allocated / Remaining / Check) and non-blocking conflict chips. Scheduling is never blocked or changed.
- Contract: Pilot edge function `planner-availability` (Pilot owner JWT only) → WANN `public.pilot_availability(p_from, p_to, p_exclude_task_ids)` (service_role only, SECURITY DEFINER). Returns derived segments `{start, end, state, reason, carer, label, override}` per Australia/Sydney date; no raw schedule JSON, no task titles. Failures return `{status: "unavailable", reason}` and the UI shows "Planner availability unavailable", never zero capacity.
- Identity: one Planner user mapped server-side in WANN `public.integration_links (source = 'pilot')`; no ids in the frontend.
- Policy approved by 연 2026-11-15 (final). Pilot operator is Yeon alone. Priority: (1) timed Planner task = busy, whoever the carer (no end time blocks 30 min); (2) Tanji with Yeon = busy, 24 h; (3) Shared / Unassigned = unknown, 24 h; (4) no carer recorded = unknown, 24 h; (5) Tanji with Lach / Tanji at Sage = available 08:00–20:00, check otherwise. Check applies only to confirmed Lach/Sage time. Planner tasks created by Pilot are excluded. 15-minute resolution.
- Allocated = union of Pilot production blocks and daily tasks inside available time.
- Deployed 2026-11-15: WANN migration `pilot_availability` applied and `integration_links` row set (wann-planner#4); Pilot edge function `planner-availability` v1 deployed (verify_jwt off, owner check in code); pastry-pilot#9 merged and built by GitHub Actions.
- **Verified (live, 2026-11-15):** WANN privileges (anon/authenticated cannot execute or read the mapping; service_role can; RLS on, no policies); RPC output matches the stored weekly routine for 2026-11-13..24; Pilot-created Planner tasks are excluded (2026-11-13/14 production blocks no longer counted) while other Planner schedules stay busy (incl. a no-end-time task as 30 min); edge function returns 401 without/with an invalid token and returns the expected segments with the Pilot owner's session; ranges over 14 days return `invalid_range`.
- **Not verified:** the new DASHBOARD layer/capacity line/conflict chip in the deployed UI (the deploy workflow now publishes to the `quriqura-pastry-pilot` Worker after the repo rename, while the signed-in address is the older `quriqura-kora-pilot` Worker, which still serves the previous build); a live Planner override change round-trip; Check on live data (no Lach/Sage time outside 08–20 is recorded yet).
- Tracking: QURIQURA/pastry-pilot#4.

### F. Pilot production tasks → Planner — PARTIALLY IMPLEMENTED; SCOPE UNVERIFIED
- WANN popup receiver `sync_kora_popup` can re-parent production task IDs into the popup project.
- SHCS DB popup trigger collects linked `planner_task_id` values from `work_session_formula_versions` and `work_blocks`.
- This confirms integration hooks exist, but does **not** establish full coverage or reliability of every production task lifecycle. Inspect work-session sync paths before expanding.

## Security finding — ACTION REQUIRED (no change applied)
The Supabase table listing reported **RLS disabled** on SHCS `public._ddl_probe` and `public._sync_debug_log`. These tables may be accessible to anon/authenticated clients depending on grants. Review purpose, contents, privileges and any consumers. Decide whether to remove obsolete debug tables or enable RLS with suitable policies. **Do not blindly enable RLS without understanding application dependencies.**

## Next verification checklist
1. ~~Use a safe existing order/project pair to verify Pilot CONFIRMED → Planner project, Delivery task and order-link task~~ — done 2026-11-15 (Issue #1, DB state).
2. Inspect popup synchronization network logs and Planner destination, including idempotent re-sync.
3. Inspect SHCS accepted request → Pilot `orders` linkage using non-sensitive IDs only.
4. Verify childcare schedule saves, reloads, overrides, RLS and realtime on an authenticated account.
5. Audit security of cross-project RPC/HTTP handlers, Vault secret use, identity mapping and error/retry paths.
6. Confirm app build/tests and production deployment separately.

## Proposed future contracts
- Read-only authenticated Planner availability for Pilot with Australia/Sydney date semantics and interval provenance.
- Explicit ownership of status transitions, stable IDs, idempotency, retries, observability and minimal data transfer.
- No duplicate editable childcare data in Pilot and no duplicate production workflow in Planner.
