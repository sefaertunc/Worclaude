# Workflow Friction Decisions — Part 3

Continuing from `workflow-friction-decisions-2.md`. This part covers the
remediation trio: `/review-changes`, `/refactor-clean`, `/build-fix`.

---

## #3 — Remediation trio: roles, handoffs, deduplication

### Context

Three commands operate on recently-changed code, with overlapping
analysis surfaces:

- `/review-changes` — diagnostic-only report
- `/refactor-clean` — inline cleanup of changed files
- `/build-fix` — inline fixes for broken builds

Audit found:

- `/build-fix` step 1 open-codes the same checks as `/verify` (build +
  test + lint + type check + formatter). One of five surfaces
  duplicating "tests + lint" work.
- `/review-changes` and `/refactor-clean` have the same "check for"
  list, so running them in sequence does the analysis twice.
- `/refactor-clean` runs the full vitest suite (~804 tests) after
  every change. Cumulative cost.
- `/build-fix`'s "3 attempts then report unresolvable" has no
  escalation path — silent loop hole.

### Decisions

**`/review-changes`** — diagnostic only.

- Reads recent diff, reports findings as a prioritized table.
- Writes `.claude/scratch/last-review.md` keyed by current commit SHA
  (so a downstream command can detect freshness).
- Read-only. Never modifies files. Never commits.

**`/refactor-clean`** — inline remediation on changed files.

- On invocation, checks `.claude/scratch/last-review.md`:
  - If present AND its recorded SHA matches current `HEAD` → uses the
    review as the work plan. No re-analysis.
  - Otherwise → does its own analysis (universal cleanup mode).
- After each change: `vitest --related <changed-files>` (scoped, fast).
- After all changes complete: full `vitest run` as the safety net.
- Delegates the canonical "tests + lint" check to `/verify` rather
  than open-coding it.
- Leaves changes uncommitted for `/commit-push-pr`.
- Clears or invalidates `last-review.md` on completion.

**`/build-fix`** — inline remediation for broken builds.

- Step 1 delegates to `/verify`. No more duplicate validation suite.
- Fixes inline, one error category at a time (build → type → test →
  lint), as before.
- After 3 failed attempts on the same category → escalates to
  `bug-fixer` agent (worktree-isolated).
- `bug-fixer`'s diagnosis becomes the last resort before the user. The
  user is no longer the third resort.

### Principles established

- **No command duplicates another's job.** `/build-fix` step 1 →
  delegates to `/verify`. `/refactor-clean` re-analysis when a fresh
  review exists → consumes it instead.

- **State passing between commands is implicit, not flag-driven.**
  `/refactor-clean` detects a fresh review automatically via SHA-keyed
  scratch file. No `--from-review` flag, no opt-in. Sequential commands
  compose naturally; standalone usage still works.

- **Standalone use cases preserved.** `/review-changes` alone (just a
  report). `/refactor-clean` alone (universal cleanup). `/review-changes`
  → `/refactor-clean` (consume the report). All three flows work without
  flags.

- **Escalation paths must be explicit.** When a remediation command
  exhausts its inline attempts, it must hand off to a worktree-isolated
  agent (`bug-fixer`) — not silently report "unresolvable" and leave
  the user to decide what's next.

- **Test-cost discipline.** Use `vitest --related` for per-change checks
  during a cleanup pass; full suite at the end as the safety net.
  Reduces N×804 tests to N×few + 1×804.

### Open question — canonical "tests + lint" path

`/verify` and the `build-validator` agent (Haiku) both do the same job.
We need one canonical path that other commands delegate to.

- `/verify` — runs in main session, slower, output is in front of the
  user immediately. Recommended.
- `build-validator` agent — Haiku, cheap, but adds tool-call indirection.

Recommendation: **`/verify`**. Cost difference is small for a check
this fast; keeping the canonical path as a slash command makes it
visible and inspectable.

Decision pending — re-confirm during implementation.

### Ephemeral vs persistent state — separation of concerns

The `/review-changes` report is ephemeral by nature (SHA-keyed,
short-lived, transactional). It must not enter the project memory
layer.

- `.claude/scratch/` → ephemeral, SHA-keyed, deleted after consumption.
- `.claude/learnings/` → distilled patterns extracted from repeated
  reports via `/learn`.

The bridge from ephemeral to persistent is human-curated (or
`/learn`-mediated): when a pattern recurs across reports, it gets
captured as a learning. Raw reports are noise; patterns are signal.

The broader memory layer architecture (built-in vs third-party) is a
separate workstream — out of scope for this audit.

### Open / deferred items

- Canonical "tests + lint" path final decision (`/verify` vs
  `build-validator` agent) — recommendation noted, confirm at
  implementation time.

- The `/simplify` skill overlaps with `/refactor-clean` (cleanup of
  changed code). Either remove, merge, or carve a clear distinct role
  (e.g. agent-driven worktree cleanup). Resolve during the dedup pass
  in part 2's deferred list.

- Implementation of the SHA-keyed scratch file mechanism. Confirm
  location (`.claude/scratch/`), naming, and cleanup rules.

**Status.** Decisions captured. Implementation pending.
