---
description: 'Per-project observability report — signal frequencies, anomalies, suggestions'
---

Surface the local observability report for this project. The data lives in
`.claude/observability/` and is captured by hooks that fire on Claude Code's
`InstructionsLoaded`, `UserPromptSubmit`, and `SubagentStart` / `SubagentStop`
events. **Zero data leaves the machine** — the folder is gitignored.

## Run

```bash
worclaude observability
```

The CLI reads the JSONL files (skill loads, command invocations, agent
events), pairs agent start/stop events to compute durations, and emits a
Markdown report covering:

- **Top skills** by load count, with last-seen timestamp.
- **Top commands** by invocation count.
- **Agent invocations** with completed/failed counts and average duration.
- **Anomalies** — installed skills that never loaded, agents that fail more
  often than they complete.
- **Suggestions** — skills not loaded in 30+ days (consider retiring).

Flags:

- `--json` — emit the raw report object as JSON (machine-readable).
- `--out <file>` — write the report to a file instead of stdout.

## Use cases

1. **Skill hygiene.** Skills that never load are noise — either rename them
   to match the prompts users actually type, update their description for
   `skill-hint.cjs` keyword match, or retire them.
2. **Agent reliability.** If an agent's failure ratio is high, look at what
   the agent is being asked to do. The `bug-fixer` and `verify-app` agents
   should sit near 100% completion in a healthy project.
3. **Command surface review.** If `/some-command` has zero invocations after
   weeks of use, it might not be earning its slot in the surface.

## Privacy

The report is built entirely from local files. No network egress, no
upload, no opt-in dashboard. To disable capture entirely, set
`WORCLAUDE_HOOK_PROFILE=minimal` — the observability hooks short-circuit on
that profile (same as `learn-capture` and `correction-detect`).

To purge captured data, delete `.claude/observability/`. It will be
recreated empty on the next session start.

## Trigger Phrases

- "show observability"
- "observability report"
- "what's my project's observability report?"
- "skill usage report"
- "agent reliability"
