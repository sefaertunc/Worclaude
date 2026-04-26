# Phase 2 — Command refinements

## Goal

Implement the per-command decisions captured across friction docs #1
through #7. This is the bulk of the slash-command surface change:
14 commands reformed, 3 retired, 1 agent retired. VitePress reference
docs update in lockstep.

## Tasks

### Versioning enforcement (friction #1)

**T2.1 — `/sync` enforces `Version bump:` declaration.** Reject release
PRs whose source PRs don't carry the declaration; treat missing
declarations as `none` only with explicit warning carried to CHANGELOG.
**Files:** `.claude/commands/sync.md`, `templates/commands/sync.md`.
**Source:** archive `decisions/2026-04/01-versioning-enforcement.md`.
**Acceptance:** `/sync` refuses to bump without declarations or
documents the gap permanently.

**T2.2 — `/commit-push-pr` prompts for `Version bump:`.** Required
prompt via `AskUserQuestion`, options: `major`, `minor`, `patch`,
`none` (each with one-line description). Refuse to open PR without a
choice.
**Files:** `.claude/commands/commit-push-pr.md`,
`templates/commands/commit-push-pr.md`.
**Source:** archive `decisions/2026-04/01-versioning-enforcement.md`.
**Acceptance:** PR creation impossible without `Version bump:` line.

### Verify-and-test commands (friction #2, #3)

**T2.3 — `/verify` scope locked: tests + lint only.** Read-only
contract. Optional addition: `prettier --check` (read-only format drift
detection).
**Files:** `.claude/commands/verify.md`,
`templates/commands/verify.md`.
**Source:** archive `decisions/2026-04/02-verify-scope.md`.
**Acceptance:** spec explicitly forbids modification; prettier --check
added or deferred.

**T2.4 — `/review-changes` writes scratch artifact.** After producing
its findings table, write a SHA-keyed file to
`.claude/scratch/last-review.md` (recorded HEAD SHA in frontmatter).
**Files:** `.claude/commands/review-changes.md`,
`templates/commands/review-changes.md`.
**Source:** archive `decisions/2026-04/03-remediation-trio.md`.
**Acceptance:** running `/review-changes` produces the scratch file
with current SHA.

**T2.5 — `/refactor-clean` consumes review + uses scoped tests.**
Three changes:

- On invocation, check `.claude/scratch/last-review.md`. If present
  AND its SHA matches HEAD → use the review as work plan. Otherwise
  do its own analysis.
- After each change: `vitest --related <changed-files>` (scoped, fast).
- After all changes: full `vitest run` as safety net.
- After completion: clear/invalidate `last-review.md`.

**Files:** `.claude/commands/refactor-clean.md`,
`templates/commands/refactor-clean.md`.
**Source:** archive `decisions/2026-04/03-remediation-trio.md`.
**Acceptance:** sequential `/review-changes` → `/refactor-clean` does
not re-analyze; standalone `/refactor-clean` still works.

**T2.6 — `/build-fix` delegates step 1 + escalates after 3 attempts.**
Two changes:

- Step 1 ("run validation suite") delegates to `/verify` rather than
  open-coding the same checks.
- After 3 failed fix attempts on the same error category, delegate to
  `bug-fixer` agent (worktree-isolated). User is the last resort, not
  the third.

**Files:** `.claude/commands/build-fix.md`,
`templates/commands/build-fix.md`.
**Source:** archive `decisions/2026-04/03-remediation-trio.md`.
**Acceptance:** no duplicated validation in step 1; bug-fixer fires on
3rd failure.

### Session lifecycle (friction #4)

**T2.7 — `/end` format split + push consent gate.** Two changes:

- Tighten format: handoff is forward-looking only (what's left,
  decisions, where to pick up); session summary stays
  backward-looking (what got done, observability). No content overlap.
- Replace auto-push with `AskUserQuestion`: "Push WIP commit to
  remote? yes / no."

**Files:** `.claude/commands/end.md`, `templates/commands/end.md`.
**Source:** archive `decisions/2026-04/04-session-lifecycle.md`.
**Acceptance:** `/end` produces both files with disjoint content;
asks before pushing.

**T2.8 — `/compact-safe` real safety checks.** Add pre-compaction
checks:

- Uncommitted changes warning (offer to commit/stash first).
- In-flight work signals (recent test failures, mid-implementation
  TODOs).
- Recent destructive operations warning.
- PostCompact hook verification.

The post-compaction recap stays as a final confirmation step.
**Files:** `.claude/commands/compact-safe.md`,
`templates/commands/compact-safe.md`.
**Source:** archive `decisions/2026-04/04-session-lifecycle.md`.
**Acceptance:** safety checks fire before `/compact` invocation.

**T2.9 — `/start` updates.** Five changes (covers friction #4 + #7):

- Inherit retired `/status` mid-session trigger phrases ("what's the
  status", "where am I", "what am I working on").
- Read session summary and handoff as distinct artifacts (backward vs
  forward).
- SHA-based drift baseline (read recorded HEAD from session summary,
  use `git log <SHA>..HEAD`).
- Surface pending scratch artifacts when SHA-matched
  (`last-review.md`, `last-plan-review.md`,
  `coverage-flagged.md`).
- Replace prompt-file pattern detection with `.claude/plans/` folder
  discovery (lists all files generically; no filename matching).

**Files:** `.claude/commands/start.md`, `templates/commands/start.md`.
**Source:** archive `decisions/2026-04/04-session-lifecycle.md`,
`07-start-test-coverage.md`.
**Acceptance:** all 5 changes implemented; no filename patterns left
hardcoded.

### Meta / memory commands (friction #6)

**T2.10 — `/learn` temp fixes.** Four changes (forward-compatible with
Phase 4 redesign):

- Remove `times_applied` field. Hook never increments it; field lies.
- Auto-regenerate `index.json` from directory contents on every
  capture. Never hand-maintained.
- Add when-to-save guidance to spec (mirroring global memory rules).
- Correction-triggered semi-auto: when `correction-detect.cjs` fires,
  Claude proposes a learning and prompts via `AskUserQuestion`
  ("Capture as team learning? yes / yes-edit / no").

**Files:** `.claude/commands/learn.md`, `templates/commands/learn.md`,
`templates/hooks/correction-detect.cjs` (extend),
`templates/hooks/learn-capture.cjs` (drop `times_applied` writes).
**Source:** archive `decisions/2026-04/06-meta-memory.md`.
**Acceptance:** `times_applied` removed everywhere; `index.json`
auto-regenerates; correction triggers prompt; existing pipeline
preserved.

**T2.11 — `/update-claude-md` sharpened.** Three changes:

- Apply mechanism: `AskUserQuestion` per proposed change.
- Pre-apply checks: size (block additions past doctor's WARN if not
  explicitly accepted), dedup (catch additions that restate existing
  rules).
- Read from `.claude/learnings/` to surface promotion candidates.

**Files:** `.claude/commands/update-claude-md.md`,
`templates/commands/update-claude-md.md`.
**Source:** archive `decisions/2026-04/06-meta-memory.md`.
**Acceptance:** apply step prompts; size/dedup checks fire; learnings
surface.

### Test coverage + conflict resolution (friction #6, #7)

**T2.12 — `/test-coverage` confirm-then-delegate.** Three changes:

- Step 4 (write tests): replace inline writing with confirm-then-
  delegate. Present prioritized gap list, ask via `AskUserQuestion`
  which to close (or numbered-list fallback for >4 candidates),
  delegate confirmed gaps to `test-writer` agent in a worktree.
- Read project coverage thresholds from
  `vitest.config.ts`/`jest.config`/`pytest.ini` for the gap baseline.
- Anchor "recently changed" to last release tag
  (`git log $(git describe --tags --abbrev=0)..HEAD --name-only`).

**Files:** `.claude/commands/test-coverage.md`,
`templates/commands/test-coverage.md`.
**Source:** archive `decisions/2026-04/07-start-test-coverage.md`.
**Acceptance:** no inline test writes; thresholds respected; baseline
is last release tag.

**T2.13 — `/conflict-resolver` alignments.** Two changes:

- Step 5: change "Run /verify (or the project's test and lint
  commands)" → "Run `/verify`". Drop the parenthetical (single
  canonical path per #3).
- Step 3 (truly contradictory changes): use `AskUserQuestion` for
  "keep A / keep B / combine".

**Files:** `.claude/commands/conflict-resolver.md`,
`templates/commands/conflict-resolver.md`.
**Source:** archive `decisions/2026-04/06-meta-memory.md`.
**Acceptance:** spec uses `/verify` only; `AskUserQuestion` for
contradiction prompt.

### Plan-review (friction #5)

**T2.14 — `/review-plan` sharpened.** Four changes:

- Plan-file detection from `.claude/plans/` (per T3.3); if multiple
  files, ask via `AskUserQuestion` which to review.
- Plan-existence gate: refuse to dispatch if no plan file found.
- Auto-context: pass CLAUDE.md and SPEC.md to the agent.
- Output persistence: write agent review to
  `.claude/scratch/last-plan-review.md` (SHA-keyed).

**Files:** `.claude/commands/review-plan.md`,
`templates/commands/review-plan.md`.
**Source:** archive `decisions/2026-04/05-analysis-cluster.md`.
**Acceptance:** auto-detects plans; gates on existence; agent gets
context; output persisted.

### Retirements

**T2.15 — Retire `/status`.** Delete files; update VitePress
reference; trigger phrases migrate to `/start` per T2.9.
**Files:** delete `.claude/commands/status.md`,
`templates/commands/status.md`; update
`docs/reference/slash-commands.md`,
`.claude/skills/agent-routing/SKILL.md`.
**Source:** archive `decisions/2026-04/04-session-lifecycle.md`.
**Acceptance:** no references to `/status` remain (search).

**T2.16 — Retire `/techdebt`.** Same shape: delete files, update
VitePress.
**Files:** delete `.claude/commands/techdebt.md`,
`templates/commands/techdebt.md`; update
`docs/reference/slash-commands.md`.
**Source:** archive `decisions/2026-04/05-analysis-cluster.md`.
**Acceptance:** no references remain.

**T2.17 — Retire `/upstream-check` slash command.** Delete the slash
command (both forms); **keep the `upstream-watcher` agent** for
future revival per user decision.
**Files:** delete `.claude/commands/upstream-check.md`,
`templates/commands/upstream-check.md`; update
`docs/reference/slash-commands.md`,
`docs/reference/upstream-automation.md` (deprecation note).
**Source:** archive `decisions/2026-04/05-analysis-cluster.md`; user
decision (2026-04-26) keeps the agent.
**Acceptance:** slash command gone; agent remains.

**T2.18 — Retire `e2e-runner` agent.** Delete agent file; update
catalog.
**Files:** delete `.claude/agents/e2e-runner.md`,
`templates/agents/optional/quality/e2e-runner.md`; update
`src/data/agents.js`, `src/data/agent-registry.js`,
`docs/reference/agents.md`,
`.claude/skills/agent-routing/SKILL.md`.
**Source:** master audit §5 (orphan); user decision (2026-04-26)
considers it dangerous for wide e2e testing.
**Acceptance:** agent gone from all catalogs.

**T2.19 — Keep `upstream-watcher` agent.** No-op for code; document
in agent-routing as "available for future anthropic-watch revival;
no command currently invokes it."
**Files:** `.claude/skills/agent-routing/SKILL.md`,
`templates/skills/agent-routing/...`.
**Source:** user decision (2026-04-26).
**Acceptance:** routing skill notes the agent's status.

### VitePress lockstep updates

**T2.20 — `docs/reference/slash-commands.md` updates.** Delete sections
for `/techdebt`, `/status`, `/upstream-check`. Update 9 command
descriptions per the post-friction behaviors:

- `/end` (consent-gated push)
- `/build-fix` (escalation to bug-fixer)
- `/refactor-clean` (scoped tests, scratch consumption)
- `/test-coverage` (confirm-then-delegate)
- `/conflict-resolver` (single `/verify`)
- `/compact-safe` (real safety checks)
- `/learn` (no `times_applied`)
- `/commit-push-pr` (Version bump required)
- `/update-claude-md` (AskUserQuestion gate)

**Files:** `docs/reference/slash-commands.md`.
**Source:** VitePress audit Phase 2 list.
**Acceptance:** doc reflects all post-friction behaviors.

**T2.21 — `docs/reference/learnings.md` updates.** Remove
`times_applied` references; update Stop-hook description if the
correction-trigger semi-auto adds an `AskUserQuestion` gate.
**Files:** `docs/reference/learnings.md`.
**Source:** VitePress audit Phase 2 list.
**Acceptance:** no stale `times_applied` mentions.

**T2.22 — `docs/reference/agents.md` updates.** Remove `e2e-runner`
sections (per T2.18); keep `upstream-watcher` (per T2.19); fix line
58 if not done in T1.11.
**Files:** `docs/reference/agents.md`.
**Source:** VitePress audit; T2.18, T2.19.
**Acceptance:** matches actual agent set after retirements.

## Acceptance criteria for the phase

- All 14 reformed commands behave per friction-decision specs.
- 3 retirements complete (`/status`, `/techdebt`, `/upstream-check`).
- 1 agent retirement complete (`e2e-runner`).
- 1 agent kept and documented (`upstream-watcher`).
- VitePress reference docs match the new behavior.
- Tests pass; doctor is clean.

## Dependencies

- Selectively depends on Phase 1 (some VitePress fixes overlap; do
  Phase 1's reference fixes first or land them in Phase 2's PR).
- T2.9 depends on Phase 3's `.claude/plans/` and `.claude/scratch/`
  conventions — implement those infra items first OR accept that
  T2.9 lands incomplete and gets finished alongside T3.2/T3.3.
