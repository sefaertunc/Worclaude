Use this ONLY when stopping work mid-task without committing.

Do NOT update PROGRESS.md — /sync handles that on develop after merging.

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
4. git add -A
5. git commit -m "wip: handoff for [task description]"
   Use exactly this message format — no trailers or Co-Authored-By lines.
6. git push
