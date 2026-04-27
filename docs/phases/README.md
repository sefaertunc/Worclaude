# Worclaude Implementation Phases

This directory holds **active** phase plans only. Completed phases are
moved to `docs/archive/phases/{YYYY-MM}/` per the Phase 5 archive
convention; their PRs and merge commits remain the source of truth for
what shipped.

## Currently active

| Phase | Title                  | Status                                                                                                                                                           |
| ----- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6b    | Cross-user aggregation | Deferred — depends on Phase 6a operational data and a concrete cross-user use case. Charter remains in `phase-6b-cross-user-aggregation.md`; no scheduled start. |

## Archived (2026-04)

The 2026-04 audit-prompt project shipped Phases 1, 2, 3, 4, 5, 6a, and 7. Their plans are at `docs/archive/phases/2026-04/`:

| Phase | Title                            | Plan                                                                                                         |
| ----- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1     | Drift cleanup                    | [phase-1-drift-cleanup.md](../archive/phases/2026-04/phase-1-drift-cleanup.md)                               |
| 2     | Command refinements              | [phase-2-command-refinements.md](../archive/phases/2026-04/phase-2-command-refinements.md)                   |
| 3     | Cross-cutting infrastructure     | [phase-3-cross-cutting-infrastructure.md](../archive/phases/2026-04/phase-3-cross-cutting-infrastructure.md) |
| 4     | Memory layer redesign            | [phase-4-memory-layer.md](../archive/phases/2026-04/phase-4-memory-layer.md)                                 |
| 5     | Doc architecture                 | [phase-5-doc-architecture.md](../archive/phases/2026-04/phase-5-doc-architecture.md)                         |
| 6a    | Local observability (scaffolded) | [phase-6a-local-observability.md](../archive/phases/2026-04/phase-6a-local-observability.md)                 |
| 7     | Boris's `@claude` GitHub Action  | [phase-7-boris-github-action.md](../archive/phases/2026-04/phase-7-boris-github-action.md)                   |

Phase 1 and Phase 2 retrospectives are at
`docs/archive/retrospectives/2026-04/`. The deliberation history that
produced these phases is at:

- `docs/archive/decisions/2026-04/` — per-friction decision records (#1 through #7).
- `docs/archive/audits/2026-04/` — the master architecture audit.

## Conventions used in phase files

- **T<phase>.<n>** — task identifier (e.g., `T1.5`, `T3.10`).
- **Source:** archive document and section that drove the decision.
- **Files:** which files in the codebase the task touches.
- **Acceptance:** how to verify the task is done.

## Lifecycle

1. New phase → drop a `phase-<n>-<slug>.md` plan in this directory.
2. Phase ships → move the plan file into
   `docs/archive/phases/{YYYY-MM}/` and append an entry to
   `docs/archive/INDEX.md`.
3. Deferred phases (charter only) stay here until the work starts.

## What's NOT in here

- Implementation details (what exact code to write).
- Time estimates.
- Owner assignments.

These belong in PR descriptions and individual implementation prompts,
not in the phase plan.
