---
description: "Load session context, check for handoffs, detect drift, surface scratch + plans"
---

The SessionStart hook has already loaded CLAUDE.md, PROGRESS.md,
and the most recent session summary into context.

When invoked with arguments, use them as the task focus. Example: `/start implement auth module`

Arguments: $ARGUMENTS

Your job is to supplement that with drift detection, handoff loading,
scratch artifact surfacing, and plan discovery.

## 1. Drift Detection (SHA-based)

Show what changed since the last session so there are no surprises.
Present raw signals only — do NOT interpret or warn.

Prefer **SHA-based drift** when the most recent session summary records
a HEAD SHA in its frontmatter. Otherwise fall back to date-based drift.

```bash
LAST_SESSION=$(ls -t .claude/sessions/*.md 2>/dev/null | head -1)
LAST_SHA=""
if [ -n "$LAST_SESSION" ]; then
  LAST_SHA=$(grep -oP '^sha:\s*\K[a-f0-9]+' "$LAST_SESSION" 2>/dev/null | head -1)
fi

if [ -n "$LAST_SHA" ] && git rev-parse --verify --quiet "$LAST_SHA" >/dev/null; then
  echo "Commits since last session SHA ($LAST_SHA):"
  git log --oneline "$LAST_SHA"..HEAD 2>/dev/null | head -15
elif [ -n "$LAST_SESSION" ]; then
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
- **X commits** since {SHA or date}
- {one-liner per commit, max 15}

Current branch: {branch name}
```

If there are 0 commits since the last session, just say:

```
## Drift Since Last Session
No new commits since last session ({SHA or date}). Branch: {branch name}
```

Do NOT add commentary like "you should review these" or "there may be
conflicts." Just the facts.

## 2. Read handoff and session summary as distinct artifacts

`/end` writes two files with disjoint content:

- **Handoff** at `docs/handoffs/HANDOFF-{branch}-{date}.md` — forward-
  looking only (what's left, decisions pending, where to pick up)
- **Session summary** at `.claude/sessions/{YYYY-MM-DD-HHMM}-{branch}.md` —
  backward-looking only (what got done, observability)

Read both, keeping their roles distinct. Do not merge their content into
a single "last session" blob:

- Look in `docs/handoffs/` for any `HANDOFF*.md` matching the current
  branch first, then any other recent handoff. Read the most relevant.
- The session summary is already loaded by the SessionStart hook — re-
  reference it for "what got done" but don't re-read it.

## 3. Surface pending scratch artifacts (SHA-matched)

Read `.claude/scratch/` and list every file inside. For each artifact
with a `sha:` frontmatter field, compare against `git rev-parse HEAD`:

- **SHA matches HEAD:** the artifact is fresh. Surface it prominently
  with its purpose (e.g., "/review-changes left findings — run
  /refactor-clean to apply them").
- **SHA does not match HEAD:** the artifact is stale. Mention it with a
  "(stale, ignore)" tag. Do not delete — the user may want to inspect it.
- **No SHA in frontmatter:** report as "(unknown freshness)".

This surfacing is **generic** — list whatever is in the folder. New
scratch types added later don't require spec changes here.

## 4. Discover active plans (folder, not filename pattern)

Read `.claude/plans/` and list every file inside (excluding `.gitkeep`
and `README.md`). These are the project's active plans. Surface each
with its first H1 heading or filename for quick scanning.

Do NOT match filename patterns like `PHASE-*-PROMPT.md` or
`IMPLEMENTATION-*.md` — the folder convention replaces pattern detection.
Anything in `.claude/plans/` is treated as active work guidance.

## 5. Load Agent Routing

Read `.claude/skills/agent-routing/SKILL.md` for agent usage guidance.

## 6. Report

Summarize:

- Drift status (from step 1)
- Handoff content (forward-looking, from step 2)
- Session summary highlights (backward-looking, already loaded)
- Pending scratch artifacts (from step 3)
- Active plans (from step 4)
- What's next (from PROGRESS.md loaded by hook)
- Any blockers or notes

## Trigger Phrases
- "start a new session"
- "begin working"
- "load context"
- "what changed since last time"
- "what's the status"
- "where am I"
- "what am I working on"
