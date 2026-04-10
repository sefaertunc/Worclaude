---
description: "Mid-task stop — writes handoff file and session summary for next session"
---

Use this ONLY when stopping work mid-task without committing.

Do NOT update PROGRESS.md — /sync handles that on develop after merging.

## Pre-flight: Worktree Safety

If you are working in a git worktree (not the main checkout):

1. Check for uncommitted changes: `git status --porcelain`
2. If changes exist, commit or stash before proceeding
3. Note which worktree you are in for the handoff file
4. Do NOT remove the worktree from /end — the user may resume here

## Mid-task handoff

1. Create docs/handoffs/HANDOFF-{branch-name}-{date}.md
2. Include:
   - What was being worked on
   - What is done so far
   - What is left to do
   - Decisions or context the next session needs
   - Files that were modified
3. Write a session summary to .claude/sessions/:
   - Filename: YYYY-MM-DD-HHMM-{short-branch-name}.md
   - Same format as /commit-push-pr session summaries
   - Mark the task as "IN PROGRESS" since /end means work is unfinished
   - Fill in the ## Workflow Observability section: list agents invoked and
     slash commands used so far (excluding the current /end). Verification
     result is "not run" unless /verify was executed earlier in the session.
4. git add -A
5. git commit -m "wip: handoff for [task description]"
   Use exactly this message format — no trailers or Co-Authored-By lines.
6. git push
