---
description: "Run full project verification — tests, build, lint, type checking"
---

Run full project verification:

When invoked with arguments, use them to scope what to verify. Example: `/verify just the auth module`

Arguments: $ARGUMENTS

1. Run the test suite
2. Run the build
3. Run the linter
4. Run type checking (if applicable)
5. Run any domain-specific verification

Report results clearly. Do not proceed if any check fails.

## Trigger Phrases
- "verify everything"
- "run all checks"
- "is this working"
- "test and lint"
