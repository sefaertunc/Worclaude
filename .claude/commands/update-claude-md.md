---
description: "Propose updates to CLAUDE.md based on session work and recurring patterns"
---

Propose updates to CLAUDE.md based on this session's work AND the project's
captured learnings. Apply changes only with explicit per-change consent.

## Sources of proposals

Look at three places, in priority order:

1. **`.claude/learnings/` directory** — surface promotion candidates.

   `learn-capture.cjs` writes one file per `[LEARN]` category and
   **appends** when the same category is captured again. The directory's
   `index.json` updates `created` to the latest capture date — treat it
   as "last touched," not "first created." See the `memory-architecture`
   skill for the full layer model.

   Concrete promotion algorithm — a learning is a candidate when at
   least one of these holds:

   - **Recurrence:** the file at `.claude/learnings/<category>.md`
     contains **3 or more** `**Rule:**` blocks. Count by scanning the
     file directly (the index doesn't track count). Three independent
     captures of the same category is the threshold for "this isn't a
     fluke."
   - **Recency:** the index entry's `created` date is within the last
     **14 days**. Recent learnings are warmer signals than old ones.
   - **Drift:** the learning's content is structurally relevant to an
     existing `CLAUDE.md` section (e.g., a "always do X" pattern that
     belongs in `## Critical Rules` or `## Gotchas`) but the rule is
     missing from `CLAUDE.md`.

   A candidate satisfying *only* recency is weak — surface it but rank
   it below a recurring or drift-aligned candidate. Prefer learnings
   that hit two or three signals at once.

   **Out of scope for now:** Claude Code's auto memory at
   `~/.claude/projects/<slug>/memory/` is NOT scanned. Auto memory is
   personal-scoped; promotion to `CLAUDE.md` (team-scoped) requires
   the user's explicit reasoning and is mediated through `/learn`.
   This may be revisited once Phase 6a observability ships.

2. **This session's mistakes** — if Claude made the same mistake twice
   in this session, it's a candidate for a Gotchas entry. Once-per-session
   mistakes are not yet rule-worthy.

3. **This session's discoveries** — non-obvious patterns the user
   confirmed are worth documenting (e.g., "we always do X here because Y").

## Pre-apply checks

Run these before proposing any addition:

### Size check

Read CLAUDE.md and count lines. Compare against `worclaude doctor` thresholds:

- **<= 150 lines:** safe to add. Proceed.
- **151–200 lines (WARN zone):** ask via `AskUserQuestion` whether to
  proceed. Each addition pushes closer to the 200-line ERROR threshold.
- **>= 200 lines (ERROR zone):** **block additions** unless the user
  explicitly accepts the bloat via `AskUserQuestion`. Strongly suggest
  pruning before adding.

### Dedup check

For every proposed addition, scan CLAUDE.md for semantic overlap with
existing content. If the proposed rule restates an existing rule:

- Surface the existing rule + the proposed rule side-by-side.
- Offer via `AskUserQuestion`:
  - `update in place` — replace the existing rule with the new wording
  - `skip` — drop the proposal (existing rule covers it)
  - `add anyway` — add the new rule alongside (rare; only if they
    cover genuinely different angles)

Don't append duplicates silently.

## Apply mechanism

For each surviving proposed change, **prompt via `AskUserQuestion`**:

```
Question: "Apply this update to CLAUDE.md?"

Proposed addition (in <section>):
  <exact text to insert>

- yes  — apply now
- no   — drop this proposal
- edit — show the text, I'll refine before saving
```

Refuse to write any change without an answer. **Do not batch multiple
changes into one prompt** — each addition gets its own consent gate so
the user can accept some and reject others.

When all proposals are resolved, write the resulting CLAUDE.md once
and report: "Applied N of M proposals. K dropped, L deduped, P deferred."

## Trigger Phrases
- "update CLAUDE.md"
- "add to rules"
- "update project rules"
- "promote learnings"
