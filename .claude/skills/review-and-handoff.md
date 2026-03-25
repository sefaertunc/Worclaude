---
description: "Session ending protocol, HANDOFF document format, seamless continuation between sessions"
---

# Review and Handoff

## Session Ending Protocol

Every session should end cleanly. The /end command triggers this, but understanding
the protocol matters more than the command.

Before ending:
1. Commit any working code (don't leave uncommitted changes)
2. Run tests to confirm nothing is broken
3. Update PROGRESS.md
4. If mid-task, write a HANDOFF document

## PROGRESS.md Update

PROGRESS.md is the single source of truth for project state across sessions.

Update these sections:
```markdown
## Current Status
{What phase/feature is active}

## Completed This Session
- {Specific thing done}
- {Another specific thing done}

## In Progress
- {What's partially done, and where it stands}

## Blockers
- {Anything preventing forward progress}

## Next Steps
- {Ordered list of what to do next}
```

Be specific. "Worked on auth" is useless. "Implemented JWT token generation and
validation in src/auth/tokens.js; unit tests passing; integration tests not yet
written" is useful.

## HANDOFF Document Format

When ending mid-task, PROGRESS.md isn't enough. Write a handoff at
`docs/handoffs/HANDOFF_{date}.md`.

```markdown
# Handoff: {Date}

## What I Was Doing
{1-2 sentences on the exact task}

## Current State
- Branch: {branch name}
- Last commit: {hash and message}
- Tests: {passing/failing, which ones}
- Files changed: {list of modified files}

## What's Left
1. {Next specific step}
2. {Step after that}
3. {Final step for this task}

## Context That Matters
- {Decision made during this session and why}
- {Gotcha discovered that isn't documented elsewhere}
- {Assumption being made that should be validated}

## How to Verify When Done
{What "done" looks like for this task}
```

## What Context Matters

Include in handoffs:
- WHY decisions were made, not just what
- Failed approaches and why they failed (prevents re-trying dead ends)
- Dependencies discovered during implementation
- Anything that surprised you about the codebase

Don't include:
- Obvious things a fresh session can figure out from the code
- Full code dumps (the code is in version control)
- Speculation about future tasks unrelated to the current work

## The Fresh Session Test

A good handoff passes this test: could a fresh Claude session, reading only
PROGRESS.md and the HANDOFF file, continue the work without asking clarifying
questions?

If no, the handoff is missing context.

## Gotchas

- Don't skip the handoff because "it's almost done." You might not get back to
  this task for days. What's obvious now will be opaque later.
- HANDOFF files are ephemeral. Delete them once the task is complete. Don't let
  stale handoffs accumulate — they become misleading.
- Always commit before writing the handoff. The handoff references a commit hash.
  If the code isn't committed, the handoff points to nothing.
- Update PROGRESS.md even if you write a HANDOFF. PROGRESS.md is the persistent
  state; HANDOFF is the detailed supplement.
