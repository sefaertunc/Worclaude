---
description: "Load session context, check for handoff files, detect drift since last session"
---

The SessionStart hook has already loaded CLAUDE.md, PROGRESS.md,
and the most recent session summary into context.

Your job is to supplement that with drift detection and additional context.

## 1. Drift Detection

Show what changed since the last session so there are no surprises.
Present raw signals only — do NOT interpret or warn.

Run these commands and report the output:

```bash
# How many commits since last session file?
LAST_SESSION=$(ls -t .claude/sessions/*.md 2>/dev/null | head -1)
if [ -n "$LAST_SESSION" ]; then
  SESSION_DATE=$(echo "$LAST_SESSION" | grep -oP '\d{4}-\d{2}-\d{2}')
  echo "Commits since last session ($SESSION_DATE):"
  git log --oneline --since="$SESSION_DATE" 2>/dev/null | head -15
else
  echo "No previous session found. Recent commits:"
  git log --oneline -10 2>/dev/null
fi
```

Report as:

```
## Drift Since Last Session
- **X commits** since {date}
- {one-liner per commit, max 15}

Current branch: {branch name}
```

If there are 0 commits since the last session, just say:

```
## Drift Since Last Session
No new commits since last session ({date}). Branch: {branch name}
```

Do NOT add commentary like "you should review these" or "there may be
conflicts." Just the facts.

## 2. Check for Handoff Files

Look in docs/handoffs/ for any HANDOFF*.md files:

- Both HANDOFF-{branch}-{date}.md and legacy HANDOFF_{date}.md
- Prioritize files matching the current branch name
- If found, read them for context and report what was handed off

## 3. Load Agent Routing

Read .claude/skills/agent-routing/SKILL.md for agent usage guidance.

## 4. Check for Active Prompt Files

If any PHASE-*-PROMPT.md or implementation prompt file exists in the
project root, read it and note it.

## 5. Report

Summarize:

- Drift status (from step 1)
- Any handoffs found (from step 2)
- What was last completed (from session summary loaded by hook)
- What's next (from PROGRESS.md loaded by hook)
- Any blockers or notes
