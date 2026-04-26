# Phase 1 Retrospective — Drift Cleanup

**Window:** 2026-04-26 (single day, four PRs)
**Prerequisite:** [`master-architecture-audit.md`](../../audits/2026-04/master-architecture-audit.md), `docs/phases/phase-1-drift-cleanup.md`
**Outcome:** Phase 1 ships. 16 of 17 tasks completed across PRs #126, #127, #128. T1.17 deferred (user-only).

## What shipped

| PR   | Slice                                         | Tasks                                                    | Bump  |
| ---- | --------------------------------------------- | -------------------------------------------------------- | ----- |
| #126 | PR A — text + agent metadata                  | T1.1, T1.2, T1.5, T1.6, T1.7, T1.10, T1.11, T1.12, T1.13 | patch |
| #127 | PR B — skill / BACKLOG / hooks                | T1.4, T1.8, T1.9                                         | none  |
| #128 | PR C — sync / denies / verify-app / worktrees | T1.3, T1.14, T1.15, T1.16                                | minor |

Slicing into A/B/C worked: each PR had a coherent scope, fast review, low blast radius. Total: 815 tests (was 804), 26 files modified, 4 files created, 1 file moved + deleted, 0 reverts.

## Deviations from the plan

Five tasks shipped differently than the audit prescribed. All five were resolved in flight by re-examining the audit's premise rather than forcing a literal implementation.

- **T1.6 (ci-fixer dangling reference).** Audit acceptance: "grep `ci-fixer` returns only template files under `templates/agents/optional/devops/`." Unrealistic — `ci-fixer` is a legitimate optional agent listed in `docs/reference/agents.md`, `docs/spec/SPEC.md`, and the catalog UI. We scoped removal to the **skill files** where it appeared as an example of installed agents (misleading because Worclaude doesn't install ci-fixer in its own `.claude/agents/`).
- **T1.8 (BACKLOG migration).** Audit prescribed archiving `BACKLOG-v2.1.md` to `docs/archive/backlogs/2026-04/`. Reverted after review: `BACKLOG.md` is a single rolling file (items removed when scheduled into a phase), so per-release archives don't fit the model. Salvaged the still-relevant items (sandbox defaults, `claude --worktree` visibility) into the new `BACKLOG.md`. Captured as project memory: "BACKLOG.md is rolling, no archive per release."
- **T1.10 (claude-md.md drift).** Audit said "7 Critical Rules → 15." The docs page describes the **template** (12 rules), not the project's evolved CLAUDE.md (15 rules). Updated docs to 12 with an explicit note that Worclaude itself has accumulated 15.
- **T1.13 (criticalSystemReminder).** Audit said "add the reminder." `changelog-generator.md` lacked `Write` in `disallowedTools`, so the reminder "you cannot edit files" would have been a lie. Added `Write` to the disallowed list as part of the same change.
- **T1.14 (deny-rules policy).** Audit suggested `Bash(rm -rf:*)` and `Bash(curl:*)` as candidate denies. After verifying Claude Code's permission syntax against the official docs (https://code.claude.com/docs/en/permissions), we shipped a different mix:
  - Heavy on **Read/Edit denies** (gitignore-style matching is robust)
  - Targeted Bash denies for `.env` file-viewers (enumerates commands, not arguments)
  - Catastrophic `rm -rf` literals (added at user's request — defense-in-depth even when fragile, because cost of false confidence is low when the fragility is documented)
  - Documented coverage limitations explicitly in `docs/reference/permissions.md` so users understand what these rules do and don't catch.

## Follow-ups discovered during implementation

- **`docs/spec/PROGRESS.md` has 5 stale references** to `docs/spec/BACKLOG-v2.1.md` (lines 277, 333, 340, 366, 448). Per Rule #14, feature branches don't touch shared-state files; these will be cleaned up next time `/sync` runs on develop.
- **T1.17 (`git remote set-head origin develop`)** is intentionally not in any PR — it's a one-off shell command for the maintainer.
- **The deny set ships in `templates/settings/base.json`** but won't auto-apply to existing users via `worclaude upgrade` until they re-init or manually merge. Worth considering an upgrade path for security-policy changes specifically — Phase 3 territory.
- **Doctor warning "Agent enrichment: 48% optional fields used"** is a known pre-existing item, not in Phase 1 scope. Carry into Phase 3 if not addressed elsewhere first.
- **`verify-app` was previously failing** because it inherited project-specific verification scenarios from CLAUDE.md (worclaude's `/tmp/test-*` scenarios) without a worktree-aware translation layer. Fixed via the new "Worktree boundaries" section, but the failure mode is generic — any verify-app invocation against a project whose CLAUDE.md describes absolute-path scenarios would have hit this. Worth considering a doctor check or template guidance for project authors who want their CLAUDE.md verification scenarios to play nicely with worktree agents.

## Lessons for next phase

1. **Mark explicit decision points in phase docs.** T1.14 ("decide whether common destructive patterns deserve a default deny set, or whether deny-rules stay user-policy") and T1.15 ("Decide and implement") were buried as recommendations in prose. Surface them as a separate **Decision Required** section in phase docs so they're visible during planning, not discovered during implementation. This saves a back-and-forth round trip.
2. **Verify external docs before proposing implementation details.** I almost shipped a fragile deny-set proposal (`Bash(rm -rf:*)`) without verifying that Bash arg-constraint rules work the way I assumed. The official permissions docs explicitly warn against arg-constraint rules. Lookup-then-propose is cheaper than propose-then-correct.
3. **Audit acceptance criteria need reality-check.** Several Phase 1 tasks had acceptance criteria that didn't survive contact with the codebase (T1.6's strict "templates only", T1.10's "→ 15 rules", T1.8's archive structure). The audit was an outside-in proposal; the implementation revealed the inside-out reality. Future audits should flag acceptance criteria as "tentative; confirm during implementation."
4. **A/B/C slicing pattern works.** Phase 2-7 should slice each phase into 2-4 PRs along natural seams (text-only, decisions-required, code) rather than landing each phase as one mega-PR or seventeen micro-PRs.
5. **Branch naming drift.** PR #128 used `docs/...` despite shipping a new CLI subcommand (`worclaude worktrees clean`) — clearly `feat/...` material. Within a "Phase X cleanup" cluster, branches that introduce new surface should still use the type prefix matching their content.
6. **Project memory captures "what we ship that overrides the spec."** The "BACKLOG.md is rolling" memory entry will save future sessions from re-deriving the decision. Use this pattern for any deviation that future implementers might second-guess.

## What worked well

- Slicing 17 tasks across 3 PRs with coherent themes.
- User pushback on weak reasoning (T1.14 option (b) → reconsidered → (a) with limitations doc) caught a real gap.
- Real-time syntax verification (Claude Code permissions doc) before committing to deny-rule patterns prevented a fragile ship.
- Test additions tracked the code: +2 merger tests for deny union, +4 doctor tests for stale-worktree, +5 worktrees-clean tests. No code-without-tests.
- Doctor green at end of every PR.

## Next phase

Phase 2 (command refinements) is up next. Selectively depends on Phase 1 — should be parallelizable with Phase 3 once dependencies are clear. Apply the lessons above when scoping its first PR.
