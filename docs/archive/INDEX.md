# Archive Index

Living catalog of archived documents. Append a one-line entry per
file with title, archive date, and brief summary.

The structure: `docs/archive/{topic}/{YYYY-MM}/{slug}.md`.

## Topics

- **decisions/** — implemented or in-flight friction-decision records.
- **audits/** — point-in-time architectural snapshots.
- **backlogs/** — superseded backlog versions.
- **retrospectives/** — phase-end reviews (future).

## Catalog

### Decisions — 2026-04

- [01-versioning-enforcement.md](decisions/2026-04/01-versioning-enforcement.md)
  — `/sync` and `/commit-push-pr` enforce `Version bump:` declaration;
  `AskUserQuestion` convention adopted for closed-set prompts.
- [02-verify-scope.md](decisions/2026-04/02-verify-scope.md)
  — `/verify` locked to tests + lint, read-only; expand `tests/` for
  e2e instead of new commands.
- [03-remediation-trio.md](decisions/2026-04/03-remediation-trio.md)
  — `/review-changes`, `/refactor-clean`, `/build-fix` reformed:
  scratch-file handoff, scoped tests, escalation to `bug-fixer`.
- [04-session-lifecycle.md](decisions/2026-04/04-session-lifecycle.md)
  — `/status` retired; `/end` format split + push consent;
  `/compact-safe` real safety checks.
- [05-analysis-cluster.md](decisions/2026-04/05-analysis-cluster.md)
  — `/techdebt` and `/upstream-check` retired; `/review-plan` kept
  and sharpened; archive policy adopted.
- [06-meta-memory.md](decisions/2026-04/06-meta-memory.md)
  — `/learn` cleaned up; `/update-claude-md` sharpened; five-layer
  memory architecture; `claude-md-maintenance` skill kept; semi-auto
  `/learn` via correction trigger.
- [07-start-test-coverage.md](decisions/2026-04/07-start-test-coverage.md)
  — `/start` updates (plans folder, SHA drift, scratch surfacing);
  `/test-coverage` confirm-then-delegate.

### Audits — 2026-04

- [master-architecture-audit.md](audits/2026-04/master-architecture-audit.md)
  — Deep architectural audit across 7 layers; surfaced 10 net-new
  findings beyond the friction docs; established P0/P1/P2 priorities
  that fed the phase plan.

### Backlogs — 2026-04

_(empty; populated when `BACKLOG-v2.1.md` is migrated per Phase 1
T1.8)_

### Retrospectives

_(empty; populate at phase ends)_

## Conventions

- New entries appended in the same PR that archives content.
- Implemented decisions get an `implemented: 2026-MM` marker in
  their header (added at merge time).
- Don't delete archived content. To revoke a decision, add a new
  decision that supersedes it and link both ways.
