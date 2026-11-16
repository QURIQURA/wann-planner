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

### A. SHCS order request → Pilot order — IMPLEMENTED; PERSISTED STATE VERIFIED, NEW ACCEPT NOT RE-RUN
- Path: SHCS admin `src/routes/admin.requests.$id.tsx` → edge function `shco-stripe` (action `accept`; deployed v8 matches `shcs-order` `main`) → SHCS DB `public.accept_order_request(p_request_id uuid)` (SECURITY DEFINER).
- `accept_order_request`: `shco_is_admin()` check, row lock (`FOR UPDATE`), rejects non-`PENDING` requests (no duplicate order per request); `shco_link_customer` matches by email, then AU phone (`shco_phone_key`), else creates (never by name); inserts `public.orders` with `product_line='weekly_cake'`, `status='INTAKE'`, `payment_status='Unpaid'`, `occasion='Other'` + customer text, `delivery_address`, `recipient_relationship` (enum match only), `audience` (`shco_audience_label`), `dietary_requirements` (`shco_dietary_text`), `notes` (`shco_order_note`); links `order_dietary_tags`; marks request `ACCEPTED` with `order_id`, `customer_id`.
- Order number: `orders_set_order_number` → `set_order_number` + `shco_week_number` → `SH-WWW.n` (Mon–Sun, week 1 starts 2026-08-24, Australia/Sydney, suffix from `.1`).
- Calendar: request `ACCEPTED` → `trg_shco_notify_order_request` → `shco-notify` (`accepted`) creates the SHCS Google Calendar event and stores `google_calendar_event_id`. The older `sync_order_to_google_calendar` skips web orders.
- Status: `INTAKE` on insert does not fire Planner sync. `CONFIRMED` is a separate step (Pilot manual, `mark_order_request_paid`, or Stripe `markPaid`). `shco_settings.stripe_enabled = false` as of 2026-11-15, so Accept does not charge.
- The business operational record is already in the same SHCS Supabase project; **do not build a second cross-database handoff without evidence it is needed**.
- **Verified (read-only, 2026-11-15):** all 3 linked requests (REQ-0001, REQ-0002, REQ-0004) have exactly one order each, created in the accept transaction, with matching week number, note, customer link, pickup time and a calendar event; no unlinked `Web request` orders. The initial `INTAKE` value is confirmed by code only (no status history table).
- **Open risks (no change applied; tracked in shcs-order#1):** with Stripe enabled, `shco-stripe accept` charges before the RPC, so an RPC failure leaves a paid request in `PENDING` and a retry or concurrent click can charge twice (no idempotency key); `markPaid` writes Pilot `orders.status` with service role (ownership of this transition should be explicit); unmatched `recipient_relationship` becomes NULL silently; `shco_week_number` maps 1–6 days before 2026-08-24 to week 1 (integer truncation); with dietary tags present, excluded-ingredient text is kept only as tags.

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
1. Use a safe existing order/project pair to verify Pilot CONFIRMED → Planner project, Delivery task and order-link task; do not create a production customer order solely for testing.
2. Inspect popup synchronization network logs and Planner destination, including idempotent re-sync.
3. ~~Inspect SHCS accepted request → Pilot `orders` linkage using non-sensitive IDs only.~~ Done 2026-11-15 (see A). Remaining: observe one new Accept end to end, and resolve the Stripe accept risks before enabling payments.
4. Verify childcare schedule saves, reloads, overrides, RLS and realtime on an authenticated account.
5. Audit security of cross-project RPC/HTTP handlers, Vault secret use, identity mapping and error/retry paths.
6. Confirm app build/tests and production deployment separately.

## Proposed future contracts
- Read-only authenticated Planner availability for Pilot with Australia/Sydney date semantics and interval provenance.
- Explicit ownership of status transitions, stable IDs, idempotency, retries, observability and minimal data transfer.
- No duplicate editable childcare data in Pilot and no duplicate production workflow in Planner.
