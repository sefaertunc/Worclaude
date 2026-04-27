# Archive Index

Living catalog of archived documents. Append a one-line entry per
file with title, archive date, and brief summary.

The structure: `docs/archive/{topic}/{YYYY-MM}/{slug}.md`.

## Topics

- **decisions/** — implemented or in-flight friction-decision records.
- **audits/** — point-in-time architectural snapshots.
- **retrospectives/** — phase-end reviews.
- **phases/** — completed phase plans (active plans live in `docs/phases/`).

`docs/spec/BACKLOG.md` is a single rolling file (items removed when
scheduled into a phase). It is not archived per release.

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

### Retrospectives — 2026-04

- [phase-1.md](retrospectives/2026-04/phase-1.md)
  — Phase 1 (drift cleanup) shipped across PRs #126, #127, #128 in
  one day. Captures 5 deviations from the audit's plan, follow-ups
  surfaced during implementation, and lessons for Phase 2+ (mark
  explicit decision points in phase docs; verify external docs
  before proposing implementation; audit acceptance criteria need
  reality-check; A/B/C slicing works).
- [phase-2.md](retrospectives/2026-04/phase-2.md)
  — Phase 2 (command refinements) shipped across PRs #130/#131/#132/
  #133 over two days. 22/22 tasks plus T3.2/T3.3 pulled forward
  from Phase 3. Captures 5 deviations (notably the upstream-check
  classification-rules move and T2.20 spread across 3 PRs), the
  CI-vs-local-tests lesson from PR G, and the dogfood pattern that
  validated T2.2 across consecutive PRs.

### Phases — 2026-04

The 2026-04 audit-prompt project. Phase 6b (cross-user aggregation) is
deferred and remains active in `docs/phases/`.

- [phase-1-drift-cleanup.md](phases/2026-04/phase-1-drift-cleanup.md)
  — Tech-stack drift fixes, CLAUDE.md hygiene, BACKLOG migration,
  VitePress reference-docs sweep, agent metadata + permission policy
  housekeeping. Acceptance: `worclaude doctor` clean.
- [phase-2-command-refinements.md](phases/2026-04/phase-2-command-refinements.md)
  — 14 commands reformed, 3 retired (`/status`, `/techdebt`,
  `/upstream-check`), 1 agent retired (`e2e-runner`); VitePress
  lockstep. Acceptance: friction-decision specs honored end-to-end.
- [phase-3-cross-cutting-infrastructure.md](phases/2026-04/phase-3-cross-cutting-infrastructure.md)
  — Auto-regenerate `agent-routing`, discoverable
  `.claude/scratch/` and `.claude/plans/` folders, hook contracts in
  SPEC, `package.json` as canonical for verification commands,
  workflow-meta `installation` rationale, optional-features registry,
  drift-detection (subsumed into Phase 5 doc-lint).
- [phase-4-memory-layer.md](phases/2026-04/phase-4-memory-layer.md)
  — Five-layer memory architecture skill, `/update-claude-md`
  promotion algo reading from `.claude/learnings/`,
  `.claude/rules/` adoption deferred per BACKLOG.
- [phase-5-doc-architecture.md](phases/2026-04/phase-5-doc-architecture.md)
  — Single-source-of-truth assignments, archive structure with
  INDEX, SoT markers (`<!-- references package.json -->`), SPEC.md
  ToC, doc-lint script + CI gate, PR-template VitePress alignment.
- [phase-6a-local-observability.md](phases/2026-04/phase-6a-local-observability.md)
  — Per-project `.claude/observability/*.jsonl` capture (3 hooks +
  4 pull-based signals; the `hook-firings.jsonl` signal from the
  original 9-signal plan was dropped), `worclaude observability`
  CLI + `/observability` slash command, init/upgrade integration,
  VitePress reference page.
- [phase-7-boris-github-action.md](phases/2026-04/phase-7-boris-github-action.md)
  — Surface Claude Code's `/install-github-action` via init opt-in
  prompt + `## GitHub Action Integration (@claude pattern)`
  section in the integration guide + CLAUDE.md template note.
  Worclaude never shells out to the install command.

## Conventions

- New entries appended in the same PR that archives content.
- Implemented decisions get an `implemented: 2026-MM` marker in
  their header (added at merge time).
- Don't delete archived content. To revoke a decision, add a new
  decision that supersedes it and link both ways.
- Phase plans move from `docs/phases/` to `docs/archive/phases/{YYYY-MM}/`
  when the phase ships. Deferred phases stay in `docs/phases/`.
