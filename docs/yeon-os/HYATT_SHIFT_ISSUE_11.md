# Hyatt shift integration — Issue #11 (2026-11-20)

## Ownership and invariants
- Wann Planner is the sole source for Yeon's Hyatt shifts and childcare assignments.
- Hyatt shifts are NOT a childcare carer. They are a separate schedule layer.
- PILOT consumes Planner-derived availability through its existing read-only edge function/RPC; never stores Hyatt shifts.
- SHCS is not changed.
- Existing weekly/overrides JSONB fields and childcare RLS must be preserved.

## Storage
The additive migration `20261120010000_hyatt_shift_columns.sql` adds `work_weekly` and `work_overrides` JSONB arrays to `public.childcare_schedules`.
- `work_weekly`: `[{"day":4,"start":10,"end":18}]` (Sunday=0; decimal hours).
- `work_overrides`: ordered date patches `[{"date":"2026-11-26","start":10,"end":18,"off":true},{"date":"2026-11-26","start":14.5,"end":20}]`.
- Half-hour increments, end exclusive, max 24:00. No overnight interval; split at midnight into separate days.
- No Hyatt routine is seeded into a user's account without an explicit shift entry.

## Display
- Weekly grid preserves carer colours; blue `#3070C7` thin right-edge work indicator for 30-minute halves.
- During Hyatt, only otherwise Unassigned childcare becomes Lach automatically. Sage and manual carer assignments are never overwritten.
- Daily Timeline adds an independent Hyatt row inside the existing shared frame.
- A date-only override is a replacement of the day's shifts, not an update to childcare records.

## Pilot
`20261120011000_hyatt_pilot_availability.sql` extends existing `pilot_availability` to return `busy`, `reason: hyatt`, `label: Yeon · Hyatt shift` for effective shift slots, at 15-minute resolution. Existing RPC signature and service_role-only grant remain unchanged.

## Deployment sequence / hold
1. Review PR #12, run GitHub Actions test/typecheck/build and fix all failures.
2. Verify SQL migrations against a safe environment, including service_role-only RPC privileges and RLS.
3. Apply additive column migration, then RPC migration to WANN Supabase; verify columns and representative 15-minute Hyatt intervals.
4. Merge PR only after CI and integration review; publish Planner through its actual deployment provider; verify authenticated Weekly and Daily views, date-only override/revert, auto-Lach and realtime reload.
5. Verify Pilot edge function returns Hyatt busy and UI capacity subtracts it, without counting a Pilot task twice.
6. Update Issue #11 with actual commit, test, merge, deploy, and runtime evidence.

**Current status:** branch and draft PR #12 only. No production DB migration, no confirmed CI run, no deployment. Do not mark DONE.

## 2026-11-20 · PILOT business availability follow-up
- Confirmed live WANN `pilot_availability` currently considers childcare and timed `planner_tasks`, but does not include independent Hyatt shifts. Therefore Sage/Lach care alone can overstate business capacity.
- Live `childcare_schedules` currently has only `user_id`, `weekly`, `overrides`, `updated_at`; `work_weekly` and `work_overrides` are not yet deployed.
- CI run 44640192725: 4 Hyatt unit tests passed; TypeScript failed on pre-existing `MultipleTasksPanel.tsx` `productLines` undefined; production build skipped. Branch currently contains a `useProductLines()` declaration inside `MultipleTaskEditor`; rerun CI to determine if this has resolved the reported failure.
- Required verification: Hyatt 10–18 and Sage 10–16 must result in PILOT busy 10–18 despite childcare availability; without Hyatt, Sage/Lach remains available; never subtract PILOT work twice.
- No database or deployment changes were made during this inspection. Do not merge until CI and migration checks pass.
