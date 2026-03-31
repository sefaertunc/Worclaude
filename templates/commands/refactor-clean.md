Run a focused cleanup pass on the codebase. Delegates to the
code-simplifier agent for structural improvements.

## What Gets Cleaned

1. **Dead code removal**
   - Unused imports and variables
   - Commented-out code blocks (git has history)
   - Unreachable branches after early returns
   - Functions defined but never called

2. **Duplication reduction**
   - Identical or near-identical code blocks → extract shared function
   - Repeated validation patterns → centralize
   - Copy-pasted error handling → extract helper

3. **Complexity reduction**
   - Functions over 30 lines → split by responsibility
   - Nesting deeper than 3 levels → early returns, guard clauses
   - Long parameter lists → group into option objects

4. **Consistency fixes**
   - Naming that doesn't match project conventions
   - Mixed patterns in the same module
   - Inconsistent error handling approaches

## Process

1. Focus on recently changed files first: `git diff --name-only HEAD~5`
2. Make one improvement at a time
3. Run tests after EVERY change — if tests fail, revert
4. Commit each improvement separately with `refactor:` prefix

## Rules
- Never change behavior — only structure and readability
- Never combine cleanup with feature work
- If a file has low test coverage, do NOT refactor it — flag it instead
- Skip stylistic preferences unless they violate CLAUDE.md conventions

## When to Use
- After completing a feature, before the PR
- Weekly maintenance pass
- When code-simplifier or review-changes flagged issues
- Before a major release
