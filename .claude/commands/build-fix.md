---
description: "Fix current build failures via build-fixer agent"
---

Fix the current build failures. Delegates to the build-fixer agent
for diagnosis and resolution.

## Process

1. **Run /verify** to capture test + lint failures (delegate; do not
   open-code the same checks). Then run the project's **build command**
   and **type checker** separately to capture compilation errors —
   these are intentionally outside /verify's read-only-fast contract,
   so /build-fix discovers them as part of the fix loop.

2. Read the error output carefully. Categorize:
   - Build/compilation errors → fix first (nothing else works)
   - Type errors → fix second (often cascade into test failures)
   - Test failures → fix third (read test intent before changing)
   - Lint/format → fix last (auto-fix what you can)

3. Fix one category at a time. Re-run /verify (and the build/type
   commands as relevant) after each fix.

4. After all fixes, run /verify one more time plus the build to
   confirm everything passes.

## Escalation: 3-attempt rule

If you make **3 unsuccessful fix attempts on the same error category**,
delegate that category to the `bug-fixer` agent (worktree-isolated).

```
Agent({
  subagent_type: "bug-fixer",
  description: "Diagnose stuck <category> errors",
  prompt: "build-fix has failed 3 times on <category>: <error summary>.
           Investigate root cause, propose fix, write regression test."
})
```

The user is the **last resort, not the third**. Hand off to bug-fixer
before asking the human — it has the worktree isolation to safely
explore root causes, can run scoped tests, and frees the main session
to keep moving on other fixable errors.

## Rules
- Never silence a test by deleting it or adding .skip
- Never weaken lint rules to make errors disappear — fix the code
- If a test is genuinely wrong (tests old behavior that was
  intentionally changed), update it with a clear commit message
- After 3 failed attempts on the same error category, delegate to
  `bug-fixer` (see Escalation above). Do not loop forever.

## When to Use
- Build is broken after a merge or rebase
- Tests failing after dependency update
- CI is red and you need to fix locally before pushing
- After a large refactor that introduced errors

## Trigger Phrases
- "fix the build"
- "build is broken"
- "tests are failing"
