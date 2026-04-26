---
description: "Compress context via /compact with safety checks"
---

`/compact-safe` adds pre-flight safety checks to bare `/compact`. Compaction
loses fine-grained conversation state; running it on a session with
uncommitted work, mid-implementation TODOs, or recent destructive operations
risks losing context the user expected to keep. This command surfaces those
risks before triggering compaction.

## Pre-flight safety checks

Run all four checks. Report the findings as a short table. Stop and ask the
user for confirmation if **any** check trips.

### 1. Uncommitted changes

```bash
git status --porcelain
```

If output is non-empty, surface a warning: "You have N uncommitted changes.
Compaction loses references to specific files and line numbers — consider
committing or stashing first."

Offer via `AskUserQuestion`:
- `commit`  — write a WIP commit before compacting (reversible)
- `stash`   — stash changes, compact, then `git stash pop` after
- `proceed` — compact anyway (you accept the risk)
- `cancel`  — abort compaction

### 2. In-flight work signals

Scan for indicators that compaction would lose useful context:

- **Recent test failures** — check the last `npm test` / `vitest` / `pytest`
  output if available. If there are failing tests, warn the user and offer
  to run `/verify` first to capture the failure list before compacting.
- **Mid-implementation TODOs** — `grep -rn "TODO(claude)\|FIXME\|XXX" src/`
  on files changed in the last hour (`git diff --name-only HEAD@{1.hour.ago}`
  if available, otherwise `--name-only HEAD~1`). If matches exist, surface
  them — they may be context Claude needs to remember.

### 3. Recent destructive operations

Check the last 20 commands in transcript or shell history for destructive
patterns: `rm -rf`, `git reset --hard`, `git push --force`, `DROP TABLE`,
etc. If any were run within the last 30 minutes, warn the user — they may
want to keep the conversation context until they verify the destructive
op landed correctly.

### 4. PostCompact hook verification

Confirm `.claude/settings.json` has a `PostCompact` hook configured. Without
it, compaction strips CLAUDE.md / PROGRESS.md context permanently. If the
hook is missing, surface a warning and stop — compacting in this state
silently breaks Claude's session orientation.

```bash
node -e 'const s = require("./.claude/settings.json"); console.log(JSON.stringify(s.hooks?.PostCompact || []))'
```

If the output is `[]`, halt and tell the user to either fix the hook config
or accept the risk explicitly.

## Compaction

If all checks pass (or the user accepts each warning explicitly):

1. Run `/compact` to compress context. The PostCompact hook re-reads
   CLAUDE.md and PROGRESS.md automatically.

2. **Post-compaction recap.** Briefly confirm:
   - Current task
   - Current branch
   - What was just being worked on
   - Any in-flight scratch artifacts the post-compact session should be aware
     of (`.claude/scratch/last-review.md`, etc., if present and SHA-current)

If the recap surfaces something Claude no longer remembers but should,
that's a signal the safety checks missed something — flag it for the user
so they can decide whether to roll back via `git reflog` if a recovery
matters.

## Trigger Phrases
- "compact context"
- "free up context"
- "running low on context"
- "compact safely"
