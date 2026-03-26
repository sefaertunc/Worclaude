Use this command ONLY when stopping mid-task (unfinished work).
If the task is complete, use /commit-push-pr instead — it handles PROGRESS.md updates.

When stopping mid-task:
1. Update docs/spec/PROGRESS.md with:
   - What's in progress
   - Any blockers or decisions needed
   - Next steps to resume
2. Write a handoff document at docs/handoffs/HANDOFF_{date}.md
   with enough context for a fresh session to continue seamlessly.
3. Stage and commit the progress update: git add -A && git commit
