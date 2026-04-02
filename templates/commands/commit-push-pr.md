---
description: "Commit, push, and create PR — branch-aware with session summary"
---

Determine which branch you're on, then follow the appropriate flow.
Do not add Co-Authored-By trailers or AI-generated footers to commits or PR descriptions.

## On a feature branch (feature/*, fix/*, chore/*, refactor/*)

Feature branches contain ONLY the task changes. Do NOT touch shared-state
files (see git-conventions.md for the canonical list).

1. Write a session summary to .claude/sessions/:
   - Filename: YYYY-MM-DD-HHMM-{short-branch-name}.md
   - Content format:
     ```
     # Session: {date}
     **Branch:** {current branch}
     **Task:** {one-line summary of what was worked on}

     ## Completed
     - {what was done, 3-5 bullet points}

     ## Files Modified
     - {list key files changed, from git diff --name-only}

     ## Notes for Next Session
     - {anything the next session should know}
     ```
   - Keep it concise — this is for machine consumption at session start,
     not a detailed report
2. Stage all changes: git add -A
3. Write a clear, conventional commit message
4. Push to the current branch
5. Create a PR targeting develop: gh pr create --base develop
6. Include in PR description: title, changes, testing done, reviewer notes

## On develop

Only used for release merges after /sync has been run.

1. Write a session summary to .claude/sessions/:
   - Filename: YYYY-MM-DD-HHMM-{short-branch-name}.md
   - Same format as the feature branch session summary above
2. Stage all changes: git add -A
3. Write a clear, conventional commit message
4. Push to develop
5. Create a PR targeting main: gh pr create --base main

## On any other branch

Ask the user which base branch to target before creating a PR.

Use gh pr create for PR creation.
