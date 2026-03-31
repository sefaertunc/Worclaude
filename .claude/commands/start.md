The SessionStart hook has already loaded CLAUDE.md, PROGRESS.md,
and the most recent session summary into context.

Your job is to supplement that with:

1. Check for handoff files from previous sessions:
   - Look in docs/handoffs/ for any HANDOFF*.md files
     (both HANDOFF-{branch}-{date}.md and legacy HANDOFF_{date}.md)
   - Prioritize files matching the current branch name
   - If found, read them for context and report what was handed off

2. Read .claude/skills/agent-routing.md for agent usage guidance.

3. If an active implementation prompt exists, read it.

4. Report: what was last completed, what's next, any blockers.
