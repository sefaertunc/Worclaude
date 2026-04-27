# Phase 2 Retrospective — Command Refinements

**Window:** 2026-04-26 → 2026-04-27 (split across two days; 4 PRs)
**Prerequisite:** [`master-architecture-audit.md`](../../audits/2026-04/master-architecture-audit.md), `docs/phases/phase-2-command-refinements.md`
**Outcome:** Phase 2 ships fully. **22 of 22 tasks complete.** Plus 2 tasks pulled forward from Phase 3 (T3.2/T3.3) — done in PR G.

## What shipped

| PR   | Slice                                     | Tasks                                        | Bump  |
| ---- | ----------------------------------------- | -------------------------------------------- | ----- |
| #130 | PR D — retirements + VitePress lockstep   | T2.15, T2.16, T2.17, T2.18, T2.19, T2.22     | minor |
| #131 | PR E — versioning + simple command tweaks | T2.1, T2.2, T2.3, T2.6, T2.13                | minor |
| #132 | PR F — session lifecycle + meta/memory    | T2.7, T2.8, T2.10, T2.11, T2.21              | minor |
| #133 | PR G — scratch/plans + dependent commands | T2.4, T2.5, T2.9, T2.12, T2.14 + T3.2 + T3.3 | minor |

T2.20 (slash-commands.md description updates for 9 commands) **spread across PRs E/F/G** — each command's description landed alongside its behavior change. Fully done by PR G's merge.

The four PRs all declared `minor`. /sync would aggregate to `minor`. Total: 49 files changed, ~2,000 net insertions.

## Deviations from the plan

Five places where the audit's plan didn't survive contact with the codebase. All resolved by re-examining the premise rather than forcing literal compliance.

- **T2.17 (retire `/upstream-check`).** Audit prescribed only a "deprecation note" for `docs/reference/upstream-automation.md`. But `.github/workflows/upstream-check.yml:183` reads the slash command's markdown for its classification rules. Deleting the file would break the daily upstream-watch automation. **Resolution:** moved the classification rules into a new "Classification Rules" section in `upstream-automation.md` and updated the workflow to point there. Documented in PR D's body.
- **T2.20 (9 description updates in `slash-commands.md`).** Originally listed as one task. Couldn't be done atomically — each command's description should reflect its actual behavior, so updating descriptions before the behaviors landed would create temporary drift. **Resolution:** spread across PRs E (4 commands) / F (4 commands) / G (2 commands plus /test-coverage's). Tracked as "T2.20 partial" in each PR description; fully done by PR G's merge.
- **T3.2 / T3.3 pulled forward into PR G.** Phase 3 was supposed to ship these, but PR G's commands (T2.4/T2.5/T2.9/T2.12/T2.14) all reference `.claude/scratch/` and `.claude/plans/`. Spec docs that name promised-but-not-yet directories are weaker than ones that name real directories. **Resolution:** discussed with user, decided to pull forward. PR G ships the conventions alongside the consumers. Phase 3 picks up with T3.2/T3.3 already done.
- **PR D commit type chosen as `feat:` despite mostly being deletions.** Removing 3 slash commands and an agent IS a CLI surface change — semantically a feature-level event, not a chore. The commit type matched the bump (`minor`).
- **`/verify` scope narrowing (T2.3) was a defensible breaking-ish change.** Strict semver would call removing build/type-check from `/verify` a major contract change. We declared `minor` for PR E because the cumulative Phase-2 framing made the `minor` aggregation appropriate, and the new "What is NOT in /verify" section in the spec explicitly directs users to `/build-fix` for the removed scope. Captured as a known semver call rather than silently downgraded.

## Follow-ups discovered during implementation

- **`/start`'s SHA-based drift requires `sha:` in session-summary frontmatter.** The new T2.9 reads `sha:` from the most recent session summary to compute drift. Current `/commit-push-pr` doesn't write that line — `/start` falls back to date-based drift. Small Phase-3 follow-up worth scheduling: add `sha: <git rev-parse HEAD>` to the session-summary template.
- **The `agent-routing` skill generator (`src/generators/agent-routing.js`) doesn't handle `status: 'reserved'`.** Newly-scaffolded projects get `upstream-watcher` in Manual Triggers with the new `whenToUse` text but no separate "Reserved" subsection. The project's own SKILL.md was edited manually for PR D. Phase 3 candidate.
- **Existing `.claude/learnings/*.md` still carry `times_applied: 0`.** Removed from `/learn` and `learn-capture.cjs` in PR F, but pre-existing files still have the field. Stop hook ignores the field — harmless. Per Rule #14 the existing files weren't modified on a feature branch; they'll naturally fade as new captures replace them.
- **`workflow-meta.json` hash list maintenance is brittle on file deletion.** PR D had to manually clean 4 stale hash entries when retiring files; a future automation in `worclaude upgrade` could drop hashes for files no longer present.
- **Test count assertions can lie.** PR G shipped initially with two scaffolder tests asserting an exact gitignore-entry count and array equality. Local `npm test` reported 815/815, but **the assertions failed in CI** because the local run had been a false memory — I'd reported "815 passing" before the gitignore-list change actually landed. Fixed in a follow-up commit on the same branch. **Lesson: when changing a list, grep for `toHaveLength` and the literal array contents before declaring tests green.**

## Lessons for next phase

1. **A/B/C slicing scaled to D/E/F/G.** Four PRs with coherent themes (retirements / versioning / session-lifecycle / scratch-plans) all reviewed cleanly. Apply the same scope-discipline to Phase 3.
2. **Dogfood as you go.** PR E's T2.2 (`/commit-push-pr` AskUserQuestion) tested itself when opening PRs F and G. Strong validation pattern. Phase 3 should look for similar opportunities — e.g., T3.1's `agent-routing.md` regenerator could be tested on the next agent change after merge.
3. **Pull-forward decisions need an explicit user gate.** The T3.2/T3.3 pull-forward was discussed openly before doing it; documented in PR G's description. Don't pull forward silently.
4. **CI is the contract, not local `npm test`.** When changing data structures (counts, lists, arrays) — `grep -rn "toHaveLength\|toEqual" tests/` before declaring tests green. Test count assertions are brittle to additions.
5. **Audit acceptance criteria are tentative until proven during execution.** T2.17's "deprecation note for upstream-automation.md" turned into a much larger move once the workflow dependency surfaced. Future Phase 3 acceptance criteria should be re-checked at PR-open time, not just at planning time.
6. **Description updates belong with behavior changes.** T2.20 worked best when each command's description landed in the same PR as its rewritten spec. Avoid bundling reference-doc updates into a separate "docs sweep" PR — they go stale fast.

## What worked well

- **A/B/C/D slicing scaled.** 4 PRs, each <600 lines net, all reviewed and merged smoothly.
- **AskUserQuestion enforcement (T2.2) → dogfood loop.** Three consecutive PRs (E/F/G) used the new prompt — fastest possible validation of the new behavior.
- **Session summaries with `## Notes for Next Session`** kept the multi-PR thread coherent across the two days even with context approaching limits.
- **Pre-flight safety checks pattern (T2.8 `/compact-safe`).** Established a template that other commands could adopt: enumerate risks, surface them, require explicit acknowledgment via `AskUserQuestion`. Reusable for future commands that might "lose context" in some way.
- **Pull-forward decision-making.** T3.2/T3.3 discussion was crisp: option A (pull forward) vs option B (ship partial), reasoning surfaced, user picked, executed. No second-guessing.

## Next phase

Phase 3 is up — cross-cutting infrastructure. **8 tasks** remaining (T3.1, T3.4 through T3.10) since T3.2/T3.3 were done in PR G. Highlights:

- T3.1: Auto-regenerate `agent-routing.md` from agent files (with delimiter-preserved manual sections)
- T3.4: Document hook contracts in SPEC for the 4 hook scripts
- T3.5: `package.json` canonical for verification commands
- T3.6+: TBD (haven't read the rest in detail)

Apply the lessons above when scoping its first PR. Particularly: re-check audit acceptance criteria at PR-open time, dogfood new behaviors immediately, grep test assertions before declaring green.
