---
description: "Propose updates to CLAUDE.md based on session work and recurring patterns"
---

Propose updates to CLAUDE.md based on this session's work AND the project's
captured learnings. Apply changes only with explicit per-change consent.

## Sources of proposals

Look at three places, in priority order:

1. **`.claude/learnings/` directory** — surface promotion candidates.
   A learning is promotion-worthy when:
   - It appears in multiple learning files (recurring pattern), OR
   - Its content matches a CLAUDE.md section but is missing from it
     (drift), OR
   - The user has invoked the same `[LEARN]` category 3+ times across
     sessions (use `index.json` `created` dates to gauge recurrence)

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
