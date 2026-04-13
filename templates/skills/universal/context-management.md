---
description: "Context budget awareness, when to compact, when to clear, subagent offloading"
when_to_use: "When context is running low, before compaction decisions, when deciding whether to use subagents for context hygiene"
version: "1.0.0"
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

## Token Budgets (Reference)

Approximate values from Claude Code v2.1.88 source (March 2026). These may change between releases.

| Resource | Budget |
|---|---|
| Context window (default) | 200,000 tokens |
| Context window (Opus 4.6 / Sonnet 4.6 with 1M) | 1,000,000 tokens |
| Max output tokens (Sonnet 4.6) | 32,000 default, 128,000 upper limit |
| Max output tokens (Opus 4.6) | 64,000 default, 128,000 upper limit |
| Tool presence overhead | ~500 tokens (added when any tools are enabled) |
| Post-compact file restore | 5 files max, 50,000 token budget, 5,000 per file |
| Post-compact skills restore | 25,000 token budget, 5,000 per skill |
| Compact summary output | 20,000 tokens max |
| CLAUDE.md total budget | ~40,000 characters across all loaded instruction files |
| MEMORY.md (native, ~/.claude/) | 200 lines / 25,000 bytes |

Practical takeaways:
- After compaction, only 5 files are restored at 5k tokens each. Structure your work
  so the most important files are recently read.
- Skills over 5k tokens get truncated after compaction. Keep skills focused.
- The 70% rule still applies — these numbers help you estimate when you'll hit it.

## Context Budget Tiers

Monitor your context usage and adjust behavior accordingly:

| Tier | Context Free | Behavior |
|------|-------------|----------|
| PEAK | >75% | Normal operation — read files freely, keep full context |
| GOOD | 50-75% | Be selective about file reads — summarize large files |
| DEGRADING | 25-50% | Summarize before reading new files, consider /compact |
| CRITICAL | <25% | Save state immediately, /compact, reload only essentials |

Heuristics (you cannot measure exact tokens):
- Many large file reads in this session = likely DEGRADING
- Long conversation with multiple tasks = likely DEGRADING
- Just started or just compacted = likely PEAK

## Gotchas

- Compacting doesn't free as much context as you think. If you've read 20 large files,
  compaction helps but won't get you back to fresh. Consider /clear if the task is done.
- Subagents don't share your conversation context. They start fresh. Give them explicit
  instructions and file paths — don't assume they know what you know.
- Don't compact right before a complex merge or refactor. You'll lose the nuanced
  understanding of the changes you've been building up.
- After /compact, always verify your understanding before making changes. The summary
  may have lost important details.
