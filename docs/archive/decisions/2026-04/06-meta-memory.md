# Workflow Friction Decisions — Part 6

Continuing from `workflow-friction-decisions-5.md`. This part covers
the meta/memory pair (`/learn`, `/update-claude-md`), the
`claude-md-maintenance` skill, `/conflict-resolver`, `/setup`, the
broader CLAUDE.md memory architecture, and a proposed semi-auto
upgrade to `/learn`.

---

## #6 — Memory architecture and the meta/memory commands

### Context

The CLAUDE.md and learnings story is layered, and an early audit
mistakenly framed the `claude-md-maintenance` skill as redundant. A
deeper investigation found:

- `worclaude doctor` enforces CLAUDE.md size limits (chars + lines).
- The `claude-md-maintenance` skill is the **knowledge layer** — when
  to update, what belongs, format discipline.
- `/update-claude-md` is the **action layer** — proposing changes.
- Hooks (`correction-detect.cjs` + `learn-capture.cjs`) form an
  **automatic capture pipeline** that lands in `.claude/learnings/`,
  not directly in CLAUDE.md.
- Claude Code v2.1.59+ has its own **built-in auto memory** at
  `~/.claude/projects/<project>/memory/` — running in parallel to
  worclaude's `.claude/learnings/`.

Authoritative checks performed during this audit:

- Boris Cherny's site (`howborisusesclaudecode.com`) confirmed the
  `@claude` marker is a **PR-comment GitHub Action trigger**, not an
  in-session message marker. No general `@`/hashtag syntax.
- Official Claude Code memory docs (`code.claude.com/docs/en/memory`)
  confirmed the `@path/to/import` directive works exactly as
  documented, and that the official CLAUDE.md size target is **200
  lines** — matching `worclaude doctor`'s thresholds.

### Decisions

**`/learn` — clean up the field set; add when-to-save guidance.**

- Remove `times_applied` field. Hook never increments it; wiring it
  requires non-trivial signal detection that the system cannot
  deliver reliably. Don't ship a field that lies. If a relevance
  signal is wanted later, add one with a working mechanism.
- `index.json` is auto-regenerated from the directory on every
  capture. Never hand-maintained.
- Add when-to-save guidance to the command spec, mirroring the
  global memory system's per-type rules. Distinguish team-relevant
  (which `/learn` captures) from personal preferences (which fall
  through to Claude Code's auto memory — see Memory architecture
  below).

**`/update-claude-md` — sharpen the apply mechanism; add guards.**

- Use `AskUserQuestion` for confirm/skip on each proposed change
  (per the convention from #1 and the broader pattern in #4).
- Add size check before writing — block additions that would push
  CLAUDE.md past doctor's WARN threshold (150 lines / 30,000 chars)
  unless the user explicitly accepts the bloat.
- Dedup against existing rules: if the proposed addition restates
  something already in CLAUDE.md, prompt to update-in-place instead
  of appending.
- Read from `.claude/learnings/` to surface promotion candidates —
  recurring patterns from the learnings directory should be
  proposed for promotion to CLAUDE.md.

**`claude-md-maintenance` skill — KEEP and update.**

Reversing an earlier audit call that framed it as redundant. The
skill is the knowledge layer; the command is the action layer. They
serve different purposes.

Updates required:

- **Line target: 200** (was 50). Match official Claude Code docs and
  doctor's thresholds. The 50-line target is outdated.
- **Fix `@include` syntax description.** The skill currently shows
  `@./relative` — that's wrong. Official syntax is `@path/to/import`
  (no `./` prefix). Update examples to use:
  - `@README` (relative, resolves from importing file)
  - `@docs/git-instructions.md` (relative)
  - `@~/.claude/my-project-instructions.md` (home-relative)
- Add note: imports load at launch and **consume context** — they
  help organization, not budget. (Skill currently implies otherwise.)
- Add note: max recursion depth is 5 hops.
- Add note: external imports trigger an approval dialog on first use.

**`/conflict-resolver` — small alignments.**

- Step 5 (test): change "Run /verify (or the project's test and
  lint commands)" → just "Run `/verify`". Single canonical path per
  #3's decision.
- Step 3 (truly contradictory changes): use `AskUserQuestion` for
  the "keep A / keep B / combine" choice. Closed-set, fits the
  convention from #1.

**`/setup` — leave alone.**

The 835-line state machine is an outlier in the command set, but
the rigidity is earned: irreversible writes to six files, parser
contracts on the output, state-file integrity across resumable
invocations. Don't apply the thinning patterns from other commands
here — they don't translate.

### Memory architecture (five layers, intentional split)

Worclaude + Claude Code together provide five memory layers. They
are not redundant; each solves a different problem.

| Layer                       | Scope    | Owner                   | Lifecycle                      | What it solves                                                            |
| --------------------------- | -------- | ----------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| **CLAUDE.md**               | Team     | Manual, curated         | Stable, lean (200-line target) | "What does this team know that Claude needs every session?"               |
| **`.claude/rules/`**        | Team     | Manual, topic-organized | Stable, optionally path-scoped | Topic-organized team rules; can be path-scoped to load only when relevant |
| **`.claude/learnings/`**    | Team     | Hook-captured           | Append-only, transient inputs  | "What did we just learn that the team should remember?"                   |
| **CLAUDE.local.md**         | Personal | Manual, gitignored      | Per-machine sandbox            | Per-developer overrides for the current project                           |
| **Claude Code auto memory** | Personal | Autonomous (Claude)     | Active, self-pruning           | "What does this user prefer? How does Claude best work with them?"        |

**Routing contract — trigger-based, not content-based:**

- **Plain conversation** → Claude may write to auto memory
  autonomously. Personal, machine-local. Examples: "this user pushes
  back on overengineering," "user prefers terse responses."
- **Explicit `/learn` or `[LEARN]` marker** → goes to
  `.claude/learnings/`. **The user's signal that this should be
  shared with the team.** Examples: "we always use pnpm," "the
  conflict-resolver must not push."
- **`/update-claude-md`** → reads from `.claude/learnings/` (and
  optionally auto memory) to propose CLAUDE.md promotions when
  patterns are stable.

This makes the routing trigger-based, not content-based. The user
doesn't have to classify "is this team or personal?" — the trigger
they choose answers that question implicitly.

### Semi-auto `/learn` — correction-triggered

Today `/learn` is fully manual (or pseudo-auto via the existing
hook pipeline, which still requires a user-signal phrase like
"remember this"). Boris's compounding-engineering thesis suggests
every correction should be a learning opportunity, but blanket
auto-suggestion ("after any process") becomes noise — users dismiss
reflexively and the mechanism dies.

**Decision: targeted semi-auto, fired by corrections.**

When `correction-detect.cjs` matches a correction pattern (the
existing regex set), the system should:

1. Have Claude propose a one-line generalizable rule based on the
   correction.
2. Prompt the user via `AskUserQuestion`:

   ```
   You corrected me: "<short paraphrase>"
   Proposed learning: "<concrete rule>"
   Capture as team learning?

   - Yes              — save as proposed
   - Yes, let me edit — show the text, I'll refine
   - No               — drop it
   ```

3. On Yes / Yes-edit → Claude writes a `[LEARN]` block; existing
   `learn-capture.cjs` Stop hook persists it.
4. On No → no action.

**Why this works:**

- Fires only on real correction signals, not every turn — bounded
  noise.
- Preserves explicit consent via `AskUserQuestion` (per #1's
  prompting convention).
- Includes the proposed text in the prompt — user judges yes/no on
  content, not abstractly.
- Reuses the existing capture pipeline — no new persistence code,
  just a new prompt path.
- Targeted enough to earn the interruption it costs.

**Tradeoffs accepted:**

- **Will miss things.** Some learnings happen without an explicit
  correction. Those still rely on manual `/learn`. Acceptable —
  explicit corrections are the highest-yield trigger.
- **False positives possible.** "you should add a comma here"
  matches the correction regex but isn't a generalizable rule.
  Mitigation: Claude's proposed text would be obviously trivial,
  and the user picks "No." Cost of a false positive: one dismissed
  prompt.
- **Turn cost.** AskUserQuestion is a turn. Limit firing to real
  signal — don't relax the trigger conditions later under pressure
  to capture more.

### Principles established / reaffirmed

- **Knowledge layer vs action layer.** A skill that documents
  _when_ and _what_, plus a command that _applies_, is a valid
  separation — not duplication. Reverse the dedup instinct when
  layers are genuinely different.
- **Trigger-based routing for memory.** The act of choosing how to
  signal a learning (plain conversation vs explicit `/learn`)
  carries the team-vs-personal classification. No need for
  content-based routing or post-hoc reclassification.
- **Targeted semi-auto over blanket auto.** When promoting a
  manual command toward auto, target the strongest signal
  (corrections), not all turns. Earn the interruption.
- **Don't ship dead fields.** `times_applied: 0` that never
  increments is a lie. Either wire it or remove it. Same applies
  to any future field that's documented but unused.

### Open / deferred items

- **Boris's `@claude` PR-comment GitHub Action** — separate feature.
  A workflow file that watches PR review comments for `@claude`
  markers and auto-proposes CLAUDE.md updates via PR. Distinct
  from in-session hooks. Evaluate as a future scoped feature.

- **Auto memory ↔ `.claude/learnings/` integration** — they coexist
  cleanly today (separate locations, separate audiences), but
  there's no automatic promotion from auto memory → learnings when
  Claude autonomously captures something that turns out to be
  team-relevant. Possible future enhancement, not a friction-audit
  decision.

- **Learnings → CLAUDE.md promotion bridge** — `/update-claude-md`
  reading from `.claude/learnings/` is part of this decision. The
  recurrence-threshold logic (when to propose promotion) is open.
  Decide during implementation: time-based ("seen N times in M
  days"), count-based ("seen ≥3 times"), or judgment-based (Claude
  decides on read).

- **`.claude/rules/` adoption** — Claude Code's official
  recommendation includes `.claude/rules/` for topic-organized
  team rules. Worclaude doesn't currently scaffold this directory.
  Open question: should worclaude generate a `.claude/rules/`
  starter set during init? Out of scope for this audit; flag as
  follow-up.

**Status.** Decisions captured. Implementation pending.
