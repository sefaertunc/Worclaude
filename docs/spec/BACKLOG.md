# Worclaude Backlog

Single rolling list of forward-looking enhancements not yet scheduled into a
phase. As items are picked up, they move into the appropriate file under
`docs/phases/` or are dropped. There is no versioned/per-release archive — the
file rolls.

Completed work lives in `CHANGELOG.md`; rejected ideas live in the friction
decision docs under `docs/archive/decisions/`.

---

## Pending follow-ups

### `claude --worktree` command visibility

Claude Code's `--worktree` flag creates a minimal `.claude/` inside the
worktree that may override git-tracked commands/skills/agents. This causes
commands like `/review-plan` to be missing in worktree sessions. Investigate
whether this is fixable from Worclaude's side (symlinks, documentation,
workaround) or is a Claude Code behavior to document as a limitation.

**Priority:** investigation only — implementation depends on findings.

### `.claude/rules/` adoption — deferred

Claude Code's official docs recommend `.claude/rules/` for topic-organized,
optionally path-scoped team rules. Worclaude **defers** scaffolding it for
now. The reasoning:

- Worclaude already ships `CLAUDE.md` + `.claude/skills/` + `.claude/learnings/`.
  Adding empty `.claude/rules/` templates introduces drift surface for
  unclear value.
- Path-scoped rules pay back in monorepos. Worclaude's typical user is a
  single-repo project; the path-scoping benefit is theoretical until
  observed.

Revisit when Phase 6a observability ships skill-load telemetry that can show
whether path-scoped rules would actually be loaded. If yes, scaffold a
starter set; if no, leave the convention as user-configurable.

**Source:** Phase 4 T4.3 decision (recorded 2026-04-27).
**Priority:** revisit after Phase 6a.

### Usage-signal mechanism for `/update-claude-md` recurrence — pending Phase 6a

Phase 1 removed the dead `times_applied` field from learnings frontmatter.
Phase 4 ships time-based recurrence (last touched within 14 days) and
file-scan recurrence (3+ `**Rule:**` blocks in the same category file) for
`/update-claude-md`'s promotion algorithm. A richer count-based signal —
"how often does this learning's category get re-mentioned in transcripts" —
needs a real mechanism that worclaude does not have today.

The decision: **pull-based via Phase 6a.** When `worclaude observability`
lands, it will already traverse session transcripts; computing per-category
re-mention frequency at observe-time is a natural addition. No new write
paths in the meantime.

**Source:** Phase 4 T4.5 decision (recorded 2026-04-27); cross-references
[`decisions/2026-04/06-meta-memory.md`](../archive/decisions/2026-04/06-meta-memory.md).
**Priority:** dependent on Phase 6a; do not implement standalone.

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
