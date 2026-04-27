# Phase 1 — Drift cleanup

## Goal

Eliminate stale references and known drift across CLAUDE.md, AGENTS.md,
skills, VitePress reference docs, and agent definitions. These are
small, low-risk fixes that demonstrate working hygiene before the
larger phases land. None of these depend on architectural changes.

## Tasks

### Tech-stack drift

**T1.1 — CLAUDE.md test counts.** Replace `Vitest (497 tests, 31 files)`
on lines 19 and 35 of `CLAUDE.md` with current values (`804 tests, 58
files` as of audit; verify before edit).
**Files:** `CLAUDE.md`.
**Source:** master audit §3, P0 #1.
**Acceptance:** counts match `npm test` output.

**T1.2 — AGENTS.md test counts.** Same drift (line ~7 of `AGENTS.md`).
**Files:** `AGENTS.md`.
**Source:** master audit §0 finding 1.
**Acceptance:** counts match reality.

**T1.3 — `/sync` refreshes tech-stack metrics.** Add a step to `/sync`
that recomputes test/file counts from `vitest --run --reporter=json`
output and updates CLAUDE.md and AGENTS.md as part of the release
flow. Prevents future drift.
**Files:** `.claude/commands/sync.md`, `templates/commands/sync.md`,
maybe `src/commands/sync.js` if a CLI helper is needed.
**Source:** master audit §1 (`/sync` new finding), P0 #1.
**Acceptance:** running `/sync` updates the counts; subsequent doctor
runs show no drift.

### CLAUDE.md hygiene

**T1.4 — `claude-md-maintenance` skill update.** Three changes:

- Line target: 50 → 200 (matches official Claude Code docs and doctor
  thresholds).
- Fix `@include` syntax description: `@./relative` → `@path/to/import`.
  Add notes that imports load at launch (no context savings), max 5
  hops recursion, and external imports trigger an approval dialog.
- Add the `@~/.claude/...` worktree-share pattern.

**Files:** `.claude/skills/claude-md-maintenance/SKILL.md`,
`templates/skills/universal/claude-md-maintenance.md`.
**Source:** archive `decisions/2026-04/06-meta-memory.md`.
**Acceptance:** skill text matches official docs; @include examples
work when tested.

**T1.5 — Critical Rule #10 includes `agent-routing.md`.** Update
`CLAUDE.md` rule "Always add new agents to both `agents.js` AND
`agent-registry.js`" to include `agent-routing.md` as the third place.
Or, after T3.1 (auto-regenerator), reword to point at the regenerator.
**Files:** `CLAUDE.md`, `templates/core/CLAUDE-template.md` (if scaffolded).
**Source:** master audit §3 (CLAUDE.md drift), P0 #3.
**Acceptance:** rule mentions all three files (or is reworded for the
regenerator).

**T1.6 — `ci-fixer` dangling reference.** Remove or implement.
Recommended: remove from `git-conventions.md` line 101. The agent
isn't installed and isn't planned.
**Files:** `.claude/skills/git-conventions/SKILL.md`,
`templates/skills/universal/git-conventions.md`.
**Source:** master audit §0 finding 4.
**Acceptance:** grep `ci-fixer` returns only template files (under
`templates/agents/optional/devops/`).

**T1.7 — Rename CLAUDE.md "Auto-memory" section.** "Auto-memory"
collides with Claude Code's built-in feature
(`~/.claude/projects/<proj>/memory/`). Rename to "Captured Learnings"
or similar.
**Files:** `CLAUDE.md`, `templates/core/CLAUDE-template.md`.
**Source:** master audit §0 finding 2; archive
`decisions/2026-04/06-meta-memory.md`.
**Acceptance:** CLAUDE.md no longer uses "Auto-memory"; reserves that
phrase for the Claude Code feature.

### Backlog migration

**T1.8 — `BACKLOG-v2.1.md` → `BACKLOG.md`.** Migrate:

- Move completed Phase 2/4/5 content to
  `docs/archive/backlogs/2026-04/backlog-v2.1.md`.
- Create new generic `docs/spec/BACKLOG.md` with the 3 still-pending
  follow-ups (verified pending in audit):
  - skill-hint frontmatter enrichment
  - plugin validator CI
  - Optional-features registry (replaces the rejected
    `--with-plugin`/`--with-memory` flags; see T3.9)
- Update references in `CHANGELOG.md`, `PROGRESS.md`, and the retired
  `/upstream-check` command spec.

**Files:** new `docs/spec/BACKLOG.md`, `docs/archive/backlogs/2026-04/`,
`CHANGELOG.md`, `docs/spec/PROGRESS.md`,
`.claude/commands/upstream-check.md`.
**Source:** archive `decisions/2026-04/05-analysis-cluster.md`; master
audit BACKLOG verification.
**Acceptance:** `BACKLOG-v2.1.md` no longer in `docs/spec/`;
`BACKLOG.md` contains only outstanding items.

### VitePress reference-docs drift

**T1.9 — `docs/reference/hooks.md` major gap.** The file documents
~5 hook configurations but omits the 4 hook scripts and several
configured events. Add sections for:

- `correction-detect.cjs` (UserPromptSubmit)
- `skill-hint.cjs` (UserPromptSubmit)
- `learn-capture.cjs` (Stop)
- `pre-compact-save.cjs` (PreCompact)
- SessionEnd, Notification configurations

Each section should describe purpose, event, exit-code semantics, and
profile gating.
**Files:** `docs/reference/hooks.md`.
**Source:** VitePress audit, master audit §0 finding (largest reference
gap).
**Acceptance:** all 4 hook scripts documented; all configured events
covered; doctor's hook checks line up with the doc.

**T1.10 — `docs/reference/claude-md.md` outdated.** Multiple stale
claims:

- "Why ~40 Lines" section (line 6) → 200.
- "targets roughly 40 lines" (line 7) → 200.
- "7 Critical Rules" (lines 113–116) → 15 (current).
- "Keep the file under ~50 lines" (line 154) → 200.

**Files:** `docs/reference/claude-md.md`.
**Source:** VitePress audit P1.
**Acceptance:** file matches current CLAUDE.md template and Claude
Code's official 200-line target.

**T1.11 — `docs/reference/agents.md` line 58 fix.** "These 5 agents"
→ "These 6 agents" (the universal set is plan-reviewer,
code-simplifier, test-writer, build-validator, verify-app,
upstream-watcher).
**Files:** `docs/reference/agents.md`.
**Source:** VitePress audit; internal contradiction within the same
file.
**Acceptance:** file's claimed count matches the 6 universal agents
listed in the file itself.

**T1.12 — `docs/reference/skills.md` line 101 fix.** Update
`claude-md-maintenance` skill description from "50-line target" to
"200-line target."
**Files:** `docs/reference/skills.md`.
**Source:** VitePress audit; matches T1.4 in the skill file.
**Acceptance:** matches the skill content after T1.4.

### Agent metadata

**T1.13 — `criticalSystemReminder` on read-only agents.** `doctor`
flagged two agents missing this frontmatter field:

- `changelog-generator.md`
- `performance-auditor.md`

Both have `disallowedTools` (read-only) but lack the system-reminder.
Add it consistent with `plan-reviewer.md` and `security-reviewer.md`.
**Files:** `.claude/agents/changelog-generator.md`,
`.claude/agents/performance-auditor.md`,
`templates/agents/optional/{docs,quality}/...` corresponding files.
**Source:** `worclaude doctor` warnings.
**Acceptance:** doctor reports no `criticalSystemReminder` warnings.

### Permission policy

**T1.14 — Document the deny-rules policy decision.** Permissions today
ship with 91 allow rules and 0 deny rules. Decide whether common
destructive patterns (e.g., `Bash(rm -rf:*)`, `Bash(curl:*)` for
secret-leak prevention) deserve a default deny set, or whether
deny-rules stay user-policy. Document the decision (either in
`docs/reference/permissions.md` or `templates/settings/base.json`
comments).
**Files:** `docs/reference/permissions.md`,
`templates/settings/base.json`.
**Source:** master audit §0 finding 2 (newly surfaced).
**Acceptance:** policy is explicit and ships intentionally.

### Agent fixes from concurrency test

**T1.15 — Investigate and fix `verify-app`.** The agent's contract
requires Bash to run scenarios A/B/C in tmp dirs, but its sandbox
doesn't grant Bash. It bails immediately. Two paths:

- Grant Bash to its `tools` allowlist (preserves contract).
- Rewrite contract to do something achievable with current tools
  (e.g., code-only review).

Decide and implement.
**Files:** `.claude/agents/verify-app.md`,
`templates/agents/universal/verify-app.md`.
**Source:** master audit P0 #6 (added 2026-04-26).
**Acceptance:** agent runs end-to-end without bailing for permission
reasons.

**T1.16 — Doctor check + cleanup helper for stale worktrees.** After
agents complete, their worktrees at `.claude/worktrees/agent-<id>`
remain locked (lock holds the agent's pid). `git worktree prune` does
not remove locked worktrees. Required: `git worktree remove -f -f`.

Two parts:

- Add a doctor check that warns when more than N (e.g., 3) entries
  exist in `.claude/worktrees/`.
- Add a cleanup helper (e.g., `worclaude doctor --fix-worktrees` or a
  separate `worclaude worktrees clean` subcommand). Investigate
  whether Claude Code intends auto-cleanup; if not, document and
  provide the helper.

**Files:** `src/commands/doctor.js`, possibly new
`src/commands/worktrees.js`.
**Source:** master audit P0 #7 (added 2026-04-26).
**Acceptance:** doctor surfaces stale worktrees; helper cleans them.

### Optional / user-decision

**T1.17 — `git remote set-head origin develop`.** Doctor warns
"develop is N commits ahead of origin/main." Worktree agents base off
`origin/HEAD`; setting it to `develop` locally lets agents see
in-flight work. Reversible. **User decides whether to apply.**
**Files:** none (one-off shell command).
**Source:** doctor warning.
**Acceptance:** doctor no longer flags the warning (if applied).

## Acceptance criteria for the phase

- `worclaude doctor` runs with zero warnings on the project.
- All 4 VitePress reference-doc drift items resolved.
- CLAUDE.md, AGENTS.md, skill texts match current Claude Code docs and
  reality.
- `BACKLOG-v2.1.md` migrated; new `BACKLOG.md` is forward-looking only.
- `verify-app` agent functional (or contract honestly downgraded).
- Stale worktree handling documented and tooling exists.
