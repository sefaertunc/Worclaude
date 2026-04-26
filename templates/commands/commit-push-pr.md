---
description: "Commit, push, and create PR — branch-aware with session summary"
---

Determine which branch you're on, then follow the appropriate flow.
Do not add Co-Authored-By trailers or AI-generated footers to commits or PR descriptions.

## Worktree Awareness

If you are in a git worktree session:
- Verify you are on the correct branch: `git branch --show-current`
- All changes must be committed before creating a PR — `git status --porcelain` should be empty after staging
- Do NOT attempt to switch branches inside a worktree — each worktree is locked to its branch

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

     ## Workflow Observability
     - **Agents invoked:** {ALL agents used this session — explicit @agent calls AND agents invoked implicitly by commands like /verify, /review-plan, /refactor-clean. Write "none" if no agents were used.}
     - **Commands used:** {all slash commands run earlier in this session, e.g. /start, /verify, /refactor-clean. Do NOT include the current /commit-push-pr or /end that is writing this summary. Write "none" if no other commands were used.}
     - **Verification result:** {if /verify was run: passed/failed with brief summary; otherwise "not run".}
     ```
   - Keep it concise — this is for machine consumption at session start,
     not a detailed report
2. Stage all changes: git add -A
3. Write a clear, conventional commit message
4. Push to the current branch
5. **Required: prompt for `Version bump:` declaration via AskUserQuestion.**
   Use AskUserQuestion with these four options and one-line descriptions:

   ```
   Question: "What version bump does this PR declare?"

   - major  — breaking change to public API, CLI, or scaffold contract
   - minor  — new feature, command, agent, or flag
   - patch  — bug fix or user-visible behavior change with no new surface
   - none   — docs, CI, tests, internal refactor (nothing consumers notice)
   ```

   For revert PRs: declare the same bump level as the PR being reverted.

   **Refuse to proceed without an answer.** No PR opens until the user
   selects one of the four options. This is the upstream enforcement of
   `/sync`'s release-time aggregation — every PR carries an explicit
   declaration so `/sync` can pick max without surprises.

   If the user's answer is genuinely ambiguous after seeing the four
   options (rare), ask one targeted clarifying question, then re-prompt.

6. Create the PR with `gh pr create --base develop`. The PR description
   MUST include this line on its own, verbatim:

   ```
   Version bump: {major|minor|patch|none}
   ```

   `/sync` parses this string exactly — other phrasings will be ignored.

7. Include in PR description: title, changes, testing done, reviewer notes

## On develop

Only used for release merges after /sync has been run.

Versioning happens in `/sync`, not here. The release PR body is pre-written
by `/sync` with the aggregated bump summary and the list of feature PRs
included in the release.

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

## Trigger Phrases
- "commit and push"
- "create a PR"
- "ship it"
- "push my changes"
