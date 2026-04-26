# Phase 3 — Cross-cutting infrastructure

## Goal

Build mechanisms that prevent future drift, reduce manual maintenance,
and formalize cross-command conventions. These are the infrastructure
investments that make Phase 1's drift fixes durable and Phase 2's
command behavior consistent.

## Tasks

### Auto-regeneration

**T3.1 — Auto-regenerate `agent-routing.md` from agent files.** Build
a generator that reads `.claude/agents/*.md` frontmatter and produces
the canonical agent list inside `agent-routing.md`. Preserve manually-
edited prose sections (e.g., decision-matrix notes) by using
delimiters (`<!-- AUTO-GENERATED-START -->` /
`<!-- AUTO-GENERATED-END -->` blocks). Run automatically as part of
`/sync` and `worclaude upgrade`; expose `--regenerate-routing` flag
for manual invocation.

**Files:** new `src/generators/agent-routing.js` (or extend existing),
`.claude/skills/agent-routing/SKILL.md` (delimiters added),
`.claude/commands/sync.md` (invokes generator),
`src/commands/upgrade.js` (invokes generator).
**Source:** master audit P1 #6, archive
`decisions/2026-04/05-analysis-cluster.md`.
**Acceptance:** adding/removing an agent file regenerates the canonical
list; manual prose sections survive regeneration.

### Discoverable-folder conventions

**T3.2 — `.claude/scratch/` as discoverable location.** Define the
folder as the canonical home for SHA-keyed transient artifacts
(`last-review.md`, `last-plan-review.md`, `coverage-flagged.md`,
future scratch files). `/start` lists all files in it generically with
SHA freshness indicators; new scratch files auto-surface. `.gitignore`
includes the folder.

**Files:** new `.claude/scratch/.gitkeep` and
`templates/.../.claude/scratch/.gitkeep`,
`.claude/commands/start.md` (lists folder content), update
`.gitignore` (templated).
**Source:** master audit P1 #8.
**Acceptance:** `/start` reports the folder's contents; new scratch
files added later are surfaced without spec changes.

**T3.3 — `.claude/plans/` folder for active work guidance.** Replace
filename-pattern detection (`PLAN-*.md`, `IMPLEMENTATION-*.md`,
`PHASE-*-PROMPT.md`) with a single folder. Anything inside is treated
as active work guidance by `/start` and `/review-plan`. Lifecycle:
manual cleanup (no auto-archive heuristics).

**Files:** new `.claude/plans/.gitkeep` and template,
`.claude/commands/start.md`, `.claude/commands/review-plan.md`.
**Source:** archive `decisions/2026-04/07-start-test-coverage.md`,
user decision on flexible plan naming.
**Acceptance:** `/start` and `/review-plan` no longer use filename
patterns; folder convention documented.

### Documentation contracts

**T3.4 — Document hook contracts in SPEC.** For each of the 4 hook
scripts (correction-detect, learn-capture, pre-compact-save,
skill-hint), add a SPEC subsection covering: input shape (JSON keys
read), output behavior (stdout / stderr semantics), exit-code
conventions, profile gating (which `WORCLAUDE_HOOK_PROFILE` levels
fire it), and side effects (files written / state mutated).

**Files:** `docs/spec/SPEC.md`.
**Source:** master audit §7 issue 2.
**Acceptance:** every shipped hook has a SPEC subsection that
matches its actual implementation.

**T3.5 — `package.json` canonical for verification commands.**
Designate `package.json` scripts as the single source of truth for
verification commands. Update CLAUDE.md `## Verification` and
`/verify` spec to reference `npm test`, `npm run lint`, etc. without
restating shell commands. Add a marker like
`<!-- references package.json -->` so the doc-lint script (T5.9)
can verify alignment.

**Files:** `CLAUDE.md`, `templates/core/CLAUDE-template.md`,
`.claude/commands/verify.md`, `templates/commands/verify.md`,
`docs/reference/configuration.md`.
**Source:** master audit P1 #9, §7 issue 5.
**Acceptance:** verification commands appear in `package.json` only;
other docs reference them.

### Installation rationale

**T3.6 — `worklfow-meta.json` rationale field.** Add an `installation`
field that records why specific agent categories and templates were
chosen during init. Surfaced by `worclaude doctor` and `worclaude
status`.

```json
{
  "installation": {
    "projectTypes": ["CLI tool"],
    "selectedCategories": ["Quality", "Documentation"],
    "rationale": "Auto-selected from project type 'CLI tool'.",
    "userDecisions": []
  }
}
```

**Files:** `src/core/config.js`, `src/commands/init.js`,
`src/commands/doctor.js`, `src/commands/status.js`.
**Source:** master audit P1 #10.
**Acceptance:** new installs record rationale; doctor surfaces it; old
installs gracefully degrade (rationale absent → not flagged as drift).

### Background-agent convention

**T3.7 — Document concurrency convention.** The 2026-04-26 test
verified that two background agents on the same branch coexist
cleanly. The earlier "lock file per branch" plan is overkill — drop
it. Replace with documentation in `agent-routing.md` and SPEC:

- Two background agents on the same branch are safe (worktree-isolated
  agents create separate worktrees; non-isolated agents share the
  main checkout but are read-only by convention).
- Worktree lock semantics: Claude Code locks each agent worktree with
  the agent's pid; the lock survives agent completion. Manual cleanup
  via `git worktree remove -f -f` or T1.16's helper.

**Files:** `.claude/skills/agent-routing/SKILL.md`,
`docs/spec/SPEC.md` (cross-reference).
**Source:** 2026-04-26 concurrency test results.
**Acceptance:** convention documented; readers know what's safe.

### Drift detection

**T3.8 — Drift detection script.** Compares CLAUDE.md tech-stack lines
to `package.json`. Reports any lines that should be auto-derived but
restate values (test count, file count, lint commands, etc.). Run as
part of `worclaude doctor` and `/sync` preflight.

**Files:** new `src/utils/drift-detect.js`, integration in
`src/commands/doctor.js` and `.claude/commands/sync.md`.
**Source:** master audit §0 finding 1, §7 issue 1.
**Acceptance:** running doctor on a project with stale tech-stack
flags the drift specifically.

### Optional features registry

**T3.9 — Optional features registry (replaces flag-based opt-in).**
The rejected `worclaude upgrade --with-plugin` / `--with-memory` flags
are replaced by interactive opt-in during `upgrade`:

- New file `src/data/optional-features.js`: declarative registry of
  optional features (plugin.json scaffold, memory scaffold, etc.).
- `worclaude upgrade` scans templates for available features the
  project doesn't have, prompts via `AskUserQuestion`, scaffolds
  selected ones in the upgrade write phase.
- Decisions recorded in `workflow-meta.json` under `optedOutFeatures:
[]` so dismissed features stop prompting.

**Files:** new `src/data/optional-features.js`,
`src/commands/upgrade.js`, `src/core/config.js` (workflow-meta
schema).
**Source:** archive
`decisions/2026-04/05-analysis-cluster.md`-derived, user pushback on
flag-based design (2026-04-26).
**Acceptance:** new optional features added to registry surface as
upgrade prompts; declined features are remembered.

### Backlog items now scheduled

**T3.10 — `skill-hint.cjs` frontmatter enrichment.** Currently the hook
matches user-prompt tokens against skill directory names only. Read
each skill's `description:` frontmatter and use those tokens too. Higher
hit rate, less drift between skill-rename and matching behavior.

**Files:** `templates/hooks/skill-hint.cjs`.
**Source:** listed as pending in `docs/spec/BACKLOG.md`; originally
surfaced as a Phase 4 follow-up item.
**Acceptance:** skills are matched by description content, not just
name.

**T3.11 — Plugin validator CI step.** Add a step to `.github/workflows/
ci.yml` that runs `claude plugin validate` on the generated
`.claude-plugin/plugin.json` to catch schema drift as Claude Code
evolves. Gate on the file existing.

**Files:** `.github/workflows/ci.yml`.
**Source:** listed as pending in `docs/spec/BACKLOG.md`; originally
surfaced as a Phase 4 follow-up item.
**Acceptance:** CI fails on plugin.json schema breakage; passes when
schema is valid (or file absent).

## Acceptance criteria for the phase

- `agent-routing.md` regenerates automatically; manual sections
  preserved.
- `.claude/scratch/` and `.claude/plans/` documented and used by
  Phase 2 commands.
- Hook contracts in SPEC; verification commands canonical in
  `package.json`.
- workflow-meta.json carries installation rationale.
- Drift detection script catches CLAUDE.md ↔ package.json drift.
- Optional features registry replaces flag-based opt-in.
- Two BACKLOG follow-ups implemented (skill-hint enrichment, plugin
  validator).
- Background-agent convention documented; lock-file plan dropped.

## Dependencies

- Phases 1 and 2 land first (drift fixes give clean state; command
  refinements use the conventions defined here).
- Phase 4 builds on Phase 3's `.claude/scratch/` and `.claude/plans/`
  conventions for the memory architecture.
