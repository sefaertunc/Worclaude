Analyze test coverage and fill gaps in the most critical areas.
Delegates to the test-writer agent for test creation.

## Process

1. **Measure current coverage**
   Run the coverage tool for the project:
   - Node.js: `npx vitest run --coverage` or `npx jest --coverage`
   - Python: `pytest --cov=src --cov-report=term-missing`
   - Go: `go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out`
   - Read CLAUDE.md for project-specific coverage commands

2. **Identify gaps**
   Focus on files with the lowest coverage that contain:
   - Business logic (core domain functions)
   - Error handling paths
   - Integration points (DB, API, filesystem)
   - Recently changed code (`git diff --name-only HEAD~10`)

3. **Prioritize by risk**
   Don't aim for 100% everywhere. Prioritize:
   - HIGH: untested error handling, auth logic, data validation
   - MEDIUM: untested business rules, state transitions
   - LOW: untested getters, formatters, simple delegation
   - SKIP: generated code, framework boilerplate, config files

4. **Write missing tests**
   For each gap:
   - Write tests that cover the untested paths
   - Follow existing test patterns in the project
   - Name tests as specifications ("should return 404 when user not found")
   - Run tests to verify they pass

5. **Report results**

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
