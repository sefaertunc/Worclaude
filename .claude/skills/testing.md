---
description: "Test philosophy, coverage strategy, test-first patterns, what to test and what not to"
---

# Testing

## What to Test

Test behavior, not implementation. A test should verify what a function does, not
how it does it. If you refactor the internals and the test breaks, the test was
testing the wrong thing.

Good test: "given a valid email, returns true"
Bad test: "calls regex.match with pattern /^[a-z].../"

## Meaningful Coverage vs Line Coverage

100% line coverage is a vanity metric. You can have 100% coverage and still ship bugs
if your tests don't exercise meaningful paths.

Focus coverage on:
- Business logic (the rules that make your app unique)
- Error handling paths (what happens when things go wrong)
- Boundary conditions (empty, null, max values, off-by-one)
- Integration points (where your code meets external systems)

Skip coverage on:
- Simple getters/setters
- Framework boilerplate
- Generated code
- Pure delegation (functions that just call another function)

## Edge Cases Worth Testing

Every function has these potential edge cases. Consider which apply:

- Null / undefined / empty string
- Empty array / empty object
- Single element
- Very large input
- Negative numbers / zero
- Unicode and special characters
- Concurrent access
- Network timeout / failure

You don't need to test ALL of these for every function. Think about which ones
are realistic for your specific case.

## Test-First Workflow

Writing tests first helps when:
- The behavior is well-defined but the implementation isn't clear
- You're fixing a bug (write the failing test first, then fix)
- You're implementing a spec (tests become the spec's executable form)

Test-first hurts when:
- You're exploring and don't know what the API should look like
- You're prototyping and will throw the code away
- The test would be trivial (testing that a constant equals itself)

When doing test-first: write the test, watch it fail, implement the minimum to pass,
then refactor. Don't write all the tests up front — go one at a time.

## Test Structure

Follow Arrange-Act-Assert (AAA):

```
// Arrange: set up the test conditions
const input = createValidInput();

// Act: call the thing being tested
const result = processInput(input);

// Assert: verify the outcome
expect(result.status).toBe('success');
```

Keep tests independent. No test should depend on another test running first.
No shared mutable state between tests.

## Naming Tests

Test names should read like specifications:
- "should return 401 when token is expired"
- "should merge arrays without duplicates"
- "should create backup directory if it doesn't exist"

Not:
- "test1"
- "it works"
- "handles edge case"

## Testing Anti-Patterns

- **Snapshot abuse**: snapshots test that output didn't change, not that it's correct.
  Use sparingly and review snapshot diffs carefully.
- **Mock everything**: if your test mocks 5 dependencies, you're testing the mocking
  framework, not your code. Prefer integration tests for heavily-connected code.
- **Test the framework**: don't test that Express routes requests or that React renders
  components. Trust the framework; test YOUR logic.
- **Brittle assertions**: asserting on exact error messages or full object shapes when
  only one field matters. Assert on what matters.
- **Slow tests without reason**: if a test takes seconds, it's probably doing I/O
  that should be mocked or it's an integration test that should be tagged separately.

## Gotchas

- Flaky tests are worse than no tests. They erode trust in the entire suite.
  Fix immediately or quarantine with a clear TODO.
- Test data should be self-contained. Don't rely on database state, external
  services, or file system artifacts from other tests.
- When a test fails, the test might be wrong. Don't assume the code is broken —
  read the test carefully first.
- Delete tests that test deleted features. Orphan tests confuse and mislead.
- Async tests need proper awaiting. An unawaited assertion silently passes.
