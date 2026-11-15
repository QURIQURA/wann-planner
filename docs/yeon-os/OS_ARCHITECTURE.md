# YEON OS — Architecture
Status: agreed responsibilities; integration inventory audited against live DB metadata on 2026-11-15. Runtime verification pending.

## Systems
| OS | Responsibility | Repository |
| --- | --- | --- |
| SHCS | Customer-facing enquiries, ordering, order status and communication | [shcs-order](https://github.com/QURIQURA/shcs-order) (private) |
| Pilot | Business operations: orders after handoff, products, recipes, costing, inventory, pop-ups, production, work sessions, R&D | [pastry-pilot](https://github.com/QURIQURA/pastry-pilot) |
| Wann Planner | Personal/family time, childcare, availability, projects, task scheduling and priorities | [wann-planner](https://github.com/QURIQURA/wann-planner) |

## Source-of-truth rules
- SHCS owns customer-facing request capture and customer communication; Pilot owns operational fulfilment after handoff.
- Pilot owns production formulas, components, work-session task execution and actual progress.
- Planner owns childcare weekly routines, date overrides and derived personal availability; it displays business work summaries without duplicating Pilot's production workflow.
- Changes crossing an ownership boundary require an explicit integration contract; never create competing editable copies.

## Existing UI and intent
- Pilot Work Session is an existing date-partitioned daily production timeline with an unscheduled component queue, drag/drop scheduling, daily quick tasks, completion and lateness. **Do not replace it with a new session-creation wizard.**
- Pilot should render Planner-derived availability as a background layer on its existing timeline, with available/allocated/remaining capacity and non-blocking conflict warnings.
- Planner Daily Detail handles whole-day planning, childcare and availability; Pilot Daily handles production execution.
- Planner childcare labels: Tanji with Yeon / Tanji with Lach / Tanji at Sage. Weekly routine is separate from date-specific overrides.

## Repository and infrastructure facts
- GitHub: QURIQURA/wann-planner, QURIQURA/pastry-pilot, QURIQURA/shcs-order.
- WANN Supabase project: `txrxzsrjqwhvjosutotp` (Planner). SHCS Supabase project: `meswjzwxldhqkjglnmzt` (SHCS customer intake **and** Pilot operational tables). Verify client configurations and permissions before changes.
- Existing SQL implementations: SHCS accepted request creates a Pilot `orders` record; Pilot `CONFIRMED` order triggers Planner project/Delivery/link task sync; popup triggers Planner project/link task sync. These are **implemented but not end-to-end verified**. See [integration audit](INTEGRATION_CONTRACTS.md).
- Planner childcare schedule persistence is implemented; Planner-derived availability consumption by Pilot remains proposed.
- Existing README files may reflect early scaffolding and are **not** reliable proof of current runtime behavior.

## Change governance
- Preserve established flows and data. Audit actual code, database schema, RLS and authentication before changes.
- Keep user-facing application labels in English where established, and respect Australia/Sydney date semantics.
- Do not assert a deployment or test passed unless verified.
- This document distinguishes existing database integration code from unverified runtime operation; see [integration audit](INTEGRATION_CONTRACTS.md).
