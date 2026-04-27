---
description: "Focused cleanup pass on recently changed code"
---

Run a focused cleanup pass on recently changed code. This command
runs INLINE in your current session — it reads uncommitted changes,
improves them in place, and leaves everything uncommitted for
/commit-push-pr.

When invoked with arguments, use them to scope the cleanup. Example: `/refactor-clean src/core/merger.js`

Arguments: $ARGUMENTS

Do NOT spawn a subagent or worktree for this. Work directly on
the files in the current working directory.

## What to Clean

1. **Dead code** — unused imports, commented-out blocks, unreachable branches,
   uncalled functions. Delete them — git has history.

2. **Duplication** — identical or near-identical code blocks → extract shared
   function. Repeated validation → centralize. Copy-pasted error handling →
   extract helper.

3. **Complexity** — functions over 30 lines → split by responsibility. Nesting
   deeper than 3 levels → early returns, guard clauses. Long parameter lists →
   group into option objects.

4. **Consistency** — naming that doesn't match project conventions. Mixed patterns
   in the same module. Inconsistent error handling.

## Process

### 0. Check for fresh `/review-changes` output

Before doing your own analysis, look for `.claude/scratch/last-review.md`:

```bash
test -f .claude/scratch/last-review.md && head -10 .claude/scratch/last-review.md
```

If the file exists AND its `sha:` frontmatter matches `git rev-parse HEAD`,
**use the review as your work plan**. Skip steps 1-3 below; jump straight
to step 4 with the review's findings as your candidate list.

If the SHA doesn't match, the review is stale — ignore it and proceed
with your own analysis.

### 1-6. Self-analysis path (only if no fresh review)

1. Identify changed files: `git diff --name-only` (unstaged) and
   `git diff --cached --name-only` (staged). If no changes, check
   `git diff --name-only HEAD~5` for recent commits.
2. Read each changed file fully — understand context before changing
3. Check CLAUDE.md for project-specific conventions
4. Make one improvement at a time, smallest meaningful change first
5. **Scoped tests after each change.** Run only the tests related to
   the files you changed (don't run the whole suite each time):
   - Vitest: `npx vitest run --related <changed-files>`
   - Jest: `npx jest --findRelatedTests <changed-files>`
   - Other runners: scope to the relevant test directory or file pattern
6. If scoped tests fail, revert immediately — your change broke behavior

### 7. Full-suite safety net

After all individual changes pass their scoped tests, run the **full
test suite once** as a regression net:

- `npx vitest run` (or `npm test`, `pytest`, etc. — whatever the project
  uses for the full suite)

If the full suite fails but scoped tests passed, the regression is
cross-cutting. Bisect the changes to find the offender, revert it.

### 8. Invalidate the review artifact

After completion, **delete `.claude/scratch/last-review.md`** (or write a
short marker indicating it was consumed). This prevents a future
`/refactor-clean` invocation from picking up an already-applied review.

```bash
rm -f .claude/scratch/last-review.md
```

## Confidence Filtering

- Only change if >80% confident it improves the code
- Skip stylistic preferences unless they violate CLAUDE.md
- Consolidate: "5 functions have duplicated validation" → one fix, not five
- Prioritize changes that reduce complexity or eliminate bugs

## Rules
- Never change behavior — if tests break, you changed behavior, revert
- Never combine cleanup with feature work in logic — only clean what exists
- If a file has low test coverage, flag it but do NOT refactor it
- Do not commit — leave changes uncommitted for /commit-push-pr

## When to Use
- After implementing a feature, before /verify and /commit-push-pr
- Weekly maintenance pass
- When /review-changes flagged issues you want to fix

## Trigger Phrases
- "clean up the code"
- "refactor this"
- "simplify"
- "tidy up"
