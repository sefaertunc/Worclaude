---
description: "Domain-specific verification beyond tests, closing the feedback loop for web, API, CLI, data"
---

# Verification

## Beyond Unit Tests

Unit tests verify code logic. Verification confirms the feature actually works in
its real environment. Both are necessary. Neither alone is sufficient.

The /verify command runs automated checks, but domain-specific verification often
requires manual steps or specialized tooling.

## Closing the Feedback Loop

Every change needs a feedback loop: make a change, verify it worked, then move on.
The loop must be closed BEFORE committing.

Bad workflow: change code -> commit -> move to next task -> discover it's broken
Good workflow: change code -> verify -> commit -> move to next task

## Web Application Verification

After changing UI or API behavior:

1. Start the dev server
2. Navigate to the affected page/endpoint
3. Test the happy path manually
4. Test at least one error path
5. Check browser console for errors/warnings
6. Verify responsive behavior if UI changed

For API changes:
```bash
# Test the endpoint directly
curl -X POST http://localhost:3000/api/resource \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'

# Check response status and body
```

## API Verification

Test beyond the happy path:
- Valid request with all fields
- Valid request with minimum fields
- Invalid request (missing required field)
- Invalid request (wrong types)
- Authentication failures
- Rate limiting behavior
- Concurrent request handling (if relevant)

Use curl, httpie, or the project's API test suite. Automate what you can, but
do at least one manual check of the actual running server.

## CLI Verification

After changing CLI behavior:

1. Run the command with typical arguments
2. Run with edge case arguments (empty, very long, special characters)
3. Run with invalid arguments (verify error messages are helpful)
4. Test piping and redirection if applicable
5. Verify exit codes

```bash
# Test normal usage
my-cli init --name "test project"

# Test error handling
my-cli init  # missing required flag

# Test edge cases
my-cli init --name ""  # empty string
```

## Data Pipeline Verification

After changing data transformations:

1. Run with sample input data
2. Verify output schema matches expectations
3. Check row counts (input vs output)
4. Spot-check specific records for correctness
5. Test with empty input
6. Test with malformed input

## Build Verification

The full verification suite (triggered by /verify):

1. `npm test` / `pytest` / `cargo test` — unit and integration tests
2. `npm run build` / equivalent — compilation and bundling
3. `npm run lint` / equivalent — style and static analysis
4. Type checking if applicable (`tsc --noEmit`, `mypy`, etc.)
5. Domain-specific checks from above

All five must pass. If any fails, stop and fix before continuing.

## When Verification Reveals Problems

If verification fails:
1. Don't panic. Read the error carefully.
2. Check if it's a pre-existing issue or something you introduced.
3. If you introduced it, fix it before committing.
4. If it's pre-existing, document it and decide whether to fix now or file it.

## Gotchas

- "Tests pass" is not the same as "it works." A test suite can have 100% coverage
  and still miss real-world failures. Always do at least one real verification.
- Don't skip verification because "it's a small change." Small changes cause
  production outages too.
- Browser console errors are free bug reports. Check them.
- If verification is painful, invest in making it easier. A script that starts
  the server, runs checks, and reports results saves cumulative hours.
- Flaky tests must be fixed or quarantined. A test suite that sometimes fails
  trains people to ignore failures.
