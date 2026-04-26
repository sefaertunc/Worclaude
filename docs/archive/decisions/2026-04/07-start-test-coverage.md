# Workflow Friction Decisions — Part 7

Continuing from `workflow-friction-decisions-6.md`. This part closes
the audit by addressing the two commands that weren't covered in
earlier parts: `/start` and `/test-coverage`.

---

## #7 — Closing the audit: `/start` and `/test-coverage`

### Context

`/start` was discussed at the very beginning of the audit but no
decisions were captured before the conversation moved into the
friction loop. `/test-coverage` was never audited. Both have threads
that need closing — particularly because later decisions (#3, #4,
#5, #6) created downstream changes that route back to `/start`.

### `/start` decisions

`/start` does five things today: drift detection, handoff pickup,
agent routing load, prompt-file detection, summary report. The job
shape is right. Several adjustments are needed to align with
decisions made in later parts of the audit.

**1. Inherit `/status`'s mid-session trigger phrases.**

Per #4, `/status` is retired. Its trigger phrases — "what's the
status," "where am I," "what am I working on" — should migrate to
`/start` so users don't lose discoverability when they want a
mid-session "where am I now" check. `/start` already produces the
information `/status` would have; only the entry phrases change.

**2. Read session summary and handoff as distinct artifacts.**

Per #4, the handoff format becomes forward-looking only (what's
left, decisions, where to pick up); the session summary stays
backward-looking (what got done). `/start` reads both today but
doesn't distinguish them. Updates needed:

- Read **session summary** for: drift baseline, what got done last.
- Read **handoff** for: where to resume, decisions, blockers.
- Surface them as distinct sections in the report — do not merge.

**3. SHA-based drift baseline, not date-based.**

Today: `git log --since={last-session-file-date}`. On busy days
this can show commits older than the actual last session. Better:
read the session summary's recorded HEAD SHA and use
`git log <SHA>..HEAD`. Exact baseline, no date imprecision. Small
fix, real correctness improvement.

**4. Surface pending scratch artifacts.**

Per #3 and #5, two scratch files now exist:

- `.claude/scratch/last-review.md` (from `/review-changes`)
- `.claude/scratch/last-plan-review.md` (from `/review-plan`)

`/start` should check for both, and when a SHA-matched file is
present, surface a one-liner like:

> "Pending review on this commit — run `/refactor-clean` to consume."

Cheap UX win — reminds the user that there's pending advice
waiting.

**5. Use a `.claude/plans/` folder for prompt/plan detection.**

Hardcoded patterns (`PHASE-*-PROMPT.md`, `PLAN-*.md`,
`IMPLEMENTATION-*.md`) are brittle — different teams and different
phases use different naming conventions. Replace pattern detection
with a single convention:

- All active work guidance — implementation plans, phase prompts,
  design briefs, refactor playbooks — lives in `.claude/plans/`.
- `/start` lists all files in that folder at session boot. No
  filename matching, no pattern restriction.
- `/review-plan` (per #5) picks its plan input from this same
  folder rather than filename patterns. If multiple files exist,
  ask the user which to review via `AskUserQuestion`.
- Lifecycle: **manual**. Files persist until the user moves or
  deletes them. Don't auto-archive — heuristics for "this plan is
  done" are fragile and the cost of a stale file is low.

This makes the prompt/plan convention single-source-of-truth and
keeps both commands using the same scan logic.

### `/test-coverage` decisions

`/test-coverage` mixes diagnostic (steps 1–3, 5: measure, identify,
prioritize, report) with remediation (step 4: write tests). Same
anti-pattern that retired `/techdebt` in #5 and was reformed in
`/refactor-clean` and `/build-fix` in #3.

**1. Make step 4 confirm-then-delegate.**

Replace the current "write missing tests" inline behavior with:

- Present the prioritized gap list to the user.
- Pick which gaps to close via `AskUserQuestion` (or numbered-list
  fallback if more than four candidates — same threshold the
  AskUserQuestion convention from #1 sets).
- For confirmed gaps, **delegate to the `test-writer` agent in a
  worktree**. Same escalation pattern #3 established for
  `/build-fix` → `bug-fixer`.
- Never write inline. The worktree gives review + revert safety
  before the new tests land in main.

**2. Document the relationship with the `test-writer` auto-trigger.**

The `test-writer` agent is auto-triggered after a feature is
implemented (per the agent-routing doc). `/test-coverage` invokes
the same agent manually. Add a "Relationship to test-writer agent"
section to the command spec:

- **`test-writer` auto** = fires post-feature, narrow scope on
  fresh changes, worktree-isolated.
- **`/test-coverage` manual** = broader scope, audit-style, opt-in
  before releases or for periodic health checks.

Same agent under the hood; only the trigger differs.

**3. Read project coverage thresholds from config.**

Step 2 (identify gaps) should consult `vitest.config.ts` (or
jest.config, pytest.ini, etc.) for the project's defined coverage
thresholds. Use those as the gap baseline. Falls back to the
current HIGH/MEDIUM/LOW heuristic only when no threshold config
exists.

**4. Anchor "recently changed" to last release tag, not `HEAD~10`.**

Today: `git diff --name-only HEAD~10`. Hardcoded window varies in
meaning across fast and slow branches. Better:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --name-only
```

Matches `/sync`'s release-group baseline. Stable, intentional
window — the same files in scope for the next release.

**5. Establish formal handoff with `/refactor-clean`.**

`/refactor-clean` flags low-coverage files but doesn't refactor
them (explicit rule). `/test-coverage` writes tests for those gaps.
Together they form a logical pair, but no formal handoff exists
today.

Decision: when `/refactor-clean` flags a low-coverage file, it
writes a hint to `.claude/scratch/coverage-flagged.md`, SHA-keyed.
`/test-coverage` reads it on start and prioritizes those files.

Same pattern as `/review-changes` → `/refactor-clean` from #3 and
`/review-plan` → potential downstream from #5. Consistent
scratch-file handoff convention across the work loop.

### Principles reaffirmed

- **Diagnostic vs remediation separation, applied repeatedly.**
  `/test-coverage` joins `/refactor-clean`, `/build-fix`, and
  `/techdebt` (retired) as a confirmation point that this principle
  is load-bearing across the command set.

- **Single canonical convention for downstream artifacts.** The
  `.claude/scratch/` pattern (SHA-keyed handoffs between commands)
  and the new `.claude/plans/` pattern (folder-based detection,
  pattern-free) both represent the same impulse: replace ad-hoc
  detection with single-source-of-truth conventions.

- **Folder-based discovery beats pattern-based discovery.** When
  user-authored content has no stable naming, scan a designated
  folder rather than guess at filename patterns. Reduces convention
  load on the user, makes intent explicit ("anything in this folder
  is active work").

- **Delegate to worktree-isolated agents for write operations.**
  `/test-coverage` joins `/build-fix` (→ `bug-fixer`) and
  potentially `/refactor-clean` in this pattern. Inline writes
  during a manual command create review-friction; worktree branches
  give the user a diff to inspect before merge.

### Open / deferred items

- **`.claude/plans/` initial population.** `worclaude init` could
  scaffold an empty `.claude/plans/` directory with a brief README
  explaining the convention. Decide during implementation.

- **Migration of existing PHASE-\*-PROMPT.md files.** This project
  has historical phase-prompt files in the repo root. Decide
  whether to migrate them into `.claude/plans/` as part of the
  rollout, or leave them and let the convention apply forward
  only.

- **`coverage-flagged.md` cleanup.** Like other scratch files, it
  needs a clear lifecycle — invalidate on commit, clear after
  consumption. Implement consistent with #3's `last-review.md`
  rules.

**Status.** Decisions captured. Implementation pending. **This
closes the friction audit — all 18 commands surveyed.**

---

## Audit summary

The seven decision documents (`workflow-friction-decisions.md`
through `workflow-friction-decisions-7.md`) cover all 18 commands
in `.claude/commands/`:

| Command              | Decision doc | Outcome                                               |
| -------------------- | ------------ | ----------------------------------------------------- |
| `/build-fix`         | #3           | Reformed (delegate, escalate)                         |
| `/commit-push-pr`    | #1           | Reformed (require Version bump)                       |
| `/compact-safe`      | #4           | Reformed (real safety checks)                         |
| `/conflict-resolver` | #6           | Aligned to conventions                                |
| `/end`               | #4           | Reformed (no auto-push, format split)                 |
| `/learn`             | #6           | Reformed (semi-auto, dead field removed)              |
| `/refactor-clean`    | #3           | Reformed (consume reviews, scoped tests)              |
| `/review-changes`    | #3           | Aligned (writes scratch artifact)                     |
| `/review-plan`       | #5           | Sharpened (plans folder, output persistence)          |
| `/setup`             | #6           | Leave alone (rigidity earned)                         |
| `/start`             | #7           | Reformed (plans folder, SHA drift, scratch surfacing) |
| `/status`            | #4           | **Retired**                                           |
| `/sync`              | #1           | Aligned (depends on bump enforcement)                 |
| `/techdebt`          | #5           | **Retired**                                           |
| `/test-coverage`     | #7           | Reformed (delegate, threshold-aware)                  |
| `/update-claude-md`  | #6           | Reformed (AskUserQuestion, dedup, learnings)          |
| `/upstream-check`    | #5           | **Retired**                                           |
| `/verify`            | #2           | Scope locked (tests + lint, read-only)                |

**Cross-cutting principles established across the audit:**

- Single responsibility per command.
- Diagnostic vs remediation separation.
- Catch problems at the earliest authoring step (refuse to proceed).
- `AskUserQuestion` for closed-set choices.
- No command duplicates another's job.
- State passing between commands via SHA-keyed scratch files.
- Folder-based discovery over filename patterns.
- Delegate write operations to worktree-isolated agents.
- Trigger-based memory routing (personal vs team).
- Targeted semi-auto over blanket auto.

Implementation can now proceed in coherent passes — most commands'
changes are small (10–50 line edits to specs); the larger items
(`/setup` adjustments, `/sync`'s bump-enforcement coordination,
memory architecture documentation) can be sequenced independently.
