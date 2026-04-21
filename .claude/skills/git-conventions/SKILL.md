---
description: "Branch naming, commit message format, PR workflow, worktree conventions, versioning policy"
when_to_use: "When creating branches, writing commit messages, creating PRs, or making versioning decisions"
version: "1.0.0"
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
- Never append Co-Authored-By trailers, AI attribution lines, or "Generated with" footers

## When to Commit

Commit after each logical unit of work:
- A function is complete and tested
- A refactor is done and tests pass
- A bug is fixed and verified

Don't batch unrelated changes into one commit. Don't commit broken code.

## Branching Strategy

```
feature-branch ──PR──▶ develop ──PR──▶ main (release)
```

- `develop` — active development. Contributors fork, branch from `develop`, and PR back to `develop`.
- `main` — production releases. Maintainer-only, merged from `develop`.
- `gh-pages` — auto-deployed docs. Maintainer-only.

All feature/bugfix branches are created from and merged back into `develop`. Never PR directly to `main`.

## PR Workflow

1. Push your branch
2. Create PR with `gh pr create --base develop` (feature/bugfix branches target `develop`)
3. When on `develop`, PR targets `main`: `gh pr create --base main` (release merges only)
4. PR title follows same format as commit subject: `type(scope): description`
5. PR body includes: what changed, why, how to test, anything reviewers should know
6. Request review if the project has reviewers configured
7. Do not add AI-generated footers (e.g., "Generated with Claude Code") to PR descriptions

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

## Shared-State Files

These files are modified ONLY on the develop branch (via /sync), never on feature branches:

- `docs/spec/PROGRESS.md` — project progress tracker
- `docs/spec/SPEC.md` — feature specification
- `README.md` — project documentation
- `package.json` version field — release versioning

This prevents merge conflicts when running parallel feature branches.

## Versioning Policy

Follow [semver](https://semver.org/) when the project publishes releases. **Every merge to `main` gets at least a patch bump** — even docs-only, CI-only, or test-only changes. This gives every release a unique, tagged version so the npm history matches the git history one-to-one.

| What changed | Bump | Example |
|---|---|---|
| Breaking change to public API or CLI | **major** | Renamed config key, removed flag |
| New feature, command, or API surface | **minor** | Added CSV export option |
| Bug fix, patch to existing behavior | **patch** | Fixed edge case in date parser |
| Docs, CI, tests, internal refactor | **patch** | Updated README, added test |

**Publish from the primary branch (usually `main`),** not from feature or development branches. What is published must always match what is on the release branch.

**When to bump:** Include the version change in the same PR as the work — no separate "bump version" commits after the fact. The `/sync` command handles this during the develop → main promotion.

**How to publish:**
1. Merge the release PR into `main`
2. Create a GitHub Release against `main` with tag `vX.Y.Z` — the `release.yml` workflow publishes to npm with provenance (SLSA attestations). Do not run `npm publish` locally; local publishes omit provenance and weaken the Snyk security score.
3. Sync develop: `git checkout develop && git merge main && git push origin develop`

If CI is unavailable and a release must ship urgently, local `npm publish` is a fallback — but follow up by re-publishing from CI on the next patch.

**Rule of thumb:** If something landed on `main`, it needs a version. The only question is which semver level — patch by default, minor if it's a new feature, major if it breaks backward compatibility.

## Gotchas

- Never force-push to main/master. Force-push to feature branches only when you
  own the branch and have communicated with collaborators.
- If a rebase goes wrong, `git reflog` is your friend. The old state is still there.
- Don't commit generated files (build output, node_modules, .pyc) — check .gitignore.
- When working in worktrees, remember that stashes are shared across the repo.
  A stash in one worktree is visible in another.
- Commit messages are documentation. Future you will read them. Write for that person.
