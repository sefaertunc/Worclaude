---
description: "Mid-task stop — writes handoff file and session summary for next session"
---

Use this ONLY when stopping work mid-task without committing.

When invoked with arguments, use them as the description of current work. Example: `/end implementing user registration`

Arguments: $ARGUMENTS

Do NOT update PROGRESS.md — /sync handles that on develop after merging.

## Pre-flight: Worktree Safety

If you are working in a git worktree (not the main checkout):

1. Check for uncommitted changes: `git status --porcelain`
2. If changes exist, commit or stash before proceeding
3. Note which worktree you are in for the handoff file
4. Do NOT remove the worktree from /end — the user may resume here

## Mid-task handoff

`/end` writes two artifacts with **disjoint content**:

- **Handoff** (`docs/handoffs/HANDOFF-{branch}-{date}.md`) — **forward-looking only.**
  What's left, decisions still pending, where to pick up. Do NOT include
  what got done or workflow observability — those belong in the session
  summary.
- **Session summary** (`.claude/sessions/{YYYY-MM-DD-HHMM}-{branch}.md`) —
  **backward-looking only.** What got done, files modified, agents invoked,
  commands used, verification result. Do NOT include "what's left" — that
  belongs in the handoff.

The split is deliberate: handoffs answer "where does the next session start?",
session summaries answer "what happened in this session?". Mixing them makes
both harder to consume.

### Steps

1. **Create the handoff** at `docs/handoffs/HANDOFF-{branch-name}-{date}.md`:
   - **What's left to do** — concrete next steps, in priority order
   - **Decisions still pending** — items that need a human call before the
     next session can pick them up
   - **Where to pick up** — exact file/line/command to start with, plus any
     scratch artifacts (`.claude/scratch/last-review.md`, etc.) that are
     SHA-relevant
   - **Open questions** — anything ambiguous that the next session needs to
     resolve before continuing

2. `git add -A`

3. `git commit -m "wip: handoff for [task description]"`
   Use exactly this message format — no trailers or Co-Authored-By lines.

4. Capture the new HEAD SHA: `git rev-parse HEAD`. Embed it as the
   `sha:` line in the session summary so the next `/start` can compute
   drift accurately (`git log <sha>..HEAD`).

5. **Write the session summary** at `.claude/sessions/YYYY-MM-DD-HHMM-{short-branch-name}.md`
   using the same format as `/commit-push-pr` session summaries:
   - First line: `# Session: {date}`
   - Second line: `sha: {full HEAD SHA captured in step 4}` — own line,
     case-sensitive, no leading whitespace, no markdown formatting around it.
   - Mark the task as "IN PROGRESS" since `/end` means work is unfinished
   - Fill in `## Completed` with what got done this session
   - Fill in `## Files Modified`
   - Fill in `## Workflow Observability`: agents invoked, slash commands
     used so far (excluding the current `/end`), verification result
   - Do NOT duplicate the handoff's forward-looking content here
   - The `.claude/sessions/` directory is gitignored; do not stage it.

6. **Required: prompt for push consent via `AskUserQuestion`.**

   ```
   Question: "Push the WIP commit to remote?"

   - yes  — push to origin so this branch is recoverable from another machine
   - no   — keep the WIP commit local; you'll push when you resume
   ```

   Refuse to proceed past this step without an answer. **Default to local-only**
   if the user declines — pushing WIP commits to remote is sometimes unwanted
   (work-in-progress visible to collaborators, broken intermediate state).

7. On `yes`: `git push`. On `no`: skip push, report "WIP commit local-only.
   Run `git push` when you resume."

## Trigger Phrases
- "stop working"
- "end session"
- "save and stop"
- "I need to go"
