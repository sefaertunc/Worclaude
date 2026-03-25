---
description: "Context budget awareness, when to compact, when to clear, subagent offloading"
---

# Context Management

## The 70% Rule

Context windows are finite. When you estimate you've used roughly 70% of available
context, it's time to act. Don't wait until you're out of room — you lose the ability
to reason well before you hit the hard limit.

Signs you're running low:
- You've read many large files in this session
- You've had a long back-and-forth conversation
- You're working on a second or third major task
- Responses are getting slower or less coherent

## Three Tools, Different Jobs

### /compact — Compress and continue
Use when: you're mid-task and need more room but want to keep working.
What it does: summarizes conversation history, freeing context.
Pair with: PostCompact hook that re-reads CLAUDE.md and PROGRESS.md automatically.

After compaction, always re-orient:
- What task am I working on?
- What branch am I on?
- What did I just do?

### /clear — Fresh start
Use when: you're starting a genuinely new task with no relationship to the current one.
What it does: wipes conversation entirely.
Caution: you lose ALL context. Make sure PROGRESS.md is updated first.

### Subagents — Offload without losing context
Use when: a side task would pollute your main context (research, testing, file generation).
What it does: spawns a separate context that does work and returns results.
Your main context stays clean.

## Decision Matrix

| Situation | Action |
|---|---|
| ~70% context, mid-task | /compact |
| Task complete, starting unrelated work | /clear |
| Need to research something tangential | Subagent |
| Need to run tests while continuing design | Subagent |
| Context feels sluggish, responses degrading | /compact |
| Long debugging session, found the fix | /compact, then implement |

## PostCompact Hook

The workflow installs a PostCompact hook that runs:
```
cat CLAUDE.md && cat docs/spec/PROGRESS.md 2>/dev/null || true
```

This ensures you never lose your bearings after compaction. The hook fires
automatically — you don't need to re-read these files manually.

## Gotchas

- Compacting doesn't free as much context as you think. If you've read 20 large files,
  compaction helps but won't get you back to fresh. Consider /clear if the task is done.
- Subagents don't share your conversation context. They start fresh. Give them explicit
  instructions and file paths — don't assume they know what you know.
- Don't compact right before a complex merge or refactor. You'll lose the nuanced
  understanding of the changes you've been building up.
- After /compact, always verify your understanding before making changes. The summary
  may have lost important details.
