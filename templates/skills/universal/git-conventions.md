---
description: "Branch naming, commit message format, PR workflow, worktree conventions"
---

# Git Conventions

## Branch Naming

Pattern: `{type}/{short-description}`

Types:
- `feature/` — New functionality
- `fix/` — Bug fixes
- `refactor/` — Code restructuring without behavior change
- `docs/` — Documentation only
- `test/` — Test additions or fixes
- `chore/` — Tooling, dependencies, config

Examples:
- `feature/auth-flow`
- `fix/login-timeout`
- `refactor/extract-merger-module`

Keep branch names under 50 characters. Use hyphens, not underscores.

## Commit Messages

Follow conventional commits format:

```
type(scope): short description

Longer explanation if needed. Focus on WHY, not WHAT.
The diff already shows what changed.

Closes #123
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

Scope is optional but helpful: `feat(auth): add OAuth2 token refresh`

Rules:
- Subject line under 72 characters
- Imperative mood ("add" not "added" or "adds")
- No period at the end of the subject line
- Blank line between subject and body
- Body explains motivation, not mechanics

## When to Commit

Commit after each logical unit of work:
- A function is complete and tested
- A refactor is done and tests pass
- A bug is fixed and verified

Don't batch unrelated changes into one commit. Don't commit broken code.

## PR Workflow

1. Push your branch
2. Create PR with `gh pr create`
3. PR title follows same format as commit subject: `type(scope): description`
4. PR body includes: what changed, why, how to test, anything reviewers should know
5. Request review if the project has reviewers configured

## Squash vs Merge

- Squash when: the branch has many small "wip" commits that don't individually matter
- Merge when: each commit in the branch is a meaningful, atomic change
- Rebase when: you need a linear history and commits are clean

Default preference: squash merge for feature branches, regular merge for release branches.

## Worktree Conventions

When using `git worktree` for parallel work:

- Worktrees go in a sibling directory, not inside the repo
- Naming: `{repo}-{branch-name}` for the worktree directory
- Always clean up worktrees when done: `git worktree remove {path}`
- Don't leave stale worktrees — they hold refs and can cause confusion

Agents that use worktree isolation (code-simplifier, test-writer, ci-fixer, etc.)
create and clean up their own worktrees automatically.

## Gotchas

- Never force-push to main/master. Force-push to feature branches only when you
  own the branch and have communicated with collaborators.
- If a rebase goes wrong, `git reflog` is your friend. The old state is still there.
- Don't commit generated files (build output, node_modules, .pyc) — check .gitignore.
- When working in worktrees, remember that stashes are shared across the repo.
  A stash in one worktree is visible in another.
- Commit messages are documentation. Future you will read them. Write for that person.
