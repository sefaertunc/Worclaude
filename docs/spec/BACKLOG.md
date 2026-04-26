# Worclaude Backlog

Forward-looking enhancements not yet scheduled into a phase. As items are
picked up, they move into the appropriate file under `docs/phases/` or are
dropped.

For superseded backlogs (completed Phase 2/4/5 work and speculative ideas
that did not survive review), see
[`docs/archive/backlogs/`](../archive/backlogs/).

---

## Pending follow-ups

### Skill-hint frontmatter enrichment

`templates/hooks/skill-hint.cjs` matches user-prompt keywords against skill
directory names only. Reading each skill's `description:` frontmatter would
produce richer keyword coverage and a higher auto-activation hit rate.

**Source:** discovered during Phase 4 implementation. See archive entry in
[`backlogs/2026-04/backlog-v2.1.md`](../archive/backlogs/2026-04/backlog-v2.1.md)
under "Phase 4 follow-up items."

### Claude Code plugin validator CI

Once `worclaude init --plugin-json` is exercised in CI, add a step that runs
`claude plugin validate` on the generated `.claude-plugin/plugin.json` to
catch schema drift as Claude Code evolves.

**Source:** discovered during Phase 4 implementation. See archive.

### Optional-features registry

A first-class registry for opt-in scaffolding extras (plugin.json, GTD
memory, future additions) that supersedes the rejected
`worclaude upgrade --with-plugin` / `--with-memory` per-feature flags.
Centralizes the opt-in surface so adding a new optional feature does not
require a new flag.

**Source:** [`decisions/2026-04/05-analysis-cluster.md`](../archive/decisions/2026-04/05-analysis-cluster.md);
implementation tracked under Phase 3 T3.9 in
[`docs/phases/phase-3-cross-cutting-infrastructure.md`](../phases/phase-3-cross-cutting-infrastructure.md).

---

## Conventions

- One H3 section per pending item. Keep each item brief — link to the
  archive or decision doc for full context rather than restating it here.
- When an item gets scheduled into a phase, remove it from this file.
  The phase doc and PR description carry the work forward.
- If an item is dropped, add a one-line note explaining why and link to
  the decision that retired it. Don't silently delete.
