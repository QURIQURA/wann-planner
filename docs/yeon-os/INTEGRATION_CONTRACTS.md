# YEON OS — Integration Contracts
Status: proposed contracts; **not yet implemented or verified end-to-end**. Updated 2026-11-15.

## 1. SHCS → Pilot order handoff
- Trigger: a customer order reaches an agreed accepted/confirmed state (exact state and mapping to be verified).
- Source: SHCS customer request, contact and communication data.
- Destination: Pilot operational order/production planning.
- Use stable external IDs, idempotent upserts, explicit status mapping and failure/retry handling.
- Pilot production completion may feed a minimal customer-safe status back to SHCS. Never expose internal notes, recipes or private operational data.
- Before implementation: inspect actual tables, RPCs, authentication and existing synchronization.

## 2. Planner → Pilot availability (priority)
- Planner source: childcare weekly routine + date overrides, calculated for a selected date and person.
- Pilot consumer: existing Daily Work Session timeline, **read-only availability** layer.
- Suggested response shape (proposal, not current API):
```json
{"date":"2026-11-17","timezone":"Australia/Sydney","person":"Yeon","intervals":[{"start":"08:00","end":"20:00","status":"available"}],"version":"opaque"}
```
- Determine unavailable intervals from the person's childcare responsibility; treat unassigned/shared responsibility as unresolved unless a clear family policy is defined.
- Pilot combines availability with its own scheduled tasks to calculate remaining capacity and non-blocking conflicts.
- Do not create a second childcare schedule in Pilot. Editing childcare routes to Planner.
- Respect date overrides first, including partial intervals, and recalculate when the date changes.
- Cross-project authentication and family/person mapping must be designed and verified before deployment.
- No service-role keys or sensitive personal schedules in frontend bundles. Use authenticated server-to-server access, least privilege, RLS, and minimal payloads.
- Failure mode: preserve existing Pilot timeline and show an unobtrusive availability-unavailable state, not fabricated zero capacity.

## 3. Pilot ↔ Planner task summary
- Pilot owns component workflow and execution status; Planner owns personal planning context and scheduling priorities.
- Reuse existing identifiers and mappings where present. Prevent duplicate task creation on retries.
- Planner should show compact production summaries and links back to Pilot, not replicate every component or formula.
- Resolve scheduling edit authority and conflict rules before implementing bidirectional updates.

## 4. Cross-cutting requirements
- Use Australia/Sydney for local dates; explicit timezone for timestamps.
- Define event origin, external IDs, revision/version, retries and audit logging.
- Keep customer personal data and family childcare data in their respective trust boundaries.
- Test: weekly routine, date overrides, changed dates, overlapping tasks, access denial, stale/offline data, duplicate events and DST transitions.

## Open decisions
- Which identity maps a Pilot operator to a Planner person?
- Is shared childcare time considered available for either person?
- How do unassigned childcare periods affect capacity?
- Exact SHCS/Pilot order statuses, canonical IDs and existing integration paths.
