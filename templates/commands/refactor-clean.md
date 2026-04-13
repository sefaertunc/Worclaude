---
description: "Focused cleanup pass on recently changed code"
---

Run a focused cleanup pass on recently changed code. This command
runs INLINE in your current session — it reads uncommitted changes,
improves them in place, and leaves everything uncommitted for
/commit-push-pr.

When invoked with arguments, use them to scope the cleanup. Example: `/refactor-clean src/core/merger.js`

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

1. Identify changed files: `git diff --name-only` (unstaged) and
   `git diff --cached --name-only` (staged). If no changes, check
   `git diff --name-only HEAD~5` for recent commits.
2. Read each changed file fully — understand context before changing
3. Check CLAUDE.md for project-specific conventions
4. Make one improvement at a time, smallest meaningful change first
5. Run the full test suite after EVERY change
6. If tests fail, revert immediately — your change broke behavior

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
