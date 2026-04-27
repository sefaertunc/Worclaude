---
description: 'Five-layer memory architecture: where each fact lives, how layers interact, when to promote learnings'
when_to_use: 'When deciding where a new fact, rule, or preference belongs. When triaging a [LEARN] capture. When promoting from learnings to CLAUDE.md.'
version: '1.0.0'
---

# Memory Architecture

Worclaude projects use **five distinct memory layers**. Each has a different
scope, owner, and lifecycle. Routing a fact to the correct layer is a
load-bearing decision — the wrong layer means the fact is invisible when
needed, or noisy when not.

## The Five Layers

| Layer                     | Scope    | Owner                   | Lifecycle                        |
| ------------------------- | -------- | ----------------------- | -------------------------------- |
| `CLAUDE.md`               | Team     | Manual (humans + Claude via `/update-claude-md`) | Stable, lean (target ~200 lines) |
| `.claude/rules/`          | Team     | Manual, topic-organized | Stable; optionally path-scoped (deferred — see BACKLOG) |
| `.claude/learnings/`      | Team     | Hook-captured (`learn-capture.cjs`) | Append-only; transient inputs to promotion |
| `CLAUDE.local.md`         | Personal | Manual; gitignored      | Per-machine sandbox; never shared |
| Claude Code auto memory   | Personal | Autonomous (Claude)     | Active, self-pruning              |

The line between team and personal is the most important boundary. Team
layers are committed and shared with collaborators; personal layers stay
on the local machine.

## Routing Contract

When a fact, rule, or pattern surfaces during a session, route it like this:

| Source                                              | Destination                       |
| --------------------------------------------------- | --------------------------------- |
| A team-relevant rule the user wants enforced — typed `[LEARN]` block or `/learn` invocation | `.claude/learnings/<category>.md` (via hook) |
| A personal preference (workflow, tone, naming whim) | Claude Code auto memory (Claude does this autonomously when noticed) |
| A machine-local sandbox value (paths, secrets, dev URLs) | `CLAUDE.local.md` (manual; gitignored) |
| A topic that has accreted multiple learnings AND is stable | Promote to `CLAUDE.md` via `/update-claude-md` |

**Default rule:** if you cannot point to a specific reason a fact belongs in
a different layer, it does not belong in `CLAUDE.md`. `CLAUDE.md` is the
last layer to grow, not the first.

## Layer Interactions

- **`CLAUDE.md` is the read-on-every-session layer.** It is loaded into
  context at session start and after every `/compact`. Long files waste
  context on every interaction. Stay under ~200 lines of actual content.
- **`.claude/learnings/` is the staging area.** Hooks write here on every
  `[LEARN]` block. Same category = same file = appended block, so a file
  that grows multiple `**Rule:**` entries signals recurrence. The
  `index.json` `created` field is updated to the latest capture date —
  use it as a "last touched" timestamp, not a fixed creation date.
- **Auto memory runs in parallel.** Claude Code maintains
  `~/.claude/projects/<project-slug>/memory/` autonomously. It is
  per-machine and personal. Worclaude does not write to it and does not
  read from it during `/update-claude-md` promotion (deliberate scope
  boundary — see BACKLOG for the discussion).
- **`CLAUDE.local.md` overrides `CLAUDE.md`** for the local machine. Use
  it for facts that are genuinely user-specific within an otherwise shared
  project. Do not commit it.
- **`.claude/rules/` is reserved.** Claude Code's official docs recommend
  it for topic-organized, optionally path-scoped team rules. Worclaude
  defers scaffolding it until a usage signal exists; users can still
  create the folder manually. Do not duplicate `CLAUDE.md` content into
  `.claude/rules/` ad-hoc.

## Promotion Path: Learnings → CLAUDE.md

Promotion is the bridge from `.claude/learnings/` to `CLAUDE.md`. It is
deliberately gated by `/update-claude-md` rather than automatic — promotion
is a content decision, not a mechanical one.

A learning is a **promotion candidate** when at least one of these holds:

1. **Recurrence:** the learning's file in `.claude/learnings/` has 3 or
   more `**Rule:**` blocks (i.e., the same category was captured at least
   three times). Counted by scanning the file, not the index.
2. **Recency cluster:** the index entry's `created` date is within the
   last 14 days AND the same theme has shown up in another recent
   learning. Recent + repeated > recent alone.
3. **Drift:** the learning's content is structurally relevant to an
   existing `CLAUDE.md` section (e.g., a new "always do X" pattern that
   would naturally live in `## Critical Rules` or `## Gotchas`) but the
   pattern is missing from the file.

Even when a candidate qualifies, `/update-claude-md` confirms each
proposed addition with the user via `AskUserQuestion`. No silent writes.

## Don't / Do

- **Don't** edit `.claude/learnings/` files by hand to "fix" them. They
  are the raw capture surface. If a learning is wrong, fix the rule in
  `CLAUDE.md` or remove the learning file.
- **Don't** scaffold `.claude/rules/` content from old `CLAUDE.md`
  sections "to make `CLAUDE.md` smaller." Splitting into sub-files just
  fragments the single source of truth without saving context.
- **Don't** mix personal preferences into team layers. If something
  applies only to your local workflow, it belongs in `CLAUDE.local.md`
  or Claude Code's auto memory — not in `CLAUDE.md`.
- **Do** delete stale learnings. If a category was captured once eight
  months ago and never recurred, it is noise.
- **Do** prune `CLAUDE.md` when it crosses 200 lines. `worclaude doctor`
  warns at 150 and errors at 200. Pruning is part of maintenance.
- **Do** read the file before recommending an update. Memory across
  sessions is not authoritative — current file content is.

## Cross-References

- `/learn` — captures a `[LEARN]` block to `.claude/learnings/`.
- `/update-claude-md` — proposes promotions from learnings to
  `CLAUDE.md`, with size + dedup gates.
- `claude-md-maintenance` skill — what belongs in `CLAUDE.md`, format
  discipline, the 200-line target.
- `worclaude doctor` — surfaces drift between `CLAUDE.md` claims and
  `package.json` reality (see Phase 3 T3.8).
