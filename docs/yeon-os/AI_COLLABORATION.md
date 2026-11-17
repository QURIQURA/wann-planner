# YEON OS — ChatGPT × Claude Collaboration
Status: working agreement. Updated 2026-11-15.

## Canonical documents
These files under [wann-planner/docs/yeon-os](https://github.com/QURIQURA/wann-planner/tree/main/docs/yeon-os) are the shared source for architecture guidance:
1. OS_ARCHITECTURE.md — domain ownership and boundaries.
2. INTEGRATION_CONTRACTS.md — proposed cross-app contracts and open decisions.
3. AI_COLLABORATION.md — working process.

Claude project names: PLANNER, PILOT, SHCS ORDER. These are separate Claude chat projects; GitHub repositories and Supabase projects are separate resources. A link does not automatically grant Claude repository access or import these instructions.

## Workflow
1. ChatGPT or Claude reviews relevant actual code, schema and these documents before planning.
2. Record the requested behavior, ownership, dependencies, acceptance criteria and rollback risks in a GitHub Issue in the affected repo.
3. For cross-OS work, link related Issues; choose one owner per interface and agree on the contract before coding.
4. Implement in a feature branch and submit a PR, unless the user explicitly authorizes another workflow.
5. Review regression risks, RLS/auth, schema migrations, timezone behavior, and existing drag/drop or workflow functionality.
6. Verify builds/tests, review deployment separately, and document what remains unverified.
7. Update canonical documents when an architecture decision changes; do not silently fork contradictory copies.

## Claude project instruction snippet
Read the canonical YEON OS architecture documents at https://github.com/QURIQURA/wann-planner/tree/main/docs/yeon-os before cross-OS changes. Follow the responsibility boundaries for your project. Inspect actual code and schema, preserve existing behavior, use GitHub Issues/PRs for traceability, and distinguish proposals from implemented behavior. If you cannot access the documents, ask the user to provide them; never pretend you read them.

## Safety
- Never paste tokens, passwords, service-role keys or customer records into Issues or shared documentation.
- Do not expose private repo content in public repo documentation.
- The canonical documentation repo is public; keep it architectural and non-sensitive.


## Operational handoff and status — 2026-11-17

**User's standing instruction:** A feature implementation request authorizes routine work to start and continue without repeated intermediate approval. ChatGPT creates/updates the GitHub Issue and, while Auto-Pilot is not active, provides the responsible Claude project name plus a short copyable Issue-number prompt. Claude implements/tests/PRs; ChatGPT or automated checks review. Do not equate merge, deploy and verified runtime behavior. Stop on irreversible/destructive changes or missing permissions rather than inventing success.

**System owners:** SHCS ORDER = `QURIQURA/shcs-order`; PILOT = `QURIQURA/pastry-pilot`; PLANNER = `QURIQURA/wann-planner`. SHCS and PILOT share Supabase business project but currently have different login identities. Preserve the two logins; manual-order customer/order ownership is aligned to PILOT through SHCS sync logic. Never delete or merge auth users as a shortcut.

**SHCS completed work:** WEB/MANUAL order badges and newest event-date sort PR #21; manual-order PILOT customer search/autofill PR #30; manual-order PILOT order visibility and historical archive sync PR #29; dynamic PILOT ownership and explicit customer reuse PR #31. SHCS Issue #23 closed after user confirmed customer search working; Issue #28 closed. Historical archived orders should appear in PILOT as COMPLETED without creating Planner tasks. User confirmed manual orders are visible in PILOT. End-to-end customer selection + order save was not independently verified.

**Pending PILOT work:** `QURIQURA/pastry-pilot` Draft PR #19 covers Issues #17 (Development Board), #18 (Auto-Pilot), and #20 (deploy automation). GitHub PR checks and setup-status workflow passed, but PR #19 is not merged or deployed, and Auto-Pilot has not been end-to-end verified. The setup-status log on 2026-11-17 showed `production` GitHub environment missing and `AUTOPILOT_AUTOMERGE` unset. Required owner-only step: create a `production` environment with a required reviewer in pastry-pilot repository settings; then merge PR #19 and approve high-risk deployment after reviewing the migration plan. Do not merge PR #19 ahead of that gate merely to mark the work done. The owner wants minimal manual approvals for routine tasks; retain the high-risk safety gate.

**Future Development Board:** PILOT hosts table/Kanban/graph views for SHCS/PILOT/Planner linked work. GitHub Issues and PRs remain source of truth; status distinguishes Specified, Implementing, PR Open, Merged, Deployed, Verified. Never claim verified without actual runtime evidence.

**Open follow-up:** After PR #19 is deployed, test customer-selection-to-order persistence and cross-OS visibility; then run an Auto-Pilot dry-run Issue, inspect checks/review and actual deploy, and only then roll out to SHCS ORDER and PLANNER.
