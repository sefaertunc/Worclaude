---
description: "Fix current build failures via build-fixer agent"
---

Fix the current build failures. Delegates to the build-fixer agent
for diagnosis and resolution.

## Process

1. Run the full validation suite first to capture all errors:
   - Build command
   - Test suite
   - Linter
   - Type checker (if applicable)
   - Formatter check

2. Read the error output carefully. Categorize:
   - Build/compilation errors → fix first (nothing else works)
   - Type errors → fix second (often cascade into test failures)
   - Test failures → fix third (read test intent before changing)
   - Lint/format → fix last (auto-fix what you can)

3. Fix one category at a time. Re-run checks after each fix.

4. After all fixes, run the FULL suite one more time to confirm
   everything passes.

## Rules
- Never silence a test by deleting it or adding .skip
- Never weaken lint rules to make errors disappear — fix the code
- If a test is genuinely wrong (tests old behavior that was
  intentionally changed), update it with a clear commit message
- If you cannot fix an error after 3 attempts, report it as
  unresolvable with your diagnosis

## When to Use
- Build is broken after a merge or rebase
- Tests failing after dependency update
- CI is red and you need to fix locally before pushing
- After a large refactor that introduced errors

## Trigger Phrases
- "fix the build"
- "build is broken"
- "tests are failing"
