# Slash Commands

Worclaude installs 12 slash commands as Markdown files in `.claude/commands/`. These are invoked inside a Claude Code session by typing the command name (e.g., `/start`). Each command gives Claude a specific instruction set for that task.

## Command Reference

### /start

**Session kickoff.** Orients Claude at the beginning of a work session.

|                  |                                                                                                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/start.md`                                                                                                                                                                                                                         |
| **When to use**  | At the start of every Claude Code session                                                                                                                                                                                                           |
| **What it does** | Reads `docs/spec/PROGRESS.md` and `agent-routing.md`. Checks `docs/handoffs/` for handoff files matching the current branch. Reads the active implementation prompt if one exists. Reports what was last completed, what is next, and any blockers. |
| **Key behavior** | Read-only. Does not modify files.                                                                                                                                                                                                                   |

---

### /end

**Mid-task handoff.** Use ONLY when stopping work mid-task without committing.

|                  |                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**         | `.claude/commands/end.md`                                                                                                                        |
| **When to use**  | When stopping mid-task (unfinished work)                                                                                                         |
| **What it does** | Creates a handoff document at `docs/handoffs/HANDOFF-{branch-name}-{date}.md` with context for the next session. Commits and pushes the handoff. |
| **Key behavior** | Does NOT update PROGRESS.md — that is handled by `/sync` on develop after merging.                                                               |

---

### /commit-push-pr

**Branch-aware git workflow.** Stages, commits, pushes, and opens a pull request — with branch-specific behavior.

|                  |                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/commit-push-pr.md`                                                                                                                                                                          |
| **When to use**  | When a feature or fix is ready for review                                                                                                                                                                     |
| **What it does** | On feature branches: skips shared-state files (PROGRESS.md, SPEC.md, package.json version), stages, commits, pushes, PRs to develop. On develop: stages, commits, pushes, PRs to main (after `/sync` is run). |
| **Key behavior** | Feature branches never touch shared-state files — that prevents merge conflicts during parallel work.                                                                                                         |

---

### /review-plan

**Plan review with the plan-reviewer agent.** Sends an implementation plan through a senior staff engineer review.

|                  |                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/review-plan.md`                                                                                                                                                |
| **When to use**  | After writing an implementation plan, before starting implementation                                                                                                             |
| **What it does** | Sends the current plan to the `plan-reviewer` agent (Opus). The reviewer checks for ambiguity, missing verification steps, unrealistic scope, edge cases, and SPEC.md alignment. |
| **Key behavior** | Blocks implementation until all feedback is addressed. The plan should be updated with revisions before proceeding.                                                              |

---

### /techdebt

**Technical debt scan.** Identifies code quality issues across the codebase.

|                  |                                                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**         | `.claude/commands/techdebt.md`                                                                                                                                                                                                                         |
| **When to use**  | Periodically, or when the codebase feels messy                                                                                                                                                                                                         |
| **What it does** | Scans for duplicated code, dead code (unused functions, imports, variables), TODO/FIXME/HACK comments, overly complex functions, missing tests for critical paths, and inconsistent patterns. Reports findings by severity. Fixes quick wins directly. |
| **Key behavior** | Produces a prioritized report. Small fixes are applied immediately; larger items are documented.                                                                                                                                                       |

---

### /verify

**Run verification suite.** Full project validation across all check types.

|                  |                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/verify.md`                                                                                                                |
| **When to use**  | Before committing, before opening a PR, after major changes                                                                                 |
| **What it does** | Runs the test suite, build, linter, and type checker (if applicable). Runs domain-specific verification as needed. Reports results clearly. |
| **Key behavior** | Blocks further work if any check fails. All checks must pass before proceeding.                                                             |

---

### /compact-safe

**Safe context compaction.** Compresses context while preserving orientation.

|                  |                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**         | `.claude/commands/compact-safe.md`                                                                                                                                                                                             |
| **When to use**  | When context is running low (~70% used) and you need to keep working                                                                                                                                                           |
| **What it does** | Triggers `/compact` to compress conversation history. The PostCompact hook automatically re-reads CLAUDE.md and PROGRESS.md. After compaction, Claude confirms the current task, current branch, and what was being worked on. |
| **Key behavior** | Relies on the PostCompact hook for automatic context re-injection. See [Hooks](/reference/hooks).                                                                                                                              |

---

### /status

**Session status check.** Reports current session state without modifying anything.

|                  |                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**         | `.claude/commands/status.md`                                                                                                                           |
| **When to use**  | Mid-session to check where things stand                                                                                                                |
| **What it does** | Reports the current task, git branch and recent commits, test status from the last run, context usage estimate, and any blockers or pending decisions. |
| **Key behavior** | Read-only. This is a session-level status check, distinct from the `worclaude status` CLI command which reports installation metadata.                 |

---

### /update-claude-md

**Update CLAUDE.md rules.** Proposes self-healing rule additions based on session experience.

|                  |                                                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**         | `.claude/commands/update-claude-md.md`                                                                                                                                                                                                           |
| **When to use**  | At session end, or after encountering a repeated mistake                                                                                                                                                                                         |
| **What it does** | Reviews what happened during the session. Identifies mistakes that should become rules, patterns worth documenting, and gotchas encountered. Writes proposed additions to the Gotchas or Critical Rules section. Shows the diff before applying. |
| **Key behavior** | Never applies changes without showing a diff first. Follows the self-healing pattern described in the [claude-md-maintenance skill](/reference/skills).                                                                                          |

---

### /setup

**Project interview to fill specs.** Conducts a structured interview and populates all project-specific files.

|                  |                                                                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/setup.md`                                                                                                                                                                                                 |
| **When to use**  | Once, after initial `worclaude init`, to configure the project                                                                                                                                                              |
| **What it does** | Runs a 7-section interview: Project Story, Architecture & Structure, Tech Stack Details, Core Features, Development Workflow, Coding Conventions, Verification Strategy. Users can type "skip" or "back" at any point.      |
| **Key behavior** | After the interview, updates 6 files with real project content: CLAUDE.md (tech stack and commands), SPEC.md (full specification), backend-conventions.md, frontend-design-system.md, project-patterns.md, and PROGRESS.md. |

**Interview sections:**

| Section                     | Topics Covered                                                                   |
| --------------------------- | -------------------------------------------------------------------------------- |
| 1. Project Story            | Purpose, users, problem it solves, existing docs or PRDs                         |
| 2. Architecture & Structure | Architecture type, directory layout, database, external services, deployment     |
| 3. Tech Stack Details       | Frameworks and versions, package manager, ORM, testing tools, linting            |
| 4. Core Features            | Main features, built vs planned, priority order, business logic, edge cases      |
| 5. Development Workflow     | Start commands, test commands, build commands, env vars, CI/CD, setup steps      |
| 6. Coding Conventions       | Design patterns, error handling, logging, API format, naming, project rules      |
| 7. Verification Strategy    | Verification approach, test commands, manual testing, browser testing, CI checks |

---

### /sync

**Post-merge shared-state updater.** Updates PROGRESS.md, SPEC.md, and version after merging feature PRs.

|                  |                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/sync.md`                                                                                                                                                                        |
| **When to use**  | On the develop branch after merging feature PRs                                                                                                                                                   |
| **What it does** | Checks for unresolved conflicts first. Updates PROGRESS.md (stats, completed items), SPEC.md (if features changed), bumps version in package.json. Runs tests/lint, commits, pushes, PRs to main. |
| **Key behavior** | Refuses to run if conflict markers are detected — tells the user to run `/conflict-resolver` first.                                                                                               |

---

### /conflict-resolver

**Merge conflict resolution.** Resolves merge conflicts from parallel branches.

|                  |                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**         | `.claude/commands/conflict-resolver.md`                                                                                                                    |
| **When to use**  | On develop after `git pull` when merge conflicts are present                                                                                               |
| **What it does** | Detects conflicts, understands each side's intent, resolves them (keeping both sides where possible), verifies no markers remain, runs tests, and commits. |
| **Key behavior** | ONLY resolves conflicts. Does not update PROGRESS.md, SPEC.md, or bump versions — that is `/sync`'s job. Does not push or create PRs.                      |

---

## Command File Location

```
.claude/commands/
  start.md
  end.md
  commit-push-pr.md
  review-plan.md
  techdebt.md
  verify.md
  compact-safe.md
  status.md
  update-claude-md.md
  setup.md
  sync.md
  conflict-resolver.md
```

Commands can be customized after installation. Additional custom commands can be added to the same directory.

---

## See Also

- [Agents](/reference/agents) -- agents invoked by commands (e.g., `/review-plan` uses `plan-reviewer`)
- [Skills](/reference/skills) -- knowledge loaded by commands (e.g., `/end` follows `review-and-handoff`)
- [Hooks](/reference/hooks) -- hooks triggered by commands (e.g., `/compact-safe` triggers PostCompact)
