# Workflow Friction Decisions — Part 2

Continuing from `workflow-friction-decisions.md`. This part covers the
`/verify` audit and the e2e testing question.

---

## #2 — `/verify` scope, read-only contract, and e2e coverage

### Context

The `/verify` command was ambiguous by reputation: the agent-routing doc
describes it as "full end-to-end verification, runs the app, tests all
major flows," but the command spec only lists tests + build + lint +
type check. Meanwhile five separate surfaces do the "tests + lint" job
(`npm test`+`npm run lint`, `prepublishOnly`, `/verify`, `/build-fix`
step 1, `build-validator` agent), and nothing actually runs the product
end-to-end.

### Decisions

1. **`/verify` scope is fixed: tests + lint only.** Designed to check
   current changes. Stays narrow.

2. **`/verify` is read-only.** Diagnostic, not remediation. Runs:
   - `npm test` (read-only)
   - `npm run lint` — plain `eslint` without `--fix`
   - Build / type check (both read-only in this project; no-op today)
   - Never `prettier --write`, `eslint --fix`, or any auto-fix.

3. **Consider adding `prettier --check` to `/verify`.** Read-only format
   drift detection. Fits the diagnostic contract. Currently /verify
   misses format drift entirely. Open decision — revisit when
   implementing.

4. **`/commit-push-pr` does not verify.** Keeping them decoupled
   protects `/verify`'s purpose. If commit-push-pr verified, `/verify`
   would be redundant and users could not commit deliberately-broken
   intermediate states.

5. **No new e2e slash command.** The better investment is expanding
   `tests/` with real e2e coverage for user journeys currently
   uncovered: `upgrade`, `doctor`, `status`, `backup`/`restore`, `diff`,
   `delete`. Real-binary invocation against tmp filesystems, kept
   logically clean (not noisy). Runs automatically under `npm test` —
   so `/verify` and every CI run pick it up without changing `/verify`'s
   contract. Better ROI than a separate command:
   - Automatic, not opt-in
   - No new command surface to maintain
   - Scales by adding test files, not command logic
   - Existing scenarios A/B/C (init-only) become the template; extend
     to the other commands

### Principles established

- **Single responsibility per command.** `/verify` verifies,
  `/commit-push-pr` commits+pushes+PRs, `/build-fix` fixes. No overlap.

- **Diagnostic vs remediation separation.** Read-only vs modifying —
  these are distinct command classes and must never mix.

- **Terminology discipline.** Scenarios = starting conditions
  (preconditions — e.g. fresh project, existing project, re-init).
  E2E = testing product functionality through a user journey
  (e.g. `worclaude upgrade` from v(N) to v(N+1) against a real
  filesystem). Don't conflate — they're different concepts.

- **Automatic > opt-in for verification.** Things that must run should
  run under `npm test`, not behind a separate command that can be
  forgotten.

### Open / deferred items

- **`prettier --check` addition to `/verify`** — decide during
  implementation.

- **E2E test coverage expansion** — scope each journey, write the test
  harness (tmp dirs + binary invocation), keep noise-free. Separate
  workstream.

- **"Tests + lint" deduplication.** Five surfaces do the same job
  (`/verify`, `/build-fix` step 1, `build-validator` agent,
  `prepublishOnly`, direct `npm test && npm run lint`). Designate a
  canonical path and have others delegate. Deferred until all friction
  decisions are in — depends on decisions not yet made.

- **Agent-routing doc correction.** Currently over-promises for
  `/verify` (claims e2e). Fix last, after all decisions are in, so the
  doc matches reality in one pass instead of trickling.

**Status.** Decisions captured. Implementation pending.
