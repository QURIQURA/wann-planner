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
