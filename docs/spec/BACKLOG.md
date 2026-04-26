# Worclaude Backlog

Single rolling list of forward-looking enhancements not yet scheduled into a
phase. As items are picked up, they move into the appropriate file under
`docs/phases/` or are dropped. There is no versioned/per-release archive — the
file rolls.

Completed work lives in `CHANGELOG.md`; rejected ideas live in the friction
decision docs under `docs/archive/decisions/`.

---

## Pending follow-ups

### Skill-hint frontmatter enrichment

`templates/hooks/skill-hint.cjs` matches user-prompt keywords against skill
directory names only. Reading each skill's `description:` frontmatter would
produce richer keyword coverage and a higher auto-activation hit rate.

**Source:** discovered during Phase 4 implementation. Implementation tracked
under Phase 3 T3.10 in
[`docs/phases/phase-3-cross-cutting-infrastructure.md`](../phases/phase-3-cross-cutting-infrastructure.md).

### Claude Code plugin validator CI

Once `worclaude init --plugin-json` is exercised in CI, add a step that runs
`claude plugin validate` on the generated `.claude-plugin/plugin.json` to
catch schema drift as Claude Code evolves.

**Source:** discovered during Phase 4 implementation. Implementation tracked
under Phase 3 T3.11.

### Optional-features registry

A first-class registry for opt-in scaffolding extras (plugin.json, GTD
memory, future additions) that supersedes the rejected
`worclaude upgrade --with-plugin` / `--with-memory` per-feature flags.
Centralizes the opt-in surface so adding a new optional feature does not
require a new flag.

**Source:** [`decisions/2026-04/05-analysis-cluster.md`](../archive/decisions/2026-04/05-analysis-cluster.md);
implementation tracked under Phase 3 T3.9 in
[`docs/phases/phase-3-cross-cutting-infrastructure.md`](../phases/phase-3-cross-cutting-infrastructure.md).

### Sandbox defaults in scaffolded settings

Claude Code 2.1.113 added `sandbox.network.deniedDomains` — a per-project
deny-list that takes precedence over `sandbox.network.allowedDomains`
wildcards. Worclaude's `templates/settings/base.json` and language templates
do not scaffold a `sandbox` block today.

Open questions before shipping:

- Default deny-list contents: ship with an opinionated list (common telemetry
  endpoints) or empty stub?
- Per-language overrides: should node/python/docker add their own deny
  entries, or is `base.json` sufficient?
- Merger semantics: `mergeSettings` in `src/core/scaffolder.js` only
  union-merges `permissions.allow` today. Sandbox would need a new
  union-merge path for `sandbox.network.deniedDomains` (and `allowedDomains`).
- Doctor check: add `checkSandboxBlock` that warns if the scaffolded
  deny-list has drifted from the template.

Test surface estimate: ~8 new tests (3 in `tests/core/merger.test.js`, 3 in
`tests/e2e/settings-matrix.test.js`, 1 in `tests/commands/doctor.test.js`,
1 backward-compat for user settings without a `sandbox` key).

**Priority:** low — opt-in feature; users can add it manually today.

### `claude --worktree` command visibility

Claude Code's `--worktree` flag creates a minimal `.claude/` inside the
worktree that may override git-tracked commands/skills/agents. This causes
commands like `/review-plan` to be missing in worktree sessions. Investigate
whether this is fixable from Worclaude's side (symlinks, documentation,
workaround) or is a Claude Code behavior to document as a limitation.

**Priority:** investigation only — implementation depends on findings.

---

## Conventions

- One H3 section per pending item. Keep each item brief — link to the
  decision doc or phase file for full context rather than restating it here.
- When an item gets scheduled into a phase, remove it from this file.
  The phase doc and PR description carry the work forward.
- If an item is dropped, add a one-line note explaining why and link to the
  decision that retired it. Don't silently delete.
- Completed work belongs in `CHANGELOG.md`, not here. This file is
  forward-looking only.
