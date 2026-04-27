---
description: "Analyze test coverage and fill gaps in recently changed code"
---

Analyze test coverage and fill gaps in the most critical areas.
Delegates to the test-writer agent for test creation.

## Process

1. **Read project coverage thresholds**

   Before measuring, read the project's configured threshold so the gap
   baseline is the project's standard, not a guess. Check in this order
   and use the first one that exists:

   - Vitest: `vitest.config.ts` / `vitest.config.js` (`test.coverage.thresholds`)
   - Jest: `jest.config.{ts,js,cjs}` or `package.json` `jest.coverageThreshold`
   - Pytest: `pytest.ini` / `pyproject.toml` (`[tool.coverage.report] fail_under`)
   - Go: a `// coverage:` directive in `Makefile` or CI config
   - Fallback: 80% line coverage if no threshold is configured

   Report the threshold up front so the gap analysis has a clear bar.

2. **Measure current coverage**

   Run the coverage tool for the project:
   - Node.js: `npx vitest run --coverage` or `npx jest --coverage`
   - Python: `pytest --cov=src --cov-report=term-missing`
   - Go: `go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out`
   - Read CLAUDE.md for project-specific coverage commands

3. **Identify gaps, anchored to the last release**

   Focus on files with coverage **below the configured threshold** that
   contain:

   - Business logic (core domain functions)
   - Error handling paths
   - Integration points (DB, API, filesystem)
   - **Recently changed code, anchored to the last release tag** (not an
     arbitrary `HEAD~10`). Run the helper as a single command — do not
     unpack the script body:

     ```bash
     bash .claude/scripts/test-coverage-changed-files.sh
     ```

     The helper prints one filename per line — files changed since the
     last release tag, or the last 10 commits when no tag exists. This
     makes "recently changed" mean "since the last release," not "since
     some arbitrary cutoff," so coverage gaps reflect what actually ships
     next.

4. **Prioritize by risk**

   Don't aim for 100% everywhere. Prioritize:
   - HIGH: untested error handling, auth logic, data validation
   - MEDIUM: untested business rules, state transitions
   - LOW: untested getters, formatters, simple delegation
   - SKIP: generated code, framework boilerplate, config files

5. **Confirm-then-delegate (do NOT write tests inline)**

   Present the prioritized gap list to the user as a table:

   ```
   | # | File                  | Coverage | Risk | Suggested tests                          |
   |---|-----------------------|----------|------|------------------------------------------|
   | 1 | src/core/merger.js    | 62%      | HIGH | conflict-resolution edge cases (3 tests) |
   | 2 | src/utils/hash.js     | 45%      | HIGH | empty input + non-UTF8 encoding (2 tests)|
   | 3 | src/commands/init.js  | 78%      | MED  | scenario-C edge case (1 test)            |
   ...
   ```

   Then ask the user which to close. Use **`AskUserQuestion`** when the
   list has 2-4 candidates (its native option limit). For >4 candidates,
   present a **numbered list** and ask the user to reply with the numbers
   they want closed (e.g., "1, 3, 4").

   ```
   AskUserQuestion: "Which gaps should I close?"
   - <up to 4 file/test descriptions, one per option>
   ```

   **Delegate confirmed gaps to the `test-writer` agent in a worktree.**
   Do NOT write tests inline:

   ```
   Agent({
     subagent_type: "test-writer",
     description: "Close coverage gaps in <files>",
     prompt: "Coverage gaps to close:\n<confirmed list>\n
              Project threshold: <threshold>%.
              Follow existing test patterns. Name tests as specifications.
              Verify each new test passes; report any that don't and why."
   })
   ```

   The worktree isolation keeps the main session clean if test-writer's
   exploration touches many files.

6. **Report results**

   After the agent returns:

   | File | Before | After | Tests Added | Notes |
   |------|--------|-------|-------------|-------|
   | src/core/merger.js | 62% | 88% | 7 | Added conflict edge cases |
   | src/utils/hash.js | 45% | 91% | 4 | Added empty input + encoding |
   | src/commands/init.js | 78% | 78% | 0 | Already well-covered |

## Rules
- Test behavior, not implementation
- Don't write tests for trivial code just to boost numbers
- Each test must be independent — no shared mutable state
- If you find a bug while writing tests, write the failing test
  and report the bug — do not fix it in this pass

## When to Use
- Before a release to check coverage health
- After implementing a large feature
- When coverage drops below project threshold (check CLAUDE.md)
- During periodic maintenance

## Trigger Phrases
- "check test coverage"
- "what needs tests"
- "coverage gaps"
