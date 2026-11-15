# YEON OS — GitHub Collaboration Workflow

Canonical shared architecture: [OS Architecture](docs/yeon-os/OS_ARCHITECTURE.md), [Integration Contracts](docs/yeon-os/INTEGRATION_CONTRACTS.md), [AI Collaboration](docs/yeon-os/AI_COLLABORATION.md).

## Responsibilities
- Planner Claude → `QURIQURA/wann-planner`: childcare, family, time and availability.
- Pilot Claude → `QURIQURA/pastry-pilot`: business operations, recipes, production, work sessions.
- SHCS ORDER Claude → `QURIQURA/shcs-order`: customer requests, website, communications.
- ChatGPT architecture review → shared contracts and cross-OS consistency.

## Standard change cycle
1. Read the canonical documents and current code/database before planning.
2. Create or select a GitHub Issue in the **owning repository**. Record scope, source of truth, acceptance checks, dependencies, security and affected OSes.
3. For changes spanning multiple OSes, link related issues in each affected repo; agree on interface contract **before** changing code.
4. Create a feature branch (never assume a change to `main` is automatically deployed).
5. Commit changes and open a **draft PR** referencing the Issue. Include actual tests run and results, rollback considerations and remaining risks.
6. Review source-of-truth ownership, permissions, RLS, secrets, error handling, retry/idempotency, date/timezone semantics and backward compatibility.
7. Merge only after review and explicit acceptance; deployment and runtime verification are **separate** activities.
8. Update the canonical integration audit: `Proposed` → `Implemented` only with code evidence; `Verified` only with observed end-to-end result.

## Issue body template
```md
## Goal
## Owning OS and source of truth
## Current implementation evidence
## Proposed change
## Cross-OS contract / linked issues
## Acceptance criteria
- [ ]
## Security and privacy
## Tests and rollback
```

## PR body template
```md
Closes #
## Summary
## Changed files / schema
## Cross-OS impact
## Tests actually executed (and results)
## Deployment / verification status
## Risks and rollback
```

## Important
- SHCS customer intake and Pilot operational tables share the SHCS Supabase project; WANN Planner uses a separate project.
- Existing CONFIRMED order and popup → Planner SQL sync is implemented; verify it before rewriting.
- No secrets, customer PII or family schedules in public issues, PRs or logs.
- Claude projects do not automatically communicate with each other; GitHub issues, PRs and canonical docs are the coordination channel.
