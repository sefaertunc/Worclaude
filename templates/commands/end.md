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
3. git add -A
4. git commit -m "wip: handoff for [task description]"
5. git push
