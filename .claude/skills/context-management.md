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

> On Windows, this command runs in Git Bash (installed with [Git for Windows](https://gitforwindows.org)).

This ensures you never lose your bearings after compaction. The hook fires
automatically — you don't need to re-read these files manually.

## Session Persistence

The workflow automatically maintains session continuity:

### SessionStart Hook (automatic)
When a new Claude Code session opens, a hook automatically injects:
- CLAUDE.md — project conventions and rules
- PROGRESS.md — current project state
- The most recent session summary from `.claude/sessions/`

You don't need to manually re-read these. The hook handles it.
Use /start for additional context (handoff files, agent routing).

### Session Summaries
Session summaries are written to `.claude/sessions/` by:
- `/commit-push-pr` — writes a summary before committing (completed work)
- `/end` — writes a summary before the handoff commit (in-progress work)

These are local files (gitignored) that bridge the gap between sessions.
They're automatically picked up by the next session's SessionStart hook.

### The Continuity Chain
```
Session 1: work → /commit-push-pr → writes session summary → push
Session 2: SessionStart hook → reads summary → knows what happened → /start for extras
```

If the session summary is missing or stale, /start still reads PROGRESS.md
and handoff files as fallback. The system degrades gracefully.

## Hook Profiles

Control which hooks fire via the `WORCLAUDE_HOOK_PROFILE` environment variable:

| Profile | Hooks Active | Use When |
|---------|-------------|----------|
| `minimal` | SessionStart, PostCompact only | Exploring, learning, minimal overhead |
| `standard` | All hooks (default) | Normal development |
| `strict` | All hooks + TypeScript checking | Pre-release, team CI, maximum safety |

Set in your shell:
```bash
export WORCLAUDE_HOOK_PROFILE=minimal   # lightweight
export WORCLAUDE_HOOK_PROFILE=standard  # default (same as unset)
export WORCLAUDE_HOOK_PROFILE=strict    # maximum enforcement
```

Or per-session:
```bash
WORCLAUDE_HOOK_PROFILE=strict claude
```

The default is `standard` if the variable is not set. You don't need to do
anything for normal development — the default just works.

## Gotchas

- Compacting doesn't free as much context as you think. If you've read 20 large files,
  compaction helps but won't get you back to fresh. Consider /clear if the task is done.
- Subagents don't share your conversation context. They start fresh. Give them explicit
  instructions and file paths — don't assume they know what you know.
- Don't compact right before a complex merge or refactor. You'll lose the nuanced
  understanding of the changes you've been building up.
- After /compact, always verify your understanding before making changes. The summary
  may have lost important details.
