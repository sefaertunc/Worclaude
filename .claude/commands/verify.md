---
description: "Run fast read-only verification — tests + lint (and optional prettier --check)"
---

Run the project's fast read-only verification suite.

When invoked with arguments, use them to scope what to verify. Example: `/verify just the auth module`

Arguments: $ARGUMENTS

## Scope (locked)

`/verify` is intentionally narrow:

1. **Run the test suite** — the project's primary test runner
2. **Run the linter** — fail on any lint error
3. **Optional: `prettier --check`** (or equivalent format check) — read-only
   format drift detection. Skip if the project does not use a format checker.

That is the entire scope. Report results clearly. Do not proceed if any check fails.

## Read-only contract

`/verify` MUST NOT modify files. No formatter auto-fix, no test fixture
regeneration, no `--fix`-style flags. If a tool would write anything to disk
during a check, find the read-only equivalent (e.g., `prettier --check` not
`prettier --write`, `eslint` not `eslint --fix`).

## What is NOT in /verify

- **Build** — slow and not a "drift check." Use `/build-fix` if the build is broken.
- **Type checking** — covered by the `strict` hook profile's PostToolUse hook
  for projects that want it on every edit. Not part of the standard /verify
  contract.
- **Domain-specific end-to-end verification** — that is the `verify-app`
  agent's job, invoked separately when needed.

This narrow scope is deliberate: /verify is the fast feedback loop.
Adding more checks slows it down and erodes the "run before every commit" habit.

## Trigger Phrases
- "verify everything"
- "run all checks"
- "is this working"
- "test and lint"
