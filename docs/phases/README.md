# Worclaude Implementation Phases

This directory holds the canonical execution plan derived from the
2026-04 architecture audit. Each file describes one phase: goal,
tasks, dependencies, and acceptance criteria.

The deliberation history that produced these phases lives under
`docs/archive/`:

- `docs/archive/decisions/2026-04/` — per-friction decision records
  (#1 through #7).
- `docs/archive/audits/2026-04/` — the master architecture audit.

Phase files are the source of truth for "what to do." Archive
documents are the source of truth for "why we decided this."

## Phase ordering

| Phase | Title                            | Depends on      | Status       |
| ----- | -------------------------------- | --------------- | ------------ |
| 1     | Drift cleanup                    | —               | Ready        |
| 2     | Command refinements              | 1 (selectively) | Ready        |
| 3     | Cross-cutting infrastructure     | 1, 2            | Ready        |
| 4     | Memory layer redesign            | 1, 3            | Ready        |
| 5     | Doc architecture                 | 4               | Ready        |
| 6a    | Local observability (scaffolded) | 3, 5            | Ready        |
| 6b    | Cross-user aggregation           | 6a              | Future cycle |
| 7     | Boris's `@claude` GitHub Action  | 5               | Ready        |

**Phases are parallelizable where dependencies allow.** Phase 1 and
parts of Phase 2 can run concurrently; Phase 6b is intentionally
deferred to a separate update cycle.

## Reading order for implementers

1. Read this README.
2. Read the relevant phase file (it links back to its archive sources).
3. Read the linked friction-decision and audit sections for context.
4. Implement.

## Conventions used in phase files

- **T<phase>.<n>** — task identifier (e.g., `T1.5`, `T3.10`).
- **Source:** archive document and section that drove the decision.
- **Files:** which files in the codebase the task touches.
- **Acceptance:** how to verify the task is done.

## What's NOT in here

- Implementation details (what exact code to write).
- Time estimates.
- Owner assignments.

These belong in PR descriptions and individual implementation prompts,
not in the phase plan.
