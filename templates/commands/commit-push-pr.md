Determine which branch you're on, then follow the appropriate flow.

## On a feature branch (feature/*, fix/*, chore/*, refactor/*)

Feature branches contain ONLY the task changes. Do NOT touch shared-state
files (see git-conventions.md for the canonical list).

1. Stage all changes: git add -A
2. Write a clear, conventional commit message
3. Push to the current branch
4. Create a PR targeting develop: gh pr create --base develop
5. Include in PR description: title, changes, testing done, reviewer notes

## On develop

Only used for release merges after /sync has been run.

1. Stage all changes: git add -A
2. Write a clear, conventional commit message
3. Push to develop
4. Create a PR targeting main: gh pr create --base main

## On any other branch

Ask the user which base branch to target before creating a PR.

Use gh pr create for PR creation.
