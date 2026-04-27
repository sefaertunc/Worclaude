# Phase 4 — Memory layer redesign

## Goal

Formalize the five-layer memory architecture and build the bridges
between layers. Phase 1's `/learn` temp fixes already addressed the
immediate `/learn` issues; this phase tackles the broader memory
design that was deferred.

The five layers (already discovered in friction #6 audit):

| Layer                   | Scope    | Owner                   | Lifecycle                      |
| ----------------------- | -------- | ----------------------- | ------------------------------ |
| `CLAUDE.md`             | Team     | Manual                  | Stable, lean (~200 lines)      |
| `.claude/rules/`        | Team     | Manual, topic-organized | Stable, optionally path-scoped |
| `.claude/learnings/`    | Team     | Hook-captured           | Append-only, transient inputs  |
| `CLAUDE.local.md`       | Personal | Manual, gitignored      | Per-machine sandbox            |
| Claude Code auto memory | Personal | Autonomous (Claude)     | Active, self-pruning           |

## Tasks

### Documentation

**T4.1 — Document the five-layer architecture.** Either expand the
`claude-md-maintenance` skill or create a new
`memory-architecture` skill. Include:

- Layer table with scope, owner, lifecycle.
- Trigger-based routing contract: plain conversation → auto memory
  (personal); `/learn` or `[LEARN]` block → `.claude/learnings/`
  (team).
- When to promote learnings → CLAUDE.md (recurrence threshold;
  see T4.2).
- How layers interact (e.g., `.claude/rules/` paths, CLAUDE.local.md
  override of CLAUDE.md).

**Files:** new or expanded
`.claude/skills/memory-architecture/SKILL.md` (and template),
references from CLAUDE.md.
**Source:** archive `decisions/2026-04/06-meta-memory.md`, post-audit
discussion (2026-04-26).
**Acceptance:** memory architecture has a single, readable
explanation; readers can route a fact to the correct layer.

### Promotion bridges

**T4.2 — `/update-claude-md` reads learnings for promotion
candidates.** Extend Phase 2's `/update-claude-md` work:

- Scan `.claude/learnings/` for stable patterns.
- Recurrence-threshold logic: surface as candidate when a learning's
  category has been touched ≥ N times (decide N during
  implementation; lean: 3) OR when the most recent learning is < M
  days old (decide M; lean: 14).
- Optionally also scan Claude Code auto memory at
  `~/.claude/projects/<project>/memory/` for things autonomously
  captured but team-relevant.
- Propose promotions via `AskUserQuestion`.

**Files:** `.claude/commands/update-claude-md.md`,
`templates/commands/update-claude-md.md`.
**Source:** archive `decisions/2026-04/06-meta-memory.md`.
**Acceptance:** running `/update-claude-md` surfaces promotion
candidates from learnings.

### `.claude/rules/` adoption

**T4.3 — Decide on `.claude/rules/` adoption.** Claude Code's official
docs recommend `.claude/rules/` for topic-organized, optionally path-
scoped team rules. Two paths:

- **Adopt:** worclaude scaffolds `.claude/rules/` during `init` with a
  starter set (e.g., `testing.md`, `security.md` empty templates).
  Build init/upgrade integration. Document in CLAUDE.md template.
- **Defer:** flag as user-configurable later; don't scaffold. Note in
  docs that users can create the folder manually.

**Recommendation: defer until usage signal exists.** Worclaude already
ships skills + CLAUDE.md + learnings; adding `.claude/rules/` with
empty templates creates more drift surface for unclear value. Revisit
in a future cycle once skill-load telemetry (Phase 6a) shows whether
path-scoped rules would be used.

**Files:** none if deferred; otherwise scaffolder + templates +
docs.
**Source:** master audit P2 #13, archive
`decisions/2026-04/06-meta-memory.md`.
**Acceptance:** decision made and documented (in BACKLOG.md if
deferred, or implemented if adopted).

### Forward-compatibility check

**T4.4 — Verify Phase 1 `/learn` fixes are forward-compatible.** The
Phase 1 changes (remove `times_applied`, auto-regen `index.json`,
correction-trigger semi-auto) should not block Phase 4's design.
Specifically:

- The Phase 4 promotion logic should NOT depend on `times_applied`
  (good — Phase 1 removed it).
- The new architecture's "trigger-based routing" should work with the
  existing Phase 1 capture pipeline (good — both rely on `[LEARN]`
  blocks).
- If T4.5 (usage signal) is implemented, design it as additive — does
  not break existing `index.json` consumers.

**Files:** none (verification step).
**Source:** archive `decisions/2026-04/06-meta-memory.md`.
**Acceptance:** Phase 4 works on top of Phase 1 fixes without
revisiting them.

### Optional usage signal (replaces dropped `times_applied`)

**T4.5 — Design a usage signal mechanism.** Phase 1 removed the dead
`times_applied` field. If we want a working relevance signal for
promotion (T4.2's recurrence threshold), it needs a real mechanism.
Options:

- **Hook-based:** `learn-capture.cjs` extends to also log when an
  existing learning's category gets re-mentioned in the transcript.
  Counter increments on the per-category `.md` file's frontmatter.
- **Pull-based:** `worclaude observability` (Phase 6a) computes
  recurrence frequency from session transcripts retrospectively.
- **Skip:** rely on time-based recurrence only (last touched within
  N days), no count needed.

**Recommendation: pull-based via Phase 6a.** Avoids new write paths;
the observability layer already needs to traverse session transcripts.

**Files:** depends on choice; pull-based requires only Phase 6a work.
**Source:** Phase 1 design discussion.
**Acceptance:** decision made; if implemented, integrated with T4.2's
recurrence threshold.

## Acceptance criteria for the phase

- Five-layer memory architecture documented in a readable place.
- `/update-claude-md` proposes promotions from learnings (and
  optionally auto memory).
- `.claude/rules/` adoption decision made (adopted or deferred to
  BACKLOG with rationale).
- Phase 1 `/learn` temp fixes remain valid.
- Usage signal mechanism decided (and integrated if Phase 6a is
  ready).

## Dependencies

- Phase 1 (`/learn` temp fixes already in place).
- Phase 3 (`.claude/scratch/` for any transient artifacts the
  promotion logic needs).
- Phase 6a (optional, for pull-based usage signal).

## Open questions to resolve during implementation

- Recurrence threshold N (3? 5? configurable?).
- Time window M (14 days? 30?).
- Whether to scan Claude Code auto memory or only `.claude/learnings/`
  for promotion candidates.
- `.claude/rules/` adoption: adopt now or defer.
